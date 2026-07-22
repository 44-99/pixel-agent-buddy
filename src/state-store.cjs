const { EventEmitter } = require('events');
const { isNormalizedEvent } = require('./event-protocol.cjs');
const { presentationForState } = require('./presentation-model.cjs');

const PRIORITY = Object.freeze({ permission: 70, error: 60, working: 50, thinking: 40, success: 30, idle: 20, sleeping: 10 });

class AgentStateStore extends EventEmitter {
  constructor({ now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout, sessionTtlMs = 30 * 60 * 1000 } = {}) {
    super();
    this.now = now;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.sessionTtlMs = sessionTtlMs;
    this.sessions = new Map();
    this.fallbackTimers = new Map();
    this.expiryTimers = new Map();
  }

  apply(event) {
    if (!isNormalizedEvent(event)) return false;
    const key = `${event.agent}:${event.sessionId}`;
    this.sessions.set(key, { ...event, receivedAt: this.now() });
    this.scheduleFallback(key, event);
    this.scheduleExpiry(key, event);
    this.emitCurrent();
    return true;
  }

  scheduleExpiry(key, event) {
    this.clearTimer(this.expiryTimers.get(key));
    const timer = this.setTimer(() => {
      const current = this.sessions.get(key);
      if (!current || current.timestamp !== event.timestamp) return;
      this.sessions.delete(key);
      this.clearTimer(this.fallbackTimers.get(key));
      this.fallbackTimers.delete(key);
      this.expiryTimers.delete(key);
      this.emitCurrent();
    }, this.sessionTtlMs);
    timer.unref?.();
    this.expiryTimers.set(key, timer);
  }

  scheduleFallback(key, event) {
    this.clearTimer(this.fallbackTimers.get(key));
    this.fallbackTimers.delete(key);
    const delay = event.state === 'success' ? 6000 : event.state === 'error' ? 10000 : 0;
    if (!delay) return;
    const timer = this.setTimer(() => {
      const current = this.sessions.get(key);
      if (!current || current.timestamp !== event.timestamp) return;
      const copy = presentationForState('idle');
      this.sessions.set(key, { ...current, state: 'idle', title: copy.title, detail: copy.detail, receivedAt: this.now() });
      this.fallbackTimers.delete(key);
      this.emitCurrent();
    }, delay);
    timer.unref?.();
    this.fallbackTimers.set(key, timer);
  }

  current() {
    const now = this.now();
    return [...this.sessions.values()]
      .filter((session) => now - session.receivedAt < this.sessionTtlMs)
      .sort((a, b) => (PRIORITY[b.state] - PRIORITY[a.state]) || (b.receivedAt - a.receivedAt))[0] || null;
  }

  emitCurrent() {
    const current = this.current();
    this.emit('state', current);
  }

  dispose() {
    for (const timer of this.fallbackTimers.values()) this.clearTimer(timer);
    this.fallbackTimers.clear();
    for (const timer of this.expiryTimers.values()) this.clearTimer(timer);
    this.expiryTimers.clear();
    this.sessions.clear();
  }
}

module.exports = { AgentStateStore };
