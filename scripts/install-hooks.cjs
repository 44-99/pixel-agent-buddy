const path = require('path');
const { installHooks } = require('./hook-installer.cjs');

const root = path.resolve(__dirname, '..');
const requested = process.argv.includes('--claude') ? ['claude-code']
  : process.argv.includes('--codex') ? ['codex']
    : ['claude-code', 'codex'];

for (const result of installHooks({ root, agentIds: requested })) {
  console.log(`${result.agent}: ${result.changed ? 'installed' : 'already installed'} (${result.filePath})`);
}
