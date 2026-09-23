---
title: Next (Unreleased)
description: Unreleased changes and upcoming features in WUD (What's Up Docker?).
---

# Next (Unreleased)

> Changes below are merged on `main` and will be included in the upcoming release.

---

- 🚀 [REGISTRY] Add custom User-Agent to registry requests (fixes #685)
- 🐛 [WATCHER] Fix container temporary name persistence when containers are renamed (fixes #770)
- 🚀 [PROMETHEUS] Add option to disable authentication for metrics endpoint (#878)
- 🚀 [UI] Display dedicated provider icons for triggers matching documentation
- 🚀 [API/UI] Add Server-Sent Events (SSE) support and asynchronous container watch
- 🐛 [TAG] Harden tag candidate filtering and SemVer comparison against exotic variants and pre-releases (fixes #1278)
- 🐛 [REGISTRY] Fix HTTPS proxy support for outgoing requests (fixes #982)
- 🐛 [TRIGGER] Gracefully handle missing watcher in Docker and Docker Compose triggers (fixes #1287)
- 📚 [DOCS] Comprehensive guide for remote Docker hosts and multi-host monitoring (fixes #579)
