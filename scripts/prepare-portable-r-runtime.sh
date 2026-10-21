#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

RUNTIME_ROOT="${PROJECT_ROOT}/appimage-build/runtime/r"
RUNTIME_LIB_ROOT="${RUNTIME_ROOT}/lib"
RUNTIME_R_HOME="${RUNTIME_LIB_ROOT}/R"
RUNTIME_SYSTEM_LIB_DIR="${RUNTIME_LIB_ROOT}/system"
PROJECT_R_LIBS="${PROJECT_ROOT}/r-libs"

if ! command -v R >/dev/null 2>&1; then
  echo "[portable-r] Missing required command: R" >&2
  exit 1
fi
if ! command -v Rscript >/dev/null 2>&1; then
  echo "[portable-r] Missing required command: Rscript" >&2
  exit 1
fi

sync_tree() {
  local source_dir="$1"
  local target_dir="$2"
  mkdir -p "${target_dir}"
  if command -v rsync >/dev/null 2>&1; then
    rsync -rltDL --no-owner --no-group --no-perms "${source_dir}" "${target_dir}/"
  else
    cp -aL "${source_dir}/." "${target_dir}/"
  fi
}

is_elf_file() {
  local candidate="$1"
  file -b "${candidate}" 2>/dev/null | grep -qi "ELF"
}

collect_shared_libraries() {
  local output_dir="$1"
  shift
  local queue=("$@")
  local -A seen=()

  mkdir -p "${output_dir}"

  while ((${#queue[@]} > 0)); do
    local file="${queue[0]}"
    queue=("${queue[@]:1}")

    if [[ -z "${file}" || ! -f "${file}" ]]; then
      continue
    fi
    if [[ -n "${seen["$file"]+x}" ]]; then
      continue
    fi
    seen["$file"]=1

    if ! is_elf_file "${file}"; then
      continue
    fi

    while IFS= read -r lib_path; do
      [[ -z "${lib_path}" ]] && continue
      [[ -f "${lib_path}" ]] || continue

      local lib_name
      lib_name="$(basename "${lib_path}")"
      case "${lib_name}" in
        linux-vdso.so.*)
          continue
          ;;
      esac

      local target_path="${output_dir}/${lib_name}"
      if [[ ! -f "${target_path}" ]]; then
        cp -aL "${lib_path}" "${target_path}"
      fi
      queue+=("${lib_path}")
    done < <(ldd "${file}" 2>/dev/null | awk '/=> \// {print $3} /^\// {print $1}')
  done
}

R_HOME_SOURCE="$(R RHOME)"
R_EXEC_SOURCE="${R_HOME_SOURCE}/bin/exec/R"
R_SCRIPT_SOURCE="${R_HOME_SOURCE}/bin/Rscript"

if [[ ! -x "${R_EXEC_SOURCE}" ]]; then
  echo "[portable-r] Missing executable: ${R_EXEC_SOURCE}" >&2
  exit 1
fi
if [[ ! -x "${R_SCRIPT_SOURCE}" ]]; then
  echo "[portable-r] Missing executable: ${R_SCRIPT_SOURCE}" >&2
  exit 1
fi

echo "[portable-r] Preparing runtime at ${RUNTIME_ROOT}"
rm -rf "${RUNTIME_ROOT}"
mkdir -p "${RUNTIME_ROOT}/bin" "${RUNTIME_LIB_ROOT}" "${RUNTIME_SYSTEM_LIB_DIR}"

sync_tree "${R_HOME_SOURCE}/" "${RUNTIME_R_HOME}"

if [[ -d "/usr/share/R" ]]; then
  sync_tree "/usr/share/R/" "${RUNTIME_ROOT}/share/R"
fi
if [[ -d "/etc/R" ]]; then
  sync_tree "/etc/R/" "${RUNTIME_ROOT}/etc/R"
fi

cat > "${RUNTIME_ROOT}/bin/R" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_ROOT="$(cd "${SELF_DIR}/.." && pwd)"

export R_HOME="${RUNTIME_ROOT}/lib/R"
export R_HOME_DIR="${R_HOME}"
export RHOME="${R_HOME}"

if [[ -d "${RUNTIME_ROOT}/share/R/share" ]]; then
  export R_SHARE_DIR="${RUNTIME_ROOT}/share/R/share"
fi
if [[ -d "${RUNTIME_ROOT}/share/R/include" ]]; then
  export R_INCLUDE_DIR="${RUNTIME_ROOT}/share/R/include"
fi
if [[ -d "${RUNTIME_ROOT}/share/R/doc" ]]; then
  export R_DOC_DIR="${RUNTIME_ROOT}/share/R/doc"
fi
if [[ -f "${RUNTIME_ROOT}/etc/R/Renviron" ]]; then
  export R_ENVIRON="${RUNTIME_ROOT}/etc/R/Renviron"
fi

LD_PREFIX=(
  "${RUNTIME_ROOT}/lib/system"
  "${RUNTIME_ROOT}/lib/R/lib"
  "${RUNTIME_ROOT}/lib/R/modules"
)

for candidate in "${LD_PREFIX[@]}"; do
  if [[ -d "${candidate}" ]]; then
    export LD_LIBRARY_PATH="${candidate}${LD_LIBRARY_PATH:+:${LD_LIBRARY_PATH}}"
  fi
done

exec "${R_HOME}/bin/exec/R" "$@"
EOF

cat > "${RUNTIME_ROOT}/bin/Rscript" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_ROOT="$(cd "${SELF_DIR}/.." && pwd)"

export R_HOME="${RUNTIME_ROOT}/lib/R"
export R_HOME_DIR="${R_HOME}"
export RHOME="${R_HOME}"

if [[ -d "${RUNTIME_ROOT}/share/R/share" ]]; then
  export R_SHARE_DIR="${RUNTIME_ROOT}/share/R/share"
fi
if [[ -d "${RUNTIME_ROOT}/share/R/include" ]]; then
  export R_INCLUDE_DIR="${RUNTIME_ROOT}/share/R/include"
fi
if [[ -d "${RUNTIME_ROOT}/share/R/doc" ]]; then
  export R_DOC_DIR="${RUNTIME_ROOT}/share/R/doc"
fi
if [[ -f "${RUNTIME_ROOT}/etc/R/Renviron" ]]; then
  export R_ENVIRON="${RUNTIME_ROOT}/etc/R/Renviron"
fi

LD_PREFIX=(
  "${RUNTIME_ROOT}/lib/system"
  "${RUNTIME_ROOT}/lib/R/lib"
  "${RUNTIME_ROOT}/lib/R/modules"
)

for candidate in "${LD_PREFIX[@]}"; do
  if [[ -d "${candidate}" ]]; then
    export LD_LIBRARY_PATH="${candidate}${LD_LIBRARY_PATH:+:${LD_LIBRARY_PATH}}"
  fi
done

if [[ "${1:-}" == "--version" ]]; then
  exec "${R_HOME}/bin/exec/R" --version
fi

R_ARGS=(--no-echo --no-restore)
EXPRS=()
SCRIPT_FILE=""
TRAILING_ARGS=()

while (($# > 0)); do
  case "$1" in
    --help|-h)
      exec "${R_HOME}/bin/exec/R" --help
      ;;
    --version)
      exec "${R_HOME}/bin/exec/R" --version
      ;;
    -e)
      if (($# < 2)); then
        echo "Rscript wrapper: missing expression after -e" >&2
        exit 2
      fi
      EXPRS+=("$2")
      shift 2
      ;;
    --file=*)
      SCRIPT_FILE="${1#--file=}"
      shift
      ;;
    --file)
      if (($# < 2)); then
        echo "Rscript wrapper: missing value after --file" >&2
        exit 2
      fi
      SCRIPT_FILE="$2"
      shift 2
      ;;
    --args)
      shift
      if (($# > 0)); then
        TRAILING_ARGS=("$@")
      fi
      break
      ;;
    --no-echo|--no-restore|--no-save|--no-environ|--no-site-file|--no-init-file|--vanilla|--quiet|--silent|--interactive)
      R_ARGS+=("$1")
      shift
      ;;
    -*)
      R_ARGS+=("$1")
      shift
      ;;
    *)
      if [[ -z "${SCRIPT_FILE}" ]]; then
        SCRIPT_FILE="$1"
      else
        TRAILING_ARGS+=("$1")
      fi
      shift
      ;;
  esac
done

for expr in "${EXPRS[@]}"; do
  R_ARGS+=(-e "$expr")
done

if [[ -n "${SCRIPT_FILE}" ]]; then
  R_ARGS+=("--file=${SCRIPT_FILE}")
fi

if ((${#TRAILING_ARGS[@]} > 0)); then
  R_ARGS+=(--args "${TRAILING_ARGS[@]}")
fi

exec "${R_HOME}/bin/exec/R" "${R_ARGS[@]}"
EOF

chmod +x "${RUNTIME_ROOT}/bin/R" "${RUNTIME_ROOT}/bin/Rscript"

declare -a probe_files=(
  "${RUNTIME_R_HOME}/bin/exec/R"
  "${RUNTIME_R_HOME}/bin/Rscript"
)

if [[ -d "${RUNTIME_R_HOME}" ]]; then
  while IFS= read -r so_file; do
    probe_files+=("${so_file}")
  done < <(find "${RUNTIME_R_HOME}" -type f \( -name "*.so" -o -name "*.so.*" \))
fi

if [[ -d "${PROJECT_R_LIBS}" ]]; then
  while IFS= read -r so_file; do
    probe_files+=("${so_file}")
  done < <(find "${PROJECT_R_LIBS}" -type f \( -name "*.so" -o -name "*.so.*" \))
fi

collect_shared_libraries "${RUNTIME_SYSTEM_LIB_DIR}" "${probe_files[@]}"

{
  echo "built_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "r_home_source=${R_HOME_SOURCE}"
  echo "r_version=$(Rscript --version 2>&1 | head -n 1)"
  echo "bundled_shared_libs=$(find "${RUNTIME_SYSTEM_LIB_DIR}" -maxdepth 1 -type f | wc -l | tr -d ' ')"
} > "${RUNTIME_ROOT}/runtime-manifest.txt"

echo "[portable-r] Done."
