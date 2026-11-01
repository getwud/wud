---
title: Next (Unreleased)
description: Unreleased changes and upcoming features in WUD (What's Up Docker?).
---

# Next (Unreleased)

> Changes below are merged on `main` and will be included in the upcoming release.

- 🐛 [REGISTRY] Support Bearer token authentication for Alibaba ACR (fixes #1519)
- 🚀 [TRIGGER] Add XMPP trigger to send update notifications via XMPP/Jabber chat messages (the transitive `sasl-scram-sha-1` dependency is pinned to `1.3.0` with an npm override because `1.4.0` breaks SCRAM-SHA-1 authentication with `@xmpp/client`, see [xmppjs/xmpp.js#1127](https://github.com/xmppjs/xmpp.js/issues/1127); drop the override once `@xmpp/sasl` supports async SASL mechanisms)
- 🚀 [TRIGGER] Support rollback notifications in the XMPP trigger
- 🐛 [TRIGGER] Always close the XMPP connection when sending a message fails
- 🐛 [TRIGGER] Fail fast when the XMPP server is unreachable instead of hanging forever (new `WUD_TRIGGER_XMPP_{trigger_name}_TIMEOUT` option)
- 🐛 [REGISTRY] Mask proxy credentials in registry configurations
- 🐛 [TRIGGER] Mask proxy credentials in HTTP trigger configurations

---
