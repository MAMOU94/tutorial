options(show.error.messages = TRUE)
options(warn = 1)

active_r_minor <- paste(R.version$major, strsplit(R.version$minor, "\\.")[[1]][1], sep = ".")
r_library_minor <- function(path) {
  leaf <- basename(normalizePath(path.expand(path), winslash = "/", mustWork = FALSE))
  if (grepl("^[0-9]+\\.[0-9]+$", leaf)) leaf else ""
}
is_other_r_library <- function(path) {
  library_minor <- r_library_minor(path)
  nzchar(library_minor) && !identical(library_minor, active_r_minor)
}
compatible_libraries <- .libPaths()
compatible_libraries <- compatible_libraries[!vapply(compatible_libraries, is_other_r_library, logical(1))]
r_user_library <- strsplit(Sys.getenv("R_LIBS_USER", unset = ""), .Platform$path.sep, fixed = TRUE)[[1]]
r_user_library <- r_user_library[nzchar(trimws(r_user_library))]
r_user_library <- if (length(r_user_library) > 0 && !is_other_r_library(r_user_library[[1]])) {
  path.expand(r_user_library[[1]])
} else {
  file.path(path.expand("~"), "R", paste0(R.version$platform, "-library"), active_r_minor)
}
if (!dir.exists(r_user_library)) dir.create(r_user_library, recursive = TRUE, showWarnings = FALSE)
.libPaths(unique(c(r_user_library, compatible_libraries)))
if (!requireNamespace("jsonlite", quietly = TRUE)) {
  install.packages("jsonlite", lib = r_user_library, repos = "https://cloud.r-project.org", quiet = TRUE)
}

suppressPackageStartupMessages(library(jsonlite))

Sys.setenv(ANALYSIS_WRAPPER_EMBEDDED = "1")

first_text <- function(value, fallback = "") {
  if (is.null(value) || length(value) == 0) return(fallback)
  txt <- trimws(as.character(value[[1]]))
  if (nzchar(txt)) txt else fallback
}

send_message <- function(payload) {
  cat(jsonlite::toJSON(payload, auto_unbox = TRUE, null = "null"), "\n", sep = "")
  flush.console()
}

run_wrapper_once <- function(wrapper_path, trailing_args) {
  safe_args <- if (is.null(trailing_args)) character(0) else as.character(unlist(trailing_args, use.names = FALSE))
  run_env <- new.env(parent = globalenv())
  run_env$commandArgs <- function(trailingOnly = FALSE) {
    if (isTRUE(trailingOnly)) {
      return(safe_args)
    }
    c("Rscript", wrapper_path, safe_args)
  }

  out_lines <- character(0)
  out_conn <- textConnection("out_lines", "w", local = TRUE)
  sink(out_conn, type = "output")

  exit_code <- 0L
  err_text <- ""

  tryCatch(
    {
      source(wrapper_path, local = run_env, chdir = TRUE, echo = FALSE, print.eval = FALSE)
    },
    analysis_wrapper_quit = function(e) {
      status_raw <- if (!is.null(e$status)) e$status else 0L
      status_val <- suppressWarnings(as.integer(status_raw[[1]]))
      if (!is.finite(status_val)) status_val <- 0L
      exit_code <<- status_val
      invisible(NULL)
    },
    error = function(e) {
      exit_code <<- 1L
      err_text <<- conditionMessage(e)
      invisible(NULL)
    }
  )

  while (sink.number(type = "output") > 0) {
    sink(type = "output")
  }
  close(out_conn)

  list(
    code = as.integer(exit_code),
    stdout = paste(out_lines, collapse = "\n"),
    stderr = err_text
  )
}

worker_args <- commandArgs(trailingOnly = TRUE)
wrapper_path <- first_text(worker_args, "analysis_wrapper.R")
wrapper_path <- normalizePath(wrapper_path, winslash = "/", mustWork = FALSE)

if (!file.exists(wrapper_path)) {
  send_message(list(type = "fatal", error = sprintf("Wrapper not found: %s", wrapper_path)))
  quit(save = "no", status = 1L)
}

send_message(list(type = "ready"))

stdin_conn <- file("stdin", open = "r")
on.exit(try(close(stdin_conn), silent = TRUE), add = TRUE)

repeat {
  line <- readLines(stdin_conn, n = 1, warn = FALSE)
  if (length(line) == 0) break
  line <- trimws(line)
  if (!nzchar(line)) next

  req <- tryCatch(jsonlite::fromJSON(line, simplifyVector = FALSE), error = function(e) NULL)
  if (is.null(req) || !is.list(req)) {
    send_message(list(type = "response", id = NA, code = 1L, stdout = "", stderr = "Invalid worker request JSON."))
    next
  }

  req_type <- tolower(first_text(req$type, "run"))
  req_id <- suppressWarnings(as.integer(first_text(req$id, "0")))
  if (!is.finite(req_id)) req_id <- 0L

  if (req_type == "shutdown") {
    send_message(list(type = "response", id = req_id, code = 0L, stdout = "", stderr = ""))
    break
  }

  if (req_type != "run") {
    send_message(list(type = "response", id = req_id, code = 1L, stdout = "", stderr = sprintf("Unsupported request type: %s", req_type)))
    next
  }

  run_result <- run_wrapper_once(wrapper_path, req$args)
  send_message(list(
    type = "response",
    id = req_id,
    code = as.integer(run_result$code),
    stdout = as.character(run_result$stdout),
    stderr = as.character(run_result$stderr)
  ))

  invisible(gc(verbose = FALSE))
}
