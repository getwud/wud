---
title: Next (Unreleased)
description: Unreleased changes and upcoming features in WUD (What's Up Docker?).
---

# Next (Unreleased)

> Changes below are merged on `main` and will be included in the upcoming release.

- 🚀 [TRIGGER] Add real-time pull progress logging for Docker images (fixes #777)
- 🐛 [CORE] Fix graceful shutdown on SIGTERM (fixes #1397)
- 🐛 [CORE] Resilient Docker event stream with exponential backoff and targeted single-container reconciliation on update (fixes #1393)
- 🐛 [TRIGGER] Apply Docker Compose digest-only updates for floating tags without changing the image reference (fixes #1404)
- 🐛 [TRIGGER] Fix Home Assistant MQTT summary mode configuration collision (#1357)
- 🐛 [TRIGGER] Preserve YAML format when updating compose file (fixes #1409)
- 🐛 [TRIGGER] Queue Docker trigger image pulls per registry and retry rate-limited pulls (fixes #1406)
- 🐛 [UI] Fix open redirect vulnerability on authenticated redirect (fixes #744)
- 🐛 [WATCHER] Normalize aarch64 to arm64 in Swarm watcher (fixes #1401)

---
