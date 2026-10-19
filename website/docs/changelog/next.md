---
title: Next (Unreleased)
description: Unreleased changes and upcoming features in WUD (What's Up Docker?).
---

# Next (Unreleased)

> Changes below are merged on `main` and will be included in the upcoming release.

- 🐛 [REGISTRY] Accept Docker Distribution v1 notification Content-Type so GitLab registry webhook bodies are parsed instead of rejected as malformed.
- 🐛 [TRIGGER] Clear the Home Assistant MQTT topics of a renamed container, so a self-update no longer leaves a stale `<name>-wud-self-update-<ts>` entity behind (fixes #1438)

---
