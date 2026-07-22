const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { installHooks, uninstallHooks } = require('../scripts/hook-installer.cjs');

const root = path.resolve(__dirname, '..');

test('validates every config before writing bundle or changing another agent', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-agent-buddy-install-'));
  const claudePath = path.join(home, '.claude', 'settings.json');
  const codexPath = path.join(home, '.codex', 'hooks.json');
  fs.mkdirSync(path.dirname(claudePath), { recursive: true });
  fs.mkdirSync(path.dirname(codexPath), { recursive: true });
  fs.writeFileSync(claudePath, '{"keep":true}\n');
  fs.writeFileSync(codexPath, '{invalid json');

  try {
    assert.throws(() => installHooks({ root, home, env: {}, platform: 'win32', nodePath: 'C:/node.exe' }), /invalid JSON/);
    assert.deepEqual(JSON.parse(fs.readFileSync(claudePath, 'utf8')), { keep: true });
    assert.equal(fs.existsSync(path.join(home, '.pixel-agent-buddy')), false);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('installs and uninstalls both adapters without disturbing existing hooks', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-agent-buddy-install-'));
  const claudePath = path.join(home, '.claude', 'settings.json');
  fs.mkdirSync(path.dirname(claudePath), { recursive: true });
  fs.writeFileSync(claudePath, JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: 'command', command: 'keep-me' }] }] } }));

  try {
    const installed = installHooks({ root, home, env: {}, platform: 'win32', nodePath: 'C:/node.exe' });
    assert.equal(installed.every((result) => result.changed), true);
    assert.equal(fs.existsSync(path.join(home, '.pixel-agent-buddy', 'src', 'agent-adapters.cjs')), true);
    assert.equal(fs.existsSync(path.join(home, '.pixel-agent-buddy', 'src', 'presentation-model.cjs')), true);
    assert.doesNotThrow(() => require(path.join(home, '.pixel-agent-buddy', 'src', 'event-protocol.cjs')));
    const claude = JSON.parse(fs.readFileSync(claudePath, 'utf8'));
    assert.equal(claude.hooks.Stop[0].hooks[0].command, 'keep-me');
    assert.equal(claude.hooks.Stop.length, 2);

    const removed = uninstallHooks({ root, home, env: {}, platform: 'win32', nodePath: 'C:/node.exe' });
    assert.equal(removed.every((result) => result.changed), true);
    const after = JSON.parse(fs.readFileSync(claudePath, 'utf8'));
    assert.equal(after.hooks.Stop.length, 1);
    assert.equal(after.hooks.Stop[0].hooks[0].command, 'keep-me');
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});
