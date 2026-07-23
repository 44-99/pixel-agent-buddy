const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow, ipcMain } = require('electron');

const root = path.join(__dirname, '..');
const outputPath = path.join(root, 'docs', 'setup-and-diagnostics.png');
const websiteOutputPath = path.join(root, 'website', 'assets', 'setup-and-diagnostics.png');
const mockStatus = {
  appVersion: require('../package.json').version,
  packaged: true,
  runtime: { running: true, port: 23821 },
  currentState: null,
  agents: [
    {
      id: 'claude-code', name: 'Claude Code', detected: true, version: 'Claude Code 2.1.202', supportedEvents: 11,
      hook: { installed: true, valid: true, runner: 'self-contained', filePath: 'C:/Users/you/.claude/settings.json', error: '' }
    },
    {
      id: 'codex', name: 'Codex', detected: true, version: 'codex-cli 0.145.0', supportedEvents: 10,
      hook: { installed: true, valid: true, runner: 'self-contained', filePath: 'C:/Users/you/.codex/hooks.json', error: '' }
    }
  ]
};

ipcMain.handle('setup:get-status', () => mockStatus);
ipcMain.handle('setup:install-hooks', () => ({ ok: true, status: mockStatus }));
ipcMain.handle('setup:test-event', () => null);
ipcMain.handle('setup:check-updates', () => ({ ok: true, update: { currentVersion: mockStatus.appVersion, available: false } }));
ipcMain.handle('setup:open-release', () => true);

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    width: 720,
    height: 690,
    show: false,
    backgroundColor: '#f7f3eb',
    webPreferences: { preload: path.join(root, 'electron', 'preload.cjs'), contextIsolation: true }
  });
  try {
    await window.loadFile(path.join(root, 'renderer', 'setup.html'));
    await window.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    const png = (await window.webContents.capturePage()).toPNG();
    fs.writeFileSync(outputPath, png);
    fs.mkdirSync(path.dirname(websiteOutputPath), { recursive: true });
    fs.writeFileSync(websiteOutputPath, png);
    console.log(`Generated setup-and-diagnostics.png (${png.length} bytes)`);
  } finally {
    window.destroy();
    app.quit();
  }
}).catch((error) => {
  console.error(error);
  app.exit(1);
});
