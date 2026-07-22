const path = require('node:path');
const { uninstallHooks } = require('./hook-installer.cjs');

const root = path.resolve(__dirname, '..');
const requested = process.argv.includes('--claude') ? ['claude-code']
  : process.argv.includes('--codex') ? ['codex']
    : ['claude-code', 'codex'];

for (const result of uninstallHooks({ root, agentIds: requested })) {
  console.log(`${result.agent}: ${result.changed ? 'uninstalled' : 'not installed'} (${result.filePath})`);
}
