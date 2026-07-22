# Contributing to Pixel Agent Buddy

Thanks for helping keep Pixel Agent Buddy small, reliable, and easy to trust.

## Development setup

```powershell
git clone https://github.com/44-99/pixel-agent-buddy.git
cd pixel-agent-buddy
npm install
npm test
npm start
```

## Before opening a pull request

1. Keep prompt, code, transcript, tool payload, and permission data outside the event protocol.
2. Preserve fail-open hook behavior.
3. Preserve unrelated entries in user configuration files.
4. Add contract tests for Agent compatibility or installation changes.
5. Run:

```powershell
npm test
npm run build
npm audit --audit-level=high
```

## Product scope

Pixel Agent Buddy is an ambient status companion. Chat, memory, gamification, remote control, transcript scraping, and permission takeover are intentionally outside the default product scope.

New Agent support requires a documented lifecycle mechanism and an adapter contract. Avoid adding polling fallback solely to increase the supported-Agent count.

## Commit messages

Use concise Conventional Commit-style subjects, for example:

- `feat: add Gemini lifecycle adapter`
- `fix: roll back partial hook installation`
- `docs: clarify event privacy contract`
