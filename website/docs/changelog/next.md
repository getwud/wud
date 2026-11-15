---
title: Next (Unreleased)
description: Unreleased changes and upcoming features in WUD (What's Up Docker?).
---

# Next (Unreleased)

> Changes below are merged on `main` and will be included in the upcoming release.

- 🚀 [UI] Update kind filter on the Containers page now supports selecting several kinds at once (e.g. patch + minor) (#1558)
- 🚀 [WATCHER] Report the best available update per semver kind (`result.candidates`: major / minor / patch); the Containers page shows them next to the main update (e.g. a patch release besides a minor one) (#1558)
- 🐛 [CORE] Preserve leading zeros and support padStart/padEnd in link templates (#1551)
- 🐛 [REGISTRY] Optimize GHCR tag pagination with semver cursor and add registry rate limit pacing (#1552)
- 🐛 [TRIGGER] Fix MQTT summary topics refresh on container update (#1550)
- 🐛 [TRIGGER] Fix Telegram batch mode MarkdownV2 escaping and formatting (fixes #1548)
- 🐛 [TRIGGER] Mask credentials in Apprise trigger base URL
- 🐛 [WATCHER] Fix cool-down delay ignored for tag updates when digest watching is disabled (#1543)
- 🐛 [WATCHER] Fix Docker Compose container pruning and label sync on recreate events (fixes #1559)
- 🐛 [WATCHER] Fix Swarm service label update when image is unchanged (fixes #1549)
- 🐛 [WATCHER] Populate candidate digest on SemVer updates when digest watching is disabled (fixes #1542)

---
