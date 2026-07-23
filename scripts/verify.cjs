const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const required = [
  'electron/main.cjs', 'electron/preload.cjs', 'renderer/2d.html',
  'renderer/setup.html', 'renderer/css/setup.css', 'renderer/js/setup.js',
  'renderer/css/pet-2d.css', 'renderer/js/pet-2d.js', 'src/presentation-model.cjs',
  'src/diagnostics.cjs', 'src/update-check.cjs',
  'src/agent-adapters.cjs', 'scripts/hook-installer.cjs', 'scripts/build-windows.cjs',
  'scripts/verify-packaged-hook.cjs',
  'scripts/capture-setup.cjs',
  'renderer/assets/claude-crab.png', 'renderer/assets/codex-crab.png',
  'hooks/agent-event-hook.cjs', 'README.md', 'README.zh-CN.md', 'PRIVACY.md',
  'website/index.html', '.github/workflows/ci.yml', '.github/workflows/release.yml'
];
for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) throw new Error(`Missing required file: ${relative}`);
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (pkg.name !== 'pixel-agent-buddy' || pkg.build?.productName !== 'Pixel Agent Buddy') {
  throw new Error('Product branding is inconsistent');
}
for (const forbidden of ['three', '@pixiv/three-vrm', 'ws']) {
  if (pkg.dependencies?.[forbidden] || pkg.devDependencies?.[forbidden]) throw new Error(`Legacy dependency still present: ${forbidden}`);
}
console.log('Package structure verified.');
