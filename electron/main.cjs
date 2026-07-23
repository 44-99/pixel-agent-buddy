const { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, net, shell, Tray } = require('electron');
const path = require('path');
const { AgentEventServer } = require('../src/event-server.cjs');
const { AgentStateStore } = require('../src/state-store.cjs');
const { SettingsStore } = require('../src/settings-store.cjs');
const { buildAgentDiagnostics, commandVersion } = require('../src/diagnostics.cjs');
const { normalizeHookPayload } = require('../src/event-protocol.cjs');
const { summarizeUpdate } = require('../src/update-check.cjs');
const {
  detectInstalledAgents, inspectHooks, installHooks, resolveNodeExecutable, uninstallHooks
} = require('../scripts/hook-installer.cjs');

const HOOK_RUNNER_FLAG = '--pixel-agent-buddy-hook';

if (process.argv.includes(HOOK_RUNNER_FLAG)) {
  const { main: runHook } = require('../hooks/agent-event-hook.cjs');
  runHook(process.argv).finally(() => app.exit(0));
} else {
  startDesktopApp();
}

function startDesktopApp() {
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) app.quit();

let mainWindow = null;
let setupWindow = null;
let tray = null;
let eventServer = null;
let settingsStore = null;
let positionSaveTimer = null;

const stateStore = new AgentStateStore();

function createWindow() {
  const position = settingsStore?.current().windowPosition;
  mainWindow = new BrowserWindow({
    width: 300,
    height: 300,
    transparent: true,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    ...(position || {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: process.env.NODE_ENV !== 'production'
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', '2d.html'));
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('moved', () => {
    clearTimeout(positionSaveTimer);
    positionSaveTimer = setTimeout(() => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      const { x, y } = mainWindow.getBounds();
      settingsStore?.update({ windowPosition: { x, y } });
    }, 250);
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

function createTray() {
  const iconPath = path.join(__dirname, '..', 'renderer', 'assets', 'claude-crab.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 32, height: 32 });
  tray = new Tray(icon);
  tray.setToolTip('Pixel Agent Buddy');
  refreshTrayMenu();
  tray.on('click', () => toggleWindow());
}

function createSetupWindow() {
  if (setupWindow && !setupWindow.isDestroyed()) {
    setupWindow.show();
    setupWindow.focus();
    return setupWindow;
  }
  setupWindow = new BrowserWindow({
    width: 720,
    height: 690,
    minWidth: 640,
    minHeight: 600,
    title: 'Pixel Agent Buddy · 设置与诊断',
    autoHideMenuBar: true,
    backgroundColor: '#f7f3eb',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: process.env.NODE_ENV !== 'production'
    }
  });
  setupWindow.loadFile(path.join(__dirname, '..', 'renderer', 'setup.html'));
  setupWindow.once('ready-to-show', () => setupWindow?.show());
  setupWindow.on('closed', () => {
    setupWindow = null;
    settingsStore?.update({ setupCompleted: true });
  });
  return setupWindow;
}

function hooksMenuLabel() {
  const names = { 'claude-code': 'Claude', codex: 'Codex' };
  const status = inspectHooks().map((item) => `${names[item.agent] || item.agent} ${item.installed ? '✓' : '○'}`);
  return `Hooks（${status.join(' · ')}）`;
}

function appMenuTemplate(source) {
  const openAtLogin = app.isPackaged && app.getLoginItemSettings().openAtLogin;
  return [
    { label: '设置与诊断', click: () => createSetupWindow() },
    {
      label: hooksMenuLabel(),
      submenu: [
        { label: '安装/修复已检测 Agent', click: () => installManagedHooks(true) },
        { label: '卸载', click: () => uninstallManagedHooks() }
      ]
    },
    {
      label: '开机启动',
      type: 'checkbox',
      checked: openAtLogin,
      enabled: app.isPackaged,
      click: (item) => {
        app.setLoginItemSettings({ openAtLogin: item.checked, path: process.execPath });
        settingsStore?.update({ startAtLogin: item.checked });
      }
    },
    { type: 'separator' },
    source === 'tray'
      ? { label: '显示/隐藏宠物', click: () => toggleWindow() }
      : { label: '隐藏宠物', click: () => mainWindow?.hide() },
    { label: '退出', click: () => app.quit() }
  ];
}

function refreshTrayMenu() {
  tray?.setContextMenu(Menu.buildFromTemplate(appMenuTemplate('tray')));
}

function showPetMenu() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  Menu.buildFromTemplate(appMenuTemplate('pet')).popup({ window: mainWindow });
}

function sendToSetup(channel, payload) {
  if (!setupWindow || setupWindow.isDestroyed() || setupWindow.webContents.isDestroyed()) return;
  setupWindow.webContents.send(channel, payload);
}

function projectRoot() {
  return path.join(__dirname, '..');
}

function repairableAgentIds() {
  const detected = detectInstalledAgents();
  const installed = inspectHooks().filter((status) => status.installed).map((status) => status.agent);
  return [...new Set([...detected, ...installed])];
}

async function installManagedHooks(showResult = false, requestedAgentIds) {
  try {
    const agentIds = requestedAgentIds?.length ? requestedAgentIds : repairableAgentIds();
    if (!agentIds.length) throw new Error('未检测到 Claude Code 或 Codex CLI。请先安装至少一个受支持的 Agent。');
    const executableMode = app.isPackaged ? 'app' : 'node';
    const nodePath = app.isPackaged ? process.execPath : resolveNodeExecutable();
    if (!nodePath) throw new Error('未找到 Node.js。请先安装 Node.js 20+，或设置 PIXEL_AGENT_BUDDY_NODE_PATH。');
    const results = installHooks({ root: projectRoot(), nodePath, executableMode, agentIds });
    if (showResult) {
      const changed = results.filter((result) => result.changed).map((result) => result.agent);
      await dialog.showMessageBox({
        type: 'info',
        title: 'Pixel Agent Buddy',
        message: changed.length ? 'Hooks 已安装' : 'Hooks 已经是最新状态',
        detail: [
          ...results.map((result) => `${result.agent}: ${result.filePath}`),
          ...(results.some((result) => result.agent === 'codex')
            ? ['Codex 首次使用新命令时可能要求在 /hooks 中确认信任。']
            : [])
        ].join('\n')
      });
    }
    refreshTrayMenu();
    sendToSetup('setup-status-changed', buildSetupStatus());
    return true;
  } catch (error) {
    await dialog.showMessageBox({ type: 'error', title: 'Hooks 安装失败', message: error.message });
    return false;
  }
}

async function repairInstalledHooks() {
  const installedAgentIds = inspectHooks()
    .filter((status) => status.installed)
    .map((status) => status.agent);
  if (installedAgentIds.length) await installManagedHooks(false, installedAgentIds);
}

async function uninstallManagedHooks() {
  try {
    const confirmation = await dialog.showMessageBox({
      type: 'warning',
      title: '卸载 Pixel Agent Buddy Hooks',
      message: '确定停止接收 Claude Code 和 Codex 状态吗？',
      detail: '只会移除 Pixel Agent Buddy 管理的条目，其他工具的 Hooks 不受影响。',
      buttons: ['卸载', '取消'],
      defaultId: 1,
      cancelId: 1,
      noLink: true
    });
    if (confirmation.response !== 0) return false;
    const results = uninstallHooks({ root: projectRoot() });
    refreshTrayMenu();
    await dialog.showMessageBox({
      type: 'info', title: 'Pixel Agent Buddy', message: '本项目管理的 Hooks 已卸载',
      detail: results.map((result) => `${result.agent}: ${result.changed ? 'removed' : 'not installed'}`).join('\n')
    });
    return true;
  } catch (error) {
    await dialog.showMessageBox({ type: 'error', title: 'Hooks 卸载失败', message: error.message });
    return false;
  }
}

function toggleWindow() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) mainWindow.hide();
  else {
    mainWindow.show();
    mainWindow.setAlwaysOnTop(true);
  }
}

function forwardState(snapshot) {
  sendToSetup('agent-state', snapshot);
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('agent-state', snapshot);
  if (snapshot && (snapshot.state === 'permission' || snapshot.state === 'success' || snapshot.state === 'error')) {
    if (!mainWindow.isVisible()) mainWindow.showInactive();
  }
}

function buildSetupStatus() {
  const detectedAgentIds = detectInstalledAgents();
  const hookStatuses = inspectHooks();
  const versions = Object.fromEntries(detectedAgentIds.map((agent) => [
    agent,
    commandVersion(agent === 'claude-code' ? 'claude' : agent)
  ]));
  return {
    appVersion: app.getVersion(),
    packaged: app.isPackaged,
    runtime: { running: Boolean(eventServer?.server), port: eventServer?.port || null },
    agents: buildAgentDiagnostics({ detectedAgentIds, hookStatuses, versions }),
    currentState: stateStore.current()
  };
}

async function checkForUpdates() {
  const response = await net.fetch('https://api.github.com/repos/44-99/pixel-agent-buddy/releases?per_page=10', {
    cache: 'no-store',
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': `Pixel-Agent-Buddy/${app.getVersion()}`
    }
  });
  if (!response.ok) throw new Error(`GitHub 返回 HTTP ${response.status}`);
  const releases = await response.json();
  return summarizeUpdate(app.getVersion(), releases);
}

stateStore.on('state', forwardState);

app.on('second-instance', () => {
  if (!mainWindow) return;
  mainWindow.show();
  mainWindow.focus();
});

app.whenReady().then(async () => {
  settingsStore = new SettingsStore(path.join(app.getPath('userData'), 'settings.json'));
  eventServer = new AgentEventServer({
    onEvent: (event) => stateStore.apply(event),
    getState: () => stateStore.current()
  });
  await eventServer.start();
  createWindow();
  createTray();
  await repairInstalledHooks();
  if (!settingsStore.current().setupCompleted) createSetupWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', (event) => {
  if (process.platform === 'darwin') return;
  event.preventDefault();
  mainWindow?.hide();
});

app.on('before-quit', () => {
  clearTimeout(positionSaveTimer);
  stateStore.dispose();
  eventServer?.stop();
  tray?.destroy();
});

ipcMain.on('move-window', (event, deltaX, deltaY) => {
  if (!mainWindow || !Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return;
  const bounds = mainWindow.getBounds();
  mainWindow.setPosition(Math.round(bounds.x + deltaX), Math.round(bounds.y + deltaY));
});

ipcMain.on('set-ignore-mouse', (event, ignore) => {
  mainWindow?.setIgnoreMouseEvents(Boolean(ignore), { forward: true });
});

ipcMain.on('show-pet-menu', () => showPetMenu());
ipcMain.handle('get-current-agent-state', () => stateStore.current());
ipcMain.handle('setup:get-status', () => buildSetupStatus());
ipcMain.handle('setup:install-hooks', async () => {
  const detected = detectInstalledAgents();
  if (!detected.length) return { ok: false, status: buildSetupStatus() };
  const ok = await installManagedHooks(false, detected);
  if (ok) settingsStore?.update({ hooksPrompted: true, setupCompleted: true });
  return { ok, status: buildSetupStatus() };
});
ipcMain.handle('setup:test-event', (event, agent) => {
  if (agent !== 'claude-code' && agent !== 'codex') throw new Error('不支持的 Agent');
  const normalized = normalizeHookPayload(agent, {
    hook_event_name: 'Stop',
    session_id: `pixel-agent-buddy-test-${Date.now()}`,
    cwd: projectRoot()
  });
  stateStore.apply(normalized);
  return stateStore.current();
});
ipcMain.handle('setup:check-updates', async () => {
  try {
    return { ok: true, update: await checkForUpdates() };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});
ipcMain.handle('setup:open-release', async (event, url) => {
  if (!/^https:\/\/github\.com\/44-99\/pixel-agent-buddy\/releases(?:\/|$)/.test(String(url || ''))) {
    throw new Error('无效的 Release 地址');
  }
  await shell.openExternal(url);
  return true;
});
ipcMain.on('setup:finish', () => {
  settingsStore?.update({ setupCompleted: true });
  setupWindow?.close();
});
}
