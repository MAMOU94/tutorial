#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

RUNTIME_ROOT="${PROJECT_ROOT}/appimage-build/runtime/python"
RUNTIME_BIN_DIR="${RUNTIME_ROOT}/bin"
RUNTIME_LIB_DIR="${RUNTIME_ROOT}/lib"
RUNTIME_SYSTEM_LIB_DIR="${RUNTIME_LIB_DIR}/system"

ROOT_REQUIREMENTS_FILE="${PROJECT_ROOT}/requirements.txt"
AI_REQUIREMENTS_FILE="${PROJECT_ROOT}/AI agent/requirements.txt"

if ! command -v python3 >/dev/null 2>&1; then
  echo "[portable-python] Missing required command: python3" >&2
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

PYTHON_SOURCE="$(command -v python3)"
PYTHON_SOURCE_REAL="$(readlink -f "${PYTHON_SOURCE}")"

PYTHON_VERSION="$("${PYTHON_SOURCE}" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
PYTHON_STDLIB_SOURCE="$("${PYTHON_SOURCE}" -c 'import sysconfig; print(sysconfig.get_path("stdlib"))')"
PYTHON_SITE_PACKAGES_DIR="${RUNTIME_LIB_DIR}/python${PYTHON_VERSION}/site-packages"
PYTHON_LDLIBRARY="$("${PYTHON_SOURCE}" -c 'import sysconfig; print(sysconfig.get_config_var("LDLIBRARY") or "")')"
PYTHON_LIBDIR="$("${PYTHON_SOURCE}" -c 'import sysconfig; print(sysconfig.get_config_var("LIBDIR") or "")')"

if [[ ! -d "${PYTHON_STDLIB_SOURCE}" ]]; then
  echo "[portable-python] Unable to locate Python stdlib directory." >&2
  exit 1
fi

echo "[portable-python] Preparing runtime at ${RUNTIME_ROOT}"
rm -rf "${RUNTIME_ROOT}"
mkdir -p "${RUNTIME_BIN_DIR}" "${RUNTIME_LIB_DIR}" "${PYTHON_SITE_PACKAGES_DIR}" "${RUNTIME_SYSTEM_LIB_DIR}"

cp -aL "${PYTHON_SOURCE_REAL}" "${RUNTIME_BIN_DIR}/python3"
chmod +x "${RUNTIME_BIN_DIR}/python3"
ln -sf "python3" "${RUNTIME_BIN_DIR}/python"

sync_tree "${PYTHON_STDLIB_SOURCE}/" "${RUNTIME_LIB_DIR}/python${PYTHON_VERSION}"
rm -rf "${RUNTIME_LIB_DIR}/python${PYTHON_VERSION}/site-packages"
mkdir -p "${PYTHON_SITE_PACKAGES_DIR}"

if [[ -n "${PYTHON_LIBDIR}" && -n "${PYTHON_LDLIBRARY}" && -f "${PYTHON_LIBDIR}/${PYTHON_LDLIBRARY}" ]]; then
  cp -aL "${PYTHON_LIBDIR}/${PYTHON_LDLIBRARY}" "${RUNTIME_LIB_DIR}/"
fi

install_with_pip=1
if ! "${PYTHON_SOURCE}" -m pip --version >/dev/null 2>&1; then
  install_with_pip=0
fi

if [[ ${install_with_pip} -eq 1 ]]; then
  echo "[portable-python] Installing Python requirements into runtime site-packages"
  if ! "${PYTHON_SOURCE}" -m pip install \
      --upgrade \
      --target "${PYTHON_SITE_PACKAGES_DIR}" \
      -r "${ROOT_REQUIREMENTS_FILE}" \
      -r "${AI_REQUIREMENTS_FILE}"; then
    echo "[portable-python] pip install failed; falling back to local distribution copy"
    install_with_pip=0
  fi
fi

if [[ ${install_with_pip} -eq 0 ]]; then
  "${PYTHON_SOURCE}" - "${PYTHON_SITE_PACKAGES_DIR}" "${ROOT_REQUIREMENTS_FILE}" "${AI_REQUIREMENTS_FILE}" <<'PY'
from __future__ import annotations

import importlib.metadata as metadata
import re
import shutil
import sys
from collections import deque
from pathlib import Path
from packaging.markers import default_environment
from packaging.requirements import Requirement, InvalidRequirement


def normalize_name(value: str) -> str:
    return re.sub(r"[-_.]+", "-", str(value or "")).lower().strip()


def parse_requirement(requirement_text: str) -> Requirement | None:
    text = str(requirement_text or "").strip()
    if not text:
        return None
    if text.startswith("#"):
        return None
    text = text.split("#", 1)[0].strip()
    if not text:
        return None
    lowered = text.lower()
    if lowered.startswith(("-r ", "--requirement ", "-f ", "--find-links ", "--index-url ", "--extra-index-url ", "--trusted-host ", "--no-index")):
        return None
    if text.startswith("-"):
        return None
    try:
        return Requirement(text)
    except InvalidRequirement:
        return None


def include_requirement_name(requirement: Requirement) -> bool:
    marker = requirement.marker
    if marker is None:
        return True
    env = default_environment()
    env["extra"] = ""
    try:
        return bool(marker.evaluate(env))
    except Exception:
        return False


def iter_requirement_files(requirement_file: Path):
    pending = deque([requirement_file.resolve()])
    seen_files = set()
    while pending:
        current = pending.popleft()
        if current in seen_files:
            continue
        seen_files.add(current)
        if not current.exists():
            continue
        yield current
        for raw_line in current.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            lowered = line.lower()
            include_path = ""
            if lowered.startswith("-r "):
                include_path = line[3:].strip()
            elif lowered.startswith("--requirement "):
                include_path = line[len("--requirement "):].strip()
            if include_path:
                nested = (current.parent / include_path).resolve()
                pending.append(nested)


def collect_seed_distribution_names(requirement_paths):
    names = []
    for requirement_path in requirement_paths:
        req_file = Path(requirement_path).resolve()
        for current_file in iter_requirement_files(req_file):
            for raw_line in current_file.read_text(encoding="utf-8").splitlines():
                requirement = parse_requirement(raw_line)
                if requirement and include_requirement_name(requirement):
                    names.append(requirement.name)
    return names


def find_distribution(name: str, index: dict[str, metadata.Distribution]) -> metadata.Distribution | None:
    norm = normalize_name(name)
    if not norm:
        return None
    if norm in index:
        return index[norm]
    try:
        return metadata.distribution(name)
    except metadata.PackageNotFoundError:
        return None


def copy_distribution_files(dist: metadata.Distribution, target_root: Path):
    def copy_any(source: Path, destination: Path):
        if source.is_dir():
            shutil.copytree(source, destination, dirs_exist_ok=True)
            return
        if source.is_file():
            destination.parent.mkdir(parents=True, exist_ok=True)
            if source.is_symlink():
                shutil.copy2(source.resolve(), destination)
            else:
                shutil.copy2(source, destination)

    copied = 0
    for rel in dist.files or []:
        rel_path = Path(str(rel))
        if any(part == ".." for part in rel_path.parts):
            continue
        source = Path(dist.locate_file(rel_path))
        if not source.exists() or source.is_dir():
            continue
        destination = target_root / rel_path.as_posix()
        destination.parent.mkdir(parents=True, exist_ok=True)
        if source.is_symlink():
            shutil.copy2(source.resolve(), destination)
        else:
            shutil.copy2(source, destination)
        copied += 1

    if copied == 0:
        root = Path(dist.locate_file("")).resolve()
        top_level_entries = []
        top_level_txt = dist.read_text("top_level.txt") or ""
        for line in top_level_txt.splitlines():
            entry = line.strip()
            if entry:
                top_level_entries.append(entry)
        if not top_level_entries:
            fallback_name = normalize_name(dist.metadata.get("Name", "")).replace("-", "_")
            if fallback_name:
                top_level_entries.append(fallback_name)
        for entry in sorted(set(top_level_entries)):
            candidate = root / entry
            if candidate.exists():
                copy_any(candidate, target_root / entry)
                copied += 1
        dist_path = getattr(dist, "_path", None)
        if dist_path:
            dist_path = Path(dist_path)
            if dist_path.exists():
                copy_any(dist_path, target_root / dist_path.name)
                copied += 1

    return copied


target = Path(sys.argv[1]).resolve()
requirements = [Path(arg).resolve() for arg in sys.argv[2:]]
target.mkdir(parents=True, exist_ok=True)

distribution_index = {}
for dist in metadata.distributions():
    name = normalize_name(dist.metadata.get("Name", ""))
    if name and name not in distribution_index:
        distribution_index[name] = dist

pending = deque(collect_seed_distribution_names(requirements))
seed_names = {normalize_name(name) for name in pending}
seen = set()
resolved = []
missing_seed = []
missing_optional = []

while pending:
    requested = pending.popleft()
    normalized = normalize_name(requested)
    if not normalized or normalized in seen:
        continue
    dist = find_distribution(requested, distribution_index)
    if dist is None:
        if normalized in seed_names:
            missing_seed.append(requested)
        else:
            missing_optional.append(requested)
        continue
    seen.add(normalized)
    resolved.append(dist)
    for dep_spec in dist.requires or []:
        requirement = parse_requirement(dep_spec)
        if requirement and include_requirement_name(requirement):
            pending.append(requirement.name)

files_copied = 0
resolved_names = []
for dist in resolved:
    files_copied += copy_distribution_files(dist, target)
    resolved_names.append(dist.metadata.get("Name", "unknown"))

if missing_optional:
    print("[portable-python] Warning: skipped unresolved optional dependencies:", ", ".join(sorted(set(missing_optional))), file=sys.stderr)

if missing_seed:
    print("[portable-python] Missing required distributions:", ", ".join(sorted(set(missing_seed))), file=sys.stderr)
    raise SystemExit(1)

manifest = target / ".portable-python-manifest.txt"
manifest.write_text(
    "resolved_distributions=\n" + "\n".join(sorted(set(resolved_names), key=str.lower)) + f"\nfiles_copied={files_copied}\n",
    encoding="utf-8"
)
PY
fi

declare -a probe_files=(
  "${RUNTIME_BIN_DIR}/python3"
)

while IFS= read -r so_file; do
  probe_files+=("${so_file}")
done < <(find "${RUNTIME_LIB_DIR}" -type f \( -name "*.so" -o -name "*.so.*" \))

collect_shared_libraries "${RUNTIME_SYSTEM_LIB_DIR}" "${probe_files[@]}"

{
  echo "built_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "python_source=${PYTHON_SOURCE_REAL}"
  echo "python_version=$("${RUNTIME_BIN_DIR}/python3" -c 'import sys; print(sys.version.split()[0])')"
  echo "python_stdlib_source=${PYTHON_STDLIB_SOURCE}"
  echo "bundled_shared_libs=$(find "${RUNTIME_SYSTEM_LIB_DIR}" -maxdepth 1 -type f | wc -l | tr -d ' ')"
} > "${RUNTIME_ROOT}/runtime-manifest.txt"

echo "[portable-python] Done."
