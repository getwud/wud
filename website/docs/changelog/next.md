---
title: Next (Unreleased)
description: Unreleased changes and upcoming features in WUD (What's Up Docker?).
---

# Next (Unreleased)

> Changes below are merged on `main` and will be included in the upcoming release.

- 🐛 [UI] Fix container list not updating correctly via SSE events
- 🚀 [TRIGGER] Add automatic rollback on HEALTHCHECK failure for the Docker and Docker Compose triggers (`WUD_TRIGGER_{DOCKER,DOCKERCOMPOSE}_{name}_ROLLBACK/ROLLBACKWINDOW/ROLLBACKINTERVAL/ROLLBACKGRACE` env vars and `wud.rollback.*` labels), including a liveness grace period for images without a `HEALTHCHECK`, a project-wide revert for Compose stacks, and rollback notifications

---
