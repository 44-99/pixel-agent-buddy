const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { AgentEventServer } = require('../src/event-server.cjs');

test('hook posts a sanitized event to the authenticated local server', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-agent-buddy-event-test-'));
  const runtimeFile = path.join(tempDir, 'runtime.json');
  const previousRuntimePath = process.env.PIXEL_AGENT_BUDDY_RUNTIME_PATH;
  process.env.PIXEL_AGENT_BUDDY_RUNTIME_PATH = runtimeFile;
  let received = null;
  const server = new AgentEventServer({ onEvent: (event) => { received = event; } });
  await server.start();

  try {
    const hookPath = path.resolve(__dirname, '..', 'hooks', 'agent-event-hook.cjs');
    const child = spawn(process.execPath, [hookPath, '--agent', 'codex'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PIXEL_AGENT_BUDDY_RUNTIME_PATH: runtimeFile }
    });
    let stdout = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stdin.end(JSON.stringify({
        hook_event_name: 'PreToolUse', session_id: 'test-session',
        cwd: 'C:/safe-project', tool_name: 'Bash',
        tool_input: { command: 'must not leave the hook process' }
      }));
    const exitCode = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { child.kill(); reject(new Error('hook timed out')); }, 3000);
      child.on('error', reject);
      child.on('close', (code) => { clearTimeout(timer); resolve(code); });
    });
    assert.equal(exitCode, 0);
    assert.equal(stdout, '');
    assert.equal(received?.agent, 'codex');
    assert.equal(received?.state, 'working');
    assert.equal(received?.toolName, 'Bash');
    assert.equal('tool_input' in received, false);
  } finally {
    server.stop();
    if (previousRuntimePath === undefined) delete process.env.PIXEL_AGENT_BUDDY_RUNTIME_PATH;
    else process.env.PIXEL_AGENT_BUDDY_RUNTIME_PATH = previousRuntimePath;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
