---
title: Next (Unreleased)
description: Unreleased changes and upcoming features in WUD (What's Up Docker?).
---

# Next (Unreleased)

> Changes below are merged on `main` and will be included in the upcoming release.

- 🚀 [CORE] Detect SemVer diff behind floating tags using OCI version metadata (closes #1502)
- 🚀 [TRIGGER] Add XMPP trigger to send update notifications via XMPP/Jabber chat messages (the transitive `sasl-scram-sha-1` dependency is pinned to `1.3.0` with an npm override because `1.4.0` breaks SCRAM-SHA-1 authentication with `@xmpp/client`, see [xmppjs/xmpp.js#1127](https://github.com/xmppjs/xmpp.js/issues/1127); drop the override once `@xmpp/sasl` supports async SASL mechanisms)
- 🚀 [TRIGGER] Support rollback notifications in the XMPP trigger
- 🚀 [WATCHER] Configure Docker digest watching centrally per container name with `CONTAINERDIGESTS`, preserving label precedence and existing defaults.
- 🐛 [REGISTRY] Fix resolution of OCI manifests missing mediaType property in payload (fixes #1530)
- 🐛 [REGISTRY] Mask proxy credentials in registry configurations
- 🐛 [REGISTRY] Support Bearer token authentication for Alibaba ACR (fixes #1519)
- 🐛 [TRIGGER] Always close the XMPP connection when sending a message fails
- 🐛 [TRIGGER] Fail fast when the XMPP server is unreachable instead of hanging forever (new `WUD_TRIGGER_XMPP_{trigger_name}_TIMEOUT` option)
- 🐛 [TRIGGER] Fix Windows path separator normalization for docker-compose trigger path mapping (#1527)
- 🐛 [TRIGGER] Mask proxy credentials in HTTP trigger configurations
- 🐛 [TRIGGER] Prevent MQTT trigger from crashing process when broker is disconnected (fixes #1520)

---
