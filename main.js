
const { app, BrowserWindow, ipcMain, dialog, session, shell, Menu } = require('electron');
const path = require('path');
const url = require('url');
const crypto = require('crypto');
const { spawn, spawnSync, execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const pty = require('node-pty');
let archiver = null;
try {
  archiver = require('archiver');
} catch (err) {
  console.warn('archiver dependency is unavailable; XLSX export will be disabled.');
}

// EVASION: Disable automation flags
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
app.commandLine.appendSwitch('enable-features', 'NetworkService,NetworkServiceInProcess');


const DEFAULT_OLLAMA_BASE = 'http://localhost:11434';
const normalizeOllamaApiUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return `${DEFAULT_OLLAMA_BASE}/api/generate`;

  // Remove trailing slashes
  const normalized = raw.replace(/\/+$/, '');

  // If it already looks like a complete Ollama generate/chat endpoint, leave it
  if (/\/api\/(generate|chat)$/i.test(normalized)) return normalized;

  // If it looks like an OpenAI endpoint, leave it alone (user likely knows what they are doing)
  if (/\/v1(\/chat\/completions|\/completions)?$/i.test(normalized)) return normalized;

  // Handle standard Ollama base or /api base
  if (/\/api$/i.test(normalized)) {
    return `${normalized}/generate`;
  }

  // Default: append /api/generate only if no common API path is present
  if (!normalized.includes('/api/') && !normalized.includes('/v1/')) {
    return `${normalized}/api/generate`;
  }

  return normalized;
};
const deriveOllamaBaseUrl = (value) => {
  const normalizedApiUrl = normalizeOllamaApiUrl(value);
  try {
    const parsed = new URL(normalizedApiUrl);
    const normalizedPath = String(parsed.pathname || '').replace(/\/+$/, '');

    if (/\/api\/(generate|chat)$/i.test(normalizedPath)) {
      parsed.pathname = normalizedPath.replace(/\/api\/(generate|chat)$/i, '') || '/';
    } else if (/\/api$/i.test(normalizedPath)) {
      parsed.pathname = normalizedPath.replace(/\/api$/i, '') || '/';
    } else if (/\/v1\/chat\/completions$/i.test(normalizedPath)) {
      parsed.pathname = normalizedPath.replace(/\/v1\/chat\/completions$/i, '') || '/';
    } else if (/\/v1\/completions$/i.test(normalizedPath)) {
      parsed.pathname = normalizedPath.replace(/\/v1\/completions$/i, '') || '/';
    } else if (/\/v1$/i.test(normalizedPath)) {
      parsed.pathname = normalizedPath.replace(/\/v1$/i, '') || '/';
    }

    parsed.search = '';
    parsed.hash = '';
    return parsed.toString().replace(/\/+$/, '');
  } catch (error) {
    return DEFAULT_OLLAMA_BASE;
  }
};

const AI_CONFIG_PATH = path.join(app.getPath('userData'), 'ai_config.json');
const DEFAULT_AI_KNOWLEDGE_ROOT = path.resolve(__dirname, 'AI agent', 'data');
const LEGACY_WORKSPACE_AI_ROOT = path.resolve(process.cwd());

const loadAIConfig = () => {
  try {
    if (fs.existsSync(AI_CONFIG_PATH)) {
      const data = JSON.parse(fs.readFileSync(AI_CONFIG_PATH, 'utf8'));
      return data || {};
    }
  } catch (err) {
    console.error('[Config] Error loading AI config:', err);
  }
  return {};
};

const saveAIConfig = (url, apiKey, knowledgePath) => {
  try {
    const resolvedKnowledgePath = String(knowledgePath || '').trim()
      ? path.resolve(String(knowledgePath).trim())
      : DEFAULT_AI_KNOWLEDGE_ROOT;
    const config = {
      ...loadAIConfig(),
      ollamaApiUrl: url,
      ollamaApiKey: apiKey,
      aiKnowledgePath: resolvedKnowledgePath,
      // Keep legacy key for backward compatibility with older builds.
      workspacePath: resolvedKnowledgePath
    };
    fs.writeFileSync(AI_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    console.log('[Config] AI settings and knowledge folder persisted to disk.');
  } catch (err) {
    console.error('[Config] Error saving AI config:', err);
  }
};

const R_EDITOR_API_KEY_NAMES = Object.freeze([
  'ollamaCloud',
  'openrouter',
  'unorouter',
  'openai',
  'opencode',
  'anthropic',
  'nvidia'
]);

const saveREditorApiKeys = (apiKeys = {}) => {
  const existingConfig = loadAIConfig();
  const existingKeys = existingConfig.rEditorApiKeys && typeof existingConfig.rEditorApiKeys === 'object'
    ? existingConfig.rEditorApiKeys
    : {};
  const normalizedKeys = R_EDITOR_API_KEY_NAMES.reduce((result, name) => {
    const nextValue = apiKeys[name];
    result[name] = typeof nextValue === 'string'
      ? nextValue
      : String(existingKeys[name] || '');
    return result;
  }, {});

  try {
    fs.writeFileSync(
      AI_CONFIG_PATH,
      JSON.stringify({ ...existingConfig, rEditorApiKeys: normalizedKeys }, null, 2),
      'utf8'
    );
    return { success: true };
  } catch (error) {
    console.error('[Config] Error saving R editor provider keys:', error);
    return { success: false, error: error.message };
  }
};

// Initialize with persisted settings if available
const persistedConfig = loadAIConfig();
let currentOllamaApi = normalizeOllamaApiUrl(persistedConfig.ollamaApiUrl || process.env.OLLAMA_API || `${DEFAULT_OLLAMA_BASE}/api/generate`);
let currentOllamaApiKey = String(persistedConfig.ollamaApiKey || process.env.OLLAMA_API_KEY || '').trim();
const persistedExplicitKnowledgeRoot = String(persistedConfig.aiKnowledgePath || '').trim();
const persistedLegacyWorkspaceRoot = String(persistedConfig.workspacePath || '').trim();
let aiKnowledgeRoot = DEFAULT_AI_KNOWLEDGE_ROOT;
if (persistedExplicitKnowledgeRoot) {
  aiKnowledgeRoot = path.resolve(persistedExplicitKnowledgeRoot);
} else if (persistedLegacyWorkspaceRoot) {
  const resolvedKnowledgeRoot = path.resolve(persistedLegacyWorkspaceRoot);
  if (resolvedKnowledgeRoot !== LEGACY_WORKSPACE_AI_ROOT) {
    aiKnowledgeRoot = resolvedKnowledgeRoot;
  }
}
try {
  fs.mkdirSync(aiKnowledgeRoot, { recursive: true });
} catch (err) {
  console.warn('[Config] Failed to ensure AI knowledge folder exists:', aiKnowledgeRoot, err?.message || err);
}

const getActiveApiUrl = () => normalizeOllamaApiUrl(currentOllamaApi);

const getActiveBaseUrl = () => deriveOllamaBaseUrl(currentOllamaApi);

const getOllamaModelsPath = () => {
  const ssdPath = '/media/mamou/PortableSSD/ai-models';
  const desktopPath = '/home/mamou/Desktop/ollama-models/qwen-sueprR';

  if (fs.existsSync(ssdPath)) {
    console.log(`[Ollama] Portable SSD detected at: ${ssdPath}`);
    return ssdPath;
  }
  console.log(`[Ollama] SSD not found, falling back to: ${desktopPath}`);
  return desktopPath;
};

const OLLAMA_MODELS_PATH = process.env.OLLAMA_MODELS || process.env.OLLAMA_MODELS_PATH || getOllamaModelsPath();

const getPythonPath = () => {
  // Always use the system Python environment so pip-installed packages are
  // visible globally and persist across sessions.
  return process.platform === 'win32' ? 'python' : 'python3';
};
let ollamaProcess = null;
let ollamaStarting = false;
let ollamaStartupPromise = null;
let eccFinderProcess = null;

const EXTENSION_PARTITION = 'persist:extension-browser';
const EXTENSIONS_ROOT = path.join(__dirname, 'extensions');
const EXTENSION_ENV_PATH = process.env.APP_EXTENSION_PATH || process.env.EXTENSION_PATH || '';
let extensionLoaded = false;
let mainAppWindow = null;

let workspaceRoot = path.resolve(process.cwd());

const getWorkspaceRoot = () => workspaceRoot;

const normalizeWorkspaceRelativePath = (relativePath = '') => {
  const normalized = String(relativePath || '')
    .replace(/\\/g, '/')
    .trim()
    .replace(/^\/+|\/+$/g, '');
  return normalized === '.' ? '' : normalized;
};

const resolveWorkspacePath = (relativePath = '') => {
  const root = getWorkspaceRoot();
  const normalized = normalizeWorkspaceRelativePath(relativePath);
  const resolved = path.resolve(root, normalized);
  const rootWithSep = root.endsWith(path.sep) ? root : (root + path.sep);
  if (resolved !== root && !resolved.startsWith(rootWithSep)) {
    throw new Error('Path is outside the workspace root.');
  }
  return { normalized, resolved, root };
};

const toWorkspaceRelativePath = (absolutePath) => {
  const rel = path.relative(getWorkspaceRoot(), absolutePath);
  return rel.split(path.sep).join('/');
};

const toExportText = (value) => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch (err) {
    return String(value);
  }
};

const sanitizeExportBaseName = (value, fallback = 'step05_model-summary') => {
  const base = String(value || '').trim().replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');
  return base || fallback;
};

const pythonNotebookToEditorContent = (notebook) => {
  const cells = Array.isArray(notebook?.cells) ? notebook.cells : [];
  return cells.map((cell) => {
    const source = Array.isArray(cell?.source) ? cell.source.join('') : String(cell?.source || '');
    const marker = cell?.cell_type === 'markdown' ? '# %% [markdown]\n' : '# %%\n';
    const body = cell?.cell_type === 'markdown'
      ? source.split('\n').map((line) => line ? `# ${line}` : '#').join('\n')
      : source;
    return `${marker}${body || '\n'}`;
  }).join('\n\n');
};

const pythonEditorContentToNotebook = (content) => {
  const text = String(content || '').replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const cells = [];
  let current = null;
  const pushCell = () => {
    if (!current) return;
    const source = current.lines.join('\n');
    const hasSource = source.trim().length > 0;
    cells.push({
      cell_type: current.markdown ? 'markdown' : 'code',
      execution_count: null,
      metadata: {},
      outputs: [],
      source: current.markdown
        ? (hasSource ? source.split('\n').map((line) => `${line.replace(/^# ?/, '')}\n`) : [])
        : (hasSource ? source.split(/(?<=\n)/) : [])
    });
  };

  lines.forEach((line) => {
    const marker = line.match(/^\s*#\s*%%(?:\s*\[([^\]]+)\])?.*$/);
    if (marker) {
      pushCell();
      current = { markdown: String(marker[1] || '').toLowerCase() === 'markdown', lines: [] };
      return;
    }
    if (!current) current = { markdown: false, lines: [] };
    current.lines.push(line);
  });
  pushCell();

  return {
    cells,
    metadata: {
      kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
      language_info: { name: 'python', version: '' }
    },
    nbformat: 4,
    nbformat_minor: 5
  };
};

const pathsReferToSameFile = (leftPath, rightPath) => {
  const left = String(leftPath || '').trim();
  const right = String(rightPath || '').trim();
  if (!left || !right) return false;
  const normalizedLeft = path.resolve(left);
  const normalizedRight = path.resolve(right);
  return process.platform === 'win32'
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
};

const sanitizeSheetName = (name, index, usedNames) => {
  const baseRaw = String(name || `Sheet ${index + 1}`)
    .replace(/[\\/*?:[\]]/g, ' ')
    .replace(/^'+|'+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const trimmed = (baseRaw || `Sheet ${index + 1}`).slice(0, 31);

  let candidate = trimmed;
  let suffix = 1;
  while (usedNames.has(candidate.toLowerCase())) {
    const extra = ` (${suffix})`;
    candidate = `${trimmed.slice(0, Math.max(1, 31 - extra.length))}${extra}`;
    suffix += 1;
  }
  usedNames.add(candidate.toLowerCase());
  return candidate;
};

const normalizeExportSheets = (sheets) => {
  const usedNames = new Set();
  const inputSheets = Array.isArray(sheets) ? sheets : [];
  return inputSheets.map((sheet, index) => {
    const headers = Array.isArray(sheet?.headers) ? sheet.headers.map((cell) => toExportText(cell)) : [];
    const rows = Array.isArray(sheet?.rows)
      ? sheet.rows.map((row) => {
        const cells = Array.isArray(row) ? row : [row];
        return cells.map((cell) => toExportText(cell));
      })
      : [];
    return {
      name: sanitizeSheetName(sheet?.name, index, usedNames),
      headers,
      rows,
      columnColors: normalizeColumnColorMap(headers, sheet?.columnColors),
      columnWidths: normalizeColumnWidthMap(headers, sheet?.columnWidths)
    };
  });
};

const csvEscapeCell = (value) => {
  const text = toExportText(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const normalizeHexColor = (value) => {
  if (typeof value !== 'string') return '';
  let trimmed = value.trim();
  if (!trimmed) return '';
  if (!trimmed.startsWith('#')) trimmed = `#${trimmed}`;
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const expanded = trimmed
      .slice(1)
      .split('')
      .map((ch) => `${ch}${ch}`)
      .join('');
    return `#${expanded.toLowerCase()}`;
  }
  return '';
};

const normalizeColumnColorMap = (columns, rawColorMap) => {
  if (!rawColorMap || typeof rawColorMap !== 'object') return {};
  return (Array.isArray(columns) ? columns : []).reduce((acc, column) => {
    const normalized = normalizeHexColor(rawColorMap[column]);
    if (normalized) acc[column] = normalized;
    return acc;
  }, {});
};

const normalizeColumnWidthMap = (columns, rawWidthMap) => {
  if (!rawWidthMap || typeof rawWidthMap !== 'object') return {};
  return (Array.isArray(columns) ? columns : []).reduce((acc, column) => {
    const width = Number(rawWidthMap[column]);
    if (!Number.isFinite(width)) return acc;
    acc[column] = Math.max(40, Math.min(640, width));
    return acc;
  }, {});
};

const hexToRgb = (hex) => {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return null;
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16)
  };
};

const rgbToHex = ({ r, g, b }) => {
  const clamp = (value) => Math.max(0, Math.min(255, Math.round(Number(value) || 0)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
};

const mixHexColors = (baseHex, mixHex, mixRatio = 0.5) => {
  const base = hexToRgb(baseHex);
  const mix = hexToRgb(mixHex);
  if (!base || !mix) return normalizeHexColor(baseHex);
  const ratio = Math.max(0, Math.min(1, Number(mixRatio) || 0));
  return rgbToHex({
    r: base.r + ((mix.r - base.r) * ratio),
    g: base.g + ((mix.g - base.g) * ratio),
    b: base.b + ((mix.b - base.b) * ratio)
  });
};

const toExcelArgb = (hex, fallback = 'ffffffff') => {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return fallback.toUpperCase();
  return `FF${normalized.slice(1)}`.toUpperCase();
};

const getReadableExcelTextColor = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#111827';
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luminance > 0.62 ? '#111827' : '#ffffff';
};

const pxToExcelWidth = (widthPx) => {
  const safeWidth = Math.max(48, Math.min(640, Number(widthPx) || 160));
  const excelWidth = ((safeWidth - 5) / 7);
  return Math.max(6, Math.min(80, Math.round(excelWidth * 100) / 100));
};

const normalizeExcelFontSize = (value, fallback = 11) => {
  const parsed = Number.parseFloat(String(value ?? '').replace(/px$/i, '').trim());
  const safeValue = Number.isFinite(parsed) ? parsed : fallback;
  return Math.max(8, Math.min(72, Math.round(safeValue * 10) / 10));
};

const normalizeExcelRowHeight = (value, fallback) => {
  const parsed = Number(value);
  const safeValue = Number.isFinite(parsed) ? parsed : fallback;
  return Math.max(15, Math.min(120, Math.round(safeValue * 10) / 10));
};

const buildCsvFromSheets = (sheets) => {
  const lines = [];
  sheets.forEach((sheet, index) => {
    if (index > 0) lines.push('');
    lines.push(csvEscapeCell(`Sheet: ${sheet.name}`));
    if (sheet.headers.length > 0) {
      lines.push(sheet.headers.map((cell) => csvEscapeCell(cell)).join(','));
    }
    if (sheet.rows.length === 0) {
      lines.push(csvEscapeCell('No rows available.'));
    } else {
      sheet.rows.forEach((row) => {
        lines.push(row.map((cell) => csvEscapeCell(cell)).join(','));
      });
    }
  });
  return lines.join('\n');
};

const R_NARRATIVE_PREFIX_REGEX = /^(?:here(?:'s| is)|sure|certainly|okay|great|i(?:'ll| will)|the following|this code|explanation|note|you can|let(?:'s| us)|i have|based on)\b/i;
const R_ASSIGNMENT_REGEX = /^([A-Za-z.][A-Za-z0-9._]*(?:\[[^\]]+\]|\$[A-Za-z.][A-Za-z0-9._]*)?)\s*(<-|<<-|=)\s*/;
const R_EXECUTABLE_PATTERN_REGEX = /(::|:::|%>%|\blibrary\s*\(|\brequire\s*\(|\bif\s*\(|\bfor\s*\(|\bwhile\s*\(|\brepeat\b|\bfunction\s*\(|\breturn\s*\(|\bprint\s*\(|\bstop\s*\(|\bmessage\s*\(|\bwarning\s*\(|\bcat\s*\(|\bggplot\s*\(|\bmutate\s*\(|\bselect\s*\(|\bfilter\s*\(|\bsummar(?:ise|ize)\s*\(|\barrange\s*\()/;
const R_STANDALONE_KEYWORD_REGEX = /^(?:next|break|return|TRUE|FALSE|NULL|NA(?:_[A-Z]+)?|Inf|NaN)\b/;
const R_DOUBLE_HASH_LINE_REGEX = /^\s*##/;
const R_FENCED_BLOCK_REGEX = /```(?:r|R)?\s*([\s\S]*?)```/;
const DATAFRAME_CREATION_INTENT_REGEX = /\b(?:create|generate|build|make)\b[\s\S]{0,120}\b(?:data\s*frame|dataset|table)\b|\b(?:data\s*frame|dataset|table)\b[\s\S]{0,120}\b(?:create|generate|build|make)\b/i;
const EMPTY_VECTOR_CONSTRUCTOR_REGEX = /=\s*(?:character|numeric|integer|logical|double|complex|vector|list)\s*\(\s*\)/gi;
const POPULATED_COLUMN_PATTERN_REGEX = /=\s*(?:c\s*\(\s*[^)\s][\s\S]*?\)|seq(?:_along|_len)?\s*\(|sample\s*\(|rep\s*\()/i;
const CLAUDE_AGENT_SPEC_PATH = path.join(os.homedir(), '.claude', 'agents', 'r-programming-expert.md');
const CLAUDE_AGENT_SPEC_MAX_CHARS = 14000;
const CLAUDE_AGENT_MEMORY_SECTION_REGEX = /\n#\s*Persistent Agent Memory\b[\s\S]*$/i;
let cachedClaudeRAgentSpec = '';
let cachedClaudeRAgentSpecMtimeMs = 0;
let warnedClaudeRAgentSpecMissing = false;

const stripMarkdownFrontmatter = (rawText) => {
  const normalized = String(rawText || '').replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) return normalized.trim();
  const closingFenceIndex = normalized.indexOf('\n---\n', 4);
  if (closingFenceIndex === -1) return normalized.trim();
  return normalized.slice(closingFenceIndex + 5).trim();
};

const getClaudeRAgentSpecification = () => {
  try {
    const stats = fs.statSync(CLAUDE_AGENT_SPEC_PATH);
    const currentMtimeMs = Number(stats?.mtimeMs || 0);
    if (cachedClaudeRAgentSpec && currentMtimeMs > 0 && currentMtimeMs === cachedClaudeRAgentSpecMtimeMs) {
      return cachedClaudeRAgentSpec;
    }

    const rawSpec = fs.readFileSync(CLAUDE_AGENT_SPEC_PATH, 'utf8');
    let specBody = stripMarkdownFrontmatter(rawSpec)
      .replace(CLAUDE_AGENT_MEMORY_SECTION_REGEX, '')
      .trim();

    if (specBody.length > CLAUDE_AGENT_SPEC_MAX_CHARS) {
      specBody = `${specBody.slice(0, CLAUDE_AGENT_SPEC_MAX_CHARS).trim()}\n\n[Truncated for prompt size.]`;
    }

    cachedClaudeRAgentSpec = specBody;
    cachedClaudeRAgentSpecMtimeMs = currentMtimeMs;
    warnedClaudeRAgentSpecMissing = false;
    return cachedClaudeRAgentSpec;
  } catch (error) {
    if (!warnedClaudeRAgentSpecMissing) {
      console.warn(`[AgentSpec] Could not load ${CLAUDE_AGENT_SPEC_PATH}: ${error?.message || error}`);
      warnedClaudeRAgentSpecMissing = true;
    }
    return '';
  }
};

const isRunnableRLine = (line) => {
  const trimmed = String(line || '').trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('#')) return false;
  if (trimmed.startsWith('@@')) return false;
  if (R_ASSIGNMENT_REGEX.test(trimmed)) return true;
  if (R_EXECUTABLE_PATTERN_REGEX.test(trimmed)) return true;
  if (R_STANDALONE_KEYWORD_REGEX.test(trimmed)) return true;
  return /^[A-Za-z.][A-Za-z0-9._]*\s*\(/.test(trimmed);
};

const hasRunnableRCode = (text) => {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  return lines.some((line) => isRunnableRLine(line));
};

const looksLikePlaceholderDataFrameTemplate = (codeText) => {
  const text = String(codeText || '').replace(/\r\n/g, '\n').trim();
  if (!text) return false;
  if (!/data\.frame\s*\(/i.test(text)) return false;

  const emptyMatches = text.match(EMPTY_VECTOR_CONSTRUCTOR_REGEX) || [];
  if (emptyMatches.length === 0) return false;
  if (POPULATED_COLUMN_PATTERN_REGEX.test(text)) return false;

  // Require at least 2 empty constructors to avoid over-triggering on mixed code.
  return emptyMatches.length >= 2;
};

const sanitizeRModelCodeOutput = (rawText, { expectsPatchBlocks = false, language = 'r' } = {}) => {
  let text = String(rawText || '').replace(/\r\n/g, '\n').trim();
  if (!text) return '';

  // When we expect patch blocks, prioritize @@SEARCH markers over code-fence extraction.
  // Models sometimes wrap @@SEARCH/@@REPLACE inside ```r ... ``` — we must preserve them.
  if (expectsPatchBlocks) {
    // Strip any surrounding code fences but keep the @@SEARCH/@@REPLACE content
    text = text
      .replace(/```(?:r|R)?\s*/g, '')
      .replace(/```/g, '')
      .trim();
    // If the text contains valid patch markers, return it as-is
    if (/@@SEARCH/.test(text) && /@@REPLACE/.test(text)) {
      return text;
    }
    // If model returned a full script despite being in patch mode,
    // still return the text — the caller will handle the fallback
    return text;
  }

  if (String(language || 'r').toLowerCase() === 'python') {
    const fencedBlockMatch = text.match(/```(?:python|py)?\s*([\s\S]*?)```/i);
    if (fencedBlockMatch?.[1]) text = fencedBlockMatch[1].trim();
    text = text
      .replace(/```(?:python|py)?\s*/gi, '')
      .replace(/```/g, '')
      .replace(/^r_code_[a-z_]+\{[^}]*\}:\s*/i, '')
      .trim();
    if (!text) return '';
    const lines = text.split('\n').map((line) => String(line || '').trimEnd());
    while (lines.length > 0 && !lines[0].trim()) lines.shift();
    while (lines.length > 0 && !lines[lines.length - 1].trim()) lines.pop();
    return lines.some((line) => line.trim() && !/^```/.test(line.trim())) ? lines.join('\n').trim() : '';
  }

  const fencedBlockMatch = text.match(R_FENCED_BLOCK_REGEX);
  if (fencedBlockMatch?.[1]) {
    text = String(fencedBlockMatch[1]).trim();
  }

  text = text
    .replace(/```(?:r|R)?\s*/g, '')
    .replace(/```/g, '')
    .trim();

  text = text.replace(/^r_code_[a-z_]+\{[^}]*\}:\s*/i, '').trim();
  if (!text) return '';

  text = text
    .split('\n')
    .filter((line) => !R_DOUBLE_HASH_LINE_REGEX.test(String(line || '')))
    .join('\n')
    .trim();
  if (!text) return '';

  const lines = text.split('\n').map((line) => String(line || '').trimEnd());
  while (lines.length > 0) {
    const head = lines[0].trim();
    if (!head) {
      lines.shift();
      continue;
    }
    if (R_NARRATIVE_PREFIX_REGEX.test(head) && !isRunnableRLine(head)) {
      lines.shift();
      continue;
    }
    break;
  }

  if (lines.length === 0) return '';
  if (!lines.some((line) => isRunnableRLine(line))) return '';

  const firstCodeLineIndex = lines.findIndex((line) => isRunnableRLine(line));
  const normalizedLines = (firstCodeLineIndex > 0 ? lines.slice(firstCodeLineIndex) : lines)
    .map((line) => String(line || '').trimEnd());
  while (normalizedLines.length > 0) {
    const tail = normalizedLines[normalizedLines.length - 1].trim();
    if (!tail) {
      normalizedLines.pop();
      continue;
    }
    if (R_NARRATIVE_PREFIX_REGEX.test(tail) && !isRunnableRLine(tail)) {
      normalizedLines.pop();
      continue;
    }
    break;
  }
  const normalized = normalizedLines.join('\n').trim();
  return hasRunnableRCode(normalized) ? normalized : '';
};

const isLikelyIncompleteRCode = (text) => {
  const normalized = String(text || '').replace(/\r\n/g, '\n').trim();
  if (!normalized) return false;

  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let escapeNext = false;
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;

  const lines = normalized.split('\n');
  for (const line of lines) {
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];

      if (!inSingle && !inDouble && !inBacktick && ch === '#') {
        break;
      }

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if ((inSingle || inDouble) && ch === '\\') {
        escapeNext = true;
        continue;
      }

      if (!inDouble && !inBacktick && ch === '\'') {
        inSingle = !inSingle;
        continue;
      }
      if (!inSingle && !inBacktick && ch === '"') {
        inDouble = !inDouble;
        continue;
      }
      if (!inSingle && !inDouble && ch === '`') {
        inBacktick = !inBacktick;
        continue;
      }

      if (inSingle || inDouble || inBacktick) {
        continue;
      }

      if (ch === '(') parenDepth += 1;
      else if (ch === ')' && parenDepth > 0) parenDepth -= 1;
      else if (ch === '[') bracketDepth += 1;
      else if (ch === ']' && bracketDepth > 0) bracketDepth -= 1;
      else if (ch === '{') braceDepth += 1;
      else if (ch === '}' && braceDepth > 0) braceDepth -= 1;
    }
  }

  if (inSingle || inDouble || inBacktick) return true;
  if (parenDepth > 0 || bracketDepth > 0 || braceDepth > 0) return true;

  const nonEmptyLines = lines.map((line) => String(line || '').trimRight()).filter((line) => line.trim() !== '');
  if (nonEmptyLines.length === 0) return false;
  const lastLine = nonEmptyLines[nonEmptyLines.length - 1].trim();

  if (/[,+\-*/%]\s*$/.test(lastLine)) return true;
  if (/(<-|=)\s*$/.test(lastLine)) return true;
  if (/,\s*$/.test(lastLine)) return true;
  if (/\b(else)\s*$/.test(lastLine)) return true;

  return false;
};

const mergeContinuationSuffix = (baseCode, continuationCode) => {
  const base = String(baseCode || '').trimEnd();
  const continuation = String(continuationCode || '').trim();
  if (!continuation) return base;
  if (!base) return continuation;

  const baseLines = base.split('\n');
  const continuationLines = continuation.split('\n');
  const maxOverlap = Math.min(40, baseLines.length, continuationLines.length);
  let overlap = 0;

  for (let i = 1; i <= maxOverlap; i += 1) {
    const baseTail = baseLines.slice(-i).join('\n').trim();
    const continuationHead = continuationLines.slice(0, i).join('\n').trim();
    if (baseTail && baseTail === continuationHead) {
      overlap = i;
    }
  }

  const suffix = continuationLines.slice(overlap).join('\n').trim();
  if (!suffix) return base;
  const separator = base.endsWith('\n') ? '' : '\n';
  return `${base}${separator}${suffix}`.trim();
};

const normalizeDatasetColumns = (rows, requestedColumns = []) => {
  const fromRequest = Array.isArray(requestedColumns)
    ? requestedColumns.map((col) => String(col))
    : [];
  if (fromRequest.length > 0) return fromRequest;

  const keySet = new Set();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    if (!row || typeof row !== 'object') return;
    Object.keys(row).forEach((key) => keySet.add(String(key)));
  });
  return Array.from(keySet);
};

const buildCsvFromRows = (rows, columns) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  const safeColumns = Array.isArray(columns) ? columns : [];
  const lines = [];
  if (safeColumns.length > 0) {
    lines.push(safeColumns.map((col) => csvEscapeCell(col)).join(','));
  }
  safeRows.forEach((row) => {
    const safeRow = row && typeof row === 'object' ? row : {};
    lines.push(safeColumns.map((col) => csvEscapeCell(safeRow[col])).join(','));
  });
  return lines.join('\n');
};

const xmlEscape = (text) => String(text)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const toExcelColumnName = (columnIndex) => {
  let index = columnIndex + 1;
  let name = '';
  while (index > 0) {
    const remainder = (index - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    index = Math.floor((index - 1) / 26);
  }
  return name;
};

const inlineStringXml = (value) => {
  const text = toExportText(value);
  const preserve = (/^\s|\s$|\n/.test(text)) ? ' xml:space="preserve"' : '';
  return `<is><t${preserve}>${xmlEscape(text)}</t></is>`;
};

const buildWorksheetXml = (sheet, sheetContext = {}) => {
  const rows = [];
  if (sheet.headers.length > 0) rows.push(sheet.headers);
  if (sheet.rows.length > 0) {
    sheet.rows.forEach((row) => rows.push(row));
  } else if (sheet.headers.length === 0) {
    rows.push(['No rows available.']);
  }

  const headerStyleIds = Array.isArray(sheetContext?.headerStyleIds) ? sheetContext.headerStyleIds : [];
  const cellStyleIds = Array.isArray(sheetContext?.cellStyleIds) ? sheetContext.cellStyleIds : [];
  const colsXml = buildWorksheetColsXml(sheetContext?.widths);
  const rowXml = rows.map((row, rowIndex) => {
    const cells = (Array.isArray(row) ? row : [row]).map((cell, columnIndex) => {
      const ref = `${toExcelColumnName(columnIndex)}${rowIndex + 1}`;
      const styleId = rowIndex === 0
        ? headerStyleIds[columnIndex]
        : cellStyleIds[columnIndex];
      const styleAttr = Number.isInteger(styleId) && styleId > 0 ? ` s="${styleId}"` : '';
      return `<c r="${ref}" t="inlineStr"${styleAttr}>${inlineStringXml(cell)}</c>`;
    }).join('');
    const rowHeight = rowIndex === 0
      ? normalizeExcelRowHeight(sheetContext?.headerRowHeight, 24)
      : normalizeExcelRowHeight(sheetContext?.rowHeight, 22);
    return `<row r="${rowIndex + 1}" ht="${rowHeight}" customHeight="1">${cells}</row>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetFormatPr defaultRowHeight="22"/>
  ${colsXml}
  <sheetData>${rowXml}</sheetData>
</worksheet>`;
};

const buildWorkbookXml = (sheets) => {
  const sheetXml = sheets.map((sheet, index) => (
    `<sheet name="${xmlEscape(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
  )).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheetXml}</sheets>
</workbook>`;
};

const buildWorkbookRelsXml = (sheets) => {
  const rels = sheets.map((_, index) => (
    `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
  )).join('');
  const stylesRelationId = sheets.length + 1;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${rels}
  <Relationship Id="rId${stylesRelationId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
};

const buildContentTypesXml = (sheets) => {
  const worksheetTypes = sheets.map((_, index) => (
    `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  )).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${worksheetTypes}
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;
};

const buildCorePropsXml = (generatedAtIso) => {
  const iso = generatedAtIso || new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Step 05 Model Summary Export</dc:title>
  <dc:creator>MyFinanceTracker</dc:creator>
  <cp:lastModifiedBy>MyFinanceTracker</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${xmlEscape(iso)}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${xmlEscape(iso)}</dcterms:modified>
</cp:coreProperties>`;
};

const buildAppPropsXml = (sheets) => {
  const sheetParts = sheets.map((sheet) => `<vt:lpstr>${xmlEscape(sheet.name)}</vt:lpstr>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>MyFinanceTracker</Application>
  <HeadingPairs>
    <vt:vector size="2" baseType="variant">
      <vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant>
      <vt:variant><vt:i4>${sheets.length}</vt:i4></vt:variant>
    </vt:vector>
  </HeadingPairs>
  <TitlesOfParts>
    <vt:vector size="${sheets.length}" baseType="lpstr">${sheetParts}</vt:vector>
  </TitlesOfParts>
</Properties>`;
};

const buildWorkbookStyleContext = (sheets) => {
  const fonts = [
    { color: 'FF111827', bold: false, size: 11 },
    { color: 'FFFFFFFF', bold: false, size: 11 }
  ];
  const fills = [
    { type: 'none' },
    { type: 'gray125' }
  ];
  const fontMap = new Map([
    ['FF111827|0|11', 0],
    ['FFFFFFFF|0|11', 1]
  ]);
  const fillMap = new Map([
    ['none', 0],
    ['gray125', 1]
  ]);
  const cellXfs = [
    { fontId: 0, fillId: 0, borderId: 0, applyFont: false, applyFill: false, applyAlignment: true, horizontal: 'left', vertical: 'center' }
  ];
  const xfMap = new Map([
    ['0|0|0|left|center', 0]
  ]);

  const registerFont = ({ color = 'FF111827', bold = false, size = 11 }) => {
    const normalizedColor = String(color || 'FF111827').toUpperCase();
    const normalizedSize = normalizeExcelFontSize(size, 11);
    const key = `${normalizedColor}|${bold ? '1' : '0'}|${normalizedSize}`;
    if (fontMap.has(key)) return fontMap.get(key);
    const nextIndex = fonts.length;
    fonts.push({ color: normalizedColor, bold: Boolean(bold), size: normalizedSize });
    fontMap.set(key, nextIndex);
    return nextIndex;
  };

  const registerFill = (color) => {
    const normalizedColor = String(color || '').toUpperCase();
    if (!normalizedColor) return 0;
    const key = `solid|${normalizedColor}`;
    if (fillMap.has(key)) return fillMap.get(key);
    const nextIndex = fills.length;
    fills.push({ type: 'solid', color: normalizedColor });
    fillMap.set(key, nextIndex);
    return nextIndex;
  };

  const registerStyle = ({
    fillColor = '',
    fontColor = 'FF111827',
    bold = false,
    fontSize = 11,
    horizontal = 'left',
    vertical = 'center'
  } = {}) => {
    const fontId = registerFont({ color: fontColor, bold, size: fontSize });
    const fillId = registerFill(fillColor);
    const key = `${fontId}|${fillId}|${bold ? '1' : '0'}|${horizontal}|${vertical}`;
    if (xfMap.has(key)) return xfMap.get(key);
    const nextIndex = cellXfs.length;
    cellXfs.push({
      fontId,
      fillId,
      borderId: 0,
      applyFont: true,
      applyFill: fillId !== 0,
      applyAlignment: true,
      horizontal,
      vertical
    });
    xfMap.set(key, nextIndex);
    return nextIndex;
  };

  const sheetContexts = (Array.isArray(sheets) ? sheets : []).map((sheet) => {
    const headerCells = Array.isArray(sheet?.headers) ? sheet.headers : [];
    const columnColors = normalizeColumnColorMap(headerCells, sheet?.columnColors);
    const columnWidths = normalizeColumnWidthMap(headerCells, sheet?.columnWidths);
    const bodyFontSize = normalizeExcelFontSize(sheet?.fontSize, 11);
    const headerFontSize = normalizeExcelFontSize(sheet?.headerFontSize, bodyFontSize);
    const defaultHeaderStyleId = registerStyle({
      fillColor: 'FFE5E7EB',
      fontColor: 'FF111827',
      bold: true,
      fontSize: headerFontSize
    });
    const defaultCellStyleId = registerStyle({
      fontSize: bodyFontSize
    });

    const headerStyleIds = headerCells.map((column) => {
      const baseColor = columnColors[column];
      if (!baseColor) return defaultHeaderStyleId;
      return registerStyle({
        fillColor: toExcelArgb(baseColor),
        fontColor: toExcelArgb(getReadableExcelTextColor(baseColor)),
        bold: true,
        fontSize: headerFontSize
      });
    });

    const cellStyleIds = headerCells.map((column) => {
      const baseColor = columnColors[column];
      if (!baseColor) return defaultCellStyleId;
      const tinted = mixHexColors(baseColor, '#ffffff', 0.84);
      return registerStyle({
        fillColor: toExcelArgb(tinted),
        fontColor: toExcelArgb(getReadableExcelTextColor(tinted)),
        bold: false,
        fontSize: bodyFontSize
      });
    });

    const widths = headerCells.map((column) => {
      const widthPx = columnWidths[column];
      if (!Number.isFinite(widthPx)) return null;
      return pxToExcelWidth(widthPx);
    });

    return {
      headerStyleIds,
      cellStyleIds,
      widths,
      rowHeight: normalizeExcelRowHeight(sheet?.rowHeight, 22),
      headerRowHeight: normalizeExcelRowHeight(sheet?.headerRowHeight, 24)
    };
  });

  const fontsXml = fonts.map((font) => (
    `<font>${font.bold ? '<b/>' : ''}<sz val="${font.size}"/><color rgb="${font.color}"/><name val="Aptos"/><family val="2"/></font>`
  )).join('');

  const fillsXml = fills.map((fill) => {
    if (fill.type === 'none') return '<fill><patternFill patternType="none"/></fill>';
    if (fill.type === 'gray125') return '<fill><patternFill patternType="gray125"/></fill>';
    return `<fill><patternFill patternType="solid"><fgColor rgb="${fill.color}"/><bgColor indexed="64"/></patternFill></fill>`;
  }).join('');

  const cellXfsXml = cellXfs.map((xf) => (
    `<xf numFmtId="0" fontId="${xf.fontId}" fillId="${xf.fillId}" borderId="${xf.borderId}" xfId="0"${xf.applyFont ? ' applyFont="1"' : ''}${xf.applyFill ? ' applyFill="1"' : ''}${xf.applyAlignment ? ' applyAlignment="1"' : ''}><alignment horizontal="${xf.horizontal}" vertical="${xf.vertical}"/></xf>`
  )).join('');

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="${fonts.length}">${fontsXml}</fonts>
  <fills count="${fills.length}">${fillsXml}</fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="${cellXfs.length}">${cellXfsXml}</cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

  return { stylesXml, sheetContexts };
};

const buildWorksheetColsXml = (widths) => {
  const normalizedWidths = Array.isArray(widths) ? widths : [];
  const colsXml = normalizedWidths
    .map((width, index) => {
      if (!Number.isFinite(width)) return '';
      return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
    })
    .filter(Boolean)
    .join('');
  return colsXml ? `<cols>${colsXml}</cols>` : '';
};

const writeXlsxFile = async (targetPath, sheets, generatedAtIso) => {
  if (!archiver) {
    throw new Error('XLSX export dependency is unavailable.');
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'step05_xlsx_'));
  try {
    const workbookStyleContext = buildWorkbookStyleContext(sheets);
    fs.mkdirSync(path.join(tempRoot, '_rels'), { recursive: true });
    fs.mkdirSync(path.join(tempRoot, 'xl', '_rels'), { recursive: true });
    fs.mkdirSync(path.join(tempRoot, 'xl', 'worksheets'), { recursive: true });
    fs.mkdirSync(path.join(tempRoot, 'docProps'), { recursive: true });

    fs.writeFileSync(
      path.join(tempRoot, '[Content_Types].xml'),
      buildContentTypesXml(sheets),
      'utf8'
    );
    fs.writeFileSync(
      path.join(tempRoot, '_rels', '.rels'),
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`,
      'utf8'
    );
    fs.writeFileSync(path.join(tempRoot, 'xl', 'workbook.xml'), buildWorkbookXml(sheets), 'utf8');
    fs.writeFileSync(path.join(tempRoot, 'xl', '_rels', 'workbook.xml.rels'), buildWorkbookRelsXml(sheets), 'utf8');
    fs.writeFileSync(path.join(tempRoot, 'xl', 'styles.xml'), workbookStyleContext.stylesXml, 'utf8');
    sheets.forEach((sheet, index) => {
      fs.writeFileSync(
        path.join(tempRoot, 'xl', 'worksheets', `sheet${index + 1}.xml`),
        buildWorksheetXml(sheet, workbookStyleContext.sheetContexts[index]),
        'utf8'
      );
    });
    fs.writeFileSync(path.join(tempRoot, 'docProps', 'core.xml'), buildCorePropsXml(generatedAtIso), 'utf8');
    fs.writeFileSync(path.join(tempRoot, 'docProps', 'app.xml'), buildAppPropsXml(sheets), 'utf8');

    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(targetPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', resolve);
      output.on('error', reject);
      archive.on('error', reject);

      archive.pipe(output);
      archive.directory(`${tempRoot}${path.sep}`, false);
      archive.finalize();
    });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
};

const findExtensionPaths = () => {
  const paths = [];
  if (EXTENSION_ENV_PATH) {
    const manifestPath = path.join(EXTENSION_ENV_PATH, 'manifest.json');
    if (fs.existsSync(manifestPath)) paths.push(EXTENSION_ENV_PATH);
  }
  if (fs.existsSync(EXTENSIONS_ROOT)) {
    const entries = fs.readdirSync(EXTENSIONS_ROOT, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const candidate = path.join(EXTENSIONS_ROOT, entry.name);
      if (fs.existsSync(path.join(candidate, 'manifest.json'))) paths.push(candidate);
    }
  }
  return paths;
};

const ensureExtensionLoaded = async () => {
  if (extensionLoaded) return;
  const extSession = session.fromPartition(EXTENSION_PARTITION);
  const paths = findExtensionPaths();
  if (paths.length === 0) {
    console.warn('No unpacked extension found. Place it in /extensions or set APP_EXTENSION_PATH.');
    extensionLoaded = true;
    return;
  }
  for (const extPath of paths) {
    try {
      await extSession.loadExtension(extPath, { allowFileAccess: true });
      console.log(`Loaded extension: ${extPath}`);
    } catch (err) {
      console.error(`Failed to load extension at ${extPath}:`, err.message);
    }
  }
  extensionLoaded = true;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isLocalOllama = () => {
  try {
    const baseUrl = getActiveBaseUrl() || DEFAULT_OLLAMA_BASE;
    const urlObj = new URL(baseUrl);
    const hostname = urlObj.hostname.toLowerCase();

    // Only loopback hosts should trigger local process management.
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch (e) {
    // If URL parsing fails, avoid forcing local Ollama startup.
    return false;
  }
};

const ensureActiveAiEndpointReady = async () => {
  if (!isLocalOllama()) return true;
  return ensureOllamaRunning();
};

const getPythonProcessEnv = (overrides = {}) => {
  const environment = { ...process.env, ...overrides };
  return environment;
};

const buildOllamaHeaders = ({ includeJson = false } = {}) => {
  const headers = {};
  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }

  const apiKey = currentOllamaApiKey || String(process.env.OLLAMA_API_KEY || '').trim();
  if (apiKey) {
    // If it's not local, or if we explicitly have an API key, include it.
    // Some local proxies might also require auth.
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
};

const OLLAMA_HEALTHCHECK_TIMEOUT_MS = 2500;

const isOllamaHealthy = async () => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OLLAMA_HEALTHCHECK_TIMEOUT_MS);
  try {
    const res = await fetch(`${getActiveBaseUrl()}/api/tags`, {
      method: 'GET',
      headers: buildOllamaHeaders(),
      signal: controller.signal
    });
    return res.ok;
  } catch (e) {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
};

const waitForOllamaHealth = async ({ attempts = 15, delayMs = 1000 } = {}) => {
  const maxAttempts = Math.max(1, Number(attempts) || 1);
  const stepDelayMs = Math.max(0, Number(delayMs) || 0);

  for (let i = 0; i < maxAttempts; i += 1) {
    if (await isOllamaHealthy()) return true;
    if (i < maxAttempts - 1 && stepDelayMs > 0) {
      await sleep(stepDelayMs);
    }
  }
  return false;
};

const ensureOllamaRunning = async () => {
  if (!isLocalOllama()) return true;
  if (await isOllamaHealthy()) return true;

  if (ollamaStartupPromise) {
    return ollamaStartupPromise;
  }

  if (ollamaProcess && ollamaProcess.exitCode == null && !ollamaProcess.killed) {
    return waitForOllamaHealth({ attempts: 20, delayMs: 500 });
  }

  if (ollamaProcess && (ollamaProcess.killed || ollamaProcess.exitCode !== null)) {
    ollamaProcess = null;
  }

  ollamaStartupPromise = (async () => {
    ollamaStarting = true;
    try {
      const modelsPath = getOllamaModelsPath();
      const ollamaOpts = { stdio: 'ignore' };
      ollamaOpts.env = { ...process.env, OLLAMA_MODELS: modelsPath };

      console.log(`[Ollama] Starting server with OLLAMA_MODELS=${modelsPath}`);
      const nextProcess = spawn('ollama', ['serve'], ollamaOpts);
      ollamaProcess = nextProcess;

      nextProcess.once('error', (error) => {
        console.error(`[Ollama] Failed to start local server: ${error?.message || error}`);
        if (ollamaProcess === nextProcess) {
          ollamaProcess = null;
        }
      });

      nextProcess.once('exit', (code, signal) => {
        const reason = signal ? `signal ${signal}` : `code ${code}`;
        console.warn(`[Ollama] Local server exited (${reason}).`);
        if (ollamaProcess === nextProcess) {
          ollamaProcess = null;
        }
      });

      if (!nextProcess.pid) {
        console.error('[Ollama] Spawn did not return a PID.');
        ollamaProcess = null;
        return false;
      }
    } catch (error) {
      console.error('[Ollama] Unexpected startup failure:', error);
      ollamaProcess = null;
      return false;
    } finally {
      ollamaStarting = false;
    }

    return waitForOllamaHealth({ attempts: 20, delayMs: 500 });
  })();

  try {
    return await ollamaStartupPromise;
  } finally {
    ollamaStartupPromise = null;
  }
};

const normalizeModelNames = (inputModels) => {
  const seen = new Set();
  return (Array.isArray(inputModels) ? inputModels : [])
    .map((modelName) => String(modelName || '').trim())
    .filter((modelName) => {
      if (!modelName) return false;
      const key = modelName.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
};

const collectManifestFilePaths = (rootDir) => {
  const files = [];
  if (!rootDir || !fs.existsSync(rootDir)) return files;
  const stack = [rootDir];
  while (stack.length > 0) {
    const currentDir = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (err) {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }
  return files;
};

const collectModelsFromManifestDirectory = (modelsRootPath) => {
  const manifestsRoot = path.join(modelsRootPath || '', 'manifests');
  const manifestFiles = collectManifestFilePaths(manifestsRoot);
  const discoveredModels = manifestFiles
    .map((manifestPath) => {
      const relParts = path
        .relative(manifestsRoot, manifestPath)
        .split(path.sep)
        .filter(Boolean);
      if (relParts.length < 2) return '';
      const tag = relParts[relParts.length - 1];
      const namespaceParts = relParts.slice(1, -1); // Drop registry host segment.
      if (namespaceParts.length === 0) return '';
      const repoParts = (namespaceParts[0] === 'library' && namespaceParts.length > 1)
        ? namespaceParts.slice(1)
        : namespaceParts;
      if (repoParts.length === 0) return '';
      const repoName = repoParts.join('/');
      return `${repoName}:${tag}`;
    })
    .filter(Boolean);
  return normalizeModelNames(discoveredModels);
};

const OUTPUT_BUFFER_LIMIT = 120000;

const appendCapped = (current, chunk) => {
  const next = `${current}${chunk}`;
  if (next.length <= OUTPUT_BUFFER_LIMIT) return next;
  return next.slice(next.length - OUTPUT_BUFFER_LIMIT);
};

const runSpawnCapture = (command, args = [], options = {}) => new Promise((resolve) => {
  let stdout = '';
  let stderr = '';
  let settled = false;

  const finish = (result) => {
    if (settled) return;
    settled = true;
    resolve(result);
  };

  let proc = null;
  try {
    proc = spawn(command, args, options);
  } catch (err) {
    finish({ code: -1, stdout: '', stderr: String(err?.message || err) });
    return;
  }

  if (proc.stdout) {
    proc.stdout.on('data', (data) => {
      stdout = appendCapped(stdout, data.toString());
    });
  }
  if (proc.stderr) {
    proc.stderr.on('data', (data) => {
      stderr = appendCapped(stderr, data.toString());
    });
  }

  proc.on('error', (err) => {
    finish({
      code: -1,
      stdout,
      stderr: appendCapped(stderr, String(err?.message || err))
    });
  });

  proc.on('close', (code) => {
    finish({
      code: typeof code === 'number' ? code : -1,
      stdout,
      stderr
    });
  });
});

const runShellCapture = (shellCommand) => {
  if (process.platform === 'win32') {
    return runSpawnCapture('cmd.exe', ['/d', '/s', '/c', shellCommand], {
      env: process.env,
      windowsHide: true
    });
  }
  return runSpawnCapture('bash', ['-lc', shellCommand], {
    env: process.env
  });
};

const hasCommand = async (command) => {
  if (process.platform === 'win32') {
    const result = await runSpawnCapture('where', [command], { windowsHide: true });
    return result.code === 0;
  }
  const result = await runSpawnCapture('bash', ['-lc', `command -v ${command}`], {
    env: process.env
  });
  return result.code === 0 && Boolean(String(result.stdout || '').trim());
};

const ECC_FINDER_REPO_URL = 'https://github.com/njaupan/ecc_finder.git';
const ECC_FINDER_WORKFLOWS = {
  map_ont: { command: 'map-ont', defaultOutput: 'eccFinder_output', defaultPrefix: 'ecc.ont', readMode: 'ont', runMode: 'mapping' },
  map_sr: { command: 'map-sr', defaultOutput: 'eccFinder_output', defaultPrefix: 'ecc.sr', readMode: 'short', runMode: 'mapping' },
  asm_ont: { command: 'asm-ont', defaultOutput: 'eccFinder_asm_output', defaultPrefix: 'ecc.asm.ont', readMode: 'ont', runMode: 'assembly' },
  asm_sr: { command: 'asm-sr', defaultOutput: 'eccFinder_asm_output', defaultPrefix: 'ecc.asm.sr', readMode: 'short', runMode: 'assembly' }
};
const ECC_FINDER_ENV_NAME = 'ecc_finder';
const ECC_FINDER_REQUIRED_BINARIES = [
  'python',
  'minimap2',
  'bwa',
  'samtools',
  'bedtools',
  'blastn',
  'bowtie2',
  'fastp',
  'freebayes',
  'genrich',
  'TideHunter',
  'cd-hit-est',
  'racon',
  'miniasm',
  'pilon',
  'spades.py',
  'unicycler',
  'seqtk',
  'java',
  'parallel',
  'bioawk'
];
const ECC_FINDER_REQUIRED_PYTHON_MODULES = ['pysam', 'pybedtools', 'numpy', 'pandas', 'matplotlib'];

const shellQuote = (value) => `'${String(value ?? '').replace(/'/g, `'\\''`)}'`;

// Always resolve tool paths relative to __dirname (the app bundle root).
// This is correct both in dev (project root) and in packaged AppImage (/tmp/.mount_XXX/resources/app/).
// Using getWorkspaceRoot() (process.cwd()) is WRONG when packaged — it would be the user's terminal dir.
const getBundleToolsRoot = () => __dirname;
const getDefaultEccFinderPath = () => path.join(getBundleToolsRoot(), 'tools', 'ecc_finder');
// Bundled micromamba-root (read-only inside AppImage squashfs)
const getBundledMicromambaRoot = () => path.join(getBundleToolsRoot(), 'tools', 'micromamba-root');
// Writable micromamba-root (in user's home dir — copied from bundle on first launch)
const getWritableMicromambaRoot = () => path.join(os.homedir(), '.ngr', 'micromamba-root');
// At runtime, use the writable root if copy is done; else the read-only bundled root
const getLocalMicromambaRoot = () => getWritableMicromambaRoot();
const getLocalMicromambaPath = () => path.join(getBundleToolsRoot(), 'tools', 'micromamba', 'bin', process.platform === 'win32' ? 'micromamba.exe' : 'micromamba');

// Whether the bundled (read-only) env exists inside the app bundle
const isBundledEnvPresent = () => fs.existsSync(path.join(getBundledMicromambaRoot(), 'envs', ECC_FINDER_ENV_NAME, 'bin', 'python3.8'));
// Whether the writable copy (~/.ngr) is ready
const isWritableEnvReady = () => fs.existsSync(path.join(getWritableMicromambaRoot(), 'envs', ECC_FINDER_ENV_NAME, 'bin', 'python'));

// Active env bin dir: prefer writable copy, fall back to bundled (for status reporting)
const getEccFinderEnvBinDir = () => {
  const writableBin = path.join(getWritableMicromambaRoot(), 'envs', ECC_FINDER_ENV_NAME, 'bin');
  if (isWritableEnvReady()) return writableBin;
  // Fall back to bundled read-only path (used for status/display only — NOT for running)
  return path.join(getBundledMicromambaRoot(), 'envs', ECC_FINDER_ENV_NAME, 'bin');
};
const getEccFinderEnvPython = () => {
  const writablePython = path.join(getWritableMicromambaRoot(), 'envs', ECC_FINDER_ENV_NAME, 'bin', 'python');
  if (isWritableEnvReady()) return writablePython;
  return path.join(getBundledMicromambaRoot(), 'envs', ECC_FINDER_ENV_NAME, 'bin', 'python3.8');
};
// env is "ready for status display" if either the writable copy OR the bundled env is present
const isEccFinderEnvReady = () => isWritableEnvReady() || isBundledEnvPresent();

// ── First-launch: copy the bundled conda env to a writable location ─────────
// The AppImage squashfs is read-only. micromamba needs a writable MAMBA_ROOT_PREFIX,
// and Python needs to write .pyc cache files. So we copy once to ~/.ngr/micromamba-root.
// This is triggered on app startup (background) and awaited before actually running the pipeline.
let _eccEnvCopyPromise = null;
const ensureEccFinderEnvReady = () => {
  if (_eccEnvCopyPromise) return _eccEnvCopyPromise;
  _eccEnvCopyPromise = (async () => {
    if (isWritableEnvReady()) return { success: true, alreadyReady: true };
    const src = getBundledMicromambaRoot();
    const dst = getWritableMicromambaRoot();
    if (!fs.existsSync(src)) {
      return { success: false, error: `Bundled micromamba-root not found at: ${src}` };
    }
    try {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      // Notify UI that copy is starting
      if (mainAppWindow && !mainAppWindow.isDestroyed()) {
        mainAppWindow.webContents.send('ecc-finder-env-setup', { status: 'copying', message: 'Setting up eccDNA Finder environment for first use (~30s)...' });
      }
      await new Promise((resolve, reject) => {
        const cp = spawn('cp', ['-a', src + '/.', dst + '/'], { stdio: 'pipe' });
        cp.on('close', code => code === 0 ? resolve() : reject(new Error(`cp exited with code ${code}`)));
        cp.on('error', reject);
      });
      if (mainAppWindow && !mainAppWindow.isDestroyed()) {
        mainAppWindow.webContents.send('ecc-finder-env-setup', { status: 'done', message: 'eccDNA Finder environment ready.' });
      }
      return { success: true, alreadyReady: false };
    } catch (err) {
      _eccEnvCopyPromise = null; // allow retry
      if (mainAppWindow && !mainAppWindow.isDestroyed()) {
        mainAppWindow.webContents.send('ecc-finder-env-setup', { status: 'error', message: `Setup failed: ${err.message}` });
      }
      return { success: false, error: err.message };
    }
  })();
  return _eccEnvCopyPromise;
};


const resolveEccFinderPath = (candidatePath = '') => {
  const safePath = String(candidatePath || '').trim();
  if (!safePath) return getDefaultEccFinderPath();
  return path.isAbsolute(safePath)
    ? path.resolve(safePath)
    : path.resolve(getWorkspaceRoot(), safePath);
};

const resolveEccFinderOutputPath = (outputPath = '', workflowMeta = ECC_FINDER_WORKFLOWS.map_ont) => {
  const fallback = workflowMeta?.defaultOutput || 'eccFinder_output';
  const safePath = String(outputPath || fallback).trim() || fallback;
  return path.isAbsolute(safePath)
    ? path.resolve(safePath)
    : path.resolve(getWorkspaceRoot(), safePath);
};

const getEccFinderEnvFile = (toolPath) => (
  process.platform === 'darwin'
    ? path.join(toolPath, 'ecc_finder_MAC.yaml')
    : path.join(toolPath, 'ecc_finder.yaml')
);

// Build the env object to inject into spawned subprocesses.
// Prepends the bundled conda env bin dir to PATH so all tools (bwa, samtools, etc.) are found
// without needing micromamba at runtime.
const buildEccFinderEnv = () => ({
  ...process.env,
  PATH: `${getEccFinderEnvBinDir()}${path.delimiter}${process.env.PATH || ''}`,
  LC_ALL: 'en_US.UTF-8',
  MAMBA_ROOT_PREFIX: getWritableMicromambaRoot()
});

const getEccFinderEnvManager = async () => {
  // If our bundled env is ready (writable copy exists), use direct python path — no manager needed.
  if (isEccFinderEnvReady()) return '__bundled__';
  if (await hasCommand('mamba')) return 'mamba';
  if (await hasCommand('conda')) return 'conda';
  if (await hasCommand('micromamba')) return 'micromamba';
  const localMicromambaPath = getLocalMicromambaPath();
  if (fs.existsSync(localMicromambaPath)) return localMicromambaPath;
  return '';
};

const isMicromambaManager = (manager) => path.basename(String(manager || '')).toLowerCase().startsWith('micromamba');

const buildEccFinderManagerCommand = (manager) => {
  if (manager === '__bundled__') return '';
  const managerText = String(manager || '').trim();
  if (!managerText) return '';
  if (path.isAbsolute(managerText)) {
    return isMicromambaManager(managerText)
      ? `MAMBA_ROOT_PREFIX=${shellQuote(getWritableMicromambaRoot())} ${shellQuote(managerText)}`
      : shellQuote(managerText);
  }
  return managerText;
};

const buildEccFinderEnvRunPrefix = (manager) => {
  if (manager === '__bundled__') return '';
  const managerCommand = buildEccFinderManagerCommand(manager);
  return `${managerCommand} run -n ${shellQuote(ECC_FINDER_ENV_NAME)}`;
};

// Returns the python command to use: direct bundled path preferred (no manager needed at runtime)
const getDefaultEccFinderPythonCommand = () => {
  if (isEccFinderEnvReady()) return shellQuote(getEccFinderEnvPython());
  if (fs.existsSync(getLocalMicromambaPath())) {
    return `MAMBA_ROOT_PREFIX=${shellQuote(getWritableMicromambaRoot())} ${shellQuote(getLocalMicromambaPath())} run -n ${shellQuote(ECC_FINDER_ENV_NAME)} python`;
  }
  return 'conda run -n ecc_finder python';
};

const buildEccFinderEnvInstallCommand = (manager, envFile, environmentInstalled) => {
  const quotedEnvFile = shellQuote(envFile);
  const managerCommand = buildEccFinderManagerCommand(manager);
  if (isMicromambaManager(manager)) {
    return environmentInstalled
      ? `${managerCommand} install -y -n ${shellQuote(ECC_FINDER_ENV_NAME)} -f ${quotedEnvFile}`
      : `${managerCommand} create -y -n ${shellQuote(ECC_FINDER_ENV_NAME)} -f ${quotedEnvFile}`;
  }
  return environmentInstalled
    ? `${managerCommand} env update -n ${shellQuote(ECC_FINDER_ENV_NAME)} -f ${quotedEnvFile} --prune`
    : `${managerCommand} env create -f ${quotedEnvFile}`;
};

const checkEccFinderEnvironment = async (manager) => {
  if (!manager) {
    return {
      environmentInstalled: false,
      dependenciesReady: false,
      missingBinaries: ECC_FINDER_REQUIRED_BINARIES,
      missingPythonModules: ECC_FINDER_REQUIRED_PYTHON_MODULES
    };
  }

  const runPrefix = buildEccFinderEnvRunPrefix(manager);
  const envProbe = await runShellCapture(`${runPrefix} python -c "import sys; print(sys.version.split()[0])"`);
  if (envProbe.code !== 0) {
    return {
      environmentInstalled: false,
      dependenciesReady: false,
      missingBinaries: ECC_FINDER_REQUIRED_BINARIES,
      missingPythonModules: ECC_FINDER_REQUIRED_PYTHON_MODULES
    };
  }

  const binaryProbe = await runShellCapture(`${runPrefix} bash -lc ${shellQuote(`for cmd in ${ECC_FINDER_REQUIRED_BINARIES.map(shellQuote).join(' ')}; do command -v "$cmd" >/dev/null 2>&1 || echo "$cmd"; done`)}`);
  const moduleProbe = await runShellCapture(`${runPrefix} python -c ${shellQuote(`import importlib.util; missing=[m for m in ${JSON.stringify(ECC_FINDER_REQUIRED_PYTHON_MODULES)} if importlib.util.find_spec(m) is None]; print("\\n".join(missing))`)}`);
  const missingBinaries = String(binaryProbe.stdout || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  const missingPythonModules = String(moduleProbe.stdout || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean);

  return {
    environmentInstalled: true,
    dependenciesReady: binaryProbe.code === 0 && moduleProbe.code === 0 && missingBinaries.length === 0 && missingPythonModules.length === 0,
    missingBinaries,
    missingPythonModules,
    pythonVersion: String(envProbe.stdout || '').trim()
  };
};

const getEccFinderStatus = async (sourcePath = '') => {
  const toolPath = resolveEccFinderPath(sourcePath);
  const entryPath = path.join(toolPath, 'ecc_finder.py');
  const envFile = getEccFinderEnvFile(toolPath);
  const hasMamba = await hasCommand('mamba');
  const hasConda = await hasCommand('conda');
  const hasPathMicromamba = await hasCommand('micromamba');
  const localMicromambaPath = getLocalMicromambaPath();
  const hasLocalMicromamba = fs.existsSync(localMicromambaPath);
  const hasMicromamba = hasPathMicromamba || hasLocalMicromamba;
  const bundledEnvReady = isEccFinderEnvReady();
  const bundledEnvPython = getEccFinderEnvPython();

  // If the bundled env is ready (writable copy in ~/.ngr), report it directly without probing conda.
  if (bundledEnvReady) {
    return {
      success: true,
      installed: fs.existsSync(entryPath),
      toolPath,
      entryPath,
      envFile,
      envFileExists: fs.existsSync(envFile),
      repoUrl: ECC_FINDER_REPO_URL,
      hasGit: await hasCommand('git'),
      hasConda,
      hasMamba,
      hasMicromamba,
      hasLocalMicromamba,
      localMicromambaPath,
      environmentManager: '__bundled__',
      bundledEnvReady: true,
      bundledEnvPython,
      environmentInstalled: true,
      dependenciesReady: true,
      missingBinaries: [],
      missingPythonModules: []
    };
  }

  const environmentManager = hasMamba ? 'mamba' : hasConda ? 'conda' : hasPathMicromamba ? 'micromamba' : hasLocalMicromamba ? localMicromambaPath : '';
  const environment = await checkEccFinderEnvironment(environmentManager);
  return {
    success: true,
    installed: fs.existsSync(entryPath),
    toolPath,
    entryPath,
    envFile,
    envFileExists: fs.existsSync(envFile),
    repoUrl: ECC_FINDER_REPO_URL,
    hasGit: await hasCommand('git'),
    hasConda,
    hasMamba,
    hasMicromamba,
    hasLocalMicromamba,
    localMicromambaPath,
    bundledEnvReady: false,
    environmentManager,
    ...environment
  };
};

const buildEccFinderCommand = (payload = {}) => {
  const workflowId = String(payload.workflow || 'map_ont').trim();
  const workflowMeta = ECC_FINDER_WORKFLOWS[workflowId];
  if (!workflowMeta) throw new Error(`Unsupported ecc_finder workflow: ${workflowId}`);

  const toolPath = resolveEccFinderPath(payload.sourcePath);
  const entryPath = path.join(toolPath, 'ecc_finder.py');
  if (!fs.existsSync(entryPath)) {
    throw new Error(`ecc_finder.py was not found at ${entryPath}. Install or choose the ecc_finder folder first.`);
  }

  const pythonCommand = String(payload.pythonCommand || getDefaultEccFinderPythonCommand()).trim() || 'python';
  const outputPath = resolveEccFinderOutputPath(payload.outputPath, workflowMeta);
  const prefix = String(payload.prefix || workflowMeta.defaultPrefix || 'ecc').trim();
  const threads = Number.parseInt(String(payload.threads || ''), 10);
  const aligner = String(payload.aligner || 'bwa').trim();
  const args = [shellQuote(entryPath), workflowMeta.command];

  const requirePath = (key, label) => {
    const value = String(payload[key] || '').trim();
    if (!value) throw new Error(`${label} is required for ${workflowMeta.command}.`);
    return value;
  };

  if (workflowId === 'map_ont') {
    args.push(shellQuote(requirePath('referenceIndex', 'Reference index')));
    args.push(shellQuote(requirePath('query', 'ONT query FASTQ/FASTA')));
    args.push('-r', shellQuote(requirePath('referenceFasta', 'Reference FASTA')));
  } else if (workflowId === 'map_sr') {
    args.push(shellQuote(requirePath('referenceIndex', 'Reference index')));
    args.push(shellQuote(requirePath('query1', 'Forward FASTQ')));
    args.push(shellQuote(requirePath('query2', 'Reverse FASTQ')));
    args.push('-r', shellQuote(requirePath('referenceFasta', 'Reference FASTA')));
    if (aligner) args.push('--aligner', shellQuote(aligner));
  } else if (workflowId === 'asm_ont') {
    args.push(shellQuote(requirePath('query', 'ONT query FASTQ/FASTA')));
  } else if (workflowId === 'asm_sr') {
    args.push(shellQuote(requirePath('query1', 'Forward FASTQ')));
    args.push(shellQuote(requirePath('query2', 'Reverse FASTQ')));
  }

  if (Number.isFinite(threads) && threads > 0) args.push('-t', String(Math.min(128, Math.max(1, threads))));
  if (outputPath) args.push('-o', shellQuote(outputPath));
  if (prefix) args.push('-x', shellQuote(prefix));
  if (payload.overwrite) args.push('-w');
  const minRead = Number.parseInt(String(payload.minRead || ''), 10);
  if (workflowMeta.runMode === 'mapping' && Number.isFinite(minRead) && minRead >= 0) args.push('--min-read', String(minRead));
  if (payload.strictOriginal) args.push('--strict-original');

  return {
    workflowId,
    workflowCommand: workflowMeta.command,
    command: `${pythonCommand} ${args.join(' ')}`,
    toolPath,
    outputPath
  };
};

const VS_CODE_THEME_PARSER_SOURCE = path.join(__dirname, 'native', 'vscode_theme_parser.cpp');
const VS_CODE_THEME_PARSER_BINARY = process.platform === 'win32'
  ? 'vscode_theme_parser.exe'
  : 'vscode_theme_parser';

const getVsCodeThemeParserBinaryPath = () => (
  path.join(app.getPath('userData'), 'native-tools', VS_CODE_THEME_PARSER_BINARY)
);

const ensureVsCodeThemeParserAvailable = () => {
  if (!fs.existsSync(VS_CODE_THEME_PARSER_SOURCE)) {
    throw new Error('The native VS Code theme parser source is missing.');
  }

  const binaryPath = getVsCodeThemeParserBinaryPath();
  const binaryDir = path.dirname(binaryPath);
  fs.mkdirSync(binaryDir, { recursive: true });

  const sourceStat = fs.statSync(VS_CODE_THEME_PARSER_SOURCE);
  const needsBuild = !fs.existsSync(binaryPath) || fs.statSync(binaryPath).mtimeMs < sourceStat.mtimeMs;
  if (!needsBuild) {
    return binaryPath;
  }

  const compilers = process.platform === 'win32'
    ? ['g++', 'clang++']
    : ['g++', 'c++', 'clang++'];

  const failures = [];
  for (const compiler of compilers) {
    const result = spawnSync(
      compiler,
      ['-std=c++17', '-O2', VS_CODE_THEME_PARSER_SOURCE, '-o', binaryPath],
      {
        encoding: 'utf8',
        windowsHide: true
      }
    );

    if (result.status === 0 && fs.existsSync(binaryPath)) {
      try {
        fs.chmodSync(binaryPath, 0o755);
      } catch (_) {
        // Ignore chmod failures on platforms that do not need it.
      }
      return binaryPath;
    }

    const compilerOutput = String(result.stderr || result.stdout || `exit ${result.status}`).trim();
    failures.push(`${compiler}: ${compilerOutput || 'unknown compiler error'}`);
  }

  throw new Error(
    `Failed to build the native VS Code theme parser. ${failures.join(' | ')}`
  );
};

const normalizeImportedVsCodeTheme = (payload, meta = {}) => {
  const safePayload = payload && typeof payload === 'object' ? payload : {};
  const safeColors = safePayload.colors && typeof safePayload.colors === 'object'
    ? safePayload.colors
    : {};

  const label = String(meta.label || safePayload.name || path.basename(String(meta.themePath || safePayload.path || meta.sourcePath || 'theme')))
    .trim();
  const rawType = String(meta.uiTheme || safePayload.type || '').trim().toLowerCase();
  const normalizedType = rawType.includes('light') ? 'light' : 'dark';

  return {
    name: String(safePayload.name || label).trim() || label,
    label: label || 'Imported Theme',
    type: normalizedType,
    sourceType: String(meta.sourceType || 'file').trim() || 'file',
    sourcePath: path.resolve(String(meta.sourcePath || safePayload.path || meta.themePath || '')),
    themePath: path.resolve(String(meta.themePath || safePayload.path || meta.sourcePath || '')),
    extensionName: String(meta.extensionName || '').trim(),
    extensionDisplayName: String(meta.extensionDisplayName || '').trim(),
    extensionPublisher: String(meta.extensionPublisher || '').trim(),
    tokenColorCount: Number(safePayload.tokenColorCount) || 0,
    colors: safeColors
  };
};

const parseVsCodeThemeFile = async (themePath, meta = {}) => {
  const parserBinary = ensureVsCodeThemeParserAvailable();
  const result = await runSpawnCapture(parserBinary, [themePath], {
    env: process.env,
    windowsHide: true
  });

  if (result.code !== 0) {
    throw new Error(String(result.stderr || result.stdout || 'The native theme parser failed.').trim());
  }

  let payload = null;
  try {
    payload = JSON.parse(String(result.stdout || '{}'));
  } catch (err) {
    throw new Error(`The native theme parser returned invalid JSON: ${err.message}`);
  }

  return normalizeImportedVsCodeTheme(payload, meta);
};

const findThemeManifestPath = (rootDir) => {
  const queue = [rootDir];
  const ignored = new Set(['__MACOSX', '.git']);

  while (queue.length > 0) {
    const currentDir = queue.shift();
    let entries = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (_) {
      continue;
    }

    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isFile() && entry.name === 'package.json') {
        try {
          const manifest = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          if (Array.isArray(manifest?.contributes?.themes) && manifest.contributes.themes.length > 0) {
            return fullPath;
          }
        } catch (_) {
          // Keep searching other candidates.
        }
      }
      if (entry.isDirectory() && !ignored.has(entry.name)) {
        queue.push(fullPath);
      }
    }
  }

  return '';
};

const extractVsixArchive = async (archivePath, targetDir) => {
  if (process.platform === 'win32') {
    const powershell = await hasCommand('powershell.exe')
      ? 'powershell.exe'
      : (await hasCommand('powershell') ? 'powershell' : '');

    if (!powershell) {
      throw new Error('PowerShell is required to unpack VSIX files on Windows.');
    }

    const result = await runSpawnCapture(
      powershell,
      [
        '-NoProfile',
        '-Command',
        `Expand-Archive -LiteralPath '${archivePath.replace(/'/g, "''")}' -DestinationPath '${targetDir.replace(/'/g, "''")}' -Force`
      ],
      {
        env: process.env,
        windowsHide: true
      }
    );

    if (result.code !== 0) {
      throw new Error(String(result.stderr || result.stdout || 'Failed to extract the VSIX archive.').trim());
    }
    return;
  }

  if (!(await hasCommand('unzip'))) {
    throw new Error('The `unzip` command is required to import VSIX theme extensions.');
  }

  const result = await runSpawnCapture('unzip', ['-qq', archivePath, '-d', targetDir], {
    env: process.env
  });

  if (result.code !== 0) {
    throw new Error(String(result.stderr || result.stdout || 'Failed to extract the VSIX archive.').trim());
  }
};

const importVsCodeThemeFile = async (selectedPath) => {
  const resolvedPath = path.resolve(String(selectedPath || ''));
  const extension = path.extname(resolvedPath).toLowerCase();

  if (extension === '.vsix') {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode_theme_ext_'));
    try {
      await extractVsixArchive(resolvedPath, tempRoot);
      const manifestPath = findThemeManifestPath(tempRoot);
      if (!manifestPath) {
        throw new Error('No VS Code theme manifest with contributed themes was found in the selected extension.');
      }

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const themes = Array.isArray(manifest?.contributes?.themes) ? manifest.contributes.themes : [];
      if (themes.length === 0) {
        throw new Error('The selected VS Code extension does not contribute any themes.');
      }

      const manifestDir = path.dirname(manifestPath);
      const parsedThemes = [];
      for (const themeEntry of themes) {
        const relativeThemePath = String(themeEntry?.path || '').trim();
        if (!relativeThemePath) continue;

        const absoluteThemePath = path.resolve(manifestDir, relativeThemePath);
        if (!fs.existsSync(absoluteThemePath)) {
          throw new Error(`Theme file declared by the extension was not found: ${relativeThemePath}`);
        }

        const parsedTheme = await parseVsCodeThemeFile(absoluteThemePath, {
          label: String(themeEntry?.label || '').trim(),
          uiTheme: String(themeEntry?.uiTheme || '').trim(),
          sourceType: 'vsix',
          sourcePath: resolvedPath,
          themePath: absoluteThemePath,
          extensionName: String(manifest?.name || '').trim(),
          extensionDisplayName: String(manifest?.displayName || manifest?.name || '').trim(),
          extensionPublisher: String(manifest?.publisher || '').trim()
        });
        parsedThemes.push(parsedTheme);
      }

      if (parsedThemes.length === 0) {
        throw new Error('No readable theme files were found in the selected VS Code extension.');
      }

      return parsedThemes;
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  }

  return [
    await parseVsCodeThemeFile(resolvedPath, {
      sourceType: 'file',
      sourcePath: resolvedPath,
      themePath: resolvedPath
    })
  ];
};

const parseRVersionOutput = (rawOutput = '') => {
  const lines = String(rawOutput).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const versionLine = lines.find((line) => /^R version\s+/i.test(line)) || '';
  const versionMatch = versionLine.match(/^R version\s+([0-9]+\.[0-9]+(?:\.[0-9]+)?)/i);
  const version = versionMatch ? versionMatch[1] : null;
  return {
    version,
    line: versionLine || (lines[0] || '')
  };
};

const getRVersionDetails = async () => {
  const commands = [
    { cmd: 'R', args: ['--version'] },
    { cmd: 'Rscript', args: ['--version'] }
  ];

  for (const command of commands) {
    const result = await runSpawnCapture(command.cmd, command.args, {
      env: process.env,
      windowsHide: true
    });
    const combinedOutput = `${result.stdout || ''}\n${result.stderr || ''}`;
    const parsed = parseRVersionOutput(combinedOutput);
    if (result.code === 0 && parsed.line) {
      return { success: true, version: parsed.version, line: parsed.line };
    }
  }

  return {
    success: false,
    error: 'R is not installed or not available in PATH.'
  };
};

const getRUpdatePlan = async () => {
  if (process.platform === 'win32') {
    const wingetInstalled = await hasCommand('winget');
    const command = 'winget upgrade --id RProject.R --exact --silent --accept-package-agreements --accept-source-agreements';
    if (!wingetInstalled) {
      return {
        success: false,
        requiresManual: true,
        error: 'winget is not available on this system.',
        command
      };
    }
    return {
      success: true,
      shellCommand: command,
      manualCommand: command
    };
  }

  if (process.platform === 'darwin') {
    const brewInstalled = await hasCommand('brew');
    const command = 'brew update && brew upgrade --cask r';
    if (!brewInstalled) {
      return {
        success: false,
        requiresManual: true,
        error: 'Homebrew is not installed.',
        command
      };
    }
    return {
      success: true,
      shellCommand: command,
      manualCommand: command
    };
  }

  if (process.platform === 'linux') {
    const aptInstalled = await hasCommand('apt-get');
    const dnfInstalled = await hasCommand('dnf');
    const pacmanInstalled = await hasCommand('pacman');
    const zypperInstalled = await hasCommand('zypper');
    const pkexecInstalled = await hasCommand('pkexec');
    const sudoInstalled = await hasCommand('sudo');

    const wrapAutoPrivilege = (innerCommand) => {
      if (pkexecInstalled) return `pkexec bash -lc '${innerCommand}'`;
      if (sudoInstalled) return `sudo -n bash -lc '${innerCommand}'`;
      return null;
    };
    const wrapManualPrivilege = (innerCommand) => {
      if (sudoInstalled) return `sudo bash -lc '${innerCommand}'`;
      return innerCommand;
    };

    if (aptInstalled) {
      const innerCommand = 'DEBIAN_FRONTEND=noninteractive apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --only-upgrade r-base r-base-core';
      const autoCommand = wrapAutoPrivilege(innerCommand);
      const manualCommand = wrapManualPrivilege(innerCommand);
      if (!autoCommand) {
        return {
          success: false,
          requiresManual: true,
          error: 'Administrator privileges are required to update R.',
          command: manualCommand
        };
      }
      return {
        success: true,
        shellCommand: autoCommand,
        manualCommand
      };
    }

    if (dnfInstalled) {
      const innerCommand = 'dnf upgrade -y R';
      const autoCommand = wrapAutoPrivilege(innerCommand);
      const manualCommand = wrapManualPrivilege(innerCommand);
      if (!autoCommand) {
        return {
          success: false,
          requiresManual: true,
          error: 'Administrator privileges are required to update R.',
          command: manualCommand
        };
      }
      return {
        success: true,
        shellCommand: autoCommand,
        manualCommand
      };
    }

    if (pacmanInstalled) {
      const innerCommand = 'pacman -Syu --noconfirm r';
      const autoCommand = wrapAutoPrivilege(innerCommand);
      const manualCommand = wrapManualPrivilege(innerCommand);
      if (!autoCommand) {
        return {
          success: false,
          requiresManual: true,
          error: 'Administrator privileges are required to update R.',
          command: manualCommand
        };
      }
      return {
        success: true,
        shellCommand: autoCommand,
        manualCommand
      };
    }

    if (zypperInstalled) {
      const innerCommand = 'zypper --non-interactive update R-base';
      const autoCommand = wrapAutoPrivilege(innerCommand);
      const manualCommand = wrapManualPrivilege(innerCommand);
      if (!autoCommand) {
        return {
          success: false,
          requiresManual: true,
          error: 'Administrator privileges are required to update R.',
          command: manualCommand
        };
      }
      return {
        success: true,
        shellCommand: autoCommand,
        manualCommand
      };
    }

    return {
      success: false,
      requiresManual: true,
      error: 'No supported Linux package manager detected for automatic R upgrade.',
      command: 'Use your distribution package manager to upgrade R.'
    };
  }

  return {
    success: false,
    requiresManual: true,
    error: `Automatic R update is not supported on platform: ${process.platform}`
  };
};

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const sendMenuActionToRenderer = (channel, payload = null) => {
  const targetWindow = BrowserWindow.getFocusedWindow() || mainAppWindow;
  if (!targetWindow || targetWindow.isDestroyed()) return;
  targetWindow.webContents.send(channel, payload);
};

const buildAppMenu = () => {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { label: 'Windows', role: 'windowMenu' },
    {
      label: 'Help',
      role: 'help',
      submenu: [
        {
          label: 'Electron Documentation',
          click: async () => {
            await shell.openExternal('https://www.electronjs.org/docs/latest');
          }
        }
      ]
    },
    {
      label: '▤ R Wraper',
      accelerator: isMac ? 'Cmd+Alt+W' : 'Ctrl+Alt+W',
      click: () => sendMenuActionToRenderer('menu-open-r-wrapper')
    },
    {
      label: '⟳ Update 4.5.3',
      accelerator: isMac ? 'Cmd+Alt+U' : 'Ctrl+Alt+U',
      click: () => sendMenuActionToRenderer('menu-update-r-version')
    },
    {
      label: '✶ AI Assistant',
      accelerator: isMac ? 'Cmd+Alt+A' : 'Ctrl+Alt+A',
      click: () => sendMenuActionToRenderer('menu-open-ai-assistant')
    }
  ];
  return Menu.buildFromTemplate(template);
};

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280, // Adjusted default size
    height: 800,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Enabled preload
      contextIsolation: true,
      nodeIntegration: false,
    },
    // icon: path.join(__dirname, 'assets', 'icon.png') // Optional: create an assets folder with icon.png
  });

  const startUrl = process.env.ELECTRON_START_URL || url.format({
    pathname: path.join(__dirname, 'react-app/dist/index.html'),
    protocol: 'file:',
    slashes: true,
  });

  console.log(`Loading URL: ${startUrl}`);
  mainWindow.loadURL(startUrl);
  mainWindow.setMenuBarVisibility(false);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Optional: Open DevTools automatically if not in production
  // if (!app.isPackaged) {
  //   mainWindow.webContents.openDevTools();
  // }

  mainAppWindow = mainWindow;

  mainWindow.on('closed', () => {
    mainAppWindow = null;
  });
}

app.whenReady().then(() => {
  app.userAgentFallback = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  const setupSessionEvasion = (sess) => {
    sess.webRequest.onBeforeSendHeaders((details, callback) => {
      details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
      details.requestHeaders['sec-ch-ua'] = '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"';
      details.requestHeaders['sec-ch-ua-mobile'] = '?0';
      details.requestHeaders['sec-ch-ua-platform'] = '"Windows"';
      callback({ cancel: false, requestHeaders: details.requestHeaders });
    });
  };

  setupSessionEvasion(session.defaultSession);
  try {
    setupSessionEvasion(session.fromPartition(EXTENSION_PARTITION));
  } catch (e) { }

  createWindow();
  Menu.setApplicationMenu(null);

  // ── R package warm-up ─────────────────────────────────────────────────────
  // Pre-load heavy R packages 2s after app start so the OS file cache has them
  // in RAM. Subsequent Rscript spawns load from cache (~3-10x faster cold start).
  setTimeout(() => {
    const localLib = path.join(__dirname, 'r-libs').replace(/\\/g, '/');
    const warmupScript = [
      `local_lib <- "${localLib}";`,
      `.libPaths(c(local_lib, .libPaths()));`,
      `pkgs <- c("ggplot2","reshape2","dunn.test","multcompView","cluster","openxlsx","jsonlite","RColorBrewer","viridisLite");`,
      `for(p in pkgs) tryCatch(suppressMessages(library(p,character.only=TRUE,lib.loc=local_lib,warn.conflicts=FALSE)),error=function(e)NULL);`,
      `message("[R warm-up] packages ready.");`
    ].join('\n');
    const warmup = spawn('Rscript', ['--no-restore', '--no-save', '-e', warmupScript], {
      cwd: __dirname, stdio: ['ignore', 'ignore', 'pipe']
    });
    warmup.stderr.on('data', (d) => console.log('[R warm-up]', d.toString().trim()));
    warmup.on('error', (e) => console.warn('[R warm-up] failed:', e.message));
  }, 2000);
  // ──────────────────────────────────────────────────────────────────────────

  // ── eccDNA Finder env: start background copy to ~/.ngr on first launch ────
  // Runs silently 3s after startup. By the time the user opens eccFinder, copy is done or in progress.
  setTimeout(() => {
    if (!isWritableEnvReady() && isBundledEnvPresent()) {
      console.log('[eccFinder] Starting background env copy to ~/.ngr (first launch)...');
      ensureEccFinderEnvReady().then(result => {
        console.log('[eccFinder] Background env copy result:', result);
      }).catch(err => {
        console.warn('[eccFinder] Background env copy error:', err?.message || err);
      });
    }
  }, 3000);
  // ──────────────────────────────────────────────────────────────────────────

  const analysisWrapperPath = path.join(__dirname, 'analysis_wrapper.R');
  const analysisWrapperBackupPath = `${analysisWrapperPath}.bak`;
  const analysisWrapperSafePath = `${analysisWrapperPath}.safe`;
  const rEditorWorkerScriptPath = path.join(__dirname, 'analysis_worker.R');
  const R_EDITOR_WORKER_IDLE_MS = 10 * 60 * 1000;
  const R_EDITOR_WORKER_READY_TIMEOUT_MS = 12000;
  const R_EDITOR_WORKER_REQUEST_TIMEOUT_MS = 180000;

  let rEditorWorkerProcess = null;
  let rEditorWorkerReady = false;
  let rEditorWorkerStartPromise = null;
  let rEditorWorkerReadyResolver = null;
  let rEditorWorkerReadyRejecter = null;
  let rEditorWorkerReadyTimer = null;
  let rEditorWorkerStdoutBuffer = '';
  let rEditorWorkerNextRequestId = 1;
  let rEditorWorkerActiveSender = null;
  const rEditorWorkerPending = new Map();
  let rEditorWorkerQueue = Promise.resolve();
  let rEditorWorkerIdleTimer = null;
  let analysisWrapperHealthCache = {
    ok: false,
    fingerprint: ''
  };

  const getWrapperFingerprint = (scriptPath) => {
    try {
      const stats = fs.statSync(scriptPath);
      return [scriptPath, stats.size, stats.mtimeMs, stats.ctimeMs].join(':');
    } catch (_) {
      return '';
    }
  };

  const checkRScriptSyntax = (scriptPath) => {
    try {
      if (!scriptPath || !fs.existsSync(scriptPath)) {
        return { ok: false, stderr: `Missing R script: ${scriptPath || '<empty path>'}` };
      }
      const checkExpr = 'args <- commandArgs(trailingOnly = TRUE); invisible(parse(file = args[[1]])); cat("OK\\n")';
      const proc = spawnSync(
        'Rscript',
        ['--no-restore', '--no-save', '-e', checkExpr, scriptPath],
        { cwd: __dirname, encoding: 'utf8' }
      );
      const stderr = String(proc.stderr || '').trim();
      const stdout = String(proc.stdout || '').trim();
      return {
        ok: Number(proc.status) === 0,
        status: proc.status,
        signal: proc.signal,
        stderr,
        stdout
      };
    } catch (err) {
      return { ok: false, stderr: `Syntax check failed: ${err.message}` };
    }
  };

  const formatSyntaxFailure = (check, label) => {
    const detail = (check?.stderr || check?.stdout || 'Unknown parse failure').trim();
    return `${label} syntax invalid.\n${detail}`;
  };

  const writeFileAtomicUtf8 = (targetPath, content) => {
    const tmpPath = `${targetPath}.tmp_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    try {
      fs.writeFileSync(tmpPath, String(content ?? ''), 'utf8');
      fs.renameSync(tmpPath, targetPath);
    } catch (err) {
      try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (_) { }
      throw err;
    }
  };

  const validateRScriptContent = (content) => {
    const tmpPath = path.join(os.tmpdir(), `analysis_wrapper_validate_${Date.now()}_${Math.floor(Math.random() * 100000)}.R`);
    try {
      fs.writeFileSync(tmpPath, String(content ?? ''), 'utf8');
      return checkRScriptSyntax(tmpPath);
    } finally {
      try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (_) { }
    }
  };

  const snapshotAnalysisWrapperSafe = () => {
    const primaryCheck = checkRScriptSyntax(analysisWrapperPath);
    if (!primaryCheck.ok) {
      return { ok: false, reason: formatSyntaxFailure(primaryCheck, 'analysis_wrapper.R') };
    }
    try {
      fs.copyFileSync(analysisWrapperPath, analysisWrapperSafePath);
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: `Failed to snapshot analysis wrapper: ${err.message}` };
    }
  };

  const ensureAnalysisWrapperUsable = () => {
    const currentFingerprint = getWrapperFingerprint(analysisWrapperPath);
    if (
      currentFingerprint
      && analysisWrapperHealthCache.ok
      && analysisWrapperHealthCache.fingerprint === currentFingerprint
    ) {
      return { ok: true, recovered: false, path: analysisWrapperPath, cached: true };
    }

    const primaryCheck = checkRScriptSyntax(analysisWrapperPath);
    if (primaryCheck.ok) {
      // Keep a rolling known-good snapshot for automatic recovery.
      try { fs.copyFileSync(analysisWrapperPath, analysisWrapperSafePath); } catch (_) { }
      analysisWrapperHealthCache = { ok: true, fingerprint: currentFingerprint || getWrapperFingerprint(analysisWrapperPath) };
      return { ok: true, recovered: false, path: analysisWrapperPath };
    }

    const recoveryCandidates = [analysisWrapperSafePath, analysisWrapperBackupPath];
    for (const candidate of recoveryCandidates) {
      if (!candidate || !fs.existsSync(candidate)) continue;
      const candidateCheck = checkRScriptSyntax(candidate);
      if (!candidateCheck.ok) continue;
      try {
        fs.copyFileSync(candidate, analysisWrapperPath);
        try { fs.copyFileSync(analysisWrapperPath, analysisWrapperSafePath); } catch (_) { }
        analysisWrapperHealthCache = { ok: true, fingerprint: getWrapperFingerprint(analysisWrapperPath) };
        return {
          ok: true,
          recovered: true,
          path: analysisWrapperPath,
          source: candidate
        };
      } catch (err) {
        return {
          ok: false,
          reason: `Failed to recover analysis wrapper from ${candidate}: ${err.message}`
        };
      }
    }

    analysisWrapperHealthCache = { ok: false, fingerprint: '' };
    return {
      ok: false,
      reason: formatSyntaxFailure(primaryCheck, 'analysis_wrapper.R'),
      details: primaryCheck.stderr || primaryCheck.stdout || ''
    };
  };

  // Initialize a known-good snapshot if possible; do not block app startup.
  const snapshotInit = snapshotAnalysisWrapperSafe();
  if (!snapshotInit.ok) {
    console.warn('[R wrapper]', snapshotInit.reason);
  }

  const clearREditorWorkerReadyTimer = () => {
    if (rEditorWorkerReadyTimer) {
      clearTimeout(rEditorWorkerReadyTimer);
      rEditorWorkerReadyTimer = null;
    }
  };

  const clearREditorWorkerIdleTimer = () => {
    if (rEditorWorkerIdleTimer) {
      clearTimeout(rEditorWorkerIdleTimer);
      rEditorWorkerIdleTimer = null;
    }
  };

  const rejectREditorWorkerPending = (message = 'R editor worker stopped.') => {
    rEditorWorkerPending.forEach((pending) => {
      if (pending?.timeoutId) clearTimeout(pending.timeoutId);
      if (pending?.reject) pending.reject(new Error(message));
    });
    rEditorWorkerPending.clear();
  };

  const resetREditorWorkerState = () => {
    rEditorWorkerProcess = null;
    rEditorWorkerReady = false;
    rEditorWorkerStdoutBuffer = '';
    rEditorWorkerActiveSender = null;
    rEditorWorkerStartPromise = null;
    rEditorWorkerReadyResolver = null;
    rEditorWorkerReadyRejecter = null;
    clearREditorWorkerReadyTimer();
  };

  const stopREditorWorker = (reason = 'manual stop') => {
    clearREditorWorkerIdleTimer();
    if (rEditorWorkerProcess && !rEditorWorkerProcess.killed) {
      try {
        rEditorWorkerProcess.kill();
      } catch (err) {
        console.warn(`[R editor worker] kill failed (${reason}):`, err.message);
      }
    }
    resetREditorWorkerState();
    rejectREditorWorkerPending(`R editor worker stopped: ${reason}`);
  };

  const scheduleREditorWorkerIdleStop = () => {
    clearREditorWorkerIdleTimer();
    if (rEditorWorkerPending.size > 0) return;
    rEditorWorkerIdleTimer = setTimeout(() => {
      stopREditorWorker('idle timeout');
    }, R_EDITOR_WORKER_IDLE_MS);
  };

  const handleREditorWorkerResponse = (payload) => {
    const responseId = Number(payload?.id);
    if (!Number.isFinite(responseId)) return;
    const pending = rEditorWorkerPending.get(responseId);
    if (!pending) return;
    rEditorWorkerPending.delete(responseId);
    if (pending.timeoutId) clearTimeout(pending.timeoutId);
    if (rEditorWorkerPending.size === 0) {
      rEditorWorkerActiveSender = null;
    }
    pending.resolve({
      code: Number(payload?.code) || 0,
      stdout: typeof payload?.stdout === 'string' ? payload.stdout : '',
      stderr: typeof payload?.stderr === 'string' ? payload.stderr : ''
    });
    scheduleREditorWorkerIdleStop();
  };

  const handleREditorWorkerStdout = (chunk) => {
    rEditorWorkerStdoutBuffer += chunk;
    let newlineIndex = rEditorWorkerStdoutBuffer.indexOf('\n');
    while (newlineIndex >= 0) {
      const rawLine = rEditorWorkerStdoutBuffer.slice(0, newlineIndex);
      rEditorWorkerStdoutBuffer = rEditorWorkerStdoutBuffer.slice(newlineIndex + 1);
      const line = rawLine.trim();
      if (line) {
        let payload = null;
        try {
          payload = JSON.parse(line);
        } catch (_) {
          console.warn('[R editor worker] Non-JSON stdout:', line.slice(0, 300));
        }
        if (payload && payload.type === 'ready') {
          rEditorWorkerReady = true;
          clearREditorWorkerReadyTimer();
          if (typeof rEditorWorkerReadyResolver === 'function') {
            rEditorWorkerReadyResolver();
            rEditorWorkerReadyResolver = null;
            rEditorWorkerReadyRejecter = null;
          }
        } else if (payload && payload.type === 'response') {
          handleREditorWorkerResponse(payload);
        } else if (payload && payload.type === 'fatal') {
          const message = payload.error || 'Unknown worker startup failure.';
          if (typeof rEditorWorkerReadyRejecter === 'function') {
            rEditorWorkerReadyRejecter(new Error(message));
            rEditorWorkerReadyResolver = null;
            rEditorWorkerReadyRejecter = null;
          }
          stopREditorWorker(message);
        }
      }
      newlineIndex = rEditorWorkerStdoutBuffer.indexOf('\n');
    }
  };

  const ensureREditorWorker = () => {
    if (rEditorWorkerProcess && rEditorWorkerReady && !rEditorWorkerProcess.killed) {
      return Promise.resolve();
    }
    if (rEditorWorkerStartPromise) {
      return rEditorWorkerStartPromise;
    }
    const wrapperHealth = ensureAnalysisWrapperUsable();
    if (!wrapperHealth.ok) {
      return Promise.reject(new Error(wrapperHealth.reason || 'analysis_wrapper.R is not valid.'));
    }
    if (!fs.existsSync(rEditorWorkerScriptPath)) {
      return Promise.reject(new Error('analysis_worker.R is missing.'));
    }

    rEditorWorkerStartPromise = new Promise((resolve, reject) => {
      const workerEnv = { ...process.env, ANALYSIS_WRAPPER_EMBEDDED: '1' };
      const proc = spawn(
        'Rscript',
        ['--no-restore', '--no-save', rEditorWorkerScriptPath, analysisWrapperPath],
        { cwd: getWorkspaceRoot(), env: workerEnv }
      );

      rEditorWorkerProcess = proc;
      rEditorWorkerReady = false;
      rEditorWorkerStdoutBuffer = '';
      rEditorWorkerReadyResolver = resolve;
      rEditorWorkerReadyRejecter = reject;

      proc.stdout.on('data', (data) => {
        handleREditorWorkerStdout(data.toString());
      });

      proc.stderr.on('data', (data) => {
        const str = data.toString();
        console.log('[R editor worker]', str.trim());
        if (rEditorWorkerActiveSender && !rEditorWorkerActiveSender.isDestroyed()) {
          try {
            rEditorWorkerActiveSender.send('r-console-log', str);
          } catch (_) {
            // Ignore sender delivery errors.
          }
        }
      });

      proc.on('error', (err) => {
        if (typeof rEditorWorkerReadyRejecter === 'function') {
          rEditorWorkerReadyRejecter(err);
          rEditorWorkerReadyResolver = null;
          rEditorWorkerReadyRejecter = null;
        }
        stopREditorWorker(`spawn error: ${err.message}`);
      });

      proc.on('close', (code) => {
        const closeMsg = `R editor worker exited with code ${code}`;
        if (rEditorWorkerProcess === proc) {
          rEditorWorkerProcess = null;
          rEditorWorkerReady = false;
        }
        if (typeof rEditorWorkerReadyRejecter === 'function' && !rEditorWorkerReady) {
          rEditorWorkerReadyRejecter(new Error(closeMsg));
          rEditorWorkerReadyResolver = null;
          rEditorWorkerReadyRejecter = null;
        }
        stopREditorWorker(closeMsg);
      });

      clearREditorWorkerReadyTimer();
      rEditorWorkerReadyTimer = setTimeout(() => {
        if (!rEditorWorkerReady) {
          if (typeof rEditorWorkerReadyRejecter === 'function') {
            rEditorWorkerReadyRejecter(new Error('Timed out waiting for R editor worker readiness.'));
            rEditorWorkerReadyResolver = null;
            rEditorWorkerReadyRejecter = null;
          }
          stopREditorWorker('ready timeout');
        }
      }, R_EDITOR_WORKER_READY_TIMEOUT_MS);
    }).finally(() => {
      rEditorWorkerStartPromise = null;
    });

    return rEditorWorkerStartPromise;
  };

  const enqueueREditorWorkerTask = (task) => {
    const chained = rEditorWorkerQueue.then(task, task);
    rEditorWorkerQueue = chained.catch(() => { });
    return chained;
  };

  const runAnalysisInREditorWorker = async (trailingArgs, sender) => {
    await ensureREditorWorker();

    if (!rEditorWorkerProcess || rEditorWorkerProcess.killed) {
      throw new Error('R editor worker is not running.');
    }

    const requestId = rEditorWorkerNextRequestId++;
    const safeArgs = Array.isArray(trailingArgs)
      ? trailingArgs.map((value) => String(value ?? ''))
      : [];

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        rEditorWorkerPending.delete(requestId);
        if (rEditorWorkerPending.size === 0) {
          rEditorWorkerActiveSender = null;
        }
        reject(new Error('R editor worker request timed out.'));
        stopREditorWorker('request timeout');
      }, R_EDITOR_WORKER_REQUEST_TIMEOUT_MS);

      rEditorWorkerPending.set(requestId, { resolve, reject, timeoutId });
      rEditorWorkerActiveSender = sender && !sender.isDestroyed() ? sender : null;
      clearREditorWorkerIdleTimer();

      const payload = JSON.stringify({ type: 'run', id: requestId, args: safeArgs });
      rEditorWorkerProcess.stdin.write(`${payload}\n`, (err) => {
        if (err) {
          const pending = rEditorWorkerPending.get(requestId);
          if (pending) {
            if (pending.timeoutId) clearTimeout(pending.timeoutId);
            rEditorWorkerPending.delete(requestId);
            pending.reject(new Error(`Failed to write to R editor worker: ${err.message}`));
          }
          if (rEditorWorkerPending.size === 0) {
            rEditorWorkerActiveSender = null;
          }
          stopREditorWorker(`stdin write failure: ${err.message}`);
        }
      });
    });
  };

  // Pre-start the persistent worker shortly after app startup to reduce first-run latency.
  setTimeout(() => {
    ensureREditorWorker()
      .then(() => {
        console.log('[R editor worker] pre-warm ready.');
      })
      .catch((err) => {
        console.warn('[R editor worker] pre-warm failed:', err?.message || err);
      });
  }, 2500);

  let pendingPrompts = {};
  let pendingFilePaths = {};


  ipcMain.on('log-message', (event, payload) => {
    console.log(`[Extension Debug]: [${payload.source || 'Preload'}] ${payload.message}`);
  });

  ipcMain.on('window-minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });

  ipcMain.on('window-toggle-maximize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window?.isMaximized()) window.unmaximize();
    else window?.maximize();
  });

  ipcMain.on('window-close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });

  ipcMain.handle('check-for-prompt', (event) => {
    const prompt = pendingPrompts[event.sender.id];
    if (prompt) {
      console.log(`Sending pending prompt to webContents ${event.sender.id}`);
      delete pendingPrompts[event.sender.id];
      return prompt;
    }
    return null;
  });

  ipcMain.handle('check-for-attach-file', (event) => {
    const filePath = pendingFilePaths[event.sender.id];
    if (filePath) {
      console.log(`Sending pending attachment to webContents ${event.sender.id}`);
      delete pendingFilePaths[event.sender.id];
      return filePath;
    }
    return null;
  });

  ipcMain.on('log-debug', (event, msg) => {
    console.log(`[Extension Debug]: ${msg}`);
  });

  ipcMain.handle('import-vscode-theme', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Import VS Code Theme',
      properties: ['openFile'],
      filters: [
        { name: 'VS Code Theme Files', extensions: ['vsix', 'json', 'code-theme'] }
      ]
    });

    if (canceled || !Array.isArray(filePaths) || filePaths.length === 0) {
      return {
        canceled: true,
        themes: []
      };
    }

    const selectedPath = path.resolve(filePaths[0]);
    try {
      const themes = await importVsCodeThemeFile(selectedPath);
      return {
        canceled: false,
        sourcePath: selectedPath,
        themes
      };
    } catch (err) {
      return {
        canceled: false,
        sourcePath: selectedPath,
        themes: [],
        error: String(err?.message || err || 'Failed to import the selected VS Code theme.')
      };
    }
  });

  let chatGPTWindow = null;
  let geminiWindow = null;
  let claudeWindow = null;
  let deepseekWindow = null;
  let qwenWindow = null;
  let manusWindow = null;
  let embeddedBrowserWindow = null;

  ipcMain.handle('open-extension-browser', async (event, startUrl = '', prompt = '', background = false, provider = 'chatgpt', filePath = '') => {
    const providerKey = String(provider || 'browser').toLowerCase();
    const aiProviderConfig = {
      chatgpt: { defaultUrl: 'https://chatgpt.com', preload: path.join(__dirname, 'chatgpt_preload.js'), hostHint: 'chatgpt.com' },
      openai: { defaultUrl: 'https://chatgpt.com', preload: path.join(__dirname, 'chatgpt_preload.js'), hostHint: 'chatgpt.com' },
      gemini: { defaultUrl: 'https://gemini.google.com', preload: path.join(__dirname, 'gemini_preload.js'), hostHint: 'gemini.google.com' },
      claude: { defaultUrl: 'https://claude.ai', preload: path.join(__dirname, 'claude_preload.js'), hostHint: 'claude.ai' },
      anthropic: { defaultUrl: 'https://claude.ai', preload: path.join(__dirname, 'claude_preload.js'), hostHint: 'claude.ai' },
      deepseek: { defaultUrl: 'https://chat.deepseek.com', preload: path.join(__dirname, 'deepseek_preload.js'), hostHint: 'deepseek.com' },
      qwen: { defaultUrl: 'https://chat.qwen.ai', preload: path.join(__dirname, 'qwen_preload.js'), hostHint: 'qwen.ai' },
      manus: { defaultUrl: 'https://manus.im', preload: path.join(__dirname, 'manus_preload.js'), hostHint: 'manus.im' },
      nvidia: { defaultUrl: 'https://build.nvidia.com', preload: path.join(__dirname, 'chatgpt_preload.js'), hostHint: 'nvidia.com' }
    };
    const providerConfig = aiProviderConfig[providerKey];
    const isGenericBrowser = !providerConfig || providerKey === 'browser';

    let urlToLoad = startUrl;
    if (!urlToLoad) {
      urlToLoad = isGenericBrowser ? 'https://www.google.com' : providerConfig.defaultUrl;
    }

    if (!background && !isGenericBrowser) {
      await ensureExtensionLoaded();
    }

    const getProviderWindow = () => {
      if (isGenericBrowser) return embeddedBrowserWindow;
      if (providerKey === 'gemini') return geminiWindow;
      if (providerKey === 'claude' || providerKey === 'anthropic') return claudeWindow;
      if (providerKey === 'deepseek') return deepseekWindow;
      if (providerKey === 'qwen') return qwenWindow;
      if (providerKey === 'manus') return manusWindow;
      return chatGPTWindow;
    };

    const setProviderWindow = (win) => {
      if (isGenericBrowser) {
        embeddedBrowserWindow = win;
        return;
      }
      if (providerKey === 'gemini') geminiWindow = win;
      else if (providerKey === 'claude' || providerKey === 'anthropic') claudeWindow = win;
      else if (providerKey === 'deepseek') deepseekWindow = win;
      else if (providerKey === 'qwen') qwenWindow = win;
      else if (providerKey === 'manus') manusWindow = win;
      else chatGPTWindow = win;
    };

    let browserWindow = getProviderWindow();
    if (browserWindow && !browserWindow.isDestroyed()) {
      console.log(`Reusing existing ${isGenericBrowser ? 'browser' : providerKey} window`);
      if (background) {
        browserWindow.hide();
        browserWindow.webContents.setBackgroundThrottling(false);
      } else {
        browserWindow.show();
        browserWindow.focus();
        browserWindow.webContents.setBackgroundThrottling(false);
      }
    } else {
      console.log(`Creating new ${isGenericBrowser ? 'browser' : providerKey} window`);
      browserWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: !background,
        webPreferences: isGenericBrowser
          ? {
            contextIsolation: true,
            nodeIntegration: false,
            partition: EXTENSION_PARTITION,
            backgroundThrottling: false
          }
          : {
            contextIsolation: false,
            nodeIntegration: true,
            partition: EXTENSION_PARTITION,
            preload: providerConfig.preload,
            backgroundThrottling: false,
            // EVASION: Hide webdriver property
            enableRemoteModule: false,
          }
      });

      // EVASION: Set realistic User Agent (matching app.userAgentFallback and onBeforeSendHeaders)
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
      browserWindow.webContents.setUserAgent(userAgent);

      // EVASION: Remove navigator.webdriver via CDP or script
      browserWindow.webContents.on('dom-ready', () => {
        browserWindow.webContents.executeJavaScript(`
            Object.defineProperty(navigator, 'webdriver', {
              get: () => undefined
            });
            // Additional evasion for Google/Cloudflare bot detection
            if (["manus", "gemini", "deepseek", "qwen"].includes("${providerKey}")) {
                window.chrome = { runtime: {} };
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [1, 2, 3]
                });
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['en-US', 'en']
                });
            }
          `).catch((err) => {
          console.warn('Failed to override navigator.webdriver:', err.message || err);
        });
      });

      setProviderWindow(browserWindow);
    }

    const currentUrl = browserWindow.webContents.getURL();
    const sameHost = (() => {
      if (!currentUrl) return false;
      if (isGenericBrowser) {
        try {
          return new URL(currentUrl).host === new URL(urlToLoad).host;
        } catch (e) {
          return false;
        }
      }
      return currentUrl.includes(providerConfig.hostHint) && urlToLoad.includes(providerConfig.hostHint);
    })();

    if (!sameHost || !currentUrl) {
      console.log(`Loading URL: ${urlToLoad}`);
      try {
        await browserWindow.loadURL(urlToLoad);
      } catch (err) {
        console.warn(`Failed to load URL ${urlToLoad}:`, err.message || err);
      }
    } else {
      console.log('URL already loaded, skipping reload to preserve context');
    }

    if (!isGenericBrowser && (prompt || filePath)) {
      if (prompt) {
        console.log(`Storing prompt for webContents ${browserWindow.webContents.id}`);
        pendingPrompts[browserWindow.webContents.id] = prompt;
      }
      if (filePath) {
        console.log(`Storing file path for webContents ${browserWindow.webContents.id}`);
        pendingFilePaths[browserWindow.webContents.id] = filePath;
      }

      if (!browserWindow.webContents.isLoading()) {
        setTimeout(() => {
          if (!browserWindow.isDestroyed()) {
            if (prompt) {
              console.log('Pushing prompt immediately (window already loaded)');
              browserWindow.webContents.send('inject-prompt', prompt);
            }
            if (filePath) {
              console.log('Pushing file attachment immediately (window already loaded)');
              browserWindow.webContents.send('attach-file', filePath);
            }
          }
        }, 200);
      }

      browserWindow.webContents.on('did-finish-load', () => {
        setTimeout(() => {
          if (!browserWindow.isDestroyed() && pendingPrompts[browserWindow.webContents.id]) {
            console.log('Pushing prompt via did-finish-load (fallback)');
            browserWindow.webContents.send('inject-prompt', prompt);
          }
        }, 3000);
      });
    }

    if (background) {
      setTimeout(() => {
        const win = getProviderWindow();
        if (win && !win.isDestroyed() && !win.isVisible()) {
          console.log('Background task timeout check (60s)...');
        }
      }, 60000);
    }

    return true;
  });

  // Global listener for ChatGPT responses (Singleton Pattern)
  // We only attach this ONCE.
  if (!ipcMain.listenerCount('chatgpt-response-extracted')) {
    ipcMain.on('chatgpt-response-extracted', (event, responseText) => {
      console.log(`[Main] Received extracted response from ${event.sender.id}`);

      if (!chatGPTWindow || chatGPTWindow.isDestroyed()) {
        console.log("[Main] Warning: ChatGPT window is gone.");
        return;
      }

      // Verify sender is our ChatGPT window
      if (event.sender.id !== chatGPTWindow.webContents.id) {
        console.log("[Main] Warning: Received response from unknown sender.");
        return;
      }

      if (mainAppWindow && !mainAppWindow.isDestroyed()) {
        console.log(`[Main] Sending chatgpt-response to mainWindow (ID: ${mainAppWindow.id})`);
        mainAppWindow.webContents.send('chatgpt-response', responseText, true);
      } else {
        console.error("[Main] CRITICAL: Main window not found or destroyed!");
      }

      // Handle background visibility
      if (!chatGPTWindow.isVisible()) {
        console.log("Background task finished. Hiding window (singleton).");
        // It's already hidden, but good to confirm.
      } else {
        // If it was visible (debug mode), we might want to keep it visible?
        // Or hide it? Let's hide it if it was "background" requested... 
        // But we don't know the request context here efficiently without state.
        // For singleton, we generally hide after success unless user explicitly opened it.
        // Let's leave it as is.
      }
    });

  }

  if (!ipcMain.listenerCount('chatgpt-response-partial')) {
    ipcMain.on('chatgpt-response-partial', (event, responseText) => {
      if (mainAppWindow && !mainAppWindow.isDestroyed()) {
        mainAppWindow.webContents.send('chatgpt-response', responseText, false);
      }
    });
  }

  // GEMINI Handler (Singleton Pattern)
  if (!ipcMain.listenerCount('gemini-response-extracted')) {
    ipcMain.on('gemini-response-extracted', (event, responseText) => {
      if (mainAppWindow && !mainAppWindow.isDestroyed()) {
        mainAppWindow.webContents.send('gemini-response', responseText, true);
      }
    });
  }

  if (!ipcMain.listenerCount('gemini-response-partial')) {
    ipcMain.on('gemini-response-partial', (event, responseText) => {
      if (mainAppWindow && !mainAppWindow.isDestroyed()) {
        mainAppWindow.webContents.send('gemini-response', responseText, false);
      }
    });
  }

  // CLAUDE Handler (Singleton Pattern)
  if (!ipcMain.listenerCount('claude-response-extracted')) {
    ipcMain.on('claude-response-extracted', (event, responseText) => {
      console.log(`[Main] Received extracted Claude response from ${event.sender.id}`);

      if (!claudeWindow || claudeWindow.isDestroyed()) {
        console.log("[Main] Warning: Claude window is gone.");
        return;
      }

      if (event.sender.id !== claudeWindow.webContents.id) {
        console.log("[Main] Warning: Received Claude response from unknown sender.");
        return;
      }

      if (mainAppWindow && !mainAppWindow.isDestroyed()) {
        console.log(`[Main] Sending claude-response to mainWindow (ID: ${mainAppWindow.id})`);
        mainAppWindow.webContents.send('claude-response', responseText, true);
      } else {
        console.error("[Main] CRITICAL: Main window not found or destroyed!");
      }
    });
  }

  if (!ipcMain.listenerCount('claude-response-partial')) {
    ipcMain.on('claude-response-partial', (event, responseText) => {
      if (mainAppWindow && !mainAppWindow.isDestroyed()) {
        mainAppWindow.webContents.send('claude-response', responseText, false);
      }
    });
  }

  // QWEN Handler (Singleton Pattern)
  if (!ipcMain.listenerCount('qwen-response-extracted')) {
    ipcMain.on('qwen-response-extracted', (event, responseText) => {
      console.log(`[Main] Received extracted Qwen response from ${event.sender.id}`);

      if (!qwenWindow || qwenWindow.isDestroyed()) {
        console.log("[Main] Warning: Qwen window is gone.");
        return;
      }

      if (event.sender.id !== qwenWindow.webContents.id) {
        console.log("[Main] Warning: Received Qwen response from unknown sender.");
        return;
      }

      if (mainAppWindow && !mainAppWindow.isDestroyed()) {
        console.log(`[Main] Sending qwen-response to mainWindow (ID: ${mainAppWindow.id})`);
        mainAppWindow.webContents.send('qwen-response', responseText, true);
      }
    });
  }

  if (!ipcMain.listenerCount('qwen-response-partial')) {
    ipcMain.on('qwen-response-partial', (event, responseText) => {
      if (mainAppWindow && !mainAppWindow.isDestroyed()) {
        mainAppWindow.webContents.send('qwen-response', responseText, false);
      }
    });
  }



  // DEEPSEEK Handler (Singleton Pattern)
  if (!ipcMain.listenerCount('deepseek-response-extracted')) {
    ipcMain.on('deepseek-response-extracted', (event, responseText) => {
      console.log(`[Main] Received extracted DeepSeek response from ${event.sender.id}`);

      if (!deepseekWindow || deepseekWindow.isDestroyed()) {
        console.log("[Main] Warning: DeepSeek window is gone.");
        return;
      }

      if (event.sender.id !== deepseekWindow.webContents.id) {
        console.log("[Main] Warning: Received DeepSeek response from unknown sender.");
        const allWins = BrowserWindow.getAllWindows();
        const senderWin = BrowserWindow.fromWebContents(event.sender);
        console.log(`[Main] Sender Title: ${senderWin?.getTitle()}`);
      }

      if (mainAppWindow && !mainAppWindow.isDestroyed()) {
        console.log(`[Main] Sending deepseek-response to mainWindow (ID: ${mainAppWindow.id})`);
        mainAppWindow.webContents.send('deepseek-response', responseText, true);
      }
    });
  }

  if (!ipcMain.listenerCount('deepseek-response-partial')) {
    ipcMain.on('deepseek-response-partial', (event, responseText) => {
      if (mainAppWindow && !mainAppWindow.isDestroyed()) {
        mainAppWindow.webContents.send('deepseek-response', responseText, false);
      }
    });
  }



  // GROK Handler (Singleton Pattern)
  if (!ipcMain.listenerCount('grok-response-extracted')) {
    ipcMain.on('grok-response-extracted', (event, responseText) => {
      if (mainAppWindow && !mainAppWindow.isDestroyed()) {
        mainAppWindow.webContents.send('grok-response', responseText, true);
      }
    });
  }

  if (!ipcMain.listenerCount('grok-response-partial')) {
    ipcMain.on('grok-response-partial', (event, responseText) => {
      if (mainAppWindow && !mainAppWindow.isDestroyed()) {
        mainAppWindow.webContents.send('grok-response', responseText, false);
      }
    });
  }

  // IPC Handler for R Analysis
  ipcMain.handle(
    'run-r-analysis',
    async (
      event,
      filePath,
      groupVar,
      responseVar,
      alpha,
      groupVar2 = '',
      filteredData = null,
      analysisMode = 'inferential',
      plotColors = null,
      isPaired = false,
      factorialDesign = 'between',
      scatterVarX = '',
      scatterVarY = '',
      subjectVar = '',
      chiSquareAdjustment = 'auto',
      inferentialWorkflow = 'group_comparison',
      oneValueReference = '',
      oneValueProportions = '',
      oneValueSuccessCategory = '',
      correlationForceBothMethods = false,
      inferentialSignificantOnly = false,
      plotLabelsJson = '{}',
      regressionTrainPercent = 80,
      regressionClassificationThreshold = 0.5,
      regressionStandardizePredictors = false
    ) => {
      return new Promise((resolve, reject) => {
        const wrapperPath = analysisWrapperPath;
        const outputImage = path.join(os.tmpdir(), `r_plot_${Date.now()}.png`);

        const wrapperHealth = ensureAnalysisWrapperUsable();
        if (!wrapperHealth.ok) {
          resolve({
            error: 'R analysis wrapper is invalid and could not be recovered.',
            details: wrapperHealth.reason || 'Unknown wrapper validation failure.'
          });
          return;
        }
        if (wrapperHealth.recovered) {
          stopREditorWorker('analysis wrapper auto-recovered');
          const recoveryMsg = `[R wrapper] Recovered invalid analysis_wrapper.R from ${wrapperHealth.source}\n`;
          try { event.sender.send('r-console-log', recoveryMsg); } catch (_) { }
        }

        let actualFilePath = filePath;

        // If filtered data is provided, create a temporary CSV file
        if (filteredData && filteredData.length > 0) {
          const tempFilePath = path.join(os.tmpdir(), `filtered_data_${Date.now()}.csv`);

          try {
            // Convert filtered data to CSV format
            const headers = Object.keys(filteredData[0]);
            const csvContent = [
              headers.join(','),
              ...filteredData.map(row =>
                headers.map(header => {
                  const value = row[header];
                  // Escape values that contain commas or quotes
                  if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                  }
                  return value;
                }).join(',')
              )
            ].join('\n');

            fs.writeFileSync(tempFilePath, csvContent, 'utf8');
            actualFilePath = tempFilePath;
            console.log(`Created temporary filtered file: ${tempFilePath} with ${filteredData.length} rows`);
          } catch (err) {
            console.error('Error creating temporary file:', err);
            resolve({ error: 'Failed to create temporary data file', details: err.message });
            return;
          }
        }

        const safeRegressionTrainPercent = Number.isFinite(Number(regressionTrainPercent))
          ? Math.round(Number(regressionTrainPercent))
          : 80;
        const safeRegressionClassificationThresholdRaw = Number(regressionClassificationThreshold);
        const safeRegressionClassificationThreshold = Number.isFinite(safeRegressionClassificationThresholdRaw)
          ? Math.round(Math.min(0.99, Math.max(0.01, safeRegressionClassificationThresholdRaw)) * 100) / 100
          : 0.5;
        const safeRegressionStandardizePredictors =
          (typeof regressionStandardizePredictors === 'boolean')
            ? regressionStandardizePredictors
            : ['true', 't', '1', 'yes', 'y', 'on'].includes(
              String(regressionStandardizePredictors ?? '').trim().toLowerCase()
            );

        const commandLog = `> Running R script: ${wrapperPath}\n> Input: ${actualFilePath}\n> Formula: ${groupVar} ~ ${responseVar}${groupVar2 ? ' + ' + groupVar2 : ''}\n> Mode: ${analysisMode}\n> Inferential workflow: ${inferentialWorkflow || 'group_comparison'}\n> Chi-square adjustment: ${chiSquareAdjustment || 'auto'}\n> Correlation bypass (use both): ${correlationForceBothMethods ? 'TRUE' : 'FALSE'}\n> Regression split (train/test): ${safeRegressionTrainPercent}/${100 - safeRegressionTrainPercent}\n> Logistic threshold: ${safeRegressionClassificationThreshold}\n> Standardize predictors: ${safeRegressionStandardizePredictors ? 'TRUE' : 'FALSE'}\n--------------------------------------------------\n`;
        console.log(commandLog);
        event.sender.send('r-console-log', commandLog);

        // Convert plotColors object to JSON string for R
        const plotColorsJson = plotColors && typeof plotColors === 'object'
          ? JSON.stringify(plotColors)
          : (plotColors || '{}');

        // Build args array with fixed positions
        // Arg map: 
        // 1=file, 2=output, 3=group, 4=response, 5=alpha, 
        // 6=group2, 7=mode, 8=colors, 9=isPaired, 10=factorialDesign
        // 11=scatterX, 12=scatterY, 13=subjectVar, 14=chiSquareAdjustment
        // 15=inferentialWorkflow, 16=oneValueReference, 17=oneValueProportions, 18=oneValueSuccessCategory,
        // 19=correlationForceBothMethods, 20=inferentialSignificantOnly, 21=plotLabelsJson,
        // 22=regressionTrainPercent, 23=regressionClassificationThreshold, 24=regressionStandardizePredictors

        const scatterEnabledMode =
          (typeof analysisMode === 'string')
          && (
            analysisMode.startsWith('descriptive')
            || analysisMode.startsWith('inferential_correlation_matrix')
          );
        const finalScatterX = (scatterEnabledMode && scatterVarX) ? scatterVarX : '';
        const finalScatterY = (scatterEnabledMode && scatterVarY) ? scatterVarY : '';

        const args = [
          wrapperPath,
          actualFilePath,
          outputImage,
          groupVar,
          responseVar,
          alpha,
          groupVar2 || '',
          analysisMode,
          plotColorsJson,
          isPaired ? 'TRUE' : 'FALSE',
          factorialDesign || 'between',
          finalScatterX,
          finalScatterY,
          subjectVar || '',
          chiSquareAdjustment || 'auto',
          inferentialWorkflow || 'group_comparison',
          oneValueReference ?? '',
          oneValueProportions ?? '',
          oneValueSuccessCategory ?? '',
          correlationForceBothMethods ? 'TRUE' : 'FALSE',
          inferentialSignificantOnly ? 'TRUE' : 'FALSE',
          plotLabelsJson,
          String(safeRegressionTrainPercent),
          String(safeRegressionClassificationThreshold),
          safeRegressionStandardizePredictors ? 'TRUE' : 'FALSE'
        ];

        let stdoutData = '';
        let stderrData = '';

        const cleanupTemporaryFilteredFile = () => {
          if (filteredData && actualFilePath !== filePath && fs.existsSync(actualFilePath)) {
            try {
              fs.unlinkSync(actualFilePath);
              console.log(`Cleaned up temporary file: ${actualFilePath}`);
            } catch (err) {
              console.error('Error cleaning up temp file:', err);
            }
          }
        };

        const handleProcessClose = (code, signal = null) => {
          console.log('R Process Closed. Code:', code, 'Signal:', signal);
          console.log('R Output Stub (First 200 chars):', stdoutData.substring(0, 200));
          console.log('R Error Stream:', stderrData);

          if (signal) {
            cleanupTemporaryFilteredFile();
            const likelyReason = signal === 'SIGKILL'
              ? ' (likely killed by OS due to memory pressure)'
              : '';
            resolve({
              error: `R process terminated by signal ${signal}${likelyReason}`,
              details: `${stderrData}\n${stdoutData}`.trim()
            });
            return;
          }

          if (code !== 0) {
            console.error('R process failed:', stderrData);
            cleanupTemporaryFilteredFile();
            resolve({ error: `R process exited with code ${code}`, details: stderrData });
            return;
          }

          try {
            // Parse JSON output
            // stdout might contain other messages effectively ignored by R's cat(), but we should be careful.
            // The wrapper script only cats the JSON at the end. 
            // However, if packages print startup messages they might pollute stdout if not fully suppressed.
            // I used suppressMessages in R, but some might slip through.
            // Ideally find the JSON structure in the output.
            // For now, assume stdout is clean or parse the last valid JSON line.

            let result = {};
            try {
              const firstBrace = stdoutData.indexOf('{');
              const lastBrace = stdoutData.lastIndexOf('}');
              if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
                throw new Error('No valid JSON found');
              }
              const jsonStr = stdoutData.substring(firstBrace, lastBrace + 1);
              result = JSON.parse(jsonStr);
            } catch (e) {
              cleanupTemporaryFilteredFile();
              resolve({ error: 'Failed to parse analysis results', details: stdoutData, parseError: e.message });
              return;
            }

            if (result.error) {
              cleanupTemporaryFilteredFile();
              resolve({ error: result.error });
              return;
            }

            // Read image file if it exists. Cache by absolute path so one file can
            // populate multiple image keys (e.g., plot_path and ttest_mean_ci_plot_path).
            let imageBase64 = null;
            const imagePathCache = new Map();
            const normalizeImagePath = (imgPath) => {
              if (!imgPath || typeof imgPath !== 'string') return '';
              const raw = imgPath.trim();
              if (!raw) return '';
              try {
                return path.resolve(raw);
              } catch (_) {
                return raw;
              }
            };
            const readImageAsBase64 = (imgPath, label = 'image') => {
              const normalizedPath = normalizeImagePath(imgPath);
              if (!normalizedPath) return null;
              if (imagePathCache.has(normalizedPath)) {
                return imagePathCache.get(normalizedPath);
              }
              if (!fs.existsSync(normalizedPath)) return null;
              try {
                const bitmap = fs.readFileSync(normalizedPath);
                const encoded = Buffer.from(bitmap).toString('base64');
                imagePathCache.set(normalizedPath, encoded);
                fs.unlinkSync(normalizedPath);
                return encoded;
              } catch (err) {
                console.error(`Error reading ${label}:`, err);
                return null;
              }
            };

            // Main plot can come from plot_path, biplot_path (PCA), or fallback output path.
            const primaryPlotPath = [result.plot_path, result.biplot_path, outputImage]
              .find((candidate) => {
                const normalizedCandidate = normalizeImagePath(candidate);
                return normalizedCandidate && fs.existsSync(normalizedCandidate);
              });
            imageBase64 = readImageAsBase64(primaryPlotPath, 'primary plot');

            // Helper to read and remove extra plots
            const readAndClean = (pathKey, imageKey) => {
              if (result[pathKey] && typeof result[pathKey] === 'string') {
                const encoded = readImageAsBase64(result[pathKey], pathKey);
                if (encoded) {
                  result[imageKey] = encoded;
                }
              }
            };

            // Process additional Multivariate plots
            readAndClean('scree_plot_path', 'scree_plot_image');
            readAndClean('biplot_path', 'biplot_image');
            readAndClean('dendrogram_path', 'dendrogram_image');
            readAndClean('mca_dendrogram_path', 'mca_dendrogram_image');
            readAndClean('elbow_plot_path', 'elbow_plot_image');
            readAndClean('silhouette_trend_plot_path', 'silhouette_trend_plot_image');
            readAndClean('silhouette_plot_path', 'silhouette_plot_image');
            readAndClean('heatmap_path', 'heatmap_image');
            readAndClean('interaction_plot_path', 'interaction_plot_image');
            readAndClean('sphericity_plot_path', 'sphericity_plot_image');
            readAndClean('residual_qq_plot_path', 'residual_qq_plot_image');
            readAndClean('shapiro_group_qq_plot_path', 'shapiro_group_qq_plot_image');
            readAndClean('anova_plot_path', 'anova_plot_image');
            readAndClean('anova_residual_plot_path', 'anova_residual_plot_image');
            readAndClean('mean_ci_plot_path', 'mean_ci_plot_image');
            readAndClean('tukey_plot_path', 'tukey_plot_image');
            readAndClean('games_howell_plot_path', 'games_howell_plot_image');
            readAndClean('dunn_plot_path', 'dunn_plot_image');
            readAndClean('ttest_mean_ci_plot_path', 'ttest_mean_ci_plot_image');
            readAndClean('wilcoxon_plot_path', 'wilcoxon_plot_image');
            readAndClean('two_group_publication_plot_path', 'two_group_publication_plot_image');
            readAndClean('regression_scatter_plot_path', 'regression_scatter_plot_image');
            readAndClean('regression_publication_plot_path', 'regression_publication_plot_image');
            readAndClean('rm_spaghetti_ci_plot_path', 'rm_spaghetti_ci_plot_image');
            readAndClean('friedman_spaghetti_iqr_plot_path', 'friedman_spaghetti_iqr_plot_image');
            readAndClean('mann_whitney_boxplot_path', 'mann_whitney_boxplot_image');

            // Process Correlation Matrix images (nested in correlation_matrix object)
            if (result.correlation_matrix) {
              // Handle images stored inside correlation_matrix
              const cm = result.correlation_matrix;
              const correlationImageCache = new Map();
              const readCorrelationImage = (imgPath, label) => {
                if (!imgPath) return null;
                if (correlationImageCache.has(imgPath)) return correlationImageCache.get(imgPath);
                if (!fs.existsSync(imgPath)) return null;
                try {
                  const bitmap = fs.readFileSync(imgPath);
                  const base64 = Buffer.from(bitmap).toString('base64');
                  correlationImageCache.set(imgPath, base64);
                  fs.unlinkSync(imgPath);
                  return base64;
                } catch (e) {
                  console.error(`Error reading ${label}:`, e);
                  return null;
                }
              };

              result.heatmap_image = readCorrelationImage(cm.heatmap_image, 'heatmap_image') || result.heatmap_image;
              result.spearman_heatmap_image = readCorrelationImage(cm.spearman_heatmap_image, 'spearman_heatmap_image') || result.spearman_heatmap_image;
              result.linearity_plot_image = readCorrelationImage(cm.linearity_plot_image, 'linearity_plot_image') || result.linearity_plot_image;
              result.spearman_linearity_plot_image = readCorrelationImage(cm.spearman_linearity_plot_image, 'spearman_linearity_plot_image') || result.spearman_linearity_plot_image;
            }

            // Process additional univariate analysis plots
            if (result.univariate_analysis) {
              for (const varName in result.univariate_analysis) {
                const stats = result.univariate_analysis[varName];
                if (stats && stats.plot_path && fs.existsSync(stats.plot_path)) {
                  try {
                    const plotBitmap = fs.readFileSync(stats.plot_path);
                    stats.plot_image = Buffer.from(plotBitmap).toString('base64');
                    // Clean up temp file
                    fs.unlinkSync(stats.plot_path);
                    delete stats.plot_path; // Remove path from result
                  } catch (err) {
                    console.error(`Error processing plot for ${varName}:`, err);
                  }
                }
              }
            }

            // Ensure a generic "image" payload exists for UI sections that rely on result.image.
            if (!imageBase64) {
              const fallbackImageKeys = [
                'biplot_image',
                'anova_plot_image',
                'interaction_plot_image',
                'mean_ci_plot_image',
                'tukey_plot_image',
                'games_howell_plot_image',
                'dunn_plot_image',
                'ttest_mean_ci_plot_image',
                'wilcoxon_plot_image',
                'two_group_publication_plot_image',
                'rm_spaghetti_ci_plot_image',
                'friedman_spaghetti_iqr_plot_image',
                'mann_whitney_boxplot_image',
                'residual_qq_plot_image',
                'shapiro_group_qq_plot_image',
                'scree_plot_image',
                'dendrogram_image',
                'mca_dendrogram_image',
                'elbow_plot_image',
                'silhouette_trend_plot_image',
                'silhouette_plot_image',
                'heatmap_image',
                'linearity_plot_image',
                'spearman_linearity_plot_image',
                'spearman_heatmap_image'
              ];
              for (const key of fallbackImageKeys) {
                if (typeof result[key] === 'string' && result[key].length > 0) {
                  imageBase64 = result[key];
                  break;
                }
              }
            }
            if (imageBase64 && !result.image) {
              result.image = imageBase64;
            }

            cleanupTemporaryFilteredFile();

            resolve({ result, image: imageBase64 });

          } catch (error) {
            console.error('Error parsing R output:', error, stdoutData);
            cleanupTemporaryFilteredFile();
            resolve({ error: 'Failed to output from R script', details: stdoutData });
          }
        };

        const runOneShotRProcess = () => {
          const rProcess = spawn('Rscript', ['--no-restore', '--no-save', ...args], { cwd: getWorkspaceRoot() });

          rProcess.stdout.on('data', (data) => {
            const str = data.toString();
            stdoutData += str;
            event.sender.send('r-console-log', str);
          });

          rProcess.stderr.on('data', (data) => {
            const str = data.toString();
            stderrData += str;
            event.sender.send('r-console-log', str);
          });

          rProcess.on('error', (err) => {
            cleanupTemporaryFilteredFile();
            resolve({ error: `Failed to start R process: ${err.message}`, details: stderrData || stdoutData });
          });

          rProcess.on('close', (code, signal) => handleProcessClose(code, signal));
        };

        const workerTrailingArgs = args.slice(1);
        enqueueREditorWorkerTask(() => runAnalysisInREditorWorker(workerTrailingArgs, event.sender))
          .then((workerResponse) => {
            const workerStdout = typeof workerResponse?.stdout === 'string' ? workerResponse.stdout : '';
            const workerStderr = typeof workerResponse?.stderr === 'string' ? workerResponse.stderr : '';
            if (workerStdout) {
              stdoutData += workerStdout;
              event.sender.send('r-console-log', workerStdout);
            }
            if (workerStderr) {
              stderrData += workerStderr;
              event.sender.send('r-console-log', workerStderr);
            }
            const workerCode = Number.isFinite(Number(workerResponse?.code))
              ? Number(workerResponse.code)
              : 0;
            handleProcessClose(workerCode, null);
          })
          .catch((workerErr) => {
            const fallbackMessage = `[R editor worker] ${workerErr?.message || 'Unknown error'}; falling back to one-shot Rscript.\\n`;
            stderrData += fallbackMessage;
            event.sender.send('r-console-log', fallbackMessage);
            runOneShotRProcess();
          });
      });
    });

  ipcMain.handle('run-dplyr-tidyr-transform', async (event, rows, pipeline) => {
    return new Promise((resolve) => {
      const transformWrapperPath = path.join(__dirname, 'data_transform_wrapper.R');
      if (!fs.existsSync(transformWrapperPath)) {
        resolve({ success: false, error: 'Data transform wrapper script is missing.' });
        return;
      }

      const payloadRows = Array.isArray(rows) ? rows : [];
      const pipelineText = typeof pipeline === 'string' ? pipeline : '';
      if (!pipelineText.trim()) {
        resolve({ success: false, error: 'Pipeline is empty.' });
        return;
      }

      const stamp = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
      const inputPath = path.join(os.tmpdir(), `dplyr_tidyr_input_${stamp}.json`);
      const outputPath = path.join(os.tmpdir(), `dplyr_tidyr_output_${stamp}.json`);
      const pipelinePath = path.join(os.tmpdir(), `dplyr_tidyr_pipeline_${stamp}.txt`);

      const cleanupTempFiles = () => {
        [inputPath, outputPath, pipelinePath].forEach((tempPath) => {
          try {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
          } catch (cleanupErr) {
            console.warn(`Failed to clean temp file: ${tempPath}`, cleanupErr.message);
          }
        });
      };

      try {
        fs.writeFileSync(inputPath, JSON.stringify(payloadRows), 'utf8');
        fs.writeFileSync(pipelinePath, pipelineText, 'utf8');
      } catch (writeErr) {
        cleanupTempFiles();
        resolve({ success: false, error: `Failed to prepare transform input: ${writeErr.message}` });
        return;
      }

      const rProcess = spawn(
        'Rscript',
        [transformWrapperPath, inputPath, outputPath, pipelinePath],
        { cwd: __dirname }
      );

      let stdoutData = '';
      let stderrData = '';

      rProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      rProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      rProcess.on('close', (code) => {
        let payload = null;
        if (fs.existsSync(outputPath)) {
          try {
            payload = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
          } catch (parseErr) {
            payload = {
              success: false,
              error: `Failed to parse transform output: ${parseErr.message}`,
              details: stdoutData || stderrData
            };
          }
        }

        cleanupTempFiles();

        if (payload && typeof payload === 'object') {
          resolve(payload);
          return;
        }

        if (code !== 0) {
          resolve({
            success: false,
            error: `R transform process exited with code ${code}`,
            details: stderrData || stdoutData
          });
          return;
        }

        resolve({
          success: false,
          error: 'Transformation completed without output.',
          details: stdoutData || stderrData
        });
      });
    });
  });

  // Save Detailed Report from renderer (View Detailed Report)
  ipcMain.handle('save-detailed-report', async (event, title, lines) => {
    try {
      const aiDataDir = path.join(__dirname, 'AI agent', 'data');
      if (!fs.existsSync(aiDataDir)) fs.mkdirSync(aiDataDir, { recursive: true });

      const reportText = [
        `Report Title: ${title || 'Detailed Report'}`,
        `Generated: ${new Date().toISOString()}`,
        '',
        ...(Array.isArray(lines) ? lines : [])
      ].join('\n');

      fs.writeFileSync(path.join(aiDataDir, 'detailed_report.txt'), reportText);
      fs.writeFileSync(path.join(aiDataDir, 'detailed_report.json'), JSON.stringify({ title, lines }, null, 2));

      // Notify doc agent (restricted load)
      if (docAgentProcess) {
        docAgentProcess.stdin.write(JSON.stringify({ command: 'load_detailed_report' }) + '\n');
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('export-model-summary-file', async (event, payload) => {
    try {
      const format = String(payload?.format || '').toLowerCase();
      if (!['csv', 'xlsx', 'pdf'].includes(format)) {
        return { success: false, error: 'Unsupported export format.' };
      }

      const normalizedSheets = format === 'pdf' ? [] : normalizeExportSheets(payload?.sheets);
      if (format !== 'pdf' && normalizedSheets.length === 0) {
        return { success: false, error: 'No table data to export.' };
      }

      const extension = format === 'csv' ? 'csv' : (format === 'xlsx' ? 'xlsx' : 'pdf');
      const baseName = sanitizeExportBaseName(payload?.baseName, 'step05_model-summary');
      const defaultPath = path.join(app.getPath('documents'), `${baseName}.${extension}`);

      const { canceled, filePath } = await dialog.showSaveDialog({
        title: `Export Step 05 (${extension.toUpperCase()})`,
        defaultPath,
        filters: format === 'csv'
          ? [{ name: 'CSV', extensions: ['csv'] }]
          : (format === 'xlsx'
            ? [{ name: 'Excel Workbook', extensions: ['xlsx'] }]
            : [{ name: 'PDF Document', extensions: ['pdf'] }]),
        showOverwriteConfirmation: true
      });

      if (canceled || !filePath) {
        return { success: false, canceled: true };
      }

      let finalPath = filePath;
      if (path.extname(finalPath).toLowerCase() !== `.${extension}`) {
        finalPath = `${finalPath}.${extension}`;
      }

      if (format === 'csv') {
        fs.writeFileSync(finalPath, buildCsvFromSheets(normalizedSheets), 'utf8');
      } else if (format === 'xlsx') {
        await writeXlsxFile(finalPath, normalizedSheets, payload?.generatedAt);
      } else {
        const pdfBase64 = typeof payload?.pdfBase64 === 'string'
          ? payload.pdfBase64.replace(/\s+/g, '')
          : '';
        if (!pdfBase64) {
          return { success: false, error: 'No PDF data to export.' };
        }
        const pdfBuffer = Buffer.from(pdfBase64, 'base64');
        if (!pdfBuffer || pdfBuffer.length === 0) {
          return { success: false, error: 'Invalid PDF data.' };
        }
        fs.writeFileSync(finalPath, pdfBuffer);
      }

      return { success: true, filePath: finalPath };
    } catch (e) {
      return { success: false, error: e?.message || 'Failed to export file.' };
    }
  });

  ipcMain.handle('save-dataset-csv', async (event, payload) => {
    try {
      const rows = Array.isArray(payload?.rows) ? payload.rows : [];
      const columns = normalizeDatasetColumns(rows, payload?.columns);
      if (columns.length === 0) {
        return { success: false, error: 'No columns available to export.' };
      }
      const columnColors = normalizeColumnColorMap(columns, payload?.columnColors);
      const columnWidths = normalizeColumnWidthMap(columns, payload?.columnWidths);

      const rawName = String(payload?.suggestedName || '').trim();
      const parsedName = rawName ? path.parse(rawName).name : '';
      const baseName = sanitizeExportBaseName(parsedName || 'data_explorer', 'data_explorer');
      const defaultPath = path.join(app.getPath('documents'), `${baseName}_edited.csv`);

      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Save Data Explorer CSV',
        defaultPath,
        filters: [{ name: 'CSV', extensions: ['csv'] }],
        showOverwriteConfirmation: true
      });

      if (canceled || !filePath) {
        return { success: false, canceled: true };
      }

      let finalPath = filePath;
      if (path.extname(finalPath).toLowerCase() !== '.csv') {
        finalPath = `${finalPath}.csv`;
      }

      const sourcePath = String(payload?.sourcePath || '').trim();
      if (pathsReferToSameFile(finalPath, sourcePath)) {
        return {
          success: false,
          error: 'Data Explorer keeps the original uploaded file unchanged. Choose a different export filename.'
        };
      }

      const csvText = buildCsvFromRows(rows, columns);
      fs.writeFileSync(finalPath, csvText, 'utf8');
      let colorFilePath = '';
      let colorSaveError = '';
      const colorCount = Object.keys(columnColors).length;
      const widthCount = Object.keys(columnWidths).length;
      if (colorCount > 0 || widthCount > 0) {
        try {
          colorFilePath = finalPath.replace(/\.csv$/i, '_column_styles.json');
          const colorPayload = {
            schema: 'data_explorer_column_styles',
            generatedAt: new Date().toISOString(),
            columns,
            colors: columns.reduce((acc, col) => {
              acc[col] = columnColors[col] || '';
              return acc;
            }, {}),
            widths: columns.reduce((acc, col) => {
              if (Number.isFinite(columnWidths[col])) acc[col] = columnWidths[col];
              return acc;
            }, {}),
            fontSize: payload?.fontSize || '',
            headerFontSize: payload?.headerFontSize || '',
            rowHeight: payload?.rowHeight || '',
            headerRowHeight: payload?.headerRowHeight || '',
            note: 'CSV files do not support cell colors or dimensions directly. This sidecar JSON preserves Data Explorer formatting metadata for Windows, Linux, and macOS.'
          };
          fs.writeFileSync(colorFilePath, `${JSON.stringify(colorPayload, null, 2)}\n`, 'utf8');
        } catch (err) {
          colorSaveError = err?.message || 'Unable to write column style metadata file.';
        }
      }
      return {
        success: true,
        filePath: finalPath,
        rowCount: rows.length,
        columnCount: columns.length,
        colorFilePath,
        colorCount,
        widthCount,
        colorSaveError
      };
    } catch (e) {
      return { success: false, error: e?.message || 'Failed to save dataset CSV.' };
    }
  });

  ipcMain.handle('save-dataset-xlsx', async (event, payload) => {
    try {
      const rows = Array.isArray(payload?.rows) ? payload.rows : [];
      const columns = normalizeDatasetColumns(rows, payload?.columns);
      if (columns.length === 0) {
        return { success: false, error: 'No columns available to export.' };
      }
      const columnColors = normalizeColumnColorMap(columns, payload?.columnColors);
      const columnWidths = normalizeColumnWidthMap(columns, payload?.columnWidths);

      const rawName = String(payload?.suggestedName || '').trim();
      const parsedName = rawName ? path.parse(rawName).name : '';
      const baseName = sanitizeExportBaseName(parsedName || 'data_explorer', 'data_explorer');
      const defaultPath = path.join(app.getPath('documents'), `${baseName}_edited.xlsx`);

      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Save Data Explorer XLSX',
        defaultPath,
        filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }],
        showOverwriteConfirmation: true
      });

      if (canceled || !filePath) {
        return { success: false, canceled: true };
      }

      let finalPath = filePath;
      if (path.extname(finalPath).toLowerCase() !== '.xlsx') {
        finalPath = `${finalPath}.xlsx`;
      }

      const sourcePath = String(payload?.sourcePath || '').trim();
      if (pathsReferToSameFile(finalPath, sourcePath)) {
        return {
          success: false,
          error: 'Data Explorer keeps the original uploaded file unchanged. Choose a different export filename.'
        };
      }

      await writeXlsxFile(finalPath, [{
        name: 'Dataset',
        headers: columns,
        rows: rows.map((row) => columns.map((column) => row?.[column] ?? '')),
        columnColors,
        columnWidths,
        fontSize: payload?.fontSize,
        headerFontSize: payload?.headerFontSize,
        rowHeight: payload?.rowHeight,
        headerRowHeight: payload?.headerRowHeight
      }], new Date().toISOString());

      return {
        success: true,
        filePath: finalPath,
        rowCount: rows.length,
        columnCount: columns.length
      };
    } catch (e) {
      return { success: false, error: e?.message || 'Failed to save dataset XLSX.' };
    }
  });

  ipcMain.handle('list-workspace-entries', async (event, relativePath = '') => {
    try {
      const { normalized, resolved } = resolveWorkspacePath(relativePath);
      const entries = (await Promise.all(fs.readdirSync(resolved, { withFileTypes: true })
        .filter((entry) => entry && entry.name && entry.name !== '.' && entry.name !== '..')
        .map(async (entry) => {
          const absolutePath = path.join(resolved, entry.name);
          let isDirectory = entry.isDirectory();
          if (entry.isSymbolicLink()) {
            try {
              isDirectory = fs.statSync(absolutePath).isDirectory();
            } catch (_) { }
          }
          let iconDataUrl = '';
          if (!isDirectory) {
            try {
              const fileIcon = await app.getFileIcon(absolutePath, { size: 'normal' });
              iconDataUrl = fileIcon.toDataURL();
            } catch (_) { }
          }
          return {
            name: entry.name,
            relativePath: toWorkspaceRelativePath(absolutePath),
            absolutePath,
            isDirectory,
            isSymbolicLink: entry.isSymbolicLink(),
            iconDataUrl
          };
        })))
        .sort((a, b) => {
          if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
          return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });

      return {
        success: true,
        rootName: path.basename(getWorkspaceRoot()) || getWorkspaceRoot(),
        rootPath: getWorkspaceRoot(),
        relativePath: normalized,
        entries
      };
    } catch (error) {
      return { success: false, error: error?.message || 'Failed to read workspace files.' };
    }
  });

  ipcMain.handle('open-workspace-entry', async (event, relativePath = '') => {
    try {
      const { resolved } = resolveWorkspacePath(relativePath);
      const shellError = await shell.openPath(resolved);
      if (shellError) {
        return { success: false, error: shellError };
      }
      return { success: true, path: resolved };
    } catch (error) {
      return { success: false, error: error?.message || 'Failed to open workspace entry.' };
    }
  });

  ipcMain.handle('read-file-content', async (event, absolutePath) => {
    try {
      if (!absolutePath) throw new Error('No path provided');
      // Basic safety: ensure it's within workspace via resolveWorkspacePath logic if possible
      // but absolutePath is already resolved by handleWorkspaceEntrySelect.
      // We'll trust the absolute path if it's within workspace.
      if (!fs.existsSync(absolutePath)) throw new Error('File not found');

      const stats = fs.statSync(absolutePath);
      const extension = path.extname(absolutePath).toLowerCase();
      const imageMimeTypes = {
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.apng': 'image/apng',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.bmp': 'image/bmp'
      };
      const mediaMimeTypes = {
        ...imageMimeTypes,
        '.mp4': 'video/mp4'
      };
      if (mediaMimeTypes[extension]) {
        if (stats.size > 100 * 1024 * 1024) throw new Error('Media too large (>100MB)');
        const mediaData = `data:${mediaMimeTypes[extension]};base64,${fs.readFileSync(absolutePath).toString('base64')}`;
        return {
          success: true,
          content: '',
          mediaData,
          mimeType: mediaMimeTypes[extension],
          mediaType: extension === '.mp4' ? 'video' : 'image'
        };
      }
      if (extension === '.html' || extension === '.htm') {
        if (stats.size > 10 * 1024 * 1024) throw new Error('HTML file too large (>10MB)');
        const html = fs.readFileSync(absolutePath, 'utf8');
        const mediaData = `data:text/html;base64,${Buffer.from(html, 'utf8').toString('base64')}`;
        return { success: true, content: '', mediaData, mimeType: 'text/html', mediaType: 'html' };
      }
      if (stats.size > 2 * 1024 * 1024) throw new Error('File too large (>2MB)');

      const content = fs.readFileSync(absolutePath, 'utf8');
      return { success: true, content };
    } catch (error) {
      return { success: false, error: error?.message || 'Failed to read file.' };
    }
  });

  ipcMain.handle('open-file-reader', async (event, requestedPath = '') => {
    try {
      let filePath = String(requestedPath || '').trim();
      if (!filePath) {
        const selection = await dialog.showOpenDialog({
          title: 'Open File Reader Document',
          defaultPath: getWorkspaceRoot(),
          properties: ['openFile'],
          filters: [
            { name: 'Readable Documents', extensions: ['pdf', 'txt', 'text', 'md', 'doc', 'docx', 'json', 'jsonc'] },
            { name: 'PDF', extensions: ['pdf'] },
            { name: 'Text, Markdown, and JSON', extensions: ['txt', 'text', 'md', 'json', 'jsonc'] },
            { name: 'Word Documents', extensions: ['doc', 'docx'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });

        if (selection.canceled || !Array.isArray(selection.filePaths) || selection.filePaths.length === 0) {
          return { success: true, canceled: true };
        }
        filePath = selection.filePaths[0];
      }

      filePath = path.resolve(filePath);
      const workspacePath = path.resolve(getWorkspaceRoot());
      if (filePath !== workspacePath && !filePath.startsWith(`${workspacePath}${path.sep}`)) {
        return { success: false, error: 'File Reader can only open documents inside the workspace.' };
      }

      const extension = path.extname(filePath).toLowerCase();
      const allowedExtensions = new Set(['.pdf', '.txt', '.text', '.md', '.doc', '.docx', '.json', '.jsonc']);
      if (!allowedExtensions.has(extension)) {
        return { success: false, error: 'File Reader supports PDF, TXT, Markdown, Word, and JSON files.' };
      }

      const stats = fs.statSync(filePath);
      if (stats.size > 20 * 1024 * 1024) {
        return { success: false, error: 'The selected document is too large. File Reader supports files up to 20MB.' };
      }

      let content = '';
      let extractionMethod = 'utf8';
      let mediaData = '';
      let mediaUrl = '';
      if (extension === '.pdf') {
        const header = Buffer.alloc(5);
        const handle = fs.openSync(filePath, 'r');
        try {
          fs.readSync(handle, header, 0, header.length, 0);
        } finally {
          fs.closeSync(handle);
        }
        if (header.toString('ascii') !== '%PDF-') {
          throw new Error('The selected file is not a valid PDF document.');
        }
        extractionMethod = 'native-pdf-file-url';
        mediaUrl = url.pathToFileURL(filePath).toString();
      } else if (extension === '.docx') {
        const extracted = spawnSync('unzip', ['-p', filePath, 'word/document.xml'], {
          encoding: 'utf8',
          maxBuffer: 16 * 1024 * 1024,
          timeout: 15000
        });
        if (extracted.error || extracted.status !== 0 || !String(extracted.stdout || '').trim()) {
          throw new Error('Could not extract text from this DOCX file. Please ensure unzip is installed.');
        }
        content = String(extracted.stdout)
          .replace(/<w:tab[^>]*\/?\s*>/gi, '\t')
          .replace(/<w:br[^>]*\/?\s*>/gi, '\n')
          .replace(/<\/w:p>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        extractionMethod = 'docx-xml';
      } else if (extension === '.doc') {
        const commands = ['antiword', 'catdoc'];
        let extractedText = '';
        for (const command of commands) {
          const extracted = spawnSync(command, [filePath], {
            encoding: 'utf8',
            maxBuffer: 16 * 1024 * 1024,
            timeout: 15000
          });
          if (!extracted.error && extracted.status === 0 && String(extracted.stdout || '').trim()) {
            extractedText = String(extracted.stdout).trim();
            extractionMethod = command;
            break;
          }
        }
        if (!extractedText) {
          throw new Error('Could not extract text from this DOC file. Install antiword or catdoc to read legacy Word documents.');
        }
        content = extractedText;
      } else {
        content = fs.readFileSync(filePath, 'utf8').replace(/\u0000/g, '').replace(/\r\n/g, '\n');
        if (extension === '.json' || extension === '.jsonc') {
          try {
            content = JSON.stringify(JSON.parse(content), null, 2);
          } catch (_) {
            // Keep raw content when the JSON is incomplete or uses comments.
          }
        }
      }

      return {
        success: true,
        filePath,
        name: path.basename(filePath),
        extension,
        content,
        extractionMethod,
        mediaData,
        mediaUrl,
        viewerType: extension === '.pdf' ? 'pdf' : 'text'
      };
    } catch (error) {
      console.error('File Reader Error:', error);
      return { success: false, error: error?.message || 'Failed to read the selected document.' };
    }
  });

  ipcMain.handle('get-workspace-root', async () => {
    return {
      rootPath: workspaceRoot,
      rootName: path.basename(workspaceRoot) || workspaceRoot
    };
  });

  ipcMain.handle('open-native-cline-terminal', async (event, requestedCwd = '') => {
    if (process.platform !== 'linux') {
      return { success: false, error: 'Cline native terminal is currently supported on Linux only.' };
    }

    if (!(await hasCommand('cline'))) {
      return { success: false, error: 'Cline CLI was not found in the login shell PATH.' };
    }

    const workspaceDirectory = path.resolve(getWorkspaceRoot());
    const requestedDirectory = String(requestedCwd || '').trim();
    const candidateDirectory = requestedDirectory
      ? (path.isAbsolute(requestedDirectory) ? requestedDirectory : path.resolve(workspaceDirectory, requestedDirectory))
      : workspaceDirectory;
    const startDirectory = fs.existsSync(candidateDirectory) && fs.statSync(candidateDirectory).isDirectory()
      ? candidateDirectory
      : workspaceDirectory;
    const launchCommand = `cd -- ${shellQuote(startDirectory)} && exec cline`;
    const terminalLaunchers = [
      ['gnome-terminal', ['--', 'bash', '-lc', launchCommand]],
      ['konsole', ['--workdir', startDirectory, '-e', 'bash', '-lc', launchCommand]],
      ['x-terminal-emulator', ['-e', 'bash', '-lc', launchCommand]],
      ['xterm', ['-e', 'bash', '-lc', launchCommand]]
    ];

    for (const [terminalCommand, args] of terminalLaunchers) {
      if (!(await hasCommand(terminalCommand))) continue;
      const terminalProcess = spawn(terminalCommand, args, {
        detached: true,
        stdio: 'ignore',
        env: process.env
      });
      terminalProcess.unref();
      return { success: true, cwd: startDirectory, terminal: terminalCommand };
    }

    return { success: false, error: 'No supported Linux terminal emulator was found.' };
  });

  ipcMain.handle('get-ai-knowledge-root', async () => {
    return {
      rootPath: aiKnowledgeRoot,
      rootName: path.basename(aiKnowledgeRoot) || aiKnowledgeRoot
    };
  });

  ipcMain.handle('select-workspace-folder', async () => {
    try {
      const response = await dialog.showOpenDialog({
        title: 'Select Workspace Folder',
        properties: ['openDirectory']
      });
      if (response.canceled || !Array.isArray(response.filePaths) || response.filePaths.length === 0) {
        return { success: false, canceled: true };
      }
      const selectedRoot = path.resolve(String(response.filePaths[0] || '').trim());
      if (!selectedRoot) {
        return { success: false, error: 'No folder was selected.' };
      }
      workspaceRoot = selectedRoot;

      return {
        success: true,
        rootPath: workspaceRoot,
        rootName: path.basename(workspaceRoot) || workspaceRoot
      };
    } catch (error) {
      return { success: false, error: error?.message || 'Failed to select workspace folder.' };
    }
  });

  ipcMain.handle('select-ai-knowledge-folder', async () => {
    try {
      const response = await dialog.showOpenDialog(mainAppWindow, {
        title: 'Select AI Knowledge Folder',
        properties: ['openDirectory']
      });
      if (response.canceled || !Array.isArray(response.filePaths) || response.filePaths.length === 0) {
        return { success: false, canceled: true };
      }
      const selectedRoot = path.resolve(String(response.filePaths[0] || '').trim());
      if (!selectedRoot) {
        return { success: false, error: 'No folder was selected.' };
      }

      aiKnowledgeRoot = selectedRoot;

      // Automatically stop AI Agent on knowledge folder change to ensure clean re-initialization
      if (docAgentProcess) {
        console.log('[AgentData] Stopping AI Agent due to knowledge folder change:', aiKnowledgeRoot);
        docAgentProcess.kill();
        docAgentProcess = null;
        docAgentStatus = 'idle';
      }

      // Persist the new AI knowledge path
      saveAIConfig(currentOllamaApi, currentOllamaApiKey, aiKnowledgeRoot);

      return {
        success: true,
        rootPath: aiKnowledgeRoot,
        rootName: path.basename(aiKnowledgeRoot) || aiKnowledgeRoot
      };
    } catch (error) {
      return { success: false, error: error?.message || 'Failed to select AI knowledge folder.' };
    }
  });
  // IPC Handler for Getting Metadata (Columns + Head)
  ipcMain.handle('get-file-metadata', async (event, filePath, sheetName = '') => {
    return new Promise((resolve, reject) => {
      const wrapperPath = path.join(__dirname, 'analysis_wrapper.R');
      const rProcess = spawn('Rscript', ['--vanilla', wrapperPath, '--get-metadata', filePath, sheetName], { cwd: getWorkspaceRoot() });

      let stdoutData = '';
      let stderrData = '';
      rProcess.stdout.on('data', (data) => { stdoutData += data.toString(); });
      rProcess.stderr.on('data', (data) => { stderrData += data.toString(); });

      rProcess.on('close', (code) => {
        if (code !== 0) {
          resolve({ error: 'R execution failed', details: stderrData || 'No stderr output' });
          return;
        }
        try {
          const firstBrace = stdoutData.indexOf('{');
          const lastBrace = stdoutData.lastIndexOf('}');
          if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
            resolve({ error: 'No valid JSON found in R output', details: stdoutData });
            return;
          }
          const jsonStr = stdoutData.substring(firstBrace, lastBrace + 1);
          const result = JSON.parse(jsonStr);
          const normalizedColumns = Array.isArray(result.columns)
            ? result.columns
            : (result.columns === null || result.columns === undefined
              ? []
              : (typeof result.columns === 'object'
                ? Object.values(result.columns)
                : [result.columns]));
          const normalizedRows = Array.isArray(result.fullData)
            ? result.fullData
            : (result.fullData && typeof result.fullData === 'object'
              ? [result.fullData]
              : []);
          const normalizedSheets = Array.isArray(result.sheets)
            ? result.sheets
            : (result.sheets === null || result.sheets === undefined
              ? []
              : (typeof result.sheets === 'object'
                ? Object.values(result.sheets)
                : [result.sheets]));
          result.columns = normalizedColumns.map((col) => String(col));
          result.fullData = normalizedRows;
          result.sheets = normalizedSheets.map((sheet) => String(sheet)).filter((sheet) => sheet.trim() !== '');
          result.active_sheet = String(result.active_sheet || result.sheets[0] || '');

          // Save result for AI Agent
          try {
            // Build a concise, machine-friendly summary for the AI agent
            const summarizeResult = (r) => {
              const lines = [];
              if (!r || typeof r !== 'object') return lines;
              if (r.mode) lines.push(`mode=${r.mode}`);
              if (r.test_type) lines.push(`test_type=${r.test_type}`);
              if (r.path_taken) lines.push(`path=${r.path_taken}`);
              if (r.p_value !== undefined) lines.push(`p_value=${r.p_value}`);
              if (r.alpha !== undefined) lines.push(`alpha=${r.alpha}`);
              if (r.anova && r.anova.p_value !== undefined) lines.push(`anova_p=${r.anova.p_value}`);
              if (r.ttest && r.ttest.p_value !== undefined) lines.push(`ttest_p=${r.ttest.p_value}`);
              if (r.kruskal && r.kruskal.p_value !== undefined) lines.push(`kruskal_p=${r.kruskal.p_value}`);
              if (r.bartlett && r.bartlett.p_value !== undefined) lines.push(`bartlett_p=${r.bartlett.p_value}`);
              if (r.shapiro && typeof r.shapiro === 'object') {
                Object.entries(r.shapiro).forEach(([k, v]) => {
                  if (v && v.p_value !== undefined) lines.push(`shapiro_${k}_p=${v.p_value}`);
                });
              }
              if (r.evaluation && r.evaluation.test && r.evaluation.test.auc !== undefined) lines.push(`auc_test=${r.evaluation.test.auc}`);
              if (r.model_stats && r.model_stats.r_squared !== undefined) lines.push(`r2=${r.model_stats.r_squared}`);
              if (r.model_stats && r.model_stats.pseudo_r2_mcfadden !== undefined) lines.push(`pseudo_r2=${r.model_stats.pseudo_r2_mcfadden}`);
              if (r.optimal_k) lines.push(`optimal_k=${r.optimal_k}`);
              if (r.avg_silhouette_width !== undefined) lines.push(`avg_silhouette=${r.avg_silhouette_width}`);
              if (r.correlation_matrix && r.correlation_matrix.variables) lines.push(`corr_vars=${r.correlation_matrix.variables.join('|')}`);
              if (r.correlation_matrix && r.correlation_matrix.pearson) {
                lines.push(`corr_matrix_shape=${r.correlation_matrix.variables.length}x${r.correlation_matrix.variables.length}`);
              }
              if (r.n_groups !== undefined) lines.push(`n_groups=${r.n_groups}`);
              if (r.main_effect_A && r.main_effect_A.p_value !== undefined) lines.push(`mainA_p=${r.main_effect_A.p_value}`);
              if (r.main_effect_B && r.main_effect_B.p_value !== undefined) lines.push(`mainB_p=${r.main_effect_B.p_value}`);
              if (r.interaction && r.interaction.p_value !== undefined) lines.push(`interaction_p=${r.interaction.p_value}`);
              return lines;
            };

            const aiDataDir = path.join(__dirname, 'AI agent', 'data');
            if (!fs.existsSync(aiDataDir)) {
              fs.mkdirSync(aiDataDir, { recursive: true });
            }

            // No longer writing latest_analysis.*; detailed reports are saved from renderer (View Detailed Report)

            // Trigger reload if agent is running
            if (docAgentProcess) {
              console.log('Triggering restricted context load involving only this analysis for AI agent...');
              docAgentProcess.stdin.write(JSON.stringify({ command: 'load_analysis_only' }) + '\n');
            }
          } catch (saveErr) {
            console.error('Failed to save analysis for AI agent:', saveErr);
          }

          resolve(result);
        } catch (e) {
          resolve({ error: 'Failed to parse metadata from R', details: stdoutData, parseError: e.message });
        }
      });
    });
  });

  ipcMain.handle('get-r-version', async () => {
    try {
      const versionDetails = await getRVersionDetails();
      if (!versionDetails.success) {
        return {
          success: false,
          error: versionDetails.error || 'Unable to detect R version.'
        };
      }
      return {
        success: true,
        version: versionDetails.version || versionDetails.line || 'Unknown',
        raw: versionDetails.line || ''
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  });

  ipcMain.handle('update-r-version', async () => {
    try {
      const plan = await getRUpdatePlan();
      if (!plan.success) {
        return plan;
      }

      const updateResult = await runShellCapture(plan.shellCommand);
      const outputText = `${updateResult.stdout || ''}\n${updateResult.stderr || ''}`.trim();

      if (updateResult.code === 0) {
        const versionDetails = await getRVersionDetails();
        return {
          success: true,
          output: outputText,
          version: versionDetails.success ? (versionDetails.version || versionDetails.line || '') : ''
        };
      }

      const permissionError = /password is required|permission denied|authorization failed|not in the sudoers|operation not permitted/i.test(outputText);
      return {
        success: false,
        error: permissionError
          ? 'Administrator permission is required to update R.'
          : `R update command exited with code ${updateResult.code}.`,
        output: outputText,
        requiresManual: true,
        command: plan.manualCommand || plan.shellCommand
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  });

  // IPC Handler for Custom R Script Execution
  // Persistent R Console Logic & Multi-Plot Capture Engine
  const sessionPlotsDir = path.join(os.tmpdir(), `ngr_plots_${Date.now()}`);
  if (!fs.existsSync(sessionPlotsDir)) {
    try { fs.mkdirSync(sessionPlotsDir, { recursive: true }); } catch (_) { }
  }

  const generatedPlotsList = [];
  const trackedPlotFiles = new Set();
  const plotFileSizes = new Map();
  // Keep media-heavy session state bounded to prevent long-session memory growth.
  const MAX_GENERATED_PLOTS = 40;

  function scanAndBroadcastNewPlots() {
    try {
      if (!fs.existsSync(sessionPlotsDir)) return;
      const files = fs.readdirSync(sessionPlotsDir)
        .filter((f) => /\.(png|gif|webp|apng|mp4|html?)$/i.test(f))
        .sort();
      for (const file of files) {
        if (trackedPlotFiles.has(file)) continue;
        const filePath = path.join(sessionPlotsDir, file);
        try {
          const stat = fs.statSync(filePath);
          if (stat.size > 0) {
            if (plotFileSizes.get(file) !== stat.size) {
              plotFileSizes.set(file, stat.size);
              continue;
            }
            trackedPlotFiles.add(file);
            plotFileSizes.delete(file);
            const bitmap = fs.readFileSync(filePath);
            const extension = path.extname(file).toLowerCase();
            const mimeType = extension === '.gif'
              ? 'image/gif'
              : extension === '.webp'
                ? 'image/webp'
                : extension === '.apng'
                  ? 'image/apng'
                  : extension === '.mp4'
                    ? 'video/mp4'
                    : extension === '.html' || extension === '.htm'
                      ? 'text/html'
                      : 'image/png';
            const base64 = `data:${mimeType};base64,${bitmap.toString('base64')}`;
            const plotItem = {
              id: file,
              fileName: file,
              title: `Plot ${generatedPlotsList.length + 1}`,
              base64,
              mimeType,
              mediaType: extension === '.mp4'
                ? 'video'
                : extension === '.html' || extension === '.htm'
                  ? 'html'
                  : 'image',
              timestamp: stat.mtimeMs || Date.now(),
              source: 'console'
            };
            generatedPlotsList.push(plotItem);
            if (generatedPlotsList.length > MAX_GENERATED_PLOTS) {
              const evictedPlots = generatedPlotsList.splice(0, generatedPlotsList.length - MAX_GENERATED_PLOTS);
              evictedPlots.forEach((evictedPlot) => {
                const evictedFileName = String(evictedPlot?.fileName || '');
                if (!evictedFileName) return;
                trackedPlotFiles.delete(evictedFileName);
                plotFileSizes.delete(evictedFileName);
                try { fs.unlinkSync(path.join(sessionPlotsDir, evictedFileName)); } catch (_) { }
              });
            }
            if (mainAppWindow && !mainAppWindow.isDestroyed()) {
              mainAppWindow.webContents.send('r-plot-generated', plotItem);
            }
          }
        } catch (_) {
          // File might still be flushing to disk
        }
      }
    } catch (err) {
      console.error('[Plots Scan Error]:', err);
    }
  }

  // Periodic check to capture any flushed plots
  const plotScanTimer = setInterval(scanAndBroadcastNewPlots, 1200);

  const rConsoleProcesses = { r: null, python: null };
  let rConsoleLanguage = 'r';

  ipcMain.handle('start-r-console', (event, requestedLanguage = 'r') => {
    const language = String(requestedLanguage || 'r').toLowerCase() === 'python' ? 'python' : 'r';
    if (rConsoleProcesses[language]) {
      rConsoleLanguage = language;
      return { success: true, message: `${language === 'python' ? 'Python' : 'R'} console already running` };
    }

    try {
      const command = language === 'python' ? (os.platform() === 'win32' ? 'python' : getPythonPath()) : 'R';
      const args = language === 'python' ? ['-i', '-u'] : ['--vanilla', '--interactive'];
      const pythonConsoleEnv = language === 'python'
        ? (() => {
          const env = getPythonProcessEnv({ LC_ALL: 'en_US.UTF-8', PYTHONUNBUFFERED: '1' });
          // Do not let a parent VS Code/Antigravity shell inject OSC 633
          // markers or its Native REPL startup banner into the app console.
          Object.keys(env)
            .filter((key) => /^VSCODE_/i.test(key) || /^ANTIGRAVITY_/i.test(key))
            .forEach((key) => delete env[key]);
          delete env.PYTHONSTARTUP;
          delete env.PYTHONINSPECT;
          env.TERM_PROGRAM = 'NgR-Terminal';
          env.TERM_PROGRAM_VERSION = '1.0.0';
          return env;
        })()
        : { ...process.env, LC_ALL: 'en_US.UTF-8' };
      const consoleProcess = spawn(command, args, {
        cwd: getWorkspaceRoot(),
        env: pythonConsoleEnv // Ensure UTF-8 and isolate Python from parent shell integration
      });
      rConsoleProcesses[language] = consoleProcess;
      rConsoleLanguage = language;

      consoleProcess.stdout.on('data', (data) => {
        const str = data.toString();
        event.sender.send('r-console-output', { language, type: 'stdout', data: str });
      });

      consoleProcess.stderr.on('data', (data) => {
        const str = data.toString();
        event.sender.send('r-console-output', { language, type: 'stderr', data: str });
      });

      consoleProcess.on('close', (code) => {
        if (rConsoleProcesses[language] === consoleProcess) rConsoleProcesses[language] = null;
        event.sender.send('r-console-output', { language, type: 'system', data: `\n[Process exited with code ${code}]\n` });
      });

      consoleProcess.on('error', (err) => {
        console.error(`${language} Console Launch Error:`, err);
        event.sender.send('r-console-output', { language, type: 'stderr', data: `\n[Launch Error] ${err.message}\n` });
      });

      // Initialize auto-device for multi-plot capture
      const escapedPlotsDir = sessionPlotsDir.replace(/\\/g, '/');
      if (language === 'r') {
        const setupScript = `local({\n  if (!exists(".ngr_plot_counter", envir = .GlobalEnv, inherits = FALSE)) assign(".ngr_plot_counter", 0L, envir = .GlobalEnv)\n  assign(".ngr_plots_dir", "${escapedPlotsDir}", envir = .GlobalEnv)\n  Sys.setenv(NGR_PLOTS_DIR = "${escapedPlotsDir}")\n  assign("ngr_animation_path", function(filename = NULL) {\n    if (is.null(filename) || !nzchar(as.character(filename)[1])) {\n      counter <- get(".ngr_plot_counter", envir = .GlobalEnv) + 1L\n      assign(".ngr_plot_counter", counter, envir = .GlobalEnv)\n      filename <- sprintf("plot_r_animation_%03d.gif", counter)\n    }\n    file.path(get(".ngr_plots_dir", envir = .GlobalEnv), basename(as.character(filename)[1]))\n  }, envir = .GlobalEnv)\n  options(device = function(...) {\n    sid <- format(Sys.time(), "%Y%m%d_%H%M%OS3")\n    counter <- get(".ngr_plot_counter", envir = .GlobalEnv) + 1L\n    assign(".ngr_plot_counter", counter, envir = .GlobalEnv)\n    png(file.path("${escapedPlotsDir}", sprintf("plot_%s_%03d_%%03d.png", sid, counter)), width = 1200, height = 900, res = 150)\n  })\n})\n`;
        setTimeout(() => {
          try {
            if (rConsoleProcesses.r) {
              rConsoleProcesses.r.stdin.write(setupScript);
            }
          } catch (_) { }
        }, 400);
      } else if (language === 'python') {
        const setupPyScript = `import os, sys\ntry:\n    import matplotlib\n    matplotlib.use('Agg')\n    import matplotlib.pyplot as plt\n    from matplotlib.animation import Animation\n    _ngr_plot_counter = 0\n    def _ngr_custom_show(*args, **kwargs):\n        global _ngr_plot_counter\n        import time\n        _ngr_plot_counter += 1\n        ts = int(time.time() * 1000)\n        animations = [value for value in globals().values() if isinstance(value, Animation)]\n        if animations:\n            p = os.path.join("${escapedPlotsDir}", f"plot_py_{ts}_{_ngr_plot_counter:03d}.gif")\n            try:\n                animations[-1].save(p, writer='pillow', fps=10)\n                plt.close('all')\n                return\n            except Exception:\n                pass\n        p = os.path.join("${escapedPlotsDir}", f"plot_py_{ts}_{_ngr_plot_counter:03d}.png")\n        plt.savefig(p, dpi=150)\n        plt.close()\n    plt.show = _ngr_custom_show\nexcept Exception:\n    pass\n\n`;
        setTimeout(() => {
          try {
            if (rConsoleProcesses.python) {
              rConsoleProcesses.python.stdin.write(setupPyScript);
            }
          } catch (_) { }
        }, 400);
      }

      return { success: true, language };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('send-r-console', (event, command) => {
    const consoleProcess = rConsoleProcesses[rConsoleLanguage];
    if (!consoleProcess) return { success: false, error: `${rConsoleLanguage === 'python' ? 'Python' : 'R'} console not running` };
    try {
      let cmd = command;
      if (rConsoleLanguage === 'r') {
        const hasPlotCall = /\b(plot|hist|boxplot|barplot|curve|pairs|qqnorm|ggplot|ggsave)\b/i.test(command);
        if (hasPlotCall) {
          cmd = `${command}\nif (dev.cur() > 1) invisible(dev.off());\n`;
        } else {
          cmd = `${command}\n`;
        }
      } else {
        cmd = `${command}\n\n`;
      }
      consoleProcess.stdin.write(cmd);

      // Trigger plot checks after command execution
      setTimeout(scanAndBroadcastNewPlots, 400);
      setTimeout(scanAndBroadcastNewPlots, 1200);

      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('set-console-working-directory', (event, requestedLanguage = 'r', requestedDirectory = '') => {
    const language = String(requestedLanguage || 'r').toLowerCase() === 'python' ? 'python' : 'r';
    const consoleProcess = rConsoleProcesses[language];
    if (!consoleProcess) {
      return { success: false, error: `${language === 'python' ? 'Python' : 'R'} console not running` };
    }

    try {
      const rawDirectory = String(requestedDirectory || '').trim();
      if (!rawDirectory) {
        return { success: false, error: 'Working directory is empty.' };
      }
      const directory = path.resolve(rawDirectory);
      if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
        return { success: false, error: 'Working directory does not exist.' };
      }
      const safeDirectory = language === 'r'
        ? directory.replace(/\\/g, '/')
        : directory;
      const command = language === 'python'
        ? `import os; os.chdir(${JSON.stringify(safeDirectory)})`
        : `setwd(${JSON.stringify(safeDirectory)})`;
      consoleProcess.stdin.write(`${command}\n`);
      return { success: true, directory };
    } catch (error) {
      return { success: false, error: error.message || 'Could not change the console working directory.' };
    }
  });

  ipcMain.handle('stop-r-console', () => {
    const consoleProcess = rConsoleProcesses[rConsoleLanguage];
    if (consoleProcess) {
      try {
        // Interrupt the current command while keeping the interactive console
        // alive so the user can run another command immediately.
        consoleProcess.kill('SIGINT');
      } catch (_) { }
    }
    return { success: true };
  });

  ipcMain.handle('get-all-generated-plots', () => {
    scanAndBroadcastNewPlots();
    return generatedPlotsList;
  });

  ipcMain.handle('clear-generated-plots', () => {
    try {
      generatedPlotsList.length = 0;
      trackedPlotFiles.clear();
      plotFileSizes.clear();
      if (fs.existsSync(sessionPlotsDir)) {
        const files = fs.readdirSync(sessionPlotsDir);
        for (const f of files) {
          try { fs.unlinkSync(path.join(sessionPlotsDir, f)); } catch (_) { }
        }
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('delete-generated-plot', (event, fileName) => {
    const safeName = path.basename(String(fileName || '').trim());
    if (!safeName || safeName !== String(fileName || '').trim() || !/\.(png|gif|webp|apng|mp4|html?)$/i.test(safeName)) {
      return { success: false, error: 'Invalid plot file' };
    }
    try {
      const filePath = path.join(sessionPlotsDir, safeName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      generatedPlotsList.splice(
        0,
        generatedPlotsList.length,
        ...generatedPlotsList.filter((plot) => plot.fileName !== safeName)
      );
      trackedPlotFiles.delete(safeName);
      plotFileSizes.delete(safeName);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('save-plot-file', async (event, payload) => {
    try {
      const { base64, defaultName = 'plot.png' } = payload || {};
      if (!base64) return { success: false, error: 'No plot data provided' };
      const { filePath, canceled } = await dialog.showSaveDialog(mainAppWindow, {
        title: 'Save Plot',
        defaultPath: defaultName,
        filters: [{ name: 'Plot media', extensions: ['png', 'gif', 'webp', 'apng', 'mp4', 'html', 'htm'] }]
      });
      if (canceled || !filePath) return { success: false, canceled: true };
      const base64Data = base64.replace(/^data:[^;]+;base64,/, '');
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
      return { success: true, filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ── Pip Install Handler ──────────────────────────────────────────
  ipcMain.handle('pip-install', (event, packageNames) => {
    const packages = String(packageNames || '').trim();
    if (!packages) return { success: false, error: 'No package name provided' };

    // Sanitize: split by spaces/commas and reject anything that looks like a shell injection
    const pkgList = packages.split(/[\s,]+/).filter(Boolean);
    if (pkgList.length === 0) return { success: false, error: 'No package name provided' };
    const invalidPkg = pkgList.find((p) => /[;&|`$(){}\\]/.test(p));
    if (invalidPkg) return { success: false, error: `Invalid package name: ${invalidPkg}` };

    return new Promise((resolve) => {
      try {
        const pythonBin = getPythonPath();
        let stderrOutput = '';

        const runPip = (useBreakSystemPackages = true) => {
          const pipArgs = ['-m', 'pip', 'install'];
          if (useBreakSystemPackages) {
            pipArgs.push('--break-system-packages');
          }
          pipArgs.push(...pkgList);

          const pipProcess = spawn(pythonBin, pipArgs, {
            cwd: getWorkspaceRoot(),
            env: getPythonProcessEnv({ LC_ALL: 'en_US.UTF-8', PYTHONUNBUFFERED: '1' })
          });

          pipProcess.stdout.on('data', (data) => {
            event.sender.send('pip-install-output', { type: 'stdout', data: data.toString() });
          });

          pipProcess.stderr.on('data', (data) => {
            const str = data.toString();
            stderrOutput += str;
            event.sender.send('pip-install-output', { type: 'stderr', data: str });
          });

          pipProcess.on('close', (code) => {
            if (code !== 0 && useBreakSystemPackages && stderrOutput.includes('--break-system-packages')) {
              // Retry without --break-system-packages for older pip versions
              runPip(false);
              return;
            }
            const success = code === 0;
            event.sender.send('pip-install-output', {
              type: 'system',
              code,
              data: success
                ? `\n✓ Successfully installed: ${pkgList.join(', ')}\n`
                : `\n✗ pip install exited with code ${code}\n`
            });
            resolve({ success, code, packages: pkgList, error: success ? null : stderrOutput });
          });

          pipProcess.on('error', (err) => {
            event.sender.send('pip-install-output', {
              type: 'stderr',
              data: `\n[Error] ${err.message}\n`
            });
            resolve({ success: false, error: err.message });
          });
        };

        runPip(true);
      } catch (e) {
        resolve({ success: false, error: e.message });
      }
    });
  });

  // ── Real Terminal PTY Logic ─────────────────────────────────────
  let ptyProcess = null;

  ipcMain.handle('start-terminal-session', (event, cols = 80, rows = 24, cwd) => {
    if (ptyProcess) {
      try {
        ptyProcess.removeAllListeners('exit');
        ptyProcess.kill();
      } catch (e) { }
      ptyProcess = null;
    }
    try {
      // Use the user's actual login shell for full env (conda, nvm, etc.)
      const defaultShell = os.platform() === 'win32'
        ? 'powershell.exe'
        : (process.env.SHELL || '/bin/bash');
      const requestedDirectory = String(cwd || '').trim();
      const workspaceDirectory = path.resolve(getWorkspaceRoot());
      let startDir = '';

      if (requestedDirectory && path.isAbsolute(requestedDirectory)) {
        try {
          if (fs.existsSync(requestedDirectory) && fs.statSync(requestedDirectory).isDirectory()) {
            startDir = requestedDirectory;
          } else {
            console.warn(`[Terminal] Ignoring invalid terminal directory: ${requestedDirectory}`);
          }
        } catch (e) {
          console.warn(`[Terminal] Invalid terminal directory: ${requestedDirectory}`, e);
        }
      }

      if (!startDir && fs.existsSync(workspaceDirectory)) {
        try {
          if (fs.statSync(workspaceDirectory).isDirectory()) startDir = workspaceDirectory;
        } catch (e) {
          console.warn(`[Terminal] Workspace directory is unavailable: ${workspaceDirectory}`, e);
        }
      }

      if (!startDir) startDir = os.homedir();

      const safeCols = Math.max(40, Number(cols) || 80);
      const safeRows = Math.max(10, Number(rows) || 24);
      const shellArgs = os.platform() === 'win32' ? [] : ['-l'];

      // Resolve standard binary paths including ~/.local/bin where global user tools (e.g. cline) live
      const extraPaths = [];
      if (os.platform() !== 'win32') {
        const homeDir = os.homedir();
        const candidatePaths = [
          path.join(homeDir, '.local', 'bin'),
          path.join(homeDir, '.cargo', 'bin'),
          '/usr/local/bin',
          '/usr/bin',
          '/bin',
        ];
        for (const p of candidatePaths) {
          if (fs.existsSync(p) && !extraPaths.includes(p)) extraPaths.push(p);
        }
      }
      const currentPath = process.env.PATH || '';
      const mergedPath = extraPaths.length > 0
        ? `${extraPaths.join(path.delimiter)}${path.delimiter}${currentPath}`
        : currentPath;

      const terminalEnv = {
        ...process.env,
        PATH: mergedPath,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        LC_ALL: 'en_US.UTF-8',
        TERM_PROGRAM: 'NgR-Terminal',
        TERM_PROGRAM_VERSION: '1.0.0',
      };

      // OpenCode writes its log below XDG_DATA_HOME. If the user's default
      // data directory is unavailable (common in packaged/read-only runs),
      // it exits before its TUI can draw. Keep a writable project-local
      // fallback so the terminal still behaves like a normal PTY.
      if (os.platform() !== 'win32') {
        try {
          const xdgDataHome = terminalEnv.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
          const openCodeLog = path.join(xdgDataHome, 'opencode', 'log', 'opencode.log');
          const writableTarget = fs.existsSync(openCodeLog) ? openCodeLog : path.dirname(openCodeLog);
          fs.accessSync(writableTarget, fs.constants.W_OK);
        } catch (error) {
          const fallbackXdgDataHome = path.join(workspaceDirectory, '.ngr', 'xdg-data');
          try {
            fs.mkdirSync(fallbackXdgDataHome, { recursive: true });
            terminalEnv.XDG_DATA_HOME = fallbackXdgDataHome;
            console.warn(`[Terminal] Using writable XDG data directory: ${fallbackXdgDataHome}`);
          } catch (fallbackError) {
            console.warn('[Terminal] Could not prepare OpenCode data directory:', fallbackError);
          }
        }
      }

      console.log(`[Terminal] Spawning ${defaultShell} in: ${startDir} (${safeCols}x${safeRows})`);
      ptyProcess = pty.spawn(defaultShell, shellArgs, {
        name: 'xterm-256color',
        cols: safeCols,
        rows: safeRows,
        cwd: startDir,
        env: terminalEnv
      });

      const senderWebContents = event.sender;
      ptyProcess.on('data', (data) => {
        if (senderWebContents && !senderWebContents.isDestroyed()) {
          senderWebContents.send('terminal-incoming-data', data);
        } else if (mainAppWindow && !mainAppWindow.isDestroyed()) {
          mainAppWindow.webContents.send('terminal-incoming-data', data);
        }
      });

      ptyProcess.on('exit', (code) => {
        console.log(`[Terminal] PTY exited with code: ${code}`);
        const target = (senderWebContents && !senderWebContents.isDestroyed())
          ? senderWebContents
          : (mainAppWindow && !mainAppWindow.isDestroyed() ? mainAppWindow.webContents : null);
        if (target) {
          target.send('terminal-incoming-data', `\r\n\x1b[31m[Process exited with code ${code}]\x1b[0m\r\n`);
        }
        ptyProcess = null;
      });

      return { success: true };
    } catch (error) {
      console.error('[Terminal] Failed to start PTY:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('send-terminal-data', (event, data) => {
    if (ptyProcess) {
      ptyProcess.write(data);
    }
    return { success: true };
  });

  ipcMain.handle('resize-terminal-session', (event, cols, rows) => {
    if (ptyProcess) {
      const safeCols = Math.max(10, Math.floor(Number(cols) || 80));
      const safeRows = Math.max(5, Math.floor(Number(rows) || 24));
      try {
        ptyProcess.resize(safeCols, safeRows);
      } catch (err) {
        console.warn('[Terminal] Resize failed:', err);
      }
    }
    return { success: true };
  });

  ipcMain.handle('stop-terminal-session', () => {
    if (ptyProcess) {
      try {
        ptyProcess.removeAllListeners('exit');
        ptyProcess.removeAllListeners('data');
        ptyProcess.kill();
      } catch (e) { }
      ptyProcess = null;
    }
    return { success: true };
  });

  // IPC Handler for Qwen AI Agent
  let aiProcess = null;
  let aiModelInUse = null;

  ipcMain.handle('start-ai-session', (event, model) => {
    const requestedModel = model || process.env.OLLAMA_MODEL || "r-wrapper-corrector";
    if (aiProcess) {
      if (aiModelInUse === requestedModel) {
        return { success: true, message: "AI already running" };
      }
      try {
        aiProcess.kill();
      } catch (e) { }
      aiProcess = null;
    }

    const scriptPath = path.join(__dirname, 'qwen_agent.py');
    aiModelInUse = requestedModel;
    let readySent = false;
    let errorSent = false;
    event.sender.send('ai-status', { status: 'starting', model: requestedModel });
    aiProcess = spawn(getPythonPath(), [scriptPath], { cwd: __dirname, env: getPythonProcessEnv({ OLLAMA_MODEL: requestedModel }) });

    aiProcess.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          try {
            const json = JSON.parse(line);
            if (json.system && !readySent) {
              readySent = true;
              event.sender.send('ai-status', { status: 'ready', model: requestedModel });
            }
            event.sender.send('ai-response', json);
          } catch (e) {
            // plain text fallback or error logging
            console.log('AI Raw:', line);
          }
        }
      });
    });

    aiProcess.stderr.on('data', (data) => {
      const msg = data.toString();
      console.error('AI Error:', msg);
      if (!errorSent) {
        errorSent = true;
        event.sender.send('ai-status', { status: 'error', model: requestedModel, error: msg });
      }
    });

    aiProcess.on('close', (code) => {
      console.log(`AI Process exited with code ${code}`);
      aiProcess = null;
      aiModelInUse = null;
      event.sender.send('ai-status', { status: 'stopped' });
    });

    return { success: true };
  });

  ipcMain.handle('send-ai-message', (event, message) => {
    if (!aiProcess) return { success: false, error: "AI not running" };
    aiProcess.stdin.write(message + "\n");
    return { success: true };
  });

  ipcMain.handle('stop-ai-session', () => {
    if (aiProcess) {
      aiProcess.kill();
      aiProcess = null;
      aiModelInUse = null;
    }
    return { success: true };
  });

  ipcMain.handle('get-ai-models', async () => {
    const localMode = isLocalOllama();
    const manifestModels = localMode
      ? collectModelsFromManifestDirectory(OLLAMA_MODELS_PATH)
      : [];
    try {
      // If we are local, ensure the server is running
      if (localMode) {
        const ready = await ensureOllamaRunning();
        if (!ready && manifestModels.length > 0) {
          return {
            success: true,
            models: manifestModels,
            source: 'manifest-fallback',
            warning: 'Ollama is not running or not ready. Showing models detected from local manifests.'
          };
        }
        if (!ready) throw new Error('Ollama is not running or not ready');
      }

      const tagsUrl = `${getActiveBaseUrl()}/api/tags`;
      console.log(`[Ollama] Fetching models from: ${tagsUrl}`);

      const response = await fetch(tagsUrl, {
        method: 'GET',
        headers: buildOllamaHeaders()
      });

      if (!response.ok) {
        // If it's cloud and /api/tags failed, it might be a non-Ollama service.
        // Don't crash; return an empty list or manifest fallback if local.
        if (!localMode) {
          console.warn(`[Ollama] Cloud tag fetch failed (${response.status}). Returning manual selection mode.`);
          return {
            success: true,
            models: [],
            source: 'cloud-manual',
            info: 'Could not fetch remote model list. You can enter a model name manually.'
          };
        }
        throw new Error(`Ollama Error: ${response.statusText}`);
      }

      const json = await response.json();
      const apiModels = Array.isArray(json.models)
        ? json.models.map((m) => m.name).filter(Boolean)
        : [];
      const models = localMode
        ? normalizeModelNames([...apiModels, ...manifestModels])
        : normalizeModelNames(apiModels);

      if (models.length > 0) {
        return { success: true, models, source: localMode ? 'ollama' : 'cloud-ollama' };
      }

      return {
        success: true,
        models: localMode ? manifestModels : [],
        source: localMode ? 'manifest-only' : 'cloud-empty',
        warning: localMode
          ? `No active models found in Ollama server, but found ${manifestModels.length} in local storage.`
          : 'No models were found from the cloud endpoint. You can enter a model name manually.'
      };
    } catch (error) {
      console.error('Model List Error:', error);
      if (localMode && manifestModels.length > 0) {
        return {
          success: true,
          models: manifestModels,
          source: 'manifest-fallback',
          warning: error.message
        };
      }
      // For cloud, don't return failure, return empty list so UI can show manual entry
      return {
        success: true,
        models: [],
        source: 'cloud-error',
        error: error.message,
        info: 'Could not connect to the cloud endpoint. Manual override enabled.'
      };
    }
  });

  ipcMain.handle('detect-provider-models', async (event, payload = {}) => {
    const provider = String(payload?.provider || '').toLowerCase();
    const rawHost = String(payload?.host || '').trim();
    const key = String(payload?.apiKey || '').trim();

    let cleanHost = rawHost.replace(/\/+$/, '');
    let targetUrl = '';
    const headers = {};

    if (provider === 'ollama') {
      if (!cleanHost) cleanHost = 'http://localhost:11434';
      targetUrl = cleanHost.endsWith('/api/tags') ? cleanHost : `${cleanHost}/api/tags`;
      if (key) headers['Authorization'] = `Bearer ${key}`;
    } else if (provider === 'anthropic') {
      if (!cleanHost) cleanHost = 'https://api.anthropic.com/v1';
      targetUrl = cleanHost.endsWith('/models') ? cleanHost : `${cleanHost}/models`;
      if (key) headers['x-api-key'] = key;
      headers['anthropic-version'] = '2023-06-01';
    } else if (provider === 'openrouter' || provider === 'unorouter') {
      if (!cleanHost) cleanHost = provider === 'unorouter' ? 'https://api.unorouter.com/v1' : 'https://openrouter.ai/api/v1';
      targetUrl = cleanHost.endsWith('/models') ? cleanHost : `${cleanHost}/models`;
      if (key) headers['Authorization'] = `Bearer ${key}`;
      if (provider === 'openrouter') {
        headers['HTTP-Referer'] = 'http://localhost';
        headers['X-Title'] = 'R Console AI';
      }
    } else if (provider === 'nvidia') {
      if (!cleanHost) cleanHost = 'https://integrate.api.nvidia.com/v1';
      targetUrl = cleanHost.endsWith('/models') ? cleanHost : `${cleanHost}/models`;
      if (key) headers['Authorization'] = `Bearer ${key}`;
    } else {
      // Default / OpenAI
      if (!cleanHost) cleanHost = 'https://api.openai.com/v1';
      targetUrl = cleanHost.endsWith('/models') ? cleanHost : `${cleanHost}/models`;
      if (key) headers['Authorization'] = `Bearer ${key}`;
    }

    try {
      console.log(`[Detect Models] Provider: ${provider}, URL: ${targetUrl}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(targetUrl, {
        method: 'GET',
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let errMsg = `Host returned HTTP ${response.status}`;
        try {
          const parsed = JSON.parse(errorText);
          errMsg = parsed?.error?.message || parsed?.detail || parsed?.message || errMsg;
        } catch { }
        return { success: false, error: errMsg, models: [] };
      }

      const json = await response.json();
      let models = [];

      if (Array.isArray(json)) {
        models = json.map((m) => (typeof m === 'string' ? m : m?.id || m?.name || m?.model)).filter(Boolean);
      } else if (Array.isArray(json.data)) {
        models = json.data.map((m) => (typeof m === 'string' ? m : m?.id || m?.name || m?.model)).filter(Boolean);
      } else if (Array.isArray(json.models)) {
        models = json.models.map((m) => (typeof m === 'string' ? m : m?.name || m?.id || m?.model)).filter(Boolean);
      }

      return { success: true, models, host: cleanHost, targetUrl };
    } catch (err) {
      console.warn(`[Detect Models] Error connecting to ${targetUrl}:`, err.message);
      return { success: false, error: err.message || 'Connection failed', models: [] };
    }
  });

  ipcMain.handle('request-ai-agent', async (event, payload = {}) => {
    const requestedUrl = normalizeOllamaApiUrl(payload.url || currentOllamaApi);
    const model = String(payload.model || '').trim();
    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    if (!model) return { success: false, error: 'No local AI model is selected.' };
    if (messages.length === 0) return { success: false, error: 'The AI request did not contain a prompt.' };

    const endpointUrl = requestedUrl;
    const isChatEndpoint = /\/v1\/chat\/completions$|\/chat$/i.test(endpointUrl);
    const isOpenAIChatEndpoint = /\/v1\/chat\/completions$/i.test(endpointUrl);
    const getContentText = (content) => {
      if (!Array.isArray(content)) return String(content || '');
      return content
        .filter((part) => part?.type === 'text')
        .map((part) => String(part.text || ''))
        .join('\n');
    };
    const getContentImages = (content) => {
      if (!Array.isArray(content)) return [];
      return content
        .filter((part) => part?.type === 'image_url')
        .map((part) => String(part.image_url?.url || ''))
        .filter((url) => url.startsWith('data:image/'))
        .map((url) => url.split(',', 2)[1] || '')
        .filter(Boolean);
    };
    const prompt = messages
      .map((message) => `${message?.role === 'user' ? 'User' : message?.role === 'system' ? 'System' : 'Assistant'}: ${getContentText(message?.content)}`)
      .join('\n\n');
    const imagePayloads = messages.flatMap((message) => getContentImages(message?.content));
    const ollamaChatMessages = messages.map((message) => {
      const images = getContentImages(message?.content);
      return {
        ...message,
        content: getContentText(message?.content),
        ...(images.length > 0 ? { images } : {})
      };
    });
    const body = isChatEndpoint
      ? { model, messages: isOpenAIChatEndpoint ? messages : ollamaChatMessages, stream: false }
      : { model, prompt, ...(imagePayloads.length > 0 ? { images: imagePayloads } : {}), stream: false, options: { temperature: 0.7, num_predict: 1024 } };

    const endpoint = (() => {
      try { return new URL(endpointUrl); } catch (error) { return null; }
    })();
    const isLoopback = Boolean(endpoint && ['localhost', '127.0.0.1', '::1'].includes(endpoint.hostname.toLowerCase()));
    if (isLoopback) {
      const ready = await ensureOllamaRunning();
      if (!ready) {
        return {
          success: false,
          error: 'Local Ollama is not running. Start Ollama, then try again.'
        };
      }
    }

    const headers = { 'Content-Type': 'application/json' };
    const apiKey = String(payload.apiKey || (isLoopback ? '' : currentOllamaApiKey) || '').trim();
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    try {
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });
      const responseText = await response.text();
      let responseJson = null;
      try { responseJson = responseText ? JSON.parse(responseText) : null; } catch (error) { }
      if (!response.ok) {
        const detail = responseJson?.error || responseText || response.statusText;
        return { success: false, error: `Local AI request failed (${response.status}): ${String(detail).slice(0, 500)}` };
      }
      const text = responseJson?.response
        || responseJson?.message?.content
        || responseJson?.choices?.[0]?.message?.content
        || responseJson?.choices?.[0]?.text
        || '';
      return { success: true, text: String(text || '').trim() || 'No response received from local AI.' };
    } catch (error) {
      if (error?.name === 'AbortError') {
        return { success: false, error: 'Local AI request timed out. Try a shorter question or increase the timeout.' };
      }
      return { success: false, error: `Could not reach local AI: ${error?.message || 'connection failed'}` };
    } finally {
      clearTimeout(timeoutId);
    }
  });

  ipcMain.handle('request-custom-ai', async (event, payload = {}) => {
    const { url, headers = {}, body = {} } = payload;
    if (!url) return { success: false, error: 'URL is required' };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const raw = await response.text();
      let data = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { data = { raw }; }
      return {
        success: response.ok,
        status: response.status,
        data,
        raw
      };
    } catch (err) {
      clearTimeout(timeout);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('predict-missing-values', async (event, payload = {}) => {
    const scriptPath = path.join(__dirname, 'missing_value_predictor.py');
    if (!fs.existsSync(scriptPath)) {
      return { success: false, error: 'Missing-value prediction worker is not installed.' };
    }

    const requestPayload = {
      rows: Array.isArray(payload?.rows) ? payload.rows : [],
      columns: Array.isArray(payload?.columns) ? payload.columns : [],
      targetColumns: Array.isArray(payload?.targetColumns) ? payload.targetColumns : [],
      groupColumn: String(payload?.groupColumn || ''),
      targetRowIndices: Array.isArray(payload?.targetRowIndices) ? payload.targetRowIndices : [],
      scopeRowIndices: Array.isArray(payload?.scopeRowIndices) ? payload.scopeRowIndices : []
    };

    return new Promise((resolve) => {
      let settled = false;
      let stdout = '';
      let stderr = '';
      let timeoutId = null;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);
        resolve(result);
      };

      let worker;
      try {
        worker = spawn(getPythonPath(), [scriptPath], {
          cwd: __dirname,
          env: getPythonProcessEnv({ PYTHONIOENCODING: 'utf-8' }),
          stdio: ['pipe', 'pipe', 'pipe']
        });
      } catch (error) {
        finish({ success: false, error: `Could not start prediction worker: ${error.message}` });
        return;
      }

      worker.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
      worker.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
      worker.once('error', (error) => {
        finish({ success: false, error: `Prediction worker failed to start: ${error.message}` });
      });
      worker.once('close', (code) => {
        if (settled) return;
        const outputLines = stdout.trim().split(/\r?\n/).filter(Boolean);
        const lastLine = outputLines[outputLines.length - 1] || '';
        let result = null;
        try {
          result = lastLine ? JSON.parse(lastLine) : null;
        } catch (_) {
          result = null;
        }
        if (!result || typeof result !== 'object') {
          finish({
            success: false,
            error: `Prediction worker returned invalid output${stderr.trim() ? `: ${stderr.trim().slice(0, 500)}` : ` (exit code ${code})`}`
          });
          return;
        }
        finish(result);
      });

      timeoutId = setTimeout(() => {
        try { worker.kill(); } catch (_) { }
        finish({ success: false, error: 'Prediction worker timed out. Try a smaller row scope.' });
      }, 120000);

      try {
        worker.stdin.end(JSON.stringify(requestPayload));
      } catch (error) {
        finish({ success: false, error: `Could not send data to prediction worker: ${error.message}` });
      }
    });
  });

  // Read context files for online AI injection from the AI agent data folder.
  const AGENT_DATA_DIR = path.join(__dirname, 'AI agent', 'data');
  const AGENT_DATA_MAX_TEXT_FILE_SIZE = 512 * 1024; // 512KB hard cap for direct text reads
  const AGENT_DATA_MAX_BINARY_FILE_SIZE = 30 * 1024 * 1024; // 30MB cap for binary/native attachments
  const AGENT_DATA_MAX_CONTENT_CHARS = 120000; // prompt safety cap
  const AGENT_BINARY_EXTENSIONS = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.xlsx', '.xls', '.docx', '.zip']);

  const truncateAgentContent = (text, suffix = '\n\n[Content truncated to fit context window.]') => {
    const normalized = String(text || '');
    if (normalized.length <= AGENT_DATA_MAX_CONTENT_CHARS) {
      return { content: normalized, wasTruncated: false };
    }
    const keepLength = Math.max(0, AGENT_DATA_MAX_CONTENT_CHARS - suffix.length);
    return {
      content: `${normalized.slice(0, keepLength)}${suffix}`,
      wasTruncated: true
    };
  };

  const extractPdfText = (fullPath) => {
    try {
      const result = spawnSync('pdftotext', ['-layout', '-enc', 'UTF-8', fullPath, '-'], {
        encoding: 'utf8',
        maxBuffer: 8 * 1024 * 1024,
        timeout: 15000
      });

      if (result.error) {
        throw result.error;
      }
      if (result.status !== 0) {
        return {
          ok: false,
          error: String(result.stderr || `pdftotext exited with status ${result.status}`)
        };
      }

      const normalized = String(result.stdout || '')
        .replace(/\u0000/g, '')
        .replace(/\r\n/g, '\n')
        .replace(/\u000c/g, '\n\n')
        .trim();
      if (!normalized) {
        return { ok: false, error: 'No extractable text found in PDF.' };
      }

      const { content, wasTruncated } = truncateAgentContent(normalized);
      return { ok: true, content, wasTruncated, method: 'pdftotext' };
    } catch (error) {
      return {
        ok: false,
        error: String(error?.message || error || 'Unknown PDF extraction error')
      };
    }
  };

  // Helper to get active AI paths
  const getAgentActivePaths = (root = aiKnowledgeRoot) => {
    const dataDir = path.resolve(String(root || DEFAULT_AI_KNOWLEDGE_ROOT));
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const hash = crypto.createHash('md5').update(dataDir).digest('hex');
    const persistDir = path.join(app.getPath('userData'), 'antigravity_cache', hash);

    if (!fs.existsSync(persistDir)) {
      fs.mkdirSync(persistDir, { recursive: true });
    }

    return { dataDir, persistDir };
  };

  ipcMain.handle('open-agent-data-folder', async () => {
    try {
      const { dataDir } = getAgentActivePaths();
      if (!fs.existsSync(dataDir)) {
        return { success: false, error: `Data directory not found: ${dataDir}` };
      }
      const shellError = await shell.openPath(dataDir);
      if (shellError) throw new Error(shellError);
      return { success: true, path: dataDir };
    } catch (error) {
      console.error('[AgentData] Open Folder Error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('read-agent-data-files', async () => {
    try {
      const { dataDir } = getAgentActivePaths();
      if (!fs.existsSync(dataDir)) {
        return { success: false, error: `Data directory not found: ${dataDir}` };
      }

      const entries = fs.readdirSync(dataDir, { withFileTypes: true });
      const files = [];

      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const fullPath = path.join(dataDir, entry.name);
        const stat = fs.statSync(fullPath);
        const extension = path.extname(entry.name).toLowerCase();
        const isBinaryFormat = AGENT_BINARY_EXTENSIONS.has(extension);

        if (isBinaryFormat) {
          if (stat.size > AGENT_DATA_MAX_BINARY_FILE_SIZE) {
            console.log(`[AgentData] Skipping large binary file (${(stat.size / (1024 * 1024)).toFixed(1)}MB): ${entry.name}`);
            continue;
          }

          if (extension === '.pdf') {
            const extracted = extractPdfText(fullPath);
            if (extracted.ok) {
              files.push({
                name: entry.name,
                content: extracted.content,
                fullPath,
                extension,
                contentFormat: 'text',
                extractedFrom: 'pdf',
                extractionMethod: extracted.method,
                wasTruncated: extracted.wasTruncated,
                originalSizeBytes: stat.size
              });
              console.log(`[AgentData] Extracted PDF text: ${entry.name} (${(stat.size / 1024).toFixed(1)}KB)`);
            } else {
              files.push({
                name: entry.name,
                content: '',
                fullPath,
                extension,
                contentFormat: 'binary',
                extractedFrom: 'none',
                extractionError: extracted.error,
                originalSizeBytes: stat.size
              });
              console.warn(`[AgentData] PDF extraction failed for ${entry.name}: ${extracted.error}. Keeping native-upload fallback.`);
            }
            continue;
          }

          files.push({
            name: entry.name,
            content: '',
            fullPath,
            extension,
            contentFormat: 'binary',
            originalSizeBytes: stat.size
          });
          console.log(`[AgentData] Registered binary file for native upload: ${entry.name} (${(stat.size / 1024).toFixed(1)}KB)`);
          continue;
        }

        if (stat.size > AGENT_DATA_MAX_TEXT_FILE_SIZE) {
          console.log(`[AgentData] Skipping large text file (${(stat.size / 1024).toFixed(1)}KB): ${entry.name}`);
          continue;
        }

        try {
          const rawContent = fs.readFileSync(fullPath, 'utf8');
          let normalized = String(rawContent || '')
            .replace(/\u0000/g, '')
            .replace(/\r\n/g, '\n');
          if (extension === '.json') {
            try {
              const parsed = JSON.parse(normalized);
              normalized = JSON.stringify(parsed, null, 2);
            } catch {
              // Keep raw JSON text when parsing fails (invalid or partial JSON).
            }
          }
          const { content, wasTruncated } = truncateAgentContent(normalized);
          files.push({
            name: entry.name,
            content,
            fullPath,
            extension,
            contentFormat: 'text',
            wasTruncated,
            originalSizeBytes: stat.size
          });
          console.log(`[AgentData] Loaded: ${entry.name} (${(stat.size / 1024).toFixed(1)}KB${wasTruncated ? ', truncated' : ''})`);
        } catch (readErr) {
          console.warn(`[AgentData] Could not read ${entry.name}:`, readErr.message);
        }
      }

      return { success: true, files };
    } catch (error) {
      console.error('[AgentData] Error reading data files:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('read-r-wrapper', async () => {
    try {
      const content = fs.readFileSync(analysisWrapperPath, 'utf8');
      return { success: true, content };
    } catch (error) {
      console.error('Read R Wrapper Error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('read-golden-r-wrapper', async () => {
    try {
      const goldenPath = path.join(__dirname, 'analysis_wrapper.R.golden');
      if (!fs.existsSync(goldenPath)) {
        // Fallback to current if golden hasn't been created yet
        const content = fs.readFileSync(analysisWrapperPath, 'utf8');
        return { success: true, content, isSource: 'live-fallback' };
      }
      const content = fs.readFileSync(goldenPath, 'utf8');
      return { success: true, content, isSource: 'golden' };
    } catch (error) {
      console.error('Read Golden R Wrapper Error:', error);
      return { success: false, error: error.message };
    }
  });


  ipcMain.handle('save-r-wrapper', async (event, content) => {
    try {
      const syntaxCheck = validateRScriptContent(content || '');
      if (!syntaxCheck.ok) {
        return { success: false, error: formatSyntaxFailure(syntaxCheck, 'Proposed analysis_wrapper.R') };
      }

      if (fs.existsSync(analysisWrapperPath)) {
        fs.copyFileSync(analysisWrapperPath, analysisWrapperBackupPath);
      }
      writeFileAtomicUtf8(analysisWrapperPath, content || '');
      fs.copyFileSync(analysisWrapperPath, analysisWrapperSafePath);
      stopREditorWorker('analysis wrapper updated');
      return { success: true, backupPath: analysisWrapperBackupPath };
    } catch (error) {
      console.error('Save R Wrapper Error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('save-r-editor-file', async (event, payload = {}) => {
    try {
      const rawContent = String(payload?.content ?? '');
      const content = rawContent.replace(/\r\n/g, '\n');
      const language = String(payload?.language || 'r').toLowerCase() === 'python' ? 'python' : 'r';
      if (!content.trim()) {
        return { success: false, error: 'Editor is empty. Nothing to save.' };
      }

      const requestedName = String(payload?.suggestedName || 'script').trim().replace(/\.[^.]+$/, '');
      const safeBaseName = sanitizeExportBaseName(requestedName, 'script');
      const hasRMarkdownChunk = language === 'r'
        && /(?:^|\n)\s*```\s*\{\s*r(?:\s|,|})[\s\S]*?\n\s*```\s*(?:\n|$)/i.test(content);
      const hasPythonCell = language === 'python' && /(?:^|\n)\s*#\s*%%(?:\s|$)/.test(content);
      const requestedDocumentMode = String(payload?.documentMode || '').toLowerCase();
      const documentMode = language === 'python'
        ? ((requestedDocumentMode === 'ipynb' || hasPythonCell) ? 'ipynb' : 'script')
        : ((requestedDocumentMode === 'rmd' || hasRMarkdownChunk) ? 'rmd' : 'script');
      const isPythonNotebook = language === 'python' && documentMode === 'ipynb';
      const extension = isPythonNotebook ? 'ipynb' : (language === 'python' ? 'py' : (documentMode === 'rmd' ? 'Rmd' : 'R'));
      const defaultFileName = new RegExp(`\\.${extension}$`, 'i').test(safeBaseName)
        ? safeBaseName
        : `${safeBaseName}.${extension}`;
      const defaultPath = path.join(getWorkspaceRoot(), defaultFileName);

      const selection = await dialog.showSaveDialog({
        title: `Save ${language === 'python' ? 'Python Script' : (documentMode === 'rmd' ? 'R Markdown' : 'R Script')}`,
        defaultPath,
        buttonLabel: 'Save File',
        filters: language === 'python'
          ? (isPythonNotebook
            ? [{ name: 'Jupyter Notebook', extensions: ['ipynb'] }, { name: 'Python Script', extensions: ['py'] }, { name: 'All Files', extensions: ['*'] }]
            : [{ name: 'Python Script', extensions: ['py'] }, { name: 'Jupyter Notebook', extensions: ['ipynb'] }, { name: 'All Files', extensions: ['*'] }])
          : [
            { name: documentMode === 'rmd' ? 'R Markdown' : 'R Script', extensions: documentMode === 'rmd' ? ['Rmd', 'rmd', 'qmd'] : ['R', 'r'] },
            { name: 'All Files', extensions: ['*'] }
          ]
      });

      if (selection.canceled || !selection.filePath) {
        return { success: true, canceled: true };
      }

      const selectedExtension = path.extname(selection.filePath).toLowerCase();
      const resolvedPath = isPythonNotebook
        ? (selectedExtension === '.ipynb'
          ? selection.filePath
          : `${selection.filePath.replace(/\.[^./\\]+$/, '')}.ipynb`)
        : (selectedExtension ? selection.filePath : `${selection.filePath}.${extension}`);

      const finalContent = isPythonNotebook
        ? `${JSON.stringify(pythonEditorContentToNotebook(content), null, 2)}\n`
        : (content.endsWith('\n') ? content : `${content}\n`);
      writeFileAtomicUtf8(resolvedPath, finalContent);
      return { success: true, filePath: resolvedPath };
    } catch (error) {
      console.error('Save R Editor File Error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('open-r-editor-file', async (event, payload = {}) => {
    try {
      const selection = await dialog.showOpenDialog({
        title: 'Open Script',
        defaultPath: getWorkspaceRoot(),
        properties: ['openFile'],
        filters: [
          { name: 'Scripts (R, R Markdown, Python, Jupyter)', extensions: ['R', 'r', 'Rmd', 'rmd', 'qmd', 'py', 'ipynb'] },
          { name: 'R Script', extensions: ['R', 'r'] },
          { name: 'R Markdown', extensions: ['Rmd', 'rmd', 'qmd'] },
          { name: 'Python Script', extensions: ['py'] },
          { name: 'Jupyter Notebook', extensions: ['ipynb'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (selection.canceled || !Array.isArray(selection.filePaths) || selection.filePaths.length === 0) {
        return { success: true, canceled: true };
      }

      const filePath = selection.filePaths[0];
      const rawContent = fs.readFileSync(filePath, 'utf8');
      const ext = path.extname(filePath).toLowerCase();
      const detectedLanguage = ['.py', '.ipynb'].includes(ext) ? 'python' : 'r';
      const documentMode = detectedLanguage === 'r'
        ? (['.rmd', '.qmd'].includes(ext) ? 'rmd' : 'script')
        : (ext === '.ipynb' ? 'ipynb' : 'script');
      let content = rawContent;
      if (ext === '.ipynb') {
        try {
          content = pythonNotebookToEditorContent(JSON.parse(rawContent));
        } catch (error) {
          return { success: false, error: `Invalid Jupyter Notebook: ${error.message}` };
        }
      }
      return { success: true, filePath, content, language: detectedLanguage, documentMode };
    } catch (error) {
      console.error('Open R Editor File Error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('save-r-editor-session', async (event, payload = {}) => {
    try {
      const session = payload?.session && typeof payload.session === 'object'
        ? payload.session
        : payload;
      const requestedName = String(payload?.suggestedName || 'r-editor-session')
        .trim()
        .replace(/\.[^.]+$/, '');
      const safeBaseName = sanitizeExportBaseName(requestedName, 'r-editor-session');
      const defaultPath = path.join(getWorkspaceRoot(), `${safeBaseName}.json`);
      const selection = await dialog.showSaveDialog({
        title: 'Save Terminal Session',
        defaultPath,
        buttonLabel: 'Save Session',
        filters: [
          { name: 'Session JSON', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (selection.canceled || !selection.filePath) {
        return { success: true, canceled: true };
      }

      const resolvedPath = path.extname(selection.filePath)
        ? selection.filePath
        : `${selection.filePath}.json`;
      writeFileAtomicUtf8(resolvedPath, `${JSON.stringify(session, null, 2)}\n`);
      return { success: true, filePath: resolvedPath };
    } catch (error) {
      console.error('Save R Editor Session Error:', error);
      return { success: false, error: error.message };
    }
  });

  let activeRFileWatcher = null;
  let activeRFilePath = null;
  let ignoreNextWatchEvent = false;
  let ignoreResetTimer = null;

  ipcMain.handle('watch-r-file', async (event, absolutePath) => {
    try {
      if (activeRFileWatcher) {
        activeRFileWatcher.close();
        activeRFileWatcher = null;
      }
      activeRFilePath = absolutePath;
      if (!fs.existsSync(absolutePath)) {
        return { success: false, error: 'File does not exist' };
      }

      const dir = path.dirname(absolutePath);
      const baseName = path.basename(absolutePath);

      activeRFileWatcher = fs.watch(dir, (eventType, filename) => {
        if (filename === baseName) {
          if (ignoreNextWatchEvent) return;

          try {
            // Small delay to ensure atomic writes complete before reading
            setTimeout(() => {
              if (!fs.existsSync(absolutePath)) return;
              const newContent = fs.readFileSync(absolutePath, 'utf8');
              if (mainAppWindow && mainAppWindow.webContents) {
                mainAppWindow.webContents.send('r-file-changed', newContent, absolutePath);
              }
            }, 100);
          } catch (e) {
            console.error('Error reading watched R file:', e);
          }
        }
      });
      return { success: true };
    } catch (error) {
      console.error('Watch R File Error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('unwatch-r-file', async () => {
    if (activeRFileWatcher) {
      activeRFileWatcher.close();
      activeRFileWatcher = null;
    }
    activeRFilePath = null;
    return { success: true };
  });

  ipcMain.handle('silent-save-r-file', async (event, content, absolutePath) => {
    try {
      if (!absolutePath || !fs.existsSync(absolutePath)) {
        return { success: false, error: 'Invalid path for silent save' };
      }

      ignoreNextWatchEvent = true;
      clearTimeout(ignoreResetTimer);
      ignoreResetTimer = setTimeout(() => { ignoreNextWatchEvent = false; }, 500);

      const finalContent = content.endsWith('\n') ? content : `${content}\n`;
      writeFileAtomicUtf8(absolutePath, finalContent);

      return { success: true };
    } catch (error) {
      console.error('Silent Save R File Error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('prepare-cli-r-context', async (event, payload = {}) => {
    try {
      const language = String(payload?.language || 'r').toLowerCase() === 'python' ? 'python' : 'r';
      const content = String(payload?.content ?? '');
      const requestedPath = language === 'r' ? String(payload?.activeFilePath || '').trim() : '';
      const workspaceRoot = path.resolve(getWorkspaceRoot());
      let targetPath;

      if (requestedPath) {
        targetPath = path.resolve(requestedPath);
        const relativePath = path.relative(workspaceRoot, targetPath);
        const outsideWorkspace = relativePath === '..'
          || relativePath.startsWith(`..${path.sep}`)
          || path.isAbsolute(relativePath);
        if (outsideWorkspace) {
          throw new Error('The active R file must be inside the selected workspace.');
        }
        if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
          throw new Error('The active R file no longer exists.');
        }
      } else {
        const contextDirectory = path.join(workspaceRoot, '.ngr');
        fs.mkdirSync(contextDirectory, { recursive: true });
        targetPath = path.join(contextDirectory, `ollama-context.${language === 'python' ? 'py' : 'R'}`);
      }

      if (language === 'r' && targetPath === activeRFilePath) {
        ignoreNextWatchEvent = true;
        clearTimeout(ignoreResetTimer);
        ignoreResetTimer = setTimeout(() => { ignoreNextWatchEvent = false; }, 500);
      }

      const finalContent = content.endsWith('\n') ? content : `${content}\n`;
      writeFileAtomicUtf8(targetPath, finalContent);
      return {
        success: true,
        filePath: targetPath,
        relativePath: toWorkspaceRelativePath(targetPath),
        directory: path.dirname(targetPath),
        isActiveFile: Boolean(requestedPath),
        language
      };
    } catch (error) {
      console.error('Prepare CLI R Context Error:', error);
      return { success: false, error: error?.message || 'Unable to prepare the R file for CLI.' };
    }
  });


  ipcMain.handle('get-opencode-models', async (event, requestedDirectory) => {
    const cwd = typeof requestedDirectory === 'string' && path.isAbsolute(requestedDirectory)
      && fs.existsSync(requestedDirectory) && fs.statSync(requestedDirectory).isDirectory()
      ? requestedDirectory
      : process.cwd();

    return new Promise((resolve) => {
      execFile('opencode', ['models'], {
        cwd,
        env: { ...process.env, PATH: `${process.env.PATH || ''}:${path.join(os.homedir(), '.local', 'bin')}` },
        timeout: 30000,
        maxBuffer: 1024 * 1024
      }, (error, stdout = '', stderr = '') => {
        const output = `${stdout}\n${stderr}`.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
        const models = [...new Set(output.split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => /^[^/\s]+\/\S+$/.test(line)))];
        if (models.length > 0) return resolve({ success: true, models });
        resolve({
          success: false,
          models: [],
          error: error?.code === 'ENOENT'
            ? 'OpenCode is not available on PATH.'
            : (stderr || error?.message || 'OpenCode returned no models.').trim()
        });
      });
    });
  });

  ipcMain.handle('get-opencode-auth-status', async () => new Promise((resolve) => {
    execFile('opencode', ['auth', 'list'], {
      env: { ...process.env, PATH: `${process.env.PATH || ''}:${path.join(os.homedir(), '.local', 'bin')}` },
      timeout: 15000,
      maxBuffer: 256 * 1024
    }, (error, stdout = '', stderr = '') => {
      const output = `${stdout}\n${stderr}`.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
      const connected = /\bstored\b/i.test(output);
      resolve({
        success: !error || connected,
        connected,
        error: connected ? null : (error?.message || stderr || 'No OpenCode account is connected.').trim()
      });
    });
  }));

  let openCodeActiveProcess = null;
  ipcMain.handle('opencode-chat-request', async (event, payload = {}) => {
    if (openCodeActiveProcess) return { success: false, error: 'An OpenCode request is already running.' };
    const prompt = String(payload?.prompt || '').trim();
    if (!prompt) return { success: false, error: 'OpenCode received an empty prompt.' };
    const requestedDirectory = String(payload?.cwd || '').trim();
    const cwd = path.isAbsolute(requestedDirectory) && fs.existsSync(requestedDirectory)
      && fs.statSync(requestedDirectory).isDirectory() ? requestedDirectory : process.cwd();
    const model = String(payload?.model || '').trim();
    const sessionId = String(payload?.sessionId || '').trim();
    const args = ['run', '--format', 'json'];
    if (model) args.push('--model', model);
    if (sessionId) args.push('--session', sessionId);
    args.push(prompt);

    return new Promise((resolve) => {
      const child = spawn('opencode', args, {
        cwd,
        env: { ...process.env, PATH: `${process.env.PATH || ''}:${path.join(os.homedir(), '.local', 'bin')}` },
        stdio: ['ignore', 'pipe', 'pipe']
      });
      openCodeActiveProcess = child;
      let stdout = '';
      let stderr = '';
      let streamBuffer = '';
      let streamedText = '';
      const emitOpenCodeEvent = (line) => {
        try {
          const value = JSON.parse(line);
          const partText = value.type === 'text'
            ? (value.text || value.part?.text || value.content)
            : (value.part?.type === 'text' ? value.part.text : '');
          if (typeof partText === 'string' && partText) {
            streamedText += partText;
            if (event.sender && !event.sender.isDestroyed()) {
              event.sender.send('opencode-response-chunk', { text: streamedText, done: false });
            }
          }
        } catch (_) { /* Wait for the complete JSON line. */ }
      };
      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
        streamBuffer += chunk.toString();
        const lines = streamBuffer.split(/\r?\n/);
        streamBuffer = lines.pop() || '';
        lines.forEach(emitOpenCodeEvent);
      });
      child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
      child.on('error', (error) => {
        openCodeActiveProcess = null;
        resolve({ success: false, error: error.code === 'ENOENT' ? 'OpenCode is not available on PATH.' : error.message });
      });
      child.on('close', (code) => {
        openCodeActiveProcess = null;
        const events = stdout.split(/\r?\n/).map((line) => {
          try { return JSON.parse(line); } catch (_) { return null; }
        }).filter(Boolean);
        const textParts = [];
        let returnedSessionId = '';
        const collect = (value) => {
          if (typeof value === 'string' && value.trim()) textParts.push(value);
        };
        const visit = (value) => {
          if (!value || typeof value !== 'object') return;
          returnedSessionId ||= String(value.sessionID || value.sessionId || value.session_id || '').trim();
          if (value.type === 'text') collect(value.text || value.part?.text || value.content);
          if (value.part?.type === 'text') collect(value.part.text);
          if (value.message?.role === 'assistant') {
            if (Array.isArray(value.message.content)) value.message.content.forEach((part) => collect(part?.text));
            else collect(value.message.content);
          }
        };
        events.forEach(visit);
        const text = [...new Set(textParts)].join('');
        if (event.sender && !event.sender.isDestroyed() && text.trim()) {
          event.sender.send('opencode-response-chunk', { text: text.trim(), done: true });
        }
        if (code === 0 && text.trim()) return resolve({ success: true, text: text.trim(), sessionId: returnedSessionId || sessionId });
        resolve({ success: false, error: (stderr || text || `OpenCode exited with code ${code ?? 1}`).trim() });
      });
    });
  });

  ipcMain.handle('opencode-cancel-request', async () => {
    if (!openCodeActiveProcess) return { success: false, error: 'No active OpenCode request.' };
    try { openCodeActiveProcess.kill('SIGTERM'); } catch (_) { }
    openCodeActiveProcess = null;
    return { success: true };
  });

  ipcMain.handle('fix-r-code', async (event, code, output, model) => {
    try {
      const ready = await ensureActiveAiEndpointReady();
      if (!ready) throw new Error('Local Ollama is not running or not ready');

      const MAX_CODE_CHARS = 8000;
      const MAX_OUTPUT_CHARS = 4000;
      const codeText = String(code || "").slice(-MAX_CODE_CHARS);
      const outputText = String(output || "").slice(-MAX_OUTPUT_CHARS);
      const modelName = model || process.env.OLLAMA_MODEL || "r-wrapper-corrector";

      // Neural Reference Layer
      const masterPath = path.join(__dirname, 'analysis_wrapper.R');
      const masterCode = fs.existsSync(masterPath) ? fs.readFileSync(masterPath, 'utf8').slice(0, 30000) : '';

      const systemPrompt = `You are the R Wrapper Corrector acting in HYPER-PRECISE MODE (Option B: Character-Exact).
You have the NEURAL_SIGNATURE_REFERENCE (Ground Truth) below.

### NEURAL_SIGNATURE_REFERENCE ###
${masterCode}
### END REFERENCE ###

CRITICAL RULES (ZERO TOLERANCE):
1. Compare the user's code against the REFERENCE bit-for-bit, character-by-character.
2. Even a single extra space, a different tab, or a modified number is a CRITICAL SIGNATURE BREACH.
3. Your ONLY goal is to restore the user's input to the exact patterns in the REFERENCE.
4. If there are NO deviations, return "OK".`;

      const prompt = `Fix this R code based on the error:\n\nR code:\n${codeText}\n\nError output:\n${outputText}\n\nProvide ONLY the corrected R code, no explanations or markdown:`;

      const response = await fetch(getActiveApiUrl(), {
        method: 'POST',
        headers: buildOllamaHeaders({ includeJson: true }),
        body: JSON.stringify({
          model: modelName,
          system: systemPrompt,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.1,
            top_p: 0.85,
            repeat_penalty: 1.2,
            num_predict: 1024,
            stop: ["\n\n\n"]
          }
        })
      });

      if (!response.ok) throw new Error(`Ollama Error: ${response.statusText}`);
      const json = await response.json();
      let fixedCode = (json.response || "").trim();

      // Clean up markdown artifacts
      fixedCode = fixedCode.replace(/^```r?\n?/i, '').replace(/\n?```$/i, '');

      return { success: true, text: fixedCode };
    } catch (error) {
      console.error("Fix Code Error:", error);
      return { success: false, error: error.message };
    }
  });

  // ── 100% PARITY CHECKER ──────────────────────────────────────────────────
  // Pure Node.js string diff — no AI, no hallucination.
  // Returns exact breach location so the scanner can pin-point it.
  ipcMain.handle('compare-r-wrapper', async (event, userCode) => {
    try {
      const workingPath = path.join(__dirname, 'analysis_wrapper.R');
      const goldenPath = path.join(__dirname, 'analysis_wrapper.R.golden');

      if (!fs.existsSync(workingPath)) {
        return { success: false, error: 'Master reference file not found: analysis_wrapper.R' };
      }

      // ── GOLDEN COPY ─────────────────────────────────────────────────────
      // The golden file is written ONCE (on the very first parity scan) and
      // NEVER overwritten. It is the immutable ground truth.
      // Even if the user saves corrupted content to analysis_wrapper.R, the
      // golden copy stays pristine — so the diff is always accurate.
      if (!fs.existsSync(goldenPath)) {
        console.log('[compare-r-wrapper] Creating golden reference:', goldenPath);
        fs.copyFileSync(workingPath, goldenPath);
      }

      const masterText = fs.readFileSync(goldenPath, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

      const masterLines = masterText.split('\n');
      const userLines = String(userCode || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');


      const breaches = [];
      const maxLines = Math.max(masterLines.length, userLines.length);

      for (let i = 0; i < maxLines; i++) {
        const ref = (masterLines[i] !== undefined) ? masterLines[i] : null;
        const user = (userLines[i] !== undefined) ? userLines[i] : null;

        if (ref === null) {
          // Extra lines added by user beyond the reference
          breaches.push({
            line: i + 1,
            type: 'EXTRA_LINE',
            ref: '',
            user: user,
            message: `Extra line added at line ${i + 1}`
          });
        } else if (user === null) {
          // Lines missing that exist in reference
          breaches.push({
            line: i + 1,
            type: 'MISSING_LINE',
            ref: ref,
            user: '',
            message: `Line ${i + 1} is missing (expected: "${ref.substring(0, 60)}")`
          });
        } else if (ref !== user) {
          // Character-level mismatch
          // Find exact char position of first difference
          let charPos = 0;
          for (let c = 0; c < Math.max(ref.length, user.length); c++) {
            if (ref[c] !== user[c]) { charPos = c; break; }
          }
          breaches.push({
            line: i + 1,
            type: 'MISMATCH',
            ref: ref,
            user: user,
            charPos,
            message: `Line ${i + 1}, char ${charPos + 1}: expected "${ref.substring(0, 80)}" but got "${user.substring(0, 80)}"`
          });
        }
      }

      if (breaches.length === 0) {
        return { success: true, match: true, message: 'Perfect match: code is identical to the reference.' };
      }

      // Return the first breach for pin-point scanning
      return {
        success: true,
        match: false,
        firstBreach: breaches[0],
        totalBreaches: breaches.length,
        allBreaches: breaches.slice(0, 50) // cap at 50 for performance
      };

    } catch (error) {
      console.error('[compare-r-wrapper] Error:', error);
      return { success: false, error: error.message };
    }
  });

  // ── RESET GOLDEN REFERENCE ────────────────────────────────────────────────
  // Lets the user re-lock the current analysis_wrapper.R as the new golden
  // reference (e.g. after an intentional authorised update).
  ipcMain.handle('reset-golden', async () => {
    try {
      const workingPath = path.join(__dirname, 'analysis_wrapper.R');
      const goldenPath = path.join(__dirname, 'analysis_wrapper.R.golden');
      if (!fs.existsSync(workingPath)) {
        return { success: false, error: 'analysis_wrapper.R not found' };
      }
      fs.copyFileSync(workingPath, goldenPath);
      console.log('[reset-golden] Golden reference updated from current analysis_wrapper.R');
      return { success: true, message: 'Golden reference re-locked.' };
    } catch (error) {
      console.error('[reset-golden] Error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('lint-r-code', async (event, code, breachLine, model) => {
    try {
      const ready = await ensureActiveAiEndpointReady();
      if (!ready) throw new Error('Local Ollama is not running or not ready');

      const codeText = String(code || "").trim();
      if (!codeText) return { success: true, text: "OK" };

      const modelName = model || process.env.OLLAMA_MODEL || "r-wrapper-corrector";

      // ── Surgical Reference Extraction (Line-Aware) ──────────────────────
      // Instead of fuzzy matching, we use the exact line index provided
      // by the parity scanner. This ensures a 1:1 context comparison.
      const goldenPath = path.join(__dirname, 'analysis_wrapper.R.golden');
      const masterPath = fs.existsSync(goldenPath) ? goldenPath : path.join(__dirname, 'analysis_wrapper.R');

      const masterLines = fs.existsSync(masterPath)
        ? fs.readFileSync(masterPath, 'utf8').split('\n')
        : [];

      let referenceSegment = '';

      if (masterLines.length > 0 && typeof breachLine === 'number') {
        // Extract the same 11-line window (-5 to +5) from the golden copy
        const startIdx = Math.max(0, breachLine - 6); // breachLine is 1-indexed
        const endIdx = Math.min(masterLines.length, breachLine + 5);
        referenceSegment = masterLines.slice(startIdx, endIdx).join('\n');
      } else if (masterLines.length > 0) {
        // Fallback to fuzzy matching if no line number provided
        const chunkLines = codeText.split('\n');
        const anchorLine = chunkLines.find(l => l.trim().length > 4) || chunkLines[0];
        const anchorTrimmed = (anchorLine || '').trim();

        let bestMatchIdx = -1;
        let bestScore = 0;
        for (let i = 0; i < masterLines.length; i++) {
          const refTrimmed = masterLines[i].trim();
          if (refTrimmed.length < 4) continue;
          const overlap = [...anchorTrimmed].filter(c => refTrimmed.includes(c)).length;
          const score = overlap / Math.max(anchorTrimmed.length, refTrimmed.length);
          if (score > bestScore && score > 0.6) {
            bestScore = score;
            bestMatchIdx = i;
          }
        }

        if (bestMatchIdx >= 0) {
          const refStart = Math.max(0, bestMatchIdx);
          const refEnd = Math.min(masterLines.length, refStart + chunkLines.length);
          referenceSegment = masterLines.slice(refStart, refEnd).join('\n');
        }
      }


      // ── AI Consultant Mode (Simplified) ───────────────────────────────
      // We remove the JSON requirement which was causing the model to hallucinate.
      // We now ask for a direct 1:1 correction or "OK".
      const systemPrompt = referenceSegment
        ? `You are an R code accuracy consultant. 
Compare the USER CODE to the GROUND TRUTH. 

GROUND TRUTH:
${referenceSegment}

TASK:
1. If the USER CODE is identical to GROUND TRUTH, output exactly: OK
2. If there is ANY difference, output ONLY the corrected version from GROUND TRUTH.
3. NO explanations, NO markdown, NO JSON.`
        : `Check for R syntax errors. If none, output OK. If errors, output ONLY the fixed code.`;

      const prompt = `USER CODE:\n${codeText}\n\nCorrection or OK:`;


      const response = await fetch(getActiveApiUrl(), {
        method: 'POST',
        headers: buildOllamaHeaders({ includeJson: true }),
        body: JSON.stringify({
          model: modelName,
          system: systemPrompt,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.0,
            top_p: 0.95,
            repeat_penalty: 1.05,
            num_predict: 600,
            stop: ["\n\n\n"]
          }
        })
      });

      if (!response.ok) throw new Error(`Ollama Error: ${response.statusText}`);
      const json = await response.json();
      let responseText = (json.response || "").trim();

      console.log(`[lint-r-code] AI response (first 80 chars): ${responseText.substring(0, 80)}`);

      // Check for OK
      if (/^OK$/i.test(responseText) || responseText.includes('"hasError": false')) {
        return { success: true, text: "OK" };
      }

      // Extract JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.hasError && parsed.fixedCode) {
            return { success: true, text: parsed.fixedCode, errorType: parsed.errorType };
          }
          // hasError: false case
          return { success: true, text: "OK" };
        } catch (e) { }
      }

      // Fallback: non-OK, non-JSON response — treat as the fix suggestion
      if (responseText.length > 5) {
        const clean = responseText.replace(/```r?\n?/gi, '').replace(/```/g, '').trim();
        if (clean && !/^OK$/i.test(clean)) {
          return { success: true, text: clean, errorType: 'Potential deviation detected' };
        }
      }

      return { success: true, text: "OK" };
    } catch (error) {
      console.error("Lint Code Error:", error);
      return { success: false, error: error.message };
    }
  });


  ipcMain.handle('parse-r-code', async (event, code) => {
    try {
      const codeText = String(code || "");
      const script = `
code <- paste(readLines(file("stdin")), collapse="\\n")
if (length(code) == 0 || nchar(code) == 0) {
  cat("OK")
  quit(save = "no")
}
res <- tryCatch({
  parse(text = code)
  list(ok = TRUE)
}, error = function(e) {
  msg <- conditionMessage(e)
  line <- NA_integer_
  col <- NA_integer_
  m <- regexec("<text>:(\\\\d+):(\\\\d+):", msg)
  r <- regmatches(msg, m)
  if (length(r) > 0 && length(r[[1]]) >= 3) {
    line <- as.integer(r[[1]][2])
    col <- as.integer(r[[1]][3])
  }
  list(ok = FALSE, line = line, col = col, message = msg)
})
if (isTRUE(res$ok)) {
  cat("OK")
} else {
  line <- ifelse(is.na(res$line), "", as.character(res$line))
  col <- ifelse(is.na(res$col), "", as.character(res$col))
  cat("ERROR\\n", line, "\\n", col, "\\n", res$message, sep = "")
}
`;

      const result = await new Promise((resolve, reject) => {
        const proc = spawn('Rscript', ['-e', script], {
          stdio: ['pipe', 'pipe', 'pipe']
        });
        let stdout = "";
        let stderr = "";

        proc.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        proc.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        proc.on('error', (err) => reject(err));
        proc.on('close', (code) => {
          if (code !== 0 && !stdout.trim()) {
            reject(new Error(stderr || `Rscript exited with code ${code}`));
            return;
          }
          resolve(stdout);
        });

        proc.stdin.write(codeText);
        proc.stdin.end();
      });

      const output = String(result || "").replace(/\r\n/g, "\n");
      if (output.startsWith("OK")) {
        return { success: true, ok: true };
      }

      if (!output.startsWith("ERROR")) {
        return { success: false, error: "Unexpected parse output" };
      }

      const lines = output.split("\n");
      const lineNum = (lines[1] || "").trim();
      const colNum = (lines[2] || "").trim();
      const message = lines.slice(3).join("\n").trim();

      return {
        success: true,
        ok: false,
        line: lineNum ? Number(lineNum) : null,
        col: colNum ? Number(colNum) : null,
        message: message || "Parse error"
      };
    } catch (error) {
      console.error("Parse R Code Error:", error);
      return { success: false, error: error.message };
    }
  });

  // IPC Handlers for Document Agent
  let docAgentProcess = null;
  let docAgentStatus = 'idle'; // idle | initializing | ready | error

  ipcMain.handle('initialize-doc-agent', async (event, selectedModel) => {
    try {
      // Stop existing process if any
      if (docAgentProcess) {
        docAgentProcess.kill();
        docAgentProcess = null;
      }

      docAgentStatus = 'initializing';
      event.sender.send('doc-agent-status', { status: 'initializing', message: 'Starting document agent...' });

      const scriptPath = path.join(__dirname, 'doc_agent_server.py');
      docAgentProcess = spawn(getPythonPath(), [scriptPath], {
        cwd: getWorkspaceRoot(),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: getPythonProcessEnv()
      });

      let docAgentStdoutBuffer = '';

      // Handle stdout (JSON responses)
      docAgentProcess.stdout.on('data', (data) => {
        docAgentStdoutBuffer += data.toString();
        const lines = docAgentStdoutBuffer.split('\n');
        docAgentStdoutBuffer = lines.pop() || '';

        lines.forEach((line) => {
          if (!line.trim()) return;
          try {
            const response = JSON.parse(line);

            if (response.type === 'status') {
              docAgentStatus = response.status;
              event.sender.send('doc-agent-status', response);
            } else if (response.type === 'response') {
              event.sender.send('doc-agent-response', response);
            } else if (response.type === 'response_chunk') {
              event.sender.send('doc-agent-response-chunk', response);
            } else if (response.type === 'response_done') {
              event.sender.send('doc-agent-response-done', response);
            } else if (response.type === 'fix_result') {
              event.sender.send('doc-agent-fix-result', response);
            } else if (response.type === 'error') {
              docAgentStatus = 'error';
              event.sender.send('doc-agent-error', response);
            } else if (response.type === 'system') {
              console.log('Doc Agent:', response.message);
            } else if (response.type === 'documents') {
              event.sender.send('doc-agent-documents', response);
            } else if (response.type === 'completion_response') {
              event.sender.send('doc-agent-completion', response);
            }
          } catch (e) {
            console.log('Doc Agent Output:', line);
          }
        });
      });

      // Handle stderr
      docAgentProcess.stderr.on('data', (data) => {
        const msg = data.toString();
        console.error('Doc Agent Error:', msg);
        event.sender.send('doc-agent-error', { error: msg });
      });

      // Handle process exit
      docAgentProcess.on('close', (code) => {
        console.log(`Doc Agent process exited with code ${code}`);
        docAgentProcess = null;
        docAgentStatus = 'idle';
        event.sender.send('doc-agent-status', { status: 'stopped', message: 'Agent stopped' });
      });

      // Send initialize command with selected model and workspace paths
      const activeBaseUrl = getActiveBaseUrl();
      const activeApiKey = String(process.env.OLLAMA_API_KEY || '').trim();
      const { dataDir, persistDir } = getAgentActivePaths();

      docAgentProcess.stdin.write(JSON.stringify({
        command: 'initialize',
        model: selectedModel || 'r-wrapper-corrector',
        base_url: activeBaseUrl,
        api_key: activeApiKey || null,
        data_dir: dataDir,
        persist_dir: persistDir
      }) + '\n');

      return { success: true };
    } catch (error) {
      console.error('Doc Agent Init Error:', error);
      docAgentStatus = 'error';
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('query-doc-agent', async (event, payload) => {
    if (!docAgentProcess || docAgentStatus !== 'ready') {
      return { success: false, error: 'Agent not ready. Please initialize first.' };
    }

    try {
      const question = typeof payload === 'string'
        ? payload
        : String(payload?.question || '');
      const strictFilesOnly = typeof payload === 'object' && payload !== null
        ? Boolean(payload.strictFilesOnly ?? payload.strict_files_only ?? true)
        : true;
      const normalizedQuestion = question.trim();
      if (!normalizedQuestion) {
        return { success: false, error: 'Question is required.' };
      }

      docAgentProcess.stdin.write(JSON.stringify({
        command: 'query',
        question: normalizedQuestion,
        stream: true,
        strict_files_only: strictFilesOnly
      }) + '\n');
      return { success: true };
    } catch (error) {
      console.error('Doc Agent Query Error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-doc-agent-status', async () => {
    if (!docAgentProcess) {
      return { success: true, status: 'idle' };
    }

    try {
      docAgentProcess.stdin.write(JSON.stringify({ command: 'status' }) + '\n');
      return { success: true, status: docAgentStatus };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('fix-r-code-error', async (event, error_message, code_context) => {
    if (!docAgentProcess || docAgentStatus !== 'ready') {
      return { success: false, error: 'Agent not ready. Please initialize first.' };
    }

    try {
      docAgentProcess.stdin.write(JSON.stringify({
        command: 'fix_error',
        error_message: error_message,
        code_context: code_context
      }) + '\n');
      return { success: true };
    } catch (error) {
      console.error('Doc Agent Fix Error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('apply-r-code-fix', async (event, newContent) => {
    try {
      const syntaxCheck = validateRScriptContent(newContent || '');
      if (!syntaxCheck.ok) {
        return { success: false, error: formatSyntaxFailure(syntaxCheck, 'AI-fixed analysis_wrapper.R') };
      }

      if (fs.existsSync(analysisWrapperPath)) {
        fs.copyFileSync(analysisWrapperPath, analysisWrapperBackupPath);
      }
      writeFileAtomicUtf8(analysisWrapperPath, newContent || '');
      fs.copyFileSync(analysisWrapperPath, analysisWrapperSafePath);
      stopREditorWorker('analysis wrapper updated');
      return { success: true, message: 'Fix applied successfully. Backup created.' };
    } catch (error) {
      console.error('Apply Fix Error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('restore-r-code-backup', async (event) => {
    try {
      if (!fs.existsSync(analysisWrapperBackupPath) && !fs.existsSync(analysisWrapperSafePath)) {
        return { success: false, error: 'No backup found.' };
      }

      let restoreSource = analysisWrapperBackupPath;
      let backupCheck = fs.existsSync(analysisWrapperBackupPath) ? checkRScriptSyntax(analysisWrapperBackupPath) : { ok: false };
      if (!backupCheck.ok) {
        const safeCheck = fs.existsSync(analysisWrapperSafePath) ? checkRScriptSyntax(analysisWrapperSafePath) : { ok: false };
        if (safeCheck.ok) {
          restoreSource = analysisWrapperSafePath;
        } else {
          return {
            success: false,
            error: 'Backup exists but is invalid, and no valid safe snapshot is available.'
          };
        }
      }

      const restoreContent = fs.readFileSync(restoreSource, 'utf8');
      writeFileAtomicUtf8(analysisWrapperPath, restoreContent);
      fs.copyFileSync(analysisWrapperPath, analysisWrapperSafePath);
      stopREditorWorker('analysis wrapper restored');
      return { success: true, message: `Restored from ${path.basename(restoreSource)} successfully.` };
    } catch (error) {
      console.error('Restore Backup Error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('list-doc-agent-documents', async () => {
    if (!docAgentProcess) {
      return { success: false, error: 'Agent not running' };
    }

    try {
      docAgentProcess.stdin.write(JSON.stringify({ command: 'list_documents' }) + '\n');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('stop-doc-agent', async () => {
    if (docAgentProcess) {
      docAgentProcess.kill();
      docAgentProcess = null;
      docAgentStatus = 'idle';
    }
    return { success: true };
  });

  ipcMain.handle('set-cloud-ai-url', async (event, url, apiKey = null, mode = 'auto') => {
    const requestedMode = String(mode || 'auto').trim().toLowerCase();
    const forceCloud = requestedMode === 'cloud';
    const forceLocal = requestedMode === 'local';

    if (forceLocal || (!forceCloud && (url === null || url === undefined))) {
      currentOllamaApi = normalizeOllamaApiUrl(process.env.OLLAMA_API || `${DEFAULT_OLLAMA_BASE}/api/generate`);
      currentOllamaApiKey = String(process.env.OLLAMA_API_KEY || '').trim();
      console.log('Reset to Local AI');
    } else {
      const explicitUrl = String(url ?? '').trim();
      const fallbackCloudUrl = String(
        process.env.OLLAMA_CLOUD_API ||
        process.env.OLLAMA_API_CLOUD ||
        process.env.OLLAMA_API ||
        ''
      ).trim();
      currentOllamaApi = normalizeOllamaApiUrl(explicitUrl || fallbackCloudUrl || currentOllamaApi || `${DEFAULT_OLLAMA_BASE}/api/generate`);
      currentOllamaApiKey = String(apiKey || '').trim();
      console.log('Switched to Cloud AI:', currentOllamaApi, apiKey ? '(API Key provided)' : '(No API Key)');
    }

    // Persist changes to disk
    saveAIConfig(currentOllamaApi, currentOllamaApiKey, aiKnowledgeRoot);

    const activeUrl = getActiveApiUrl();
    const baseUrl = getActiveBaseUrl();
    const finalApiKey = currentOllamaApiKey;

    // If the Doc Agent is running, update its base URL too
    if (docAgentProcess) {
      console.log('[Ollama] Synchronizing Doc Agent with new Cloud AI settings...');
      docAgentProcess.stdin.write(JSON.stringify({
        command: 'update_url',
        url: baseUrl,
        api_key: finalApiKey || null
      }) + '\n');
    }

    return {
      success: true,
      active: activeUrl,
      baseUrl: baseUrl,
      isLocal: isLocalOllama()
    };
  });

  ipcMain.handle('get-r-editor-api-keys', async () => {
    const config = loadAIConfig();
    return config.rEditorApiKeys && typeof config.rEditorApiKeys === 'object'
      ? config.rEditorApiKeys
      : {};
  });

  ipcMain.handle('save-r-editor-api-keys', async (event, apiKeys = {}) => (
    saveREditorApiKeys(apiKeys)
  ));

  ipcMain.handle('get-ai-completion', async (event, context, model, promptIndex = 1) => {
    try {
      const ready = await ensureActiveAiEndpointReady();
      if (!ready) throw new Error('Local Ollama is not running or not ready');

      const MAX_CONTEXT_CHARS = 7000;
      const snippet = String(context || "").slice(-MAX_CONTEXT_CHARS);
      const modelName = model || process.env.OLLAMA_MODEL || "r-wrapper-corrector";

      // ── SYSTEM PROMPTS ───────────────────────────────────────────────
      const strictCodeBlockFormat = 'Return exactly one markdown R code block (```r ... ```), with no text before or after it.';
      let systemPrompt = `You are a Codex-style R completion engine. Continue the current code context with executable R only. ${strictCodeBlockFormat} No comments-only output.`;
      let finalPrompt = `CURRENT_R_CONTEXT:\n${snippet}\n\nTASK: Continue from the cursor using ONLY executable R code. Do not repeat existing lines. ${strictCodeBlockFormat}\n\nCOMPLETION:\n`;

      if (promptIndex === 1) {
        systemPrompt = `You are a senior R developer operating in Codex mode. Return only executable R code that naturally extends the current snippet. ${strictCodeBlockFormat} No explanations, no narrative, and no lines starting with ##.`;
        finalPrompt = `CURRENT_R_CONTEXT:\n${snippet}\n\nReturn ONLY the next executable R code lines. ${strictCodeBlockFormat}\n`;
      } else {
        systemPrompt = `STRICT CONTINUATION MODE: Continue EXACTLY where the user left off. Do not repeat existing lines. ${strictCodeBlockFormat} Do not output explanations or any lines starting with ##.`;
        finalPrompt = `STRICT_CONTINUATION_CONTEXT:\n${snippet}\n\nEXECUTABLE_R_CONTINUATION (in one \`\`\`r\`\`\` block only):\n`;
      }

      // If the Neural Model is active and the Doc Agent is ready, use the "Cheater" RAG mode
      if (modelName === 'r-assistant-neural' && docAgentProcess && docAgentStatus === 'ready') {
        console.log('Using Neural RAG Copilot (Cheater Mode)...');
        return new Promise((resolve) => {
          const onData = (data) => {
            const lines = data.toString().split('\n');
            for (const line of lines) {
              if (line.trim()) {
                try {
                  const json = JSON.parse(line);
                  if (json.type === 'completion_response') {
                    docAgentProcess.stdout.removeListener('data', onData);
                    const sanitized = sanitizeRModelCodeOutput(json.completion || '', { expectsPatchBlocks: false });
                    resolve({ success: true, completion: sanitized });
                    return;
                  }
                } catch (e) { }
              }
            }
          };
          docAgentProcess.stdout.on('data', onData);
          docAgentProcess.stdin.write(JSON.stringify({
            command: 'get_completion',
            context: snippet,
            promptIndex: promptIndex
          }) + '\n');

          // 10 second timeout for RAG lookup
          setTimeout(() => {
            docAgentProcess.stdout.removeListener('data', onData);
            resolve({ success: false, error: 'Neural Engine Timeout' });
          }, 10000);
        });
      }

      const response = await fetch(getActiveApiUrl(), {
        method: 'POST',
        headers: buildOllamaHeaders({ includeJson: true }),
        body: JSON.stringify({
          model: modelName,
          system: systemPrompt,
          prompt: finalPrompt,
          stream: false,
          options: {
            temperature: 0.1,
            top_p: 0.9,
            repeat_penalty: 1.2, // Increased to prevent repetition
            num_predict: 512,
            stop: ["\n\n\n", "<|file_separator|>"]
          }
        })
      });

      if (!response.ok) throw new Error(`Ollama Error: ${response.statusText}`);
      const json = await response.json();
      let completion = sanitizeRModelCodeOutput(json.response || '', { expectsPatchBlocks: false });
      if (!completion) {
        return { success: true, completion: '' };
      }

      // ── EXTRACTION LOGIC ─────────────────────────────────────────────
      completion = completion.trimEnd();

      // REPETITION REMOVAL: Aggressively strip any prefix that matches the end of your snippet
      // Detect 'Echo Effect' by scanning for largest shared line sequence
      const responseLines = completion.split('\n');
      const snippetLines = snippet.trimEnd().split('\n').map(l => l.trimEnd());

      let overlapLines = 0;
      for (let i = 1; i <= Math.min(responseLines.length, 20); i++) {
        const responsePrefix = responseLines.slice(0, i).join('\n').trim();
        if (snippet.trimEnd().endsWith(responsePrefix)) {
          overlapLines = i;
        }
      }

      if (overlapLines > 0) {
        console.log(`[Copilot] Stripping ${overlapLines} lines of repeated context.`);
        completion = responseLines.slice(overlapLines).join('\n').trimStart();
      }

      return { success: true, completion: completion };
    } catch (error) {
      console.error('AI Completion Error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-claude-agent-spec', async () => {
    try {
      const spec = getClaudeRAgentSpecification();
      return { success: true, spec: spec || '' };
    } catch (error) {
      return { success: false, spec: '', error: error?.message };
    }
  });

  ipcMain.handle('generate-local-r-code', async (event, payload = {}) => {
    try {
      const ready = await ensureActiveAiEndpointReady();
      if (!ready) throw new Error('Local Ollama is not running or not ready');

      const mode = String(payload?.mode || 'editor').trim().toLowerCase();
      const language = String(payload?.language || 'r').trim().toLowerCase() === 'python' ? 'python' : 'r';
      const languageName = language === 'python' ? 'Python' : 'R';
      const codeFence = language === 'python' ? 'python' : 'r';
      const instruction = String(payload?.instruction || '').trim();
      if (!instruction) {
        return { success: false, error: 'No instruction provided' };
      }

      const modelName = String(payload?.model || process.env.OLLAMA_MODEL || 'r-wrapper-corrector').trim();
      const rawContext = String(payload?.context || '').replace(/\r\n/g, '\n').trim();
      const contextPayload = payload?.contextPayload && typeof payload.contextPayload === 'object'
        ? payload.contextPayload
        : {};
      const EDITOR_CONTEXT_MAX_CHARS = 32000;
      const DEFAULT_CONTEXT_MAX_CHARS = 7000;
      const contextWindow = mode === 'editor' ? EDITOR_CONTEXT_MAX_CHARS : DEFAULT_CONTEXT_MAX_CHARS;
      const payloadEditorCode = String(contextPayload?.editorCode || '').replace(/\r\n/g, '\n').trim();
      const contextSource = payloadEditorCode || rawContext;
      const contextSnippet = contextSource ? contextSource.slice(-contextWindow) : '';

      const isDiscussionMode = mode === 'discussion';
      const isFreeMode = mode === 'free';
      const chatMessages = Array.isArray(payload?.chatMessages) ? payload.chatMessages : [];
      const compactChatHistory = chatMessages
        .slice(-10)
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${String(m.content || '').trim()}`)
        .filter(Boolean)
        .join('\n\n');

      const history = Array.isArray(payload?.history) ? payload.history : [];
      const compactHistory = history
        .slice(-10)
        .map((entry) => {
          const previousInstruction = String(entry?.instruction || '').trim();
          const previousResponse = String(entry?.response || '').trim();
          if (!previousInstruction && !previousResponse) return '';
          return [
            previousInstruction ? `Instruction: ${previousInstruction.slice(0, 500)}` : '',
            previousResponse ? `Code:\n${previousResponse.slice(0, 2600)}` : ''
          ].filter(Boolean).join('\n');
        })
        .filter(Boolean)
        .join('\n\n--\n\n');

      const targetBlock = String(contextPayload?.targetBlock || '').trim().slice(0, 2600);
      const relatedBlocks = Array.isArray(contextPayload?.relatedBlocks)
        ? contextPayload.relatedBlocks
          .map((item) => String(item || '').trim())
          .filter(Boolean)
          .slice(0, 3)
          .map((item) => item.slice(0, 2200))
        : [];
      const tokenSummary = Array.isArray(contextPayload?.instructionTokens)
        ? contextPayload.instructionTokens
          .map((token) => String(token || '').trim())
          .filter(Boolean)
          .slice(0, 12)
          .join(', ')
        : '';
      const datasetContextMeta = String(contextPayload?.datasetContextMeta || '').trim().slice(0, 3200);
      const datasetSchema = String(contextPayload?.datasetSchema || '').trim().slice(0, 14000);
      const datasetPreview = String(contextPayload?.datasetPreview || '').trim().slice(0, 10000);
      const datasetSelectedColumns = String(contextPayload?.datasetSelectedColumns || '').trim().slice(0, 2200);
      const applyMode = String(contextPayload?.applyMode || '').trim().toLowerCase();
      const agentProfile = String(payload?.agentProfile || '').trim().toLowerCase();
      const isClaudeCodeAgent = agentProfile === 'claude-r-expert' || agentProfile === 'claude-python-expert';
      const isClaudeCodeRAgent = agentProfile === 'claude-r-expert';
      const claudeCodeAgentSpec = isClaudeCodeRAgent ? getClaudeRAgentSpecification() : '';
      const expectsPatchBlocks = mode === 'editor' && applyMode === 'patch';
      const isReplaceMode = mode === 'editor' && applyMode === 'replace';
      const isAppendMode = mode === 'editor' && applyMode === 'append';
      const omicsGuidance = language === 'python'
        ? 'For omics use pandas/numpy/scipy/statsmodels, Biopython, Scanpy/anndata, scvi-tools, scrublet, celltypist, muon/MuData, episcanpy, pycisTopic, pybedtools, pyranges, pysam, matplotlib, and seaborn as appropriate.'
        : 'For omics use Bioconductor and R packages such as SummarizedExperiment, SingleCellExperiment, scater, scran, scuttle, DropletUtils, scDblFinder, SingleR/celldex, Seurat, Signac, ArchR, chromVAR, GenomicRanges, edgeR, DESeq2, limma, muscat, SpatialExperiment, minfi, and sesame as appropriate.';
      const groundedExecutionClause = `Execute the user request directly with minimal necessary ${languageName} code changes. Scope lock: answer only within the exact context of the current question/request. Do not add extra features, side tasks, or narrative text. Use CURRENT_EDITOR_CODE, TARGET_BLOCK, RELATED_BLOCKS, RECENT_HISTORY, DATASET_CONTEXT_META, DATASET_SCHEMA, and DATASET_PREVIEW_ROWS as grounding truth. Keep names and dependencies consistent with context; do not invent datasets, files, APIs, or column names unless explicitly requested. Support bulk and single-cell RNA-seq, ATAC-seq, multiome, ChIP-seq, methylation, spatial, proteomics, metagenomics, and related omics workflows. Follow the workflow in strict order: clarify the goal and scope, inspect inputs and metadata, state prerequisites and the ordered plan, execute one step, validate its output, then continue. Never skip or silently reorder steps. Stop at the first missing input, failed validation, unavailable package, incompatible matrix, or ambiguous design and explain the blocker. Separate QC, normalization, integration, dimensionality reduction, clustering, annotation, differential testing, enrichment, and visualization. Preserve sparse matrices, check package availability and versions, track parameters and random seeds when relevant, and never claim biological results without evidence. ${omicsGuidance}`;
      const claudeCodeAgentClause = isClaudeCodeAgent
        ? (
          claudeCodeAgentSpec
            ? `Follow this external r-programming-expert agent specification. If any instruction conflicts with output_contract, output_contract takes priority:\n${claudeCodeAgentSpec}`
            : `Agent profile is Claude Code ${languageName} Expert: reason like a senior code agent, prefer safe minimal edits, preserve naming consistency, and keep scripts runnable end-to-end.`
        )
        : '';
      const toToonValue = (value) => {
        const raw = String(value ?? '')
          .replace(/\r\n/g, '\n')
          .trim();
        if (!raw) return '""';
        const escaped = raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        return `"${escaped}"`;
      };

      const toToon = (name, fields) => {
        const keys = Object.keys(fields);
        return `${name}{${keys.join(', ')}}:\n${keys.map((key) => `  ${toToonValue(fields[key])}`).join(',\n')}`;
      };

      const strictCodeBlockContract = `Mandatory output format: return exactly one markdown ${languageName} code block using \`\`\`${codeFence} ... \`\`\`, and nothing else before or after the block.`;
      const outputContract = isFreeMode
        ? `You are a general-purpose AI assistant in a direct conversation. Do not assume the user wants R, Python, data science, dataset analysis, or editor changes. Respond naturally to the user's actual request. If code is requested, provide it conversationally; do not force a code-only response or modify the editor.`
        : isDiscussionMode
        ? `You are an expert ${languageName} and data science colleague engaged in an interactive discussion. Respond naturally and conversationally. For greetings, casual questions, or conceptual advice, reply in friendly, informative prose without generating unsolicited code. Only provide code when the user explicitly asks for code or scripts. Keep your deep expertise in ${languageName}, statistics, and scientific analysis evident.`
        : (mode === 'console'
          ? `Return only runnable, executable ${languageName} code for this console step. ${strictCodeBlockContract} No explanations. No comment-only output. ${groundedExecutionClause}`
          : (
            expectsPatchBlocks
              ? `STRICT PATCH MODE — MANDATORY FORMAT:
You MUST return ONLY @@SEARCH/@@REPLACE/@@END blocks. NEVER return a full script.
Every response must use this exact format:
@@SEARCH
<exact lines copied from CURRENT_EDITOR_CODE>
@@REPLACE
<modified lines>
@@END

Rules:
- Copy SEARCH text EXACTLY from CURRENT_EDITOR_CODE (whitespace, quotes, indentation must match perfectly).
- Keep each SEARCH block small (1-8 lines maximum).
- No markdown code fences. No explanations. No prose. No lines starting with ##.
- Do NOT return a complete rewritten script under any circumstances.
- If multiple edits are needed, output multiple @@SEARCH/@@REPLACE/@@END blocks in order.
${groundedExecutionClause}`
              : (
                isReplaceMode
                  ? `REPLACE MODE: return one complete executable ${languageName} script that integrates requested changes into CURRENT_EDITOR_CODE. For merge-block requests, merge two or more relevant blocks into one coherent script. ${strictCodeBlockContract} No narration, no patch markers. You may use any relevant context from CURRENT_EDITOR_CODE, TARGET_BLOCK, RELATED_BLOCKS, and RECENT_HISTORY. ${groundedExecutionClause}`
                  : (
                    isAppendMode
                      ? `APPEND MODE: continue the same existing codebase and add/update in-place. Do not regenerate a brand-new script unless explicitly requested. Return executable ${languageName} code only. ${strictCodeBlockContract} You may use any relevant context from CURRENT_EDITOR_CODE, TARGET_BLOCK, RELATED_BLOCKS, and RECENT_HISTORY. ${groundedExecutionClause}`
                      : `Return only runnable, executable ${languageName} code. Read CURRENT_EDITOR_CODE first. You may use any relevant blocks from CURRENT_EDITOR_CODE, TARGET_BLOCK, RELATED_BLOCKS, and RECENT_HISTORY to satisfy the request while keeping unrelated behavior stable. ${strictCodeBlockContract} No narration, no comment-only output. ${groundedExecutionClause}`
                  )
              )
          ));

      const finalPrompt = toToon(`${language}_code_request`, {
        mode,
        apply_mode: applyMode || 'auto',
        instruction,
        current_editor_code: contextSnippet || '(empty)',
        target_block: targetBlock || '(not specified)',
        related_blocks: relatedBlocks.length > 0 ? relatedBlocks.join('\n\n---\n\n') : '(none)',
        related_tokens: tokenSummary || '(none)',
        dataset_context_meta: datasetContextMeta || '(none)',
        dataset_schema: datasetSchema || '(none)',
        dataset_preview_rows: datasetPreview || '(none)',
        selected_dataset_columns: datasetSelectedColumns || '(none)',
        agent_profile: agentProfile || 'default',
        agent_spec_loaded: isClaudeCodeAgent ? (claudeCodeAgentSpec ? 'true' : 'false') : 'n/a',
        recent_history: compactHistory || '(none)',
        chat_conversation_history: compactChatHistory || '(none)',
        output_contract: outputContract
      });

      const systemPrompt = isFreeMode
        ? 'You are a general-purpose AI assistant. Speak naturally and helpfully about whatever the user asks. Do not force R/Python, data science, dataset, or editor behavior. If the user asks for code, answer conversationally and do not assume it should be applied to the editor.'
        : isDiscussionMode
        ? `You are a senior ${languageName} and data science expert colleague. You are having an interactive conversation with a colleague. Speak naturally, warmly, and helpfully. Keep full context of the user's dataset and code, but communicate like a real colleague. Only provide code if explicitly requested.`
        : (mode === 'console'
          ? `You are a Codex-style ${languageName} copilot. The user sends TOON-format requests. Respond with executable ${languageName} code only. ${strictCodeBlockContract} ${groundedExecutionClause} ${claudeCodeAgentClause}`
          : (
            expectsPatchBlocks
              ? `You are a surgical code editor. You ONLY output @@SEARCH/@@REPLACE/@@END diff blocks. You NEVER output a full script, markdown, or explanations. Find the exact lines that need changing in the user's code and return minimal patches. Example output:
@@SEARCH
old_line <- "original"
@@REPLACE
new_line <- "modified"
@@END
${groundedExecutionClause} ${claudeCodeAgentClause}`
              : (
                isReplaceMode
                  ? `You are a Codex-style ${languageName} editor copilot in replace mode. Produce one full executable ${languageName} script that preserves intent, integrates edits into current code, and supports merge-block requests by combining two or more relevant blocks coherently. ${strictCodeBlockContract} ${groundedExecutionClause} ${claudeCodeAgentClause}`
                  : (
                    isAppendMode
                      ? `You are a Codex-style ${languageName} editor copilot in append mode. Continue and modify the same existing codebase in-place; avoid rewriting the entire script unless explicitly requested. ${strictCodeBlockContract} ${groundedExecutionClause} ${claudeCodeAgentClause}`
                      : `You are a Codex-style ${languageName} editor copilot. The user sends TOON-format edit requests. Read current code, apply the requested change using all relevant provided context, preserve unrelated behavior, and return executable ${languageName} code only. ${strictCodeBlockContract} ${groundedExecutionClause} ${claudeCodeAgentClause}`
                  )
              )
          ));

      const isRewriteIntent = /\b(rewrite|replace|from scratch|reset|regenerate|full script)\b/i.test(instruction);
      const numPredict = isDiscussionMode || isFreeMode
        ? 768
        : (mode === 'editor'
          ? (expectsPatchBlocks ? 256 : (isRewriteIntent ? 640 : 360))
          : 240);
      const imageAttachments = (Array.isArray(payload?.attachments) ? payload.attachments : [])
        .filter((attachment) => attachment?.kind === 'image' && String(attachment.dataUrl || '').startsWith('data:image/'))
        .map((attachment) => String(attachment.dataUrl).replace(/^data:image\/[^;]+;base64,/, ''));

      const requestLocalCode = async (promptText, temperature = 0.08) => {
        const issueRequest = async () => {
          const response = await fetch(getActiveApiUrl(), {
            method: 'POST',
            headers: buildOllamaHeaders({ includeJson: true }),
            body: JSON.stringify({
              model: modelName,
              system: systemPrompt,
              prompt: promptText,
              stream: true,
              ...(imageAttachments.length > 0 ? { images: imageAttachments } : {}),
              options: {
                temperature,
                top_p: 0.85,
                repeat_penalty: 1.05,
                num_predict: numPredict,
                stop: ['<|file_separator|>']
              }
            })
          });

          if (!response.ok) {
            const detail = await response.text().catch(() => '');
            const error = new Error(`Ollama Error: ${response.status} ${response.statusText}${detail ? ` - ${detail.slice(0, 180)}` : ''}`);
            error.status = response.status;
            throw error;
          }

          const reader = response.body?.getReader();
          if (!reader) {
            const json = await response.json();
            return String(json.response || '');
          }
          const decoder = new TextDecoder();
          let buffer = '';
          let fullText = '';
          const emit = (done = false) => {
            if (event.sender && !event.sender.isDestroyed()) {
              event.sender.send('local-ai-response-chunk', { text: fullText, done });
            }
          };
          const consumeLine = (line) => {
            if (!line.trim()) return;
            try {
              const item = JSON.parse(line);
              if (item.response) {
                fullText += String(item.response);
                emit(false);
              }
            } catch (_) { /* Ignore incomplete stream lines. */ }
          };
          while (true) {
            const { done, value } = await reader.read();
            buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() || '';
            lines.forEach(consumeLine);
            if (done) break;
          }
          if (buffer.trim()) consumeLine(buffer);
          emit(true);
          return fullText;
        };

        try {
          return await issueRequest();
        } catch (error) {
          const message = String(error?.message || '');
          const status = Number(error?.status || 0);
          const retryableNetworkError = /fetch failed|network|econnrefused|socket|timed out|aborted/i.test(message);
          const retryableStatus = status >= 500 || status === 429;
          if (!isLocalOllama() || (!retryableNetworkError && !retryableStatus)) {
            throw error;
          }
          const readyAfterRetry = await ensureOllamaRunning();
          if (!readyAfterRetry) {
            throw error;
          }
          return issueRequest();
        }
      };

      let rawResponseText = await requestLocalCode(finalPrompt, isDiscussionMode ? 0.4 : 0.08);

      if (isDiscussionMode || isFreeMode) {
        return { success: true, text: rawResponseText };
      }
      let responseText = sanitizeRModelCodeOutput(rawResponseText, { expectsPatchBlocks, language });

      // Patch-mode retry: if we expected patches but got a full script instead, retry
      if (expectsPatchBlocks && responseText && !/@@SEARCH/.test(responseText)) {
        console.warn('[local-r-code] Patch mode: model returned full script instead of patches. Retrying...');
        const patchRetryPrompt = `${finalPrompt}\n\nCRITICAL ERROR: You returned a full script. That is WRONG.\nYou MUST return ONLY @@SEARCH/@@REPLACE/@@END patch blocks.\nDo NOT return a full script. Do NOT use markdown.\n\nExample:\n@@SEARCH\nold_code_here\n@@REPLACE\nnew_code_here\n@@END\n\nTry again now:`;
        rawResponseText = await requestLocalCode(patchRetryPrompt, 0.02);
        responseText = sanitizeRModelCodeOutput(rawResponseText, { expectsPatchBlocks: true, language });
      }

      if (!responseText && !expectsPatchBlocks) {
        const retryPrompt = `${finalPrompt}\n\nINVALID_PREVIOUS_RESPONSE:\n${rawResponseText.slice(0, 1400)}\n\nRetry now with ONLY executable ${languageName} code. Return exactly one markdown ${codeFence} code block and nothing else. No comments-only response.`;
        rawResponseText = await requestLocalCode(retryPrompt, 0.02);
        responseText = sanitizeRModelCodeOutput(rawResponseText, { expectsPatchBlocks: false, language });
      }

      const requestedDataFrameCreation = DATAFRAME_CREATION_INTENT_REGEX.test(instruction);
      if (language === 'r' && !expectsPatchBlocks && requestedDataFrameCreation && responseText && looksLikePlaceholderDataFrameTemplate(responseText)) {
        const populatedRetryPrompt = `${finalPrompt}\n\nINVALID_PREVIOUS_RESPONSE:\n${responseText.slice(0, 1400)}\n\nThe previous answer is an empty placeholder template (e.g., character()/numeric() columns). Retry with concrete populated example data. Requirements: include at least 5 realistic rows matching the user request, keep column names aligned with the request, and avoid empty vector constructors unless explicitly requested. Return exactly one markdown R code block (\`\`\`r ... \`\`\`) and nothing else.`;
        rawResponseText = await requestLocalCode(populatedRetryPrompt, 0.02);
        const populatedRetry = sanitizeRModelCodeOutput(rawResponseText, { expectsPatchBlocks: false, language });
        if (populatedRetry) {
          responseText = populatedRetry;
        }
      }

      if (!expectsPatchBlocks && contextSnippet && responseText) {
        const contextTail = String(contextSnippet).trimEnd();
        const generatedLines = responseText.split('\n');
        let overlapLines = 0;
        for (let i = 1; i <= Math.min(generatedLines.length, 40); i += 1) {
          const responsePrefix = generatedLines.slice(0, i).join('\n').trim();
          if (responsePrefix && contextTail.endsWith(responsePrefix)) {
            overlapLines = i;
          }
        }
        if (overlapLines > 0) {
          responseText = generatedLines.slice(overlapLines).join('\n').trimStart();
        }
      }

      if (responseText && !expectsPatchBlocks) {
        // Remove repeated assignments in the generated block so the copilot
        // adds the requested step once instead of duplicating lines.
        const lines = responseText.split('\n');
        const seenExactLines = new Set();
        const seenAssignmentTargets = new Set();
        const deduped = [];

        for (const line of lines) {
          const raw = String(line || '');
          const trimmed = raw.trim();
          if (!trimmed) {
            deduped.push(raw);
            continue;
          }

          // Drop exact duplicate executable lines.
          if (seenExactLines.has(trimmed)) {
            continue;
          }

          // Drop repeated assignments to the same target within one response.
          const assignMatch = trimmed.match(/^([A-Za-z.][A-Za-z0-9._]*(?:\[[^\]]+\]|\$[A-Za-z.][A-Za-z0-9._]*)?)\s*<-/);
          if (assignMatch) {
            const target = assignMatch[1];
            if (seenAssignmentTargets.has(target)) {
              continue;
            }
            seenAssignmentTargets.add(target);
          }

          seenExactLines.add(trimmed);
          deduped.push(raw);
        }

        responseText = deduped.join('\n').replace(/\n{3,}/g, '\n\n').trim();
      }

      if (language === 'r' && responseText && !expectsPatchBlocks && isLikelyIncompleteRCode(responseText)) {
        const continuationPrompt = `${finalPrompt}\n\nPARTIAL_R_CODE:\n${responseText.slice(-9000)}\n\nThe previous output is incomplete. Continue ONLY from where PARTIAL_R_CODE stopped and return only the missing executable R code suffix inside one markdown R code block (\`\`\`r ... \`\`\`). No explanations.`;
        const continuationRaw = await requestLocalCode(continuationPrompt, 0.02);
        const continuationClean = sanitizeRModelCodeOutput(continuationRaw, { expectsPatchBlocks: false, language });
        if (continuationClean) {
          const merged = mergeContinuationSuffix(responseText, continuationClean);
          responseText = sanitizeRModelCodeOutput(merged, { expectsPatchBlocks: false, language }) || merged;
        }
      }

      if (!responseText) {
        console.warn('[local-r-code] Empty response after cleanup', {
          model: modelName,
          mode,
          rawPreview: rawResponseText.slice(0, 400)
        });
        return {
          success: false,
          error: 'Model returned non-executable output. Please request a concrete code change with exact variable names and expected output.'
        };
      }

      return { success: true, text: responseText };
    } catch (error) {
      console.error('Local R Code Generation Error:', error);
      return { success: false, error: error.message };
    }
  });

  // ── General-purpose terminal command execution ──────────────────
  // Used by the chat panel's "Terminal Mode" to run any shell command.
  ipcMain.handle('run-terminal-cmd', async (event, commandStr = '') => {
    try {
      const cmd = String(commandStr || '').trim();
      if (!cmd) {
        return { success: false, error: 'Empty command.' };
      }
      const result = await runShellCapture(cmd);
      return {
        success: result.code === 0,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        code: result.code
      };
    } catch (error) {
      console.error('[run-terminal-cmd] Error:', error);
      return { success: false, error: error.message, stdout: '', stderr: '' };
    }
  });

  ipcMain.handle('get-ecc-finder-status', async (event, sourcePath = '') => {
    try {
      return await getEccFinderStatus(sourcePath);
    } catch (error) {
      return { success: false, error: error?.message || 'Failed to inspect ecc_finder.' };
    }
  });

  ipcMain.handle('install-ecc-finder', async (event, sourcePath = '') => {
    try {
      const toolPath = resolveEccFinderPath(sourcePath);
      const entryPath = path.join(toolPath, 'ecc_finder.py');
      const parentDir = path.dirname(toolPath);
      if (fs.existsSync(entryPath)) {
        if (fs.existsSync(path.join(toolPath, '.git'))) {
          const pullResult = await runSpawnCapture('git', ['pull', '--ff-only'], {
            cwd: toolPath,
            env: process.env,
            windowsHide: true
          });
          return {
            success: pullResult.code === 0,
            installed: true,
            toolPath,
            stdout: pullResult.stdout || '',
            stderr: pullResult.stderr || '',
            error: pullResult.code === 0 ? '' : 'Failed to update existing ecc_finder clone.'
          };
        }
        return { success: true, installed: true, toolPath, stdout: 'ecc_finder is already installed.\n', stderr: '' };
      }

      if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
      const cloneResult = await runSpawnCapture('git', ['clone', '--depth', '1', ECC_FINDER_REPO_URL, toolPath], {
        cwd: parentDir,
        env: process.env,
        windowsHide: true
      });
      return {
        success: cloneResult.code === 0 && fs.existsSync(entryPath),
        installed: fs.existsSync(entryPath),
        toolPath,
        stdout: cloneResult.stdout || '',
        stderr: cloneResult.stderr || '',
        error: cloneResult.code === 0 ? '' : 'Failed to clone ecc_finder from GitHub.'
      };
    } catch (error) {
      return { success: false, installed: false, error: error?.message || 'Failed to install ecc_finder.' };
    }
  });

  ipcMain.handle('install-ecc-finder-dependencies', async (event, payload = {}) => {
    try {
      if (eccFinderProcess) {
        return { success: false, error: 'An ecc_finder job is already running.' };
      }

      const toolPath = resolveEccFinderPath(payload.sourcePath);
      const entryPath = path.join(toolPath, 'ecc_finder.py');
      if (!fs.existsSync(entryPath)) {
        return { success: false, error: `ecc_finder.py was not found at ${entryPath}. Install the source first.` };
      }

      const envFile = getEccFinderEnvFile(toolPath);
      if (!fs.existsSync(envFile)) {
        return { success: false, error: `Environment file was not found at ${envFile}.` };
      }

      const requestedManager = String(payload.manager || '').trim();
      const environmentManager = requestedManager || await getEccFinderEnvManager();
      if (!environmentManager) {
        return {
          success: false,
          error: 'Conda, mamba, or micromamba was not found on PATH. Install one of them, then run dependency installation again.'
        };
      }

      const status = await checkEccFinderEnvironment(environmentManager);
      const command = buildEccFinderEnvInstallCommand(environmentManager, envFile, status.environmentInstalled);
      const spawnCommand = process.platform === 'win32' ? 'cmd.exe' : 'bash';
      const spawnArgs = process.platform === 'win32'
        ? ['/d', '/s', '/c', command]
        : ['-lc', command];

      if (mainAppWindow && !mainAppWindow.isDestroyed()) {
        mainAppWindow.webContents.send('ecc-finder-output', {
          type: 'start',
          kind: 'dependencies',
          command,
          outputPath: toolPath,
          workflow: 'dependencies'
        });
      }

      eccFinderProcess = spawn(spawnCommand, spawnArgs, {
        cwd: toolPath,
        env: { ...process.env, LC_ALL: 'en_US.UTF-8' },
        windowsHide: true
      });

      eccFinderProcess.stdout?.on('data', (data) => {
        if (mainAppWindow && !mainAppWindow.isDestroyed()) {
          mainAppWindow.webContents.send('ecc-finder-output', { type: 'stdout', kind: 'dependencies', text: data.toString() });
        }
      });

      eccFinderProcess.stderr?.on('data', (data) => {
        if (mainAppWindow && !mainAppWindow.isDestroyed()) {
          mainAppWindow.webContents.send('ecc-finder-output', { type: 'stderr', kind: 'dependencies', text: data.toString() });
        }
      });

      eccFinderProcess.on('error', (error) => {
        if (mainAppWindow && !mainAppWindow.isDestroyed()) {
          mainAppWindow.webContents.send('ecc-finder-output', {
            type: 'error',
            kind: 'dependencies',
            text: error?.message || String(error)
          });
        }
        eccFinderProcess = null;
      });

      eccFinderProcess.on('close', (code) => {
        if (mainAppWindow && !mainAppWindow.isDestroyed()) {
          mainAppWindow.webContents.send('ecc-finder-output', {
            type: 'exit',
            kind: 'dependencies',
            code: typeof code === 'number' ? code : -1,
            outputPath: toolPath
          });
        }
        eccFinderProcess = null;
      });

      return { success: true, command, outputPath: toolPath, manager: environmentManager };
    } catch (error) {
      return { success: false, error: error?.message || 'Failed to install ecc_finder dependencies.' };
    }
  });

  ipcMain.handle('run-ecc-finder', async (event, payload = {}) => {
    try {
      if (eccFinderProcess) {
        return { success: false, error: 'An ecc_finder job is already running.' };
      }

      const workflowId = String(payload.workflow || 'map_ont').trim();
      const needsIndex = ['map_ont', 'map_sr'].includes(workflowId);
      const referenceFasta = String(payload.referenceFasta || '').trim();

      // Helper: run a bash command and stream events, resolve when done
      const runPhase = (command, cwd, kindLabel) => new Promise((resolve) => {
        const spawnCommand = process.platform === 'win32' ? 'cmd.exe' : 'bash';
        const spawnArgs = process.platform === 'win32'
          ? ['/d', '/s', '/c', command]
          : ['-lc', command];

        eccFinderProcess = spawn(spawnCommand, spawnArgs, {
          cwd: cwd || undefined,
          env: { ...process.env, LC_ALL: 'en_US.UTF-8' },
          windowsHide: true
        });

        eccFinderProcess.stdout?.on('data', (data) => {
          if (mainAppWindow && !mainAppWindow.isDestroyed()) {
            mainAppWindow.webContents.send('ecc-finder-output', { type: 'stdout', kind: kindLabel, text: data.toString() });
          }
        });
        eccFinderProcess.stderr?.on('data', (data) => {
          if (mainAppWindow && !mainAppWindow.isDestroyed()) {
            mainAppWindow.webContents.send('ecc-finder-output', { type: 'stderr', kind: kindLabel, text: data.toString() });
          }
        });
        eccFinderProcess.on('error', (error) => {
          if (mainAppWindow && !mainAppWindow.isDestroyed()) {
            mainAppWindow.webContents.send('ecc-finder-output', { type: 'error', kind: kindLabel, text: error?.message || String(error) });
          }
          eccFinderProcess = null;
          resolve({ code: -1 });
        });
        eccFinderProcess.on('close', (code) => {
          eccFinderProcess = null;
          resolve({ code: typeof code === 'number' ? code : -1 });
        });
      });

      // ── Phase 1: Auto-build index (runs in background before pipeline) ──
      let resolvedIndexPath = String(payload.referenceIndex || '').trim();

      if (needsIndex && referenceFasta) {
        const manager = await getEccFinderEnvManager();
        const runPrefix = manager ? buildEccFinderEnvRunPrefix(manager) : '';
        const technology = workflowId.endsWith('_sr') ? 'sr' : 'ont';
        const indexer = (workflowId === 'map_sr' && payload.aligner) ? String(payload.aligner) : 'minimap2';

        let indexCmd = '';
        if (indexer === 'bwa') {
          indexCmd = `${runPrefix} bwa index ${shellQuote(referenceFasta)}`;
          resolvedIndexPath = referenceFasta;
        } else {
          const preset = technology === 'sr' ? 'sr' : 'map-ont';
          const suffix = technology === 'sr' ? '.sr.idx' : '.ont.idx';
          const autoIdx = resolvedIndexPath || (referenceFasta.replace(/\.(fa|fasta|fna)(\.gz)?$/i, '') + suffix);
          if (path.resolve(autoIdx) === path.resolve(referenceFasta)) {
            return { success: false, error: 'Index output path must differ from the reference FASTA.' };
          }
          indexCmd = `${runPrefix} minimap2 -x ${preset} -d ${shellQuote(autoIdx)} ${shellQuote(referenceFasta)} -I 4G`;
          resolvedIndexPath = autoIdx;
        }

        if (mainAppWindow && !mainAppWindow.isDestroyed()) {
          mainAppWindow.webContents.send('ecc-finder-output', {
            type: 'start', kind: 'index', command: indexCmd, indexPath: resolvedIndexPath
          });
        }

        const { code: idxCode } = await runPhase(indexCmd, null, 'index');

        if (mainAppWindow && !mainAppWindow.isDestroyed()) {
          mainAppWindow.webContents.send('ecc-finder-output', {
            type: 'exit', kind: 'index', code: idxCode,
            indexPath: resolvedIndexPath, indexer
          });
        }

        if (idxCode !== 0) {
          if (mainAppWindow && !mainAppWindow.isDestroyed()) {
            mainAppWindow.webContents.send('ecc-finder-output', {
              type: 'exit', kind: 'run', code: idxCode,
              outputPath: '', csvData: null, imageData: null, fastaData: null,
              csvPath: '', fastaPath: '', bedPath: '',
              workflow: workflowId
            });
          }
          return { success: false, error: `Indexing failed with code ${idxCode}.` };
        }
      }

      // ── Phase 2: Run eccDNA Finder pipeline ──────────────────────────────
      const mergedPayload = { ...payload, referenceIndex: resolvedIndexPath };
      const built = buildEccFinderCommand(mergedPayload);
      if (!fs.existsSync(built.outputPath)) fs.mkdirSync(built.outputPath, { recursive: true });

      if (mainAppWindow && !mainAppWindow.isDestroyed()) {
        mainAppWindow.webContents.send('ecc-finder-output', {
          type: 'start', kind: 'run',
          command: built.command,
          outputPath: built.outputPath,
          workflow: built.workflowCommand
        });
      }

      const { code } = await runPhase(built.command, built.toolPath, 'run');

      let csvData = null, imageData = null, fastaData = null;
      let csvPath = '', fastaPath = '', bedPath = '';

      if (code === 0 && built.outputPath && fs.existsSync(built.outputPath)) {
        try {
          const files = fs.readdirSync(built.outputPath);
          const csvFile = files.find(f => f.endsWith('.csv') || f.endsWith('.tsv'));
          const imgFile = files.find(f => f.endsWith('.png'));
          const fastaFile = files.find(f => f.endsWith('.fasta') || f.endsWith('.fa'));
          const bedFile = files.find(f => f.endsWith('.bed'));
          if (csvFile) { csvPath = path.join(built.outputPath, csvFile); csvData = fs.readFileSync(csvPath, 'utf8'); }
          if (imgFile) { imageData = fs.readFileSync(path.join(built.outputPath, imgFile), 'base64'); }
          if (fastaFile) {
            fastaPath = path.join(built.outputPath, fastaFile);
            const fData = fs.readFileSync(fastaPath, 'utf8');
            fastaData = fData.length > 500000 ? fData.substring(0, 500000) + '\n... [Truncated for UI]' : fData;
          }
          if (bedFile) { bedPath = path.join(built.outputPath, bedFile); }
        } catch (err) { console.error('[ecc_finder] Failed to read output files:', err); }
      }

      if (mainAppWindow && !mainAppWindow.isDestroyed()) {
        mainAppWindow.webContents.send('ecc-finder-output', {
          type: 'exit', kind: 'run',
          code: typeof code === 'number' ? code : -1,
          outputPath: built.outputPath,
          csvData, imageData, fastaData, csvPath, fastaPath, bedPath,
          workflow: built.workflowCommand
        });
      }

      return { success: true, command: built.command, outputPath: built.outputPath, workflow: built.workflowCommand };
    } catch (error) {
      return { success: false, error: error?.message || 'Failed to run ecc_finder.' };
    }
  });
  ipcMain.handle('stop-ecc-finder', async () => {
    if (eccFinderProcess) {
      try { eccFinderProcess.kill(); } catch (_) { }
      eccFinderProcess = null;
    }
    return { success: true };
  });

  // ── Batch Loop: File Discovery ────────────────────────────────────────────
  ipcMain.handle('find-fastq-files', async (event, payload = {}) => {
    try {
      const folder = String(payload.folder || '').trim();
      const workflowId = String(payload.workflow || 'map_sr').trim();
      if (!folder || !fs.existsSync(folder)) {
        return { success: false, error: 'Folder does not exist.', samples: [] };
      }

      const entries = fs.readdirSync(folder)
        .filter(f => /\.(fastq|fq|fasta|fa)(\.gz)?$/i.test(f))
        .sort();

      let samples = [];

      if (workflowId === 'map_sr') {
        // Detect R1/R2 pairs using common naming conventions
        const r1Files = entries.filter(f => /_R1[_.]|_1\.(fastq|fq)/i.test(f) || /_R1\.(fastq|fq)/i.test(f));
        for (const r1 of r1Files) {
          const r2 = r1
            .replace(/_R1([_.])/, '_R2$1')
            .replace(/_1\.(fastq|fq)/, '_2.$1')
            .replace(/_R1\.(fastq|fq)/, '_R2.$1');
          if (entries.includes(r2)) {
            const sampleName = r1
              .replace(/_R1[_.].*$/, '')
              .replace(/_R1\.(fastq|fq)(\.gz)?$/i, '')
              .replace(/_1\.(fastq|fq)(\.gz)?$/i, '');
            samples.push({ sampleName, r1: path.join(folder, r1), r2: path.join(folder, r2) });
          }
        }
      } else if (workflowId === 'map_ont') {
        // Each file is an independent sample
        for (const f of entries) {
          const sampleName = f.replace(/\.(fastq|fq|fasta|fa)(\.gz)?$/i, '');
          samples.push({ sampleName, query: path.join(folder, f) });
        }
      }

      return { success: true, samples };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to scan folder.', samples: [] };
    }
  });

  // ── Batch Loop: Sequential Runner ────────────────────────────────────────
  let eccLoopCancelled = false;

  ipcMain.handle('run-ecc-loop', async (event, payload = {}) => {
    eccLoopCancelled = false;
    const { samples = [], basePayload = {}, resolvedIndexPath = '' } = payload;

    if (!samples.length) return { success: false, error: 'No samples provided.' };

    const send = (data) => {
      if (mainAppWindow && !mainAppWindow.isDestroyed()) {
        mainAppWindow.webContents.send('ecc-loop-progress', data);
      }
    };

    const runPhase = (command, cwd, sampleName) => new Promise((resolve) => {
      const spawnCommand = process.platform === 'win32' ? 'cmd.exe' : 'bash';
      const spawnArgs = process.platform === 'win32'
        ? ['/d', '/s', '/c', command]
        : ['-lc', command];

      eccFinderProcess = spawn(spawnCommand, spawnArgs, {
        cwd: cwd || undefined,
        env: { ...process.env, LC_ALL: 'en_US.UTF-8' },
        windowsHide: true
      });

      eccFinderProcess.stdout?.on('data', (d) => send({ type: 'log', sampleName, text: d.toString() }));
      eccFinderProcess.stderr?.on('data', (d) => send({ type: 'log', sampleName, text: d.toString() }));
      eccFinderProcess.on('error', (err) => {
        eccFinderProcess = null;
        resolve({ code: -1 });
      });
      eccFinderProcess.on('close', (code) => {
        eccFinderProcess = null;
        resolve({ code: typeof code === 'number' ? code : -1 });
      });
    });

    const results = [];
    for (let i = 0; i < samples.length; i++) {
      if (eccLoopCancelled) {
        send({ type: 'cancelled', completed: i, total: samples.length });
        break;
      }

      const sample = samples[i];
      send({ type: 'sample-start', sampleName: sample.sampleName, index: i, total: samples.length });

      try {
        const samplePayload = {
          ...basePayload,
          referenceIndex: resolvedIndexPath,
          prefix: sample.sampleName,
          ...(sample.r1 ? { query1: sample.r1, query2: sample.r2 } : {}),
          ...(sample.query ? { query: sample.query } : {}),
        };

        const built = buildEccFinderCommand(samplePayload);
        if (!fs.existsSync(built.outputPath)) fs.mkdirSync(built.outputPath, { recursive: true });

        send({ type: 'cmd', sampleName: sample.sampleName, command: built.command });
        const { code } = await runPhase(built.command, built.toolPath, sample.sampleName);

        let csvData = null, imageData = null, csvPath = '';
        if (code === 0 && fs.existsSync(built.outputPath)) {
          const files = fs.readdirSync(built.outputPath);
          const csvFile = files.find(f => f.startsWith(sample.sampleName) && f.endsWith('.csv'));
          const imgFile = files.find(f => f.startsWith(sample.sampleName) && f.endsWith('.png'));
          if (csvFile) { csvPath = path.join(built.outputPath, csvFile); csvData = fs.readFileSync(csvPath, 'utf8'); }
          if (imgFile) { imageData = fs.readFileSync(path.join(built.outputPath, imgFile), 'base64'); }
        }

        results.push({ sampleName: sample.sampleName, success: code === 0, csvData, imageData, csvPath, outputPath: built.outputPath });
        send({ type: 'sample-done', sampleName: sample.sampleName, index: i, total: samples.length, code, csvData, imageData, csvPath });
      } catch (err) {
        results.push({ sampleName: sample.sampleName, success: false, error: err.message });
        send({ type: 'sample-error', sampleName: sample.sampleName, index: i, total: samples.length, error: err.message });
      }
    }

    send({ type: 'loop-done', total: samples.length, results });
    return { success: true, results };
  });

  ipcMain.handle('stop-ecc-loop', async () => {
    eccLoopCancelled = true;
    if (eccFinderProcess) {
      try { eccFinderProcess.kill(); } catch (_) { }
      eccFinderProcess = null;
    }
    return { success: true };
  });

  ipcMain.handle('build-ecc-index', async (event, payload = {}) => {
    try {
      if (eccFinderProcess) {
        return { success: false, error: 'An ecc_finder job is already running.' };
      }
      const { referenceFasta = '', indexer = 'minimap2', technology = 'ont', outputIndex = '' } = payload;
      if (!referenceFasta) return { success: false, error: 'Reference FASTA path is required.' };

      const manager = await getEccFinderEnvManager();
      const runPrefix = manager ? buildEccFinderEnvRunPrefix(manager) : '';

      let indexCmd = '';
      let defaultIndexPath = '';
      if (indexer === 'bwa') {
        // bwa index creates files alongside the FASTA
        indexCmd = `${runPrefix} bwa index ${shellQuote(referenceFasta)}`;
        defaultIndexPath = referenceFasta; // the FASTA itself is the index base for bwa
      } else {
        // minimap2 -x map-ont or -x sr
        const preset = technology === 'sr' ? 'sr' : 'map-ont';
        const suffix = technology === 'sr' ? '.sr.idx' : '.ont.idx';
        const autoIdx = outputIndex || (referenceFasta.replace(/\.(fa|fasta|fna)(\.gz)?$/i, '') + suffix);
        indexCmd = `${runPrefix} minimap2 -x ${preset} -d ${shellQuote(autoIdx)} ${shellQuote(referenceFasta)} -I 4G`;
        defaultIndexPath = autoIdx;
      }

      if (indexer !== 'bwa' && path.resolve(defaultIndexPath) === path.resolve(referenceFasta)) {
        return { success: false, error: 'The index output path cannot be the same as the reference FASTA file.' };
      }

      if (mainAppWindow && !mainAppWindow.isDestroyed()) {
        mainAppWindow.webContents.send('ecc-finder-output', {
          type: 'start', kind: 'index', command: indexCmd, indexPath: defaultIndexPath
        });
      }

      const spawnCommand = process.platform === 'win32' ? 'cmd.exe' : 'bash';
      const spawnArgs = process.platform === 'win32' ? ['/d', '/s', '/c', indexCmd] : ['-lc', indexCmd];

      eccFinderProcess = spawn(spawnCommand, spawnArgs, {
        env: { ...process.env, LC_ALL: 'en_US.UTF-8' },
        windowsHide: true
      });

      eccFinderProcess.stdout?.on('data', (data) => {
        if (mainAppWindow && !mainAppWindow.isDestroyed()) {
          mainAppWindow.webContents.send('ecc-finder-output', { type: 'stdout', kind: 'index', text: data.toString() });
        }
      });
      eccFinderProcess.stderr?.on('data', (data) => {
        if (mainAppWindow && !mainAppWindow.isDestroyed()) {
          mainAppWindow.webContents.send('ecc-finder-output', { type: 'stderr', kind: 'index', text: data.toString() });
        }
      });
      eccFinderProcess.on('error', (error) => {
        if (mainAppWindow && !mainAppWindow.isDestroyed()) {
          mainAppWindow.webContents.send('ecc-finder-output', { type: 'error', kind: 'index', text: error?.message || String(error) });
        }
        eccFinderProcess = null;
      });
      eccFinderProcess.on('close', (code) => {
        if (mainAppWindow && !mainAppWindow.isDestroyed()) {
          mainAppWindow.webContents.send('ecc-finder-output', {
            type: 'exit', kind: 'index', code: typeof code === 'number' ? code : -1,
            indexPath: defaultIndexPath, indexer
          });
        }
        eccFinderProcess = null;
      });

      return { success: true, command: indexCmd, indexPath: defaultIndexPath, indexer };
    } catch (error) {
      return { success: false, error: error?.message || 'Failed to build reference index.' };
    }
  });

  ipcMain.handle('generate-ai-report', async (event, analysisResult, analysisMode) => {
    try {
      const ready = await ensureActiveAiEndpointReady();
      if (!ready) throw new Error('Local Ollama is not running or not ready');

      const modelName = process.env.OLLAMA_MODEL || "r-wrapper-corrector";

      // Construct prompt
      const prompt = `You are an expert data scientist. Provide a professional, concise interpretation of the following statistical analysis results.

Analysis Type: ${analysisMode}
Data Summary:
${JSON.stringify(analysisResult, null, 2)}

Requirements:
1. STRUCTURE: Use headings (##) for key sections.
2. CONTENT: Summarize the main findings, interpret p-values/significance, and explain practical implications.
3. TONE: Professional and objective.
4. FORMAT: Markdown.
`;

      const response = await fetch(getActiveApiUrl(), {
        method: 'POST',
        headers: buildOllamaHeaders({ includeJson: true }),
        body: JSON.stringify({
          model: modelName,
          prompt: prompt,
          stream: false,
          options: { temperature: 0.3 }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, report: data.response };
    } catch (error) {
      console.error('AI Report Error:', error);
      return { success: false, error: error.message };
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ── Claude Code Integration Service ────────────────────────────────────
  // Uses the locally authenticated Claude Code CLI with a Claude subscription.
  // This path never forwards Anthropic API keys to the request process.
  // ══════════════════════════════════════════════════════════════════════════

  let claudeCodeActiveProcess = null;
  let claudeCodeLoginProcess = null;

  const getClaudeCodeBinary = () => {
    const configured = String(process.env.CLAUDE_BINARY || '').trim();
    if (configured) return configured;
    try {
      const resolved = spawnSync('which', ['claude'], { encoding: 'utf8' }).stdout?.trim();
      if (resolved) return resolved;
    } catch (_) { }
    return 'claude';
  };

  const getClaudeCodeEnv = () => {
    const cleanEnv = { ...process.env };
    delete cleanEnv.ANTHROPIC_API_KEY;
    delete cleanEnv.ANTHROPIC_AUTH_TOKEN;
    delete cleanEnv.ANTHROPIC_BASE_URL;
    return cleanEnv;
  };

  const runClaudeCodeCommand = (args, { input = '', detached = false } = {}) => new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    const child = spawn(getClaudeCodeBinary(), args, {
      cwd: getWorkspaceRoot(),
      env: getClaudeCodeEnv(),
      detached,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      callback(value);
    };
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.once('error', (error) => finish(reject, error));
    child.once('close', (code) => finish(resolve, { code, stdout, stderr }));
    if (input) child.stdin.write(input);
    child.stdin.end();
    if (detached) child.unref();
  });

  const isClaudeSubscriptionAuth = (status) => {
    const authMethod = String(status?.authMethod || '').trim().toLowerCase();
    return Boolean(status?.loggedIn) && ['claude.ai', 'claudeai', 'oauth', 'oauth2'].includes(authMethod);
  };

  const readClaudeCodeAuth = async () => {
    try {
      const result = await runClaudeCodeCommand(['auth', 'status', '--json']);
      let status = null;
      try { status = JSON.parse(String(result.stdout || '').trim()); } catch (_) { }
      const subscription = isClaudeSubscriptionAuth(status);
      return {
        success: true,
        loggedIn: subscription,
        subscription,
        authMethod: String(status?.authMethod || '').trim() || null,
        message: subscription
          ? 'Signed in with a Claude subscription'
          : status?.loggedIn
            ? 'A Claude API/Console login is active. Sign in with Claude subscription.'
            : 'Sign in with Claude subscription to use Claude Code'
      };
    } catch (error) {
      return { success: false, loggedIn: false, subscription: false, message: error.message || 'Claude Code sign-in status unavailable.' };
    }
  };

  const stopClaudeCodeProcess = () => {
    if (!claudeCodeActiveProcess) return;
    try { claudeCodeActiveProcess.kill(); } catch (_) { }
    claudeCodeActiveProcess = null;
  };

  const parseClaudeCodeResponse = (stdout) => {
    const raw = String(stdout || '').trim();
    if (!raw) return '';
    const jsonLines = raw.split('\n').map((line) => line.trim()).filter(Boolean).reverse();
    for (const line of jsonLines) {
      try {
        const parsed = JSON.parse(line);
        if (typeof parsed?.result === 'string') return parsed.result;
        if (typeof parsed?.text === 'string') return parsed.text;
      } catch (_) { }
    }
    const streamedText = raw.split('\n').map((line) => {
      try {
        const parsed = JSON.parse(line);
        return String(parsed?.event?.delta?.text || parsed?.delta?.text || '');
      } catch (_) {
        return '';
      }
    }).join('');
    if (streamedText) return streamedText;
    return raw;
  };

  ipcMain.handle('claude-code-auth-status', async () => readClaudeCodeAuth());

  ipcMain.handle('claude-code-login', async () => {
    if (claudeCodeLoginProcess && claudeCodeLoginProcess.exitCode === null && !claudeCodeLoginProcess.killed) {
      return { success: true, started: true };
    }
    try {
      const loginProcess = spawn(getClaudeCodeBinary(), ['auth', 'login', '--claudeai'], {
        cwd: getWorkspaceRoot(),
        env: getClaudeCodeEnv(),
        detached: true,
        stdio: 'ignore'
      });
      claudeCodeLoginProcess = loginProcess;
      loginProcess.once('error', () => { if (claudeCodeLoginProcess === loginProcess) claudeCodeLoginProcess = null; });
      loginProcess.once('exit', () => { if (claudeCodeLoginProcess === loginProcess) claudeCodeLoginProcess = null; });
      loginProcess.unref();
      return { success: true, started: true };
    } catch (error) {
      return { success: false, error: error.message || 'Could not start Claude subscription sign-in.' };
    }
  });

  ipcMain.handle('claude-code-logout', async () => {
    stopClaudeCodeProcess();
    try {
      const result = await runClaudeCodeCommand(['auth', 'logout']);
      return result.code === 0
        ? { success: true }
        : { success: false, error: String(result.stderr || '').trim() || `Claude logout exited with code ${result.code}.` };
    } catch (error) {
      return { success: false, error: error.message || 'Could not log out of Claude Code.' };
    }
  });

  ipcMain.handle('claude-code-chat-request', async (event, payload = {}) => {
    if (claudeCodeActiveProcess) return { success: false, error: 'A Claude Code request is already running.' };
    const auth = await readClaudeCodeAuth();
    if (!auth.subscription) {
      return { success: false, error: auth.message || 'Sign in with a Claude subscription first.' };
    }

    const prompt = String(payload?.prompt || '').trim();
    if (!prompt) return { success: false, error: 'Claude Code request is empty.' };

    try {
      const child = spawn(getClaudeCodeBinary(), [
        '--print',
        '--input-format', 'text',
        '--output-format', 'stream-json',
        '--include-partial-messages',
        '--no-session-persistence',
        '--permission-mode', 'dontAsk',
        '--tools', ''
      ], {
        cwd: getWorkspaceRoot(),
        env: getClaudeCodeEnv(),
        stdio: ['pipe', 'pipe', 'pipe']
      });
      claudeCodeActiveProcess = child;

      const result = await new Promise((resolve, reject) => {
        let stdout = '';
        let stdoutBuffer = '';
        let stderr = '';
        child.stdout.on('data', (chunk) => { stdout += String(chunk); });
        child.stdout.on('data', (chunk) => {
          stdoutBuffer += String(chunk);
          const lines = stdoutBuffer.split(/\r?\n/);
          stdoutBuffer = lines.pop() || '';
          lines.filter(Boolean).forEach((line) => {
            try {
              const eventData = JSON.parse(line);
              const delta = String(eventData?.event?.delta?.text || eventData?.delta?.text || '');
              if (delta && event.sender && !event.sender.isDestroyed()) {
                event.sender.send('claude-response-chunk', { text: delta, done: false });
              }
            } catch (_) { /* Ignore non-JSON Claude diagnostics. */ }
          });
        });
        child.stderr.on('data', (chunk) => { stderr += String(chunk); });
        child.once('error', reject);
        child.once('close', (code) => {
          if (event.sender && !event.sender.isDestroyed()) event.sender.send('claude-response-chunk', { text: '', done: true });
          resolve({ code, stdout, stderr });
        });
        child.stdin.end(prompt);
      });

      if (claudeCodeActiveProcess === child) claudeCodeActiveProcess = null;
      if (result.code !== 0) {
        throw new Error(String(result.stderr || '').trim() || `Claude Code exited with code ${result.code}.`);
      }
      return { success: true, text: parseClaudeCodeResponse(result.stdout), model: 'Claude subscription' };
    } catch (error) {
      if (claudeCodeActiveProcess) claudeCodeActiveProcess = null;
      console.error('[Claude Code] request error:', error.message);
      return { success: false, error: error.message || 'Claude Code request failed.' };
    }
  });

  ipcMain.handle('claude-code-cancel-request', async () => {
    if (!claudeCodeActiveProcess) return { success: false, error: 'No active Claude Code request.' };
    stopClaudeCodeProcess();
    return { success: true };
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ── Codex Integration Service ──────────────────────────────────────────
  // Uses the locally authenticated Codex CLI app-server. The app-server owns
  // the ChatGPT-plan routing; this app never forwards a CLI token to the
  // public Responses API and never collects an API key.
  // ══════════════════════════════════════════════════════════════════════════

  let codexAppServer = null;
  let codexRpcNextId = 1;
  let codexRpcPending = new Map();
  let codexRpcBuffer = '';
  let codexActiveTurn = null;
  let codexLoginProcess = null;

  const CODEX_R_PYTHON_EXPERT_SYSTEM_PROMPT = `You are Codex, an expert AI assistant for R, Python, statistics, data science, scientific visualization, and bioinformatics inside the NGR Statistical Analysis App.

## Core Behaviour
- Inspect available project context before making changes.
- Reuse existing scripts, dependencies, conventions, and runtimes.
- Prefer reproducible, maintainable solutions.
- Explain important statistical decisions.
- Validate code through execution when authorized and available.
- Report failures and uncertainty honestly.
- Keep changes relevant to the user's request.
- Never claim to have executed code without execution evidence.
- Never invent dataset contents, test statistics, p-values, or results.
- Ask for clarification when critical study-design information is missing.
- Protect source data and preserve the ability to revert changes.

## Scientific Validation
- Choose statistical methods based on study design and data characteristics.
- Check relevant assumptions when possible.
- Clearly state which assumptions were tested and which were not.
- Distinguish association from causation.
- Report effect sizes and uncertainty where appropriate.
- Avoid fabricating results when execution fails.
- Preserve enough information to reproduce the analysis.

## Omics and Bioinformatics
- For R, use the Bioconductor ecosystem appropriately: SummarizedExperiment, SingleCellExperiment, scater, scran, scuttle, DropletUtils, scDblFinder, SingleR/celldex, Seurat, Signac, ArchR, chromVAR, GenomicRanges, rtracklayer, DiffBind/csaw, edgeR, DESeq2, limma, muscat, SpatialExperiment, minfi, and sesame when relevant.
- For Python, use the scientific and single-cell ecosystem appropriately: pandas, numpy, scipy, statsmodels, Biopython, Scanpy/anndata, scvi-tools, scrublet, celltypist, muon/MuData, episcanpy, pycisTopic, pybedtools, pyranges, pysam, matplotlib, and seaborn when relevant.
- Support bulk and single-cell RNA-seq, ATAC-seq, multiome, ChIP-seq, methylation, spatial, proteomics, metagenomics, and related omics workflows.
- Before selecting a method, identify the assay, genome build, matrix type, feature/cell/sample identifiers, metadata, batches, replicates, and experimental design. Separate QC, normalization, integration, dimensionality reduction, clustering, annotation, differential testing, enrichment, and visualization.
- Preserve sparse matrices and biological replicates, state assumptions, check package availability and versions, and never claim an installation or biological conclusion without evidence.

## Strict Workflow Protocol
- Work in explicit order: understand the goal and scope; inspect inputs and metadata; state the ordered plan and prerequisites; execute one step; validate its output; then continue.
- Never skip, reorder, or silently merge workflow steps. Do not choose a downstream method before its upstream quality checks and assumptions pass.
- Stop at the first missing input, failed validation, unavailable package, incompatible matrix, or ambiguous experimental design. Explain the blocker and request the smallest missing detail or propose a safe alternative.
- Track transformations, filters, parameters, package versions, random seeds, and outputs so another analyst can reproduce the work.
- Report what was completed, what was validated, limitations, and the next step. Never imply that an unexecuted step or biological conclusion is complete.

## Output Format
- When asked to write or modify code, return the code inside a markdown code block (\`\`\`r or \`\`\`python).
- When asked to explain or analyze, respond in clear, structured prose.
- For proposed file modifications, clearly show what changes are being made.
- Be concise but thorough.

## Readable Code and Package Setup
- Prefer simple, beginner-readable code over clever, compressed, or highly abstract code.
- Organize analysis as clearly labeled sections: \`Step 1\`, \`Step 2\`, \`Step 3\`, and so on. Each step must do one logical task and be easy to run and verify.
- Add clear comments to every step, input, transformation, assumption, validation, and output. Explain what the step does, why it is needed, what problem it prevents, and what the user should inspect after running it. For R use \`#\` comments; for Python use \`#\` comments.
- Keep explanations next to the relevant code instead of hiding important reasoning in a distant paragraph. Every analysis step must be understandable to a user who did not write the original script.
- Include package installation instructions before imports when a package may be missing. For R, distinguish CRAN \`install.packages()\` from Bioconductor \`BiocManager::install()\`; for Python, prefer \`python -m pip install\` or a clearly named conda command.
- Make installation safe to repeat by using a small package-check guard when appropriate, and never silently install packages or hide installation failures.
- Load packages immediately after the installation step, then inspect inputs, run QC, perform the analysis, validate results, and visualize or export only after validation.
- For omics, show the assay-specific package setup and keep QC, normalization, integration, dimensionality reduction, clustering, annotation, differential testing, enrichment, and visualization as separate numbered steps.
- For omics and ordinary data analysis, explain the reason for the chosen method before or in the comments for that step, including why the input format, statistical test, normalization, filter, or visualization is appropriate.
- Keep variable names descriptive, preserve raw data, reuse biological replicates, and avoid unexplained one-liners. State which commands the user should run first and what successful output to expect.

## Available Context
You may receive:
- Current editor code (CURRENT_EDITOR_CODE)
- Dataset schema and preview rows
- Project file listings
- Previous conversation history
- Execution results from R/Python console

Use all provided context to give accurate, grounded responses.`;

  const getCodexAuthFilePath = () => path.join(
    String(process.env.CODEX_HOME || path.join(os.homedir(), '.codex')),
    'auth.json'
  );

  const readCodexAuth = () => {
    try {
      const auth = JSON.parse(fs.readFileSync(getCodexAuthFilePath(), 'utf8'));
      const tokens = auth?.tokens && typeof auth.tokens === 'object' ? auth.tokens : {};
      return {
        authMode: String(auth?.auth_mode || '').trim().toLowerCase(),
        accessToken: String(tokens.access_token || '').trim()
      };
    } catch (_) {
      return { authMode: '', accessToken: '' };
    }
  };

  const getCodexBinary = () => {
    const configured = String(process.env.CODEX_BINARY || '').trim();
    if (configured) return configured;
    try {
      const resolved = spawnSync('which', ['codex'], { encoding: 'utf8' }).stdout?.trim();
      if (resolved) return resolved;
    } catch (_) { }
    try {
      const nvmNodeRoot = path.join(os.homedir(), '.nvm', 'versions', 'node');
      const versions = fs.readdirSync(nvmNodeRoot)
        .sort()
        .reverse();
      for (const version of versions) {
        const candidate = path.join(nvmNodeRoot, version, 'bin', 'codex');
        if (fs.existsSync(candidate)) return candidate;
      }
    } catch (_) { }
    return 'codex';
  };

  const sendCodexRpc = (message) => {
    if (!codexAppServer?.stdin || codexAppServer.stdin.destroyed) {
      throw new Error('Codex app-server is not running.');
    }
    codexAppServer.stdin.write(`${JSON.stringify(message)}\n`);
  };

  const rejectCodexRpc = (error) => {
    for (const pending of codexRpcPending.values()) pending.reject(error);
    codexRpcPending = new Map();
  };

  const handleCodexRpcLine = (line) => {
    let message;
    try { message = JSON.parse(line); } catch (_) { return; }

    if (message?.id !== undefined && message?.method) {
      const approvalMethod = String(message.method);
      if (approvalMethod.includes('Approval') || approvalMethod.includes('approval')) {
        const decision = approvalMethod.includes('fileChange') || approvalMethod.includes('applyPatch')
          ? 'decline'
          : 'decline';
        try { sendCodexRpc({ jsonrpc: '2.0', id: message.id, result: { decision } }); } catch (_) { }
      } else {
        try {
          sendCodexRpc({
            jsonrpc: '2.0',
            id: message.id,
            error: { code: -32601, message: 'This Codex request is not enabled in the R Agent.' }
          });
        } catch (_) { }
      }
      return;
    }

    if (message?.id !== undefined) {
      const pending = codexRpcPending.get(String(message.id));
      if (!pending) return;
      codexRpcPending.delete(String(message.id));
      if (message.error) pending.reject(new Error(message.error.message || 'Codex app-server request failed.'));
      else pending.resolve(message.result);
      return;
    }

    const params = message?.params || {};
    if (message?.method === 'item/agentMessage/delta') {
      const delta = String(params.delta || '');
      if (codexActiveTurn) {
        codexActiveTurn.text += delta;
        if (delta && codexActiveTurn.sender && !codexActiveTurn.sender.isDestroyed()) {
          codexActiveTurn.sender.send('codex-response-chunk', { text: delta, done: false });
        }
      }
    } else if (message?.method === 'item/completed' && params.item?.type === 'agentMessage' && codexActiveTurn && !codexActiveTurn.text) {
      codexActiveTurn.text = String(params.item.text || '');
    } else if (message?.method === 'turn/completed' && codexActiveTurn) {
      const active = codexActiveTurn;
      active.turn = params.turn || active.turn;
      codexActiveTurn = null;
      if (active.sender && !active.sender.isDestroyed()) active.sender.send('codex-response-chunk', { text: '', done: true });
      if (active.turn?.status === 'failed' || active.turn?.status === 'interrupted') {
        active.reject(new Error(active.turn.error?.message || `Codex turn ${active.turn.status}.`));
      } else {
        active.resolve(active.text.trim());
      }
    }
  };

  const stopCodexAppServer = () => {
    if (!codexAppServer) return;
    const child = codexAppServer;
    codexAppServer = null;
    try { child.kill(); } catch (_) { }
    rejectCodexRpc(new Error('Codex app-server stopped.'));
    if (codexActiveTurn) {
      codexActiveTurn.reject(new Error('Codex request cancelled.'));
      codexActiveTurn = null;
    }
  };

  const ensureCodexAppServer = async () => {
    const auth = readCodexAuth();
    if (!auth.accessToken || auth.authMode === 'apikey') {
      throw new Error('Sign in to Codex with ChatGPT first. No API key is used by this integration.');
    }
    if (codexAppServer && !codexAppServer.killed) return codexAppServer;

    const args = ['app-server', '--listen', 'stdio://'];
    const appServerEnv = { ...process.env };
    // Do not let another provider's API configuration change the Codex path.
    delete appServerEnv.OPENAI_API_KEY;
    delete appServerEnv.CODEX_API_KEY;
    delete appServerEnv.ACCESS_TOKEN;
    const child = spawn(getCodexBinary(), args, {
      cwd: getWorkspaceRoot(),
      env: appServerEnv,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    codexAppServer = child;
    codexRpcBuffer = '';
    child.stdout.on('data', (chunk) => {
      codexRpcBuffer += String(chunk);
      const lines = codexRpcBuffer.split('\n');
      codexRpcBuffer = lines.pop() || '';
      lines.filter(Boolean).forEach(handleCodexRpcLine);
    });
    child.stderr.on('data', () => { /* Keep auth tokens and server diagnostics out of the renderer. */ });
    child.on('error', (error) => {
      if (codexAppServer === child) stopCodexAppServer();
      rejectCodexRpc(error);
    });
    child.on('exit', () => {
      if (codexAppServer === child) stopCodexAppServer();
    });

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Codex app-server did not start.')), 10000);
      const id = String(codexRpcNextId++);
      codexRpcPending.set(id, {
        resolve: (result) => { clearTimeout(timer); resolve(result); },
        reject: (error) => { clearTimeout(timer); reject(error); }
      });
      try {
        sendCodexRpc({
          jsonrpc: '2.0',
          id,
          method: 'initialize',
          params: {
            clientInfo: { name: 'ngr-statistical-analysis-app', title: 'NGR Statistical Analysis App', version: '1.0.0' },
            capabilities: { experimentalApi: false }
          }
        });
        sendCodexRpc({ jsonrpc: '2.0', method: 'initialized', params: {} });
      } catch (error) {
        clearTimeout(timer);
        codexRpcPending.delete(id);
        reject(error);
      }
    });
    return child;
  };

  const codexRpcRequest = async (method, params = {}) => {
    await ensureCodexAppServer();
    const id = String(codexRpcNextId++);
    return new Promise((resolve, reject) => {
      codexRpcPending.set(id, { resolve, reject });
      try { sendCodexRpc({ jsonrpc: '2.0', id, method, params }); } catch (error) {
        codexRpcPending.delete(id);
        reject(error);
      }
    });
  };

  const buildCodexPrompt = (payload) => {
    const language = String(payload?.language || 'r').trim().toLowerCase() === 'python' ? 'Python' : 'R';
    const code = String(payload?.editorCode || '').trim();
    const compactCode = code.length <= 18000
      ? code
      : `${code.slice(0, 9000)}\n# ... editor context trimmed for speed ...\n${code.slice(-9000)}`;
    const datasetContext = String(payload?.datasetContext || '').trim();
    const compactDatasetContext = datasetContext.length <= 9000
      ? datasetContext
      : `${datasetContext.slice(0, 9000)}\nDATASET_CONTEXT_TRUNCATED_FOR_SPEED`;
    const messages = Array.isArray(payload?.messages) ? payload.messages : [];
    const history = messages
      .filter((message) => message?.role === 'user' || message?.role === 'assistant')
      .slice(-4)
      .map((message) => `${message.role.toUpperCase()}: ${String(message.text || message.content || '').slice(0, 1800)}`)
      .join('\n\n');
    return `${CODEX_R_PYTHON_EXPERT_SYSTEM_PROMPT}

The current editor language is ${language}. Work inside the existing R Agent flow. Do not edit files directly and do not run commands without approval. Return the requested ${language} code in one markdown code block and keep explanations outside the block brief.

CURRENT_EDITOR_CODE (${language}):
\`\`\`${language.toLowerCase()}
${compactCode || '# empty script'}
\`\`\`
${compactDatasetContext ? `\nDATASET_CONTEXT:\n${compactDatasetContext}` : ''}
${history ? `\nRECENT_CONVERSATION:\n${history}` : ''}

USER_REQUEST:
${String(payload?.instruction || '').trim()}`;
  };

  ipcMain.handle('codex-auth-status', async () => {
    const auth = readCodexAuth();
    return {
      success: true,
      loggedIn: Boolean(auth.accessToken && auth.authMode !== 'apikey'),
      authMode: auth.authMode === 'chatgpt' ? 'chatgpt' : (auth.accessToken ? 'codex' : null),
      message: auth.accessToken && auth.authMode !== 'apikey'
        ? 'Signed in with ChatGPT'
        : 'Sign in with ChatGPT to use Codex'
    };
  });

  ipcMain.handle('codex-login', async () => {
    if (codexLoginProcess && codexLoginProcess.exitCode === null && !codexLoginProcess.killed) {
      return { success: true, started: true };
    }
    try {
      const loginEnv = { ...process.env };
      delete loginEnv.OPENAI_API_KEY;
      delete loginEnv.CODEX_API_KEY;
      delete loginEnv.ACCESS_TOKEN;
      const loginProcess = spawn(getCodexBinary(), ['login'], {
        cwd: getWorkspaceRoot(),
        env: loginEnv,
        detached: true,
        stdio: 'ignore'
      });
      codexLoginProcess = loginProcess;
      loginProcess.once('error', () => { if (codexLoginProcess === loginProcess) codexLoginProcess = null; });
      loginProcess.once('exit', () => { if (codexLoginProcess === loginProcess) codexLoginProcess = null; });
      loginProcess.unref();
      return { success: true, started: true };
    } catch (error) {
      return { success: false, error: error.message || 'Could not start Codex sign-in.' };
    }
  });

  ipcMain.handle('codex-logout', async () => {
    stopCodexAppServer();
    const logoutEnv = { ...process.env };
    delete logoutEnv.OPENAI_API_KEY;
    delete logoutEnv.CODEX_API_KEY;
    delete logoutEnv.ACCESS_TOKEN;
    try {
      const logoutProcess = spawn(getCodexBinary(), ['logout'], {
        cwd: getWorkspaceRoot(),
        env: logoutEnv,
        stdio: 'ignore'
      });
      return await new Promise((resolve) => {
        logoutProcess.once('error', (error) => resolve({ success: false, error: error.message || 'Could not log out of Codex.' }));
        logoutProcess.once('exit', (code) => resolve(code === 0
          ? { success: true }
          : { success: false, error: `Codex logout exited with code ${code}.` }));
      });
    } catch (error) {
      return { success: false, error: error.message || 'Could not log out of Codex.' };
    }
  });

  ipcMain.handle('codex-models', async () => {
    try {
      const response = await codexRpcRequest('model/list', { cursor: null, includeHidden: false, limit: 100 });
      const models = Array.isArray(response?.data)
        ? response.data.map((model) => model?.id || model?.model).filter(Boolean)
        : [];
      return { success: true, models };
    } catch (error) {
      return { success: false, error: error.message || 'Could not load Codex models.' };
    }
  });

  ipcMain.handle('codex-chat-request', async (event, payload = {}) => {
    try {
      if (codexActiveTurn) throw new Error('A Codex request is already running.');
      const model = String(payload?.model || '').trim() || null;
      const requestedReasoningEffort = String(payload?.reasoningEffort || '').trim().toLowerCase();
      const reasoningEffort = ['low', 'medium', 'high'].includes(requestedReasoningEffort)
        ? requestedReasoningEffort
        : null;
      const isDataAgentRequest = payload?.mode === 'data-agent';
      const isFreeMode = payload?.mode === 'free';
      const requestPrompt = String(payload?.prompt || '').trim() || buildCodexPrompt(payload);
      const baseInstructions = isFreeMode
        ? 'You are a general-purpose AI assistant. Respond naturally to the user\'s actual request without assuming R, Python, data science, datasets, or editor changes. If code is requested, provide it conversationally and do not modify files.'
        : isDataAgentRequest
        ? 'You are a data manipulation agent inside a statistical analysis application. Follow the DATA_ACTION contract in the provided prompt exactly. Do not edit files or run commands. Preserve the dataset context and return concise natural language plus valid DATA_ACTION blocks when an operation is requested.'
        : CODEX_R_PYTHON_EXPERT_SYSTEM_PROMPT;
      const thread = await codexRpcRequest('thread/start', {
        cwd: getWorkspaceRoot(),
        model,
        approvalPolicy: 'never',
        sandbox: 'read-only',
        baseInstructions,
        ephemeral: true
      });
      const threadId = String(thread?.thread?.id || thread?.id || '').trim();
      if (!threadId) throw new Error('Codex did not return a thread id.');

      const result = await new Promise((resolve, reject) => {
        codexActiveTurn = { resolve, reject, sender: event.sender, text: '', turn: null, threadId };
        codexRpcRequest('turn/start', {
          threadId,
          input: [{ type: 'text', text: requestPrompt }],
          model,
          ...(reasoningEffort ? { effort: reasoningEffort } : {}),
          approvalPolicy: 'never',
          sandboxPolicy: { type: 'readOnly', networkAccess: true }
        }).then((turn) => {
          if (codexActiveTurn) codexActiveTurn.turn = turn?.turn || turn;
        }).catch((error) => {
          if (codexActiveTurn) {
            const active = codexActiveTurn;
            codexActiveTurn = null;
            active.reject(error);
          } else reject(error);
        });
      });
      return { success: true, text: result, model: model || 'Codex' };
    } catch (error) {
      console.error('[Codex] app-server request error:', error.message);
      return { success: false, error: error.message || 'Codex request failed.' };
    }
  });

  ipcMain.handle('codex-cancel-request', async () => {
    if (!codexActiveTurn) return { success: false, error: 'No active Codex request.' };
    try {
      const threadId = codexActiveTurn.threadId;
      if (threadId) await codexRpcRequest('turn/interrupt', { threadId });
    } catch (_) { }
    if (codexActiveTurn) {
      codexActiveTurn.reject(new Error('Request cancelled.'));
      codexActiveTurn = null;
    }
    return { success: true };
  });

  // ── End Codex Integration ──────────────────────────────────────────────

  // ── Antigravity Integration Service ─────────────────────────────────────
  // Uses the locally authenticated `agy` headless stream-json bridge. This
  // reuses the desktop/CLI account session and never handles an API key.
  let antigravityActiveProcess = null;
  let antigravityAuthProcess = null;

  const getAntigravityBinary = () => {
    const configured = String(process.env.ANTIGRAVITY_BINARY || '').trim();
    if (configured) return configured;
    return spawnSync('which', ['agy'], { encoding: 'utf8' }).stdout?.trim() || 'agy';
  };

  const runAntigravityCommand = (args, options = {}) => new Promise((resolve, reject) => {
    const child = spawn(getAntigravityBinary(), args, {
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, NO_COLOR: '1' },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.once('error', reject);
    child.once('close', (code) => resolve({ code, stdout, stderr }));
  });

  const startAntigravityAuthCommand = (command) => {
    if (antigravityAuthProcess && antigravityAuthProcess.exitCode === null && !antigravityAuthProcess.killed) {
      return { success: true, started: true };
    }
    try {
      const authProcess = spawn(getAntigravityBinary(), ['--prompt', command], {
        cwd: getWorkspaceRoot(),
        env: { ...process.env, NO_COLOR: '1' },
        detached: true,
        stdio: 'ignore'
      });
      antigravityAuthProcess = authProcess;
      authProcess.once('error', () => { if (antigravityAuthProcess === authProcess) antigravityAuthProcess = null; });
      authProcess.once('exit', () => { if (antigravityAuthProcess === authProcess) antigravityAuthProcess = null; });
      authProcess.unref();
      return { success: true, started: true };
    } catch (error) {
      return { success: false, error: error.message || `Could not start Antigravity ${command === '/login' ? 'sign-in' : 'sign-out'}.` };
    }
  };

  const readAntigravityModels = async () => {
    const result = await runAntigravityCommand(['models']);
    if (result.code !== 0) throw new Error(result.stderr.trim() || 'Antigravity model discovery failed.');
    return result.stdout.split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !/^Fetching available models/i.test(line))
      .map((line) => line.split(/\s{2,}|\t/)[0].trim())
      .filter(Boolean);
  };

  ipcMain.handle('antigravity-auth-status', async () => {
    try {
      const models = await readAntigravityModels();
      return { success: true, connected: models.length > 0, message: models.length ? 'Connected to Antigravity' : 'No Antigravity models available.' };
    } catch (error) {
      return { success: true, connected: false, message: error.message || 'Sign in to Antigravity first.' };
    }
  });

  ipcMain.handle('antigravity-login', async () => startAntigravityAuthCommand('/login'));

  ipcMain.handle('antigravity-logout', async () => startAntigravityAuthCommand('/logout'));

  ipcMain.handle('antigravity-models', async () => {
    try {
      return { success: true, models: await readAntigravityModels() };
    } catch (error) {
      return { success: false, models: [], error: error.message || 'Could not load Antigravity models.' };
    }
  });

  ipcMain.handle('antigravity-chat-request', async (event, payload = {}) => {
    if (antigravityActiveProcess) return { success: false, error: 'An Antigravity request is already running.' };
    const model = String(payload.model || '').trim();
    const cwd = String(payload.cwd || process.cwd());
    const prompt = String(payload.prompt || '').trim();
    if (!prompt) return { success: false, error: 'Antigravity prompt is empty.' };

    const child = spawn(getAntigravityBinary(), [
      '--input-format', 'stream-json',
      '--output-format', 'stream-json',
      ...(model ? ['--model', model] : []),
      ...(payload.effort ? ['--effort', String(payload.effort)] : []),
      '--print-timeout', '10m',
      '--print', ''
    ], {
      cwd,
      env: { ...process.env, NO_COLOR: '1' },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    antigravityActiveProcess = child;
    let fullText = '';
    let stdoutBuffer = '';
    let stderr = '';

    return await new Promise((resolve) => {
      let settled = false;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        if (antigravityActiveProcess === child) antigravityActiveProcess = null;
        resolve(result);
      };
      child.stdout.on('data', (chunk) => {
        stdoutBuffer += String(chunk);
        const lines = stdoutBuffer.split(/\r?\n/);
        stdoutBuffer = lines.pop() || '';
        lines.filter(Boolean).forEach((line) => {
          try {
            const eventData = JSON.parse(line);
            const step = eventData?.step_update;
            const delta = step?.step_type === 'agent_response' ? String(step.text_delta || '') : '';
            if (delta) {
              fullText += delta;
              if (!event.sender.isDestroyed()) event.sender.send('antigravity-response-chunk', { text: delta, done: false });
            }
            if (eventData?.event === 'result') {
              const result = eventData.result || {};
              const responseText = String(result.response || fullText || '');
              if (!fullText && responseText && !event.sender.isDestroyed()) event.sender.send('antigravity-response-chunk', { text: responseText, done: false });
              if (!event.sender.isDestroyed()) event.sender.send('antigravity-response-chunk', { text: '', done: true });
              finish(result.status === 'SUCCESS'
                ? { success: true, text: responseText, model: model || 'Antigravity' }
                : { success: false, error: result.error || 'Antigravity request failed.' });
              child.stdin.end();
            }
          } catch (_) { /* Ignore non-JSON diagnostics accidentally written to stdout. */ }
        });
      });
      child.stderr.on('data', (chunk) => { stderr += String(chunk); });
      child.once('error', (error) => finish({ success: false, error: error.message || 'Could not start Antigravity.' }));
      child.once('close', (code) => {
        if (!settled) finish({ success: false, error: stderr.trim() || `Antigravity exited with code ${code}.` });
      });
      try {
        child.stdin.write(`${JSON.stringify({ event: 'user', message: { content: prompt } })}\n`);
      } catch (error) {
        finish({ success: false, error: error.message || 'Could not send the Antigravity prompt.' });
      }
    });
  });

  ipcMain.handle('antigravity-cancel-request', async () => {
    if (!antigravityActiveProcess) return { success: false, error: 'No active Antigravity request.' };
    antigravityActiveProcess.kill('SIGTERM');
    antigravityActiveProcess = null;
    return { success: true };
  });

  // ── End Antigravity Integration ─────────────────────────────────────────

  app.on('before-quit', function () {
    stopREditorWorker('app is quitting');
    stopClaudeCodeProcess();
    stopCodexAppServer();
    clearInterval(plotScanTimer);
    try {
      fs.rmSync(sessionPlotsDir, { recursive: true, force: true });
    } catch (_) { }
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (aiProcess) aiProcess.kill();
  if (docAgentProcess) docAgentProcess.kill();
  if (ollamaProcess) ollamaProcess.kill();
  if (eccFinderProcess) eccFinderProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});
