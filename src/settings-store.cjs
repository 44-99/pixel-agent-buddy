const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_SETTINGS = Object.freeze({
  windowPosition: null,
  startAtLogin: false,
  hooksPrompted: false
});

function sanitizePosition(value) {
  if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y)) return null;
  return { x: Math.round(value.x), y: Math.round(value.y) };
}

class SettingsStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.value = this.read();
  }

  read() {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      return {
        windowPosition: sanitizePosition(parsed.windowPosition),
        startAtLogin: Boolean(parsed.startAtLogin),
        hooksPrompted: Boolean(parsed.hooksPrompted)
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  current() {
    return structuredClone(this.value);
  }

  update(patch) {
    this.value = {
      windowPosition: patch.windowPosition === undefined
        ? this.value.windowPosition : sanitizePosition(patch.windowPosition),
      startAtLogin: patch.startAtLogin === undefined
        ? this.value.startAtLogin : Boolean(patch.startAtLogin),
      hooksPrompted: patch.hooksPrompted === undefined
        ? this.value.hooksPrompted : Boolean(patch.hooksPrompted)
    };
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(this.value, null, 2)}\n`, 'utf8');
    fs.renameSync(temporary, this.filePath);
    return this.current();
  }
}

module.exports = { DEFAULT_SETTINGS, SettingsStore, sanitizePosition };
