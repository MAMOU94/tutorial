#!/bin/bash
# setup_ai_env.sh - Installs AI dependencies into the system user's Python library

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AI_DIR="$PROJECT_ROOT/AI agent"
PYTHON_BIN="${PYTHON_BIN:-python3}"

echo "=== AI Environment Setup (System Python Mode) ==="
cd "$AI_DIR"

echo "Installing requirements into the system user's Python library (this may take a few minutes)..."
"$PYTHON_BIN" -m pip install --user -r requirements.txt --upgrade

echo "=== Setup Complete ==="
echo "Dependencies installed for: $PYTHON_BIN"
