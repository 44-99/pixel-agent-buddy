const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { getAgentAdapter, listAgentAdapters } = require('../src/agent-adapters.cjs');
const {
  buildCommand, configPathFor, managedHookPath, mergeHooks,
  readJsonConfig, removeHooks, writeJsonConfig
} = require('./hook-config.cjs');
const { hookRunner } = require('../src/diagnostics.cjs');

const BUNDLE_FILES = Object.freeze([
  ['hooks/agent-event-hook.cjs', 'hooks/agent-event-hook.cjs'],
  ['src/event-protocol.cjs', 'src/event-protocol.cjs'],
  ['src/agent-adapters.cjs', 'src/agent-adapters.cjs'],
  ['src/presentation-model.cjs', 'src/presentation-model.cjs']
]);

function resolveAgents(agentIds) {
  const requested = agentIds?.length ? agentIds : listAgentAdapters().map((adapter) => adapter.id);
  return requested.map((id) => {
    const adapter = getAgentAdapter(id);
    if (!adapter) throw new Error(`Unsupported agent: ${id}`);
    return adapter;
  });
}

function resolveNodeExecutable({ platform = process.platform, env = process.env, currentExecutable = process.execPath } = {}) {
  if (env.PIXEL_AGENT_BUDDY_NODE_PATH && fs.existsSync(env.PIXEL_AGENT_BUDDY_NODE_PATH)) {
    return env.PIXEL_AGENT_BUDDY_NODE_PATH;
  }
  if (/^node(?:\.exe)?$/i.test(path.basename(currentExecutable))) return currentExecutable;
  const command = platform === 'win32' ? 'where.exe' : 'which';
  const result = spawnSync(command, ['node'], { encoding: 'utf8', env });
  const candidate = String(result.stdout || '').split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  return candidate && fs.existsSync(candidate) ? candidate : null;
}

function detectInstalledAgents({ platform = process.platform, env = process.env, locate = spawnSync } = {}) {
  const command = platform === 'win32' ? 'where.exe' : 'which';
  return listAgentAdapters()
    .filter((adapter) => {
      const result = locate(command, [adapter.cliCommand], { encoding: 'utf8', env });
      return result.status === 0 && String(result.stdout || '').trim().length > 0;
    })
    .map((adapter) => adapter.id);
}

function inspectHooks({ home = os.homedir(), env = process.env, agentIds } = {}) {
  return resolveAgents(agentIds).map((adapter) => {
    const filePath = configPathFor(adapter.id, home, env);
    try {
      const config = readJsonConfig(filePath);
      const serialized = JSON.stringify(config);
      const installed = serialized.includes(`--agent ${adapter.id}`) && (
        serialized.includes('agent-event-hook.cjs') || serialized.includes('--pixel-agent-buddy-hook')
      );
      return { agent: adapter.id, filePath, installed, valid: true, runner: hookRunner(config, adapter.id) };
    } catch (error) {
      return { agent: adapter.id, filePath, installed: false, valid: false, error: error.message };
    }
  });
}

function snapshotFile(filePath) {
  return fs.existsSync(filePath)
    ? { filePath, existed: true, content: fs.readFileSync(filePath) }
    : { filePath, existed: false, content: null };
}

function writeBufferAtomic(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporary, content);
  fs.renameSync(temporary, filePath);
}

function restoreSnapshots(snapshots) {
  for (const snapshot of [...snapshots].reverse()) {
    try {
      if (snapshot.existed) writeBufferAtomic(snapshot.filePath, snapshot.content);
      else if (fs.existsSync(snapshot.filePath)) fs.unlinkSync(snapshot.filePath);
    } catch {}
  }
}

function bundleTargets(root, home) {
  const managedRoot = path.dirname(path.dirname(managedHookPath(home)));
  return BUNDLE_FILES.map(([source, target]) => ({
    source: path.join(root, ...source.split('/')),
    target: path.join(managedRoot, ...target.split('/'))
  }));
}

function writeBundle(root, home) {
  for (const file of bundleTargets(root, home)) {
    writeBufferAtomic(file.target, fs.readFileSync(file.source));
  }
}

function planConfigChanges({ adapters, home, env, hookPath, nodePath, platform, executableMode, remove }) {
  return adapters.map((adapter) => {
    const filePath = configPathFor(adapter.id, home, env);
    const current = readJsonConfig(filePath);
    const result = remove
      ? removeHooks(current, { agent: adapter.id, hookPath })
      : mergeHooks(current, {
        agent: adapter.id,
        command: buildCommand(adapter.id, nodePath, hookPath, platform, executableMode),
        hookPath,
        events: adapter.events
      });
    return { agent: adapter.id, filePath, ...result };
  });
}

function applyHookTransaction({
  root, home = os.homedir(), env = process.env, agentIds,
  nodePath = process.execPath, platform = process.platform,
  executableMode = 'node', remove = false
}) {
  const adapters = resolveAgents(agentIds);
  const hookPath = managedHookPath(home);

  // Reading every config first is intentional: invalid JSON must cause zero writes.
  const plans = planConfigChanges({ adapters, home, env, hookPath, nodePath, platform, executableMode, remove });
  const changedPlans = plans.filter((plan) => plan.changed);
  const trackedPaths = new Set();
  for (const plan of changedPlans) {
    trackedPaths.add(plan.filePath);
    trackedPaths.add(`${plan.filePath}.pixel-agent-buddy-backup`);
  }
  if (!remove) for (const file of bundleTargets(root, home)) trackedPaths.add(file.target);
  const snapshots = [...trackedPaths].map(snapshotFile);

  try {
    if (!remove) writeBundle(root, home);
    for (const plan of changedPlans) writeJsonConfig(plan.filePath, plan.config);
  } catch (error) {
    restoreSnapshots(snapshots);
    throw error;
  }

  return plans.map((plan) => ({ agent: plan.agent, filePath: plan.filePath, changed: plan.changed }));
}

function installHooks(options) {
  return applyHookTransaction({ ...options, remove: false });
}

function uninstallHooks(options) {
  return applyHookTransaction({ ...options, remove: true });
}

module.exports = {
  BUNDLE_FILES,
  detectInstalledAgents,
  inspectHooks,
  installHooks,
  resolveNodeExecutable,
  uninstallHooks
};
