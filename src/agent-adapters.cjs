const path = require('node:path');

const AGENT_ADAPTERS = Object.freeze({
  'claude-code': Object.freeze({
    id: 'claude-code',
    displayName: 'Claude Code',
    cliCommand: 'claude',
    events: Object.freeze([
      'SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PermissionRequest',
      'PostToolUse', 'PostToolUseFailure', 'SubagentStart', 'SubagentStop',
      'Stop', 'StopFailure', 'SessionEnd'
    ]),
    fields: Object.freeze({
      event: Object.freeze(['hook_event_name', 'hookEventName', 'event']),
      session: Object.freeze(['session_id', 'sessionId', 'transcript_path']),
      parentSession: Object.freeze(['parent_session_id', 'parentSessionId']),
      subagent: Object.freeze(['agent_id', 'agentId']),
      agentType: Object.freeze(['agent_type', 'agentType']),
      cwd: Object.freeze(['cwd', 'workspace_dir', 'workspaceDir']),
      tool: Object.freeze(['tool_name', 'toolName', 'tool'])
    }),
    configPath({ home }) {
      return path.join(home, '.claude', 'settings.json');
    },
    buildCommand({ nodePath, hookPath, platform, executableMode = 'node' }) {
      const normalize = (value) => platform === 'win32' ? String(value).replaceAll('\\', '/') : String(value);
      const args = executableMode === 'app'
        ? '--pixel-agent-buddy-hook --agent claude-code'
        : `${quoteCommand(normalize(hookPath))} --agent claude-code`;
      return `${quoteCommand(normalize(nodePath))} ${args}`;
    }
  }),
  codex: Object.freeze({
    id: 'codex',
    displayName: 'Codex',
    cliCommand: 'codex',
    events: Object.freeze([
      'SessionStart', 'UserPromptSubmit', 'PreToolUse',
      'PermissionRequest', 'PostToolUse', 'SubagentStart', 'SubagentStop',
      'PreCompact', 'PostCompact', 'Stop'
    ]),
    fields: Object.freeze({
      event: Object.freeze(['hook_event_name', 'hookEventName', 'event']),
      session: Object.freeze(['session_id', 'sessionId', 'conversation_id', 'thread_id']),
      parentSession: Object.freeze(['parent_session_id', 'parentSessionId']),
      subagent: Object.freeze(['agent_id', 'agentId']),
      agentType: Object.freeze(['agent_type', 'agentType']),
      cwd: Object.freeze(['cwd', 'workspace_dir', 'workspaceDir']),
      tool: Object.freeze(['tool_name', 'toolName', 'tool'])
    }),
    configPath({ home, env }) {
      return path.join(env.CODEX_HOME || path.join(home, '.codex'), 'hooks.json');
    },
    buildCommand({ nodePath, hookPath, platform, executableMode = 'node' }) {
      const args = executableMode === 'app'
        ? '--pixel-agent-buddy-hook --agent codex'
        : `${quoteCommand(hookPath)} --agent codex`;
      const command = `${quoteCommand(nodePath)} ${args}`;
      return platform === 'win32' ? `& ${command}` : command;
    }
  })
});

function quoteCommand(value) {
  return `"${String(value).replaceAll('"', '\\"')}"`;
}

function getAgentAdapter(value) {
  return AGENT_ADAPTERS[String(value || '').toLowerCase()] || null;
}

function listAgentAdapters() {
  return Object.values(AGENT_ADAPTERS);
}

module.exports = { AGENT_ADAPTERS, getAgentAdapter, listAgentAdapters };
