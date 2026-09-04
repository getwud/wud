---
title: Next (Unreleased)
description: Unreleased changes and upcoming features in What's Up Docker (WUD).
---

# Next (Unreleased)

> Changes below are merged on `main` and will be included in the upcoming release.

---

- 🚀 [DOCS] Add interactive UI live demo simulator with homelab mock data
- 🚀 [CI] Add automated UI screenshot capture pipeline with Playwright and dark mode support
- 🚀 [UI] Add demo mode with mock services for static deployment

- 🐛 [WATCHER] Fix WUD_WATCHER_LOCAL_WATCHATSTART=false being ignored on empty store (fixes #1184)
- 🐛 [TAG] Fix tag comparison when coerced semver versions are equal by falling back to string comparison (fixes #1183)
- 🐛 [UI] Fix group by label in containers table (fixes #1182)
