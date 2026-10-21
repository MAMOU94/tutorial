
// Helper functions
export const fmt = (v, digits = 4) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return 'N/A';
    return n.toFixed(digits);
};

export const fmtP = (p) => {
    const n = Number(p);
    if (!Number.isFinite(n)) return 'N/A';
    return n < 0.001 ? '< .001' : n.toFixed(4);
};

export const corrStrength = (r) => {
    if (r == null || Number.isNaN(r)) return 'unknown';
    const a = Math.abs(r);
    if (a < 0.1) return 'very weak';
    if (a < 0.3) return 'weak';
    if (a < 0.5) return 'moderate';
    if (a < 0.7) return 'strong';
    return 'very strong';
};

export const corrDirection = (r) => (r == null || Number.isNaN(r)) ? 'unknown' : (r >= 0 ? 'positive' : 'negative');

export const effectSizeLabel = (v) => {
    if (v == null || Number.isNaN(v)) return 'unknown';
    const a = Math.abs(v);
    if (a < 0.2) return 'small';
    if (a < 0.5) return 'medium';
    return 'large';
};

const getLinearRegressionDisplayLabel = (result) => {
    const explicitVariant = String(result?.regression_linear_variant || '').trim().toLowerCase();
    const inferredVariant = Array.isArray(result?.predictors) && result.predictors.length > 1 ? 'multiple' : 'simple';
    return (explicitVariant === 'multiple' ? 'multiple' : explicitVariant === 'simple' ? 'simple' : inferredVariant) === 'multiple'
        ? 'Multiple Linear Regression'
        : 'Simple Linear Regression';
};

const getRegressionDisplayLabel = (result) => {
    if (result?.mode === 'regression_linear') return getLinearRegressionDisplayLabel(result);
    if (result?.mode === 'regression_ordinal_logistic') return 'Ordinal Logistic Regression';
    return 'Logistic Regression';
};

const normalizeRegressionEquationTerm = (term) => String(term || '')
    .replace(/`/g, '')
    .trim();

export const buildLinearRegressionEquation = (result, options = {}) => {
    const equationLabel = String(options?.equationLabel || 'Y').trim() || 'Y';
    const digits = Number.isFinite(Number(options?.digits)) ? Math.max(0, Math.min(8, Number(options.digits))) : 4;
    const coefficients = Array.isArray(result?.coefficients) ? result.coefficients : [];
    if (coefficients.length === 0) return '';

    const interceptRow = coefficients.find((row) => normalizeRegressionEquationTerm(row?.Term) === '(Intercept)');
    const predictorRows = coefficients.filter((row) => {
        const term = normalizeRegressionEquationTerm(row?.Term);
        return term && term !== '(Intercept)' && Number.isFinite(Number(row?.Estimate));
    });

    const parts = [];
    const interceptValue = Number(interceptRow?.Estimate);
    if (Number.isFinite(interceptValue)) {
        parts.push(interceptValue.toFixed(digits));
    }

    predictorRows.forEach((row, index) => {
        const estimate = Number(row?.Estimate);
        const term = normalizeRegressionEquationTerm(row?.Term) || `X${index + 1}`;
        if (!Number.isFinite(estimate)) return;
        const coefficientText = `${Math.abs(estimate).toFixed(digits)}(${term})`;
        if (parts.length === 0) {
            parts.push(estimate < 0 ? `-${coefficientText}` : coefficientText);
        } else {
            parts.push(`${estimate < 0 ? ' - ' : ' + '}${coefficientText}`);
        }
    });

    if (parts.length === 0) return '';
    return `${equationLabel} = ${parts.join('')}`;
};

const rmAnovaEtaLabel = (eta) => {
    if (!Number.isFinite(Number(eta))) return 'unknown';
    const n = Number(eta);
    if (n < 0.01) return 'negligible';
    if (n < 0.06) return 'small';
    if (n < 0.14) return 'medium';
    return 'large';
};

export const rmAnovaEffectSummary = (rm) => {
    if (!rm || typeof rm !== 'object') {
        return { eta: null, label: 'unknown', text: 'RM ANOVA effect interpretation unavailable.' };
    }

    const etaFromR = Number(rm.effect_size);
    let eta = Number.isFinite(etaFromR) ? etaFromR : null;
    if (eta == null) {
        const f = Number(rm.statistic);
        const df1 = Number(rm.df1_uncorrected ?? rm.df1);
        const df2 = Number(rm.df2_uncorrected ?? rm.df2);
        const denom = (f * df1) + df2;
        if (Number.isFinite(f) && Number.isFinite(df1) && Number.isFinite(df2) && denom !== 0) {
            eta = (f * df1) / denom;
        }
    }

    const label = rm.effect_size_label || rmAnovaEtaLabel(eta);
    const sigText = rm.is_significant
        ? 'Statistically significant repeated-condition effect'
        : 'No statistically significant repeated-condition effect';

    if (typeof rm.significance_effect_interpretation === 'string' && rm.significance_effect_interpretation.trim()) {
        return { eta, label, text: rm.significance_effect_interpretation.trim() };
    }
    if (eta != null) {
        return {
            eta,
            label,
            text: `${sigText}; magnitude is ${label} (partial eta-squared = ${fmt(eta, 3)}).`
        };
    }
    return { eta: null, label: label || 'unknown', text: `${sigText}; effect-size magnitude unavailable.` };
};

const toRStylePValue = (formatted, raw) => {
    const txt = String(formatted || '').trim();
    if (txt && txt !== 'N/A') return txt;
    const p = Number(raw);
    if (!Number.isFinite(p)) return 'NA';
    if (p < 0.0001) return p.toExponential(3);
    return p.toFixed(4);
};

const toRStyleStars = (pRaw) => {
    const p = Number(pRaw);
    if (!Number.isFinite(p)) return '';
    if (p <= 0.001) return '***';
    if (p <= 0.01) return '**';
    if (p <= 0.05) return '*';
    if (p <= 0.1) return '.';
    return '';
};

export const buildRmAnovaROutput = (rm, posthocRows = [], tableRows = []) => {
    if (!rm || typeof rm !== 'object') return 'RM ANOVA output not available.';

    const fVal = Number(rm.statistic);
    const df1Unc = Number(rm.df1_uncorrected ?? rm.df1);
    const df2Unc = Number(rm.df2_uncorrected ?? rm.df2);
    const df1Final = Number(rm.df1);
    const df2Final = Number(rm.df2);
    const pUncRaw = Number(rm.p_uncorrected ?? rm.p_value);
    const pFinalRaw = Number(rm.p_value);
    const pUncText = toRStylePValue(rm.formatted_p_uncorrected, pUncRaw);
    const pFinalText = toRStylePValue(rm.formatted_p, pFinalRaw);
    const uncStars = toRStyleStars(pUncRaw);
    const finalStars = toRStyleStars(pFinalRaw);
    const correctionText = String(rm.correction_used || '').trim() === 'none'
        ? 'none'
        : String(rm.correction_used || 'NA');

    const formatDf = (value) => {
        const n = Number(value);
        if (!Number.isFinite(n)) return 'NA';
        return Math.abs(n - Math.round(n)) < 1e-9 ? String(Math.round(n)) : n.toFixed(3);
    };
    const formatNum = (value, digits = 4) => {
        const n = Number(value);
        return Number.isFinite(n) ? n.toFixed(digits) : '';
    };

    const lines = [
        'Repeated Measures ANOVA (aov)',
        '',
        'aov(formula = Value ~ Condition + Error(SubjectID/Condition))',
        ''
    ];

    const rmRows = Array.isArray(tableRows)
        ? tableRows.filter((row) => row && typeof row === 'object')
        : [];
    if (rmRows.length > 0) {
        let currentStratum = null;
        rmRows.forEach((row) => {
            const stratumRaw = String(row?.stratum || 'Error: SubjectID:Condition');
            const stratum = stratumRaw.toLowerCase().startsWith('error:')
                ? stratumRaw
                : `Error: ${stratumRaw}`;
            if (stratum !== currentStratum) {
                if (currentStratum !== null) lines.push('');
                lines.push(stratum);
                lines.push('             Df  Sum Sq Mean Sq F value Pr(>F)');
                currentStratum = stratum;
            }
            const pRaw = Number(row?.p_value);
            const pText = Number.isFinite(pRaw) ? toRStylePValue(row?.formatted_p, pRaw) : '';
            const stars = Number.isFinite(pRaw) ? toRStyleStars(pRaw) : '';
            lines.push(
                `${String(row?.source || '')}\t${formatDf(row?.df)}\t${formatNum(row?.sum_sq, 4)}\t${formatNum(row?.mean_sq, 4)}\t${formatNum(row?.statistic, 4)}\t${pText}${stars ? ` ${stars}` : ''}`
            );
        });
    } else {
        lines.push('Error: SubjectID:Condition');
        lines.push('             Df  F value Pr(>F)');
        lines.push(`Condition\t${Number.isFinite(df1Unc) ? df1Unc.toFixed(3) : 'NA'}\t${Number.isFinite(fVal) ? fVal.toFixed(3) : 'NA'}\t${pUncText}${uncStars ? ` ${uncStars}` : ''}`);
    }

    lines.push(
        '',
        "Mauchly's Test for Sphericity",
        `W = ${Number.isFinite(Number(rm.mauchly_w)) ? Number(rm.mauchly_w).toFixed(4) : 'NA'}, p-value = ${toRStylePValue(rm.mauchly_formatted_p, rm.mauchly_p_value)}`,
        '',
        'Sphericity corrections',
        `Greenhouse-Geisser epsilon: ${Number.isFinite(Number(rm.gg_epsilon)) ? Number(rm.gg_epsilon).toFixed(3) : 'NA'}, p = ${toRStylePValue(rm.gg_formatted_p, rm.gg_p_value)}`,
        `Huynh-Feldt epsilon: ${Number.isFinite(Number(rm.hf_epsilon)) ? Number(rm.hf_epsilon).toFixed(3) : 'NA'}, p = ${toRStylePValue(rm.hf_formatted_p, rm.hf_p_value)}`,
        `Selected correction: ${correctionText}`,
        '',
        `Final inference: F(${Number.isFinite(df1Final) ? df1Final.toFixed(3) : 'NA'}, ${Number.isFinite(df2Final) ? df2Final.toFixed(3) : 'NA'}) = ${Number.isFinite(fVal) ? fVal.toFixed(3) : 'NA'}, p-value = ${pFinalText}${finalStars ? ` ${finalStars}` : ''}`,
        "Signif. codes: 0 '***' 0.001 '**' 0.01 '*' 0.05 '.' 0.1 ' ' 1"
    );

    if (Array.isArray(posthocRows) && posthocRows.length > 0) {
        lines.push('', 'Pairwise comparisons using paired t tests with Bonferroni adjustment', 'Comparison\tp.adj\tSig');
        posthocRows.forEach((row) => {
            const pAdjRaw = Number(row?.p_adj);
            const pAdjText = toRStylePValue(row?.formatted_p, pAdjRaw);
            const sig = row?.is_significant ? (toRStyleStars(pAdjRaw) || '*') : 'ns';
            lines.push(`${String(row?.comparison || 'NA')}\t${pAdjText}\t${sig}`);
        });
    }

    return lines.join('\n');
};

export const buildFriedmanROutput = (friedman, posthocRows = []) => {
    if (!friedman || typeof friedman !== 'object') return 'Friedman output not available.';

    const stat = Number(friedman.statistic);
    const df = Number(friedman.df);
    const pRaw = Number(friedman.p_value);
    const pText = toRStylePValue(friedman.formatted_p, pRaw);
    const stars = toRStyleStars(pRaw);
    const lines = [
        'Friedman rank sum test',
        '',
        'data: Value and Condition and SubjectID',
        `Friedman chi-squared = ${Number.isFinite(stat) ? stat.toFixed(3) : 'NA'}, df = ${Number.isFinite(df) ? df.toFixed(0) : 'NA'}, p-value = ${pText}${stars ? ` ${stars}` : ''}`,
        "Signif. codes: 0 '***' 0.001 '**' 0.01 '*' 0.05 '.' 0.1 ' ' 1"
    ];

    if (Array.isArray(posthocRows) && posthocRows.length > 0) {
        lines.push('', 'Post hoc (Nemenyi)', 'Comparison\tq\tp.adj\tSig');
        posthocRows.forEach((row) => {
            const q = Number(row?.statistic);
            const pAdjRaw = Number(row?.p_adj);
            const pAdjText = toRStylePValue(row?.formatted_p, pAdjRaw);
            const sig = row?.is_significant ? (toRStyleStars(pAdjRaw) || '*') : 'ns';
            lines.push(`${String(row?.comparison || 'NA')}\t${Number.isFinite(q) ? q.toFixed(3) : 'NA'}\t${pAdjText}\t${sig}`);
        });
    }

    return lines.join('\n');
};

export const toArray = (v) => {
    if (Array.isArray(v)) return v;
    if (v == null) return [];
    return [v];
};

export const computeElbowK = (optimizationData) => {
    if (!optimizationData) return null;
    const ks = optimizationData.k_values;
    const wss = optimizationData.wss;
    if (!Array.isArray(ks) || !Array.isArray(wss) || ks.length < 3 || wss.length < 3) return null;
    const xs = ks.map(Number);
    const ys = wss.map(Number);
    if (xs.some((v) => !Number.isFinite(v)) || ys.some((v) => !Number.isFinite(v))) return null;
    const x1 = xs[0];
    const y1 = ys[0];
    const x2 = xs[xs.length - 1];
    const y2 = ys[ys.length - 1];
    const denom = Math.hypot(y2 - y1, x2 - x1);
    if (!Number.isFinite(denom) || denom === 0) return null;
    let maxDist = -Infinity;
    let bestK = null;
    for (let i = 1; i < xs.length - 1; i += 1) {
      const dist = Math.abs((y2 - y1) * xs[i] - (x2 - x1) * ys[i] + x2 * y1 - y2 * x1) / denom;
      if (dist > maxDist) {
        maxDist = dist;
        bestK = xs[i];
      }
    }
    return bestK;
};

export const generateReport = (result, type) => {
      if (!result) return [];
      const report = [];
      const alpha = 0.05; // Default alpha

      const resolveSampleType = (src) => {
          const raw = String(src?.sample_type ?? src?.sampleType ?? '').trim();
          const lowered = raw.toLowerCase();
          if (lowered.includes('paired') || lowered.includes('repeated') || lowered.includes('within')) {
              return 'Paired / Repeated';
          }
          if (lowered.includes('independent') || lowered.includes('between')) {
              return 'Independent';
          }
          const tName = String(src?.ttest?.test_name || '').toLowerCase();
          if (tName.includes('paired')) return 'Paired / Repeated';
          if (src?.rm_anova || src?.friedman || src?.wilcoxon || src?.rm_anova_posthoc || src?.friedman_posthoc) {
              return 'Paired / Repeated';
          }
          if (src?.ttest || src?.anova || src?.kruskal || src?.mann_whitney || src?.tukey || src?.games_howell || src?.dunn) {
              return 'Independent';
          }
          return raw || 'N/A';
      };
      const sampleType = resolveSampleType(result);

      // Helper for significance
      const sigText = (p) => {
          if (p == null || isNaN(p)) return "significance unknown";
          if (p < 0.001) return "highly statistically significant (p < 0.001)";
          if (p < 0.05) return `statistically significant (p = ${fmtP(p)})`;
          if (p < 0.1) return `marginally significant (p = ${fmtP(p)})`;
          return `not statistically significant (p = ${fmtP(p)})`;
      };

      if (type === 'general' || !type) {
           if (result.mode === 'descriptive') {
               report.push(`Descriptive Statistics Report`);
               report.push(`Analyzed ${result.n_rows} observations.`);
           } else if (result.mode === 'inferential') {
               report.push(`Inferential Statistics Report (${result.test_type})`);
               report.push(`Test: ${result.method}`);
               report.push(`P-Value: ${fmt(result.p_value, 4)}`);
               if (result.p_value < (result.alpha || alpha)) {
                   report.push(`Result: Statistically Significant (p < ${result.alpha || alpha}). Reject null hypothesis.`);
               } else {
                   report.push(`Result: Not Significant (p >= ${result.alpha || alpha}). Fail to reject null hypothesis.`);
               }
           } else if (result.mode && result.mode.startsWith('regression')) {
               report.push(`Regression Analysis Report (${getRegressionDisplayLabel(result)})`);
               if (result.r_squared) report.push(`R-Squared: ${fmt(result.r_squared, 3)} (Explains ${fmt(result.r_squared*100, 1)}% of variance)`);
               if (result.aic) report.push(`AIC: ${fmt(result.aic, 1)} (Lower is better)`);
           } else if (result.mode === 'multivariate_pca') {
                report.push(`Principal Component Analysis (PCA) Report`);
                report.push(`Goal: Reduce dimensionality while retaining variance.`);
                if (result.eigenvalues && result.eigenvalues.length > 0) {
                    const firstPC = result.eigenvalues[0];
                    report.push(`• PC1 explains ${firstPC.Variance_Percent}% of the total variance.`);
                    if (result.eigenvalues.length > 1) {
                        const secondPC = result.eigenvalues[1];
                        report.push(`• PC2 explains ${secondPC.Variance_Percent}% of the total variance.`);
                        report.push(`• Together, the first 2 components capture ${secondPC.Cumulative_Percent}% of the information.`);
                    }
                }
           } else if (result.mode === 'multivariate_kmeans') {
                report.push(`K-Means Clustering Report`);
                const finalK = result.k || result.optimal_k;
                const silhouetteBestK = Number.isFinite(Number(result.silhouette_k)) ? Number(result.silhouette_k) : (Number.isFinite(Number(result.optimal_k)) ? Number(result.optimal_k) : null);
                const optimizationMethod = String(result.cluster_optimization_method || 'both').toLowerCase();
                report.push(`Goal: Partition data into ${finalK || 'N/A'} groups.`);
                report.push(`• Total Within-Cluster Sum of Squares: ${fmt(result.tot_withinss, 1)}. (Lower usually indicates tighter clusters).`);
                report.push(`• Between-Cluster Sum of Squares: ${fmt(result.betweenss, 1)}.`);
                report.push(`• K optimization method: ${optimizationMethod}.`);
                if (finalK) report.push(`• Final K used: ${finalK}.`);
                if (Number.isFinite(silhouetteBestK)) report.push(`• Silhouette-best K: ${silhouetteBestK}.`);
                if (result.elbow_k) report.push(`• Elbow Suggested K: ${result.elbow_k}.`);
                if (result.avg_silhouette_width != null) {
                    report.push(`• Avg Silhouette Width: ${fmt(result.avg_silhouette_width, 4)}.`);
                }
                if (result.cluster_sizes) {
                    report.push(`• Cluster Sizes: ${result.cluster_sizes.join(', ')}.`);
                }
           } else if (result.mode === 'multivariate_clustering') {
                report.push(`Clustering Report`);
                const finalK = result.k || result.optimal_k;
                const silhouetteBestK = Number.isFinite(Number(result.silhouette_k)) ? Number(result.silhouette_k) : (Number.isFinite(Number(result.optimal_k)) ? Number(result.optimal_k) : null);
                const optimizationMethod = String(result.cluster_optimization_method || 'both').toLowerCase();
                report.push(`Goal: group similar observations into clusters.`);
                report.push(`• Final cluster count used: ${finalK || 'N/A'}.`);
                report.push(`• K optimization method: ${optimizationMethod}.`);
                if (Number.isFinite(silhouetteBestK)) report.push(`• Silhouette-best K: ${silhouetteBestK}.`);
                if (result.elbow_k) report.push(`• Elbow Suggested K: ${result.elbow_k}.`);
                if (result.k_decision_method) report.push(`• Final K decision method: ${result.k_decision_method}.`);
                if (Number.isFinite(Number(result.avg_silhouette_width))) {
                    report.push(`• Avg silhouette width: ${fmt(result.avg_silhouette_width, 4)}.`);
                }
           } else if (result.mode === 'multivariate_hclust') {
                report.push(`Hierarchical Clustering Report`);
                report.push(`Goal: Build a hierarchy of clusters.`);
                report.push(`• Method: ${result.method || 'Complete'} Linkage.`);
                report.push(`• Distance Metric: ${result.distance || 'Euclidean'}.`);
                if (result.hclust_scale) report.push(`• Feature scaling: ${result.hclust_scale}.`);
                if (result.hclust_visual_scale) report.push(`• Visualization scale: ${result.hclust_visual_scale}`);
                if (Array.isArray(result.hclust_encoded_categorical_predictors) && result.hclust_encoded_categorical_predictors.length > 0) {
                    report.push(`• Encoded categorical predictors: ${result.hclust_encoded_categorical_predictors.join(', ')}.`);
                }
                if (Array.isArray(result.hclust_added_features) && result.hclust_added_features.length > 0) {
                    report.push(`• Biology-aware derived features: ${result.hclust_added_features.join(', ')}.`);
                }
                if (Array.isArray(result.hclust_dropped_predictors) && result.hclust_dropped_predictors.length > 0) {
                    report.push(`• Dropped low-information predictors: ${result.hclust_dropped_predictors.join(', ')}.`);
                }
                const biologicalNotes = Array.isArray(result.biological_process_notes)
                    ? result.biological_process_notes
                    : (result.biological_process_notes ? [String(result.biological_process_notes)] : []);
                if (biologicalNotes.length > 0) {
                    biologicalNotes.slice(0, 2).forEach((note) => report.push(`• ${note}`));
                }
                report.push(`• Inspect the dendrogram to determine the natural number of clusters.`);
           }
      } else if (type === 'correlation') {
          const r = result.bivariate?.correlation?.pearson;
          const p = result.bivariate?.correlation?.p_value;
          const n = result.bivariate?.correlation?.n;
          
          if (r != null) {
              report.push(`Correlation Analysis Report:`);
              report.push(`We observed a ${corrStrength(r)} ${corrDirection(r)} linear relationship between the variables (r = ${fmt(r, 3)}).`);
              report.push(`Based on the sample size of ${n}, this correlation is ${sigText(p)}.`);
              report.push(p < 0.05 
                  ? "This suggests that as one variable increases, the other tends to change in a specific direction predictably." 
                  : "There is insufficient evidence to conclude that a significant linear relationship exists between these variables in the population.");
              report.push(`The coefficient of determination (r²) is ${fmt(r*r, 3)}, meaning that approximately ${(r*r*100).toFixed(1)}% of the variation in one variable can be explained by the other.`);
          }
      } 
      else if (type === 'linear_regression') {
          const r2 = result.model_stats?.r_squared;
          const f_p = result.model_stats?.p_value_model;
          const rmse = result.linear_evaluation?.test?.rmse;
          const linearRegressionLabel = getLinearRegressionDisplayLabel(result);
          const equationText = buildLinearRegressionEquation(result);
          
          report.push(`${linearRegressionLabel} Model Report:`);
          if (equationText) {
              report.push(`Equation: ${equationText}`);
              if (result?.response_variable) {
                  report.push(`Y represents ${result.response_variable}.`);
              }
          }
          report.push(`The model explains ${(r2 * 100).toFixed(1)}% of the variance in the response variable (R² = ${fmt(r2, 4)}).`);
          report.push(`The overall model is ${sigText(f_p)}, indicating that the selected predictors collectively have a significant effect.`);
          if (rmse != null) report.push(`On the test set, the model's predictions differ from actual values by an average of ${fmt(rmse, 4)} units (RMSE).`);
          
          const significantCoefs = (result.coefficients || []).filter(c => c.pValue < 0.05 && c.Term !== '(Intercept)');
          if (significantCoefs.length > 0) {
              report.push(`Significant Predictors:`);
              significantCoefs.forEach(c => {
                  report.push(`• ${c.Term}: For every 1 unit increase, the response ${c.Estimate > 0 ? 'increases' : 'decreases'} by ${Math.abs(c.Estimate).toFixed(4)} units, holding other factors constant.`);
              });
          } else {
              report.push("No individual predictors were found to be statistically significant at the 0.05 level.");
          }
      }
      else if (type === 'logistic_regression') {
          const auc = result.evaluation?.test?.auc;
          const acc = result.evaluation?.test?.accuracy;
          
          report.push(`Logistic Regression Classification Report:`);
          report.push(`The model achieves a prediction accuracy of ${fmt(acc * 100, 1)}% on the test set.`);
          report.push(`The Area Under the Curve (AUC) is ${fmt(auc, 3)}. ${auc > 0.8 ? "This indicates excellent discrimination capability." : auc > 0.7 ? "This indicates acceptable discrimination." : "The model struggles to distinguish between classes."}`);
          
          const significantCoefs = (result.coefficients || []).filter(c => c.pValue < 0.05 && c.Term !== '(Intercept)');
          if (significantCoefs.length > 0) {
              report.push(`Significant Predictors (Risk Factors):`);
              significantCoefs.forEach(c => {
                  const oddsChange = (c.OddsRatio - 1) * 100;
                  report.push(`• ${c.Term}: Associated with a ${Math.abs(oddsChange).toFixed(1)}% ${oddsChange > 0 ? 'increase' : 'decrease'} in the odds of the outcome occurring (p = ${fmtP(c.pValue)}).`);
              });
          }
      }
      else if (type === 'ordinal_logistic_regression') {
          const lrP = result.model_stats?.lr_p_value;
          const pseudoR2 = result.model_stats?.pseudo_r2_mcfadden;
          const levels = Array.isArray(result.response_levels) ? result.response_levels : [];
          const significantCoefs = (result.coefficients || []).filter((c) => (
              c.pValue < 0.05
              && c.Term !== '(Intercept)'
              && String(c?.CoefficientType || c?.coefficient_type || '').trim().toLowerCase() !== 'threshold'
          ));

          report.push('Ordinal Logistic Regression Report:');
          if (levels.length > 0) {
              report.push(`Ordered outcome levels: ${levels.join(' < ')}.`);
          }
          if (result.formula) {
              report.push(`Formula: ${result.formula}`);
          }
          report.push(`The overall model is ${sigText(lrP)}.`);
          if (pseudoR2 != null) {
              report.push(`McFadden's pseudo R² is ${fmt(pseudoR2, 4)}.`);
          }

          if (significantCoefs.length > 0) {
              report.push('Significant Predictors:');
              significantCoefs.forEach((c) => {
                  const oddsRatio = Number(c.OddsRatio);
                  if (Number.isFinite(oddsRatio)) {
                      const oddsChange = (oddsRatio - 1) * 100;
                      report.push(`• ${c.Term}: Associated with a ${Math.abs(oddsChange).toFixed(1)}% ${oddsChange > 0 ? 'increase' : 'decrease'} in the odds of being in a higher response category (p = ${fmtP(c.pValue)}).`);
                  } else {
                      report.push(`• ${c.Term}: Statistically significant effect on the ordered response (p = ${fmtP(c.pValue)}).`);
                  }
              });
          } else {
              report.push('No predictor terms were statistically significant at the 0.05 level.');
          }
      }
      else if (type === 'one_value') {
          report.push(`One Value Comparison Report:`);
          report.push(`Sample Type: One-sample`);
          const ov = result.one_value || {};
          if (ov.variable) report.push(`Variable: ${ov.variable}`);
          if (ov.data_type) report.push(`Data type: ${ov.data_type}`);
          if (ov.selected_test) report.push(`Selected test: ${ov.selected_test}`);

          if (result.ttest) {
              const t = result.ttest;
              report.push(`${t.test_name || 'One-sample t-test'}: t = ${fmt(t.statistic, 3)}, df = ${fmt(t.df, 3)}, p = ${t.formatted_p || fmtP(t.p_value)} (${sigText(t.p_value)}).`);
              report.push(`Sample mean = ${fmt(t.mean1, 3)}, reference mean = ${fmt(t.mean2, 3)}.`);
          } else if (result.wilcoxon) {
              const w = result.wilcoxon;
              report.push(`${w.test_name || 'Wilcoxon Signed-Rank Test (One-Sample)'}: V = ${fmt(w.statistic, 3)}, p = ${w.formatted_p || fmtP(w.p_value)} (${sigText(w.p_value)}).`);
              report.push(`Sample median = ${fmt(w.median1, 3)}, reference = ${fmt(w.median2, 3)}.`);
          } else if (ov.proportion_test) {
              const ptest = ov.proportion_test;
              report.push(`${ptest.method || 'Proportion test'}: ${ptest.statistic_label || 'Statistic'} = ${fmt(ptest.statistic, 3)}, p = ${ptest.formatted_p || fmtP(ptest.p_value)} (${sigText(ptest.p_value)}).`);
              report.push(`Observed proportion = ${fmt(ov.observed_proportion, 4)} (${ov.observed_successes}/${ov.n_total}), reference proportion = ${fmt(ov.reference_proportion, 4)}.`);
          } else if (ov.chisq_gof || result.chisq_gof) {
              const gof = ov.chisq_gof || result.chisq_gof;
              report.push(`Chi-square goodness-of-fit: χ² = ${fmt(gof.statistic, 3)}, df = ${fmt(gof.df, 3)}, p = ${gof.formatted_p || fmtP(gof.p_value)} (${sigText(gof.p_value)}).`);
              if (gof.message) report.push(gof.message);
          }

          if (ov.rationale) {
              report.push(`Rationale: ${ov.rationale}`);
          }
      }
      else if (type === 't_test') {
          const t = result.ttest?.statistic;
          const p = result.ttest?.p_value;
          const d = result.ttest?.cohens_d;
          const df = result.ttest?.df;
          const m1 = result.ttest?.mean1;
          const m2 = result.ttest?.mean2;
          const g1 = result.ttest?.group1;
          const g2 = result.ttest?.group2;
          const diff = result.ttest?.mean_diff;
          const ciLow = result.ttest?.ci_lower;
          const ciHigh = result.ttest?.ci_upper;
          
          report.push(`Student's t-Test Report:`);
          report.push(`Sample Type: ${sampleType}`);
          report.push(`A t-test was conducted to compare the means of the two groups.`);
          report.push(`The test yielded a t-statistic of ${fmt(t, 3)} with ${fmt(df, 1)} degrees of freedom and was ${sigText(p)} (p = ${fmtP(p)}).`);
          
          if (g1 && g2) {
            report.push(`Group Comparison:`);
            report.push(`• Group 1 (${g1}): Mean = ${fmt(m1, 3)}`);
            report.push(`• Group 2 (${g2}): Mean = ${fmt(m2, 3)}`);
            report.push(`• Mean Difference: ${fmt(diff, 3)}`);
          }
          
          if (ciLow != null && ciHigh != null) {
             report.push(`95% Confidence Interval for the difference: [${fmt(ciLow, 3)}, ${fmt(ciHigh, 3)}].`);
          }

          report.push(p < 0.05 
              ? "We reject the null hypothesis. There is a statistically significant difference between the group means." 
              : "We fail to reject the null hypothesis. There is no statistically significant difference between the group means.");
          if (d != null) report.push(`The effect size (Cohen's d) is ${fmt(d, 3)}, which is considered a ${effectSizeLabel(d)} effect.`);
      }
      else if (type === 'mann_whitney') {
          const mwu = result.mann_whitney;
          if (mwu) {
              report.push(`Mann-Whitney U Test Report:`);
              report.push(`Sample Type: ${sampleType}`);
              report.push(`A non-parametric Mann-Whitney U test was performed to compare distributions between two independent groups.`);
              report.push(`The test yielded a U-statistic of ${fmt(mwu.statistic, 3)} and was ${sigText(mwu.p_value)} (p = ${mwu.formatted_p}).`);
              if (mwu.rank_biserial != null) {
                  report.push(`Rank-biserial correlation: ${fmt(mwu.rank_biserial, 3)} (${mwu.rank_biserial_effect || 'effect size'}).`);
              } else if (mwu.rank_biserial_formatted) {
                  report.push(`Rank-biserial correlation: ${mwu.rank_biserial_formatted}${mwu.rank_biserial_effect ? ` (${mwu.rank_biserial_effect})` : ''}.`);
              }
              if (mwu.group1 && mwu.group2) {
                  report.push(`Group medians: ${mwu.group1} = ${fmt(mwu.median1, 3)}, ${mwu.group2} = ${fmt(mwu.median2, 3)}.`);
              }
              report.push(mwu.is_significant
                  ? "We reject the null hypothesis. There is a statistically significant difference between the group distributions."
                  : "We fail to reject the null hypothesis. There is no statistically significant difference between the group distributions.");
              if (mwu.rank_biserial_interpretation) report.push(`${mwu.rank_biserial_interpretation}`);
              report.push(`${mwu.message}`);
          } else {
              report.push("Mann-Whitney U test results not found.");
          }
      }
      else if (type === 'wilcoxon') {
          const wilcox = result.wilcoxon;
          if (wilcox) {
              report.push(`Wilcoxon Signed-Rank Test Report:`);
              report.push(`Sample Type: ${sampleType}`);
              report.push(`A non-parametric Wilcoxon Signed-Rank test was performed to compare distributions between two paired groups.`);
              report.push(`The test yielded a V-statistic of ${fmt(wilcox.statistic, 3)} and was ${sigText(wilcox.p_value)} (p = ${wilcox.formatted_p}).`);
              if (wilcox.rank_biserial != null) {
                  report.push(`Rank-biserial correlation: ${fmt(wilcox.rank_biserial, 3)} (${wilcox.rank_biserial_effect || 'effect size'}).`);
              } else if (wilcox.rank_biserial_formatted) {
                  report.push(`Rank-biserial correlation: ${wilcox.rank_biserial_formatted}${wilcox.rank_biserial_effect ? ` (${wilcox.rank_biserial_effect})` : ''}.`);
              }
              if (wilcox.group1 && wilcox.group2) {
                  report.push(`Group medians: ${wilcox.group1} = ${fmt(wilcox.median1, 3)}, ${wilcox.group2} = ${fmt(wilcox.median2, 3)}.`);
              }
              report.push(wilcox.is_significant
                  ? "We reject the null hypothesis. There is a statistically significant difference between the paired group distributions."
                  : "We fail to reject the null hypothesis. There is no statistically significant difference between the paired group distributions.");
              if (wilcox.rank_biserial_interpretation) report.push(`${wilcox.rank_biserial_interpretation}`);
              report.push(`${wilcox.message}`);
          } else {
              report.push("Wilcoxon test results not found.");
          }
      }
      else if (type === 'rm_anova') {
          const rm = result.rm_anova;
          if (rm) {
              const rmEffect = rmAnovaEffectSummary(rm);
              report.push(`Repeated Measures ANOVA Report:`);
              report.push(`Sample Type: ${sampleType}`);
              report.push(`R-style output (aov-like with sphericity details):`);
              report.push(buildRmAnovaROutput(rm, result.rm_anova_posthoc, result.rm_anova_table_rows));
              report.push(`Interpretation: ${rmEffect.text}`);
              report.push(rm.is_significant
                  ? 'Conclusion: There is a statistically significant difference across repeated conditions.'
                  : 'Conclusion: No statistically significant difference was detected across repeated conditions.');
              report.push(`${rm.message}`);
          } else {
              report.push("Repeated Measures ANOVA results not found.");
          }
      }
      else if (type === 'friedman') {
          const friedman = result.friedman;
          if (friedman) {
              report.push(`Friedman Rank Sum Test Report:`);
              report.push(`Sample Type: ${sampleType}`);
              report.push(`R-style output (friedman.test):`);
              report.push(buildFriedmanROutput(friedman, result.friedman_posthoc));
              report.push(friedman.is_significant
                  ? "Conclusion: There is a statistically significant difference across repeated conditions."
                  : "Conclusion: No statistically significant difference was detected across repeated conditions.");
              report.push(`${friedman.message}`);
          } else {
              report.push("Friedman test results not found.");
          }
      }
      else if (type === 'anova') {
          const anova = result.anova;
          const f = anova?.statistic;
          const p = anova?.p_value;
          const isWelch = String(anova?.test_type || '').trim().toLowerCase() === 'welch';
          
          report.push(`${isWelch ? "Welch's One-Way" : "One-Way"} ANOVA Report:`);
          report.push(`Sample Type: ${sampleType}`);
          report.push(`An Analysis of Variance (ANOVA) was performed to compare means across groups.`);
          if ((result.tukey && result.tukey.length > 0) || (result.games_howell && result.games_howell.length > 0)) {
              report.push(`Post-hoc method: ${isWelch ? 'Games-Howell' : 'Tukey HSD'}.`);
          }
          const tableRows = Array.isArray(result.anova_table_rows) ? result.anova_table_rows : [];
          const mainRow = tableRows.find((row) => row && row.is_residual !== true) || tableRows[0];
          const residualRow = tableRows.find((row) => row && row.is_residual === true) || null;

          if (isWelch) {
              const dfNum = anova?.df1 ?? mainRow?.df;
              const dfDen = anova?.df2 ?? residualRow?.df;
              const pText = anova?.formatted_p || fmtP(p);
              report.push(`R-style Welch output: F = ${fmt(f, 3)}, num df = ${fmt(dfNum, 3)}, denom df = ${fmt(dfDen, 3)}, p-value = ${pText} (${sigText(p)}).`);
              report.push(p < 0.05
                  ? "This indicates that at least one group mean is significantly different from the others."
                  : "There are no statistically significant differences between the group means.");
              report.push(`Welch note: R oneway.test reports F, numerator df, denominator df, and p-value; SS/MS decomposition is not returned.`);
              if (mainRow) {
                  report.push(`Welch One-Way ANOVA (R Output Style):`);
                  report.push(`Effect / Source\tF value\tNum Df\tDen Df\tp`);
                  const sourceText = mainRow.source || 'Groups';
                  const fText = anova?.statistic != null && Number.isFinite(Number(anova?.statistic))
                      ? fmt(anova?.statistic, 4)
                      : (mainRow.statistic != null && Number.isFinite(Number(mainRow.statistic)) ? fmt(mainRow.statistic, 4) : '');
                  const dfNumText = dfNum != null && Number.isFinite(Number(dfNum)) ? fmt(dfNum, 3) : '';
                  const dfDenText = dfDen != null && Number.isFinite(Number(dfDen)) ? fmt(dfDen, 3) : '';
                  report.push(`${sourceText}\t${fText}\t${dfNumText}\t${dfDenText}\t${pText}`);
              }
          } else {
              report.push(`The F-statistic is ${fmt(f, 3)}, which is ${sigText(p)}.`);
              report.push(p < 0.05
                  ? "This indicates that at least one group mean is significantly different from the others."
                  : "There are no statistically significant differences between the group means.");

              const etaVal = Number(anova?.effect_size ?? anova?.eta_squared);
              const hasEta = Number.isFinite(etaVal);
              if (hasEta) report.push(`The effect size (Eta-squared) is ${fmt(etaVal, 3)}.`);
              if (tableRows.length > 0) {
                  const etaLabel = String(anova?.effect_size_label || '').trim()
                      || (hasEta ? effectSizeLabel(etaVal) : '');
                  report.push(`Complete One-Way ANOVA Table With Residual:`);
                  report.push(`Effect / Source\tSS\tdf\tMS\tF\tp\tEta²\tEffect size`);
                  if (mainRow) {
                      const sourceText = mainRow.source || 'Groups';
                      const ssText = mainRow.sum_sq != null && Number.isFinite(Number(mainRow.sum_sq)) ? fmt(mainRow.sum_sq, 4) : '';
                      const dfText = mainRow.df != null && Number.isFinite(Number(mainRow.df)) ? fmt(mainRow.df, 3) : '';
                      const msText = mainRow.mean_sq != null && Number.isFinite(Number(mainRow.mean_sq)) ? fmt(mainRow.mean_sq, 4) : '';
                      const fText = mainRow.statistic != null && Number.isFinite(Number(mainRow.statistic)) ? fmt(mainRow.statistic, 4) : '';
                      const pMainText = mainRow.p_value != null && Number.isFinite(Number(mainRow.p_value))
                          ? (mainRow.formatted_p || fmtP(mainRow.p_value))
                          : '';
                      const etaText = hasEta ? fmt(etaVal, 3) : '';
                      report.push(`${sourceText}\t${ssText}\t${dfText}\t${msText}\t${fText}\t${pMainText}\t${etaText}\t${etaLabel}`);
                  }
                  if (residualRow) {
                      const sourceText = residualRow.source || 'Residuals';
                      const ssText = residualRow.sum_sq != null && Number.isFinite(Number(residualRow.sum_sq)) ? fmt(residualRow.sum_sq, 4) : '';
                      const dfText = residualRow.df != null && Number.isFinite(Number(residualRow.df)) ? fmt(residualRow.df, 3) : '';
                      const msText = residualRow.mean_sq != null && Number.isFinite(Number(residualRow.mean_sq)) ? fmt(residualRow.mean_sq, 4) : '';
                      report.push(`${sourceText}\t${ssText}\t${dfText}\t${msText}\t\t\t\t`);
                  }
              }
          }
          const descPayload = result.descriptive_table_publication;
          const descRows = Array.isArray(descPayload?.rows)
              ? descPayload.rows
              : (Array.isArray(descPayload) ? descPayload : []);
          if (descRows.length > 0) {
              const groupLabel = descPayload?.group_var || 'Group';
              const formatDesc = (value, digits = 3) => (
                  value != null && Number.isFinite(Number(value))
                      ? fmt(Number(value), digits)
                      : 'N/A'
              );
              const formatMedianIqr = (row) => {
                  if (row?.median_iqr) return String(row.median_iqr);
                  if (Number.isFinite(Number(row?.median)) && Number.isFinite(Number(row?.q1)) && Number.isFinite(Number(row?.q3))) {
                      return `${formatDesc(row.median)} [${formatDesc(row.q1)}, ${formatDesc(row.q3)}]`;
                  }
                  return 'N/A';
              };
              report.push(`Descriptive Table (Publication Style):`);
              report.push(`${groupLabel}\tn\tMean ± SD\tMean ± 95% CI\tMedian [Q1, Q3]\tMin\tMax`);
              descRows.forEach((row) => {
                  const nText = row?.n != null && Number.isFinite(Number(row.n)) ? String(Math.round(Number(row.n))) : 'N/A';
                  const meanSdText = row?.mean_sd
                      || (Number.isFinite(Number(row?.mean)) && Number.isFinite(Number(row?.sd))
                          ? `${formatDesc(row.mean)} ± ${formatDesc(row.sd)}`
                          : 'N/A');
                  const meanCiText = row?.mean_ci95
                      || (Number.isFinite(Number(row?.mean)) && Number.isFinite(Number(row?.ci_lower)) && Number.isFinite(Number(row?.ci_upper))
                          ? `${formatDesc(row.mean)} [${formatDesc(row.ci_lower)}, ${formatDesc(row.ci_upper)}]`
                          : 'N/A');
                  report.push(
                      `${row?.group ?? 'N/A'}\t${nText}\t${meanSdText}\t${meanCiText}\t${formatMedianIqr(row)}\t${formatDesc(row?.min)}\t${formatDesc(row?.max)}`
                  );
              });
          }
      }
     else if (type === 'normality') {
          const p = result.normality?.p_value;
          const testName = result.normality?.test_name || "Shapiro-Wilk";
          
          report.push(`${testName} Normality Test Report:`);
          report.push(`The test checks if the data follows a normal distribution.`);
          report.push(`The result is ${sigText(p)}.`);
          if (p < 0.05) {
               report.push("Since p < 0.05, we reject the assumption of normality. The data deviates significantly from a normal distribution.");
               report.push("Consider using non-parametric tests (like Mann-Whitney or Kruskal-Wallis) or transforming your data.");
          } else {
               report.push("Since p >= 0.05, we do not reject the assumption of normality. It is reasonable to assume the data is normally distributed.");
               report.push("Parametric tests (like t-tests and ANOVA) are appropriate.");
          }
      }
      else if (type === 'contingency_table') {
          const chi = result.bivariate?.chi_square;
          const cramer = result.bivariate?.cramers_v;
          
          report.push(`Contingency Table Analysis (Chi-Square):`);
          if (chi) {
              report.push(`Pearson's Chi-Squared test was performed to check for independence between the two categorical variables.`);
              report.push(`The test statistic is χ² = ${fmt(chi.statistic, 3)} with ${chi.df} degrees of freedom.`);
              report.push(`The result is ${sigText(chi.p_value)}.`);
              if (chi.correction_label) {
                  report.push(`Continuity correction: ${chi.correction_label} (option: ${chi.correction_option || 'auto'}).`);
              }
              report.push(chi.p_value < 0.05 
                  ? "We reject the null hypothesis of independence. There is a significant association between the rows and columns." 
                  : "We fail to reject the null hypothesis. There is no significant association between the variables.");
          }
          if (cramer != null) {
              report.push(`Cramér's V = ${fmt(cramer, 3)}. This indicates a ${cramer < 0.1 ? 'negligible' : cramer < 0.3 ? 'weak' : cramer < 0.5 ? 'moderate' : 'strong'} association.`);
          }
      }
      else if (type === 'chisq') {
          const chi = result.chisq;
          report.push(`Chi-Square Test of Independence Report:`);
          report.push(`Sample Type: Independent`);
          if (chi) {
              report.push(`The test statistic is χ² = ${fmt(chi.statistic, 3)} with ${fmt(chi.df, 3)} degrees of freedom.`);
              report.push(`The result is ${sigText(chi.p_value)}.`);
              if (chi.correction_label) {
                  report.push(`Continuity correction: ${chi.correction_label} (option: ${chi.correction_option || 'auto'}).`);
              }
              if (Number.isFinite(Number(chi.cramers_v))) {
                  report.push(`Cramér's V = ${fmt(chi.cramers_v, 3)}${chi.effect_size_label ? ` (${chi.effect_size_label})` : ''}.`);
              }
              report.push(chi.p_value < 0.05
                  ? 'There is a significant association between the categorical variables.'
                  : 'No significant association was detected between the categorical variables.');
          } else {
              report.push('Chi-Square output was not returned by R.');
          }
      }
      else if (type === 'kruskal_wallis') {
          const kw = result.kruskal;
          report.push(`Kruskal-Wallis Rank Sum Test Report:`);
          report.push(`Sample Type: ${sampleType}`);
          report.push(`This is a non-parametric alternative to One-Way ANOVA, used when data is not normally distributed.`);
          report.push(`The test statistic is H = ${fmt(kw?.statistic, 3)} with ${kw?.df} degrees of freedom.`);
          report.push(`The result is ${sigText(kw?.p_value)}.`);
          report.push(kw?.p_value < 0.05
              ? "Significant differences exist between the distributions of at least two groups."
              : "No significant difference was found between the groups.");
          if (result.epsilon_squared != null) {
             report.push(`Epsilon-squared effect size = ${fmt(result.epsilon_squared, 3)}.`);
          }
      }
      else if (type === 'bartlett') {
          const b = result.bartlett;
          report.push(`Bartlett's Test for Homogeneity of Variances:`);
          report.push(`This test checks if the different groups have equal variances (homogeneity).`);
          report.push(`The result is ${sigText(b?.p_value)}.`);
          report.push(b?.is_homogeneous 
             ? "Since p ≥ 0.05, we assume variances are equal. Standard ANOVA is appropriate." 
             : "Since p < 0.05, variances are significantly different. Consider using Welch's ANOVA or non-parametric tests.");
      }
      else if (type === 'variance_test') {
          const v = result.variance_test || result.levene;
          report.push(`Levene's Test:`);
          report.push(`This test checks if two groups have equal variances.`);
          report.push(`F = ${fmt(v?.statistic, 4)}, df1 = ${fmt(v?.df1, 3)}, df2 = ${fmt(v?.df2, 3)}, p = ${fmtP(v?.p_value)}.`);
          report.push(v?.is_homogeneous
              ? "Since p ≥ 0.05, we assume variances are equal. Standard Student's t-test is appropriate."
              : "Since p < 0.05, variances are significantly different. Consider Welch's t-test.");
      }
      else if (type === 'levene') {
          const v = result.levene;
          report.push(`Levene's Test:`);
          report.push(`This test checks if two groups have equal variances.`);
          report.push(`F = ${fmt(v?.statistic, 4)}, df1 = ${fmt(v?.df1, 3)}, df2 = ${fmt(v?.df2, 3)}, p = ${fmtP(v?.p_value)}.`);
          report.push(v?.is_homogeneous
              ? "Since p ≥ 0.05, we assume variances are equal. Standard Student's t-test is appropriate."
              : "Since p < 0.05, variances are significantly different. Consider Welch's t-test.");
      }
      else if (type === 'fit_tests') { // Logistic Regression Fit
          const lr = result.model_stats;
          const hl = result.fit_tests?.hosmer_lemeshow;
          
          report.push(`Logistic Regression Goodness-of-Fit:`);
          if (lr?.lr_p_value != null) {
              report.push(`Likelihood Ratio Test: ${sigText(lr.lr_p_value)}.`);
              report.push(lr.lr_p_value < 0.05 ? "The model is significantly better than a null model." : "The model is not significantly better than a null model.");
          }
          if (hl?.p_value != null) {
              report.push(`Hosmer-Lemeshow Test: p = ${fmtP(hl.p_value)}.`);
              report.push(hl.p_value > 0.05 ? "The test is non-significant, suggesting the model fits the data well." : "The test is significant, indicating poor model fit.");
          }
      }
      else if (type === 'post_hoc') {
          let comparisons = result.comparisons || [];
          let testName = result.test_name || "Post-hoc";
          if ((!comparisons || comparisons.length === 0) && result.rm_anova_posthoc) {
              comparisons = result.rm_anova_posthoc;
              testName = "Pairwise Paired t-Tests (Bonferroni correction)";
          } else if ((!comparisons || comparisons.length === 0) && result.friedman_posthoc) {
              comparisons = result.friedman_posthoc;
              testName = "Nemenyi Test";
          } else if ((!comparisons || comparisons.length === 0) && result.tukey) {
              comparisons = result.tukey;
              testName = "Tukey's HSD";
          } else if ((!comparisons || comparisons.length === 0) && result.games_howell) {
              comparisons = result.games_howell;
              testName = "Games-Howell";
          } else if ((!comparisons || comparisons.length === 0) && result.dunn) {
              comparisons = result.dunn;
              testName = "Dunn's Test";
          }
          
          report.push(`${testName} Test Report:`);
          const significant = comparisons.filter(c => c.is_significant);
          
          if (significant.length === 0) {
              report.push("No statistically significant differences were found between any pair of groups.");
          } else {
              report.push(`The following pairwise comparisons revealed significant differences (p < 0.05):`);
              const hasDiff = significant.some(c => Number.isFinite(Number(c?.diff ?? c?.mean_diff)));
              const hasStat = significant.some(c => Number.isFinite(Number(c?.statistic ?? c?.t_stat)));
              significant.forEach(c => {
                   const details = [];
                   if (hasStat) {
                       const statVal = c?.statistic ?? c?.t_stat;
                       if (Number.isFinite(Number(statVal))) details.push(`Statistic = ${fmt(Number(statVal), 3)}`);
                   }
                   if (hasDiff) {
                       const diffVal = c?.diff ?? c?.mean_diff;
                       if (Number.isFinite(Number(diffVal))) details.push(`Mean difference = ${fmt(Number(diffVal), 3)}`);
                   }
                   details.push(`p = ${c.formatted_p}`);
                   report.push(`• ${c.comparison}: ${details.join('; ')}.`);
              });
              report.push(`All other pairwise comparisons were not statistically significant.`);
          }
      }
      else if (type === 'coefficient_summary') {
          const coefs = result.coefficients || [];
          const sig = coefs.filter(r => r && r.significance);
          const sorted = coefs
              .filter((r) => (
                  r
                  && typeof r.Estimate === 'number'
                  && String(r?.CoefficientType || r?.coefficient_type || '').trim().toLowerCase() !== 'threshold'
              ))
              .slice()
              .sort((a, b) => Math.abs(a.Estimate) - Math.abs(b.Estimate))
              .reverse();
          const top = sorted[0];
          const equationText = result?.mode === 'regression_linear' ? buildLinearRegressionEquation(result) : '';

          report.push(`Coefficient Analysis Summary:`);
          if (equationText) report.push(`Equation: ${equationText}`);
          report.push(`Out of ${coefs.length} predictors (including intercept), ${sig.length} are statistically significant.`);
          if (top) {
              report.push(`The predictor with the largest absolute effect size is "${top.Term}" with an estimate of ${fmt(top.Estimate, 4)}.`);
              if (result?.mode === 'regression_ordinal_logistic' && Number.isFinite(Number(top?.OddsRatio))) {
                  const oddsRatio = Number(top.OddsRatio);
                  const oddsChange = (oddsRatio - 1) * 100;
                  report.push(`This means that for every 1-unit increase in ${top.Term}, the odds of being in a higher response category ${oddsChange >= 0 ? 'increase' : 'decrease'} by ${Math.abs(oddsChange).toFixed(1)}%, holding other predictors constant.`);
              } else {
                  report.push(`This means that for every 1-unit increase in ${top.Term}, the response variable changes by ${fmt(top.Estimate, 4)} units (holding others constant).`);
              }
          }
      }
      else if (type === 'two_way_anova') {
          const isSrh = result.test_type === 'scheirer_ray_hare' || result.srh;
          const isArt = result.test_type === 'art_factorial' || result.art;
          const statLabel = isSrh ? 'H' : 'F';
          const formatCorrectionLabel = (value) => {
              const normalized = String(value || '').trim().toUpperCase();
              if (normalized === 'GG') return 'Greenhouse-Geisser (GG)';
              if (normalized === 'HF') return 'Huynh-Feldt (HF)';
              if (normalized === 'NONE') return 'None';
              return value || 'N/A';
          };
          report.push(`${isSrh ? 'Scheirer-Ray-Hare' : (isArt ? 'ART Factorial' : 'ANOVA Factorial')} Report:`);
          report.push(`Sample Type: ${sampleType}`);
          if (['anova_residuals', 'rm_anova_residuals'].includes(result.normality_scope)) {
              const residualRow = result.shapiro && typeof result.shapiro === 'object'
                  ? Object.entries(result.shapiro)[0]
                  : null;
              if (residualRow && residualRow[1]) {
                  const stats = residualRow[1];
                  const wText = Number.isFinite(Number(stats.statistic)) ? fmt(stats.statistic, 4) : 'N/A';
                  const pText = stats.formatted_p || fmtP(stats.p_value);
                  const normalityLabel = result.normality_scope === 'rm_anova_residuals'
                      ? 'RM-ANOVA residuals'
                      : 'ANOVA residuals';
                  report.push(`Normality check (${normalityLabel}): W = ${wText}, p = ${pText} (${stats.is_normal ? 'normal' : 'not normal'}).`);
              } else {
                  report.push(`Normality check (model residuals): not returned.`);
              }
              report.push(`Residual Q-Q plot: ${result.residual_qq_plot_image ? 'available' : 'not returned'}.`);
          }
          if (isSrh) {
              report.push(`Non-parametric ANOVA Factorial on ranked data (Scheirer-Ray-Hare) used due to non-normality.`);
          } else if (isArt) {
              report.push(`Aligned-rank-transform workflow used for non-parametric repeated/mixed factorial design.`);
          }
          if (result.anova_robust || result.robust_method) {
              const methodLabel = result.robust_method ? `(${result.robust_method})` : '';
              report.push(`Robust method used ${methodLabel} due to unequal variances.`);
          }
          if (result.path_taken === 'parametric') {
              const sphericityChecks = result.sphericity_checks && typeof result.sphericity_checks === 'object'
                  ? Object.entries(result.sphericity_checks)
                  : [];
              if (sphericityChecks.length > 0) {
                  report.push(`Sphericity checks (Mauchly):`);
                  report.push(`Note: Levene/Bartlett evaluate variance homogeneity, not sphericity.`);
                  sphericityChecks.forEach(([effectName, sph]) => {
                      if (!sph || typeof sph !== 'object') return;
                      const effectLabel = effectName || 'Effect';
                      if (sph.applicable !== true) {
                          const msg = String(sph.message || 'Sphericity is not required or could not be evaluated.');
                          report.push(`• ${effectLabel}: ${msg}`);
                          return;
                      }
                      const mauchlyW = Number.isFinite(Number(sph.mauchly_w)) ? fmt(sph.mauchly_w, 4) : 'N/A';
                      const mauchlyP = sph.mauchly_formatted_p || fmtP(sph.mauchly_p);
                      const violatedText = sph.sphericity_violated ? 'violated' : 'satisfied';
                      const correction = formatCorrectionLabel(sph.correction_used);
                      const finalP = sph.formatted_p_final || fmtP(sph.p_final);
                      report.push(`• ${effectLabel}: Mauchly W = ${mauchlyW}, p = ${mauchlyP} (${violatedText}); correction = ${correction}; final p = ${finalP}.`);
                      if (sph.message) report.push(`  - ${sph.message}`);
                  });
                  report.push(`Sphericity plot: ${result.sphericity_plot_image ? 'available' : 'not returned'}.`);
              } else if (result.sphericity_messages && typeof result.sphericity_messages === 'object') {
                  const messages = Array.isArray(result.sphericity_messages)
                      ? result.sphericity_messages
                      : Object.values(result.sphericity_messages);
                  if (messages.length > 0) {
                      report.push(`Sphericity checks:`);
                      messages.forEach((msg) => {
                          if (msg) report.push(`• ${msg}`);
                      });
                  }
              }
          } else if (isArt && ['within', 'mixed'].includes(String(result.factorial_design_type || '').toLowerCase())) {
              report.push(`Mauchly's sphericity test is not applicable on the non-parametric ART factorial path.`);
          }
          if (!isSrh && !isArt && ((result.tukey && result.tukey.length > 0) || (result.games_howell && result.games_howell.length > 0))) {
              report.push(`Post-hoc method: ${result.anova_robust || result.robust_method ? 'Games-Howell' : 'Tukey HSD'}.`);
          } else if (result.holm_posthoc?.length > 0) {
              report.push(`Post-hoc method: Holm-corrected pairwise comparisons.`);
          } else if (result.art_posthoc?.length > 0) {
              report.push(`Post-hoc method: ART-based contrasts with Holm correction.`);
          } else if (result.dunn?.length > 0) {
              report.push(`Post-hoc method: Dunn pairwise comparisons with Bonferroni correction.`);
          }
          if (result.posthoc_strategy) {
              report.push(`Post-hoc strategy: ${result.posthoc_strategy}`);
          }
          const anovaTableRows = Array.isArray(result.anova_table_rows) ? result.anova_table_rows : [];
          if (anovaTableRows.length > 0) {
              report.push(`Complete Two-Way ANOVA Table With Residual:`);
              report.push(`Effect / Source\tSS\tdf\tMS\t${statLabel}\tp\tEta²\tEffect size`);

              const normalizeKey = (value) => String(value || '')
                  .trim()
                  .toLowerCase()
                  .replace(/\*/g, ':')
                  .replace(/×/g, ':')
                  .replace(/\s+/g, '');
              const asNumber = (value) => {
                  const n = Number(value);
                  return Number.isFinite(n) ? n : null;
              };
              const factorAKey = normalizeKey(result.main_effect_A?.factor_name || result.factor1);
              const factorBKey = normalizeKey(result.main_effect_B?.factor_name || result.factor2);
              const resolveEffectForSource = (source) => {
                  const sourceKey = normalizeKey(source);
                  if (!sourceKey || sourceKey === 'residual' || sourceKey === 'residuals' || sourceKey === 'total') return null;
                  if (factorAKey && sourceKey === factorAKey) return result.main_effect_A || null;
                  if (factorBKey && sourceKey === factorBKey) return result.main_effect_B || null;
                  if (sourceKey === 'interaction' || sourceKey.includes(':')) return result.interaction || null;
                  return null;
              };

              const hasStratum = anovaTableRows.some((row) => row && row.stratum);

              anovaTableRows.forEach((row) => {
                  if (!row || typeof row !== 'object') return;
                  const sourceRaw = String(row.source ?? '');
                  const sourceLabel = sourceRaw.includes(':')
                      ? sourceRaw.split(':').map((part) => part.trim()).join(' × ')
                      : sourceRaw.trim();
                  const sourceText = hasStratum && row.stratum ? `${sourceLabel} [${row.stratum}]` : sourceLabel;
                  const ssNum = asNumber(row.sum_sq);
                  const dfNum = asNumber(row.df);
                  const msNum = asNumber(row.mean_sq);
                  const statNum = asNumber(row.statistic);
                  const pNum = asNumber(row.p_value);
                  const isResidual = Boolean(row.is_residual) || normalizeKey(sourceRaw).startsWith('residual');
                  const effect = isResidual ? null : resolveEffectForSource(sourceRaw);
                  const etaNum = asNumber(effect?.eta_squared);
                  const etaLabel = String(effect?.effect_size_label || '').trim()
                      || (etaNum != null ? effectSizeLabel(etaNum) : '');

                  const ssText = ssNum != null ? fmt(ssNum, 4) : '';
                  const dfText = dfNum != null ? fmt(dfNum, 3) : '';
                  const msText = msNum != null ? fmt(msNum, 4) : '';
                  const statText = isResidual ? '' : (statNum != null ? fmt(statNum, 4) : '');
                  const pText = isResidual ? '' : (pNum != null
                      ? (row.formatted_p && row.formatted_p !== 'N/A' ? row.formatted_p : fmtP(pNum))
                      : '');
                  const etaText = etaNum != null ? fmt(etaNum, 3) : '';
                  report.push(`${sourceText}\t${ssText}\t${dfText}\t${msText}\t${statText}\t${pText}\t${etaText}\t${etaLabel}`);
              });
          }
          report.push(`Interaction plot: ${result.interaction_plot_image ? 'available' : 'not returned'}.`);
          
          if (result.interaction?.is_significant) {
              report.push(`Significant Interaction: The effect of one factor depends on the level of the other factor. Focus on interpreting the interaction and simple main effects.`);
          } else {
              report.push(`No Significant Interaction: You can interpret the main effects of each factor independently.`);
          }
      }
      else if (type === 'mixed') {
          report.push(`Group Summary Report:`);
          const entries = Object.entries(result.summary_stats || {}).filter(([, v]) => v && typeof v.mean === 'number');
          if (entries.length >= 2) {
              const sorted = entries.slice().sort((a, b) => b[1].mean - a[1].mean);
              const [maxGroup, maxStats] = sorted[0];
              const [minGroup, minStats] = sorted[sorted.length - 1];
              report.push(`Highest mean: ${maxGroup} (${fmt(maxStats.mean, 3)}).`);
              report.push(`Lowest mean: ${minGroup} (${fmt(minStats.mean, 3)}).`);
          } else {
               report.push('Not enough groups to compare means.');
          }
          
          report.push('If the distributions overlap heavily, differences may be small even if means differ.');
          report.push('Use a formal test (t‑test/ANOVA or Kruskal‑Wallis) to confirm significance.');
      }
      else if (type === 'correlation_matrix') {
          report.push(`Correlation Matrix Step Report:`);
          const matrixInfo = result.correlation_matrix || {};
          const pearsonMat = Array.isArray(matrixInfo.pearson) ? matrixInfo.pearson : [];
          const spearmanMat = Array.isArray(matrixInfo.spearman) ? matrixInfo.spearman : [];
          const vars = Array.isArray(matrixInfo.variables) ? matrixInfo.variables : [];
          const availableMethods = [];
          if (pearsonMat.length > 0) availableMethods.push('pearson');
          if (spearmanMat.length > 0) availableMethods.push('spearman');

          report.push(`Step 1: Variables included`);
          report.push(`• Variables selected: ${vars.length}.`);
          if (vars.length > 0) report.push(`• ${vars.join(', ')}.`);

          report.push(`Step 2: Shapiro normality check`);
          const shapiroRows = matrixInfo.shapiro && typeof matrixInfo.shapiro === 'object'
              ? Object.entries(matrixInfo.shapiro)
              : [];
          if (shapiroRows.length > 0) {
              shapiroRows.forEach(([name, stats]) => {
                  const pText = stats?.formatted_p || fmtP(stats?.p_value);
                  report.push(`• ${name}: p = ${pText} (${stats?.is_normal ? 'normal' : 'not normal'}).`);
              });
              if (typeof matrixInfo.all_normal === 'boolean') {
                  report.push(`• Overall: ${matrixInfo.all_normal ? 'all selected variables look normal' : 'at least one variable is non-normal'}.`);
              }
          } else {
              report.push(`• Shapiro results were not returned.`);
          }

          report.push(`Step 3: Method decision`);
          if (matrixInfo.method_decision_message) {
              report.push(`• ${matrixInfo.method_decision_message}`);
          } else if (matrixInfo.selected_method) {
              report.push(`• Selected method: ${matrixInfo.selected_method === 'pearson' ? 'Pearson' : 'Spearman'}.`);
          }
          if (availableMethods.length > 0) {
              report.push(`• Returned method(s): ${availableMethods.map((m) => (m === 'pearson' ? 'Pearson' : 'Spearman')).join(' + ')}.`);
          } else {
              report.push(`• No correlation matrix was returned.`);
          }

          let stepIndex = 4;
          const strongestMessages = [];
          const summarizeMethod = (method, mat) => {
              const methodLabel = method === 'pearson' ? 'Pearson' : 'Spearman';
              const coeffLabel = method === 'pearson' ? 'r' : 'rho';
              report.push(`Step ${stepIndex}: ${methodLabel} matrix results`);
              stepIndex += 1;
              report.push(`• Full ${methodLabel} table:`);
              report.push(`  Variable | ${vars.join(' | ')}`);
              report.push(`  ${['---', ...vars.map(() => '---')].join(' | ')}`);

              const pairs = [];
              for (let i = 0; i < mat.length; i++) {
                  const rowLabel = vars[i] || `V${i + 1}`;
                  const rowValues = vars.map((_, colIdx) => {
                      const val = Number((mat[i] || [])[colIdx]);
                      return Number.isFinite(val) ? fmt(val, 3) : 'NA';
                  });
                  report.push(`  ${rowLabel} | ${rowValues.join(' | ')}`);

                  for (let j = i + 1; j < (mat[i] || []).length; j++) {
                      const val = Number(mat[i][j]);
                      if (Number.isFinite(val)) {
                          pairs.push({
                              v1: vars[i] || `V${i + 1}`,
                              v2: vars[j] || `V${j + 1}`,
                              value: val
                          });
                      }
                  }
              }

              if (pairs.length === 0) {
                  report.push(`• No valid ${methodLabel} coefficients were returned.`);
                  return;
              }

              const sortedPairs = pairs.slice().sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
              const strongest = sortedPairs[0];
              const strongCount = pairs.filter((p) => Math.abs(p.value) > 0.7).length;
              report.push(`• Strong pairs (|${coeffLabel}| > 0.7): ${strongCount}.`);
              strongestMessages.push(`${methodLabel}: ${strongest.v1} vs ${strongest.v2} (${coeffLabel} = ${fmt(strongest.value, 3)}).`);
          };

          if (pearsonMat.length > 0) summarizeMethod('pearson', pearsonMat);
          if (spearmanMat.length > 0) summarizeMethod('spearman', spearmanMat);

          report.push(`Step ${stepIndex}: Plot checklist`);
          stepIndex += 1;
          if (availableMethods.includes('pearson')) {
              report.push(`• Pearson heatmap: ${result.heatmap_image ? 'available' : 'not returned'}.`);
              report.push(`• Pearson linearity plot: ${result.linearity_plot_image ? 'available' : 'not returned'}.`);
          }
          if (availableMethods.includes('spearman')) {
              report.push(`• Spearman heatmap: ${result.spearman_heatmap_image ? 'available' : 'not returned'}.`);
              report.push(`• Spearman linearity plot: ${result.spearman_linearity_plot_image ? 'available' : 'not returned'}.`);
          }
          report.push(`Step ${stepIndex}: Strongest correlation message`);
          if (strongestMessages.length > 0) {
              strongestMessages.forEach((msg) => {
                  report.push(`• ${msg}`);
              });
          } else {
              report.push(`• No strongest correlation could be computed from returned coefficients.`);
          }
      }
      else if (type === 'linear_evaluation') {
          report.push(`Model Evaluation Report (Train vs Test):`);
          const test = result.linear_evaluation?.test;
          const train = result.linear_evaluation?.train;
          
          if (test) {
              report.push(`Test Set Performance:`);
              report.push(`• RMSE = ${fmt(test.rmse, 4)}. (Average error in prediction). Lower is better.`);
              report.push(`• R-Squared = ${fmt(test.r2, 4)}. (Variance explained in test data). Higher is better.`);
              
              if (train) {
                  const diff = Math.abs((train.rmse || 0) - (test.rmse || 0));
                  report.push(`Comparison with Train Set: Difference in RMSE is ${fmt(diff, 4)}.`);
                  if (test.rmse > train.rmse * 1.2) {
                      report.push(`Warning: Test RMSE is significantly higher than Train RMSE. This may indicate overfitting.`);
                  } else {
                      report.push(`The model generalizes well (Test RMSE is comparable to Train RMSE).`);
                  }
              }
          }
      }
      else if (type === 'logistic_evaluation') {
          report.push(`Logistic Model Evaluation (Train vs Test):`);
          const test = result.evaluation?.test;
          const train = result.evaluation?.train;
          
          if (test) {
              report.push(`Test Set Performance:`);
              report.push(`• Accuracy = ${fmt(test.accuracy * 100, 1)}%. (Overall correctness).`);
              report.push(`• AUC = ${fmt(test.auc, 3)}. (Ability to distinguish classes).`);
              report.push(`• Precision = ${fmt(test.precision, 3)}. (Correctness of positive predictions).`);
              report.push(`• Recall = ${fmt(test.recall, 3)}. (Sensitivity to positives).`);
              report.push(`• F1 Score = ${fmt(test.f1_score, 3)}. (Type I & II error balance).`);
              
              if (train) {
                   const accDiff = (train.accuracy || 0) - (test.accuracy || 0);
                   if (accDiff > 0.1) {
                       report.push(`Warning: Train Accuracy is much higher than Train Accuracy (${fmt(accDiff*100, 1)}% diff). This indicates overfitting.`);
                   } else {
                       report.push(`Model generalizes well (Test accuracy is comparable to Train accuracy).`);
                   }
              }
          }
      }

      // --- RAW JSON INJECTION FOR AI ---
      let rawData = null;
      if (type === 't_test') rawData = result.ttest;
      else if (type === 'one_value') rawData = result.one_value || { ttest: result.ttest, wilcoxon: result.wilcoxon, chisq_gof: result.chisq_gof };
      else if (type === 'anova') rawData = {
          ...(result.anova || {}),
          anova_table_rows: result.anova_table_rows,
          anova_signif_codes_legend: result.anova_signif_codes_legend
      };
      else if (type === 'correlation') rawData = result.bivariate;
      else if (type === 'linear_regression') rawData = { stats: result.model_stats, coefs: result.coefficients, eval: result.linear_evaluation };
      else if (type === 'logistic_regression') rawData = { stats: result.model_stats, coefs: result.coefficients, eval: result.evaluation, fit: result.fit_tests };
      else if (type === 'ordinal_logistic_regression') rawData = { stats: result.model_stats, coefs: result.coefficients, levels: result.response_levels };
      else if (type === 'kruskal_wallis') rawData = result.kruskal;
      else if (type === 'chisq') rawData = result.chisq;
      else if (type === 'bartlett') rawData = result.bartlett;
      else if (type === 'variance_test') rawData = result.variance_test || result.levene;
      else if (type === 'levene') rawData = result.levene;
      else if (type === 'normality') rawData = result.normality;
      else if (type === 'post_hoc') rawData = { comparisons: result.comparisons, test: result.test_name };
      else if (type === 'contingency_table') rawData = result.bivariate;
      else if (type === 'two_way_anova') rawData = {
          main_A: result.main_effect_A,
          main_B: result.main_effect_B,
          interaction: result.interaction,
          anova_table_rows: result.anova_table_rows,
          normality_scope: result.normality_scope,
          normality_model_formula: result.normality_model_formula,
          residual_qq_plot_available: Boolean(result.residual_qq_plot_image),
          sphericity_checks: result.sphericity_checks,
          sphericity_plot_available: Boolean(result.sphericity_plot_image),
          tukey: result.tukey,
          games_howell: result.games_howell,
          holm_posthoc: result.holm_posthoc,
          art_posthoc: result.art_posthoc,
          dunn: result.dunn
      };
      else if (type === 'correlation_matrix') {
          rawData = {
              correlation_matrix: result.correlation_matrix,
              plot_availability: {
                  pearson_heatmap: Boolean(result.heatmap_image),
                  pearson_linearity: Boolean(result.linearity_plot_image),
                  spearman_heatmap: Boolean(result.spearman_heatmap_image),
                  spearman_linearity: Boolean(result.spearman_linearity_plot_image)
              }
          };
      }
      
      if (rawData) {
          report.push('');
          report.push('--- Raw Analysis Data (JSON) ---');
          report.push('```json');
          try {
            report.push(JSON.stringify(rawData, null, 2));
          } catch (e) {
            report.push('Error serializing raw data: ' + e.message);
          }
          report.push('```');
      } else {
          // Fallback: If specific raw data is missing, dump the whole result object for debugging/context
          report.push('');
          report.push('--- Complete Analysis Output (Debug JSON) ---');
          report.push('```json');
          try {
            report.push(JSON.stringify(result, null, 2));
          } catch (e) {
            report.push('Error serializing full result: ' + e.message);
          }
          report.push('```');
      }

      if (report.length === 0) report.push("No specific report available for this analysis type.");
      
      console.log('Generated Report for:', type, result); // Debug log
      return report;
};
