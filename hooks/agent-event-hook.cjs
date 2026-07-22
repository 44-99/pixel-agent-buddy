const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { normalizeHookPayload } = require('../src/event-protocol.cjs');

const MAX_STDIN_BYTES = 1024 * 1024;
const POST_TIMEOUT_MS = 450;

function agentFromArgs(argv) {
  const index = argv.indexOf('--agent');
  return index >= 0 ? argv[index + 1] : '';
}

function runtimePath() {
  return process.env.PIXEL_AGENT_BUDDY_RUNTIME_PATH || path.join(os.homedir(), '.pixel-agent-buddy', 'runtime.json');
}

function readStdin() {
  return new Promise((resolve) => {
    let body = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      if (body.length < MAX_STDIN_BYTES) body += chunk;
    });
    process.stdin.on('end', () => resolve(body));
    process.stdin.on('error', () => resolve(''));
  });
}

function postEvent(runtime, event) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(event);
    const req = http.request({
      hostname: '127.0.0.1',
      port: runtime.port,
      path: '/event',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${runtime.token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: POST_TIMEOUT_MS
    }, (res) => {
      res.resume();
      res.on('end', resolve);
    });
    req.on('timeout', () => { req.destroy(); resolve(); });
    req.on('error', resolve);
    req.end(payload);
  });
}

async function main() {
  try {
    const agent = agentFromArgs(process.argv);
    if (agent !== 'claude-code' && agent !== 'codex') return;
    const raw = await readStdin();
    const payload = JSON.parse(raw || '{}');
    const event = normalizeHookPayload(agent, payload);
    if (!event) return;
    const runtime = JSON.parse(fs.readFileSync(runtimePath(), 'utf8'));
    if (!Number.isInteger(runtime.port) || typeof runtime.token !== 'string') return;
    await postEvent(runtime, event);
  } catch {}
}

main();
