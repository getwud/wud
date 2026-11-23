---
title: Next (Unreleased)
description: Unreleased changes and upcoming features in WUD (What's Up Docker?).
---

# Next (Unreleased)

> Changes below are merged on `main` and will be included in the upcoming release.

---

- 🐛 [TRIGGER] Adopt the new image `HEALTHCHECK` when recreating a container instead of carrying over the one inherited from the old image
- 🐛 [TRIGGER] Preserve file ownership and permissions when updating Docker Compose files (fixes #1577)
- 🐛 [WATCHER] Reconcile store containers when the Docker event stream reconnects (fixes #1575)
