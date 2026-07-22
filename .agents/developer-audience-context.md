# Developer Audience Context

Last updated: 2026-07-23

## Product Overview

- Product name: Pixel Agent Buddy（像素 Agent 伙伴）
- One-liner: We help developers see when Claude Code or Codex is working, waiting, done, or broken without exposing prompts, code, or transcripts.
- Category: Free, open-source, local-first desktop developer utility.
- Core technology: Electron, a self-contained packaged Hook runner, native Claude Code hooks, native Codex hooks, and deterministic pixel-art assets.
- Pricing model: MIT-licensed and free.

## Developer Persona

The primary user is a solo developer or hands-on engineer on Windows who runs long Claude Code or Codex terminal tasks, switches between editor, browser, and terminal windows, and wants an ambient status signal without opening another dashboard. They value quick installation, low resource use, local processing, and predictable fail-open behavior more than gamification or an AI chat companion.

## Where They Hang Out

- GitHub repositories and topics: `claude-code`, `codex`, `coding-agent`, `desktop-pet`, `developer-tools`.
- Claude Code, Codex, local-first software, Electron, and AI coding communities.
- Developer discussions on X, Reddit, Hacker News, Discord, and Chinese developer communities.
- Release and comparison pages for coding-agent desktop companions.

## Problems & Pain Points

- Long agent tasks finish or block while the terminal is hidden.
- Permission requests are easy to miss when multitasking.
- Existing companions can be feature-heavy, resource-heavy, or collect more session data than necessary.
- Users do not want a desktop pet to read prompts, source code, transcripts, or tool output.
- Hook installation must coexist with other tools and remain reversible.

## Current Alternatives

- Clawd on Desk: broad agent support, permission actions, dashboards, themes, remote access, and many advanced features.
- AgentPet: cross-agent monitoring plus pet growth, tokens, levels, and leaderboards.
- Native terminal notifications or manual terminal checking.
- Small personal scripts that emit desktop notifications.
- Doing nothing and periodically switching back to the terminal.

## Key Differentiators

- Privacy-first event whitelist: no prompts, code, transcripts, or tool payloads.
- Native hooks for Claude Code and Codex; no transcript scraping fallback.
- Fail-open observation: the app never owns Allow or Deny decisions.
- Small product surface: ambient status, not chat, RPG, dashboard, or remote control.
- Deterministic original pixel art that can be regenerated offline.
- Incremental hook installation that preserves other integrations.

## Verbatim Developer Language

- “我只是想知道 Agent 现在在干什么。”
- “任务完成或者卡在权限时提醒我。”
- “不要读取我的 prompt 和代码。”
- “安装后别把我原来的 hooks 覆盖掉。”
- “我不需要另一个复杂的 Agent 平台。”

## Technical Trust Signals

- Public MIT-licensed source.
- Automated protocol, hook merge, event transport, and identity tests.
- Loopback-only authenticated event transport.
- Explicit privacy field whitelist.
- Reversible hook installer with backups.
- Reproducible pixel assets and Windows package verification.
- End-to-end verification that the packaged executable can receive Hook stdin and deliver only sanitized metadata.

## Conversion Actions

- Awareness: view the animated preview and star the repository.
- Consideration: read the privacy contract and supported event table.
- Trial: download the portable Windows build or installer.
- Activation: see the pet react to the first real Claude Code or Codex event.
- Retention: enable startup behavior and use it during long-running coding tasks.

## Voice & Tone

- Friendly and playful in visuals.
- Direct, precise, and technically transparent in documentation.
- Privacy claims must be concrete and verifiable.
- Avoid hype, anthropomorphic AI claims, and vague “intelligence” language.
