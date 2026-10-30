---
title: Next (Unreleased)
description: Unreleased changes and upcoming features in WUD (What's Up Docker?).
---

# Next (Unreleased)

> Changes below are merged on `main` and will be included in the upcoming release.

- 🚀 [AUTH] Support a configured session secret via `WUD_AUTH_SESSION_SECRET`, while preserving the version and MAC-bound fallback when unset.
- 🚀 [CONTAINER] Add option to override update cooldown and trigger update immediately (fixes #1463)
- 🐛 [API] Match the installed image tag when filtering containers by tag.
- 🐛 [CONTAINER] Fix link template variable resolution on update (fixes #1490)
- 🐛 [CORE] Fix CWE-95 arbitrary code execution in workload link templates (GHSA-rrhg-3h69-4fvf)
- 🐛 [TRIGGER] Abort Docker Compose transaction when service update was rolled back (fixes #1495)
- 🐛 [TRIGGER] Do not copy Docker-generated MAC address when recreating container (#1464)
- 🐛 [TRIGGER] Fix Docker Compose backup restoration when swap phase fails (fixes #1494)
- 🐛 [TRIGGER] Fix duplicate update success events in Docker Compose trigger (fixes #1491)
- 🐛 [TRIGGER] Fix missing changelog URL in triggers using wud.link.changelog (fixes #1501)
- 🐛 [TRIGGER] Write Docker Compose files atomically to prevent truncation on write failure (fixes #1496)
- 🐛 [WATCHER] Allow tag candidates with different version segment count when wud.tag.include is defined (fixes #1465)
- 🐛 [WATCHER] Fix update notification trigger after cooldown expiration (fixes #1445)
- 🐛 [WATCHER] Index containers created while WUD was stopped during startup reconciliation (fixes #1466)

---
