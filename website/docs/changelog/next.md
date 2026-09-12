---
title: Next (Unreleased)
description: Unreleased changes and upcoming features in WUD (What's Up Docker?).
---

# Next (Unreleased)

> Changes below are merged on `main` and will be included in the upcoming release.

---

- 🐛 [AUTH] Hide basic strategy from login when no local users exist in database
- 🚀 [AUTH] Add rogroup and defaultrole support to OIDC authentication provider (fixes #1232)
- 🚀 [COMMUNITY] Add GitHub Sponsors integration across repository and documentation
- 🐛 [DOCS] Fix live demo chunk loading, footer API link, and duplicate version badges
- 📝 [DOCS] Clarify OIDC admin group configuration and remove invalid global env var reference (fixes #1226)
- 📝 [DOCS] Update documentation URLs in registry error logs to point to getwud.app (fixes #1233)
- 🐛 [STORE] Fix container query filtering on updateAvailable and hydrated properties (fixes #1197)
- 🧪 [TESTS] Add end-to-end MQTT and Home Assistant discovery test suite
- 🐛 [TESTS] Fix getVersion test dynamic package.json assertion and add test gates to release script
- 🐛 [UI] Fix application version display in UI, mock data, and store
- 🛠️ [RELEASE] Improve release script for non-major versions and prune unreleased changelog from doc snapshots

