---
title: Next (Unreleased)
description: Unreleased changes and upcoming features in WUD (What's Up Docker?).
---

# Next (Unreleased)

> Changes below are merged on `main` and will be included in the upcoming release.

- 🚀 [TRIGGER] Add automatic rollback on HEALTHCHECK failure (#1300)

---

- 🐛 [REGISTRY] Fix cohabitation of default anonymous registries and custom instances (fixes #1316, #1321, closes #673)
- 🐛 [TRIGGER] Fix Docker trigger reporting success when image pull fails mid-stream (fixes #1324)
- 🐛 [TRIGGER] Fix targeted docker compose update for services sharing identical images (fixes #1323)
- 🐛 [WATCHER] Fix Kubernetes watcher keeping the old image version after a workload update (fixes #1338)
- 🚀 [WATCHER] Add include filter and label-based regex matching for Docker watcher (#1336)
- 🐛 [WATCHER] Fix registry-level digest watching default for stored containers (fixes #1337)
- 🐛 [CONFIGURATION] Fix `__FILE` secrets stripping trailing newline characters (fixes #1347)
- 🐛 [WATCHER] Swarm watcher refreshes container when service image changes (fixes #1340)
- 🐛 [WATCHER] Nomad watcher refreshes container when task image changes (fixes #1341)
- 🚀 [WATCHER] Support dynamic semver variable interpolation in tag filters (fixes #1156)
- 🚀 [DEPS] Upgrade project dependencies
