const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow } = require('electron');

const root = path.join(__dirname, '..');
const websiteAssets = path.join(root, 'website', 'assets');

app.whenReady().then(async () => {
  fs.mkdirSync(websiteAssets, { recursive: true });
  for (const file of ['claude-crab.png', 'codex-crab.png']) {
    fs.copyFileSync(path.join(root, 'renderer', 'assets', file), path.join(websiteAssets, file));
  }

  const window = new BrowserWindow({ width: 1200, height: 630, show: false, frame: false });
  try {
    await window.loadFile(path.join(root, 'website', 'index.html'));
    await window.webContents.executeJavaScript("document.body.classList.add('capture')");
    await window.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    const png = (await window.webContents.capturePage({ x: 0, y: 0, width: 1200, height: 630 })).toPNG();
    fs.writeFileSync(path.join(root, 'assets', 'hero.png'), png);
    fs.writeFileSync(path.join(websiteAssets, 'hero.png'), png);
    console.log(`Generated hero.png (${png.length} bytes)`);
  } finally {
    window.destroy();
    app.quit();
  }
}).catch((error) => {
  console.error(error);
  app.exit(1);
});
