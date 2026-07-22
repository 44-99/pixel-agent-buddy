# Agent compatibility

Pixel Agent Buddy uses documented native lifecycle hooks only. It does not poll transcripts or session logs when an event is unavailable.

## Verified local versions

| Agent | Version verified on 2026-07-23 | Configuration | Coverage |
|---|---|---|---|
| Claude Code | 2.1.202 | `~/.claude/settings.json` | Session start/end, prompt, tools, permission, subagents, stop and failures |
| Codex CLI | 0.145.0-alpha.30 | `~/.codex/hooks.json` | Session start, prompt, tools, permission, subagents, compaction and stop |

The Codex event set follows the current [official Hooks reference](https://developers.openai.com/codex/hooks). Codex does not currently document `SessionEnd`, `StopFailure`, or a separate failed-tool event. Pixel Agent Buddy therefore expires stale Codex sessions locally and never reads `transcript_path`, `tool_input`, or `tool_response` to guess a state.

## Compatibility behavior

- Installation targets only Agent CLIs detected on the machine.
- Existing managed Hooks are repaired on application startup after an upgrade.
- Codex hashes command Hook definitions. After the executable path or command changes, open `/hooks` in Codex to review and trust the updated Hook.
- Unknown events and unknown Agents are rejected rather than silently mapped to another provider.
- Hook failures are fail-open and never decide Allow or Deny.

Run `npm run doctor` from a source checkout to inspect CLI versions, configuration paths, Hook installation, bundle presence, and local runtime health.
