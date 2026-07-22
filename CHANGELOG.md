# Changelog

## [0.2.0-beta.2] - 2026-07-23

### Added

- Self-contained packaged Hook runner; downloaded builds no longer require a separate Node.js installation.
- Official Codex subagent and context-compaction lifecycle events.
- Detected-Agent-only Hook installation and project names in live status details.

### Fixed

- Expired sessions now actively transition the pet to sleeping instead of leaving stale UI behind.
- Packaged upgrades repair existing managed Hook commands without changing unrelated Hooks.

### Changed

- Replaced prototype state buttons with a small operational right-click menu.
- Removed demo-only state switching, fake success interactions, and the taskbar entry.

## [0.2.0-beta.1] - 2026-07-23

### Added

- Native Claude Code and Codex hook adapters.
- Original Claude Code and Codex pixel identities.
- Seven lifecycle presentation states and multi-session arbitration.
- Authenticated loopback-only event transport.
- Transactional hook installation with backups and rollback.
- Installation doctor, position persistence, bilingual documentation, CI, and GitHub Pages.

### Changed

- Renamed the product to Pixel Agent Buddy.
- Rebuilt the application as a small privacy-first 2D desktop companion.

### Removed

- Legacy gateway integration and all fallback code.
- Three.js, VRM/GLB models, Python backend, system monitoring, memory, and topic generation.
