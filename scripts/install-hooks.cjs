const path = require('path');
const { detectInstalledAgents, installHooks } = require('./hook-installer.cjs');

const root = path.resolve(__dirname, '..');
const requested = process.argv.includes('--claude') ? ['claude-code']
  : process.argv.includes('--codex') ? ['codex']
    : detectInstalledAgents();

if (!requested.length) {
  console.error('No supported Claude Code or Codex CLI installation was detected.');
  process.exit(1);
}

for (const result of installHooks({ root, agentIds: requested })) {
  console.log(`${result.agent}: ${result.changed ? 'installed' : 'already installed'} (${result.filePath})`);
}
