const path = require('node:path');

const AGENT_ADAPTERS = Object.freeze({
  'claude-code': Object.freeze({
    id: 'claude-code',
    displayName: 'Claude Code',
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
    buildCommand({ nodePath, hookPath, platform }) {
      const normalize = (value) => platform === 'win32' ? String(value).replaceAll('\\', '/') : String(value);
      return `${quoteCommand(normalize(nodePath))} ${quoteCommand(normalize(hookPath))} --agent claude-code`;
    }
  }),
  codex: Object.freeze({
    id: 'codex',
    displayName: 'Codex',
    events: Object.freeze([
      'SessionStart', 'UserPromptSubmit', 'PreToolUse',
      'PermissionRequest', 'PostToolUse', 'Stop'
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
    buildCommand({ nodePath, hookPath, platform }) {
      const command = `${quoteCommand(nodePath)} ${quoteCommand(hookPath)} --agent codex`;
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
