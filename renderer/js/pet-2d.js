(() => {
  const stage = document.getElementById('pet-stage');
  const hitbox = document.getElementById('pet-hitbox');
  const menu = document.getElementById('state-menu');
  const title = document.getElementById('status-title');
  const detail = document.getElementById('status-detail');
  const badge = document.getElementById('agent-badge');
  const sprite = document.getElementById('pet-sprite');
  const presentation = window.PetPresentation;

  let currentState = 'idle';
  let currentAgent = 'claude-code';
  let dragging = false;
  let lastScreenX = 0;
  let lastScreenY = 0;

  function setAgent(agent) {
    const identity = presentation.identityForAgent(agent);
    currentAgent = identity.agent;
    stage.dataset.agent = identity.agent;
    badge.textContent = identity.badge;
    if (sprite.getAttribute('src') !== identity.asset) sprite.setAttribute('src', identity.asset);
    sprite.alt = identity.alt;
  }

  function setState(nextState, payload = {}) {
    currentState = presentation.normalizeState(nextState);
    const copy = presentation.presentationForState(currentState);
    if (payload.agent) setAgent(payload.agent);
    stage.dataset.state = currentState;
    title.textContent = payload.title || copy.title;
    detail.textContent = payload.detail || copy.detail;
    stage.setAttribute('aria-label', `${badge.textContent}：${title.textContent}`);
  }

  function isInsidePet(clientX, clientY) {
    const rect = hitbox.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  }

  document.addEventListener('mousemove', (event) => {
    if (dragging) {
      const deltaX = event.screenX - lastScreenX;
      const deltaY = event.screenY - lastScreenY;
      lastScreenX = event.screenX;
      lastScreenY = event.screenY;
      window.electronAPI?.moveWindow?.(event.screenX, event.screenY, deltaX, deltaY);
      return;
    }
    const interactive = isInsidePet(event.clientX, event.clientY) || !menu.classList.contains('hidden');
    window.electronAPI?.setIgnoreMouse?.(!interactive);
  });

  hitbox.addEventListener('mousedown', (event) => {
    if (event.button !== 0) return;
    dragging = true;
    lastScreenX = event.screenX;
    lastScreenY = event.screenY;
  });

  document.addEventListener('mouseup', () => { dragging = false; });

  hitbox.addEventListener('dblclick', () => {
    setState('success', { detail: 'Pixel Agent Buddy 收到你的鼓励啦！' });
    window.setTimeout(() => setState('idle'), 1800);
  });

  document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    menu.classList.toggle('hidden');
  });

  menu.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-state]');
    if (!button) return;
    setState(button.dataset.state);
    menu.classList.add('hidden');
  });

  let latestTimestamp = 0;
  function applyAgentEvent(event) {
    if (!event) return;
    const timestamp = Number(event.timestamp) || 0;
    if (timestamp && timestamp < latestTimestamp) return;
    latestTimestamp = Math.max(latestTimestamp, timestamp);
    setState(event.state || event.event, event);
  }

  window.electronAPI?.onAgentState?.(applyAgentEvent);
  window.electronAPI?.getCurrentAgentState?.().then(applyAgentEvent).catch(() => {});

  window.pet2d = {
    setState,
    setAgent,
    getState: () => currentState,
    getAgent: () => currentAgent,
    states: Object.keys(presentation.states)
  };
  setAgent('claude-code');
  setState('idle');
})();
