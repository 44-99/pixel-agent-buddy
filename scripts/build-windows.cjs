const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const target = process.argv[2];
if (!['nsis', 'portable'].includes(target)) {
  console.error('Usage: node scripts/build-windows.cjs <nsis|portable>');
  process.exit(1);
}

const builderCli = require.resolve('electron-builder/out/cli/cli.js');
const args = [builderCli, '--win', target, '--publish', 'never'];
const localElectronDist = path.join(__dirname, '..', 'node_modules', 'electron', 'dist');

// Reuse an installed Electron binary when available. Fresh CI installs may not
// contain one, in which case electron-builder downloads and caches its own copy.
if (fs.existsSync(localElectronDist)) {
  args.push(`--config.electronDist=${localElectronDist}`);
}

const result = spawnSync(process.execPath, args, {
  cwd: path.join(__dirname, '..'),
  env: process.env,
  stdio: 'inherit'
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
