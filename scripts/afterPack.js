// afterPack hook for electron-builder
// 1. Removes the SUID chrome-sandbox binary that causes AppImage launch failures.
// 2. Creates/patches a wrapper script so --no-sandbox is always passed,
//    preventing the "No usable sandbox!" Chromium fatal error.
const fs = require('fs');
const path = require('path');

exports.default = async function afterPack(context) {
  const appOutDir = context.appOutDir;

  // ── Step 1: Remove chrome-sandbox (it needs SUID root, useless in AppImage) ──
  const chromeSandbox = path.join(appOutDir, 'chrome-sandbox');
  if (fs.existsSync(chromeSandbox)) {
    console.log('[afterPack] Removing chrome-sandbox for AppImage compatibility');
    fs.unlinkSync(chromeSandbox);
  }

  // ── Step 2: Wrap the main executable to inject --no-sandbox ──────────────────
  // electron-builder places the real binary as `ngr` (or the productName).
  // We rename it to `ngr.bin` and replace it with a shell wrapper that adds --no-sandbox.
  const execName = context.packager?.executableName || 'ngr';
  const realBin = path.join(appOutDir, execName);
  const backupBin = path.join(appOutDir, `${execName}.bin`);

  if (fs.existsSync(realBin) && !fs.existsSync(backupBin)) {
    console.log(`[afterPack] Wrapping ${execName} to inject --no-sandbox`);
    fs.renameSync(realBin, backupBin);
    const wrapper = `#!/bin/bash
# NGR launcher wrapper — injects --no-sandbox to avoid Chromium sandbox errors.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$SCRIPT_DIR/${execName}.bin" --no-sandbox "$@"
`;
    fs.writeFileSync(realBin, wrapper, { mode: 0o755 });
  }
};
