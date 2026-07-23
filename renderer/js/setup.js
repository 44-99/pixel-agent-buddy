(() => {
  const agentList = document.getElementById('agent-list');
  const runtimeStatus = document.getElementById('runtime-status');
  const runtimeDetail = document.getElementById('runtime-detail');
  const installButton = document.getElementById('install-button');
  const refreshButton = document.getElementById('refresh-button');
  const actionMessage = document.getElementById('action-message');
  const updateButton = document.getElementById('update-button');
  const releaseButton = document.getElementById('release-button');
  const versionCopy = document.getElementById('version-copy');
  const doneButton = document.getElementById('done-button');
  let releaseUrl = '';

  function renderActivity(snapshot) {
    if (!snapshot) {
      runtimeDetail.textContent = '尚未收到 Agent 状态';
      return;
    }
    const agentName = snapshot.agent === 'codex' ? 'Codex' : 'Claude Code';
    const project = snapshot.project ? ` · ${snapshot.project}` : '';
    const time = snapshot.receivedAt || snapshot.timestamp;
    const timeCopy = time ? ` · ${new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '';
    runtimeDetail.textContent = `最近状态：${agentName} · ${snapshot.title || snapshot.state}${project}${timeCopy}`;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function line(list, label, value, title = '') {
    const term = element('dt', '', label);
    const detail = element('dd', '', value);
    if (title) detail.title = title;
    list.append(term, detail);
  }

  function renderAgent(agent) {
    const card = element('article', 'agent-card');
    card.dataset.agent = agent.id;
    const top = element('div', 'agent-top');
    top.append(element('h3', '', agent.name));
    const connected = agent.detected && agent.hook.installed && agent.hook.valid;
    top.append(element('span', `mini-pill ${connected ? 'ok' : agent.detected ? '' : 'warn'}`,
      connected ? '已连接' : agent.detected ? '待安装' : '未检测到'));
    card.append(top);

    const details = element('dl');
    line(details, 'CLI', agent.detected ? (agent.version || '已检测到') : '未安装或不在 PATH');
    line(details, 'Hook', agent.hook.installed ? `已安装 · ${agent.hook.runner || 'managed'}` : '未安装');
    line(details, '配置', agent.hook.valid ? 'JSON 有效' : 'JSON 无效', agent.hook.filePath);
    line(details, '事件', `${agent.supportedEvents} 个生命周期事件`);
    card.append(details);

    const testButton = element('button', 'test-button', `测试 ${agent.name} 动画`);
    testButton.type = 'button';
    testButton.addEventListener('click', async () => {
      testButton.disabled = true;
      actionMessage.textContent = `正在发送 ${agent.name} 测试状态…`;
      try {
        await window.electronAPI.sendTestEvent(agent.id);
        actionMessage.textContent = `${agent.name} 测试成功：桌宠应显示“任务完成”。`;
      } catch (error) {
        actionMessage.textContent = `测试失败：${error.message}`;
      } finally {
        testButton.disabled = false;
      }
    });
    card.append(testButton);
    return card;
  }

  function render(status) {
    runtimeStatus.className = `status-pill ${status.runtime.running ? 'ok' : 'error'}`;
    runtimeStatus.textContent = status.runtime.running
      ? `运行中 · 127.0.0.1:${status.runtime.port}`
      : '本地服务未运行';
    renderActivity(status.currentState);
    agentList.replaceChildren(...status.agents.map(renderAgent));
    const detected = status.agents.filter((agent) => agent.detected);
    const installed = detected.filter((agent) => agent.hook.installed && agent.hook.valid);
    installButton.disabled = detected.length === 0;
    installButton.textContent = detected.length === 0
      ? '未检测到受支持的 Agent'
      : installed.length === detected.length
        ? '重新安装 / 修复 Hooks'
        : `安装 ${detected.length} 个已检测 Agent 的 Hooks`;
    versionCopy.textContent = `当前版本 ${status.appVersion}。仅在你点击时访问 GitHub Releases，不会后台检查。`;
  }

  async function refresh() {
    refreshButton.disabled = true;
    try {
      render(await window.electronAPI.getSetupStatus());
      actionMessage.textContent = '';
    } catch (error) {
      actionMessage.textContent = `检测失败：${error.message}`;
    } finally {
      refreshButton.disabled = false;
    }
  }

  installButton.addEventListener('click', async () => {
    installButton.disabled = true;
    actionMessage.textContent = '正在安装并验证 Hooks…';
    try {
      const result = await window.electronAPI.installDetectedHooks();
      render(result.status);
      actionMessage.textContent = result.ok ? 'Hooks 已连接，可以点击卡片发送测试状态。' : 'Hooks 安装失败。';
    } catch (error) {
      actionMessage.textContent = `安装失败：${error.message}`;
    }
  });

  refreshButton.addEventListener('click', refresh);
  updateButton.addEventListener('click', async () => {
    updateButton.disabled = true;
    releaseButton.classList.add('hidden');
    versionCopy.textContent = '正在访问 GitHub Releases…';
    try {
      const result = await window.electronAPI.checkForUpdates();
      if (!result.ok) throw new Error(result.error);
      const update = result.update;
      releaseUrl = update.url;
      versionCopy.textContent = update.available
        ? `发现新版本 ${update.latestVersion}（当前 ${update.currentVersion}）。`
        : `当前 ${update.currentVersion} 已是最新版本。`;
      releaseButton.classList.toggle('hidden', !update.available || !releaseUrl);
    } catch (error) {
      versionCopy.textContent = `检查失败：${error.message}`;
    } finally {
      updateButton.disabled = false;
    }
  });
  releaseButton.addEventListener('click', () => {
    if (releaseUrl) window.electronAPI.openRelease(releaseUrl).catch(() => {});
  });
  doneButton.addEventListener('click', () => window.electronAPI.finishSetup());
  window.electronAPI.onSetupStatusChanged(render);
  window.electronAPI.onAgentState(renderActivity);
  refresh();
})();
