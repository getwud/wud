---
title: Next (Unreleased)
description: Unreleased changes and upcoming features in What's Up Docker (WUD).
---

# Next (Unreleased)

> Changes below are merged on `main` and will be included in the upcoming release.

---

- 🚀 [STORE] Migrate persistence layer from LokiJS to SQL (SQLite) with Drizzle ORM, automatic schema migrations, and transparent legacy data migration
- 🚀 [LOG] Migrate logger from unmaintained Bunyan to Pino with Pino-pretty formatting
- 🚀 [UI] Add live logs viewer via Server-Sent Events (SSE)
- 🚀 [DOCS] Add interactive UI live demo simulator with homelab mock data
- 🚀 [CI] Add automated UI screenshot capture pipeline with Playwright and dark mode support
- 🚀 [UI] Add demo mode with mock services for static deployment
- 🚀 [REGISTRY] Enable anonymous access by default for Gitlab public registry
- 🚀 [REGISTRY] Enable anonymous access by default for LSCR and TrueForge public registries
- 🚀 [REGISTRY] Support direct bearer-token authentication for custom registries

- 🐛 [WATCHER] Fix docker watcher crashing on startup when `watchdigestdefault` is configured by restoring the property and passing it to registries (fixes #1150)
- 🐛 [REGISTRY] Fix Gitlab registry provider ignoring configuration defaults (fixes Gitlab registry integration)
- 🐛 [WATCHER] Fix docker watcher ignoring container labels when registry provider is unknown (fixes #1124)
- 🐛 [WATCHER] Fix tag listing exclusion for non-semver tags breaking digest updates when `wud.tag.include` is used (fixes #1164)
- 🐛 [WATCHER] Fix WUD_WATCHER_LOCAL_WATCHATSTART=false being ignored on empty store (fixes #1184)
- 🐛 [TAG] Fix tag comparison when coerced semver versions are equal by falling back to string comparison (fixes #1183)
- 🐛 [UI] Fix group by label in containers table (fixes #1182)
