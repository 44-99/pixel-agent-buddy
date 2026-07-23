const { execFileSync, execSync, spawnSync } = require('node:child_process');
const { listAgentAdapters } = require('./agent-adapters.cjs');

function locateCommand(command, { platform = process.platform, env = process.env, locate = spawnSync } = {}) {
  const locator = locate(platform === 'win32' ? 'where.exe' : 'which', [command], { encoding: 'utf8', env });
  const candidates = String(locator.stdout || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return candidates.find((candidate) => /\.(exe|cmd|bat)$/i.test(candidate)) || candidates[0] || '';
}

function commandVersion(command, options = {}) {
  const executable = locateCommand(command, options);
  if (!executable) return null;
  try {
    const output = (options.platform || process.platform) === 'win32' && /\.(cmd|bat)$/i.test(executable)
      ? execSync(`"${executable}" --version`, {
        encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: options.env || process.env, timeout: 3000
      })
      : execFileSync(executable, ['--version'], {
        encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: options.env || process.env, timeout: 3000
      });
    return String(output).trim().split(/\r?\n/)[0] || null;
  } catch {
    return null;
  }
}

function hookRunner(value, agent) {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const runner = hookRunner(entry, agent);
      if (runner) return runner;
    }
    return '';
  }
  if (!value || typeof value !== 'object') return '';
  if (typeof value.command === 'string' && value.command.includes(`--agent ${agent}`)) {
    if (value.command.includes('--pixel-agent-buddy-hook')) return 'self-contained';
    if (value.command.includes('agent-event-hook.cjs')) return 'Node runner';
  }
  for (const entry of Object.values(value)) {
    const runner = hookRunner(entry, agent);
    if (runner) return runner;
  }
  return '';
}

function buildAgentDiagnostics({ detectedAgentIds = [], hookStatuses = [], versions = {} } = {}) {
  const detected = new Set(detectedAgentIds);
  const hooks = new Map(hookStatuses.map((status) => [status.agent, status]));
  return listAgentAdapters().map((adapter) => {
    const hook = hooks.get(adapter.id) || { installed: false, valid: true, filePath: '' };
    return {
      id: adapter.id,
      name: adapter.displayName,
      detected: detected.has(adapter.id),
      version: versions[adapter.id] || '',
      supportedEvents: adapter.events.length,
      hook: {
        installed: Boolean(hook.installed),
        valid: hook.valid !== false,
        runner: hook.runner || '',
        filePath: hook.filePath || '',
        error: hook.error || ''
      }
    };
  });
}

module.exports = { buildAgentDiagnostics, commandVersion, hookRunner, locateCommand };
