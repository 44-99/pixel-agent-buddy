const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');

test('removes prototype state controls and keeps real agent events authoritative', () => {
  const html = fs.readFileSync(path.join(root, 'renderer', '2d.html'), 'utf8');
  const renderer = fs.readFileSync(path.join(root, 'renderer', 'js', 'pet-2d.js'), 'utf8');

  assert.doesNotMatch(html, /state-menu|demo-hint|button data-state/);
  assert.doesNotMatch(renderer, /dblclick|button\[data-state\]/);
  assert.match(renderer, /showPetMenu/);
});

test('pet menu exposes only operational controls', () => {
  const main = fs.readFileSync(path.join(root, 'electron', 'main.cjs'), 'utf8');

  for (const label of ['安装/修复', '卸载', '开机启动', '隐藏宠物', '退出']) {
    assert.match(main, new RegExp(label));
  }
  assert.doesNotMatch(main, /右键切换状态|收到你的鼓励/);
});
