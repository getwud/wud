---
title: Next (Unreleased)
description: Unreleased changes and upcoming features in What's Up Docker (WUD).
---

# Next (Unreleased)

> Changes below are merged on `main` and will be included in the upcoming release.

---

- 🚀 `TRIGGER` Add AMQP / RabbitMQ trigger (AMQP 0-9-1 broker support)
- 🚀 `TRIGGER` Add NATS trigger (NATS messaging system)
- 🚀 `TRIGGER` Add GitHub Actions trigger (repository_dispatch events)
- 🚀 `TRIGGER` Add GitLab CI trigger (Pipeline Trigger API)
- 🚀 `TRIGGER` Add Opsgenie trigger (Atlassian Alerts API)
- 🚀 `TRIGGER` Add PagerDuty trigger (Events API v2)
- 🚀 `TRIGGER` Add Uptime Kuma trigger (Push Monitors)
- 🚀 `TRIGGER` Add Signal trigger (via signal-cli REST API)
- 🚀 `TRIGGER` Add WhatsApp trigger (via Meta WhatsApp Cloud API)
- 🚀 `TRIGGER` Add Bark trigger (iOS Push Notifications)
- 🚀 `TRIGGER` Add Home Assistant webhook trigger
- 🚀 `TRIGGER` Add Prowl trigger (iOS Push Notifications)
- 🚀 `TRIGGER` Add Matrix trigger (Client-Server API)
- 🚀 `TRIGGER` Add Mattermost trigger (Incoming Webhooks)
- 🚀 `TRIGGER` Add Zulip trigger (Streams and Direct Messages API)
- 🚀 Skip tag listing for non-semver images
- 🚀 `MQTT` Add customizable Home Assistant device ID and device name
- 🚀 `NOMAD` Add Nomad trigger
- 🚀 `REGISTRIES` Refactor registries to leverage Docker Registry v2 inheritance and standardize unit tests
- 🚀 `REGISTRIES` Add support for Alibaba Cloud (ACR), DigitalOcean (DOCR), Harbor, IBM Cloud (ICR), Inedo ProGet, JFrog Artifactory, Linode, Oracle Cloud (OCIR), Scaleway, and Sonatype Nexus
- 🚀 `UI` Standardize icon rendering with Iconify (`@iconify/vue`), enabling access to over 150,000+ icons (Material Design, Simple Icons, Selfh.st, SVG Logos, Font Awesome, etc.)
- 🚀 `UI` Complete visual redesign: modern SaaS layout with flattened sidebar navigation, streamlined full-height viewports, refined color palette harmonized with the documentation, and responsive dark/light themes
- 🚀 Migrate doc from Docsify to Docusaurus
- 🐛 Fix login redirect issues when WUD is exposed under a subpath
- 🐛 `HTTP` Mask HTTP auth password and bearer token values
- 🐛 Preserve update results across registry errors
- 🐛 `REGISTRIES` Bound concurrent registry requests and retry transient HTTP 429 responses
- 🐛 `DOCKER-COMPOSE` Prefer trigger-level configuration over automatic labels
- 🐛 `UI` Fix dynamic chunk loading failure (`ChunkLoadError`) when navigating between nested configuration routes
- ⚠️ `UI` Deprecate Homarr icon prefix (`hl:`, `hl-`) in favor of `selfhst:` (automatically mapped with a deprecation warning)
- 🔧 `UI` Update dependencies to latest versions (Vue 3, Vuetify 3, Vue Router 4) and remove unnecessary packages
- 🔧 `UI` Refactor components into Single File Components (SFCs) by merging separate `.ts` scripts into `.vue` files
- 🔧 `E2E` Modernize UI end-to-end Playwright tests with improved selectors and automatic environment cleanup
- 🔧 `CI` Migrate CI workflow from Travis-CI to GitHub Actions
- 🔧 `CI` Add automated UI E2E testing job running with containerized dependencies
