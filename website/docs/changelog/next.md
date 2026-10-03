---
title: Next (Unreleased)
description: Unreleased changes and upcoming features in WUD (What's Up Docker?).
---

# Next (Unreleased)

> Changes below are merged on `main` and will be included in the upcoming release.

---

- 🐛 [REGISTRY] Fix cohabitation of default anonymous registries and custom instances (fixes #1316, #1321, closes #673)
- 🐛 [TRIGGER] Fix Docker trigger reporting success when image pull fails mid-stream (fixes #1324)
- 🐛 [TRIGGER] Fix targeted docker compose update for services sharing identical images (fixes #1323)
- 🐛 [WATCHER] Fix Kubernetes watcher keeping the old image version after a workload update (fixes #1338)
