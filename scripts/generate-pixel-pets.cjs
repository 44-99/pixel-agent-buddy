const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { app, BrowserWindow } = require('electron');

const SIZE = 256;
const outputDir = path.join(__dirname, '..', 'renderer', 'assets');
let renderWindow;
let tempDirectory;
let tempFile;

function rect(x, y, width, height, fill, extra = '') {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" ${extra}/>`;
}

function polygon(points, fill) {
  return `<polygon points="${points}" fill="${fill}"/>`;
}

function svg(shapes) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" shape-rendering="crispEdges">`,
    '<g shape-rendering="crispEdges">',
    ...shapes,
    '</g>',
    '</svg>'
  ].join('');
}

function claudeCrab() {
  const p = {
    outline: '#5a2118', dark: '#9f3828', shell: '#d95d45', light: '#ee856d',
    shine: '#f6aa91', cream: '#fff1d6', ink: '#352620', blush: '#ef786e'
  };
  return svg([
    // Back legs and raised claws.
    rect(44, 180, 28, 12, p.outline), rect(32, 192, 36, 12, p.outline),
    rect(184, 180, 28, 12, p.outline), rect(188, 192, 36, 12, p.outline),
    rect(28, 88, 28, 20, p.outline), rect(20, 76, 36, 24, p.outline),
    rect(24, 64, 24, 12, p.outline), rect(48, 76, 12, 24, p.outline),
    rect(200, 88, 28, 20, p.outline), rect(200, 76, 36, 24, p.outline),
    rect(208, 64, 24, 12, p.outline), rect(196, 76, 12, 24, p.outline),
    rect(28, 80, 20, 16, p.shell), rect(28, 68, 16, 12, p.light),
    rect(208, 80, 20, 16, p.shell), rect(212, 68, 16, 12, p.light),
    // Arms.
    rect(48, 96, 20, 16, p.outline), rect(56, 104, 20, 16, p.shell),
    rect(188, 96, 20, 16, p.outline), rect(180, 104, 20, 16, p.shell),
    // Body outline and shell.
    rect(64, 92, 128, 112, p.outline), rect(56, 116, 144, 64, p.outline),
    rect(72, 84, 112, 16, p.outline), rect(72, 100, 112, 96, p.shell),
    rect(64, 124, 128, 52, p.shell), rect(80, 92, 96, 12, p.light),
    rect(72, 112, 16, 48, p.light), rect(88, 104, 64, 8, p.shine),
    rect(160, 108, 16, 52, p.dark), rect(80, 176, 96, 12, p.dark),
    // Eye stalks and eyes.
    rect(80, 60, 28, 40, p.outline), rect(148, 60, 28, 40, p.outline),
    rect(84, 56, 24, 36, p.cream), rect(148, 56, 24, 36, p.cream),
    rect(92, 68, 12, 16, p.ink), rect(152, 68, 12, 16, p.ink),
    rect(92, 68, 4, 4, '#ffffff'), rect(152, 68, 4, 4, '#ffffff'),
    // Friendly face.
    rect(96, 128, 16, 8, p.blush), rect(144, 128, 16, 8, p.blush),
    rect(112, 132, 8, 8, p.ink), rect(136, 132, 8, 8, p.ink),
    rect(120, 140, 16, 8, p.ink), rect(124, 140, 8, 4, p.cream),
    // Little code notebook badge.
    rect(108, 160, 40, 28, p.outline), rect(112, 164, 32, 20, p.cream),
    rect(116, 168, 8, 4, p.dark), rect(128, 168, 12, 4, p.light),
    rect(116, 176, 20, 4, p.dark),
    // Feet.
    rect(72, 196, 40, 12, p.outline), rect(144, 196, 40, 12, p.outline),
    rect(80, 192, 28, 12, p.shell), rect(148, 192, 28, 12, p.shell)
  ]);
}

function codexCrab() {
  const p = {
    outline: '#111714', shell: '#29312e', mid: '#45504b', light: '#707c76',
    face: '#f2f0e8', white: '#fffdf5', green: '#38d996', glow: '#a6f4d3', red: '#ff6b61'
  };
  return svg([
    // Mechanical legs and claw assemblies.
    rect(40, 180, 32, 12, p.outline), rect(28, 192, 40, 12, p.outline),
    rect(184, 180, 32, 12, p.outline), rect(188, 192, 40, 12, p.outline),
    rect(24, 80, 40, 28, p.outline), rect(16, 68, 40, 20, p.outline),
    rect(20, 60, 28, 12, p.mid), rect(24, 80, 28, 16, p.shell), rect(48, 88, 20, 16, p.mid),
    rect(192, 80, 40, 28, p.outline), rect(200, 68, 40, 20, p.outline),
    rect(208, 60, 28, 12, p.mid), rect(204, 80, 28, 16, p.shell), rect(188, 88, 20, 16, p.mid),
    rect(56, 100, 20, 20, p.outline), rect(180, 100, 20, 20, p.outline),
    // Arm status lights.
    rect(60, 104, 12, 12, p.green), rect(184, 104, 12, 12, p.green),
    // Squared robot shell.
    rect(64, 88, 128, 116, p.outline), rect(56, 120, 144, 60, p.outline),
    rect(72, 96, 112, 100, p.shell), rect(64, 128, 128, 44, p.shell),
    rect(80, 88, 96, 12, p.mid), rect(76, 104, 12, 80, p.light),
    rect(168, 108, 12, 76, '#1d2421'), rect(88, 188, 80, 8, '#1d2421'),
    // Antennas and terminal-like eyes.
    rect(84, 56, 24, 40, p.outline), rect(148, 56, 24, 40, p.outline),
    rect(88, 60, 20, 28, p.face), rect(148, 60, 20, 28, p.face),
    rect(92, 68, 12, 8, p.green), rect(152, 68, 12, 8, p.green),
    rect(96, 68, 4, 4, p.glow), rect(156, 68, 4, 4, p.glow),
    rect(88, 48, 16, 12, p.outline), rect(152, 48, 16, 12, p.outline),
    rect(92, 52, 8, 4, p.green), rect(156, 52, 8, 4, p.green),
    // Face display.
    rect(88, 116, 80, 52, p.outline), rect(92, 120, 72, 44, p.face),
    polygon('104,132 112,132 124,140 112,148 104,148 116,140', p.shell),
    rect(128, 148, 24, 4, p.green), rect(148, 124, 8, 8, p.red),
    // Chest cursor and vents.
    rect(108, 176, 40, 12, p.outline), rect(112, 180, 20, 4, p.green),
    rect(136, 180, 8, 4, p.mid),
    // Feet.
    rect(68, 196, 44, 12, p.outline), rect(144, 196, 44, 12, p.outline),
    rect(76, 192, 32, 12, p.mid), rect(148, 192, 32, 12, p.mid),
    rect(84, 196, 12, 4, p.green), rect(160, 196, 12, 4, p.green)
  ]);
}

async function prepareRenderer() {
  renderWindow = new BrowserWindow({
    width: SIZE,
    height: SIZE,
    show: false,
    transparent: true,
    frame: false
  });
  renderWindow.setBackgroundColor('#00000000');
  const html = [
    '<!doctype html><meta charset="utf-8">',
    '<style>html,body{width:256px;height:256px;margin:0;overflow:hidden;background:transparent}</style>'
  ].join('');
  tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-agent-buddy-'));
  tempFile = path.join(tempDirectory, 'render.html');
  fs.writeFileSync(tempFile, html, 'utf8');
  await renderWindow.loadFile(tempFile);
}

async function writePng(fileName, source) {
  await renderWindow.webContents.executeJavaScript(`
    document.body.innerHTML = ${JSON.stringify(source)};
    new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  `);
  const image = await renderWindow.webContents.capturePage({ x: 0, y: 0, width: SIZE, height: SIZE });
  const png = image.toPNG();
  fs.writeFileSync(path.join(outputDir, fileName), png);
  console.log(`Generated ${fileName} (${png.length} bytes)`);
}

function writeWindowsIcon() {
  const png = fs.readFileSync(path.join(outputDir, 'claude-crab.png'));
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(0, 6);
  header.writeUInt8(0, 7);
  header.writeUInt8(0, 8);
  header.writeUInt8(0, 9);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  const iconPath = path.join(__dirname, '..', 'assets', 'icon.ico');
  fs.mkdirSync(path.dirname(iconPath), { recursive: true });
  fs.writeFileSync(iconPath, Buffer.concat([header, png]));
  console.log(`Generated icon.ico (${header.length + png.length} bytes)`);
}

function cleanupRenderer() {
  if (renderWindow && !renderWindow.isDestroyed()) renderWindow.destroy();
  if (tempFile && fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  if (tempDirectory && fs.existsSync(tempDirectory)) fs.rmdirSync(tempDirectory);
}

app.whenReady().then(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  try {
    await prepareRenderer();
    await writePng('claude-crab.png', claudeCrab());
    await writePng('codex-crab.png', codexCrab());
    writeWindowsIcon();
  } finally {
    cleanupRenderer();
  }
  app.quit();
}).catch((error) => {
  cleanupRenderer();
  console.error(error);
  app.exit(1);
});
