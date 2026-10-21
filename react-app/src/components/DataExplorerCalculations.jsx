import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, Table2 } from 'lucide-react';

const OPERATIONS = [
  { value: 'sum', label: 'Sum' },
  { value: 'average', label: 'Average' },
  { value: 'min', label: 'Minimum' },
  { value: 'max', label: 'Maximum' },
  { value: 'count', label: 'Count' }
];

const MODES = [
  { value: 'summary', label: 'Summary' },
  { value: 'column_total', label: 'Column total' },
  { value: 'row_totals', label: 'Row totals' }
];

const EMPTY_ARRAY = [];

const toNumber = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const parsed = Number(String(value).trim().replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const formatNumber = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 6 });
};

const getOperationValue = (values, operation) => {
  if (operation === 'count') return values.length;
  if (values.length === 0) return null;
  if (operation === 'average') return values.reduce((sum, value) => sum + value, 0) / values.length;
  if (operation === 'min') return Math.min(...values);
  if (operation === 'max') return Math.max(...values);
  return values.reduce((sum, value) => sum + value, 0);
};

export default function DataExplorerCalculations({
  fullData = [],
  columns = [],
  selectedColumns,
  selectedRows = [],
  selectedRowsMode = 'all',
  filteredRowIndices = [],
  isRowSelected,
  request = {},
  isRTheme = false
}) {
  // Dataset props can briefly be null while a file is loading or being replaced.
  const safeData = Array.isArray(fullData) ? fullData : EMPTY_ARRAY;
  const allColumns = Array.isArray(columns) ? columns : EMPTY_ARRAY;
  const safeColumns = Array.isArray(selectedColumns)
    ? selectedColumns.filter((column) => allColumns.includes(column))
    : allColumns;
  const safeSelectedRows = Array.isArray(selectedRows) ? selectedRows : EMPTY_ARRAY;
  const safeFilteredRowIndices = Array.isArray(filteredRowIndices) ? filteredRowIndices : EMPTY_ARRAY;
  const requestedMode = MODES.some((item) => item.value === request?.mode) ? request.mode : 'summary';
  const requestedOperation = OPERATIONS.some((item) => item.value === request?.operation)
    ? request.operation
    : 'sum';
  const [mode, setMode] = useState(requestedMode);
  const [operation, setOperation] = useState(requestedOperation);
  const hasExplicitRowSelection = selectedRowsMode === 'subset' || safeSelectedRows.length > 0;
  const hasVisibleSubset = Array.isArray(filteredRowIndices);
  const [scope, setScope] = useState(
    hasExplicitRowSelection ? 'selected' : (hasVisibleSubset ? 'visible' : 'all')
  );

  useEffect(() => {
    setMode(requestedMode);
    setOperation(requestedOperation);
  }, [requestedMode, requestedOperation]);

  const allIndices = useMemo(
    () => safeData.map((_, index) => index),
    [safeData]
  );
  const visibleIndices = useMemo(() => {
    const valid = safeFilteredRowIndices
      .map((index) => Number(index))
      .filter((index) => Number.isInteger(index) && index >= 0 && index < safeData.length);
    return valid.length > 0 ? Array.from(new Set(valid)) : allIndices;
  }, [allIndices, safeFilteredRowIndices, safeData.length]);
  const selectedIndices = useMemo(() => {
    const selectedSet = new Set(safeSelectedRows.map(Number));
    return visibleIndices.filter((index) => (
      typeof isRowSelected === 'function'
        ? isRowSelected(index)
        : selectedRowsMode === 'all'
          ? !selectedSet.has(index)
          : selectedSet.has(index)
    ));
  }, [isRowSelected, safeSelectedRows, selectedRowsMode, visibleIndices]);
  const scopedIndices = scope === 'visible'
    ? visibleIndices
    : scope === 'selected'
      ? selectedIndices
      : allIndices;
  const scopedRows = scopedIndices.map((index) => safeData[index]).filter(Boolean);

  const numericColumns = useMemo(() => safeColumns.filter((column) => (
    scopedRows.some((row) => toNumber(row?.[column]) !== null)
  )), [safeColumns, scopedRows]);

  const summaryRows = useMemo(() => safeColumns.map((column) => {
    const rawValues = scopedRows.map((row) => row?.[column]);
    const numericValues = rawValues.map(toNumber).filter((value) => value !== null);
    const nonEmpty = rawValues.filter((value) => value !== null && value !== undefined && String(value).trim() !== '');
    return {
      column,
      type: numericValues.length > 0 ? 'Numeric' : 'Text',
      count: nonEmpty.length,
      missing: Math.max(0, scopedRows.length - nonEmpty.length),
      total: numericValues.length > 0 ? getOperationValue(numericValues, 'sum') : null,
      average: numericValues.length > 0 ? getOperationValue(numericValues, 'average') : null,
      min: numericValues.length > 0 ? getOperationValue(numericValues, 'min') : null,
      max: numericValues.length > 0 ? getOperationValue(numericValues, 'max') : null
    };
  }), [safeColumns, scopedRows]);

  const columnTotalRows = useMemo(() => safeColumns.map((column) => {
    const rawValues = scopedRows.map((row) => row?.[column]);
    const numericValues = rawValues.map(toNumber).filter((value) => value !== null);
    const nonEmptyValues = rawValues.filter((value) => (
      value !== null && value !== undefined && String(value).trim() !== ''
    ));
    const values = operation === 'count' ? nonEmptyValues : numericValues;
    return {
      column,
      valueCount: values.length,
      excluded: Math.max(0, scopedRows.length - values.length),
      result: operation === 'count'
        ? nonEmptyValues.length
        : getOperationValue(numericValues, operation)
    };
  }), [operation, safeColumns, scopedRows]);

  const rowTotalRows = useMemo(() => scopedIndices.map((rowIndex) => {
    const row = safeData[rowIndex] || {};
    const values = numericColumns.map((column) => toNumber(row[column])).filter((value) => value !== null);
    return {
      rowNumber: rowIndex + 1,
      cells: values.length,
      total: values.reduce((sum, value) => sum + value, 0)
    };
  }), [safeData, numericColumns, scopedIndices]);

  // Ayu Dark is the only application theme; keep calculations dark even when
  // this component is rendered without an explicit theme prop.
  const theme = 'ayu';
  const scopeLabel = scope === 'selected' ? 'selected rows' : scope === 'visible' ? 'visible rows' : 'all rows';

  return (
    <div className={`de-calculations ${theme}`}>
      <div className="de-calculations-toolbar">
        <div className="de-calculations-mode-group" role="tablist" aria-label="Calculation view">
          {MODES.map((item) => (
            <button
              key={item.value}
              type="button"
              className={mode === item.value ? 'is-active' : ''}
              onClick={() => setMode(item.value)}
            >
              {item.value === 'summary' ? <Table2 size={12} /> : <Calculator size={12} />}
              {item.label}
            </button>
          ))}
        </div>
        <label className="de-calculations-scope">
          <span>Scope</span>
          <select value={scope} onChange={(event) => setScope(event.target.value)}>
            <option value="all">All rows</option>
            <option value="visible">Visible rows</option>
            <option value="selected">Selected rows</option>
          </select>
        </label>
      </div>

      <div className="de-calculations-meta">
        <span>{scopedRows.length.toLocaleString()} {scopeLabel}</span>
        <span>{numericColumns.length.toLocaleString()} numeric columns</span>
      </div>

      {mode === 'summary' && (
        <div className="de-calculations-table-wrap">
          <table>
            <thead>
              <tr><th>Column</th><th>Type</th><th>Count</th><th>Missing</th><th>Total</th><th>Average</th><th>Min</th><th>Max</th></tr>
            </thead>
            <tbody>
              {summaryRows.map((row) => (
                <tr key={row.column}>
                  <td title={row.column}>{row.column}</td>
                  <td>{row.type}</td>
                  <td>{row.count.toLocaleString()}</td>
                  <td>{row.missing.toLocaleString()}</td>
                  <td>{formatNumber(row.total)}</td>
                  <td>{formatNumber(row.average)}</td>
                  <td>{formatNumber(row.min)}</td>
                  <td>{formatNumber(row.max)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {mode === 'column_total' && (
        <div className="de-calculations-column-result de-calculations-table-wrap">
          <div className="de-calculations-controls">
            <label><span>Calculation</span><select value={operation} onChange={(event) => setOperation(event.target.value)}>
              {OPERATIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select></label>
          </div>
          <table>
            <thead>
              <tr><th>Column</th><th>Values</th><th>Missing / non-numeric</th><th>{OPERATIONS.find((item) => item.value === operation)?.label || 'Result'}</th></tr>
            </thead>
            <tbody>
              {columnTotalRows.map((row) => (
                <tr key={row.column}>
                  <td title={row.column}>{row.column}</td>
                  <td>{row.valueCount.toLocaleString()}</td>
                  <td>{row.excluded.toLocaleString()}</td>
                  <td>{formatNumber(row.result)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {mode === 'row_totals' && (
        <div className="de-calculations-table-wrap">
          <div className="de-calculations-table-title"><Calculator size={13} /> Row totals across numeric columns</div>
          <table>
            <thead><tr><th>Row</th><th>Numeric cells</th><th>Total</th></tr></thead>
            <tbody>
              {rowTotalRows.slice(0, 500).map((row) => (
                <tr key={row.rowNumber}><td>{row.rowNumber.toLocaleString()}</td><td>{row.cells}</td><td>{formatNumber(row.total)}</td></tr>
              ))}
            </tbody>
          </table>
          {rowTotalRows.length > 500 && <p className="de-calculations-footnote">Showing the first 500 rows.</p>}
        </div>
      )}

      {scopedRows.length === 0 && <div className="de-calculations-empty">No rows are available for this scope.</div>}

      <style>{`
        .de-calculations { height: 100%; min-height: 0; display: flex; flex-direction: column; gap: 10px; color: #e9feff; font-family: Inter, system-ui, sans-serif; }
        .de-calculations.standard { color: #e5e7eb; }
        .de-calculations-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
        .de-calculations-mode-group { display: flex; gap: 4px; flex-wrap: wrap; }
        .de-calculations-mode-group button { display: inline-flex; align-items: center; gap: 5px; min-height: 28px; padding: 5px 9px; border: 1px solid rgba(148,163,184,.25); border-radius: 5px; background: rgba(15,23,42,.55); color: #aeb8c8; font-size: 10px; font-weight: 700; cursor: pointer; }
        .de-calculations-mode-group button.is-active { border-color: rgba(83,221,252,.62); background: rgba(83,221,252,.16); color: #e9feff; }
        .de-calculations.standard .de-calculations-mode-group button.is-active { border-color: #6366f1; background: #eef2ff; color: #4338ca; }
        .de-calculations-scope, .de-calculations-controls label { display: flex; align-items: center; gap: 6px; color: #9ca9b8; font-size: 10px; font-weight: 700; }
        .de-calculations-scope span, .de-calculations-controls label span { text-transform: uppercase; letter-spacing: .08em; font-size: 9px; }
        .de-calculations select { min-height: 28px; border: 1px solid rgba(148,163,184,.28); border-radius: 5px; background: #151b24; color: #e9feff; padding: 4px 7px; font-size: 11px; max-width: 220px; }
        .de-calculations.standard select { background: #fff; color: #1f2937; border-color: #cbd5e1; }
        .de-calculations-meta { display: flex; gap: 14px; color: #8c99a8; font-size: 10px; }
        .de-calculations-table-wrap { min-height: 0; overflow: auto; border: 1px solid rgba(148,163,184,.2); background: rgba(7,12,20,.35); }
        .de-calculations.standard .de-calculations-table-wrap { background: #fff; border-color: #e2e8f0; }
        .de-calculations table { width: 100%; border-collapse: collapse; font-size: 11px; }
        .de-calculations th, .de-calculations td { padding: 7px 8px; border-bottom: 1px solid rgba(148,163,184,.14); text-align: right; white-space: nowrap; }
        .de-calculations th:first-child, .de-calculations td:first-child { text-align: left; max-width: 180px; overflow: hidden; text-overflow: ellipsis; }
        .de-calculations th { position: sticky; top: 0; z-index: 1; background: #202a36; color: #aeb8c8; font-size: 9px; text-transform: uppercase; letter-spacing: .08em; }
        .de-calculations.standard th { background: #f8fafc; color: #64748b; }
        .de-calculations td { color: #d8e0e9; }
        .de-calculations.standard td { color: #334155; }
        .de-calculations tbody tr:hover td { background: rgba(83,221,252,.06); }
        .de-calculations-column-result { display: flex; flex-direction: column; gap: 16px; align-items: stretch; }
        .de-calculations-controls { display: flex; gap: 12px; flex-wrap: wrap; }
        .de-calculations-result-value { display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 128px; border: 1px solid rgba(83,221,252,.28); background: rgba(83,221,252,.08); color: #e9feff; font-size: 32px; font-weight: 800; }
        .de-calculations.standard .de-calculations-result-value { border-color: #c7d2fe; background: #eef2ff; color: #3730a3; }
        .de-calculations-stat-line { display: flex; gap: 14px; color: #93a2b3; font-size: 11px; }
        .de-calculations-table-title { display: flex; align-items: center; gap: 6px; padding: 8px; color: #b7c3d0; font-size: 11px; font-weight: 700; }
        .de-calculations-footnote, .de-calculations-empty { padding: 10px; margin: 0; color: #93a2b3; font-size: 11px; }
      `}</style>
    </div>
  );
}
