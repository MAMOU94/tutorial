options(repos = c(CRAN = "https://cloud.r-project.org"))

active_minor <- paste(R.version$major, strsplit(R.version$minor, "\\.")[[1]][1], sep = ".")
packages <- c("openxlsx", "readxl", "jsonlite", "RColorBrewer", "viridisLite", "ggplot2", "cluster", "dunn.test", "multcompView", "reshape2")
is_other_minor_library <- function(path) {
  leaf <- basename(normalizePath(path.expand(path), winslash = "/", mustWork = FALSE))
  grepl("^[0-9]+\\.[0-9]+$", leaf) && !identical(leaf, active_minor)
}

configured_libraries <- strsplit(Sys.getenv("R_LIBS_USER", unset = ""), .Platform$path.sep, fixed = TRUE)[[1]]
configured_libraries <- configured_libraries[nzchar(trimws(configured_libraries))]
configured_libraries <- configured_libraries[!vapply(configured_libraries, is_other_minor_library, logical(1))]
user_library <- if (length(configured_libraries)) {
  path.expand(configured_libraries[[1]])
} else {
  file.path(path.expand("~"), "R", paste0(R.version$platform, "-library"), active_minor)
}
if (!dir.exists(user_library)) dir.create(user_library, recursive = TRUE, showWarnings = FALSE)
compatible_libraries <- .libPaths()
compatible_libraries <- compatible_libraries[!vapply(compatible_libraries, is_other_minor_library, logical(1))]
.libPaths(unique(c(user_library, compatible_libraries)))

args <- commandArgs(trailingOnly = TRUE)
action <- if (length(args)) args[[1]] else "check"
cat("version\t", as.character(getRversion()), "\n", sep = "")
cat("library\t", user_library, "\n", sep = "")

installed <- utils::installed.packages()
installed_versions <- setNames(installed[, "Version"], installed[, "Package"])
loadable <- vapply(packages, function(package) {
  tryCatch(requireNamespace(package, quietly = TRUE), error = function(e) FALSE)
}, logical(1))
missing <- packages[!loadable]
available <- tryCatch(suppressWarnings(utils::available.packages()), error = function(e) NULL)
offline <- is.null(available) || nrow(available) == 0L
outdated <- character()
if (!offline) {
  for (package in intersect(packages, names(installed_versions))) {
    if (!package %in% rownames(available)) next
    latest <- available[package, "Version"]
    if (length(latest) && !is.na(latest) && numeric_version(installed_versions[[package]]) < numeric_version(latest)) {
      outdated <- c(outdated, package)
      if (action == "check") cat("outdated\t", package, "\t", installed_versions[[package]], "\t", latest, "\n", sep = "")
    }
  }
} else {
  cat("offline\ttrue\n")
}

if (action == "check") {
  for (package in missing) cat("missing\t", package, "\n", sep = "")
  quit(save = "no", status = 0L)
}
if (action != "install") {
  cat("error\tUnknown package preflight action.\n")
  quit(save = "no", status = 2L)
}
if (offline) {
  cat("error\tCannot install or update R packages because CRAN could not be reached.\n")
  quit(save = "no", status = 1L)
}

to_install <- unique(c(missing, outdated))
if (length(to_install)) {
  utils::install.packages(to_install, lib = user_library, repos = getOption("repos"), dependencies = NA)
}
still_missing <- packages[!vapply(packages, requireNamespace, logical(1), quietly = TRUE)]
if (length(still_missing)) {
  cat("error\tPackages failed to install: ", paste(still_missing, collapse = ", "), "\n", sep = "")
  quit(save = "no", status = 1L)
}
cat("ready\ttrue\n")
