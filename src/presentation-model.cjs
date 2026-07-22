(function exposePresentationModel(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PetPresentation = api;
})(typeof globalThis === 'object' ? globalThis : this, () => {
  const states = Object.freeze({
    idle: Object.freeze({ title: '准备就绪', detail: '等待新的 Claude Code / Codex 任务' }),
    thinking: Object.freeze({ title: '正在思考', detail: '分析需求与项目上下文…' }),
    working: Object.freeze({ title: '正在工作', detail: 'Agent 正在执行工具…' }),
    permission: Object.freeze({ title: '需要确认', detail: 'Agent 正在等待你的审批' }),
    success: Object.freeze({ title: '任务完成', detail: '任务已经完成，可以回来检查了' }),
    error: Object.freeze({ title: '遇到问题', detail: '任务执行失败，需要查看终端' }),
    sleeping: Object.freeze({ title: '休息中', detail: '当前没有活跃的 Agent 会话' })
  });

  const aliases = Object.freeze({
    running: 'working', tool: 'working', attention: 'permission',
    completed: 'success', failed: 'error', sleep: 'sleeping'
  });

  const identities = Object.freeze({
    'claude-code': Object.freeze({
      agent: 'claude-code', badge: 'CLAUDE CODE',
      alt: 'Claude Code 像素小螃蟹', asset: 'assets/claude-crab.png'
    }),
    codex: Object.freeze({
      agent: 'codex', badge: 'CODEX',
      alt: 'Codex 像素机械蟹', asset: 'assets/codex-crab.png'
    })
  });

  function normalizeAgent(value) {
    return String(value || '').toLowerCase() === 'codex' ? 'codex' : 'claude-code';
  }

  function normalizeState(value) {
    if (states[value]) return value;
    return aliases[value] || 'idle';
  }

  function identityForAgent(value) {
    return identities[normalizeAgent(value)];
  }

  function presentationForState(value) {
    return states[normalizeState(value)];
  }

  return { aliases, identities, states, normalizeAgent, normalizeState, identityForAgent, presentationForState };
});
