const fs = require('fs');
const os = require('os');
const path = require('path');
const { getAgentAdapter } = require('../src/agent-adapters.cjs');

function configPathFor(agent, home = os.homedir(), env = process.env) {
  const adapter = getAgentAdapter(agent);
  if (!adapter) throw new Error(`Unsupported agent: ${agent}`);
  return adapter.configPath({ home, env });
}

function managedHookPath(home = os.homedir()) {
  return path.join(home, '.pixel-agent-buddy', 'hooks', 'agent-event-hook.cjs');
}

function provisionHookBundle(root, home = os.homedir()) {
  const hookTarget = managedHookPath(home);
  const sourceTarget = path.join(home, '.pixel-agent-buddy', 'src');
  const protocolTarget = path.join(sourceTarget, 'event-protocol.cjs');
  const adaptersTarget = path.join(sourceTarget, 'agent-adapters.cjs');
  const presentationTarget = path.join(sourceTarget, 'presentation-model.cjs');
  fs.mkdirSync(path.dirname(hookTarget), { recursive: true });
  fs.mkdirSync(path.dirname(protocolTarget), { recursive: true });
  fs.copyFileSync(path.join(root, 'hooks', 'agent-event-hook.cjs'), hookTarget);
  fs.copyFileSync(path.join(root, 'src', 'event-protocol.cjs'), protocolTarget);
  fs.copyFileSync(path.join(root, 'src', 'agent-adapters.cjs'), adaptersTarget);
  fs.copyFileSync(path.join(root, 'src', 'presentation-model.cjs'), presentationTarget);
  return hookTarget;
}

function buildCommand(agent, nodePath, hookPath, platform = process.platform, executableMode = 'node') {
  const adapter = getAgentAdapter(agent);
  if (!adapter) throw new Error(`Unsupported agent: ${agent}`);
  return adapter.buildCommand({ nodePath, hookPath, platform, executableMode });
}

function isManagedHook(hook, agent, hookPath) {
  const command = typeof hook?.command === 'string' ? hook.command : '';
  return (command.includes('--pixel-agent-buddy-hook') && command.includes(`--agent ${agent}`)) ||
  command.includes(hookPath.replaceAll('\\', '/')) || (
    command.includes(path.basename(hookPath)) && command.includes(`--agent ${agent}`)
  );
}

function groupContainsManagedHook(group, agent, hookPath) {
  return Array.isArray(group?.hooks) && group.hooks.some((hook) => isManagedHook(hook, agent, hookPath));
}

function mergeHooks(config, { agent, command, hookPath, events }) {
  const next = structuredClone(config && typeof config === 'object' ? config : {});
  if (!next.hooks || typeof next.hooks !== 'object' || Array.isArray(next.hooks)) next.hooks = {};
  let changed = false;

  for (const event of events) {
    const groups = Array.isArray(next.hooks[event]) ? next.hooks[event] : [];
    const timeout = event === 'PermissionRequest' ? 5 : 3;
    let found = false;
    for (const group of groups) {
      if (!groupContainsManagedHook(group, agent, hookPath)) continue;
      found = true;
      for (const hook of group.hooks) {
        if (!isManagedHook(hook, agent, hookPath)) continue;
        if (hook.command !== command || hook.timeout !== timeout) {
          hook.command = command;
          hook.timeout = timeout;
          changed = true;
        }
      }
    }
    if (found) continue;
    groups.push({ hooks: [{ type: 'command', command, timeout }] });
    next.hooks[event] = groups;
    changed = true;
  }
  return { config: next, changed };
}

function removeHooks(config, { agent, hookPath }) {
  const next = structuredClone(config && typeof config === 'object' ? config : {});
  if (!next.hooks || typeof next.hooks !== 'object' || Array.isArray(next.hooks)) return { config: next, changed: false };
  let changed = false;
  for (const [event, value] of Object.entries(next.hooks)) {
    if (!Array.isArray(value)) continue;
    const groups = value
      .map((group) => {
        if (!Array.isArray(group?.hooks)) return group;
        const hooks = group.hooks.filter((hook) => !isManagedHook(hook, agent, hookPath));
        if (hooks.length !== group.hooks.length) changed = true;
        return hooks.length ? { ...group, hooks } : null;
      })
      .filter(Boolean);
    if (groups.length) next.hooks[event] = groups;
    else delete next.hooks[event];
  }
  return { config: next, changed };
}

function readJsonConfig(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, 'utf8');
  try { return JSON.parse(raw); }
  catch (error) { throw new Error(`Refusing to overwrite invalid JSON: ${filePath} (${error.message})`); }
}

function writeJsonConfig(filePath, config) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (fs.existsSync(filePath)) {
    const backup = `${filePath}.pixel-agent-buddy-backup`;
    if (!fs.existsSync(backup)) fs.copyFileSync(filePath, backup);
  }
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  fs.renameSync(temporary, filePath);
}

module.exports = {
  buildCommand,
  configPathFor,
  managedHookPath,
  mergeHooks,
  provisionHookBundle,
  readJsonConfig,
  removeHooks,
  writeJsonConfig
};
