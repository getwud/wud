---
title: Next (Unreleased)
description: Unreleased changes and upcoming features in WUD (What's Up Docker?).
---

# Next (Unreleased)

> Changes below are merged on `main` and will be included in the upcoming release.

- 🚀 [UI] Support HTTP(S) and data image URLs for container display icons (#994)
- 🚀 [REGISTRY] Add authenticated registry webhooks to immediately check matching watched images through existing update and trigger policies.
- 🚀 [REGISTRY] Skip non-container OCI artifacts (Helm charts) when resolving update candidates (fixes #1363)
- 🐛 [TRIGGER] Exclude wud-self-update helper container from watcher scan (fixes #1356)
- 🐛 [TAG] Fix CalVer upgrade comparison when container is already on CalVer (fixes #1361)
- 🐛 [REGISTRY] Fix OCIR Bearer token exchange for private repositories (#1367)
- 🐛 [UI] Add fallback mechanism for copy to clipboard on non-secure contexts and Wayland (fixes #1359)
- 🐛 [WATCHER] Fix image name and tag resolution for digest-pinned containers in Docker watcher (fixes #1362)
- 🐛 [UI] Add digest option to update kind filter on containers page (fixes #1364)
- 🐛 [UI] Fix Live Watch HUD completion under reverse proxies and unhandled watcher errors (fixes #1360)
- 🚀 [TRIGGER] Add summary mode for Home Assistant MQTT discovery (fixes #1357)
- 🐛 [TRIGGER] Prevent concurrent transactions and rollback archive deletion on the same compose project (fixes #1368)
- 🚀 [TRIGGER] Add lifecycle events and failure/rollback hooks for container updates (fixes #1008)
- 🐛 [TRIGGER] Prevent auto-update loop when container has no resolvable new tag (fixes #1007)
- 🐛 [UI] Restore version position next to current version in container header (fixes #1068)
- 🐛 [TRIGGER] Fix container recreation on Docker 29 with containerd store (fixes #1081)
- 🐛 [WATCHER] Improve error handling and logging during container image processing (fixes #989)
- 🐛 [WATCHER] Fix image ID treated as digest under Podman (fixes #934)

---
