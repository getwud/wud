---
title: Next (Unreleased)
description: Unreleased changes and upcoming features in WUD (What's Up Docker?).
---

# Next (Unreleased)

> Changes below are merged on `main` and will be included in the upcoming release.

---

- 🚀 [WATCHER] Track the upstream (base) image of locally built containers with the `wud.image.name` label or the OCI `org.opencontainers.image.base.name` annotation; registry lookups target the upstream image, digest watching is disabled and pull-based update triggers refuse such containers; the UI flags these containers and switches the update flow to a rebuild (fixes #664)
- 🐛 [CORE] Fix Docker HEALTHCHECK POSIX shell syntax and support TLS when `WUD_SERVER_TLS_ENABLED=true` (fixes #1580)
- 🐛 [CORE] Fix Docker entrypoint signal handling and exit code propagation, and tear down active SSE connections promptly during graceful shutdown (fixes #1589)
- 🐛 [TRIGGER] Adopt the new image `HEALTHCHECK` when recreating a container instead of carrying over the one inherited from the old image
- 🐛 [TRIGGER] Preserve file ownership and permissions when updating Docker Compose files (fixes #1577)
- 🐛 [WATCHER] Reconcile store containers when the Docker event stream reconnects (fixes #1575)
