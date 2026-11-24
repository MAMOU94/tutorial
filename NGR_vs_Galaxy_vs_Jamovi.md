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

### Data Explorer Module (DEM)

The DEM holds the active working dataset. Users can load or create data, edit cells and rows, filter and select data, inspect missing values, reshape tables, calculate summaries, and run dplyr/tidyr-style transformations without writing code for routine operations. The active sheet is the data source for Analysis Configuration.

The R console can receive the active DEM data as a data frame when the user connects it and selects automatic or manual synchronization. Data frames produced in R or Python can be synchronized back to the DEM. These transfers follow the selected connection and sync settings; they do not happen unconditionally on every edit.

### Biostatistical analysis

The R analysis wrapper implements descriptive and exploratory analyses, group comparisons, factorial ANOVA, one-value tests, correlations, linear/logistic/ordinal regression, and selected multivariate analyses such as PCA, CA, MCA, BCA, co-inertia, and hierarchical clustering.

For supported inferential workflows, the wrapper uses the analysis design and assumption checks to choose a test path. Examples include normality checks for parametric versus non-parametric paths, variance checks for Student versus Welch tests where applicable, and Pearson versus Spearman correlation selection. These decisions are workflow-specific and should be reviewed with the reported diagnostics.

Regression includes automatic model selection and implemented linear, binary logistic, and ordinal logistic workflows. KNN, Decision Tree, Random Forest, and SVM are visible in the interface but are not completed analysis workflows in the current repository.

### Advanced Mode and databases

Advanced Mode provides R and Python editors and interactive consoles, a system terminal, and an SQL editor/console when a database connection is active. Users can pass DEM data into R and return R or Python data frames to the DEM. Generated AI code must still be run by the user in the appropriate console.

The database panel connects through ODBC. It includes MySQL, MariaDB, PostgreSQL, and SQL Server presets and supports other databases when a compatible driver or DSN is installed. Users can browse tables and views, load a bounded preview into the DEM, save a dataset as a new table, and enable supported write-back to an existing table when it has a usable primary key.

Advanced Mode SQL executes directly on the active ODBC connection. Database-changing statements refresh the loaded DEM table and, when connected, the synchronized R data frame. The DEM grid read/write switch controls grid write-back only; SQL follows the connected database account's permissions.

### AI and missing-value prediction

NGR offers local Ollama and configured cloud or CLI assistants for data actions, code help, and analysis reports. AI assistance is optional. The R statistical wrapper calculates the statistical results.

Missing-value prediction can use scikit-learn Random Forest classification or regression when applicable. A history-based method fills values the Random Forest path cannot handle. For Random Forest predictions, the current confidence value is derived from the model's training score, not from out-of-bag or held-out validation.

### Bioinformatics

The current repository has working FastQC setup/run and report handling, plus eccDNA Finder setup and execution paths. Micromamba is the default environment manager; supported setup paths can also use Mamba or Conda. FastQC uses the `fastq_quality` environment. The app can copy a bundled eccDNA Finder environment to a writable user location on first launch.

Alignment, metagenomics, DNA-seq, and RNA-seq choices also appear in the interface, but some are configuration or preparation panels. A visible selector alone does not establish a complete runnable pipeline. MultiQC appears as a choice, but the current implementation should not be described as running MultiQC end to end.

## Capability comparison

| Area | **NGR** | **Galaxy** | **jamovi** |
|---|---|---|---|
| **Data preparation** | DEM live grid with table operations, transformations, and database integration. | Dataset tools, histories, and workflow steps; organized around files and tool execution. | Spreadsheet editing and computed variables for statistical work. |
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
