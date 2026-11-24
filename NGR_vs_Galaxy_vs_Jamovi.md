# NGR vs Galaxy vs jamovi

> **Scope:** This comparison describes the current NGR repository and the current official Galaxy and jamovi documentation, reviewed 24 November 2026. Features vary by release, installed modules, local dependencies, and Galaxy server configuration. Roadmap items below are planned work, not shipped features or dated release commitments.

## At a glance

| | **NGR** | **Galaxy** | **jamovi** |
|---|---|---|---|
| **Main purpose** | One desktop workspace for data preparation, biostatistics, R/Python/SQL coding, database access, AI assistance, and selected bioinformatics workflows. | A server-based platform for running and sharing scientific tools and reproducible workflows. | A point-and-click statistical spreadsheet powered by R, extended by community modules. |
| **Typical workflow** | Prepare a dataset in the Data Explorer, analyze it, and continue in Advanced Mode or a connected database. | Run tools individually or connect them into reusable workflows; histories record the analysis steps. | Open a dataset, select analyses and options, then review results in the desktop app. |
| **Where it runs** | Electron desktop app. Local features need the relevant runtimes and tools; cloud AI features need a network connection. | Public Galaxy servers or self-managed servers; tools, storage, and compute depend on the instance. | Desktop app for Windows, macOS, and Linux. |

NGR is referred to as **NGR** here; no expansion of the name is assumed. These tools serve different needs, so this document uses capability descriptions rather than star ratings.

## NGR today

### Data Explorer Module (DEM): working data, selection, and analysis

DEM is NGR's editable, tabular working area: the dataset users prepare and then send into an analysis or coding workflow. It plays a role similar to a data frame in R or a DataFrame in Python, while exposing common table operations through the interface. Users can edit cells and rows, select or filter rows, transform and reshape data, calculate summaries, and inspect missing values without writing code for routine preparation. Data stays organized in sheets, and the active sheet determines the dataset available to analysis.

**Selection controls the analysis input.** Analysis Configuration receives the active sheet's columns and the rows selected in DEM. When the user has selected a subset of rows, the analysis uses that subset; when all rows are selected, it uses the full active dataset. The user then chooses the analysis variables and their roles (for example, outcome, group, or subject) in the analysis controls. Thus row selection scopes which observations are analyzed, while analysis settings choose which variables and statistical method are used. Search and display filtering should not be described as changing the analysis sample unless those rows are also selected.

**DEM data and the uploaded file have format-dependent save behavior.** The grid is the app's working view of the dataset, but edits do not always stay separate from the source. Dirty edits to a physical CSV are automatically written back to that CSV. For CSV and Excel export actions, the app can instead save the full dataset or selected rows to a new file and prevents that export action from overwriting the uploaded source. Other imported formats may remain as in-app working data until exported. Database-backed sheets have their own optional write-back setting, described below. Users should therefore treat the source-file path, the current DEM sheet, and any exported copy as distinct concepts, while knowing that CSV edits currently persist to the original CSV.

### DEM connections: Advanced Mode and databases

When Advanced Mode is connected to DEM, the active dataset can be synchronized into an R data frame using automatic or manual sync. R and Python data frames can be synchronized back into DEM. The connection and sync mode determine when these transfers happen. The documented DEM-to-console data-frame sync targets R; Python can return data frames to DEM, but the comparison should not imply an equivalent automatic DEM-to-Python push unless the app adds one.

The database panel can load a bounded table preview into a DEM sheet. Database-backed grid edits remain local unless the user enables **Read / write**; supported write-back requires a usable primary key and is unavailable for truncated previews or unsupported table types. Row selection and search are local view operations and are not database writes. Advanced Mode's SQL editor executes statements directly on the active ODBC connection, separately from DEM grid write-back. A database-changing SQL statement can therefore modify the connected database even when the DEM grid's **Read / write** setting is off; the connected database account controls SQL permissions. After changes, the app refreshes the loaded DEM table and, when connected, its synchronized R frame.

### Biostatistical analysis

The R analysis wrapper implements descriptive and exploratory analyses, group comparisons, factorial ANOVA, one-value tests, correlations, linear/logistic/ordinal regression, and selected multivariate analyses such as PCA, CA, MCA, BCA, co-inertia, and hierarchical clustering.

For supported inferential workflows, the wrapper uses the analysis design and assumption checks to choose a test path. Examples include normality checks for parametric versus non-parametric paths, variance checks for Student versus Welch tests where applicable, and Pearson versus Spearman correlation selection. These decisions are workflow-specific and should be reviewed with the reported diagnostics.

Regression includes automatic model selection and implemented linear, binary logistic, and ordinal logistic workflows. KNN, Decision Tree, Random Forest, and SVM are visible in the interface but are not completed analysis workflows in the current repository.

### Advanced Mode and databases

Advanced Mode provides R and Python editors and interactive consoles, a system terminal, and an SQL editor/console when a database connection is active. It extends the DEM workflow with code-based operations for users who need custom transformations or analyses: DEM can sync its active dataset to R, and R or Python data frames can be returned to the DEM. Generated AI code must still be run by the user in the appropriate console.

The database panel connects through ODBC. It includes MySQL, MariaDB, PostgreSQL, and SQL Server presets and supports other databases when a compatible driver or DSN is installed. Users can browse tables and views, load a bounded preview into the DEM, save a dataset as a new table, and enable supported write-back to an existing table when it has a usable primary key. The DEM grid's optional write-back path is separate from SQL execution in Advanced Mode.

### AI and missing-value prediction

NGR offers local Ollama and configured cloud or CLI assistants for data actions, code help, and analysis reports. AI assistance is optional. The R statistical wrapper calculates the statistical results.

Missing-value prediction can use scikit-learn Random Forest classification or regression when applicable. A history-based method fills values the Random Forest path cannot handle. For Random Forest predictions, the current confidence value is derived from the model's training score, not from out-of-bag or held-out validation.

### Bioinformatics

The current repository has working FastQC setup/run and report handling, plus eccDNA Finder setup and execution paths. Micromamba is the default environment manager; supported setup paths can also use Mamba or Conda. FastQC uses the `fastq_quality` environment. The app can copy a bundled eccDNA Finder environment to a writable user location on first launch.

Alignment, metagenomics, DNA-seq, and RNA-seq choices also appear in the interface, but some are configuration or preparation panels. A visible selector alone does not establish a complete runnable pipeline. MultiQC appears as a choice, but the current implementation should not be described as running MultiQC end to end.

## Capability comparison

| Area | **NGR** | **Galaxy** | **jamovi** |
|---|---|---|---|
| **Working data and source files** | DEM provides an editable active-sheet dataset. CSV edits auto-save to the source CSV; CSV/XLSX export can save the full dataset or selected rows to a separate file. Database sheets have optional write-back. | File-oriented datasets are versioned in histories as tools create outputs; original inputs remain available as history items. | Spreadsheet is the active analysis dataset; edits and computed variables are managed within the jamovi document. |
| **Selection → analysis** | Selected DEM rows define the observations passed to Analysis Configuration; analysis controls then specify variables and test/model options. | Workflow tools receive selected datasets and tool-specific parameters; data selection is generally expressed through tools and workflow steps. | Analyses use the open data and selected variables/options; the spreadsheet supports data filtering and computed variables. |
| **Data preparation** | DEM grid supports table operations, transformations, summaries, and database integration. | Dataset tools, histories, and workflow steps; organized around files and tool execution. | Spreadsheet editing and computed variables for statistical work. |
| **DEM / code / database connection** | DEM can sync to R; R/Python data frames can return to DEM. Database grid write-back is separately controlled; Advanced Mode SQL runs directly against the ODBC database. | Tools and workflows connect datasets through history inputs and outputs; code and database access depend on the server setup. | R syntax mode and Rj provide code-based analysis; database integration depends on modules and external setup. |
| **Statistics** | R-based analyses and conditional test paths in the current wrapper. | Depends on tools installed on the selected Galaxy server. | Built-in analyses plus community modules. |
| **Machine learning** | Regression and model-selection paths are implemented; several displayed models are unfinished. | Available through installed tools and workflows; instance-dependent. | Available through some community modules; broader than the core analysis set. |
| **Bioinformatics** | Selected executable workflows, especially FastQC and eccDNA Finder; other panels have varying completion. | Broad bioinformatics tool ecosystem and workflow support; resources depend on the server. | Statistical analyses and modules rather than a general-purpose sequencing workflow platform. |
| **AI assistance** | Local and configured cloud/CLI providers. | Optional GalaxyAI and GalaxyWizard when the server is configured for AI. | Core product focuses on statistics; extensions depend on installed modules. |
| **Coding** | R/Python editors and consoles; SQL console for a connected database. | Tools, APIs, and workflows; coding access depends on server and tool setup. | R syntax mode and the Rj module for running R code inside jamovi. |
| **Deployment focus** | Local desktop use. | Shared server, institutional, and scalable deployments. | Local desktop statistical analysis. |

## Where each tool fits

- **Choose NGR** for a local workflow that combines direct data preparation, R-based biostatistics, R/Python coding, ODBC database access, optional AI, and the bioinformatics tools that are currently executable in the app.
- **Choose Galaxy** for a broad tool catalog, reusable multi-step workflows, recorded histories, and execution on a shared server or cluster.
- **Choose jamovi** for point-and-click statistical work with built-in analyses, add-on modules, and an R integration path.

These are practical distinctions rather than a universal ranking. Installed packages, database permissions, provider configuration, and compute resources all affect the result.

## Planned additions for NGR

The following items are planned development work based on existing unfinished UI options and the improvements identified during this comparison. They are not implemented yet, and no release dates are promised.

1. **Finish the displayed machine-learning choices:** KNN, Decision Tree, Random Forest, and SVM, with validation and clear model diagnostics.
2. **Complete more displayed bioinformatics workflows:** turn the FastQC-adjacent fastp/MultiQC choices, alignment, metagenomics, DNA-seq, and RNA-seq panels into validated runnable workflows, with dependency and environment checks.
3. **Protect AI provider credentials:** move R editor API keys from plain-text configuration into OS-backed secure storage, consistent with database credential handling.
4. **Make imputation quality measurable:** report held-out or cross-validated performance for Random Forest imputation, and label heuristic confidence separately from validation metrics.
5. **Show feature readiness clearly:** distinguish runnable workflows, setup-required tools, and planned panels in the interface and documentation.

## Sources

### NGR repository

- [README and installation notes](./README.md)
- [Functionality and architecture](./APP_FUNCTIONALITY.md)
- [R analysis wrapper](./analysis_wrapper.R)
- [Database connector](./database_connector.js)
- [Missing-value predictor](./missing_value_predictor.py)
- [Electron main process](./main.js)

### Galaxy

- [Galaxy project overview](https://galaxyproject.org/)
- [Galaxy 26.1 release notes, including optional AI features](https://docs.galaxyproject.org/en/master/releases/26.1_announce_user.html)

### jamovi

- [jamovi features](https://www.jamovi.org/features.html)
- [jamovi community modules](https://www.jamovi.org/modules.html)
- [jamovi documentation: R integration and Rj](https://docs.jamovi.org/usermanual/um_6_jamovi_and_R.html)
