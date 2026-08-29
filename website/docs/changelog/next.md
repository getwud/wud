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
- 🚀 `UI` Standardize icon rendering with Iconify (`@iconify/vue`), enabling access to over 150,000+ icons (Material Design, Simple Icons, Selfh.st, SVG Logos, Font Awesome, etc.)
- 🚀 Migrate doc from Docsify to Docusaurus
- 🐛 Fix login redirect issues when WUD is exposed under a subpath
- 🐛 `HTTP` Mask HTTP auth password and bearer token values
- 🐛 Preserve update results across registry errors
- 🐛 `DOCKER-COMPOSE` Prefer trigger-level configuration over automatic labels
- 🐛 `UI` Fix dynamic chunk loading failure (`ChunkLoadError`) when navigating between nested configuration routes
- ⚠️ `UI` Deprecate Homarr icon prefix (`hl:`, `hl-`) in favor of `selfhst:` (automatically mapped with a deprecation warning)
- 🔧 `UI` Update dependencies to latest versions (Vue 3, Vuetify 3, Vue Router 4) and remove unnecessary packages
- 🔧 `UI` Refactor components into Single File Components (SFCs) by merging separate `.ts` scripts into `.vue` files
- 🔧 `E2E` Modernize UI end-to-end Playwright tests with improved selectors and automatic environment cleanup
- 🔧 `CI` Migrate CI workflow from Travis-CI to GitHub Actions
- 🔧 `CI` Add automated UI E2E testing job running with containerized dependencies
