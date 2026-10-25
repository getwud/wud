---
title: Next (Unreleased)
description: Unreleased changes and upcoming features in WUD (What's Up Docker?).
---

# Next (Unreleased)

> Changes below are merged on `main` and will be included in the upcoming release.

- 🚀 [AUTH] Support a configured session secret via `WUD_AUTH_SESSION_SECRET`, while preserving the version and MAC-bound fallback when unset.
- 🚀 [CONTAINER] Add option to override update cooldown and trigger update immediately (fixes #1463)
- 🚀 [TRIGGER] Add XMPP trigger to send update notifications via XMPP/Jabber chat messages (the transitive `sasl-scram-sha-1` dependency is pinned to `1.3.0` with an npm override because `1.4.0` breaks SCRAM-SHA-1 authentication with `@xmpp/client`, see [xmppjs/xmpp.js#1127](https://github.com/xmppjs/xmpp.js/issues/1127); drop the override once `@xmpp/sasl` supports async SASL mechanisms)
- 🐛 [E2E] Update expected Home Assistant image version to 2026.10.4 in E2E scenarios
- 🐛 [TRIGGER] Do not copy Docker-generated MAC address when recreating container (#1464)
- 🐛 [WATCHER] Allow tag candidates with different version segment count when wud.tag.include is defined (fixes #1465)
- 🐛 [WATCHER] Index containers created while WUD was stopped during startup reconciliation (fixes #1466)

---
