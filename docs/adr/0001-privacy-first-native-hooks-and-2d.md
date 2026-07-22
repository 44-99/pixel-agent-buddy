# ADR 0001: Privacy-first native hooks and 2D presentation

Date: 2026-07-23

## Status

Accepted.

## Decision

Pixel Agent Buddy supports Claude Code and Codex through their native lifecycle hooks. Hook processes create events from an explicit metadata whitelist and fail open. The app does not read transcripts, prompts, source code, tool payloads, assistant messages, or permission decisions.

The product uses project-owned 2D pixel characters and does not retain the legacy gateway, Three.js, VRM/GLB, or Python fallback implementations.

## Consequences

- Provider differences live behind Agent adapters.
- Native permission interfaces remain authoritative.
- Unsupported agents are rejected instead of treated as Claude Code.
- New integrations require a stable lifecycle seam and privacy contract tests.
- The product remains an ambient status utility rather than an Agent platform.
