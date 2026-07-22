const test = require('node:test');
const assert = require('node:assert/strict');
const { buildCommand, mergeHooks, removeHooks } = require('../scripts/hook-config.cjs');

const hookPath = 'C:/repo/hooks/agent-event-hook.cjs';
const command = buildCommand('codex', 'C:/Program Files/node.exe', hookPath, 'win32');

test('uses the shell format required by each Windows CLI', () => {
  assert.match(command, /^& /);
  const claude = buildCommand('claude-code', 'C:\\Program Files\\node.exe', 'C:\\repo\\hook.cjs', 'win32');
  assert.doesNotMatch(claude, /^& /);
  assert.match(claude, /C:\/Program Files\/node\.exe/);
});

test('hook merge preserves existing hooks and is idempotent', () => {
  const existing = { hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'existing-hook' }] }] } };
  const first = mergeHooks(existing, { agent: 'codex', command, hookPath, events: ['SessionStart', 'Stop'] });
  assert.equal(first.changed, true);
  assert.equal(first.config.hooks.SessionStart.length, 2);
  assert.equal(first.config.hooks.SessionStart[0].hooks[0].command, 'existing-hook');
  const second = mergeHooks(first.config, { agent: 'codex', command, hookPath, events: ['SessionStart', 'Stop'] });
  assert.equal(second.changed, false);
});

test('uninstall removes only managed hooks', () => {
  const installed = mergeHooks({ hooks: { Stop: [{ hooks: [{ type: 'command', command: 'keep-me' }] }] } }, {
    agent: 'codex', command, hookPath, events: ['Stop']
  }).config;
  const result = removeHooks(installed, { agent: 'codex', hookPath });
  assert.equal(result.changed, true);
  assert.equal(result.config.hooks.Stop.length, 1);
  assert.equal(result.config.hooks.Stop[0].hooks[0].command, 'keep-me');
});
