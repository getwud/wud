---
title: Next (Unreleased)
description: Unreleased changes and upcoming features in WUD (What's Up Docker?).
---

# Next (Unreleased)

> Changes below are merged on `main` and will be included in the upcoming release.

- 🚀 [REGISTRY] Add authenticated registry webhooks to immediately check matching watched images through existing update and trigger policies.
- 🚀 [REGISTRY] Skip non-container OCI artifacts (Helm charts) when resolving update candidates (fixes #1363)
- 🚀 [TRIGGER] Add lifecycle events and failure/rollback hooks for container updates (fixes #1008)
- 🚀 [TRIGGER] Add summary mode for Home Assistant MQTT discovery (fixes #1357)
- 🚀 [TRIGGER] Support extras in Gotify trigger (fixes #960)
- 🚀 [TRIGGER] Support granular per-trigger enable/disable container labels (fixes #691)
- 🚀 [UI] Support HTTP(S) and data image URLs for container display icons (#994)
- 🚀 [WATCHER] Include container name in tag transform error logs (fixes #752)
- 🐛 [AUTH] Support multiple pending callback states and serialized redirect session checks in OIDC (fixes #896)
- 🐛 [REGISTRY] Fix OCIR Bearer token exchange for private repositories (#1367)
- 🐛 [TAG] Fix CalVer upgrade comparison when container is already on CalVer (fixes #1361)
- 🐛 [TRIGGER] Exclude wud-self-update helper container from watcher scan (fixes #1356)
- 🐛 [TRIGGER] Fix container recreation on Docker 29 with containerd store (fixes #1081)
- 🐛 [TRIGGER] Handle pinned image digests when updating compose file (fixes #834)
- 🐛 [TRIGGER] Prevent auto-update loop when container has no resolvable new tag (fixes #1007)
- 🐛 [TRIGGER] Prevent concurrent transactions and rollback archive deletion on the same compose project (fixes #1368)
- 🐛 [UI] Add digest option to update kind filter on containers page (fixes #1364)
- 🐛 [UI] Add fallback mechanism for copy to clipboard on non-secure contexts and Wayland (fixes #1359)
- 🐛 [UI] Fix Live Watch HUD completion under reverse proxies and unhandled watcher errors (fixes #1360)
- 🐛 [UI] Restore version position next to current version in container header (fixes #1068)
- 🐛 [WATCHER] Fix image ID treated as digest under Podman (fixes #934)
- 🐛 [WATCHER] Fix image name and tag resolution for digest-pinned containers in Docker watcher (fixes #1362)
- 🐛 [WATCHER] Improve error handling and logging during container image processing (fixes #989)

---
