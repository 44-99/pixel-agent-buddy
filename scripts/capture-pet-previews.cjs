const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow } = require('electron');

const root = path.join(__dirname, '..');
const outputDir = path.join(root, 'docs');

async function settle(window) {
  await window.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
}

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    width: 300,
    height: 300,
    show: false,
    frame: false,
    transparent: true
  });
  window.setBackgroundColor('#00000000');
  fs.mkdirSync(outputDir, { recursive: true });

  try {
    await window.loadFile(path.join(root, 'renderer', '2d.html'));
    await window.webContents.executeJavaScript("window.pet2d.setState('thinking', { agent: 'claude-code', detail: '正在理解你的项目…' })");
    await settle(window);
    fs.writeFileSync(path.join(outputDir, 'claude-code-pet.png'), (await window.webContents.capturePage()).toPNG());

    await window.webContents.executeJavaScript("window.pet2d.setState('working', { agent: 'codex', detail: '正在修改和验证代码…' })");
    await settle(window);
    fs.writeFileSync(path.join(outputDir, 'codex-pet.png'), (await window.webContents.capturePage()).toPNG());
  } finally {
    window.destroy();
    app.quit();
  }
}).catch((error) => {
  console.error(error);
  app.exit(1);
});
