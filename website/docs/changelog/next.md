---
title: Next (Unreleased)
description: Unreleased changes and upcoming features in WUD (What's Up Docker?).
---

# Next (Unreleased)

> Changes below are merged on `main` and will be included in the upcoming release.

- 🚀 [AUTH] Support a configured session secret via `WUD_AUTH_SESSION_SECRET`, while preserving the version and MAC-bound fallback when unset.
- 🚀 [CONTAINER] Add option to override update cooldown and trigger update immediately (fixes #1463)
- 🚀 [WATCHER] Configure Docker digest watching centrally per container name with `CONTAINEROPTIONS`, preserving label precedence and existing defaults.
- 🐛 [E2E] Update expected Home Assistant image version to 2026.10.4 in E2E scenarios
- 🐛 [TRIGGER] Do not copy Docker-generated MAC address when recreating container (#1464)
- 🐛 [WATCHER] Allow tag candidates with different version segment count when wud.tag.include is defined (fixes #1465)

---
