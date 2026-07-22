const test = require('node:test');
const assert = require('node:assert/strict');
const { AgentStateStore } = require('../src/state-store.cjs');

function event(overrides = {}) {
  return {
    version: 1,
    agent: 'codex',
    sessionId: 'session-1',
    event: 'PreToolUse',
    state: 'working',
    timestamp: 1,
    ...overrides
  };
}

function fakeClock() {
  let now = 100;
  let id = 0;
  const timers = new Map();
  return {
    now: () => now,
    setTimer: (callback, delay) => {
      const timer = { id: ++id, at: now + delay, callback, unref() {} };
      timers.set(timer.id, timer);
      return timer;
    },
    clearTimer: (timer) => { if (timer) timers.delete(timer.id); },
    advance(milliseconds) {
      now += milliseconds;
      for (const timer of [...timers.values()].filter((candidate) => candidate.at <= now)) {
        timers.delete(timer.id);
        timer.callback();
      }
    }
  };
}

test('arbitrates multiple sessions by state priority and recency', () => {
  const clock = fakeClock();
  const store = new AgentStateStore(clock);
  store.apply(event());
  clock.advance(1);
  store.apply(event({ agent: 'claude-code', sessionId: 'session-2', state: 'permission', event: 'PermissionRequest', timestamp: 2 }));
  assert.equal(store.current().agent, 'claude-code');
  assert.equal(store.current().state, 'permission');
  store.dispose();
});
test('falls successful sessions back to idle and expires stale sessions', () => {
  const clock = fakeClock();
  const store = new AgentStateStore({ ...clock, sessionTtlMs: 7000 });
  store.apply(event({ state: 'success', event: 'Stop' }));
  clock.advance(6000);
  assert.equal(store.current().state, 'idle');
  clock.advance(7001);
  assert.equal(store.current(), null);
  store.dispose();
});

test('emits an empty snapshot when the final session expires', () => {
  const clock = fakeClock();
  const store = new AgentStateStore({ ...clock, sessionTtlMs: 1000 });
  const snapshots = [];
  store.on('state', (snapshot) => snapshots.push(snapshot));
  store.apply(event());
  clock.advance(1000);
  assert.equal(snapshots.at(-1), null);
  store.dispose();
});
