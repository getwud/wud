---
title: Next (Unreleased)
description: Unreleased changes and upcoming features in WUD (What's Up Docker?).
---

# Next (Unreleased)

> Changes below are merged on `main` and will be included in the upcoming release.

- 🐛 [UI] Fix container list not updating correctly via SSE events
- 🐛 [TRIGGER] Home Assistant Install button can now run `command`/`nomad` triggers, not just `docker`/`dockercompose`, and honors each container's `wud.trigger.include`/`wud.trigger.exclude` scoping (see getwud/wud#649)
- 🐛 [TRIGGER] Fix MQTT connection error logging and trigger status (fixes #1292)
- 🐛 [UI] Fix double vertical scrollbar on containers page (#1299)

---
