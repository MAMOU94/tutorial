const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  runRAnalysis: (
    filePath,
    group_var,
    response_var,
    alpha,
    group_var2,
    filterData,
    mode,
    plotColors,
    is_paired,
    factorial_design,
    scatter_var_x,
    scatter_var_y,
    subject_var,
    chi_square_adjustment,
    inferential_workflow,
    one_value_ref,
    one_value_props,
    one_value_success_category,
    correlation_force_both_methods,
    inferential_significant_only,
    plot_labels_json,
    regression_train_percent = 80,
    regression_classification_threshold = 0.5,
    regression_standardize_predictors = false
  ) => ipcRenderer.invoke(
    'run-r-analysis',
    filePath,
    group_var,
    response_var,
    alpha,
    group_var2,
    filterData,
    mode,
    plotColors,
    is_paired,
    factorial_design,
    scatter_var_x,
    scatter_var_y,
    subject_var,
    chi_square_adjustment,
    inferential_workflow,
    one_value_ref,
    one_value_props,
    one_value_success_category,
    correlation_force_both_methods,
    inferential_significant_only,
    plot_labels_json,
    regression_train_percent,
    regression_classification_threshold,
    regression_standardize_predictors
  ),
  runDplyrTidyrTransform: (rows, pipeline) =>
    ipcRenderer.invoke('run-dplyr-tidyr-transform', rows, pipeline),
  saveDatasetCsv: (payload) => ipcRenderer.invoke('save-dataset-csv', payload),
  saveDatasetXlsx: (payload) => ipcRenderer.invoke('save-dataset-xlsx', payload),
  getFileMetadata: (filePath, sheetName = '') => ipcRenderer.invoke('get-file-metadata', filePath, sheetName),
  saveDetailedReport: (title, lines) => ipcRenderer.invoke('save-detailed-report', title, lines),
  exportModelSummaryFile: (payload) => ipcRenderer.invoke('export-model-summary-file', payload),
  startRConsole: (language = 'r') => ipcRenderer.invoke('start-r-console', language),
  sendRConsole: (cmd) => ipcRenderer.invoke('send-r-console', cmd),
  setConsoleWorkingDirectory: (language = 'r', directory = '') => ipcRenderer.invoke('set-console-working-directory', language, directory),
  stopRConsole: () => ipcRenderer.invoke('stop-r-console'),
  pipInstall: (packageNames) => ipcRenderer.invoke('pip-install', packageNames),
  onPipInstallOutput: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('pip-install-output', listener);
    return () => ipcRenderer.removeListener('pip-install-output', listener);
  },
  offPipInstallOutput: () => ipcRenderer.removeAllListeners('pip-install-output'),
  getRVersion: () => ipcRenderer.invoke('get-r-version'),
  updateRVersion: () => ipcRenderer.invoke('update-r-version'),
  listWorkspaceEntries: (relativePath = '') => ipcRenderer.invoke('list-workspace-entries', relativePath),
  openWorkspaceEntry: (relativePath = '') => ipcRenderer.invoke('open-workspace-entry', relativePath),
  readFileContent: (absolutePath) => ipcRenderer.invoke('read-file-content', absolutePath),
  openFileReader: (absolutePath = '') => ipcRenderer.invoke('open-file-reader', absolutePath),
  selectWorkspaceFolder: () => ipcRenderer.invoke('select-workspace-folder'),
  selectAIKnowledgeFolder: () => ipcRenderer.invoke('select-ai-knowledge-folder'),
  onRConsoleOutput: (callback) => ipcRenderer.on('r-console-output', (event, data) => callback(data)),
  offRConsoleOutput: () => ipcRenderer.removeAllListeners('r-console-output'),
  onRAnalysisLog: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('r-console-log', listener);
    return () => ipcRenderer.removeListener('r-console-log', listener);
  },
  offRAnalysisLog: () => ipcRenderer.removeAllListeners('r-console-log'),

  // Generated Plots IPC
  onRPlotGenerated: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('r-plot-generated', listener);
    return () => ipcRenderer.removeListener('r-plot-generated', listener);
  },
  offRPlotGenerated: () => ipcRenderer.removeAllListeners('r-plot-generated'),
  getAllGeneratedPlots: () => ipcRenderer.invoke('get-all-generated-plots'),
  clearGeneratedPlots: () => ipcRenderer.invoke('clear-generated-plots'),
  deleteGeneratedPlot: (fileName) => ipcRenderer.invoke('delete-generated-plot', fileName),
  savePlotFile: (payload) => ipcRenderer.invoke('save-plot-file', payload),

  // AI Agent
  startAI: (model) => ipcRenderer.invoke('start-ai-session', model),
  sendAIMessage: (message) => ipcRenderer.invoke('send-ai-message', message),
  stopAI: () => ipcRenderer.invoke('stop-ai-session'),
  onAIResponse: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('ai-response', listener);
    return () => ipcRenderer.removeListener('ai-response', listener);
  },
  onAIStatus: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('ai-status', listener);
    return () => ipcRenderer.removeListener('ai-status', listener);
  },
  getAICompletion: (context, model, promptIndex) => ipcRenderer.invoke('get-ai-completion', context, model, promptIndex),
  generateLocalRCode: (payload) => ipcRenderer.invoke('generate-local-r-code', payload),
  onLocalAIResponseChunk: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('local-ai-response-chunk', listener);
    return () => ipcRenderer.removeListener('local-ai-response-chunk', listener);
  },
  getClaudeAgentSpec: () => ipcRenderer.invoke('get-claude-agent-spec'),
  claudeCodeChatRequest: (payload) => ipcRenderer.invoke('claude-code-chat-request', payload),
  claudeCodeCancelRequest: () => ipcRenderer.invoke('claude-code-cancel-request'),
  onClaudeResponseChunk: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('claude-response-chunk', listener);
    return () => ipcRenderer.removeListener('claude-response-chunk', listener);
  },
  claudeCodeAuthStatus: () => ipcRenderer.invoke('claude-code-auth-status'),
  claudeCodeLogin: () => ipcRenderer.invoke('claude-code-login'),
  claudeCodeLogout: () => ipcRenderer.invoke('claude-code-logout'),
  generateAIReport: (result, mode) => ipcRenderer.invoke('generate-ai-report', result, mode),
  getAIModels: () => ipcRenderer.invoke('get-ai-models'),
  detectProviderModels: (payload) => ipcRenderer.invoke('detect-provider-models', payload),
  getOpenCodeModels: (cwd) => ipcRenderer.invoke('get-opencode-models', cwd),
  getOpenCodeAuthStatus: () => ipcRenderer.invoke('get-opencode-auth-status'),
  openCodeChatRequest: (payload) => ipcRenderer.invoke('opencode-chat-request', payload),
  openCodeCancelRequest: () => ipcRenderer.invoke('opencode-cancel-request'),
  onOpenCodeResponseChunk: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('opencode-response-chunk', listener);
    return () => ipcRenderer.removeListener('opencode-response-chunk', listener);
  },
  requestAIAgent: (payload) => ipcRenderer.invoke('request-ai-agent', payload),
  predictMissingValues: (payload) => ipcRenderer.invoke('predict-missing-values', payload),
  setCloudAIUrl: (url, apiKey = null, mode = 'auto') => ipcRenderer.invoke('set-cloud-ai-url', url, apiKey, mode),
  getREditorApiKeys: () => ipcRenderer.invoke('get-r-editor-api-keys'),
  saveREditorApiKeys: (apiKeys = {}) => ipcRenderer.invoke('save-r-editor-api-keys', apiKeys),
  fixRCode: (code, output, model) => ipcRenderer.invoke('fix-r-code', code, output, model),
  lintRCode: (code, breachLine, model) => ipcRenderer.invoke('lint-r-code', code, breachLine, model),

  // Codex Integration
  codexChatRequest: (payload) => ipcRenderer.invoke('codex-chat-request', payload),
  codexCancelRequest: () => ipcRenderer.invoke('codex-cancel-request'),
  codexAuthStatus: () => ipcRenderer.invoke('codex-auth-status'),
  codexLogin: () => ipcRenderer.invoke('codex-login'),
  codexLogout: () => ipcRenderer.invoke('codex-logout'),
  codexModels: () => ipcRenderer.invoke('codex-models'),
  onCodexResponseChunk: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('codex-response-chunk', listener);
    return () => ipcRenderer.removeListener('codex-response-chunk', listener);
  },
  offCodexResponseChunk: () => ipcRenderer.removeAllListeners('codex-response-chunk'),

  // Antigravity account integration through the authenticated agy headless bridge
  antigravityChatRequest: (payload) => ipcRenderer.invoke('antigravity-chat-request', payload),
  antigravityCancelRequest: () => ipcRenderer.invoke('antigravity-cancel-request'),
  antigravityAuthStatus: () => ipcRenderer.invoke('antigravity-auth-status'),
  antigravityLogin: () => ipcRenderer.invoke('antigravity-login'),
  antigravityLogout: () => ipcRenderer.invoke('antigravity-logout'),
  antigravityModels: () => ipcRenderer.invoke('antigravity-models'),
  onAntigravityResponseChunk: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('antigravity-response-chunk', listener);
    return () => ipcRenderer.removeListener('antigravity-response-chunk', listener);
  },

  compareRWrapper: (userCode) => ipcRenderer.invoke('compare-r-wrapper', userCode),
  resetGolden: () => ipcRenderer.invoke('reset-golden'),

  parseRCode: (code) => ipcRenderer.invoke('parse-r-code', code),
  readRWrapper: () => ipcRenderer.invoke('read-r-wrapper'),
  readGoldenRWrapper: () => ipcRenderer.invoke('read-golden-r-wrapper'),
  saveRWrapper: (content) => ipcRenderer.invoke('save-r-wrapper', content),
  saveREditorFile: (payload) => ipcRenderer.invoke('save-r-editor-file', payload),
  openREditorFile: (payload) => ipcRenderer.invoke('open-r-editor-file', payload),
  saveREditorSession: (payload) => ipcRenderer.invoke('save-r-editor-session', payload),
  prepareCliRContext: (payload = {}) => ipcRenderer.invoke('prepare-cli-r-context', payload),

  // Real-Time File Sync
  watchRFile: (absolutePath) => ipcRenderer.invoke('watch-r-file', absolutePath),
  unwatchRFile: () => ipcRenderer.invoke('unwatch-r-file'),
  silentSaveRFile: (content, absolutePath) => ipcRenderer.invoke('silent-save-r-file', content, absolutePath),
  onRFileChanged: (callback) => {
    const listener = (event, content, absolutePath) => callback(content, absolutePath);
    ipcRenderer.on('r-file-changed', listener);
    return () => ipcRenderer.removeListener('r-file-changed', listener);
  },
  importVsCodeTheme: () => ipcRenderer.invoke('import-vscode-theme'),
  openExtensionBrowser: (startUrl, prompt, background, provider, filePath = '') => ipcRenderer.invoke('open-extension-browser', startUrl, prompt, background, provider, filePath),
  onChatGPTResponse: (callback) => {
    const listener = (event, text, isFinal) => {
      ipcRenderer.send('log-debug', `[Preload] Received chatgpt-response (final=${isFinal})`);
      callback(text, isFinal);
    };
    ipcRenderer.on('chatgpt-response', listener);
    return () => ipcRenderer.removeListener('chatgpt-response', listener);
  },


  onGeminiResponse: (callback) => {
    const listener = (event, text, isFinal) => {
      ipcRenderer.send('log-debug', `[Preload] Received gemini-response (final=${isFinal})`);
      callback(text, isFinal);
    };
    ipcRenderer.on('gemini-response', listener);
    return () => ipcRenderer.removeListener('gemini-response', listener);
  },

  onClaudeResponse: (callback) => {
    const listener = (event, text, isFinal) => {
      ipcRenderer.send('log-debug', `[Preload] Received claude-response (final=${isFinal})`);
      callback(text, isFinal);
    };
    ipcRenderer.on('claude-response', listener);
    return () => ipcRenderer.removeListener('claude-response', listener);
  },

  onQwenResponse: (callback) => {
    const listener = (event, text, isFinal) => {
      ipcRenderer.send('log-debug', `[Preload] Received qwen-response (final=${isFinal})`);
      callback(text, isFinal);
    };
    ipcRenderer.on('qwen-response', listener);
    return () => ipcRenderer.removeListener('qwen-response', listener);
  },

  onDeepSeekResponse: (callback) => {
    const listener = (event, text, isFinal) => {
      ipcRenderer.send('log-debug', `[Preload] Received deepseek-response (final=${isFinal})`);
      callback(text, isFinal);
    };
    ipcRenderer.on('deepseek-response', listener);
    return () => ipcRenderer.removeListener('deepseek-response', listener);
  },

  onAttachFile: (callback) => {
    const listener = (event, filePath) => {
      ipcRenderer.send('log-debug', `[Preload] Received attach-file: ${filePath}`);
      callback(filePath);
    };
    ipcRenderer.on('attach-file', listener);
    return () => ipcRenderer.removeListener('attach-file', listener);
  },

  checkForAttachFile: () => ipcRenderer.invoke('check-for-attach-file'),

  initializeDocAgent: (model) => ipcRenderer.invoke('initialize-doc-agent', model),
  queryDocAgent: (payload) => ipcRenderer.invoke('query-doc-agent', payload),
  getDocAgentStatus: () => ipcRenderer.invoke('get-doc-agent-status'),
  listDocAgentDocuments: () => ipcRenderer.invoke('list-doc-agent-documents'),
  stopDocAgent: () => ipcRenderer.invoke('stop-doc-agent'),
  // Auto-Fix
  fixRCodeError: (error_message, code_context) => ipcRenderer.invoke('fix-r-code-error', error_message, code_context),
  applyRCodeFix: (newContent) => ipcRenderer.invoke('apply-r-code-fix', newContent),
  restoreRCodeBackup: () => ipcRenderer.invoke('restore-r-code-backup'),
  onDocAgentStatus: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('doc-agent-status', listener);
    return () => ipcRenderer.removeListener('doc-agent-status', listener);
  },
  onDocAgentResponse: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('doc-agent-response', listener);
    return () => ipcRenderer.removeListener('doc-agent-response', listener);
  },
  onDocAgentResponseChunk: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('doc-agent-response-chunk', listener);
    return () => ipcRenderer.removeListener('doc-agent-response-chunk', listener);
  },
  onDocAgentResponseDone: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('doc-agent-response-done', listener);
    return () => ipcRenderer.removeListener('doc-agent-response-done', listener);
  },
  onDocAgentFixResult: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('doc-agent-fix-result', listener);
    return () => ipcRenderer.removeListener('doc-agent-fix-result', listener);
  },
  onDocAgentError: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('doc-agent-error', listener);
    return () => ipcRenderer.removeListener('doc-agent-error', listener);
  },
  onDocAgentDocuments: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('doc-agent-documents', listener);
    return () => ipcRenderer.removeListener('doc-agent-documents', listener);
  },
  onMenuOpenAIAssistant: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('menu-open-ai-assistant', listener);
    return () => ipcRenderer.removeListener('menu-open-ai-assistant', listener);
  },
  onMenuOpenRWrapper: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('menu-open-r-wrapper', listener);
    return () => ipcRenderer.removeListener('menu-open-r-wrapper', listener);
  },
  onMenuUpdateRVersion: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('menu-update-r-version', listener);
    return () => ipcRenderer.removeListener('menu-update-r-version', listener);
  },
  onMenuRefreshRVersion: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('menu-refresh-r-version', listener);
    return () => ipcRenderer.removeListener('menu-refresh-r-version', listener);
  },
  readAgentDataFiles: () => ipcRenderer.invoke('read-agent-data-files'),
  openAgentDataFolder: () => ipcRenderer.invoke('open-agent-data-folder'),
  getWorkspaceRoot: () => ipcRenderer.invoke('get-workspace-root'),
  openNativeClineTerminal: (cwd = '') => ipcRenderer.invoke('open-native-cline-terminal', cwd),
  getAIKnowledgeRoot: () => ipcRenderer.invoke('get-ai-knowledge-root'),
  runTerminalCmd: (commandStr) => ipcRenderer.invoke('run-terminal-cmd', commandStr),
  getEccFinderStatus: (sourcePath = '') => ipcRenderer.invoke('get-ecc-finder-status', sourcePath),
  installEccFinder: (sourcePath = '') => ipcRenderer.invoke('install-ecc-finder', sourcePath),
  installEccFinderDependencies: (payload = {}) => ipcRenderer.invoke('install-ecc-finder-dependencies', payload),
  runEccFinder: (payload) => ipcRenderer.invoke('run-ecc-finder', payload),
  stopEccFinder: () => ipcRenderer.invoke('stop-ecc-finder'),
  buildEccIndex: (payload) => ipcRenderer.invoke('build-ecc-index', payload),
  onEccFinderOutput: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('ecc-finder-output', listener);
    return () => ipcRenderer.removeListener('ecc-finder-output', listener);
  },
  findFastqFiles: (payload) => ipcRenderer.invoke('find-fastq-files', payload),
  runEccLoop: (payload) => ipcRenderer.invoke('run-ecc-loop', payload),
  stopEccLoop: () => ipcRenderer.invoke('stop-ecc-loop'),
  onEccLoopProgress: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('ecc-loop-progress', listener);
    return () => ipcRenderer.removeListener('ecc-loop-progress', listener);
  },

  // Real Terminal PTY
  startTerminalSession: (cols, rows, cwd) => ipcRenderer.invoke('start-terminal-session', cols, rows, cwd),
  sendTerminalData: (data) => ipcRenderer.invoke('send-terminal-data', data),
  resizeTerminalSession: (cols, rows) => ipcRenderer.invoke('resize-terminal-session', cols, rows),
  stopTerminalSession: () => ipcRenderer.invoke('stop-terminal-session'),
  onTerminalData: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('terminal-incoming-data', listener);
    return () => ipcRenderer.removeListener('terminal-incoming-data', listener);
  },
});
