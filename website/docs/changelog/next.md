---
title: Next (Unreleased)
description: Unreleased changes and upcoming features in WUD (What's Up Docker?).
---

# Next (Unreleased)

> Changes below are merged on `main` and will be included in the upcoming release.

---

- 🚀 [API] Add `POST /api/containers/triggers/{type}/{name}` to run a trigger once for several containers, so batch-capable triggers such as `dockercompose` rewrite and recreate a compose stack only once; triggers now expose `supportsBatch` (#767, #1410)
- 🚀 [TRIGGER] Docker Compose trigger recreates the services of a stack in `depends_on` order when several of them are updated together: dependencies first (waiting for `service_healthy` ones), dependents after, WUD itself last; a failed service stops the recreation of its dependents (#1410)
- 🚀 [TRIGGER] Docker Compose trigger gains `WUD_TRIGGER_DOCKERCOMPOSE_{trigger_name}_RECREATE=false` to only rewrite the Compose file and leave the restart to you (#1410)
- 🚀 [UI] Select several containers on the Containers page and update them together with "Update selected"; "Add rest of stack" completes the selection with the other updatable containers of the same compose stack(s) (#767, #1410)
- 🚀 [WATCHER] Track the upstream (base) image of locally built containers with the `wud.image.name` label or the OCI `org.opencontainers.image.base.name` annotation; registry lookups target the upstream image, digest watching is disabled and pull-based update triggers refuse such containers; the UI flags these containers and switches the update flow to a rebuild (fixes #664)
- 🐛 [CORE] Fix Docker HEALTHCHECK POSIX shell syntax and support TLS when `WUD_SERVER_TLS_ENABLED=true` (fixes #1580)
- 🐛 [CORE] Fix Docker entrypoint signal handling and exit code propagation, and tear down active SSE connections promptly during graceful shutdown (fixes #1589)
- 🐛 [TRIGGER] Adopt the new image `HEALTHCHECK` when recreating a container instead of carrying over the one inherited from the old image
- 🐛 [TRIGGER] Ignore post-update image prune errors in Docker trigger when another container still uses the image (fixes #1588)
- 🐛 [TRIGGER] Preserve file ownership and permissions when updating Docker Compose files (fixes #1577)
- 🐛 [WATCHER] Reconcile store containers when the Docker event stream reconnects (fixes #1575)
- 🐛 [WATCHER] Show only the Docker connection settings in use: host, port and TLS files for a remote watcher, the socket for a local one (fixes #1591)
