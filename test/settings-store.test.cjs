const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { SettingsStore } = require('../src/settings-store.cjs');

test('persists a sanitized desktop position without accepting invalid coordinates', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-agent-buddy-settings-'));
  const filePath = path.join(directory, 'settings.json');
  try {
    const store = new SettingsStore(filePath);
    assert.equal(store.current().windowPosition, null);
    store.update({ windowPosition: { x: 10.4, y: -20.6 }, startAtLogin: true });
    assert.deepEqual(new SettingsStore(filePath).current(), {
      windowPosition: { x: 10, y: -21 },
      startAtLogin: true,
      hooksPrompted: false
    });
    store.update({ windowPosition: { x: 'bad', y: 1 } });
    assert.equal(store.current().windowPosition, null);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
