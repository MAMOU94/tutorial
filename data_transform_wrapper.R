options(show.error.messages = TRUE)
options(repos = c(CRAN = "https://cloud.r-project.org"))

# Match RStudio: use the system R installation and its configured libraries.
configured_r_user_library <- strsplit(Sys.getenv("R_LIBS_USER", unset = ""), .Platform$path.sep, fixed = TRUE)[[1]]
configured_r_user_library <- configured_r_user_library[nzchar(trimws(configured_r_user_library))]
r_user_library <- if (length(configured_r_user_library) > 0) {
  path.expand(configured_r_user_library[[1]])
} else {
  file.path(
    path.expand("~"),
    "R",
    paste0(R.version$platform, "-library"),
    paste(R.version$major, R.version$minor, sep = ".")
  )
}
if (!dir.exists(r_user_library)) {
  tryCatch(dir.create(r_user_library, recursive = TRUE, showWarnings = FALSE), error = function(e) NULL)
}
if (dir.exists(r_user_library)) .libPaths(unique(c(r_user_library, .libPaths())))

load_system_package <- function(package) {
  tryCatch({
    if (requireNamespace(package, quietly = TRUE)) {
      return(suppressMessages(require(package, character.only = TRUE, quietly = TRUE, warn.conflicts = FALSE)))
    }
    if (!dir.exists(r_user_library)) return(FALSE)
    install.packages(
      package,
      lib = r_user_library,
      repos = getOption("repos"),
      dependencies = TRUE,
      quiet = TRUE
    )
    if (!requireNamespace(package, quietly = TRUE)) return(FALSE)
    suppressMessages(require(package, character.only = TRUE, quietly = TRUE, warn.conflicts = FALSE))
  }, error = function(e) {
    FALSE
  })
}

required_packages <- c("jsonlite", "dplyr", "tidyr", "tibble", "stringr")
failed_packages <- required_packages[!vapply(required_packages, load_system_package, logical(1))]

args <- commandArgs(trailingOnly = TRUE)
if (length(args) < 3) {
  cat(jsonlite::toJSON(list(
    success = FALSE,
    error = "Usage: Rscript data_transform_wrapper.R <input_json> <output_json> <pipeline_file>"
  ), auto_unbox = TRUE))
  quit(save = "no", status = 1)
}

input_path <- args[1]
output_path <- args[2]
pipeline_path <- args[3]

write_result <- function(payload) {
  json <- jsonlite::toJSON(
    payload,
    auto_unbox = TRUE,
    dataframe = "rows",
    na = "null",
    null = "null",
    POSIXt = "ISO8601"
  )
  writeLines(json, output_path, useBytes = TRUE)
}

if (length(failed_packages) > 0) {
  write_result(list(
    success = FALSE,
    error = paste("Failed to load required R packages:", paste(failed_packages, collapse = ", "))
  ))
  quit(save = "no", status = 1)
}

if (!file.exists(input_path)) {
  write_result(list(success = FALSE, error = "Input data file was not found."))
  quit(save = "no", status = 1)
}

if (!file.exists(pipeline_path)) {
  write_result(list(success = FALSE, error = "Pipeline file was not found."))
  quit(save = "no", status = 1)
}

parse_rows <- function(path) {
  parsed <- jsonlite::fromJSON(path, simplifyDataFrame = TRUE)
  if (is.null(parsed)) return(data.frame(check.names = FALSE))
  if (is.data.frame(parsed)) return(parsed)
  if (is.list(parsed) && length(parsed) == 0) return(data.frame(check.names = FALSE))
  stop("Input JSON must be an array of row objects.")
}

normalize_result_df <- function(result_df) {
  if (inherits(result_df, "grouped_df")) {
    result_df <- dplyr::ungroup(result_df)
  }
  if (inherits(result_df, "tbl_df")) {
    result_df <- as.data.frame(result_df, stringsAsFactors = FALSE, check.names = FALSE)
  }
  if (!is.data.frame(result_df)) {
    stop("Pipeline must return a data frame or tibble.")
  }

  for (nm in names(result_df)) {
    col <- result_df[[nm]]
    if (is.factor(col) || inherits(col, "Date") || inherits(col, "POSIXt")) {
      result_df[[nm]] <- as.character(col)
      next
    }
    if (is.list(col)) {
      result_df[[nm]] <- vapply(col, function(item) {
        if (is.null(item) || length(item) == 0) return(NA_character_)
        if (length(item) == 1) return(as.character(item))
        paste(as.character(item), collapse = "; ")
      }, character(1))
    }
  }

  result_df
}

pipeline_text <- paste(readLines(pipeline_path, warn = FALSE), collapse = "\n")
pipeline_text <- trimws(pipeline_text)

if (pipeline_text == "") {
  write_result(list(success = FALSE, error = "Pipeline is empty."))
  quit(save = "no", status = 1)
}

forbidden_patterns <- c(
  "system\\s*\\(",
  "system2\\s*\\(",
  "shell\\s*\\(",
  "unlink\\s*\\(",
  "file\\.remove\\s*\\(",
  "setwd\\s*\\(",
  "install\\.packages\\s*\\("
)
matched_forbidden <- forbidden_patterns[vapply(
  forbidden_patterns,
  function(pat) grepl(pat, pipeline_text, ignore.case = TRUE, perl = TRUE),
  logical(1)
)]

if (length(matched_forbidden) > 0) {
  write_result(list(
    success = FALSE,
    error = "Pipeline includes blocked commands for safety."
  ))
  quit(save = "no", status = 1)
}

to_eval <- pipeline_text
if (grepl("^\\s*(%>%|\\|>)", to_eval, perl = TRUE)) {
  to_eval <- paste0("df ", to_eval)
} else {
  starts_with_df <- grepl("^\\s*(df|\\.)(\\s*%>%|\\s*\\|>)", to_eval, perl = TRUE)
  starts_with_assignment <- grepl("^\\s*df\\s*<-", to_eval, perl = TRUE)
  starts_with_block <- grepl("^\\s*\\{", to_eval, perl = TRUE)
  if (!(starts_with_df || starts_with_assignment || starts_with_block)) {
    to_eval <- paste0("df %>% ", to_eval)
  }
}

tryCatch({
  raw_df <- parse_rows(input_path)
  df <- tibble::as_tibble(raw_df, .name_repair = "minimal")

  eval_env <- new.env(parent = globalenv())
  eval_env$df <- df
  eval_env$. <- df

  transform_result <- eval(parse(text = to_eval), envir = eval_env)
  if (is.null(transform_result) && exists("df", envir = eval_env, inherits = FALSE)) {
    transform_result <- get("df", envir = eval_env, inherits = FALSE)
  }

  final_df <- normalize_result_df(transform_result)

  write_result(list(
    success = TRUE,
    rows = final_df,
    columns = names(final_df),
    n_rows = nrow(final_df),
    n_cols = ncol(final_df)
  ))
}, error = function(e) {
  write_result(list(
    success = FALSE,
    error = as.character(e$message)
  ))
  quit(save = "no", status = 1)
})
