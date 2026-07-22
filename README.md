<div align="center">
  <img src="assets/hero.png" alt="Pixel Agent Buddy showing Claude Code and Codex pixel companions" width="760">
  <h1>Pixel Agent Buddy</h1>
  <p><strong>A privacy-first pixel desktop companion for Claude Code and Codex.</strong></p>

  [![CI](https://github.com/44-99/pixel-agent-buddy/actions/workflows/ci.yml/badge.svg)](https://github.com/44-99/pixel-agent-buddy/actions/workflows/ci.yml)
  [![Release](https://img.shields.io/github/v/release/44-99/pixel-agent-buddy?include_prereleases)](https://github.com/44-99/pixel-agent-buddy/releases)
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![Windows](https://img.shields.io/badge/platform-Windows-0078D4?logo=windows)](https://github.com/44-99/pixel-agent-buddy/releases)

  [简体中文](README.zh-CN.md) · [Website](https://44-99.github.io/pixel-agent-buddy/) · [Releases](https://github.com/44-99/pixel-agent-buddy/releases) · [Privacy](PRIVACY.md)
</div>

Pixel Agent Buddy turns native Claude Code and Codex lifecycle hooks into a small ambient signal on your desktop. It shows whether an agent is thinking, working, waiting for approval, finished, failed, or sleeping—without reading your prompt, code, transcript, assistant message, or tool payload.

## Why Pixel Agent Buddy?

- **Privacy is the product** — only a small, documented metadata whitelist leaves the hook process.
- **Native hooks only** — no transcript scraping, log polling, external gateway, or hidden fallback.
- **Fail-open observation** — it never takes over Allow/Deny; the native CLI remains authoritative.
- **Small on purpose** — no chat, memory, RPG, leaderboard, dashboard, or remote control.
- **Two original pixel identities** — Claude Code gets a warm crab; Codex gets a terminal robot crab.
- **Safe coexistence** — installation preserves unrelated hooks and rolls back on failure.

## States

| State | Meaning |
|---|---|
| Idle | Ready for a new task |
| Thinking | Reading context or planning |
| Working | Running tools or changing files |
| Approval | Waiting for native CLI permission |
| Success | The task finished |
| Error | A tool or turn failed |
| Sleeping | No active Claude Code or Codex session |

## Quick start

### Download

Download the latest Windows installer or portable build from [GitHub Releases](https://github.com/44-99/pixel-agent-buddy/releases). Downloaded builds include their own Hook runner and do not require a separate Node.js installation. The app offers to connect the supported Agent CLIs detected on first launch.

### Run from source

Requirements: Windows 10/11, Node.js 20+ for source development, and Claude Code and/or a Codex CLI version with lifecycle hooks.

```powershell
git clone https://github.com/44-99/pixel-agent-buddy.git
cd pixel-agent-buddy
npm install
npm run install:hooks
npm start
```

Install only one adapter when needed:

```powershell
npm run install:claude
npm run install:codex
```

Check the local installation:

```powershell
npm run doctor
```

Remove only the hooks managed by Pixel Agent Buddy:

```powershell
npm run uninstall:hooks
```

Drag the pet with the left mouse button. Right-click it for the small operational menu: Hook status and repair, startup behavior, hide, and quit. Animation states are driven only by real Agent events rather than manual demo controls.

## Privacy contract

Hooks may send only:

- agent type;
- session, parent-session, and subagent identifiers;
- lifecycle event and normalized display state;
- current working directory and its basename;
- tool name;
- local timestamp.

Hooks never send prompts, code, `tool_input`, `tool_response`, transcript content, assistant messages, or permission decisions. Transport stays on authenticated `127.0.0.1`. See [PRIVACY.md](PRIVACY.md) for the complete contract.

## How it works

```text
Claude Code adapter ─┐
                     ├─> sanitized event hook
Codex adapter ───────┘            │
                                  ├─> authenticated localhost HTTP
                                  ├─> multi-session activity arbitration
                                  └─> Electron presentation → pixel companion
```

The installer validates every target configuration before writing anything. Configuration changes use backups and a rollback transaction, while unrelated hook entries remain untouched.

See [Agent compatibility](docs/compatibility.md) for verified CLI versions, provider-specific event coverage, and the Codex Hook trust step.

## Development

```powershell
npm test
npm run build
npm run generate:assets
npm run preview:assets
```

The two transparent PNG characters are generated deterministically from project-owned source shapes. They require no image API or third-party art.

## Project scope

Pixel Agent Buddy deliberately focuses on ambient status for Claude Code and Codex. Additional agent adapters will be considered only when users ask for them and the provider exposes a stable lifecycle seam.

See [CONTRIBUTING.md](CONTRIBUTING.md) before proposing a new adapter or product-scope expansion.

## License

[MIT](LICENSE) © 2026 [44-99](https://github.com/44-99)
