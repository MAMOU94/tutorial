# NGR Application: Functionality and Architecture

This document describes the application as implemented in this repository. It follows the path from launching the desktop window to using its main data, analysis, coding, AI, and bioinformatics features. It is based on the source files in this checkout, not on a live run of every optional dependency.

## 1. What NGR is

NGR is an Electron desktop application with a React interface. It brings together workspace files, the Data Explorer Module (DEM), R-based statistical analysis, R/Python/SQL coding tools, database connections, plots, AI-assisted workflows, and selected bioinformatics utilities.

The application has three main execution layers:

1. **React renderer** (`react-app/src/App.jsx` and `react-app/src/components/`) holds the user interface and most interactive state, including the active DEM dataset.
2. **Electron main process** (`main.js`) owns native dialogs, file access, child processes, and integration with local tools and online services. Database calls are delegated to `database_connector.js` through IPC handlers.
3. **Preload bridge** (`preload.js`) exposes a defined set of methods to React through `window.electronAPI`. The renderer has `nodeIntegration` disabled and context isolation enabled.

R scripts and Python programs do the work delegated to those runtimes. The AI provider is a separate layer: it generates or discusses code and data operations, while the application handles execution and result display.

## 2. Startup and runtime

The root `package.json` identifies `main.js` as the Electron entry point. On startup, Electron creates a frameless 1280 × 800 window and loads the built React app from `react-app/dist/index.html`, unless `ELECTRON_START_URL` is set. The renderer mounts `App` under a React error boundary.

Useful commands:

| Command | Effect |
| --- | --- |
| `npm run electron-dev` | Builds the React app, then launches Electron. |
| `npm start` | Launches Electron using the current `react-app/dist/` build. |
| `cd react-app && npm run dev` | Runs only the Vite renderer development server. |
| `npm run react-build` | Builds the renderer into `react-app/dist/`. |
| `npm run dist:appimage` / `npm run dist:deb` | Builds Linux packages. |

Electron loads the R version selection and starts background R package warm-up. If a bundled eccDNA Finder environment is present and its writable user copy is missing, it also begins copying that environment to `~/.ngr` in the background. Optional workflows still depend on the relevant host tools, runtimes, packages, credentials, and data being available.

### Workspace root

The main process initially treats its current working directory as the workspace. The user can select another folder. Workspace browsing and several code-generation flows then use that root or the active editor directory. The selected root is held by the running main process; this document does not establish that the selection persists across restarts.

Workspace APIs resolve listed/opened relative paths against the root. The File Reader separately rejects files outside the workspace and has size and file-type limits. Some other operations accept explicit paths for user-selected inputs and outputs.

## 3. Main application surface

The app combines a central analysis/data workspace with panels and overlays. The lateral panel entries in the current UI are:

- **Files** — browse and open workspace content.
- **Advanced Mode** — R/Python editor, console, and integrated terminal workflows.
- **Plots** — inspect and manage generated plots/media.
- **Research** — research-oriented assistant/interface.
- **Model Memory** — AI memory/context controls.
- **File Reader** — inspect supported documents in the workspace.
- **Quality Control** — FastQ quality-control interface.
- **Theme** — theme selection and theme import support.

The central workspace can switch between **Data Explorer**, **Analysis Configuration** (biostatistics), and **Bioinformatics Configuration**. Data Explorer is the shared data-preparation space: its active sheet can be analyzed in Analysis Configuration and synchronized into the R workspace in Advanced Mode. R and Python data frames can be synchronized back into Data Explorer. An active database connection also makes SQL available in Advanced Mode.

The main data paths are:

| Start and destination | What happens |
| --- | --- |
| File or new table → DEM | A dataset is loaded or created as an editable, in-memory sheet. Workbook sheets have their own active data and selection state. |
| DEM → Analysis Configuration | The active sheet and selected rows are passed to the R analysis workflow with the chosen variables and options. |
| DEM → Advanced Mode | When connected, the active sheet is synchronized into R as a data frame. |
| R/Python → DEM | A data frame produced in either console can be returned to Data Explorer as a sheet or applied to the active sheet according to the sync settings. |
| Database → DEM → Database | A database table is loaded as a bounded preview; supported DEM edits can be written back when database write-back is enabled. |
| Advanced Mode SQL → Database → DEM | SQL runs on the active ODBC connection. Changing statements refresh the loaded DEM table and, when connected, its R data frame. |

## 4. Workspace files and documents

The Files panel lists folders and files under the workspace and can open supported files. R and Python source files can be opened in the integrated editor. Other files may open in the application reader or through the operating system, depending on file type and action.

The File Reader accepts PDF, TXT, Markdown, legacy DOC, DOCX, JSON, and JSONC files, subject to a 20 MB limit. PDF display uses a local file URL after checking the PDF header. DOCX text is extracted from its document XML; DOC extraction uses `antiword` or `catdoc`. Image/video preview through the general file-content path has separate 100 MB limits, and ordinary text reads are limited to 2 MB.

The integrated terminal is a real PTY running the user's login shell (or PowerShell on Windows). It starts in the requested valid directory, otherwise the workspace, and passes a usable terminal environment to the shell. It is distinct from the R/Python consoles and from AI provider requests.

## 5. Data Explorer Module (DEM)

The DEM is the app's central workspace for loading, inspecting, and preparing the working dataset. The data shown in the grid is the active dataset used by the rest of the application, not a separate display copy. Users can perform common cleaning, filtering, reshaping, and table operations directly in the DEM instead of writing R or Python code for those steps. The prepared dataset then flows into Analysis Configuration, where the user chooses variables and analysis options. CSV and spreadsheet data can be opened as datasets; workbooks can contain multiple sheets, each with its own data and analysis selection. The DEM can also create an empty dataset with a chosen row and column count.

### Table editing and data preparation

The grid supports inline cell edits, row and column selection, search and filtering, row/column insertion and deletion, column rename/reorder/styling, sorting, distinct-row operations, and group/level selection and renaming. Cleanup and transformation tools include missing-value inspection and replacement, splitting a column, merging columns vertically, wide-to-long reshaping, calculated summaries/totals, and dplyr/tidyr-style transformation pipelines. The R transformations are passed to `data_transform_wrapper.R`; other grid edits update the active dataset state in the React renderer.

The DEM also provides a Data Quality view for completeness, missing values, and dataset dimensions; workbook sheet controls; undo and restoration points; and an AI Data Agent for questions or supported data actions on the active dataset. AI results and available data actions depend on the selected provider and the app's action handling.

### Connecting a database to the DEM

The Database panel uses ODBC to connect through an installed ODBC driver or configured DSN. The connection form provides presets for MySQL, MariaDB, PostgreSQL, and SQL Server, and supports other ODBC databases when a compatible driver is installed. It can browse tables and views, load a selected table into a DEM sheet, and save a dataset as a new table. Connection profiles are stored by the app; saved login details use the operating system credential store. The database preview is bounded by row and memory limits, and binary values may be represented by placeholders.

After loading a database table, the DEM is read-only with respect to the database unless the user enables **Read / write**. When supported, grid edits and visible-column changes can be written back in real time or through the manual **Run edit** action. Row selection and search are local view operations and are not written as database changes. Existing table write-back requires a usable primary key and is disabled for a truncated preview or unsupported table type. The panel can also save the current dataset as a new table. Database permissions and installed ODBC drivers still apply.

### How DEM data reaches Analysis

Analysis Configuration consumes the active DEM sheet. The frontend builds the analysis input from that dataset and filters it to the selected rows when a subset is selected; configured variable names and analysis options are passed separately to the R analysis wrapper through IPC. If all rows are selected, the analysis uses the full active dataset. Results, diagnostics, and plots are returned to the app. Changing sheets changes the active dataset available for analysis.

### How DEM data connects to Advanced Mode

The R console can be connected to the DEM. When connected, a DEM dataset can be synchronized into the R workspace as a data frame. R synchronization supports automatic or manual runs and can update the active sheet or create a new sheet, depending on the selected sync options. Data frames produced in R or Python can also be synchronized back into the DEM. The AI coding assistant can receive active dataset/schema context, but generated code is separate from execution: the user runs it in the relevant console.

If a database table is loaded in the DEM, its source table and schema context are available to the R/SQL coding assistant. R receives the synchronized data frame; it should reuse that object rather than attempting to load the database table as a local file. SQL uses the active database connection directly, as described in Advanced Mode below.

## 6. Statistical analysis

### Request path

1. The user chooses an analysis family, variables, and options in the React interface.
2. The frontend validates required selections and prepares the active/selected data.
3. `preload.js` calls the `run-r-analysis` IPC handler.
4. `main.js` validates the R wrapper, prepares any filtered temporary CSV, normalizes analysis parameters, and runs the analysis through the R editor worker. If the worker fails, it falls back to a one-shot `Rscript` process.
5. `analysis_wrapper.R` loads mode-specific packages, performs the selected analysis, creates plots, and writes JSON results. The main process parses that result and returns it to React.
6. The interface renders result-specific tables, diagnostics, interpretations, and plots. Errors and progress are surfaced in the UI/console.

`analysis_wrapper.R` is the principal statistical engine. `analysis_worker.R` supports the worker process. The wrapper also has health/recovery handling in `main.js`, using backup/safe/reference copies when the active wrapper is detected as invalid.

### Analysis families present in the interface and wrapper

- **Descriptive/exploratory:** univariate summaries/distributions, bivariate relationships, chart-specific exploration, and correlation-oriented views.
- **Inferential:** group comparisons, factorial ANOVA (between, within/repeated, and mixed designs), one-value comparisons, and correlation matrices. Depending on data and settings, the wrapper routes among parametric and non-parametric procedures and handles categorical comparisons. Assumption checks, post-hoc comparisons, and effect-size/result details are returned where supported by the branch.
- **Regression / machine learning:** automatic selection, linear regression, binary logistic regression, and ordinal logistic regression; predictor selection, split, classification threshold, and standardization options are passed to the wrapper. The README identifies KNN, decision tree, random forest, and SVM as displayed but not completed workflows; they must not be treated as implemented analysis paths based on their UI entries alone.
- **Multivariate:** PCA, PCA biplot, hierarchical clustering, correspondence analysis (CA), multiple correspondence analysis (MCA), co-inertia, and between-class analysis (BCA). The wrapper also contains clustering-related branches; exact options depend on selected mode.

The result view is mode-specific. It can show descriptive statistics, test results and assumptions, regression coefficients/diagnostics/metrics, multivariate coordinates/contributions/clusters, and generated visualizations. Statistical conclusions depend on the supplied data, selected design, and successfully installed R packages; the app cannot guarantee that a chosen design is scientifically appropriate.

### Automatic test selection and assumption checks

For supported numeric inferential workflows, the R wrapper selects a parametric or non-parametric route from the requested design and assumption checks rather than applying one test to every dataset. Group-comparison paths check normality within groups/cells or on model residuals, depending on design. When the normality checks pass, a parametric test is used; when they fail or cannot be completed, the wrapper routes to a non-parametric path where one is implemented. For independent-group parametric comparisons, Levene's or Bartlett's variance check is used where applicable to distinguish equal-variance tests from Welch's unequal-variance tests.

Other automatic choices are workflow-specific: one-value comparisons choose a one-sample t-test or Wilcoxon signed-rank path from the normality check; correlation analysis chooses Pearson when all selected variables pass Shapiro-Wilk checks and Spearman otherwise. A correlation option can request both methods. Categorical count workflows use their own count/proportion procedures and do not use the numeric normality decision rule. The results report the selected path and relevant diagnostics when that branch returns them. Users should confirm that the design and assumptions match their study; the automated choice is not a substitute for statistical review.

## 7. Bioinformatics

Bioinformatics mode groups workflow setup and selected execution tools. The presence of a UI panel does not by itself mean that its workflow has a complete runner.

| Area | What the current repository supports |
| --- | --- |
| **FastQ quality control** | The app has FastQC environment/setup and run handlers, can locate/read FastQC HTML reports, and can export a FastQC analysis report. The UI also lists fastp and MultiQC choices; do not infer complete execution for those tools from the selector alone. |
| **Alignment** | The UI exposes Bowtie2, BWA, and HISAT2 configuration choices. The README describes this as a configuration panel; this document does not treat it as a complete end-to-end alignment runner. |
| **Metagenomics** | Kraken 2 and MetaPhlAn appear as configurable choices. The README describes the panel as configuration rather than confirming complete execution. |
| **DNA-seq / RNA-seq** | The interface exposes preparation panels. The README explicitly says their complete execution support may depend on installed runtime/tooling; they are not documented here as fully implemented pipelines. |
| **eccDNA Finder** | Dedicated status, install, dependency setup, index-building, run, stop, and batch-loop handlers exist. It supports mapping and assembly choices for ONT and short reads. It may copy a bundled environment to a writable user directory and requires workflow-specific binaries/dependencies and valid inputs. Results are added to the analysis/results interface. |

FastQC report inspection/export and eccDNA Finder have concrete Electron handlers. For the other tool selectors, consult the current implementation before assuming that a configured workflow can be run end to end.

### Micromamba and bioinformatics environments

Bioinformatics tools run in named Conda-compatible environments through `scripts/bioinformatics_wrapper.sh`; Micromamba is the default manager, with Mamba and Conda also detected for supported setup/run paths. FastQC uses a `fastq_quality` environment and can install FastQC from the `conda-forge` and `bioconda` channels. eccDNA Finder can use the environment bundled with the app; on first launch, the app copies it to the writable `~/.ngr/micromamba-root` location. If the bundled environment is unavailable, creating or preparing the workflow environment requires Micromamba, Mamba, or Conda. The selected manager, environment, packages, and platform binaries determine which tools can run.

## 8. Advanced Mode: R, Python, SQL, and terminal

Advanced Mode provides language-specific editor workspaces and persistent interactive consoles. R starts with `R --vanilla --interactive`; Python starts with the system Python interpreter in interactive, unbuffered mode. Each console is kept as a child process, receives submitted commands through stdin, and streams stdout/stderr back to the renderer. The console working directory can be changed after validating that the directory exists.

The R and Python editor assistant is separate from execution. It builds a provider prompt using the selected language, editor code, recent history, and available dataset/schema/selection context; it then cleans the returned code and inserts it into the editor or follows the selected edit flow. The user runs code through the R or Python console/runtime.

The app watches a temporary plot directory and captures supported image, video, GIF, and HTML outputs into the Plots Gallery. R's graphics device is configured to save plots there. Python's matplotlib setup replaces `plt.show()` to save figures; it attempts to save active animations as GIFs. The in-memory gallery is bounded to 40 generated items for a session. This is plot capture behavior, not a general guarantee that every plotting library or output format will be captured.

The editor also has file/session save and watch support, Python package installation, R version selection, R function help, and R-wrapper comparison/fix/lint/parse actions. Exact behavior is exposed through the corresponding IPC handlers in `preload.js` and `main.js`.

### SQL editor and database console

When a database connection is active, Advanced Mode can switch the editor and console to SQL. It opens and saves `.sql` files, offers SQL syntax highlighting, and can ask the selected AI provider for SQL grounded in the connected database's dialect, tables, and available schema context. SQL is executed through `database_connector.js` over the active ODBC connection, not through the R or Python process. Multiple statements can be run; query result sets appear in the console, with up to 200 rows displayed per result set. The connected database account determines which statements are permitted.

Statements that change the database trigger a refresh of the currently loaded DEM table; if the DEM-to-R connection is active, the refreshed table is also synchronized to R. The DEM's read-only/read-write toggle controls grid write-back only. SQL run from Advanced Mode is governed by the connected database account's permissions, so SQL writes can affect the database even while DEM grid write-back is off. Review SQL before running it.

## 9. AI systems and provider routing

The app has several AI surfaces; they do not all share one backend or prompt.

### General AI assistant and document assistant

The general assistant supports local Ollama and configured online/provider flows. The app can start, send to, and stop an AI session, detect models, and pass selected file/data context. A separate document-agent server (`doc_agent_server.py`) has initialize/query/status/stop handlers and is paired with the `AI agent/` Python package and its local knowledge store. Changing its knowledge folder causes the current agent to be stopped/reinitialized. The amount of retrieved context depends on the chosen mode and available indexed documents.

`qwen_agent.py` is another Python-side AI integration. Provider/API credentials and some model settings are stored in the operating system's app user-data `ai_config.json`; R editor keys have separate load/save IPC support. Secrets should not be committed to the repository.

### Advanced Mode providers

The Advanced Mode provider selector includes local Ollama, Claude Code, Codex, Antigravity, OpenCode, and API-provider choices for code assistance, including SQL when a database is connected. Claude, Codex, Antigravity, and OpenCode are launched through local CLI integrations in this repository. The app supplies a prompt, model/options where applicable, and working-directory context. API choices use HTTP requests and configured credentials instead of those CLIs.

For editor-assistant prompts, the app supplies language-specific output instructions and relevant editor/dataset context. This is an application feature layered on top of each provider. Provider-side project instructions or skills may also be read according to that CLI's own behavior and search paths; they are not an app-wide feature guaranteed for every provider. The Claude Code request currently sets `--tools ''`, so Claude is constrained to a text response in that path. Codex uses a read-only app-server thread. Do not assume that every provider can edit project files or execute generated R/Python code through this request path.

Other AI paths include browser-based integrations/preload scripts for hosted web providers, AI-generated analysis reports, missing-value prediction, and R-code fix/lint/consultation flows. Availability varies by provider authentication and external software.

## 10. Results, plots, and exports

Analysis results are held/rendered in the frontend and may be opened in draggable/minimizable windows. Plot capture is shared between console-generated plots and analysis-generated plots. The Plot Gallery supports viewing, expanding, copying/downloading, deleting, and clearing items; the plot editor exposes labels, colors, scales, legends, annotations, and chart-specific display controls where available.

Exports are feature-specific and include dataset CSV/XLSX, detailed reports, model summaries (CSV/XLSX/PDF where supported), plot images, FastQC reports, and saved editor/session content. Export handlers may use native save dialogs. Exact output formats depend on the active result type and available libraries.

## 11. Supporting utilities

- **Missing-value prediction:** `missing_value_predictor.py` implements the Python-side prediction utility invoked by the main process.
- **R transforms:** `data_transform_wrapper.R` evaluates the app's requested data transformation workflow and returns serialized output.
- **Database integration:** `database_connector.js` handles ODBC connections, table metadata and previews, SQL execution, DEM write-back, and saving datasets as new tables.
- **R editor support:** wrapper health checks/recovery, golden-wrapper comparison/reset, code lint/parse/fix, help lookup, and editor-file persistence are provided by main-process handlers.
- **Terminal command support:** a terminal-command handler exists in addition to the interactive PTY. It is distinct from the restricted workspace file APIs; use the UI's intended command path and inspect commands before running them.
- **Themes:** the UI can import supported VS Code theme files and apply theme settings.
- **Reports:** generated reports can combine results with AI-generated narrative, subject to the selected model/provider.

## 12. Important boundaries and incomplete areas

- The React app is concentrated in a large `App.jsx`; many feature flows are wired there rather than split into separate route modules.
- R is the primary statistical engine. Python is used for the Python console and supporting workers/utilities, not as a second implementation of the statistical wrapper.
- Database connections require the ODBC package/runtime and a compatible installed driver or DSN. The DEM grid's read-only setting does not restrict SQL execution from Advanced Mode; the database account controls those permissions.
- A visible selector or configuration card is not proof that the underlying external pipeline is implemented. This applies especially to KNN/tree/forest/SVM and portions of the bioinformatics panels.
- The app depends on installed R/Python runtimes, R/Python packages, optional bioinformatics executables, CLI binaries, and provider authentication. A handler may exist while a workflow still fails on a machine missing those requirements.
- Data and code supplied to online providers leave the local machine according to the selected provider's service behavior. Review the prompt/context being sent and provider settings before sending sensitive material.
- This guide is source-based. It does not claim that every platform package, optional workflow, edge case, or external account was exercised.

## 13. Source map

| Concern | Main source files |
| --- | --- |
| Desktop process, window, child processes, filesystem, IPC handlers | `main.js` |
| Renderer-to-main API surface | `preload.js` |
| Main UI, workflow state, routing, prompts, result presentation | `react-app/src/App.jsx` |
| React startup and renderer error boundary | `react-app/src/main.jsx` |
| R statistical engine | `analysis_wrapper.R`, `analysis_worker.R` |
| Dataset transformation engine | `data_transform_wrapper.R` |
| ODBC database and SQL execution | `database_connector.js` |
| Missing-value prediction | `missing_value_predictor.py` |
| Document AI server | `doc_agent_server.py`, `AI agent/` |
| FastQC/eccDNA and environment setup | `main.js`, `scripts/`, `tools/` |
| Data Explorer and database connection UI | `react-app/src/components/DataExplorer.jsx`, `react-app/src/components/DatabaseConnectionPanel.jsx` |
| Other reusable UI components | `react-app/src/components/` |
