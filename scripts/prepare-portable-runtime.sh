#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"${SCRIPT_DIR}/prepare-portable-r-runtime.sh"
"${SCRIPT_DIR}/prepare-portable-python-runtime.sh"
