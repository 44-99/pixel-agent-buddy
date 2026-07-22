const test = require('node:test');
const assert = require('node:assert/strict');
const { identityForAgent, normalizeAgent, normalizeState, presentationForState } = require('../src/presentation-model.cjs');

test('selects a dedicated transparent pixel pet for each supported agent', () => {
  assert.equal(identityForAgent('claude-code').asset, 'assets/claude-crab.png');
  assert.equal(identityForAgent('codex').asset, 'assets/codex-crab.png');
  assert.notEqual(identityForAgent('claude-code').asset, identityForAgent('codex').asset);
});

test('keeps state aliases and display copy in one presentation model', () => {
  assert.equal(normalizeState('completed'), 'success');
  assert.equal(presentationForState('failed').title, '遇到问题');
});

test('unknown and missing agents safely fall back to the Claude identity', () => {
  assert.equal(normalizeAgent('CODEX'), 'codex');
  assert.equal(normalizeAgent('unknown'), 'claude-code');
  assert.equal(identityForAgent().badge, 'CLAUDE CODE');
});
