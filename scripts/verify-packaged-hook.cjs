const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { AgentEventServer } = require('../src/event-server.cjs');

async function main() {
  const executable = path.resolve(process.argv[2] || path.join('dist', 'win-unpacked', 'Pixel Agent Buddy.exe'));
  if (!fs.existsSync(executable)) throw new Error(`Packaged executable not found: ${executable}`);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-agent-buddy-packaged-hook-'));
  const runtimeFile = path.join(tempDir, 'runtime.json');
  const previousRuntimePath = process.env.PIXEL_AGENT_BUDDY_RUNTIME_PATH;
  process.env.PIXEL_AGENT_BUDDY_RUNTIME_PATH = runtimeFile;
  let received = null;
  const server = new AgentEventServer({ onEvent: (event) => { received = event; } });

  try {
    await server.start();
    const child = spawn(executable, ['--pixel-agent-buddy-hook', '--agent', 'codex'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      env: {
        ...process.env,
        PIXEL_AGENT_BUDDY_RUNTIME_PATH: runtimeFile
      }
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.stdin.end(JSON.stringify({
      hook_event_name: 'PreToolUse',
      session_id: 'packaged-verification',
      cwd: process.cwd(),
      tool_name: 'Bash',
      tool_input: { command: 'must remain private' }
    }));

    const exitCode = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error('Packaged Hook runner timed out'));
      }, 8000);
      child.on('error', reject);
      child.on('close', (code) => {
        clearTimeout(timer);
        resolve(code);
      });
    });

    if (exitCode !== 0) {
      throw new Error(`Packaged Hook runner exited with code ${exitCode}\nstdout: ${stdout}\nstderr: ${stderr}`);
    }
    if (received?.agent !== 'codex' || received?.state !== 'working') {
      throw new Error(`Packaged Hook runner did not deliver the expected sanitized event\nstdout: ${stdout}\nstderr: ${stderr}`);
    }
    if ('tool_input' in received) throw new Error('Packaged Hook runner leaked tool_input');
    console.log(`Packaged Hook runner verified: ${executable}`);
  } finally {
    server.stop();
    if (previousRuntimePath === undefined) delete process.env.PIXEL_AGENT_BUDDY_RUNTIME_PATH;
    else process.env.PIXEL_AGENT_BUDDY_RUNTIME_PATH = previousRuntimePath;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
