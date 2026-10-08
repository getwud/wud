---
title: Next (Unreleased)
description: Unreleased changes and upcoming features in WUD (What's Up Docker?).
---

# Next (Unreleased)

> Changes below are merged on `main` and will be included in the upcoming release.

- 🚀 [REGISTRY] Add authenticated registry webhooks to immediately check matching watched images through existing update and trigger policies.
- 🚀 [REGISTRY] Skip non-container OCI artifacts (Helm charts) when resolving update candidates (fixes #1363)
- 🐛 [TRIGGER] Exclude wud-self-update helper container from watcher scan (fixes #1356)

---
