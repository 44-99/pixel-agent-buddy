const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, execSync, spawnSync } = require('node:child_process');
const { listAgentAdapters } = require('../src/agent-adapters.cjs');
const { configPathFor, managedHookPath, readJsonConfig } = require('./hook-config.cjs');

function commandVersion(command) {
  const locator = spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', [command], { encoding: 'utf8' });
  const candidates = String(locator.stdout || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const executable = candidates.find((candidate) => /\.(exe|cmd|bat)$/i.test(candidate)) || candidates[0];
  if (!executable) return null;
  try {
    const output = process.platform === 'win32' && /\.(cmd|bat)$/i.test(executable)
      ? execSync(`"${executable}" --version`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
      : execFileSync(executable, ['--version'], { encoding: 'utf8' });
    return String(output).trim().split(/\r?\n/)[0];
  } catch {
    return null;
  }
}

function containsManagedCommand(value, agent) {
  if (Array.isArray(value)) return value.some((entry) => containsManagedCommand(entry, agent));
  if (!value || typeof value !== 'object') return false;
  if (typeof value.command === 'string') {
    return value.command.includes('agent-event-hook.cjs') && value.command.includes(`--agent ${agent}`);
  }
  return Object.values(value).some((entry) => containsManagedCommand(entry, agent));
}

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
    const installed = configValid && containsManagedCommand(config, adapter.id);
    console.log(`${adapter.displayName}`);
    console.log(`  CLI:    ${versions[adapter.id] || 'not found'}`);
    console.log(`  Config: ${configValid ? configPath : `invalid JSON (${configPath})`}`);
    console.log(`  Hook:   ${installed ? 'installed' : 'not installed'}`);
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
