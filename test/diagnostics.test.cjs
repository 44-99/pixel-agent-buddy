const test = require('node:test');
const assert = require('node:assert/strict');
const { buildAgentDiagnostics, hookRunner, locateCommand } = require('../src/diagnostics.cjs');

test('locates an available CLI without assuming it is installed', () => {
  const locate = (command, args) => ({ status: 0, stdout: args[0] === 'codex' ? 'C:/bin/codex.exe\n' : '' });
  assert.equal(locateCommand('codex', { platform: 'win32', env: {}, locate }), 'C:/bin/codex.exe');
  assert.equal(locateCommand('claude', { platform: 'win32', env: {}, locate }), '');
});

test('recognizes self-contained and source Hook runners', () => {
  assert.equal(hookRunner({ command: '"Buddy.exe" --pixel-agent-buddy-hook --agent codex' }, 'codex'), 'self-contained');
  assert.equal(hookRunner({ nested: [{ command: 'node agent-event-hook.cjs --agent claude-code' }] }, 'claude-code'), 'Node runner');
  assert.equal(hookRunner({ command: 'competitor --agent codex' }, 'codex'), '');
});

test('builds a stable two-agent diagnostics view', () => {
  const result = buildAgentDiagnostics({
    detectedAgentIds: ['codex'],
    hookStatuses: [{ agent: 'codex', installed: true, valid: true, runner: 'self-contained', filePath: 'hooks.json' }],
    versions: { codex: 'codex-cli 1.2.3' }
  });
  assert.deepEqual(result.map((agent) => agent.id), ['claude-code', 'codex']);
  assert.equal(result[0].detected, false);
  assert.equal(result[1].hook.runner, 'self-contained');
});
