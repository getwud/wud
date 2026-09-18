---
title: Next (Unreleased)
description: Unreleased changes and upcoming features in WUD (What's Up Docker?).
---

# Next (Unreleased)

> Changes below are merged on `main` and will be included in the upcoming release.

---

- 🚀 [REGISTRY] Add icon configuration option for custom registries (fixes #716)
- 🚀 [TRIGGER] Add support for Telegram topics / message_thread_id (fixes #506)
- 🛠️ [DOCS] Add CSpell and Markdownlint quality gates for documentation
- 🚀 [TRIGGER] Add ondigest configuration option to filter out digest updates (fixes #756)
- 🚀 [UI] Add snooze functionality to temporarily or indefinitely ignore container updates (fixes #702)
- 🚀 [WATCHER] Add update delay / cool-down period before triggering updates (fixes #507)
- 🚀 [WATCHER] Add Kubernetes watcher provider for Deployments, StatefulSets, DaemonSets, and CronJobs
- 🚀 [WATCHER] Add HashiCorp Nomad watcher provider with full E2E test suite
- 🚀 [WATCHER] Standardize Kubernetes annotations and Nomad metadata on canonical getwud.app/ prefix with short aliases and unified workload documentation
- 🚀 [WATCHER] Add Docker Swarm watcher provider with automated E2E test suite
- 🐛 [REGISTRY] Fix default ecr.public provider matching for public.ecr.aws images (fixes #1251)
- 🐛 [TRIGGER] Prevent HTTP 500 error when manually running docker or dockercompose triggers on containers with no available update (fixes #1254)
- 🐛 [TRIGGER] Fix the docker trigger leaving WUD stopped when it updated its own container; it now refuses by default with an actionable error instead of failing silently (fixes #1241, #484)
- 🚀 [TRIGGER] Add selfupdate option to the docker trigger, delegating the swap of the WUD container to a short-lived helper container with health gating and rollback
- 🐛 [WATCHER] Respect explicit watch digest label for semver tags (fixes #1247, fixes #1191)
- 🐛 [UI] Fix infinite OIDC redirect loop when user is denied access (fixes #1258)
- 🛠️ [DOCS] Document trigger template variables and multi-host watcher placeholder (fixes #421)
- 🐛 [TAG] Fix SemVer ordering for 4-part numeric tags (e.g. LinuxServer) and numeric fallback comparison (fixes #1261)
- 🐛 [TRIGGER] Fix docker & dockercompose triggers masking new image env/labels with stale container defaults (#1201)
- 🐛 [LOG] Fix log level filtering dropping debug and trace logs when using multistream (fixes #1265)
