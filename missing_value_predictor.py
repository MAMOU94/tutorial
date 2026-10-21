#!/usr/bin/env python3
"""Predict missing dataset values with scikit-learn, preserving the app API."""

import json
import math
import statistics
import sys
from collections import Counter

try:
    from sklearn.compose import ColumnTransformer
    from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
    from sklearn.impute import SimpleImputer
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import OneHotEncoder
    SKLEARN_AVAILABLE = True
except Exception:
    SKLEARN_AVAILABLE = False


HISTORY_WINDOW = 8


def is_missing(value):
    return value is None or (isinstance(value, str) and not value.strip())


def to_number(value):
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value) if math.isfinite(float(value)) else None
    if isinstance(value, str):
        text = value.strip().replace(',', '')
        if not text:
            return None
        try:
            number = float(text)
            return number if math.isfinite(number) else None
        except ValueError:
            return None
    return None


def numeric_values(values):
    return [number for value in values if not is_missing(value) for number in [to_number(value)] if number is not None]


def restore_numeric_shape(value, values):
    observed = [value for value in values if not is_missing(value)]
    if observed and all(isinstance(item, int) and not isinstance(item, bool) for item in observed):
        return int(round(value))
    return round(value, 10)


def local_trend_prediction(history, fallback):
    numeric_history = [(index, number) for index, number in history if number is not None]
    if not numeric_history:
        return fallback, 'global-median', 0.2

    recent = numeric_history[-HISTORY_WINDOW:]
    if len(recent) < 2:
        return recent[-1][1], 'last-observed-value', 0.35

    x_mean = sum(index for index, _ in recent) / len(recent)
    y_mean = sum(number for _, number in recent) / len(recent)
    denominator = sum((index - x_mean) ** 2 for index, _ in recent)
    if denominator <= 0:
        return y_mean, 'recent-mean', 0.35

    slope = sum((index - x_mean) * (number - y_mean) for index, number in recent) / denominator
    intercept = y_mean - slope * x_mean
    next_index = recent[-1][0] + 1
    estimate = intercept + slope * next_index
    if not math.isfinite(estimate):
        return y_mean, 'recent-mean', 0.35

    confidence = min(0.92, 0.42 + (len(recent) * 0.055))
    return estimate, 'local-linear-history', confidence


def categorical_prediction(history, fallback):
    recent = [value for _, value in history[-HISTORY_WINDOW:] if not is_missing(value)]
    if not recent:
        return fallback, 'global-mode', 0.2
    value, count = Counter(recent).most_common(1)[0]
    confidence = min(0.9, 0.35 + (count / max(1, len(recent))) * 0.5)
    return value, 'recent-category-vote', confidence


def numeric_strategy_prediction(history, target_index, strategy):
    numeric_history = [
        (index, number)
        for index, value in history
        for number in [to_number(value)]
        if number is not None
    ]
    if not numeric_history:
        return None
    nearest_history = sorted(
        numeric_history,
        key=lambda item: (
            abs(item[0] - target_index),
            0 if item[0] < target_index else 1,
            item[0]
        )
    )[:HISTORY_WINDOW]
    values = [number for _, number in nearest_history]
    if strategy == 'group-median':
        return statistics.median(values)
    if strategy == 'recent-mean':
        return sum(values) / len(values)
    if strategy == 'last-observed-value':
        return nearest_history[0][1]

    recent = sorted(nearest_history)
    if len(recent) < 2:
        return recent[-1][1]
    x_mean = sum(index for index, _ in recent) / len(recent)
    y_mean = sum(number for _, number in recent) / len(recent)
    denominator = sum((index - x_mean) ** 2 for index, _ in recent)
    if denominator <= 0:
        return y_mean
    slope = sum((index - x_mean) * (number - y_mean) for index, number in recent) / denominator
    intercept = y_mean - slope * x_mean
    estimate = intercept + slope * target_index
    return estimate if math.isfinite(estimate) else y_mean


def categorical_strategy_prediction(history, strategy):
    values = [value for _, value in history if not is_missing(value)]
    if not values:
        return None
    if strategy == 'last-observed-value':
        return values[-1]
    return Counter(values[-HISTORY_WINDOW:]).most_common(1)[0][0]


def history_for_row(rows, values, row_index, group_column=None, current_group=None, scope_indices=None):
    history = []
    for previous_index in range(row_index):
        if scope_indices is not None and previous_index not in scope_indices:
            continue
        if group_column:
            previous_group = group_key(rows[previous_index].get(group_column)) if isinstance(rows[previous_index], dict) else None
            if previous_group != current_group:
                continue
        value = values[previous_index]
        if is_missing(value):
            continue
        history.append((previous_index, value))
    return history


def prediction_history_for_row(rows, values, row_index, group_column=None, current_group=None, scope_indices=None):
    """Build same-group context, including observed values after a leading gap."""
    history = []
    for context_index, value in enumerate(values):
        if scope_indices is not None and context_index not in scope_indices:
            continue
        if context_index == row_index:
            continue
        if group_column:
            context_group = group_key(rows[context_index].get(group_column)) if isinstance(rows[context_index], dict) else None
            if context_group != current_group:
                continue
        if is_missing(value):
            continue
        history.append((context_index, value))
    return history


def evaluate_column(
    rows,
    column,
    group_column,
    group_value,
    is_numeric_column,
    history_values=None,
    observed_values=None,
    scope_indices=None
):
    observed_values = observed_values if isinstance(observed_values, list) else [
        row.get(column) if isinstance(row, dict) else None
        for row in rows
    ]
    history_values = history_values if isinstance(history_values, list) else list(observed_values)
    validation_rows = []
    validation_scope = scope_indices if scope_indices is not None else set(range(len(rows)))
    for row_index, value in enumerate(observed_values):
        if row_index not in validation_scope:
            continue
        if is_missing(value):
            continue
        if group_column:
            row_group = group_key(rows[row_index].get(group_column)) if isinstance(rows[row_index], dict) else None
            if row_group != group_value:
                continue
        validation_rows.append(row_index)

    strategies = (
        ['group-median', 'recent-mean', 'last-observed-value', 'local-linear-history']
        if is_numeric_column
        else ['recent-category-vote', 'last-observed-value']
    )
    scores = {strategy: [] for strategy in strategies}
    # Backtesting only uses prior observed values, matching how a future gap is predicted.
    for row_index in validation_rows[-40:]:
        history = history_for_row(rows, history_values, row_index, group_column, group_value, validation_scope)
        if not history:
            continue
        actual = to_number(observed_values[row_index]) if is_numeric_column else observed_values[row_index]
        for strategy in strategies:
            prediction = (
                numeric_strategy_prediction(history, row_index, strategy)
                if is_numeric_column
                else categorical_strategy_prediction(history, strategy)
            )
            if prediction is None:
                continue
            if is_numeric_column and actual is not None:
                scores[strategy].append(abs(prediction - actual))
            elif not is_numeric_column:
                scores[strategy].append(1.0 if str(prediction) == str(actual) else 0.0)

    available = {strategy: values for strategy, values in scores.items() if values}
    if not available:
        fallback = 'local-linear-history' if is_numeric_column else 'recent-category-vote'
        return fallback, None, 0, 'mae' if is_numeric_column else 'accuracy'

    if is_numeric_column:
        best_strategy = min(available, key=lambda strategy: sum(available[strategy]) / len(available[strategy]))
        metric = sum(available[best_strategy]) / len(available[best_strategy])
        return best_strategy, round(metric, 6), len(available[best_strategy]), 'mae'

    best_strategy = max(available, key=lambda strategy: sum(available[strategy]) / len(available[strategy]))
    metric = sum(available[best_strategy]) / len(available[best_strategy])
    return best_strategy, round(metric, 6), len(available[best_strategy]), 'accuracy'


def group_key(value):
    if is_missing(value):
        return None
    return str(value).strip().casefold()


def is_categorical_group_column(rows, column, scope_indices=None):
    """Only use labels with at least one non-numeric observed value as groups."""
    observed = []
    for index, row in enumerate(rows):
        if scope_indices is not None and index not in scope_indices:
            continue
        if isinstance(row, dict) and not is_missing(row.get(column)):
            observed.append(row.get(column))
    if not observed:
        return False
    return not all(to_number(value) is not None for value in observed)


def infer_group_column(rows, columns, target_columns, scope_indices=None):
    """Prefer a repeated categorical label such as tumor type or cohort."""
    target_set = set(target_columns)
    preferred = [column for column in columns if column not in target_set]
    candidates = preferred
    best_column = None
    best_score = None
    for column in candidates:
        values = [
            row.get(column) if isinstance(row, dict) else None
            for index, row in enumerate(rows)
            if scope_indices is None or index in scope_indices
        ]
        observed = [value for value in values if not is_missing(value)]
        keys = [group_key(value) for value in observed]
        unique_count = len(set(keys))
        if unique_count < 2 or unique_count > 30:
            continue
        numeric_count = sum(to_number(value) is not None for value in observed)
        if numeric_count / max(1, len(observed)) >= 0.8:
            continue
        repeated_count = len(observed) - unique_count
        if repeated_count <= 0:
            continue
        score = (0 if column in target_set else 1000) + repeated_count - unique_count
        if best_score is None or score > best_score:
            best_score = score
            best_column = column
    return best_column


def predict_column_history(rows, column, target_indices, group_column=None, scope_indices=None):
    scope_indices = set(scope_indices if scope_indices is not None else range(len(rows)))
    original_values = [row.get(column) if isinstance(row, dict) else None for row in rows]
    scoped_original_values = [original_values[index] for index in sorted(scope_indices)]
    observed_numbers = numeric_values(scoped_original_values)
    numeric_ratio = len(observed_numbers) / max(1, len([value for value in scoped_original_values if not is_missing(value)]))
    is_numeric_column = len(observed_numbers) >= 2 and numeric_ratio >= 0.7

    if is_numeric_column:
        fallback = statistics.median(observed_numbers) if observed_numbers else None
    else:
        observed = [value for value in scoped_original_values if not is_missing(value)]
        fallback = Counter(observed).most_common(1)[0][0] if observed else None
    working_values = list(original_values)

    predictions = []
    prediction_order = 0
    for row_index in sorted(set(target_indices)):
        if row_index not in scope_indices:
            continue
        if row_index < 0 or row_index >= len(rows) or not is_missing(working_values[row_index]):
            continue

        current_group = group_key(rows[row_index].get(group_column)) if group_column and isinstance(rows[row_index], dict) else None
        if group_column and column == group_column:
            continue
        if group_column and current_group is None:
            continue

        group_values = [working_values[index] for index in scope_indices]
        if group_column:
            group_values = [
                value for index, value in enumerate(working_values)
                if index in scope_indices
                and group_key(rows[index].get(group_column)) == current_group
            ]
        group_numbers = numeric_values(group_values)
        group_fallback = statistics.median(group_numbers) if group_numbers else (statistics.median(observed_numbers) if observed_numbers else None)
        if not is_numeric_column and group_values:
            group_observed = [value for value in group_values if not is_missing(value)]
            group_fallback = Counter(group_observed).most_common(1)[0][0] if group_observed else fallback

        selected_strategy, validation_score, validation_count, metric_name = evaluate_column(
            rows,
            column,
            group_column if current_group is not None else None,
            current_group,
            is_numeric_column,
            history_values=working_values,
            observed_values=original_values,
            scope_indices=scope_indices
        )
        history = prediction_history_for_row(
            rows,
            working_values,
            row_index,
            group_column if current_group is not None else None,
            current_group,
            scope_indices
        )
        predicted_history_count = sum(
            1 for index, _ in history
            if is_missing(original_values[index])
        )
        future_history_count = sum(1 for index, _ in history if index > row_index)
        typed_history = [
            (index, to_number(value) if is_numeric_column else value)
            for index, value in history
        ]

        if is_numeric_column:
            # Re-run on original and predicted same-group values. Leading and
            # interior gaps use future observed values for interpolation.
            prediction = numeric_strategy_prediction(typed_history, row_index, selected_strategy)
            method = selected_strategy
            if future_history_count > 0 or predicted_history_count > 0:
                # Level-only models can repeat their first estimate forever. For
                # gaps with future context or prior imputations, continue the
                # sequence from the complete updated same-group history.
                recursive_prediction = numeric_strategy_prediction(
                    typed_history,
                    row_index,
                    'local-linear-history'
                )
                if recursive_prediction is not None:
                    prediction = recursive_prediction
                    method = f'{selected_strategy}+recursive-history'
            if prediction is None:
                prediction = group_fallback
            prediction = restore_numeric_shape(prediction, scoped_original_values)
        else:
            prediction = categorical_strategy_prediction(typed_history, selected_strategy)
            if prediction is None:
                prediction = group_fallback
            method = selected_strategy

        confidence = 0.35
        if validation_count > 0:
            confidence = min(0.95, 0.45 + min(validation_count, 20) * 0.02)
            if metric_name == 'accuracy':
                confidence = max(confidence, float(validation_score or 0))

        if prediction is None:
            continue
        working_values[row_index] = prediction
        prediction_order += 1
        predictions.append({
            'rowIndex': row_index,
            'column': column,
            'value': prediction,
            'method': method,
            'confidence': round(confidence, 3),
            'group': rows[row_index].get(group_column) if group_column and isinstance(rows[row_index], dict) else None,
            'groupColumn': group_column or '',
            'predictionOrder': prediction_order,
            'historyCount': len(typed_history),
            'usedPredictedHistory': predicted_history_count > 0,
            'predictedHistoryCount': predicted_history_count,
            'modelRefitWithUpdatedHistory': predicted_history_count > 0,
            'futureHistoryCount': future_history_count,
            'usedFutureObservedHistory': future_history_count > 0
        })

    method_name = 'evaluated-numeric-model' if is_numeric_column else 'evaluated-categorical-model'
    return predictions, method_name


def sklearn_feature_value(row, column, numeric_column, row_index):
    if column == '__row_index__':
        return row_index
    value = row.get(column) if isinstance(row, dict) else None
    if numeric_column:
        return to_number(value)
    return '__MISSING__' if is_missing(value) else str(value)


def sklearn_predict_column(rows, columns, column, target_indices, group_column=None, scope_indices=None):
    if not SKLEARN_AVAILABLE:
        return [], ''

    scope_indices = set(scope_indices if scope_indices is not None else range(len(rows)))
    original_values = [row.get(column) if isinstance(row, dict) else None for row in rows]
    scoped_values = [original_values[index] for index in sorted(scope_indices)]
    observed_numbers = numeric_values(scoped_values)
    observed_count = len([value for value in scoped_values if not is_missing(value)])
    is_numeric_target = len(observed_numbers) >= 2 and len(observed_numbers) / max(1, observed_count) >= 0.7

    feature_columns = [name for name in columns if name != column and name != group_column]
    feature_columns.append('__row_index__')
    numeric_features = set()
    for feature in feature_columns:
        feature_values = [
            row.get(feature) if isinstance(row, dict) else None
            for index, row in enumerate(rows)
            if index in scope_indices and feature != '__row_index__'
        ]
        observed_feature_values = [value for value in feature_values if not is_missing(value)]
        numeric_feature_values = numeric_values(observed_feature_values)
        if observed_feature_values and len(numeric_feature_values) / len(observed_feature_values) >= 0.7:
            numeric_features.add(feature)

    numeric_positions = [index for index, feature in enumerate(feature_columns) if feature in numeric_features or feature == '__row_index__']
    categorical_positions = [index for index, feature in enumerate(feature_columns) if index not in numeric_positions]

    def build_features(indices):
        return [
            [sklearn_feature_value(rows[row_index], feature, feature in numeric_features or feature == '__row_index__', row_index)
             for feature in feature_columns]
            for row_index in indices
        ]

    def make_encoder():
        try:
            return OneHotEncoder(handle_unknown='ignore', sparse_output=False)
        except TypeError:
            return OneHotEncoder(handle_unknown='ignore', sparse=False)

    transformers = []
    if numeric_positions:
        transformers.append(('numeric', SimpleImputer(strategy='median'), numeric_positions))
    if categorical_positions:
        transformers.append((
            'categorical',
            Pipeline([
                ('imputer', SimpleImputer(strategy='most_frequent')),
                ('onehot', make_encoder())
            ]),
            categorical_positions
        ))
    if not transformers:
        return [], ''

    predictions = []
    prediction_order = 0
    group_values = [None]
    if group_column:
        group_values = sorted(set(
            group_key(rows[index].get(group_column))
            for index in scope_indices
            if isinstance(rows[index], dict) and group_key(rows[index].get(group_column)) is not None
        ))

    for group_value in group_values:
        def in_group(row_index):
            if not group_column:
                return True
            return group_key(rows[row_index].get(group_column)) == group_value

        train_indices = [
            index for index in sorted(scope_indices)
            if in_group(index) and not is_missing(original_values[index])
        ]
        predict_indices = [
            index for index in sorted(set(target_indices))
            if index in scope_indices and in_group(index) and is_missing(original_values[index])
        ]
        if len(train_indices) < 3 or not predict_indices:
            continue

        if is_numeric_target:
            train_targets = [to_number(original_values[index]) for index in train_indices]
            if any(value is None for value in train_targets):
                continue
            estimator = RandomForestRegressor(
                n_estimators=96,
                random_state=42,
                n_jobs=1,
                min_samples_leaf=1
            )
        else:
            train_targets = [original_values[index] for index in train_indices]
            if len(set(map(str, train_targets))) < 2:
                continue
            estimator = RandomForestClassifier(
                n_estimators=96,
                random_state=42,
                n_jobs=1,
                min_samples_leaf=1
            )

        model = Pipeline([
            ('features', ColumnTransformer(transformers=transformers, remainder='drop')),
            ('model', estimator)
        ])
        try:
            model.fit(build_features(train_indices), train_targets)
            predicted_values = model.predict(build_features(predict_indices))
            training_score = float(model.score(build_features(train_indices), train_targets))
        except Exception:
            continue

        confidence = min(0.95, max(0.35, 0.45 + max(0.0, training_score) * 0.35))
        method = 'scikit-learn-random-forest-regressor' if is_numeric_target else 'scikit-learn-random-forest-classifier'
        for row_index, predicted_value in zip(predict_indices, predicted_values):
            if is_numeric_target:
                predicted_value = float(predicted_value)
                if not math.isfinite(predicted_value):
                    continue
                predicted_value = restore_numeric_shape(predicted_value, scoped_values)
            else:
                predicted_value = str(predicted_value)
            prediction_order += 1
            predictions.append({
                'rowIndex': row_index,
                'column': column,
                'value': predicted_value,
                'method': method,
                'confidence': round(confidence, 3),
                'group': rows[row_index].get(group_column) if group_column and isinstance(rows[row_index], dict) else None,
                'groupColumn': group_column or '',
                'predictionOrder': prediction_order,
                'historyCount': len(train_indices),
                'usedPredictedHistory': False,
                'predictedHistoryCount': 0,
                'modelRefitWithUpdatedHistory': False,
                'futureHistoryCount': 0,
                'usedFutureObservedHistory': False
            })

    return predictions, 'scikit-learn-random-forest'


def predict_column(rows, columns, column, target_indices, group_column=None, scope_indices=None):
    sklearn_predictions, sklearn_method = sklearn_predict_column(
        rows, columns, column, target_indices, group_column, scope_indices
    )
    predicted_indices = {prediction['rowIndex'] for prediction in sklearn_predictions}
    remaining_indices = [index for index in target_indices if index not in predicted_indices]
    if not remaining_indices:
        return sklearn_predictions, sklearn_method

    history_predictions, history_method = predict_column_history(
        rows, column, remaining_indices, group_column, scope_indices
    )
    method = history_method if not sklearn_predictions else f'{sklearn_method}+history-fallback'
    return sklearn_predictions + history_predictions, method


def main():
    try:
        payload = json.load(sys.stdin)
        rows = payload.get('rows') if isinstance(payload, dict) else []
        columns = payload.get('columns') if isinstance(payload, dict) else []
        target_columns = payload.get('targetColumns') if isinstance(payload, dict) else []
        target_indices = payload.get('targetRowIndices') if isinstance(payload, dict) else []
        scope_indices = payload.get('scopeRowIndices') if isinstance(payload, dict) else []
        requested_group_column = str(payload.get('groupColumn') or '').strip() if isinstance(payload, dict) else ''
        rows = rows if isinstance(rows, list) else []
        columns = [str(column) for column in columns if str(column).strip()]
        target_columns = [str(column) for column in target_columns if str(column).strip()]
        target_indices = [int(index) for index in target_indices if isinstance(index, (int, float)) and int(index) >= 0]
        scope_indices = scope_indices if isinstance(scope_indices, list) else []
        scope_indices = [int(index) for index in scope_indices if isinstance(index, (int, float)) and int(index) >= 0]
        scope_indices = sorted(set(index for index in scope_indices if index < len(rows)))
        if not scope_indices:
            scope_indices = list(range(len(rows)))
        scope_index_set = set(scope_indices)

        requested_group_column_invalid = bool(
            requested_group_column
            and requested_group_column in columns
            and not is_categorical_group_column(rows, requested_group_column, scope_index_set)
        )
        group_column = (
            requested_group_column
            if requested_group_column in columns and not requested_group_column_invalid
            else infer_group_column(rows, columns, target_columns, scope_index_set)
        )

        predictions = []
        methods = {}
        evaluations = []
        effective_targets = [column for column in target_columns if column in columns] or target_columns
        for column in effective_targets:
            values = [row.get(column) if isinstance(row, dict) else None for row in rows]
            scoped_values = [values[index] for index in scope_indices]
            observed_numbers = numeric_values(scoped_values)
            observed_count = len([value for value in scoped_values if not is_missing(value)])
            is_numeric_column = len(observed_numbers) >= 2 and len(observed_numbers) / max(1, observed_count) >= 0.7
            group_values = [None]
            if group_column:
                group_values = sorted(set(
                    group_key(row.get(group_column))
                    for index, row in enumerate(rows)
                    if index in scope_index_set
                    if isinstance(row, dict) and group_key(row.get(group_column)) is not None
                ))
            for group_value in group_values:
                strategy, score, validation_count, metric = evaluate_column(
                    rows,
                    column,
                    group_column if group_value is not None else None,
                    group_value,
                    is_numeric_column,
                    scope_indices=scope_index_set
                )
                evaluations.append({
                    'column': column,
                    'group': group_value,
                    'groupColumn': group_column or '',
                    'method': strategy,
                    'metric': metric,
                    'score': score,
                    'validationCount': validation_count
                })
            column_predictions, method = predict_column(
                rows,
                columns,
                column,
                target_indices,
                group_column,
                scope_index_set
            )
            predictions.extend(column_predictions)
            methods[column] = method

        sequential_predictions = sum(
            1 for prediction in predictions
            if prediction.get('usedPredictedHistory')
        )

        sklearn_used = any(str(method).startswith('scikit-learn-') for method in methods.values())
        print(json.dumps({
            'success': True,
            'predictions': predictions,
            'methods': methods,
            'model': (
                'scikit-learn-random-forest+history-fallback'
                if sklearn_used and any('history-fallback' in str(method) for method in methods.values())
                else 'scikit-learn-random-forest'
                if sklearn_used
                else 'group-aware-history-predictor'
                if group_column
                else 'history-aware-local-predictor'
            ),
            'groupColumn': group_column or '',
            'rowsAnalyzed': len(scope_indices),
            'rowsAvailable': len(rows),
            'columnsAnalyzed': len(effective_targets),
            'evaluations': evaluations,
            'sequentialPredictions': sequential_predictions,
            'groupColumnRejected': requested_group_column_invalid
        }, ensure_ascii=False))
    except Exception as error:
        print(json.dumps({'success': False, 'error': str(error)}))
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
