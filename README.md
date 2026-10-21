# NGR — Next-Generation Research Platform

NGR is a desktop application for preparing datasets, running statistical analyses, building visualizations, and working with R, Python, and AI-assisted research tools. It combines an Electron desktop shell with a React interface, R analysis workers, and Python utilities.

## What the application is for

The typical workflow is:

1. Open a workspace and load or create a dataset.
2. Inspect, filter, clean, and reshape the data in **Data Explorer**.
3. Choose an analysis section and configure variables and options.
4. Generate statistical results and plots.
5. Review, edit, and export the results, plots, or transformed dataset.

## Application sections

### Workspace and Files

The workspace browser provides access to files in the current project folder. It can:

- Browse folders and workspace files.
- Open supported files in the application.
- Open R and Python source files in the integrated editor.
- Keep the active file and console working directory aligned.
- Provide files to AI assistants as analysis context.

The workspace is intentionally restricted to the selected workspace root when files are accessed through the Electron bridge.

### Dataset loading and creation

Datasets can be loaded into the analysis workflow or created directly in Data Explorer. Spreadsheet workbooks can expose multiple sheets, and the active sheet can be renamed, added, deleted, or switched.

The Data Explorer can also create an empty dataset/data frame by specifying the number of rows, columns, and an optional column-name prefix.

### Analysis Configuration

This section is the main statistical workflow. It allows the user to select an analysis family, choose variables, configure assumptions and model options, and generate results.

#### Descriptive Explorer

Used to understand individual variables and relationships before formal testing.

- **Univariate Explorer**: distributions, histograms, summaries, and variable profiles.
- **Bivariate Explorer**: relationships between variable pairs using charts such as scatter, bar, grouped, or mosaic-style views.
- Automatic or manual chart selection.
- Single-variable or multi-variable analysis scopes.
- Correlation matrix support through the descriptive workflow.

#### Inferential Analysis

Used for hypothesis testing and group comparisons.

- **Group Comparison**: t-tests, ANOVA, Kruskal–Wallis, and categorical group comparisons such as chi-square when appropriate.
- **Factorial ANOVA**: between-subject, repeated-measures, and mixed designs.
- **One Value Test**: compare a variable with a known reference value.
- **Correlation Matrix**: pairwise Pearson and Spearman correlations with normality-aware handling.
- Paired and independent sample choices.
- Optional second grouping factor and subject identifier for factorial or repeated-measures designs.
- Assumption checks and parametric/non-parametric path selection where applicable.

#### Machine Learning and Regression

The currently functional regression workflow supports:

- **Auto** model selection.
- **Linear Regression** for numeric outcomes.
- **Logistic Regression** for binary outcomes.
- **Ordinal Logistic Regression** for ordered categorical outcomes.
- Automatic or manual predictor selection.
- Train/test split selection.
- Classification threshold configuration for logistic regression.
- Standardization of numeric predictors.
- Saved-model prediction support where available in the workflow.

The interface also exposes KNN, Decision Tree, Random Forest, and SVM entries. These are displayed as initializing/coming-soon modules rather than completed analysis workflows.

#### Multivariate Analysis

Used to explore structure across several variables or data blocks.

- **PCA** and **PCA Biplot** for variance reduction and joint score/loading views.
- **Hierarchical Clustering** with dendrogram and cluster-cut options.
- **CA** for categorical row-by-column structure.
- **MCA** for multiple categorical variables.
- **Co-Inertia** for joint structure across two data blocks.
- **BCA** for between-class separation across groups.
- Optional grouping, clustering, contribution, and representation controls depending on the selected technique.

### Bioinformatics

The Bioinformatics section groups sequence-analysis workflows and their input configuration.

- **FastQ Quality**: FastQC, fastp, and MultiQC workflows for sequence quality control and preprocessing.
- **Alignment**: Bowtie2, BWA, and HISAT2 options for read alignment.
- **Metagenomics**: Kraken 2 and MetaPhlAn options for taxonomic classification and microbial profiling.
- **eccDNA Finder**: mapping or assembly workflows for Nanopore/ONT or Illumina reads, with reference/index, query, paired-read, thread, and output settings.
- **DNA-seq**: options for variant calling, ChIP-seq, ATAC-seq, and methyl-seq.
- **RNA-seq**: bulk RNA-seq and single-cell RNA-seq options.

The FastQ, alignment, metagenomics, and eccDNA panels expose their workflow configuration. DNA-seq and RNA-seq entries are currently represented as preparation panels in the interface, so their complete execution support may depend on the installed runtime/tooling.

### Data Explorer

Data Explorer is the spreadsheet-style data preparation area. It works on the current working dataset and provides:

- Live table editing, row selection, column selection, search, and filtering.
- Row insertion/deletion and column insertion/deletion.
- Inline cell editing and column renaming.
- Column reordering and column styling/color controls.
- Missing-value inspection and cleanup actions.
- Group and level selection, including multi-column group focus.
- Group summaries and calculated totals.
- Sorting and distinct-row operations.
- Rename selected group levels.
- Merge columns vertically.
- Reshape wide data to long format.
- Separate one column into multiple columns.
- dplyr/tidyr-style transformation pipelines.
- Dataset undo and workspace restoration points.
- Workbook sheet management.

#### Data Explorer tools

- **Data View**: edit and inspect the current table.
- **Data Quality**: view row completeness, missing values, and dataset dimensions.
- **Selection**: select rows, columns, groups, or levels for focused operations.
- **Clean**: apply missing-value and replacement operations to the selected scope.
- **Columns**: manage column structure, names, ordering, and styling.
- **Calculations**: calculate totals and summary statistics for selected data.
- **AI Data Agent**: ask an AI provider to inspect or transform the current dataset.

### Results and Analysis Reports

After an analysis runs, the results area presents statistical summaries, assumption checks, test paths, model diagnostics, pairwise comparisons, and interpretation details when returned by the analysis engine.

Results can include:

- Descriptive summaries and variable-level statistics.
- Test statistics, p-values, confidence intervals, and effect-size information when available.
- Normality, homogeneity, and sphericity checks where relevant.
- Regression coefficients, model metrics, predictions, and classification information.
- Multivariate coordinates, contributions, clustering details, and biplot data.
- Bioinformatics workflow status and eccDNA evidence summaries.

### Plots Gallery and Plot Editor

Generated plots are collected in the Plots Gallery. Users can:

- View generated plots and expand them for detailed inspection.
- Copy or download plot images.
- Delete individual plots or clear the gallery.
- Edit plot titles, axis labels, units, colors, legends, text, scales, and custom reference elements.
- Toggle chart-specific elements such as points, labels, biplot layers, cluster displays, and annotations when supported by the chart type.

### R and Python Editor / Console

The integrated coding area supports separate R and Python workspaces.

- Edit R and Python files with syntax-aware editors.
- Open files from the workspace browser.
- Run interactive R or Python console sessions.
- Save editor files and console sessions.
- Change the console working directory.
- Use package installation support for Python.
- Use AI to generate, explain, lint, or repair code.
- Compare R wrapper code with the project’s reference/golden wrapper where enabled.

The statistical analysis engine is primarily R-based, while Python is used by supporting workers and selected bioinformatics/data-processing utilities.

### AI Assistant tools

AI features are available in several parts of the application:

- General AI assistant for research questions and result interpretation.
- AI Data Agent inside Data Explorer for dataset inspection and transformation.
- R/Python editor assistant for code generation and editing.
- Local model support through Ollama when configured.
- Cloud/provider connections such as OpenAI-compatible endpoints and other configured providers.
- Codex, Claude, OpenCode, Antigravity, Gemini, ChatGPT, and other provider integrations where authenticated and enabled.
- AI-generated reports from completed analysis results.

Provider keys and local AI settings should be stored in the application configuration or environment, never committed to the repository.

### Themes and interface settings

The Theme Library controls the application appearance. The built-in interface currently provides the dark theme, with support for importing VS Code theme files in supported formats.

## Export options

Depending on the active section, NGR can export:

- Working datasets as CSV or XLSX.
- Data Explorer content as PDF.
- Generated plots as image files.
- Detailed statistical reports.
- Model summaries as CSV, XLSX, or PDF.
- R editor files and console sessions.

## Technology stack

- **Desktop shell**: Electron
- **Frontend**: React, Vite, Tailwind CSS, Recharts, CodeMirror, Lucide
- **Statistical engine**: R scripts and wrappers
- **Data/utility workers**: Python
- **IPC bridge**: Electron `preload.js` and `main.js`
- **AI integrations**: local and cloud provider adapters

## Requirements

- Node.js 16 or newer
- Python 3
- R and the R packages required by the analysis wrappers
- Optional: Ollama or configured cloud AI credentials
- Optional: bioinformatics tools and runtimes required by the selected workflow

## Installation

Install the root dependencies:

```bash
npm install
```

Install the React application dependencies:

```bash
cd react-app
npm install
cd ..
```

Install Python dependencies:

```bash
python3 -m pip install -r requirements.txt
```

The required R packages depend on the workflows you use. Install the packages required by the analysis scripts and any selected bioinformatics tools before running those workflows.

## Running the application

Build the React renderer and launch Electron:

```bash
npm run electron-dev
```

Launch Electron using the current renderer build:

```bash
npm run start
```

Run the React development server only:

```bash
cd react-app
npm run dev
```

Build the React renderer:

```bash
npm run react-build
```

### Windows and Electron layout troubleshooting

The application works correctly on Linux with the setup described above. Linux is the primary tested desktop platform.

The browser development server and Electron load different outputs:

- `cd react-app && npm run dev` serves the current React source locally.
- `npm start` loads the compiled renderer from `react-app/dist/`.

After changing JSX or CSS, rebuild before launching Electron:

```bash
npm run react-build
npm start
```

If Electron displays the compact column layout while the browser shows the full desktop design, maximize the Electron window first. The interface uses responsive breakpoints, and a viewport below 1024 CSS pixels intentionally switches to a more compact layout. Windows display scaling can make the Electron content area smaller than expected.

For a consistent desktop window during development, configure the `BrowserWindow` in `main.js` with a larger default size, minimum content size, and maximize it after creation:

```js
width: 1440,
height: 900,
minWidth: 1400,
minHeight: 800,
```

```js
mainWindow.maximize();
```

After changing `main.js`, rebuild the React renderer and restart Electron:

```bash
npm run react-build
npm start
```

Do not edit `react-app/dist/` manually because it is generated by the build command. If the three Advanced Mode cards are still stacked, change the desktop breakpoint in `react-app/src/index.css` from `@media (min-width: 1024px)` to `@media (min-width: 900px)`, then rebuild and restart Electron.

`npm run electron-dev` rebuilds the React renderer and launches Electron in one command.

## Validation commands

Run the frontend lint check:

```bash
cd react-app
npm run lint
```

Check the Python worker syntax:

```bash
python3 -m py_compile missing_value_predictor.py
```

Check the configured local Ollama integration:

```bash
npm run test:ollama-local
```

## Project structure

```text
main.js                  Electron main process and IPC handlers
preload.js               Renderer-to-main IPC bridge
analysis_wrapper.R       Statistical analysis wrapper
analysis_worker.R        R editor/analysis worker support
missing_value_predictor.py
                         Missing-value prediction worker
react-app/src/App.jsx    Main React application wiring
react-app/src/components/
                         Reusable UI, Data Explorer, results, plots, and console components
react-app/src/index.css  Application styling and theme overrides
scripts/                 Setup, packaging, and local integration helpers
assets/                  Application and packaging assets
react-app/dist/          Generated frontend build output
```

## Documentation

For the lower-level function and IPC reference, see [`skills/README_FUNCTIONS.md`](./skills/README_FUNCTIONS.md).

## Security and data handling

NGR can execute R/Python processes and connect to local or cloud AI providers. Review provider settings before use, avoid storing credentials in source files, and do not commit API keys or sensitive datasets.
