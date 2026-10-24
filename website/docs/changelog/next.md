---
title: Next (Unreleased)
description: Unreleased changes and upcoming features in WUD (What's Up Docker?).
---

# Next (Unreleased)

> Changes below are merged on `main` and will be included in the upcoming release.

- 🚀 [TRIGGER] Add image preloading option for Docker and Docker Compose triggers (closes #1434).
- 🐛 [AUTH] Support passwords containing colons in Basic authentication per RFC 7617 (fixes #1451).
- 🐛 [CORE] Prevent startup crash caused by unhandled validation errors on invalid `documentationUrl` in store records (#1441).
- 🐛 [PROMETHEUS] Add `result_changelog_url` to Prometheus container metrics gauge and filter undeclared labels to prevent container drop (fixes #1452).
- 🐛 [REGISTRY] Accept Docker Distribution v1 notification Content-Type so GitLab registry webhook bodies are parsed instead of rejected as malformed.
- 🐛 [TRIGGER] Clear the Home Assistant MQTT topics of a renamed container, so a self-update no longer leaves a stale `<name>-wud-self-update-<ts>` entity behind (fixes #1438)
- 🐛 [TRIGGER] Start restored service by container ID during Compose rollback to prevent 404 error leaving container stopped (fixes #1450).
- 🐛 [TRIGGER] Dispatch notifications on container update `success` and `failure` trigger events (fixes #1446, fixes #1453).
- 🐛 [TRIGGER] Use `wud.link.changelog` as `release_url` in Home Assistant trigger entities and summary attributes (#1437).
- 🐛 [WATCHER] Evict expired destroyed container records with TTL and bounded FIFO cap to prevent memory leak (fixes #1442).
- 🐛 [WATCHER] Fix container update detection and trigger firing when transitioning out of cooldown (#1445).
- 🐛 [WATCHER] Preserve container labels from `Config.Labels` during targeted container reconciliation in Docker watcher (#1435).
- 🐛 [WATCHER] Reconcile and prune dead container store records at startup, serialize event processing, and prevent race conditions on container rename or destruction (#1440, #1442).

---
