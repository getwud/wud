---
title: Next (Unreleased)
description: Unreleased changes and upcoming features in WUD (What's Up Docker?).
---

# Next (Unreleased)

> Changes below are merged on `main` and will be included in the upcoming release.

---

- 🚀 [CLI] Add one-shot headless mode (`WUD_RUN_MODE=oneshot`): run `wud watch` as a single scan with JSON output on stdout, exit codes for CI, `--fail-on-update`, `--update-available`, `--format=ndjson`, and `version`/`--help` commands. No database is created. See [One-Shot Headless Mode](../configuration/oneshot.md).
- 🚀 [PROMETHEUS] Add option to disable authentication for metrics endpoint (#878)
- 🚀 [UI] Display dedicated provider icons for triggers matching documentation
- 🚀 [API/UI] Add Server-Sent Events (SSE) support and asynchronous container watch
