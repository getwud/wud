---
title: Next (Unreleased)
description: Unreleased changes and upcoming features in WUD (What's Up Docker?).
---

# Next (Unreleased)

> Changes below are merged on `main` and will be included in the upcoming release.

- 🐛 [API] Require authentication on /api/events SSE endpoint (GHSA-hgmw-ffwv-wvm2)
- 🐛 [UI] Fix drawer triggers refresh on container change and SSE base path (fixes #1305)
- 🐛 [UI] Fix container list not updating correctly via SSE events
- 🐛 [TRIGGER] Home Assistant Install button can now run `command`/`nomad` triggers, not just `docker`/`dockercompose`, and honors each container's `wud.trigger.include`/`wud.trigger.exclude` scoping (see getwud/wud#649)
- 🐛 [TRIGGER] Fix MQTT connection error logging and trigger status (fixes #1292)
- 🐛 [WATCHER] Refresh container displayName on rename (Fixes #1298)
- 🐛 [UI] Fix double vertical scrollbar on containers page (#1299)
- 🐛 [REGISTRY] Custom registries now perform the OCI anonymous Bearer token exchange (following the registry's `WWW-Authenticate` challenge) when no static credentials are configured, fixing pulls from registries like `docker.elastic.co` that require it even for public images (fixes #1303)
- 🚀 [REGISTRY] Add typed support for Elastic Container Registry (docker.elastic.co)

---
