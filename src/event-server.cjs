const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { isNormalizedEvent } = require('./event-protocol.cjs');

const PORTS = [23821, 23822, 23823, 23824, 23825];
const MAX_BODY_BYTES = 64 * 1024;

function runtimePath() {
  return process.env.PIXEL_AGENT_BUDDY_RUNTIME_PATH || path.join(os.homedir(), '.pixel-agent-buddy', 'runtime.json');
}

class AgentEventServer {
  constructor({ onEvent, getState = () => null }) {
    this.onEvent = onEvent;
    this.getState = getState;
    this.server = null;
    this.token = crypto.randomBytes(24).toString('base64url');
    this.port = null;
    this.runtimeFile = runtimePath();
  }

  async start() {
    for (const port of PORTS) {
      try {
        await this.listen(port);
        this.port = port;
        this.writeRuntime();
        return port;
      } catch (error) {
        if (error.code !== 'EADDRINUSE') throw error;
      }
    }
    throw new Error(`No available event port (${PORTS.join(', ')})`);
  }

  listen(port) {
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => this.handle(req, res));
      const onError = (error) => { server.close(); reject(error); };
      server.once('error', onError);
      server.listen(port, '127.0.0.1', () => {
        server.removeListener('error', onError);
        this.server = server;
        resolve();
      });
    });
  }

  handle(req, res) {
    res.setHeader('X-Pixel-Agent-Buddy', 'pixel-agent-buddy');
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, version: 1 }));
      return;
    }
    if (req.method === 'GET' && req.url === '/state') {
      if (req.headers.authorization !== `Bearer ${this.token}`) {
        res.writeHead(401).end();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ state: this.getState() }));
      return;
    }
    if (req.method !== 'POST' || req.url !== '/event') {
      res.writeHead(404).end();
      return;
    }
    if (req.headers.authorization !== `Bearer ${this.token}`) {
      res.writeHead(401).end();
      return;
    }

    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) req.destroy();
      else chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const event = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!isNormalizedEvent(event)) throw new Error('invalid event');
        this.onEvent(event);
        res.writeHead(204).end();
      } catch {
        res.writeHead(400).end();
      }
    });
  }

  writeRuntime() {
    fs.mkdirSync(path.dirname(this.runtimeFile), { recursive: true });
    fs.writeFileSync(this.runtimeFile, JSON.stringify({ version: 1, port: this.port, token: this.token, pid: process.pid }), { mode: 0o600 });
  }

  stop() {
    this.server?.close();
    this.server = null;
    try {
      const current = JSON.parse(fs.readFileSync(this.runtimeFile, 'utf8'));
      if (current.pid === process.pid && current.token === this.token) fs.unlinkSync(this.runtimeFile);
    } catch {}
  }
}

module.exports = { AgentEventServer, PORTS, runtimePath };
