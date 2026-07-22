# Domain Context

- **Agent adapter**: provider-specific knowledge for Claude Code or Codex, including events, paths, payload fields, and shell behavior.
- **Agent event**: sanitized lifecycle metadata emitted by an adapter.
- **Activity state**: normalized internal state used to arbitrate concurrent sessions.
- **Presentation state**: visible copy, identity, and animation selected from an activity state.
- **Hook installation**: validated transaction that merges or removes managed hooks without changing unrelated entries.
- **Runtime file**: local ephemeral port/token discovery record under `~/.pixel-agent-buddy/`.
- **Privacy whitelist**: the complete set of hook fields permitted to leave a hook process.
