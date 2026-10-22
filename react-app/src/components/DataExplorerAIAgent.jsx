/**
 * DataExplorerAIAgent.jsx
 * ───────────────────────────────────────────────────────────────────────────
 * AI Agent panel embedded inside the DataExplorer.
 * Supports:
 *   • Local Ollama (http://localhost:11434) with model picker
 *   • Remote / cloud Ollama-compatible API (custom URL + API key)
 *   • Claude Code, Codex, OpenCode, and Antigravity through authenticated sessions
 *   • OpenAI-compatible streaming (text/event-stream + ndjson)
 *
 * The agent receives the current dataset as context and can respond with:
 *   • Plain explanations / summaries
 *   • Structured ACTION blocks (JSON) that the parent can execute to
 *     manipulate the data in real-time (add/delete column, filter, rename,
 *     sort, fill missing, add row, etc.)
 * ───────────────────────────────────────────────────────────────────────────
 */
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo
} from 'react';
import { Check, ChevronDown, Copy, MessageSquare, Paperclip, Send, Square, Trash2 } from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────

const sampleRows = (data, maxRows = 8) => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const step = Math.max(1, Math.floor(data.length / maxRows));
  const out = [];
  for (let i = 0; i < data.length && out.length < maxRows; i += step) {
    out.push(data[i]);
  }
  return out;
};

const buildDatasetContext = (columns, fullData, selectedRowIndices = null, allColumns = columns) => {
  const scopedColumns = Array.isArray(columns) ? columns : [];
  const availableColumns = Array.from(new Set((Array.isArray(allColumns) ? allColumns : scopedColumns).map(String)));
  if (scopedColumns.length === 0) return 'No selected columns are available.';
  const sourceRows = Array.isArray(fullData) ? fullData : [];
  const rows = Array.isArray(selectedRowIndices)
    ? selectedRowIndices.map((index) => sourceRows[index]).filter(Boolean)
    : sourceRows;
  const rowEntries = rows.map((row, index) => ({
    row_index: Array.isArray(selectedRowIndices) ? selectedRowIndices[index] : index,
    row
  }));
  const sample = sampleRows(rowEntries, 8).map(({ row_index, row }) => ({
    row_index,
    ...scopedColumns.reduce((out, columnName) => {
      out[columnName] = row?.[columnName];
      return out;
    }, {})
  }));
  const colSummary = scopedColumns.map((col) => {
    const vals = rows.map((r) => r?.[col]).filter((v) => v !== null && v !== undefined && v !== '');
    const numericCount = vals.filter((v) => !Number.isNaN(Number(v))).length;
    const isNumeric = vals.length > 0 && numericCount / vals.length > 0.8;
    const uniqueCount = new Set(vals.map(String)).size;
    return `  - ${col} [${isNumeric ? 'numeric' : 'categorical'}, ${uniqueCount} unique, ${rows.length - vals.length} missing]`;
  });
  const sampleStr = JSON.stringify(sample, null, 2);
  return [
    `Dataset: ${rows.length} rows x ${scopedColumns.length} selected columns`,
    Array.isArray(selectedRowIndices) ? 'Scope: currently shown and selected rows/columns only.' : '',
    `All dataset columns available for explicit actions: ${availableColumns.join(', ')}`,
    'Columns:',
    ...colSummary,
    `Selected columns available for label/group-aware prediction: ${scopedColumns.join(', ')}`,
    'Rows are addressed by zero-based original row_index when editing a specific cell.',
    '',
    'Sample rows (up to 8):',
    sampleStr
  ].join('\n');
};

const SYSTEM_PROMPT = `You are a smart data manipulation AI agent embedded inside a statistical analysis tool.
You have access to the user's current dataset. You can both explain data and issue structured commands to modify it.

When the user asks you to make a change to the data, respond with:
1. A brief natural-language explanation of what you are doing.
2. THEN a JSON action block wrapped EXACTLY like this (no extra text between the tags):

<DATA_ACTION>
{
  "action": "one_of_the_actions_below",
  ...parameters
}
</DATA_ACTION>

Available actions and their parameters:
- add_column:       { "action": "add_column",       "name": "colName",           "value": "defaultValue" }
- delete_column:    { "action": "delete_column",    "name": "colName" }
- rename_column:    { "action": "rename_column",    "from": "oldName",           "to": "newName" }
- filter_rows:      { "action": "filter_rows",      "column": "colName",         "operator": "equals|not_equals|contains|starts_with|ends_with|greater_than|greater_equal|less_than|less_equal|between|missing|not_missing", "value": "filterValue", "value2": "optional second value" }
- sort_rows:        { "action": "sort_rows",        "column": "colName",         "direction": "asc|desc" }
- fill_missing:     { "action": "fill_missing",     "column": "colName", "columns": ["colA", "colB"] or ["*"], "all_columns": true, "mode": "remove_rows|fill_previous|constant|ml_prediction",  "value": "...", "group_column": "optional label column" }
- replace_value:    { "action": "replace_value",    "column": "colName",         "find": "oldValue",         "replace": "newValue" }
- add_row:          { "action": "add_row",          "values": { "col1": "v1", "col2": "v2" } }
- delete_rows:      { "action": "delete_rows",      "row_indices": [0, 1] } // omit row_indices to delete the currently selected rows
- create_dataset:   { "action": "create_dataset",   "columns": ["col1", "col2"], "rows": [{ "col1": "value", "col2": 123 }] }
- edit_cell:        { "action": "edit_cell",        "row_index": 0, "column": "colName", "value": "newValue" }
- set_cell_color:   { "action": "set_cell_color",   "color": "#fff2a8", "scope": "selection|column|row|cell", "column": "optional column", "row_index": "optional zero-based row" }
- set_text_color:   { "action": "set_text_color",   "color": "#111827", "scope": "selection|column|row|cell", "column": "optional column", "row_index": "optional zero-based row" }
- format_cells:     { "action": "format_cells", "scope": "selection|column|row|cell", "background_color": "optional hex", "color": "optional hex", "font_family": "optional", "font_size": "optional", "text_align": "left|center|right", "text_transform": "uppercase|lowercase|capitalize|normal", "font_weight": "normal|bold", "font_style": "normal|italic", "text_decoration": "none|underline" }
- reorder_columns:  { "action": "reorder_columns",  "from": "oldColumn", "to": "columnAfterWhichToPlaceIt" }
- merge_columns:    { "action": "merge_columns",    "column_a": "colA", "column_b": "colB", "new_column": "merged", "mode": "stack_ab|stack_ba" }
- reshape_wide_to_long: { "action": "reshape_wide_to_long", "id_column": "id", "columns": ["value_a", "value_b"], "factor_column": "condition", "value_column": "value" }
- separate_column:  { "action": "separate_column",  "column": "full_name", "separator": " ", "output_columns": ["first", "last"], "remove_original": true }
- group_summarize:  { "action": "group_summarize",  "group_columns": ["group"], "summary_column": "value", "summary_function": "count|n_distinct|mean|sum|median|min|max", "result_name": "optional", "sort_direction": "asc|desc", "output_mode": "summary_rows|new_column" }
- distinct_rows:    { "action": "distinct_rows",    "columns": ["colA", "colB"], "keep_all": true }
- rename_group_levels: { "action": "rename_group_levels", "column": "group", "levels": ["old"], "replacement": "new" }
- keep_columns:     { "action": "keep_columns",     "columns": ["colA", "colB"] }
- delete_columns:   { "action": "delete_columns",   "columns": ["colA", "colB"] }
- run_pipeline:     { "action": "run_pipeline",     "pipeline": "filter(...) %>% mutate(...)" }
- undo:             { "action": "undo" }
- summarize:        { "action": "summarize" }
- calculate:        { "action": "calculate",        "mode": "column_total|row_totals|summary", "column": "colName", "operation": "sum|average|min|max|count" }

For requests such as "sum the first column", "total each row", or "create a summary table", emit a calculate action so the result window opens with the requested calculation.
For missing-value prediction, use one fill_missing action with mode "ml_prediction". To fill missing values in several columns in one background run, put every target name in the "columns" array. When the user asks for all columns, use "all_columns": true and "columns": ["*"] so the application sends every currently selected column in one batch. If the user names the subject label, pass that exact column as "group_column": use the tumor-type column for a tumor task, the gender column for a gender task, and the cohort or treatment column when those are the requested subjects. Every target column is then predicted only from rows with the same label and never mixes different groups.
The group_column must be a categorical label column only, such as tumor type, cohort, sex, or treatment group. Never use a numeric measurement column as group_column. If more than one categorical label exists, do not guess: use the exact label named by the user. Only omit group_column when no relevant label is available, so the application can automatically detect a repeated categorical label.
When the current dataset is empty and the user asks to generate, create, or populate random/sample data, emit one create_dataset action with named columns and populated rows. Do not emit only add_column actions for this request. Keep generated datasets to at most 100 rows unless the user asks for fewer.

When the user attaches a photo of a table, spreadsheet, form, or other structured data, read the visible rows and columns and emit one create_dataset action containing the extracted column names and values. Preserve text, numbers, dates, and blank cells as accurately as possible. Mention uncertain or unreadable values briefly before the action. Do not invent values.

## Omics and bioinformatics expertise
Treat omics questions as reproducible scientific workflows, not generic table operations. For R, know the Bioconductor ecosystem and choose packages by assay: SummarizedExperiment/SingleCellExperiment, scater, scran, scuttle, DropletUtils, scDblFinder, SingleR/celldex, Seurat, Signac, ArchR, chromVAR, GenomicRanges, rtracklayer, DiffBind/csaw, edgeR, DESeq2, limma, muscat, SpatialExperiment, minfi, and sesame. For Python, know pandas/numpy/scipy/statsmodels, Biopython, Scanpy/anndata, scvi-tools, scrublet, celltypist, muon/MuData, episcanpy, pycisTopic, pybedtools, pyranges, pysam, and matplotlib/seaborn. Cover bulk and single-cell RNA-seq, ATAC-seq, multiome, ChIP-seq, methylation, spatial, proteomics, metagenomics, and other omics when relevant.
For omics analysis, ask for or inspect the assay, reference genome/build, feature and cell/sample identifiers, count/peak/methylation matrix type, metadata, batch structure, and experimental design before choosing a method. Prefer established Bioconductor or Python packages, state important assumptions, preserve sparse matrices and biological replicates, and distinguish QC, normalization, dimensionality reduction, clustering, annotation, differential testing, enrichment, and visualization. Never claim a package is installed or a result is biologically valid without checking the environment and data.

## Strict step-by-step workflow
1. Restate the requested goal and identify the exact input data, scope, and desired output.
2. Inspect the available columns, metadata, dimensions, types, missingness, identifiers, and relevant experimental design before acting.
3. State a short ordered plan with prerequisites, method choices, and expected outputs.
4. Execute only the next valid step. Do not skip prerequisites, silently change methods, or combine unrelated steps.
5. Validate each step's output before continuing; if a prerequisite or check fails, stop and explain the blocker and the safest next action.
6. Keep an explicit record of transformations, filters, parameters, package versions, and random seeds when relevant so the workflow is reproducible.
7. Finish with the result, validation status, limitations, and the next step. Never invent missing inputs, results, or completed analyses.

## Simple, understandable code
- When an analysis requires R or Python code, write it as a numbered workflow with \`Step 1\`, \`Step 2\`, \`Step 3\`, and one logical task per step.
- Add detailed comments beside every step explaining what it does, why it is needed, which input it uses, what assumption it makes, and what the user should verify. Keep the code simple enough to follow without advanced programming knowledge.
- For both omics and ordinary data analysis, explain why each package, transformation, filter, statistical method, and plot was selected. Do not jump directly to a final result without showing the reasoning and validation for the preceding step.
- Put package installation first when needed: use \`install.packages()\` or \`BiocManager::install()\` for R and \`python -m pip install\` or conda for Python. Keep installation, imports, analysis, validation, and plots in separate steps.
- Prefer descriptive variable names and readable multi-line code. Avoid dense one-liners, hidden transformations, and silently installing packages.

You may include multiple <DATA_ACTION> blocks in a single response if multiple steps are needed.
If no data change is requested, just reply naturally without any action block.
Always be concise and helpful.`;

// ─── streaming helpers ───────────────────────────────────────────────────────

const parseOllamaChunk = (line) => {
  try {
    const data = JSON.parse(line);
    if (typeof data.response === 'string') return data.response;
    if (data.message?.content) return data.message.content;
    if (data.choices?.[0]?.delta?.content) return data.choices[0].delta.content;
    if (data.delta?.text) return data.delta.text;
    return '';
  } catch {
    return '';
  }
};

const isOpenAIStyle = (url) => {
  if (!url) return false;
  return url.includes('/v1/chat') || url.includes('/chat/completions');
};

const buildRequestBody = (model, messages, url) => {
  if (isOpenAIStyle(url)) {
    return JSON.stringify({ model, messages, stream: true });
  }
  if (/\/api\/chat$/i.test(String(url || ''))) {
    const chatMessages = messages.map((message) => {
      const images = getMessageImages(message.content);
      return {
        ...message,
        content: getMessageText(message.content),
        ...(images.length > 0 ? { images } : {})
      };
    });
    return JSON.stringify({ model, messages: chatMessages, stream: true });
  }
  const fullPrompt = messages
    .map((m) => (m.role === 'user' ? `User: ${getMessageText(m.content)}` : `Assistant: ${getMessageText(m.content)}`))
    .join('\n\n');
  const images = messages.flatMap((message) => getMessageImages(message.content));
  return JSON.stringify({ model, prompt: fullPrompt, ...(images.length > 0 ? { images } : {}), stream: true });
};

const buildAnthropicRequestBody = (model, messages) => {
  const system = messages.find((message) => message.role === 'system')?.content;
  const anthropicMessages = messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      ...message,
      content: Array.isArray(message.content)
        ? message.content.map((part) => {
          if (part?.type !== 'image_url') return part;
          const dataUrl = String(part.image_url?.url || '');
          const [header, data] = dataUrl.split(',', 2);
          return {
            type: 'image',
            source: {
              type: 'base64',
              media_type: header.match(/^data:([^;]+);base64$/i)?.[1] || 'image/jpeg',
              data: data || ''
            }
          };
        })
        : message.content
    }));
  return JSON.stringify({
    model,
    max_tokens: 4096,
    ...(system ? { system } : {}),
    messages: anthropicMessages,
    stream: true
  });
};

const getMessageText = (content) => {
  if (!Array.isArray(content)) return String(content || '');
  return content
    .filter((part) => part?.type === 'text')
    .map((part) => String(part.text || ''))
    .join('\n');
};

const getMessageImages = (content) => {
  if (!Array.isArray(content)) return [];
  return content
    .filter((part) => part?.type === 'image_url')
    .map((part) => String(part.image_url?.url || ''))
    .filter((url) => url.startsWith('data:image/'))
    .map((url) => url.split(',', 2)[1] || '')
    .filter(Boolean);
};

const normalizeOllamaApiUrl = (value) => {
  const raw = String(value || '').trim().replace(/\/+$/, '');
  if (!raw) return 'http://localhost:11434/api/generate';
  if (/\/api\/(generate|chat)$/i.test(raw) || /\/v1\/chat\/completions$/i.test(raw)) return raw;
  if (/\/api\/tags$/i.test(raw)) return raw.replace(/\/tags$/i, '/generate');
  if (/\/api$/i.test(raw)) return `${raw}/generate`;
  if (!/\/(api|v1)\//i.test(raw)) return `${raw}/api/generate`;
  return raw;
};

const getOllamaBaseUrl = (value) => normalizeOllamaApiUrl(value).replace(/\/api\/(generate|chat)$/i, '');

const OLLAMA_CLOUD_URL_STORAGE_KEY = 'my-stats.ollama.cloud-url';
const OLLAMA_CLOUD_API_KEY_STORAGE_KEY = 'my-stats.ollama.cloud-api-key';
const OLLAMA_MODEL_STORAGE_KEY = 'my-stats.data-explorer.ollama-model';
const OPENROUTER_KEY_STORAGE_KEY = 'my-stats.r-editor.openrouter-api-key';
const OPENROUTER_MODEL_STORAGE_KEY = 'my-stats.r-editor.openrouter-model';
const OPENROUTER_HOST_STORAGE_KEY = 'my-stats.r-editor.openrouter-host';
const OPENROUTER_DEFAULT_HOST = 'https://openrouter.ai/api/v1';
const OPENROUTER_DEFAULT_MODEL = 'openai/gpt-4o-mini';
const UNOROUTER_KEY_STORAGE_KEY = 'my-stats.r-editor.unorouter-api-key';
const UNOROUTER_MODEL_STORAGE_KEY = 'my-stats.r-editor.unorouter-model';
const UNOROUTER_HOST_STORAGE_KEY = 'my-stats.r-editor.unorouter-host';
const UNOROUTER_DEFAULT_HOST = 'https://api.unorouter.com/v1';
const OPENAI_KEY_STORAGE_KEY = 'my-stats.r-editor.openai-api-key';
const OPENAI_MODEL_STORAGE_KEY = 'my-stats.r-editor.openai-model';
const OPENAI_HOST_STORAGE_KEY = 'my-stats.r-editor.openai-host';
const OPENAI_DEFAULT_HOST = 'https://api.openai.com/v1';
const OPENAI_DEFAULT_MODEL = 'gpt-5.6-sol';
const ANTHROPIC_KEY_STORAGE_KEY = 'my-stats.r-editor.anthropic-api-key';
const ANTHROPIC_MODEL_STORAGE_KEY = 'my-stats.r-editor.anthropic-model';
const ANTHROPIC_HOST_STORAGE_KEY = 'my-stats.r-editor.anthropic-host';
const ANTHROPIC_DEFAULT_HOST = 'https://api.anthropic.com/v1';
const ANTHROPIC_DEFAULT_MODEL = 'claude-3-opus-20240229';
const NVIDIA_KEY_STORAGE_KEY = 'my-stats.r-editor.nvidia-api-key';
const NVIDIA_MODEL_STORAGE_KEY = 'my-stats.r-editor.nvidia-model';
const NVIDIA_HOST_STORAGE_KEY = 'my-stats.r-editor.nvidia-host';
const NVIDIA_DEFAULT_HOST = 'https://integrate.api.nvidia.com/v1';
const NVIDIA_DEFAULT_MODEL = 'meta/llama-3.1-nemotron-70b-instruct';
const CODEX_MODEL_STORAGE_KEY = 'my-stats.data-explorer.codex-model';
const CODEX_REASONING_EFFORT_STORAGE_KEY = 'my-stats.data-explorer.codex-reasoning-effort';
const CODEX_DEFAULT_REASONING_EFFORT = 'medium';
const OPENCODE_MODEL_STORAGE_KEY = 'my-stats.r-editor.opencode-model';
const OPENCODE_DEFAULT_MODEL = 'deepseek-v4-pro';
const ANTIGRAVITY_MODEL_STORAGE_KEY = 'my-stats.r-editor.antigravity-model';
const ANTIGRAVITY_EFFORT_STORAGE_KEY = 'my-stats.r-editor.antigravity-effort';
const ANTIGRAVITY_DEFAULT_EFFORT = 'medium';

const providerDefinitions = {
  openai: {
    label: 'OpenAI',
    hostKey: OPENAI_HOST_STORAGE_KEY,
    keyKey: OPENAI_KEY_STORAGE_KEY,
    modelKey: OPENAI_MODEL_STORAGE_KEY,
    defaultHost: OPENAI_DEFAULT_HOST,
    defaultModel: OPENAI_DEFAULT_MODEL,
    keyPlaceholder: 'sk-...',
    models: ['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna', 'gpt-4o', 'gpt-4o-mini', 'o1', 'o3-mini'],
  },
  anthropic: {
    label: 'Anthropic',
    hostKey: ANTHROPIC_HOST_STORAGE_KEY,
    keyKey: ANTHROPIC_KEY_STORAGE_KEY,
    modelKey: ANTHROPIC_MODEL_STORAGE_KEY,
    defaultHost: ANTHROPIC_DEFAULT_HOST,
    defaultModel: ANTHROPIC_DEFAULT_MODEL,
    keyPlaceholder: 'sk-ant-...',
    models: ['claude-3-opus-20240229', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-sonnet-20240229'],
  },
  nvidia: {
    label: 'NVIDIA',
    hostKey: NVIDIA_HOST_STORAGE_KEY,
    keyKey: NVIDIA_KEY_STORAGE_KEY,
    modelKey: NVIDIA_MODEL_STORAGE_KEY,
    defaultHost: NVIDIA_DEFAULT_HOST,
    defaultModel: NVIDIA_DEFAULT_MODEL,
    keyPlaceholder: 'nvapi-...',
    models: ['nvidia/llama-3.1-nemotron-70b-instruct', 'meta/llama-3.1-405b-instruct', 'meta/llama-3.1-70b-instruct', 'mistralai/mistral-large-2-instruct'],
  },
  openrouter: {
    label: 'OpenRouter',
    hostKey: OPENROUTER_HOST_STORAGE_KEY,
    keyKey: OPENROUTER_KEY_STORAGE_KEY,
    modelKey: OPENROUTER_MODEL_STORAGE_KEY,
    defaultHost: OPENROUTER_DEFAULT_HOST,
    defaultModel: OPENROUTER_DEFAULT_MODEL,
    keyPlaceholder: 'sk-or-v1-...',
    models: ['anthropic/claude-3-opus', 'openai/gpt-4o', 'openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.1-70b-instruct', 'google/gemini-2.0-flash'],
  },
  unorouter: {
    label: 'UnoRouter',
    hostKey: UNOROUTER_HOST_STORAGE_KEY,
    keyKey: UNOROUTER_KEY_STORAGE_KEY,
    modelKey: UNOROUTER_MODEL_STORAGE_KEY,
    defaultHost: UNOROUTER_DEFAULT_HOST,
    defaultModel: 'gpt-oss-120b:free',
    keyPlaceholder: 'UnoRouter API key',
    models: ['gpt-oss-120b:free', 'deepseek-v3.1:free', 'qwen3-coder:free', 'gemini-2.5-flash:free'],
  }
};

const PROVIDER_GROUPS = [
  { id: 'ollama', label: 'Ollama' },
  { id: 'claude', label: 'Claude' },
  { id: 'codex', label: 'Codex' },
  { id: 'opencode', label: 'OpenCode' },
  { id: 'antigravity', label: 'Antigravity' },
  { id: 'api', label: 'API' }
];

const API_SUB_PROVIDERS = [
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'nvidia', label: 'NVIDIA' },
  { id: 'openrouter', label: 'OpenRouter' },
  { id: 'unorouter', label: 'UnoRouter' }
];

const apiProviderIds = ['openai', 'anthropic', 'nvidia', 'openrouter', 'unorouter'];

const readStoredValue = (key, fallback = '') => {
  try { return window.localStorage.getItem(key) || fallback; } catch { return fallback; }
};

const normalizeOpenAIChatUrl = (value) => {
  const raw = String(value || '').trim().replace(/\/+$/, '');
  if (!raw) return '';
  if (/\/chat\/completions$/i.test(raw)) return raw;
  return `${raw}/chat/completions`;
};

const normalizeAnthropicMessagesUrl = (value) => {
  const raw = String(value || '').trim().replace(/\/+$/, '');
  if (!raw) return '';
  if (/\/messages$/i.test(raw)) return raw;
  return `${raw}/messages`;
};

const formatLocalConnectionError = (error) => {
  if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
    return 'Ollama did not respond in time. Make sure it is running and try again.';
  }
  if (error instanceof TypeError || /failed to fetch|networkerror|cors/i.test(String(error?.message || ''))) {
    return 'Cannot reach Ollama from this window. Start Ollama, or enable OLLAMA_ORIGINS for browser use.';
  }
  return error?.message || 'Could not connect to local AI.';
};

// ─── action parser ───────────────────────────────────────────────────────────

const normalizeDatasetAction = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const actionName = String(value.action || '').trim().toLowerCase();
  const hasRows = Array.isArray(value.rows) || Array.isArray(value.data);
  const datasetActionNames = new Set(['create_dataset', 'generate_data', 'generate_dataset', 'populate_dataset']);
  if (!datasetActionNames.has(actionName) && !(hasRows && !actionName)) return null;
  return {
    ...value,
    action: 'create_dataset',
    rows: Array.isArray(value.rows) ? value.rows : (Array.isArray(value.data) ? value.data : [])
  };
};

const normalizeEditorAction = (value) => {
  const datasetAction = normalizeDatasetAction(value);
  if (datasetAction) return datasetAction;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const actionName = String(value.action || '').trim().toLowerCase();
  const aliases = {
    add_row_to_dataset: 'add_row',
    delete_row: 'delete_rows',
    remove_row: 'delete_rows',
    remove_rows: 'delete_rows',
    drop_rows: 'delete_rows',
    remove_column: 'delete_column',
    drop_column: 'delete_column',
    drop_columns: 'delete_columns',
    set_cell: 'edit_cell',
    update_cell: 'edit_cell',
    set_color: 'set_cell_color',
    color_cells: 'set_cell_color',
    background_color: 'set_cell_color',
    text_color: 'set_text_color',
    format: 'format_cells',
    format_cells_in_selection: 'format_cells',
    move_column: 'reorder_columns',
    reorder_column: 'reorder_columns',
    merge: 'merge_columns',
    reshape: 'reshape_wide_to_long',
    split_column: 'separate_column',
    separate: 'separate_column',
    group_by: 'group_summarize',
    summarize_groups: 'group_summarize',
    deduplicate: 'distinct_rows',
    remove_duplicates: 'distinct_rows',
    rename_levels: 'rename_group_levels',
    keep: 'keep_columns',
    pipeline: 'run_pipeline',
    apply_pipeline: 'run_pipeline'
  };
  if (!actionName) return null;
  return { ...value, action: aliases[actionName] || actionName };
};

const parseActions = (text) => {
  const regex = /<DATA_ACTION>([\s\S]*?)<\/DATA_ACTION>/g;
  const actions = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    try {
      const action = JSON.parse(match[1].trim());
      actions.push(normalizeEditorAction(action) || action);
    } catch {
      // ignore malformed
    }
  }

  // Accept a JSON response from models that omit the action tags or use a code fence.
  if (actions.length === 0) {
    const candidates = [];
    const fenced = String(text || '').match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) candidates.push(fenced[1].trim());
    const rawText = String(text || '').trim();
    if (rawText) candidates.push(rawText);
    const firstObject = rawText.indexOf('{');
    const lastObject = rawText.lastIndexOf('}');
    if (firstObject >= 0 && lastObject > firstObject) {
      candidates.push(rawText.slice(firstObject, lastObject + 1));
    }

    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate);
        const action = normalizeEditorAction(parsed);
        if (action) {
          actions.push(action);
          break;
        }
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((row) => row && typeof row === 'object' && !Array.isArray(row))) {
          actions.push({ action: 'create_dataset', rows: parsed });
          break;
        }
      } catch {
        // Ignore natural-language responses that are not JSON.
      }
    }
  }
  return actions;
};

const isDatasetGenerationRequest = (value) => {
  const text = String(value || '').toLowerCase();
  return /\b(generate|create|populate|fill|sample|random|dummy|synthetic|example)\b/.test(text)
    && /\b(data|dataset|rows?|records?|table|columns?)\b/.test(text);
};

const isEmptyDataset = (value) => (
  !Array.isArray(value)
  || value.length === 0
  || value.every((row) => !row || typeof row !== 'object' || Object.keys(row).length === 0)
);

const buildFallbackDatasetAction = (request, existingColumns = []) => {
  const countMatch = String(request || '').match(/\b(\d{1,3})\s*(?:rows?|records?)\b/i);
  const rowCount = Math.max(1, Math.min(100, Number.parseInt(countMatch?.[1] || '10', 10) || 10));
  const columns = existingColumns.length > 0
    ? existingColumns
    : ['id', 'name', 'category', 'value'];
  const rows = Array.from({ length: rowCount }, (_, index) => columns.reduce((row, columnName) => {
    const name = String(columnName).trim();
    const lowerName = name.toLowerCase();
    if (lowerName === 'id' || /(^|[_ -])(age|year|count|number|quantity|score|value|amount|price|sales|total)([_ -]|$)/.test(lowerName)) {
      row[name] = lowerName === 'id' ? index + 1 : Math.round((10 + Math.random() * 990) * 100) / 100;
    } else if (/category|group|type|status/.test(lowerName)) {
      row[name] = ['A', 'B', 'C'][index % 3];
    } else {
      row[name] = `${name || 'item'} ${index + 1}`;
    }
    return row;
  }, {}));
  return { action: 'create_dataset', columns, rows };
};

const stripActionBlocks = (text) =>
  text.replace(/<DATA_ACTION>[\s\S]*?<\/DATA_ACTION>/g, '').trim();

// ─── UI sub-components ──────────────────────────────────────────────────────

const ActionBadge = ({ action, onApply, onDismiss, isApplied, isRTheme }) => {
  const label = (() => {
    switch (action.action) {
      case 'add_column': return `+ Add column "${action.name}"`;
      case 'delete_column': return `Delete column "${action.name}"`;
      case 'rename_column': return `Rename "${action.from}" to "${action.to}"`;
      case 'filter_rows': return `Filter: ${action.column} ${action.operator} "${action.value}"`;
      case 'sort_rows': return `Sort by ${action.column} (${action.direction})`;
      case 'fill_missing': {
        const targetColumns = action.all_columns === true || (Array.isArray(action.columns) && action.columns.includes('*'))
          ? ['all selected columns']
          : Array.isArray(action.columns) && action.columns.length > 0
          ? action.columns
          : [action.column];
        return `Fill missing in ${targetColumns.filter(Boolean).join(', ')}`;
      }
      case 'replace_value': return `Replace "${action.find}" with "${action.replace}" in ${action.column}`;
      case 'add_row': return `Add row`;
      case 'delete_rows': return `Delete selected row(s)`;
      case 'create_dataset': return `Create dataset (${Array.isArray(action.rows) ? action.rows.length : 0} rows)`;
      case 'set_cell_color': return `Set cell color to ${action.color || 'the requested color'}`;
      case 'set_text_color': return `Set text color to ${action.color || 'the requested color'}`;
      case 'format_cells': return 'Format the selected cells';
      case 'reorder_columns': return `Move column "${action.from || action.column || ''}"`;
      case 'summarize': return `Open dataset summary`;
      case 'calculate': return `Calculate ${action.operation || 'summary'}${action.column ? ` for "${action.column}"` : ''}`;
      default: return action.action;
    }
  })();

  return (
    <div className={`ai-agent-action-badge ${isRTheme ? 'r-theme' : ''} ${isApplied ? 'applied' : ''}`}>
      <span className="ai-agent-action-label">{label}</span>
      <div className="ai-agent-action-buttons">
        {!isApplied && (
          <button
            type="button"
            className="ai-agent-action-apply"
            onClick={onApply}
            title="Apply this action to your data"
          >
            Apply
          </button>
        )}
        {isApplied && (
          <span className="ai-agent-action-done">Applied</span>
        )}
        {!isApplied && (
          <button
            type="button"
            className="ai-agent-action-dismiss"
            onClick={onDismiss}
            title="Dismiss"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
};

const formatAgentTimestamp = (value) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const MessageBubble = ({ message, onApplyAction, appliedActions, onDismissAction, isRTheme, isStreaming }) => {
  const { role, content, actions, imageName, imageDataUrl, id: msgId } = message;
  const isUser = role === 'user';
  const isSystem = role === 'system';
  const displayContent = actions && actions.length > 0 ? stripActionBlocks(content) : content;
  const [copied, setCopied] = useState(false);
  const copyMessage = async () => {
    if (!displayContent) return;
    try {
      await navigator.clipboard.writeText(displayContent);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { /* Clipboard access can be unavailable in packaged environments. */ }
  };

  if (isUser) {
    return (
      <div className="ai-agent-message user select-text">
        <div className="ai-agent-bubble select-text whitespace-pre-wrap break-words">
          {displayContent}
          {imageDataUrl && <img src={imageDataUrl} alt={imageName || 'Attached table'} className="ai-agent-image-attachment" />}
          {imageName && !imageDataUrl && <div className="ai-agent-attachment-label">Photo attached: {imageName}</div>}
        </div>
      </div>
    );
  }

  if (isSystem) {
    return (
      <div className="ai-agent-message system">
        <div className="ai-agent-bubble whitespace-pre-wrap break-words">{displayContent}</div>
      </div>
    );
  }

  return (
    <div className="ai-agent-message assistant select-text">
      <div className="ai-agent-bubble">
        {displayContent ? (
          <p className="ai-agent-bubble-text" style={{ whiteSpace: 'pre-wrap' }}>{displayContent}</p>
        ) : isStreaming ? (
          <p className="ai-agent-bubble-text ai-agent-thinking-text">Thinking<span className="animate-pulse">…</span></p>
        ) : null}
        {imageName && <div className="ai-agent-attachment-label">Photo attached: {imageName}</div>}
        {actions && actions.length > 0 && (
          <div className="ai-agent-actions-list">
            {actions.map((action, idx) => {
              const actionKey = `${msgId}::${idx}`;
              return (
                <ActionBadge
                  key={actionKey}
                  action={action}
                  isRTheme={isRTheme}
                  isApplied={!!appliedActions[actionKey]}
                  onApply={() => onApplyAction(action, actionKey)}
                  onDismiss={() => onDismissAction(actionKey)}
                />
              );
            })}
          </div>
        )}
        {displayContent && (
          <div className="ai-agent-message-footer">
            <button type="button" onClick={copyMessage} title={copied ? 'Copied' : 'Copy response'}>
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
            <span>{formatAgentTimestamp(message.createdAt)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── main component ──────────────────────────────────────────────────────────

export default function DataExplorerAIAgent({
  fullData,
  columns,
  allColumns = columns,
  selectedRowIndices,
  onAddColumn,
  onDeleteColumn,
  onRenameColumn,
  onFilterRows,
  onSortRows,
  onFillMissing,
  onReplaceValue,
  onAddRow,
  onDeleteRows,
  onCreateDataset,
  onEditCell,
  onSetCellColor,
  onSetTextColor,
  onFormatCells,
  onReorderColumns,
  onMergeColumns,
  onReshapeWideToLong,
  onSeparateColumn,
  onGroupBySummarise,
  onDistinctRows,
  onRenameGroupLevels,
  onKeepColumns,
  onDeleteColumns,
  onApplyDplyrTidyrPipeline,
  onUndoDataset,
  onShowSummary,
  defaultOllamaUrl = 'http://localhost:11434/api/generate',
  defaultApiKey = '',
  isRTheme = false,
  theme = 'ayu-dark',
  floating = false,
  clearRef = null,
  chatMode = 'agent'
}) {
  const isAyuTheme = theme === 'ayu-dark';

  const [providerId, setProviderId] = useState('ollama');
  const [ollamaMode, setOllamaMode] = useState('local');
  const [localModels, setLocalModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(() => readStoredValue(OLLAMA_MODEL_STORAGE_KEY, ''));
  const [isModelsLoading, setIsModelsLoading] = useState(false);
  const [ollamaCloudUrl, setOllamaCloudUrl] = useState(() => readStoredValue(OLLAMA_CLOUD_URL_STORAGE_KEY, ''));
  const [ollamaCloudApiKey, setOllamaCloudApiKey] = useState(() => readStoredValue(OLLAMA_CLOUD_API_KEY_STORAGE_KEY, defaultApiKey));
  const [providerSettings, setProviderSettings] = useState(() => Object.fromEntries(
    Object.entries(providerDefinitions).map(([id, definition]) => [id, {
      host: readStoredValue(definition.hostKey, definition.defaultHost),
      apiKey: readStoredValue(definition.keyKey, id === 'openrouter'
        ? readStoredValue('my-stats.data-explorer.openrouter-api-key', '')
        : ''),
      model: readStoredValue(definition.modelKey, definition.defaultModel)
    }])
  ));
  const [configOpen, setConfigOpen] = useState(false);
  const [modelFilterQuery, setModelFilterQuery] = useState('');
  const [detectedProviderModels, setDetectedProviderModels] = useState({});
  const [modelDetectStatus, setModelDetectStatus] = useState({});
  const [claudeCodeAuthStatus, setClaudeCodeAuthStatus] = useState({ loading: true, loggedIn: false, subscription: false, message: '' });
  const [codexAuthStatus, setCodexAuthStatus] = useState({ loading: true, loggedIn: false, message: '' });
  const [codexModel, setCodexModel] = useState(() => readStoredValue(CODEX_MODEL_STORAGE_KEY, ''));
  const [codexModels, setCodexModels] = useState([]);
  const [codexModelsLoading, setCodexModelsLoading] = useState(false);
  const [codexModelsError, setCodexModelsError] = useState('');
  const [codexReasoningEffort, setCodexReasoningEffort] = useState(() => readStoredValue(CODEX_REASONING_EFFORT_STORAGE_KEY, CODEX_DEFAULT_REASONING_EFFORT));
  const [openCodeAuthStatus, setOpenCodeAuthStatus] = useState({ loading: true, connected: false, error: '' });
  const [openCodeModel, setOpenCodeModel] = useState(() => readStoredValue(OPENCODE_MODEL_STORAGE_KEY, OPENCODE_DEFAULT_MODEL));
  const [openCodeModels, setOpenCodeModels] = useState([]);
  const [openCodeModelsLoading, setOpenCodeModelsLoading] = useState(false);
  const [openCodeModelsError, setOpenCodeModelsError] = useState('');
  const [antigravityAuthStatus, setAntigravityAuthStatus] = useState({ loading: true, connected: false, message: '' });
  const [antigravityModel, setAntigravityModel] = useState(() => readStoredValue(ANTIGRAVITY_MODEL_STORAGE_KEY, ''));
  const [antigravityModels, setAntigravityModels] = useState([]);
  const [antigravityModelsLoading, setAntigravityModelsLoading] = useState(false);
  const [antigravityModelsError, setAntigravityModelsError] = useState('');
  const [antigravityEffort, setAntigravityEffort] = useState(() => readStoredValue(ANTIGRAVITY_EFFORT_STORAGE_KEY, ANTIGRAVITY_DEFAULT_EFFORT));

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [imageAttachment, setImageAttachment] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [appliedActions, setAppliedActions] = useState({});
  const [dismissedActions, setDismissedActions] = useState({});
  const scrollRef = useRef(null);
  const scrollFrameRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const imageInputRef = useRef(null);
  const msgIdCounter = useRef(0);
  const autoAppliedActionKeysRef = useRef(new Set());
  const directlyAppliedActionKeysRef = useRef(new Set());

  const loadCodexModels = useCallback(async () => {
    setCodexModelsLoading(true);
    setCodexModelsError('');
    try {
      const result = await window.electronAPI?.codexModels?.();
      const models = Array.isArray(result?.models)
        ? result.models.map((model) => String(model).trim()).filter(Boolean)
        : [];
      if (!result?.success || models.length === 0) {
        throw new Error(result?.error || 'No Codex models returned.');
      }
      setCodexModels(models);
      setCodexModel((previous) => {
        const next = previous && models.includes(previous) ? previous : models[0];
        try { window.localStorage.setItem(CODEX_MODEL_STORAGE_KEY, next); } catch { /* Ignore storage failures. */ }
        return next;
      });
    } catch (error) {
      setCodexModelsError(error?.message || 'Could not detect Codex models.');
    } finally {
      setCodexModelsLoading(false);
    }
  }, []);

  const loadOpenCodeModels = useCallback(async () => {
    setOpenCodeModelsLoading(true);
    setOpenCodeModelsError('');
    try {
      const result = await window.electronAPI?.getOpenCodeModels?.();
      const models = Array.isArray(result?.models) ? result.models.map(String).filter(Boolean) : [];
      if (!result?.success || models.length === 0) throw new Error(result?.error || 'No OpenCode models returned.');
      setOpenCodeModels(models);
      setOpenCodeModel((previous) => {
        const next = previous && models.includes(previous) ? previous : models[0];
        try { window.localStorage.setItem(OPENCODE_MODEL_STORAGE_KEY, next); } catch { /* Ignore storage failures. */ }
        return next;
      });
    } catch (error) {
      setOpenCodeModelsError(error?.message || 'Could not detect OpenCode models.');
    } finally {
      setOpenCodeModelsLoading(false);
    }
  }, []);

  const loadAntigravityModels = useCallback(async () => {
    setAntigravityModelsLoading(true);
    setAntigravityModelsError('');
    try {
      const result = await window.electronAPI?.antigravityModels?.();
      const models = Array.isArray(result?.models) ? result.models.map(String).filter(Boolean) : [];
      if (!result?.success || models.length === 0) throw new Error(result?.error || 'No Antigravity models returned.');
      setAntigravityModels(models);
      setAntigravityAuthStatus({ loading: false, connected: true, message: 'Connected to Antigravity' });
      setAntigravityModel((previous) => {
        const next = previous && models.includes(previous) ? previous : models[0];
        try { window.localStorage.setItem(ANTIGRAVITY_MODEL_STORAGE_KEY, next); } catch { /* Ignore storage failures. */ }
        return next;
      });
    } catch (error) {
      setAntigravityModelsError(error?.message || 'Could not detect Antigravity models.');
      setAntigravityAuthStatus((previous) => ({ ...previous, loading: false, connected: false, message: error?.message || 'Sign in to Antigravity first.' }));
    } finally {
      setAntigravityModelsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadSubscriptionAuthStatus = async () => {
      const [claudeResult, codexResult, openCodeResult, antigravityResult] = await Promise.allSettled([
        window.electronAPI?.claudeCodeAuthStatus?.(),
        window.electronAPI?.codexAuthStatus?.(),
        window.electronAPI?.getOpenCodeAuthStatus?.(),
        window.electronAPI?.antigravityAuthStatus?.()
      ]);
      if (cancelled) return;
      if (claudeResult.status === 'fulfilled' && claudeResult.value) {
        setClaudeCodeAuthStatus({ loading: false, ...claudeResult.value });
      } else {
        setClaudeCodeAuthStatus((previous) => ({ ...previous, loading: false, message: 'Claude subscription status unavailable.' }));
      }
      if (codexResult.status === 'fulfilled' && codexResult.value) {
        setCodexAuthStatus({ loading: false, ...codexResult.value });
        if (codexResult.value.loggedIn) loadCodexModels();
      } else {
        setCodexAuthStatus((previous) => ({ ...previous, loading: false, message: 'Codex subscription status unavailable.' }));
      }
      if (openCodeResult.status === 'fulfilled' && openCodeResult.value) {
        const connected = Boolean(openCodeResult.value.connected);
        setOpenCodeAuthStatus({ loading: false, connected, error: openCodeResult.value.error || '' });
        if (connected) loadOpenCodeModels();
      } else {
        setOpenCodeAuthStatus((previous) => ({ ...previous, loading: false, error: 'OpenCode status unavailable.' }));
      }
      if (antigravityResult.status === 'fulfilled' && antigravityResult.value) {
        const connected = Boolean(antigravityResult.value.connected);
        setAntigravityAuthStatus({ loading: false, connected, message: antigravityResult.value.message || '' });
        if (connected) loadAntigravityModels();
      } else {
        setAntigravityAuthStatus((previous) => ({ ...previous, loading: false, message: 'Antigravity status unavailable.' }));
      }
    };
    loadSubscriptionAuthStatus();
    return () => { cancelled = true; };
  }, [loadAntigravityModels, loadCodexModels, loadOpenCodeModels]);

  const nextId = () => {
    msgIdCounter.current += 1;
    return `msg_${msgIdCounter.current}`;
  };

  const handleDetectModels = useCallback(async (targetProvider) => {
    const definition = providerDefinitions[targetProvider];
    const settings = providerSettings[targetProvider] || {};
    const rawHost = String(settings.host || definition?.defaultHost || '').trim().replace(/\/+$/, '');
    const host = rawHost.replace(/\/(?:chat\/completions|messages)$/i, '');
    if (!host || !settings.apiKey?.trim()) {
      setModelDetectStatus((previous) => ({
        ...previous,
        [targetProvider]: { loading: false, error: 'Add the host and API key first.', count: 0 }
      }));
      return;
    }

    setModelDetectStatus((previous) => ({
      ...previous,
      [targetProvider]: { loading: true, error: null, count: null }
    }));

    try {
      const headers = {};
      if (targetProvider === 'anthropic') {
        headers['x-api-key'] = settings.apiKey;
        headers['anthropic-version'] = '2023-06-01';
        headers['anthropic-dangerous-direct-browser-access'] = 'true';
      } else {
        headers.Authorization = `Bearer ${settings.apiKey}`;
      }
      const response = await fetch(`${host}/models`, {
        headers,
        signal: AbortSignal.timeout(8000)
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        let message = `HTTP ${response.status}`;
        try { message = JSON.parse(text)?.error?.message || message; } catch { /* Keep HTTP status. */ }
        throw new Error(message);
      }
      const data = await response.json();
      const list = Array.isArray(data) ? data : (data?.data || data?.models || []);
      const models = list
        .map((model) => typeof model === 'string' ? model : (model?.id || model?.name || model?.model))
        .filter(Boolean)
        .map(String);
      if (models.length === 0) throw new Error('No models returned by host.');
      setDetectedProviderModels((previous) => ({ ...previous, [targetProvider]: models }));
      setModelDetectStatus((previous) => ({
        ...previous,
        [targetProvider]: { loading: false, error: null, count: models.length }
      }));
    } catch (error) {
      setModelDetectStatus((previous) => ({
        ...previous,
        [targetProvider]: { loading: false, error: error?.message || 'Detection failed.', count: 0 }
      }));
    }
  }, [providerSettings]);

  const fetchLocalModels = useCallback(async () => {
    setIsModelsLoading(true);
    setError(null);
    try {
      if (ollamaMode === 'cloud' && !ollamaCloudUrl.trim()) {
        throw new Error('Enter an Ollama cloud endpoint first.');
      }
      if (ollamaMode === 'local' && window.electronAPI?.getAIModels) {
        const res = await window.electronAPI.getAIModels();
        const models = Array.isArray(res)
          ? res
          : Array.isArray(res?.models) ? res.models : [];
        if (models.length === 0 && res?.error) throw new Error(res.error);
        setLocalModels(models);
        if (models.length > 0) {
          setSelectedModel((prev) => {
            const nextModel = prev && models.includes(prev) ? prev : models[0];
            try { window.localStorage.setItem(OLLAMA_MODEL_STORAGE_KEY, nextModel); } catch { /* Ignore storage failures. */ }
            return nextModel;
          });
        } else if (res?.warning || res?.info) {
          setError(res.warning || res.info);
        }
        return;
      }
      const activeOllamaUrl = ollamaMode === 'cloud' ? ollamaCloudUrl : defaultOllamaUrl;
      const baseUrl = getOllamaBaseUrl(activeOllamaUrl);
      const headers = ollamaMode === 'cloud' && ollamaCloudApiKey.trim()
        ? { Authorization: `Bearer ${ollamaCloudApiKey.trim()}` }
        : undefined;
      const res = await fetch(`${baseUrl}/api/tags`, { headers, signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error(`Ollama returned ${res.status}`);
      const data = await res.json();
      const models = (data.models || []).map((m) => m.name || m);
      setLocalModels(models);
      if (models.length > 0) {
        setSelectedModel((prev) => {
          const nextModel = prev && models.includes(prev) ? prev : models[0];
          try { window.localStorage.setItem(OLLAMA_MODEL_STORAGE_KEY, nextModel); } catch { /* Ignore storage failures. */ }
          return nextModel;
        });
      }
      else setError('Ollama is reachable, but no local models are installed.');
    } catch (err) {
      setError(`Could not fetch local models: ${formatLocalConnectionError(err)}`);
    } finally {
      setIsModelsLoading(false);
    }
  }, [defaultOllamaUrl, ollamaCloudApiKey, ollamaCloudUrl, ollamaMode]);

  useEffect(() => {
    if (providerId === 'ollama') fetchLocalModels();
  }, [fetchLocalModels, providerId]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    if (scrollFrameRef.current) cancelAnimationFrame(scrollFrameRef.current);
    scrollFrameRef.current = requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
      scrollFrameRef.current = null;
    });
    return () => {
      if (scrollFrameRef.current) cancelAnimationFrame(scrollFrameRef.current);
    };
  }, [messages]);

  useEffect(() => () => {
    if (scrollFrameRef.current) cancelAnimationFrame(scrollFrameRef.current);
  }, []);

  const buildApiMessages = useCallback((history, userQuestion, attachment = null, isFreeMode = false) => {
    const apiMsgs = [];
    if (!isFreeMode) {
      const datasetCtx = buildDatasetContext(columns, fullData, selectedRowIndices, allColumns);
      const systemContent = `${SYSTEM_PROMPT}\n\n--- CURRENT DATASET CONTEXT ---\n${datasetCtx}\n\nUse the current selection by default. If the user explicitly names a column or row, apply the requested action to that explicit target in the active dataset. Do not refuse a valid Data Explorer operation merely because the target is outside the current visual selection.`;
      apiMsgs.push({ role: 'system', content: systemContent });
    }
    history.forEach((m) => {
      if (m.role === 'user' || m.role === 'assistant') {
        apiMsgs.push({ role: m.role, content: m.content });
      }
    });
    const userContent = attachment?.dataUrl
      ? [
        { type: 'text', text: userQuestion },
        { type: 'image_url', image_url: { url: attachment.dataUrl } }
      ]
      : userQuestion;
    apiMsgs.push({ role: 'user', content: userContent });
    return apiMsgs;
  }, [allColumns, columns, fullData, selectedRowIndices]);

  const buildSubscriptionPrompt = useCallback((apiMessages) => (
    apiMessages.map((message) => {
      const content = getMessageText(message.content);
      return `${String(message.role || 'user').toUpperCase()}:\n${content}`;
    }).join('\n\n')
  ), []);

  const handleImageSelection = useCallback((event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!String(file.type || '').startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError('The image is too large. Please choose an image smaller than 12 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl.startsWith('data:image/')) {
        setError('The image could not be read.');
        return;
      }
      setImageAttachment({ name: file.name, type: file.type, dataUrl });
      setError(null);
    };
    reader.onerror = () => setError('The image could not be read.');
    reader.readAsDataURL(file);
  }, []);

  const handleSend = useCallback(async () => {
    const isFreeMode = chatMode === 'free';
    const q = input.trim() || (imageAttachment ? 'Extract the table from this photo and create a data sheet.' : '');
    if (!q || isStreaming) return;
    const activeSettings = providerSettings[providerId] || {};
    const isSubscriptionProvider = providerId === 'claude' || providerId === 'codex' || providerId === 'opencode' || providerId === 'antigravity';
    const activeOllamaModel = selectedModel || localModels[0] || '';
    const activeModel = providerId === 'ollama'
      ? activeOllamaModel
      : providerId === 'codex'
        ? codexModel
        : providerId === 'claude'
          ? 'Claude subscription'
          : providerId === 'opencode'
            ? openCodeModel
            : providerId === 'antigravity'
              ? antigravityModel
        : activeSettings.model;
    if (!activeModel) {
      setError('Please select a model first (open the AI provider menu).');
      return;
    }
    if (!isSubscriptionProvider && providerId !== 'ollama' && !String(activeSettings.apiKey || '').trim()) {
      setError(`Add your ${providerDefinitions[providerId]?.label || 'provider'} API key before sending.`);
      return;
    }
    if (providerId === 'claude' && !claudeCodeAuthStatus.loggedIn) {
      setError('Sign in with your Claude subscription in the Claude Code provider panel first.');
      return;
    }
    if (providerId === 'codex' && !codexAuthStatus.loggedIn) {
      setError('Sign in with your ChatGPT subscription in the Codex provider panel first.');
      return;
    }
    if (providerId === 'opencode' && !openCodeAuthStatus.connected) {
      setError('Sign in with OpenCode first, then refresh its models in the OpenCode provider panel.');
      return;
    }
    if (providerId === 'antigravity' && !antigravityAuthStatus.connected) {
      setError('Sign in with the Antigravity desktop app first, then refresh its models.');
      return;
    }
    if (isSubscriptionProvider && imageAttachment) {
      setError('Photo attachments currently require Ollama or an API provider.');
      return;
    }
    if (providerId === 'ollama' && ollamaMode === 'cloud' && !ollamaCloudApiKey.trim()) {
      setError('Add your Ollama cloud access token before sending.');
      return;
    }
    if (providerId === 'ollama' && ollamaMode === 'cloud' && !ollamaCloudUrl.trim()) {
      setError('Enter your Ollama cloud endpoint before sending.');
      return;
    }

    setError(null);
    const attachmentForRequest = imageAttachment;
    const userMsg = {
      id: nextId(),
      role: 'user',
      content: q,
      createdAt: Date.now(),
      imageName: attachmentForRequest?.name || '',
      imageDataUrl: attachmentForRequest?.dataUrl || ''
    };
    const assistantMsg = { id: nextId(), role: 'assistant', content: '', actions: [], createdAt: Date.now() };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setImageAttachment(null);
    setIsStreaming(true);

    const activeUrl = providerId === 'ollama'
      ? normalizeOllamaApiUrl(ollamaMode === 'cloud' ? ollamaCloudUrl : defaultOllamaUrl)
      : providerId === 'anthropic'
        ? normalizeAnthropicMessagesUrl(activeSettings.host)
      : providerId === 'claude' || providerId === 'codex' || providerId === 'opencode' || providerId === 'antigravity'
          ? ''
          : normalizeOpenAIChatUrl(activeSettings.host);
    const activeKey = providerId === 'ollama' ? ollamaCloudApiKey : activeSettings.apiKey;
    const apiMessages = buildApiMessages([...messages, userMsg], q, attachmentForRequest, isFreeMode);
    const subscriptionPrompt = buildSubscriptionPrompt(apiMessages);
    const controller = new AbortController();
    abortRef.current = controller;
    let typingTimer = null;
    let pendingStreamText = '';
    let displayedStreamText = '';
    let removeProviderStream = null;
    const flushAssistantText = () => {
      typingTimer = null;
      if (displayedStreamText === pendingStreamText) return;
      const remaining = pendingStreamText.length - displayedStreamText.length;
      const nextLength = displayedStreamText.length + Math.max(1, Math.min(4, Math.ceil(remaining / 4)));
      displayedStreamText = pendingStreamText.slice(0, nextLength);
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === 'assistant') next[next.length - 1] = { ...last, content: displayedStreamText };
        return next;
      });
      typingTimer = setTimeout(flushAssistantText, 18);
    };
    const queueAssistantText = (text) => {
      pendingStreamText = String(text || '');
      if (!typingTimer) flushAssistantText();
    };
    const drainAssistantText = () => new Promise((resolve) => {
      const check = () => {
        if (!typingTimer && displayedStreamText === pendingStreamText) {
          resolve();
          return;
        }
        setTimeout(check, 20);
      };
      check();
    });

    if (isSubscriptionProvider) {
      let providerStreamText = '';
      const onProviderChunk = (chunk = {}) => {
        const incomingText = String(chunk?.text || '');
        if (!incomingText) return;
        if (providerId === 'opencode' && incomingText.startsWith(providerStreamText)) {
          providerStreamText = incomingText;
        } else {
          providerStreamText += incomingText;
        }
        queueAssistantText(providerStreamText);
      };
      const subscribe = providerId === 'claude'
        ? window.electronAPI?.onClaudeResponseChunk
        : providerId === 'codex'
          ? window.electronAPI?.onCodexResponseChunk
          : providerId === 'opencode'
            ? window.electronAPI?.onOpenCodeResponseChunk
            : window.electronAPI?.onAntigravityResponseChunk;
      removeProviderStream = subscribe?.(onProviderChunk) || null;
    }

    try {
      let fullText = '';
      if (providerId === 'claude' || providerId === 'codex' || providerId === 'opencode' || providerId === 'antigravity') {
        const result = providerId === 'claude'
          ? await window.electronAPI?.claudeCodeChatRequest?.({ prompt: subscriptionPrompt })
          : providerId === 'codex'
            ? await window.electronAPI?.codexChatRequest?.({ mode: 'data-agent', model: codexModel, reasoningEffort: codexReasoningEffort, prompt: subscriptionPrompt })
            : providerId === 'opencode'
              ? await window.electronAPI?.openCodeChatRequest?.({ model: openCodeModel, prompt: subscriptionPrompt })
              : await window.electronAPI?.antigravityChatRequest?.({ model: antigravityModel, effort: antigravityEffort, prompt: subscriptionPrompt });
        if (!result?.success) throw new Error(result?.error || `${providerId} subscription request failed.`);
        fullText = String(result.text || '');
        queueAssistantText(fullText);
      } else if (providerId === 'ollama' && ollamaMode === 'local' && window.electronAPI?.requestAIAgent) {
        const result = await window.electronAPI.requestAIAgent({
          url: activeUrl,
          model: activeModel,
          messages: apiMessages
        });
        if (!result?.success) throw new Error(result?.error || 'Local AI request failed.');
        fullText = String(result.text || '');
        queueAssistantText(fullText);
      } else {
        const headers = { 'Content-Type': 'application/json' };
        if (providerId === 'anthropic') {
          headers['x-api-key'] = activeKey;
          headers['anthropic-version'] = '2023-06-01';
          headers['anthropic-dangerous-direct-browser-access'] = 'true';
        } else if (activeKey) {
          headers.Authorization = `Bearer ${activeKey}`;
        }
        if (providerId === 'openrouter') {
          headers['HTTP-Referer'] = 'http://localhost';
          headers['X-Title'] = 'Data Explorer AI Agent';
        }
        const body = providerId === 'anthropic'
          ? buildAnthropicRequestBody(activeModel, apiMessages)
          : providerId === 'ollama'
            ? buildRequestBody(activeModel, apiMessages, activeUrl)
            : JSON.stringify({ model: activeModel, messages: apiMessages, stream: true });
        const res = await fetch(activeUrl, { method: 'POST', headers, body, signal: controller.signal });
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(`HTTP ${res.status}: ${errText || res.statusText}`);
        }
        if (!res.body) throw new Error('Local AI returned an empty response stream.');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split('\n')) {
            const cleaned = line.startsWith('data: ') ? line.slice(6) : line;
            if (!cleaned.trim() || cleaned === '[DONE]') continue;
            const token = parseOllamaChunk(cleaned);
            if (token) {
              fullText += token;
              queueAssistantText(fullText);
            }
          }
        }
      }

      queueAssistantText(fullText);
      await drainAssistantText();
      let parsedActions = parseActions(fullText);
      const hasDataCreationAction = parsedActions.some((action) => (
        action?.action === 'create_dataset' || action?.action === 'add_row'
      ));
      if (!hasDataCreationAction && isEmptyDataset(fullData) && isDatasetGenerationRequest(q)) {
        const fallbackAction = buildFallbackDatasetAction(q, Array.isArray(columns) ? columns : []);
        parsedActions = [fallbackAction];
        const fallbackApplied = await onCreateDataset?.(fallbackAction);
        if (fallbackApplied !== false) {
          directlyAppliedActionKeysRef.current.add(`${assistantMsg.id}::0`);
        }
      }
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === 'assistant') next[next.length - 1] = { ...last, content: fullText, actions: parsedActions };
        return next;
      });
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(`Agent error: ${providerId === 'ollama' ? formatLocalConnectionError(err) : err.message}`);
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === 'assistant') next[next.length - 1] = { ...last, content: `Error: ${err.message}`, role: 'system' };
        return next;
      });
    } finally {
      if (typingTimer) clearTimeout(typingTimer);
      removeProviderStream?.();
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [antigravityAuthStatus.connected, antigravityEffort, antigravityModel, buildApiMessages, buildSubscriptionPrompt, chatMode, claudeCodeAuthStatus.loggedIn, codexAuthStatus.loggedIn, codexModel, codexReasoningEffort, columns, defaultOllamaUrl, fullData, imageAttachment, input, isStreaming, localModels, messages, ollamaCloudApiKey, ollamaCloudUrl, ollamaMode, onCreateDataset, openCodeAuthStatus.connected, openCodeModel, providerId, providerSettings, selectedModel]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (providerId === 'claude') window.electronAPI?.claudeCodeCancelRequest?.().catch?.(() => { });
    if (providerId === 'codex') window.electronAPI?.codexCancelRequest?.().catch?.(() => { });
    if (providerId === 'opencode') window.electronAPI?.openCodeCancelRequest?.().catch?.(() => { });
    if (providerId === 'antigravity') window.electronAPI?.antigravityCancelRequest?.().catch?.(() => { });
    setIsStreaming(false);
  }, [providerId]);

  const handleClear = useCallback(() => {
    setMessages([]); setAppliedActions({}); setDismissedActions({}); setError(null);
    setImageAttachment(null);
    autoAppliedActionKeysRef.current.clear();
    directlyAppliedActionKeysRef.current.clear();
  }, []);

  useEffect(() => {
    if (clearRef) clearRef.current = handleClear;
  }, [clearRef, handleClear]);

  const handleApplyAction = useCallback(async (action, actionKey) => {
    try {
      let result;
      switch (action.action) {
        case 'add_column': result = await onAddColumn?.(action.name, action.value ?? ''); break;
        case 'delete_column': result = await onDeleteColumn?.(action.name); break;
        case 'rename_column': result = await onRenameColumn?.(action.from, action.to); break;
        case 'filter_rows': result = await onFilterRows?.(action.column, action.operator, action.value ?? '', action.value2 ?? ''); break;
        case 'sort_rows': result = await onSortRows?.(action.column, action.direction ?? 'asc'); break;
        case 'fill_missing': result = await onFillMissing?.(
          action.all_columns === true || (Array.isArray(action.columns) && action.columns.includes('*'))
            ? '*'
            : Array.isArray(action.columns) && action.columns.length > 0 ? action.columns : action.column,
          action.mode ?? 'fill_previous',
          action.value ?? '',
          action.group_column ?? action.groupColumn ?? ''
        ); break;
        case 'replace_value': result = await onReplaceValue?.(action.column, action.find, action.replace); break;
        case 'add_row': result = await onAddRow?.(action.values ?? {}); break;
        case 'delete_rows': result = await onDeleteRows?.({
          rowIndices: action.row_indices ?? action.rowIndices ?? (action.row_index ?? action.rowIndex)
        }); break;
        case 'create_dataset': result = await onCreateDataset?.(action); break;
        case 'edit_cell': result = await onEditCell?.(
          action.row_index ?? action.rowIndex ?? action.row,
          action.column,
          action.value ?? action.new_value ?? action.newValue ?? ''
        ); break;
        case 'set_cell_color': result = await onSetCellColor?.(
          action.color ?? action.background_color ?? action.backgroundColor,
          action
        ); break;
        case 'set_text_color': result = await onSetTextColor?.(
          action.color ?? action.text_color ?? action.textColor,
          action
        ); break;
        case 'format_cells': result = await onFormatCells?.(action, action); break;
        case 'reorder_columns': result = await onReorderColumns?.(
          action.from ?? action.column ?? action.source_column,
          action.to ?? action.target_column ?? action.after
        ); break;
        case 'merge_columns': result = await onMergeColumns?.({
          columnA: action.column_a ?? action.columnA ?? action.first_column,
          columnB: action.column_b ?? action.columnB ?? action.second_column,
          newColumn: action.new_column ?? action.newColumn ?? action.name,
          mode: action.mode ?? 'stack_ab'
        }); break;
        case 'reshape_wide_to_long': result = await onReshapeWideToLong?.({
          idColumn: action.id_column ?? action.idColumn,
          columns: action.columns ?? action.wide_columns ?? action.wideColumns,
          prefix: action.prefix,
          factorColumn: action.factor_column ?? action.factorColumn,
          valueColumn: action.value_column ?? action.valueColumn
        }); break;
        case 'separate_column': result = await onSeparateColumn?.({
          column: action.column ?? action.source_column ?? action.sourceColumn,
          separator: action.separator,
          outputColumns: action.output_columns ?? action.outputColumns,
          outputCount: action.output_count ?? action.outputCount,
          removeOriginal: action.remove_original ?? action.removeOriginal
        }); break;
        case 'group_summarize': result = await onGroupBySummarise?.({
          groupColumns: action.group_columns ?? action.groupColumns ?? action.group_column,
          summaryColumn: action.summary_column ?? action.summaryColumn,
          summaryFunction: action.summary_function ?? action.summaryFunction ?? action.function,
          resultName: action.result_name ?? action.resultName,
          sortDirection: action.sort_direction ?? action.sortDirection,
          outputMode: action.output_mode ?? action.outputMode
        }); break;
        case 'distinct_rows': result = await onDistinctRows?.({
          columns: action.columns,
          keepAll: action.keep_all ?? action.keepAll,
          useSelected: action.use_selected ?? action.useSelected
        }); break;
        case 'rename_group_levels': result = await onRenameGroupLevels?.({
          columnName: action.column ?? action.column_name ?? action.columnName,
          targetLevels: action.levels ?? action.target_levels ?? action.targetLevels,
          replacementLevel: action.replacement ?? action.replacement_level ?? action.replacementLevel
        }); break;
        case 'keep_columns': result = await onKeepColumns?.(action.columns ?? []); break;
        case 'delete_columns': result = await onDeleteColumns?.(action.columns ?? []); break;
        case 'run_pipeline': result = await onApplyDplyrTidyrPipeline?.(action.pipeline ?? ''); break;
        case 'undo': result = await onUndoDataset?.(); break;
        case 'summarize': result = await onShowSummary?.({ mode: 'summary' }); break;
        case 'calculate': result = await onShowSummary?.(action); break;
        default: break;
      }
      if (result === false) return;
      setAppliedActions((prev) => ({ ...prev, [actionKey]: true }));
    } catch (err) {
      setError(`Failed to apply action: ${err.message}`);
    }
  }, [onAddColumn, onDeleteColumn, onRenameColumn, onFilterRows, onSortRows, onFillMissing, onReplaceValue, onAddRow, onDeleteRows, onCreateDataset, onEditCell, onSetCellColor, onSetTextColor, onFormatCells, onReorderColumns, onMergeColumns, onReshapeWideToLong, onSeparateColumn, onGroupBySummarise, onDistinctRows, onRenameGroupLevels, onKeepColumns, onDeleteColumns, onApplyDplyrTidyrPipeline, onUndoDataset, onShowSummary]);

  useEffect(() => {
    const pendingActions = messages.flatMap((message) => (
      (message.actions || []).map((action, index) => ({
        action,
        actionKey: `${message.id}::${index}`
      }))
    )).filter(({ actionKey }) => (
      !autoAppliedActionKeysRef.current.has(actionKey)
      && !directlyAppliedActionKeysRef.current.has(actionKey)
    ));
    if (pendingActions.length === 0) return undefined;

    pendingActions.forEach(({ actionKey }) => autoAppliedActionKeysRef.current.add(actionKey));
    let cancelled = false;
    const applyPendingActions = async () => {
      for (const { action, actionKey } of pendingActions) {
        if (cancelled) return;
        await handleApplyAction(action, actionKey);
      }
    };
    applyPendingActions();
    return () => { cancelled = true; };
  }, [messages, handleApplyAction]);

  const handleDismissAction = useCallback((actionKey) => {
    setDismissedActions((prev) => ({ ...prev, [actionKey]: true }));
  }, []);

  const updateProviderSetting = useCallback((id, field, value) => {
    setProviderSettings((previous) => ({
      ...previous,
      [id]: { ...previous[id], [field]: value }
    }));
    const definition = providerDefinitions[id];
    const storageKey = field === 'host' ? definition?.hostKey : field === 'apiKey' ? definition?.keyKey : definition?.modelKey;
    if (storageKey) {
      try { window.localStorage.setItem(storageKey, String(value || '')); } catch { /* Ignore storage failures. */ }
    }
  }, []);

  const activeProviderDefinition = providerDefinitions[providerId];
  const activeProviderSettings = providerSettings[providerId] || {};
  const activeOllamaModel = selectedModel || localModels[0] || '';
  const activeProviderGroup = providerId === 'ollama'
    ? 'ollama'
    : providerId === 'claude'
      ? 'claude'
        : providerId === 'codex'
          ? 'codex'
          : providerId === 'opencode'
            ? 'opencode'
            : providerId === 'antigravity'
              ? 'antigravity'
        : 'api';
  const activeModelLabel = providerId === 'ollama'
    ? (activeOllamaModel || (isModelsLoading ? 'Detecting model…' : 'Choose model'))
      : providerId === 'claude'
        ? 'Claude subscription'
      : providerId === 'codex'
        ? `${codexModel || 'No model detected'} · ${codexReasoningEffort}`
        : providerId === 'opencode'
          ? openCodeModel || 'No model detected'
          : providerId === 'antigravity'
            ? `${antigravityModel || 'No model detected'} · ${antigravityEffort}`
        : activeProviderSettings.model;
  const activeProviderLabel = providerId === 'ollama'
    ? 'Ollama'
    : providerId === 'claude'
      ? 'Claude Code'
      : providerId === 'codex'
        ? 'Codex'
        : providerId === 'opencode'
          ? 'OpenCode'
          : providerId === 'antigravity'
            ? 'Antigravity'
        : activeProviderDefinition?.label || 'API';
  const activeModelList = providerId === 'ollama'
    ? localModels
    : providerId === 'opencode'
      ? openCodeModels
      : providerId === 'antigravity'
        ? antigravityModels
    : (detectedProviderModels[providerId]?.length > 0
      ? detectedProviderModels[providerId]
      : (activeProviderDefinition?.models || []));
  const filteredModelList = modelFilterQuery.trim()
    ? activeModelList.filter((model) => String(model).toLowerCase().includes(modelFilterQuery.trim().toLowerCase()))
    : activeModelList;
  const modelListHeight = Math.min(240, Math.max(48, filteredModelList.length * 28));
  const hasLongModelList = filteredModelList.length > 8;
  const modelListStyle = hasLongModelList
    ? { height: `${modelListHeight}px` }
    : { height: 'auto', overflowY: 'visible' };

  const selectProvider = (nextProviderId) => {
    setProviderId(nextProviderId);
    setModelFilterQuery('');
  };

  const selectOllamaModel = (nextModel) => {
    setSelectedModel(nextModel);
    try { window.localStorage.setItem(OLLAMA_MODEL_STORAGE_KEY, nextModel); } catch { /* Ignore storage failures. */ }
  };

  const selectCodexModel = (nextModel) => {
    setCodexModel(nextModel);
    try { window.localStorage.setItem(CODEX_MODEL_STORAGE_KEY, nextModel); } catch { /* Ignore storage failures. */ }
  };

  const selectCodexReasoningEffort = (nextEffort) => {
    setCodexReasoningEffort(nextEffort);
    try { window.localStorage.setItem(CODEX_REASONING_EFFORT_STORAGE_KEY, nextEffort); } catch { /* Ignore storage failures. */ }
  };

  const selectOpenCodeModel = (nextModel) => {
    setOpenCodeModel(nextModel);
    try { window.localStorage.setItem(OPENCODE_MODEL_STORAGE_KEY, nextModel); } catch { /* Ignore storage failures. */ }
  };

  const selectAntigravityModel = (nextModel) => {
    setAntigravityModel(nextModel);
    try { window.localStorage.setItem(ANTIGRAVITY_MODEL_STORAGE_KEY, nextModel); } catch { /* Ignore storage failures. */ }
  };

  const selectAntigravityEffort = (nextEffort) => {
    setAntigravityEffort(nextEffort);
    try { window.localStorage.setItem(ANTIGRAVITY_EFFORT_STORAGE_KEY, nextEffort); } catch { /* Ignore storage failures. */ }
  };

  const selectProviderGroup = (group) => {
    const nextProviderId = group === 'ollama'
      ? 'ollama'
      : group === 'claude'
        ? 'claude'
      : group === 'codex'
          ? 'codex'
          : group === 'opencode'
            ? 'opencode'
            : group === 'antigravity'
              ? 'antigravity'
          : (apiProviderIds.includes(providerId) ? providerId : 'openai');
    selectProvider(nextProviderId);
    setConfigOpen(true);
  };

  const suggestions = useMemo(() => {
    const base = [
      'Create a summary table for the dataset',
      'Calculate the total of the first column',
      'Show the total for each row',
      'Show missing values in each column'
    ];
    if (columns?.length > 0) {
      base.push(`Fill missing values in "${columns[0]}"`);
      if (columns.length > 1) base.push(`Delete column "${columns[columns.length - 1]}"`);
    }
    return base.slice(0, 4);
  }, [columns]);

  const themeClass = isRTheme ? 'r-theme' : isAyuTheme ? 'ayu-theme' : 'std-theme';

  return (
    <div className={`de-ai-agent ${themeClass} ${floating ? 'de-ai-agent-floating' : ''}`} style={{ position: 'relative' }}>

      {/* Provider config dropdown – anchored to top of panel */}
      {configOpen && (
        <div className="de-ai-provider-panel absolute inset-x-0 top-0 bottom-0 z-[90] flex h-full w-full max-h-none flex-col overflow-hidden border-b border-zinc-700/80 bg-[#161616] shadow-2xl">
          <div className="de-ai-source-bar">
            <div className="de-ai-src-toggle" role="tablist" aria-label="AI Assistant source">
              {PROVIDER_GROUPS.map(({ id, label }) => {
                const isActive = activeProviderGroup === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => selectProviderGroup(id)}
                    title={label}
                    className={`de-ai-src-btn ${isActive ? 'active' : ''}`}
                  >
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* API Provider Sub-Tabs when API group is active */}
          {activeProviderGroup === 'api' && (
            <div className="flex items-center gap-1 border-b border-zinc-800/90 bg-[#121212] px-2.5 py-1.5 overflow-x-auto custom-scrollbar shrink-0">
              {API_SUB_PROVIDERS.map(({ id, label }) => {
                const isSelected = providerId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => selectProvider(id)}
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'border border-zinc-600 bg-zinc-800 text-zinc-100 shadow-sm'
                        : 'border border-transparent text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
                    }`}
                  >
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="min-h-0 flex-1 space-y-2.5 overflow-visible p-3">
              {providerId === 'ollama' ? (
                <>
                  <div className="flex gap-1.5">
                    {['local', 'cloud'].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setOllamaMode(mode)}
                        className={`flex-1 rounded-md py-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] transition-colors ${ollamaMode === mode
                          ? 'border border-zinc-600 bg-zinc-700 text-zinc-100 shadow-sm'
                          : 'border border-zinc-800 text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'}`}
                      >
                        {mode === 'local' ? 'Local Server' : 'Cloud Server'}
                      </button>
                    ))}
                  </div>
                  {ollamaMode === 'cloud' && (
                    <div className="space-y-2.5">
                      <input
                        type="text"
                        value={ollamaCloudUrl}
                        onChange={(event) => {
                          setOllamaCloudUrl(event.target.value);
                          try { window.localStorage.setItem(OLLAMA_CLOUD_URL_STORAGE_KEY, event.target.value); } catch { /* Ignore storage failures. */ }
                        }}
                        placeholder="Cloud URL (e.g. https://api...)"
                        className="w-full rounded-md border border-zinc-700/80 bg-zinc-900 px-2.5 py-1.5 text-[11px] font-mono text-zinc-200 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
                      />
                      <input
                        type="password"
                        value={ollamaCloudApiKey}
                        onChange={(event) => {
                          setOllamaCloudApiKey(event.target.value);
                          try { window.localStorage.setItem(OLLAMA_CLOUD_API_KEY_STORAGE_KEY, event.target.value); } catch { /* Ignore storage failures. */ }
                        }}
                        placeholder="Access token"
                        className="w-full rounded-md border border-zinc-700/80 bg-zinc-900 px-2.5 py-1.5 text-[11px] font-mono text-zinc-200 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={isModelsLoading}
                    onClick={fetchLocalModels}
                    className="flex w-full items-center justify-center gap-2 rounded-md border border-zinc-700/80 bg-zinc-800 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-zinc-200 shadow-sm transition-all hover:bg-zinc-700"
                  >
                    {isModelsLoading ? 'Detecting Models...' : 'Detect Models from Host'}
                  </button>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">{ollamaMode === 'cloud' ? 'Cloud Models' : 'Local Models'}</span>
                      <span className="text-[10px] font-mono text-zinc-400">{isModelsLoading ? 'Loading…' : `${filteredModelList.length} shown`}</span>
                    </div>
                    {activeModelList.length > 5 && (
                      <div className="relative mb-2">
                        <input value={modelFilterQuery} onChange={(event) => setModelFilterQuery(event.target.value)} placeholder="Filter Ollama models..." className="w-full rounded-md border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-[10px] font-mono text-zinc-200 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none" />
                      </div>
                    )}
                    <div className="space-y-0.5 overflow-y-auto pr-0.5 custom-scrollbar" style={modelListStyle}>
                      {filteredModelList.length > 0 ? filteredModelList.map((model) => (
                        <button key={model} type="button" onClick={() => selectOllamaModel(model)} className={`flex w-full items-center justify-between rounded-md border px-3 py-1.5 text-left text-[10px] font-mono tracking-tight transition-colors ${selectedModel === model ? 'border-zinc-600 bg-zinc-800 font-semibold text-zinc-100' : 'border-transparent text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'}`}>
                          <span className="truncate">{model}</span>
                          {selectedModel === model && <span className="ml-1.5 shrink-0 text-zinc-300">Selected</span>}
                        </button>
                      )) : <div className="rounded-lg border border-dashed border-zinc-800 px-3 py-4 text-center text-xs font-medium text-zinc-500">{isModelsLoading ? 'Fetching…' : 'No local models found'}</div>}
                    </div>
                    <div className="mt-3">
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-300">Custom Model</span>
                      <input value={selectedModel} onChange={(event) => selectOllamaModel(event.target.value)} placeholder="e.g. qwen2.5:7b" className="w-full rounded-md border border-zinc-700/80 bg-zinc-900 px-3 py-1.5 text-[10px] font-mono text-zinc-200 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none" />
                    </div>
                  </div>
                </>
              ) : providerId === 'claude' ? (
                <>
                  <div className="rounded-lg border border-zinc-700 bg-zinc-800/60 p-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-200">Claude subscription</div>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${claudeCodeAuthStatus.loggedIn ? 'border-emerald-800/70 bg-emerald-950/40 text-emerald-300' : 'border-zinc-700 bg-zinc-900 text-zinc-400'}`}>
                        {claudeCodeAuthStatus.loading ? 'Checking…' : claudeCodeAuthStatus.loggedIn ? 'Connected' : 'Not connected'}
                      </span>
                    </div>
                    <div className="mt-2.5 flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!claudeCodeAuthStatus.loggedIn) {
                            const result = await window.electronAPI?.claudeCodeLogin?.();
                            setClaudeCodeAuthStatus((previous) => ({ ...previous, message: result?.error || 'Finish sign-in in your browser, then click Check.' }));
                          } else {
                            const status = await window.electronAPI?.claudeCodeAuthStatus?.();
                            if (status) setClaudeCodeAuthStatus({ loading: false, ...status });
                          }
                        }}
                        className="flex-1 rounded-md border border-zinc-700/80 bg-zinc-800 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-zinc-200 transition-colors hover:bg-zinc-700"
                      >
                        {claudeCodeAuthStatus.loggedIn ? 'Refresh Status' : 'Sign in with Claude'}
                      </button>
                      {!claudeCodeAuthStatus.loggedIn && (
                        <button type="button" onClick={async () => { const status = await window.electronAPI?.claudeCodeAuthStatus?.(); if (status) setClaudeCodeAuthStatus({ loading: false, ...status }); }} className="rounded-md border border-zinc-800 px-3 py-2 text-[10px] font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">Check</button>
                      )}
                    </div>
                    {claudeCodeAuthStatus.loggedIn && (
                      <button type="button" onClick={async () => { const result = await window.electronAPI?.claudeCodeLogout?.(); if (result?.success) setClaudeCodeAuthStatus({ loading: false, loggedIn: false, subscription: false, message: 'Signed out. Sign in with another Claude subscription.' }); }} className="mt-2 w-full rounded-md border border-zinc-800 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200">Log out / Change account</button>
                    )}
                  </div>
                </>
              ) : providerId === 'codex' ? (
                <>
                  <div className="rounded-lg border border-zinc-700 bg-zinc-800/60 p-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-200">ChatGPT subscription</div>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${codexAuthStatus.loggedIn ? 'border-emerald-800/70 bg-emerald-950/40 text-emerald-300' : 'border-zinc-700 bg-zinc-900 text-zinc-400'}`}>
                        {codexAuthStatus.loading ? 'Checking…' : codexAuthStatus.loggedIn ? 'Connected' : 'Not connected'}
                      </span>
                    </div>
                    <div className="mt-2.5 flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!codexAuthStatus.loggedIn) {
                            const result = await window.electronAPI?.codexLogin?.();
                            setCodexAuthStatus((previous) => ({ ...previous, message: result?.error || 'Finish sign-in in your browser, then click Check.' }));
                          } else {
                            const status = await window.electronAPI?.codexAuthStatus?.();
                            if (status) {
                              setCodexAuthStatus({ loading: false, ...status });
                              if (status.loggedIn) await loadCodexModels();
                            }
                          }
                        }}
                        className="flex-1 rounded-md border border-zinc-700/80 bg-zinc-800 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-zinc-200 transition-colors hover:bg-zinc-700"
                      >
                        {codexAuthStatus.loggedIn ? 'Refresh Status' : 'Sign in with ChatGPT'}
                      </button>
                      {!codexAuthStatus.loggedIn && (
                        <button type="button" onClick={async () => { const status = await window.electronAPI?.codexAuthStatus?.(); if (status) { setCodexAuthStatus({ loading: false, ...status }); if (status.loggedIn) await loadCodexModels(); } }} className="rounded-md border border-zinc-800 px-3 py-2 text-[10px] font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">Check</button>
                      )}
                    </div>
                    {codexAuthStatus.loggedIn && (
                      <button type="button" onClick={async () => { const result = await window.electronAPI?.codexLogout?.(); if (result?.success) { setCodexAuthStatus({ loading: false, loggedIn: false, message: 'Signed out. Sign in with another ChatGPT account.' }); setCodexModels([]); setCodexModel(''); setCodexModelsError(''); try { window.localStorage.removeItem(CODEX_MODEL_STORAGE_KEY); } catch { /* Ignore storage failures. */ } } }} className="mt-2 w-full rounded-md border border-zinc-800 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200">Log out / Change account</button>
                    )}
                  </div>
                  <div className="mt-2.5">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-300">Codex models</span>
                        <button type="button" onClick={loadCodexModels} disabled={codexModelsLoading || !codexAuthStatus.loggedIn} className="text-[10px] font-semibold uppercase tracking-[0.06em] text-zinc-400 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50">
                          {codexModelsLoading ? 'Detecting…' : 'Refresh'}
                        </button>
                      </div>
                      <div className="space-y-0.5 overflow-y-auto pr-0.5 custom-scrollbar" style={modelListStyle}>
                        {codexModels.length > 0 ? codexModels.map((model) => (
                          <button key={model} type="button" onClick={() => selectCodexModel(model)} className={`flex w-full items-center justify-between rounded-md border px-3 py-1.5 text-left text-[10px] font-mono tracking-tight transition-colors ${codexModel === model ? 'border-zinc-600 bg-zinc-800 font-semibold text-zinc-100' : 'border-transparent text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'}`}>
                            <span className="truncate">{model}</span>
                            {codexModel === model && <span className="ml-1.5 shrink-0 text-zinc-300">Selected</span>}
                          </button>
                        )) : <div className="rounded-md border border-dashed border-zinc-800 px-3 py-3 text-center text-[10px] font-medium text-zinc-500">{codexModelsError || 'No models detected'}</div>}
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-300">Reasoning effort</div>
                      <div className="flex gap-1.5" role="group" aria-label="Codex reasoning effort">
                        {['low', 'medium', 'high'].map((effort) => (
                          <button
                            key={effort}
                            type="button"
                            onClick={() => selectCodexReasoningEffort(effort)}
                            className={`flex-1 rounded-md border px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] transition-colors ${codexReasoningEffort === effort
                              ? 'border-zinc-600 bg-zinc-700 text-zinc-100 shadow-sm'
                              : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'}`}
                          >
                            {effort}
                          </button>
                        ))}
                      </div>
                    </div>
                </>
              ) : providerId === 'opencode' ? (
                <>
                  <div className="rounded-lg border border-zinc-700 bg-zinc-800/60 p-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-200">OpenCode account</div>
                        <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">Uses the authenticated OpenCode CLI session. No API key is required here.</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${openCodeAuthStatus.connected ? 'border-emerald-800/70 bg-emerald-950/40 text-emerald-300' : 'border-zinc-700 bg-zinc-900 text-zinc-400'}`}>
                        {openCodeAuthStatus.loading ? 'Checking…' : openCodeAuthStatus.connected ? 'Connected' : 'Not connected'}
                      </span>
                    </div>
                    <div className="mt-2.5 flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const status = await window.electronAPI?.getOpenCodeAuthStatus?.();
                          const nextStatus = { loading: false, connected: Boolean(status?.connected), error: status?.error || '' };
                          setOpenCodeAuthStatus(nextStatus);
                          if (nextStatus.connected) await loadOpenCodeModels();
                        }}
                        className="flex-1 rounded-md border border-zinc-700/80 bg-zinc-800 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-zinc-200 transition-colors hover:bg-zinc-700"
                      >
                        Refresh Status
                      </button>
                      <button type="button" onClick={loadOpenCodeModels} disabled={openCodeModelsLoading} className="rounded-md border border-zinc-800 px-3 py-2 text-[10px] font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50">
                        {openCodeModelsLoading ? 'Loading…' : 'Models'}
                      </button>
                    </div>
                    {!openCodeAuthStatus.connected && (openCodeAuthStatus.error || !openCodeAuthStatus.loading) && (
                      <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">Run <span className="font-mono text-zinc-300">opencode auth login</span> from Advanced Mode, then refresh this panel.</p>
                    )}
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">OpenCode models</span>
                      <span className="text-[10px] font-mono text-zinc-400">{filteredModelList.length} shown</span>
                    </div>
                    <div className="relative mb-2"><input value={modelFilterQuery} onChange={(event) => setModelFilterQuery(event.target.value)} placeholder="Filter OpenCode models..." className="w-full rounded-md border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-[10px] font-mono text-zinc-200 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none" /></div>
                    <div className="space-y-0.5 overflow-y-auto pr-0.5 custom-scrollbar" style={modelListStyle}>
                      {filteredModelList.length > 0 ? filteredModelList.map((model) => (
                        <button key={model} type="button" onClick={() => selectOpenCodeModel(model)} className={`flex w-full items-center justify-between rounded-md border px-3 py-1.5 text-left text-[10px] font-mono tracking-tight transition-colors ${openCodeModel === model ? 'border-zinc-600 bg-zinc-800 font-semibold text-zinc-100' : 'border-transparent text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'}`}>
                          <span className="truncate">{model}</span>{openCodeModel === model && <span className="ml-1.5 shrink-0 text-zinc-300">Selected</span>}
                        </button>
                      )) : <div className="rounded-md border border-dashed border-zinc-800 px-3 py-3 text-center text-[10px] font-medium text-zinc-500">{openCodeModelsError || 'No models detected'}</div>}
                    </div>
                    <div className="mt-2.5"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-300">Active Model ID</span><input value={openCodeModel} onChange={(event) => selectOpenCodeModel(event.target.value)} placeholder={OPENCODE_DEFAULT_MODEL} className="w-full rounded-md border border-zinc-700/80 bg-zinc-900 px-2.5 py-1.5 text-[11px] font-mono text-zinc-200 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none" /></div>
                  </div>
                </>
              ) : providerId === 'antigravity' ? (
                <>
                  <div className="rounded-lg border border-zinc-700 bg-zinc-800/60 p-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-200">Antigravity desktop account</div>
                        <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">Uses the account signed in through the Antigravity desktop app. No API key is required.</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${antigravityAuthStatus.connected ? 'border-emerald-800/70 bg-emerald-950/40 text-emerald-300' : 'border-zinc-700 bg-zinc-900 text-zinc-400'}`}>
                        {antigravityAuthStatus.loading ? 'Checking…' : antigravityAuthStatus.connected ? 'Connected' : 'Not connected'}
                      </span>
                    </div>
                    <div className="mt-2.5 flex gap-2">
                      <button type="button" onClick={async () => { const result = await window.electronAPI?.antigravityLogin?.(); setAntigravityAuthStatus((previous) => ({ ...previous, message: result?.success ? 'Finish sign-in, then refresh models.' : (result?.error || 'Could not start Antigravity sign-in.') })); }} className="flex-1 rounded-md border border-zinc-700/80 bg-zinc-800 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-zinc-200 transition-colors hover:bg-zinc-700">{antigravityAuthStatus.connected ? 'Sign in another account' : 'Sign in with Antigravity'}</button>
                      <button type="button" onClick={loadAntigravityModels} disabled={antigravityModelsLoading} className="rounded-md border border-zinc-800 px-3 py-2 text-[10px] font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50">{antigravityModelsLoading ? 'Loading…' : 'Refresh'}</button>
                    </div>
                    {antigravityAuthStatus.connected && <button type="button" onClick={async () => { const result = await window.electronAPI?.antigravityLogout?.(); if (result?.success) { setAntigravityAuthStatus({ loading: false, connected: false, message: 'Signed out of Antigravity.' }); setAntigravityModels([]); setAntigravityModel(''); } }} className="mt-2 w-full rounded-md border border-zinc-800 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200">Log out / Change account</button>}
                    {antigravityAuthStatus.message && !antigravityAuthStatus.connected && <p className="mt-2 text-[10px] leading-relaxed text-rose-300">{antigravityAuthStatus.message}</p>}
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">Antigravity models</span><span className="text-[10px] font-mono text-zinc-400">{filteredModelList.length} shown</span></div>
                    <div className="relative mb-2"><input value={modelFilterQuery} onChange={(event) => setModelFilterQuery(event.target.value)} placeholder="Filter Antigravity models..." className="w-full rounded-md border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-[10px] font-mono text-zinc-200 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none" /></div>
                    <div className="space-y-0.5 overflow-y-auto pr-0.5 custom-scrollbar" style={modelListStyle}>
                      {filteredModelList.length > 0 ? filteredModelList.map((model) => (
                        <button key={model} type="button" onClick={() => selectAntigravityModel(model)} className={`flex w-full items-center justify-between rounded-md border px-3 py-1.5 text-left text-[10px] font-mono tracking-tight transition-colors ${antigravityModel === model ? 'border-zinc-600 bg-zinc-800 font-semibold text-zinc-100' : 'border-transparent text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'}`}>
                          <span className="truncate">{model}</span>{antigravityModel === model && <span className="ml-1.5 shrink-0 text-zinc-300">Selected</span>}
                        </button>
                      )) : <div className="rounded-md border border-dashed border-zinc-800 px-3 py-3 text-center text-[10px] font-medium text-zinc-500">{antigravityModelsError || 'No models detected'}</div>}
                    </div>
                    <div className="mt-2.5"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-300">Active Model ID</span><input value={antigravityModel} onChange={(event) => selectAntigravityModel(event.target.value)} placeholder="Choose a detected model" className="w-full rounded-md border border-zinc-700/80 bg-zinc-900 px-2.5 py-1.5 text-[11px] font-mono text-zinc-200 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none" /></div>
                  </div>
                  <div>
                    <div className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-300">Execution effort</div>
                    <div className="flex gap-1.5" role="group" aria-label="Antigravity execution effort">
                      {['low', 'medium', 'high'].map((effort) => <button key={effort} type="button" onClick={() => selectAntigravityEffort(effort)} className={`flex-1 rounded-md border px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] transition-colors ${antigravityEffort === effort ? 'border-zinc-600 bg-zinc-700 text-zinc-100 shadow-sm' : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'}`}>{effort}</button>)}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">Host / Endpoint</span></div>
                    <input value={activeProviderSettings.host || ''} onChange={(event) => updateProviderSetting(providerId, 'host', event.target.value)} placeholder={activeProviderDefinition?.defaultHost} className="w-full rounded-md border border-zinc-700/80 bg-zinc-900 px-2.5 py-1.5 text-[11px] font-mono text-zinc-200 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none" />
                  </div>
                  <div>
                    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-300">API Key</span>
                    <input type="password" value={activeProviderSettings.apiKey || ''} onChange={(event) => updateProviderSetting(providerId, 'apiKey', event.target.value)} placeholder={activeProviderDefinition?.keyPlaceholder} className="w-full rounded-md border border-zinc-700/80 bg-zinc-900 px-2.5 py-1.5 text-[11px] font-mono text-zinc-200 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none" />
                  </div>
                  <div>
                    <button
                      type="button"
                      disabled={modelDetectStatus[providerId]?.loading}
                      onClick={() => handleDetectModels(providerId)}
                      className="flex w-full items-center justify-center gap-2 rounded-md border border-zinc-700/80 bg-zinc-800 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-zinc-200 shadow-sm transition-all hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {modelDetectStatus[providerId]?.loading ? 'Actualizing Models...' : 'Actualize Models from Host'}
                    </button>
                    {modelDetectStatus[providerId]?.count > 0 && (
                      <p className="mt-1.5 px-1 text-[11px] font-medium text-zinc-300">{modelDetectStatus[providerId].count} models loaded from host.</p>
                    )}
                    {modelDetectStatus[providerId]?.error && (
                      <p className="mt-1.5 rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-[11px] text-zinc-300">{modelDetectStatus[providerId].error}</p>
                    )}
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">{detectedProviderModels[providerId]?.length ? 'Detected Models' : 'Models (Quick Pick)'}</span><span className="text-[10px] font-mono text-zinc-400">{filteredModelList.length} shown</span></div>
                    <div className="relative mb-2"><input value={modelFilterQuery} onChange={(event) => setModelFilterQuery(event.target.value)} placeholder={`Filter ${activeProviderLabel} models...`} className="w-full rounded-md border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-[10px] font-mono text-zinc-200 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none" /></div>
                    <div className="space-y-0.5 overflow-y-auto pr-0.5 custom-scrollbar" style={modelListStyle}>
                      {filteredModelList.map((model) => (
                        <button key={model} type="button" onClick={() => updateProviderSetting(providerId, 'model', model)} className={`flex w-full items-center justify-between rounded-md border px-3 py-1.5 text-left text-[10px] font-mono tracking-tight transition-colors ${activeProviderSettings.model === model ? 'border-zinc-600 bg-zinc-800 font-semibold text-zinc-100' : 'border-transparent text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'}`}>
                          <span className="truncate pr-1.5">{model}</span>{activeProviderSettings.model === model && <span className="shrink-0 text-zinc-300">Selected</span>}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2.5"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-300">Active Model ID</span><input value={activeProviderSettings.model || ''} onChange={(event) => updateProviderSetting(providerId, 'model', event.target.value)} placeholder={activeProviderDefinition?.defaultModel} className="w-full rounded-md border border-zinc-700/80 bg-zinc-900 px-2.5 py-1.5 text-[11px] font-mono text-zinc-200 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none" /></div>
                  </div>
                </>
              )}
              <button type="button" onClick={() => setConfigOpen(false)} className="w-full rounded-md border border-zinc-700/80 bg-zinc-800 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-zinc-200 transition-colors hover:bg-zinc-700 cursor-pointer">Done</button>
            </div>
          </div>
        )}

      {/* ── Error banner ── */}
      {error && (
        <div
          className="flex items-center gap-2 px-4 py-2 text-[11px] flex-shrink-0"
          style={{ background: 'rgba(220,38,38,0.07)', color: '#f87171', borderBottom: '1px solid rgba(220,38,38,0.15)' }}
        >
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} className="opacity-60 hover:opacity-100">Dismiss</button>
        </div>
      )}

      {/* ── Messages Area – exact Advanced Mode ── */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <div
          ref={scrollRef}
          className="absolute inset-0 overflow-y-auto custom-scrollbar px-3.5 py-4"
          style={{
            background: '#131313',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            overflowAnchor: 'none',
            scrollbarGutter: 'stable',
            scrollBehavior: 'auto'
          }}
        >
          {/* Empty state – opacity-25, centered, single line */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 select-none" style={{ opacity: 0.25 }}>
              <span className="text-[11px] font-medium tracking-wide text-zinc-400">
                {chatMode === 'free'
                  ? 'Chat freely with the AI — no data context sent…'
                  : 'Ask the AI to explore, clean, or transform your data…'
                }
              </span>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="px-2.5 py-1 rounded-lg border border-zinc-700 bg-zinc-800/60 text-[10px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all cursor-pointer"
                    style={{ opacity: 1 }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages rendered with existing MessageBubble (preserves action badges) */}
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={{ ...msg, actions: (msg.actions || []).filter((_, idx) => !dismissedActions[`${msg.id}::${idx}`]) }}
              isRTheme={isRTheme}
              isStreaming={isStreaming && msg.id === messages[messages.length - 1]?.id}
              appliedActions={appliedActions}
              onApplyAction={handleApplyAction}
              onDismissAction={handleDismissAction}
            />
          ))}

          {/* Active thinking indicator when no messages yet */}
          {isStreaming && messages.every((m) => m.role !== 'assistant') && (
            <div className="flex flex-col items-start w-full text-left py-1 mb-2">
              <div className="inline-flex items-center gap-2 text-[12px] text-zinc-400 font-sans">
                <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>Thinking…</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Input Area – exact Advanced Mode ── */}
      <div
        className="border-t px-3.5 py-3 flex-shrink-0"
        style={{ background: '#131313', borderColor: '#222' }}
      >
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelection} />

        {/* Attachment preview */}
        {imageAttachment && (
          <div className="flex flex-wrap gap-1.5 border-b border-zinc-800/60 px-1 pb-2 pt-1 mb-2">
            <div className="inline-flex max-w-[220px] items-center gap-1.5 rounded-lg border border-zinc-700/70 bg-zinc-900/70 px-1.5 py-1 text-[10px] text-zinc-300">
              <img src={imageAttachment.dataUrl} alt="" className="h-7 w-7 rounded object-cover" />
              <span className="truncate">{imageAttachment.name}</span>
              <button
                type="button"
                onClick={() => setImageAttachment(null)}
                className="rounded p-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                title="Remove"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Textarea card – rounded-2xl */}
        <div
          className="relative rounded-2xl overflow-hidden transition-all duration-150"
          style={{ background: '#1c1c1c', border: '1px solid #2e2e2e' }}
          onFocusCapture={(e) => { e.currentTarget.style.borderColor = '#484848'; }}
          onBlurCapture={(e) => { e.currentTarget.style.borderColor = '#2e2e2e'; }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            disabled={isStreaming}
            className="w-full resize-none bg-transparent px-3.5 pt-3 pb-1.5 text-[13px] font-sans outline-none placeholder-zinc-500 text-zinc-100"
            style={{
              background: 'transparent',
              backgroundColor: 'transparent',
              backgroundImage: 'none',
              boxShadow: 'none',
              border: 'none',
              outline: 'none',
              lineHeight: '1.5',
              color: '#f4f4f5'
            }}
            placeholder={
              !activeModelLabel
                ? 'Click the model pill to select a provider & model…'
                : chatMode === 'free'
                ? 'Chat freely with the AI…  (no data context sent)'
                : 'Ask the data assistant to explore or modify your data…'
            }
          />

          {/* Bottom action row */}
          <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-zinc-800/60">
            <div className="min-w-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={isStreaming}
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium text-zinc-400 transition-all hover:bg-zinc-800/80 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
                title="Attach a photo of a table"
              >
                <Paperclip size={11} />
                Attach
              </button>
              <button
                type="button"
                onClick={() => setConfigOpen((prev) => !prev)}
                className="truncate text-[10px] font-medium tracking-wide rounded-md px-2 py-0.5 text-zinc-400 bg-zinc-800/80 border border-zinc-700/50 hover:border-zinc-500 hover:text-zinc-200 transition-all cursor-pointer inline-flex items-center gap-1"
                title={`Provider: ${activeProviderLabel} · Model: ${activeModelLabel || 'None'} — click to change`}
              >
                <span>{activeModelLabel || 'No model'}</span>
                <ChevronDown size={9} className="text-zinc-500 shrink-0" />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={isStreaming ? handleStop : handleSend}
                disabled={!isStreaming && ((!input.trim() && !imageAttachment) || !activeModelLabel)}
                className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[11px] font-semibold transition-all hover:opacity-90 active:scale-95 cursor-pointer"
                style={
                  isStreaming
                    ? { background: '#2a1010', color: '#f87171', border: '1px solid #4a1a1a' }
                    : (!input.trim() && !imageAttachment) || !activeModelLabel
                    ? { background: '#242424', color: '#555', cursor: 'not-allowed', border: '1px solid #2e2e2e' }
                    : { background: '#383838', color: '#f0f0f0', border: '1px solid #484848' }
                }
                title={isStreaming ? 'Stop the current request' : 'Send message (Enter)'}
              >
                {isStreaming
                  ? <><span className="h-1.5 w-1.5 rounded-sm bg-current" /><span>Stop</span></>
                  : <><Send size={11} /><span>Send</span></>
                }
              </button>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        /* ── Root shell ── */
        .de-ai-agent {
          position: relative;
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
          overflow: hidden;
          font-family: Inter, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .floating-tool-window-ai .floating-tool-window-body {
          display: flex;
          min-height: 0;
          padding: 0;
          overflow: hidden;
        }
        .de-ai-agent-floating { width: 100%; min-height: 0; }

        /* ── Provider config panel styles ── */
        .de-ai-agent .de-ai-source-bar {
          display: flex;
          flex: 0 0 auto;
          align-items: center;
          width: 100%;
          min-width: 0;
          padding: 6px 8px;
          border-bottom: 1px solid #252528;
          position: relative;
          z-index: 1;
          background: #161616;
        }
        .de-ai-agent .de-ai-source-label { display: none; }
        .de-ai-agent .de-ai-src-toggle {
          display: flex;
          flex: 1 1 auto;
          flex-wrap: nowrap;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          min-width: 0;
          min-height: 28px;
          overflow: hidden;
          gap: 3px;
          padding: 2.5px;
          border: 1px solid rgba(63,63,70,.8);
          border-radius: 8px;
          background: #141414;
        }
        .de-ai-agent .de-ai-src-btn {
          display: inline-flex;
          flex: 1 1 0;
          min-width: 0;
          align-items: center;
          justify-content: center;
          padding: 3px 4px;
          border-radius: 5px;
          border: 1px solid transparent;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.02em;
          cursor: pointer;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          transition: all .15s ease;
          background: transparent;
          color: #a1a1aa;
        }
        .de-ai-agent .de-ai-src-btn.active {
          border-color: #52525b;
          background: #27272a;
          color: #ffffff;
          box-shadow: 0 1px 3px rgba(0,0,0,.35);
        }
        .de-ai-agent .de-ai-src-btn:hover {
          background: #202024;
          color: #f4f4f5;
        }
        .de-ai-agent .de-ai-provider-panel { animation: de-ai-provider-slide-down .15s ease-out; }
        @keyframes de-ai-provider-slide-down {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── MessageBubble Advanced Mode overrides ── */
        /* User message – right-aligned pill */
        .de-ai-agent .ai-agent-message {
          width: 100%;
          animation: none;
          display: flex;
          gap: 0;
        }
        .de-ai-agent .ai-agent-message.user { justify-content: flex-end; margin: 0 0 3px; }
        .de-ai-agent .ai-agent-message.assistant { flex-direction: column; margin-bottom: 4px; }
        .de-ai-agent .ai-agent-avatar { display: none; }

        /* User bubble */
        .de-ai-agent .ai-agent-message.user .ai-agent-bubble {
          max-width: 85%;
          border-radius: 16px;
          padding: 9px 16px;
          background: #262626 !important;
          border: 1px solid rgba(255,255,255,0.06) !important;
          color: #f4f4f5 !important;
          box-shadow: none;
          font-size: 12px;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-words;
        }

        /* Assistant bubble – transparent, no border */
        .de-ai-agent .ai-agent-message.assistant .ai-agent-bubble {
          max-width: 100%;
          padding: 0;
          background: transparent !important;
          border: 0 !important;
          box-shadow: none;
          color: #f4f4f5 !important;
        }
        .de-ai-agent .ai-agent-bubble-text {
          font-size: 12px;
          line-height: 1.6;
          color: #e4e4e7;
          white-space: pre-wrap;
          word-break: break-words;
        }

        /* System message */
        .de-ai-agent .ai-agent-message.system .ai-agent-bubble {
          width: 100%;
          border-radius: 12px;
          padding: 12px;
          background: #141414 !important;
          border: 1px solid #262626 !important;
          color: #a1a1aa !important;
          font-size: 11px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          white-space: pre-wrap;
          overflow-x: auto;
        }

        /* Thought collapsible row */
        .de-ai-agent .ai-agent-thought-row {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 0;
          border: 0;
          background: transparent;
          cursor: pointer;
          color: #71717a;
          font-size: 12px;
          margin-bottom: 6px;
          transition: color .15s;
        }
        .de-ai-agent .ai-agent-thought-row:hover { color: #e4e4e7; }
        .de-ai-agent .ai-agent-thought-row svg { transition: transform .2s ease; }
        .de-ai-agent .ai-agent-thought-row svg.is-expanded { transform: rotate(90deg); }
        .de-ai-agent .ai-agent-thought-detail {
          margin: 0 0 10px;
          padding: 10px 12px;
          border: 1px solid #262626;
          border-radius: 12px;
          background: #141414;
          color: #d4d4d8;
          font: 12px/1.55 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          white-space: pre-wrap;
        }

        /* Message footer (copy + timestamp) */
        .de-ai-agent .ai-agent-message-footer {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 10px;
          color: #71717a;
          font-size: 11px;
        }
        .de-ai-agent .ai-agent-message-footer button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          padding: 0;
          border: 0;
          border-radius: 5px;
          background: transparent;
          color: #71717a;
          cursor: pointer;
        }
        .de-ai-agent .ai-agent-message-footer button:hover {
          background: #27272a;
          color: #d4d4d8;
        }

        /* Action badges */
        .de-ai-agent .ai-agent-actions-list { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
        .de-ai-agent .ai-agent-action-badge {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 7px 11px;
          border-radius: 8px;
          border: 1px dashed #3f3f46;
          background: #1c1c1c;
          color: #d4d4d8;
          font-size: 11px;
        }
        .de-ai-agent .ai-agent-action-badge.applied {
          border-color: rgba(34,197,94,.3);
          background: rgba(34,197,94,.05);
          color: #86efac;
        }
        .de-ai-agent .ai-agent-action-label { font-weight: 600; flex: 1; }
        .de-ai-agent .ai-agent-action-buttons { display: flex; align-items: center; gap: 4px; }
        .de-ai-agent .ai-agent-action-apply {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid #484848;
          background: #383838;
          color: #f0f0f0;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
          transition: all .15s;
        }
        .de-ai-agent .ai-agent-action-apply:hover { background: #484848; color: #fff; }
        .de-ai-agent .ai-agent-action-done { font-size: 10px; font-weight: 700; opacity: .7; }
        .de-ai-agent .ai-agent-action-dismiss {
          display: inline-flex;
          align-items: center;
          padding: 2px 4px;
          border: none;
          background: transparent;
          cursor: pointer;
          opacity: .5;
          transition: opacity .15s;
          border-radius: 3px;
          color: #a1a1aa;
          font-size: 14px;
          line-height: 1;
        }
        .de-ai-agent .ai-agent-action-dismiss:hover { opacity: 1; }
        .de-ai-agent .ai-agent-thinking-text { color: #71717a; }

        /* Image attachment in messages */
        .de-ai-agent .ai-agent-image-attachment {
          display: block;
          width: 64px;
          height: 64px;
          margin-top: 8px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 8px;
          object-fit: cover;
        }
        .de-ai-agent .ai-agent-attachment-label {
          margin-top: 5px;
          font-size: 10px;
          opacity: .72;
        }

        /* Scrollbar */
        .de-ai-agent .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .de-ai-agent .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .de-ai-agent .custom-scrollbar::-webkit-scrollbar-thumb { background: #2e2e2e; border-radius: 4px; }
        .de-ai-agent .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
      `}</style>
    </div>
  );
}
