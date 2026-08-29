---
title: Next (Unreleased)
description: Unreleased changes and upcoming features in What's Up Docker (WUD).
---

# Next (Unreleased)

> Changes below are merged on `main` and will be included in the upcoming release.

---

- 🚀 Skip tag listing for non-semver images
- 🚀 `MQTT` Add customizable Home Assistant device ID and device name
- 🚀 `NOMAD` Add Nomad trigger
- 🚀 `REGISTRIES` Refactor registries to leverage Docker Registry v2 inheritance and standardize unit tests
- 🚀 `REGISTRIES` Add support for Alibaba Cloud (ACR), DigitalOcean (DOCR), Harbor, IBM Cloud (ICR), Inedo ProGet, JFrog Artifactory, Linode, Oracle Cloud (OCIR), Scaleway, and Sonatype Nexus
- 🚀 Migrate doc from Docsify to Docusaurus
- 🐛 Fix login redirect issues when WUD is exposed under a subpath
- 🐛 `HTTP` Mask HTTP auth password and bearer token values
- 🐛 Preserve update results across registry errors
- 🐛 `DOCKER-COMPOSE` Prefer trigger-level configuration over automatic labels
- 🔒 Migrate CI workflow from Travis-CI to GitHub Actions
