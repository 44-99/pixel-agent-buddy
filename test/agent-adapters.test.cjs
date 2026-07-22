const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { getAgentAdapter, listAgentAdapters } = require('../src/agent-adapters.cjs');
const { normalizeHookPayload } = require('../src/event-protocol.cjs');

test('keeps Claude Code and Codex compatibility knowledge behind two adapters', () => {
  assert.deepEqual(listAgentAdapters().map((adapter) => adapter.id), ['claude-code', 'codex']);
  assert.equal(getAgentAdapter('claude-code').configPath({ home: 'C:/home', env: {} }), path.join('C:/home', '.claude', 'settings.json'));
  assert.equal(getAgentAdapter('codex').configPath({ home: 'C:/home', env: { CODEX_HOME: 'D:/codex' } }), path.join('D:/codex', 'hooks.json'));
});
test('rejects unknown agents instead of silently treating them as Claude Code', () => {
  assert.equal(getAgentAdapter('unknown'), null);
  assert.equal(normalizeHookPayload('unknown', { hook_event_name: 'Stop' }), null);
});

test('rejects lifecycle events not supported by the selected adapter', () => {
  assert.equal(normalizeHookPayload('codex', { hook_event_name: 'SessionEnd' }), null);
  assert.equal(normalizeHookPayload('claude-code', { hook_event_name: 'SessionEnd' }).state, 'sleeping');
});
