const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeHookPayload } = require('../src/event-protocol.cjs');

test('maps Claude and Codex lifecycle events without copying sensitive payload fields', () => {
  const event = normalizeHookPayload('claude-code', {
    hook_event_name: 'PreToolUse', session_id: 's1', cwd: 'C:/repo',
    tool_name: 'Bash', tool_input: { command: 'secret command' }, prompt: 'secret prompt'
  });
  assert.equal(event.state, 'working');
  assert.equal(event.toolName, 'Bash');
  assert.equal(event.project, 'repo');
  assert.equal('tool_input' in event, false);
  assert.equal('prompt' in event, false);

  const codex = normalizeHookPayload('codex', { hookEventName: 'Stop', sessionId: 'c1' });
  assert.equal(codex.agent, 'codex');
  assert.equal(codex.state, 'success');
});
test('rejects unknown hook events', () => {
  assert.equal(normalizeHookPayload('codex', { hook_event_name: 'UnknownEvent' }), null);
});
