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
- 🚀 [WATCHER] Report the remote version label and build date of a digest update: `result.version` (from `org.opencontainers.image.version`) and `result.created` are now resolved from the remote image config, so the API, Prometheus and triggers can describe a digest update as `2.3.6 -> 2.3.7` instead of `sha256:8978d2f5 -> sha256:3eb277ac`. Each remote digest is resolved at most once and reused while the update stays pending, and the config digest already known from the manifest is reused where possible, so an up-to-date container costs no extra registry request and a pending one costs a single blob fetch
