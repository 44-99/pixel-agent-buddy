const { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, Tray } = require('electron');
const path = require('path');
const { AgentEventServer } = require('../src/event-server.cjs');
const { AgentStateStore } = require('../src/state-store.cjs');
const { SettingsStore } = require('../src/settings-store.cjs');
const { inspectHooks, installHooks, resolveNodeExecutable, uninstallHooks } = require('../scripts/hook-installer.cjs');

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) app.quit();

let mainWindow = null;
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
    skipTaskbar: false,
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
  const openAtLogin = app.isPackaged && app.getLoginItemSettings().openAtLogin;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示/隐藏', click: () => toggleWindow() },
    { label: '安装/修复 Hooks', click: () => installManagedHooks(true) },
    { label: '卸载 Hooks', click: () => uninstallManagedHooks() },
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
    { label: '退出', click: () => app.quit() }
  ]));
  tray.on('click', () => toggleWindow());
}

function projectRoot() {
  return path.join(__dirname, '..');
}

async function installManagedHooks(showResult = false) {
  try {
    const nodePath = resolveNodeExecutable();
    if (!nodePath) throw new Error('未找到 Node.js。请先安装 Node.js 20+，或设置 PIXEL_AGENT_BUDDY_NODE_PATH。');
    const results = installHooks({ root: projectRoot(), nodePath });
    if (showResult) {
      const changed = results.filter((result) => result.changed).map((result) => result.agent);
      await dialog.showMessageBox({
        type: 'info',
        title: 'Pixel Agent Buddy',
        message: changed.length ? 'Hooks 已安装' : 'Hooks 已经是最新状态',
        detail: results.map((result) => `${result.agent}: ${result.filePath}`).join('\n')
      });
    }
    return true;
  } catch (error) {
    await dialog.showMessageBox({ type: 'error', title: 'Hooks 安装失败', message: error.message });
    return false;
  }
}

async function uninstallManagedHooks() {
  try {
    const results = uninstallHooks({ root: projectRoot() });
    await dialog.showMessageBox({
      type: 'info', title: 'Pixel Agent Buddy', message: '本项目管理的 Hooks 已卸载',
      detail: results.map((result) => `${result.agent}: ${result.changed ? 'removed' : 'not installed'}`).join('\n')
    });
  } catch (error) {
    await dialog.showMessageBox({ type: 'error', title: 'Hooks 卸载失败', message: error.message });
  }
}

async function offerHookInstallation() {
  const settings = settingsStore.current();
  const statuses = inspectHooks();
  if (settings.hooksPrompted || statuses.every((status) => status.installed)) return;
  settingsStore.update({ hooksPrompted: true });
  const result = await dialog.showMessageBox({
    type: 'question',
    title: '连接 Claude Code 和 Codex',
    message: '是否安装本地状态 Hooks？',
    detail: 'Hooks 只发送 Agent、会话 ID、生命周期状态、项目名、工具名和时间戳；不会发送 Prompt、代码、Transcript 或工具输入输出。可以随时从托盘卸载。',
    buttons: ['安装 Hooks', '暂不安装'],
    defaultId: 0,
    cancelId: 1,
    noLink: true
  });
  if (result.response === 0) await installManagedHooks(true);
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
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('agent-state', snapshot);
  if (snapshot.state === 'permission' || snapshot.state === 'success' || snapshot.state === 'error') {
    if (!mainWindow.isVisible()) mainWindow.showInactive();
  }
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
  await offerHookInstallation();
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

ipcMain.on('hide-window', () => mainWindow?.hide());
ipcMain.on('quit-app', () => app.quit());
ipcMain.handle('get-current-agent-state', () => stateStore.current());
