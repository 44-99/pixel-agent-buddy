const path = require('path');
const { getAgentAdapter } = require('./agent-adapters.cjs');
const { presentationForState } = require('./presentation-model.cjs');

const EVENT_STATE = Object.freeze({
  SessionStart: 'idle',
  UserPromptSubmit: 'thinking',
  PreToolUse: 'working',
  PermissionRequest: 'permission',
  PostToolUse: 'working',
  PostToolUseFailure: 'error',
  SubagentStart: 'working',
  SubagentStop: 'working',
  Stop: 'success',
  StopFailure: 'error',
  SessionEnd: 'sleeping'
});

function cleanString(value, maxLength = 240) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f-\u009f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function firstString(values) {
  for (const value of values) {
    const cleaned = cleanString(value);
    if (cleaned) return cleaned;
  }
  return '';
}

function firstField(payload, fields) {
  return firstString(fields.map((field) => payload[field]));
}

function normalizeHookEvent(adapter, payload = {}) {
  const name = firstField(payload, adapter.fields.event);
  return adapter.events.includes(name) && Object.hasOwn(EVENT_STATE, name) ? name : '';
}

function detailFor(eventName, toolName, agentType) {
  if (eventName === 'PreToolUse' && toolName) return `正在使用 ${toolName}…`;
  if (eventName === 'PostToolUse' && toolName) return `${toolName} 执行完成，继续工作…`;
  if (eventName === 'PostToolUseFailure' && toolName) return `${toolName} 执行失败，需要查看终端`;
  if (eventName === 'SubagentStart') return `${agentType || '子 Agent'} 已开始工作`;
  if (eventName === 'SubagentStop') return `${agentType || '子 Agent'} 已完成工作`;
  return '';
}

function normalizeHookPayload(agentName, payload = {}) {
  const adapter = getAgentAdapter(agentName);
  if (!adapter) return null;
  const agent = adapter.id;
  const event = normalizeHookEvent(adapter, payload);
  if (!event) return null;

  const state = EVENT_STATE[event];
  const copy = presentationForState(state);
  const cwd = firstField(payload, adapter.fields.cwd);
  const toolName = firstField(payload, adapter.fields.tool);
  const agentType = firstField(payload, adapter.fields.agentType);
  const sessionId = firstField(payload, adapter.fields.session) || `${agent}:default`;

  return {
    version: 1,
    agent,
    sessionId,
    parentSessionId: firstField(payload, adapter.fields.parentSession),
    subagentId: firstField(payload, adapter.fields.subagent),
    agentType,
    event,
    state,
    cwd,
    project: cwd ? path.basename(cwd) : '',
    toolName,
    title: copy.title,
    detail: detailFor(event, toolName, agentType) || copy.detail,
    timestamp: Date.now()
  };
}

function isNormalizedEvent(value) {
  return Boolean(
    value && value.version === 1 &&
    (value.agent === 'claude-code' || value.agent === 'codex') &&
    Object.values(EVENT_STATE).includes(value.state) &&
    typeof value.sessionId === 'string' && value.sessionId.length > 0
  );
}

module.exports = { EVENT_STATE, isNormalizedEvent, normalizeHookPayload };
