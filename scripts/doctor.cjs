const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { listAgentAdapters } = require('../src/agent-adapters.cjs');
const { commandVersion, hookRunner } = require('../src/diagnostics.cjs');
const { configPathFor, managedHookPath, readJsonConfig } = require('./hook-config.cjs');

function runtimePath() {
  return process.env.PIXEL_AGENT_BUDDY_RUNTIME_PATH || path.join(os.homedir(), '.pixel-agent-buddy', 'runtime.json');
}

function checkRuntime() {
  return new Promise((resolve) => {
    let runtime;
    try { runtime = JSON.parse(fs.readFileSync(runtimePath(), 'utf8')); }
    catch { resolve(false); return; }
    const request = http.get({ hostname: '127.0.0.1', port: runtime.port, path: '/health', timeout: 600 }, (response) => {
      response.resume();
      response.on('end', () => resolve(response.statusCode === 200));
    });
    request.on('timeout', () => { request.destroy(); resolve(false); });
    request.on('error', () => resolve(false));
  });
}

async function main() {
  const versions = { 'claude-code': commandVersion('claude'), codex: commandVersion('codex') };
  let failed = false;
  console.log('Pixel Agent Buddy Doctor\n');
  for (const adapter of listAgentAdapters()) {
    const configPath = configPathFor(adapter.id);
    let config;
    let configValid = true;
    try { config = readJsonConfig(configPath); }
    catch { configValid = false; config = {}; }
    const runner = configValid ? hookRunner(config, adapter.id) : '';
    console.log(`${adapter.displayName}`);
    console.log(`  CLI:    ${versions[adapter.id] || 'not found'}`);
    console.log(`  Config: ${configValid ? configPath : `invalid JSON (${configPath})`}`);
    console.log(`  Hook:   ${runner ? `installed (${runner})` : 'not installed'}`);
    console.log(`  Events: ${adapter.events.length} supported lifecycle events`);
    if (!configValid) failed = true;
  }
  console.log(`\nBundle:  ${fs.existsSync(managedHookPath()) ? managedHookPath() : 'not installed'}`);
  console.log(`Runtime: ${await checkRuntime() ? 'running' : 'not running'}`);
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
