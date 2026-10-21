#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${1:-/home/mamou/Desktop/v3/scripts}"
cd "$REPO_DIR"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not a git repository: $REPO_DIR" >&2
  exit 1
fi

# Prevent overlapping runs from cron.
LOCK_FILE=".git/auto-save.lock"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  exit 0
fi

if [[ -z "$(git status --porcelain)" ]]; then
  exit 0
fi

git add -A

if git diff --cached --quiet; then
  exit 0
fi

TIMESTAMP="$(date -u '+%Y-%m-%d %H:%M:%S UTC')"
BRANCH="$(git branch --show-current)"

git commit -m "auto-save: ${TIMESTAMP}" >/dev/null

if ! git push origin "$BRANCH" >/dev/null 2>&1; then
  echo "Auto-save committed locally but push failed on branch '$BRANCH' at $TIMESTAMP" >&2
  exit 0
fi

echo "Auto-saved and pushed on branch '$BRANCH' at $TIMESTAMP"
