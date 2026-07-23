# Privacy Contract

Pixel Agent Buddy is an ambient status display, not an AI client and not a session recorder.

## Data accepted from hooks

The hook process builds a new object from an explicit field whitelist. It may include:

- agent identifier;
- session, parent-session, subagent, and agent-type identifiers;
- supported lifecycle event and normalized state;
- current working directory and project basename;
- tool name;
- timestamp.

## Data never forwarded

- prompts or expanded prompts;
- source code or file contents;
- tool input or tool response payloads;
- transcript content or assistant messages;
- environment variables, credentials, or API keys;
- Allow, Deny, or Always permission decisions.

## Transport and storage

- Events are sent only to `127.0.0.1`.
- Each running app instance creates a random bearer token.
- The runtime file contains the local port, token, and process ID under `~/.pixel-agent-buddy/`.
- Events are held in memory for activity arbitration and expire after 30 minutes.
- Pixel Agent Buddy does not upload analytics or telemetry.
- Pixel Agent Buddy does not check for updates in the background. Pressing the manual update button sends a standard HTTPS request to the public GitHub Releases API with the application name and version in the user-agent header.

## Failure behavior

Hooks are fail-open. Missing runtime state, malformed events, connection errors, and timeouts never block Claude Code or Codex. Permission decisions remain in the native agent interface.

Security reports should follow [SECURITY.md](SECURITY.md).
