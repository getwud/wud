# Changelog

## next

- :star: Skip tag listing for non-semver images
- :star: [MQTT] - Add customizable Home Assistant device ID and device name
- :star: [NOMAD] - Add Nomad trigger
- :lock: Migrate from Travis-CI to Github Actions
- :fire: Fix login redirect issues when WUD is exposed under a subpath
- :fire: [HTTP] - Mask HTTP auth password and bearer token values
- :fire: Preserve update results across registry errors
- :fire: [DOCKER-COMPOSE] - Prefer trigger-level configuration over automatic labels

## 8.3.1

- :star: Add `WUD_REGISTRY_HUB_PUBLIC_SUPPRESSDIGESTWATCHWARNING` env var
- :star: [GITLAB] - Add support for GitLab group access tokens
- :fire: [DOCKER-COMPOSE] - Fix trigger failing to detect containers in compose file
- :fire: [PROMETHEUS] - Reduce CPU usage
- :fire: [OIDC] - Fix issues when WUD starts while OIDC provider is temporarily unavailable
- :fire: [DOCKER] - Fix Docker container update when container is attached to multiple networks
- :fire: [UI] - Fix card overflow on home page
- :wrench: [TELEGRAM] - Replace deprecated client with direct HTTP API calls

## 8.3.0

- :star: Add opt-in mode for trigger association
- :star: Add SOCKS5/HTTP proxy support to Telegram trigger
- :star: Add runtime subpath proxy support with `WUD_SERVER_BASEPATH`
- :star: Add environment variable for default digest watching
- :star: [MQTT] - Improve trigger
- :star: [DISCORD] - Add avatar URL support
- :fire: Fix digest comparison for single-platform manifests resolved from a manifest list
- :fire: [NTFY] - Fix basic auth
- :fire: [UI] - Fix container filters on mobile
- :fire: [ECR] - Use link header for pagination
- :fire: Fix Passport auth
- :fire: [DOCKER-COMPOSE] - Fix services without images
- :fire: Fix text log format
- :wrench: Update OIDC library
- :wrench: Add multi-stage UI build to Dockerfile
- :wrench: Add Playwright e2e tests

## 8.2.2

- :star: Add public Codeberg registry (`codeberg.org`) to default supported registries
- :star: Add public Forgejo registry (`code.forgejo.org`) to default supported registries
- :fire: Fix startup errors for some users

## 8.2.1

- :wrench: Migrate backend to TypeScript
- :fire: [APPRISE] - Fix bad request error ("Payload lacks minimum requirements")
- :fire: [DISCORD] - Fix bad request error ("Invalid URL")
- :fire: [NTFY] - Fix token auth
- :fire: Fix metrics-related errors when Prometheus is disabled
- :fire: Fix `wud.watch.digest` not being respected

## 8.2.0

- :star: Add TrueForge Container Registry support (`oci.trueforge.org`)
- :star: Add Codeberg registry support
- :star: Allow disabling Prometheus metrics
- :star: Enable digest watching by default (except for Docker Hub images)
- :star: Ensure candidate tags retain the same number of semver parts
- :star: Ensure candidate tags retain the same prefix
- :star: Add support for `wud.compose.file` label
- :star: Add Rocket.Chat trigger
- :star: [SMTP] - Allow `from` address to include a display name
- :wrench: [UI] - Migrate to Vue 3
- :wrench: [UI] - Migrate to Vuetify 3
- :wrench: [UI] - Migrate to TypeScript
- :wrench: Upgrade to Node.js 24
- :wrench: Switch to Alpine Docker image
- :fire: Fix docker-compose YAML parsing with multiple aliases
- :fire: Ignore `sig` tags

## 8.1.1

- :fire: [TELEGRAM] - Fix Markdown character escaping

## 8.1.0

- :star: Add 60s default jitter to Docker watcher to prevent load spikes on Docker Hub
- :star: Add support for custom TLDs in SMTP trigger
- :star: Add title configuration to `telegram` and `slack` triggers
- :star: [UI] - Add support for [Homarr Labs](https://github.com/homarr-labs/dashboard-icons) icons
- :star: [UI] - Add support for sorting containers by oldest creation date
- :fire: Fix `prerelease` variable in link templates

## 8.0.1

- :star: Force watcher to check on startup only if store is empty ([#570](https://github.com/getwud/wud/issues/570))
- :fire: Fix default healthcheck when HTTP server is disabled ([#562](https://github.com/getwud/wud/issues/556))
- :fire: Fix missing Prometheus label ([#562](https://github.com/getwud/wud/issues/562))
- :fire: [DOCKER-COMPOSE] - Fix manual update ([#546](https://github.com/getwud/wud/issues/546))

## 8.0.0

- :star: [COMMAND] - Add support for [Command](configuration/triggers/command/) trigger
- :star: [DOCKER] - Add default healthcheck to the `wud` Docker image
- :star: [PUSHOVER] - Add support for optional message TTL
- :star: [REGISTRY] - Add support for multiple registries of the same type
- :star: [TRIGGER] - Add support for automatic or manual triggers
- :star: [TRIGGER] - Improve `title`, `body`, and `link` templates
- :star: [UI] - Add ability to group containers by label
- :star: New logo! :smile:
- :fire: [TRIGGER] - Fix association issue between specific triggers and containers
- :wrench: Add Prettier
- :wrench: Upgrade to Node.js 23

:::warning
**Breaking changes!** \
Registry configuration has changed; please update [your environment variables](configuration/registries/). \
Internal IDs have changed; your [existing state](configuration/storage/) will be reset.
:::

## 7.2.0

- :star: [TRIGGER] - Add support for associating specific triggers with specific containers
- :star: [UI] - General UX improvements
- :star: [UI/API] - Add support for manually running triggers to help with testing

## 7.1.1

- :fire: [NTFY] - Fix Basic/Bearer authentication

## 7.1.0

- :star: [GOTIFY] - Add support for [Gotify](configuration/triggers/gotify/) trigger
- :star: [NTFY] - Add support for [ntfy](configuration/triggers/ntfy/) trigger
- :star: [PUSHOVER] - Add support for HTML templating
- :fire: [UI] - Fix container list sorting

## 7.0.0

- :star: [UI] - Add support for [Selfh.st](https://selfh.st/icons/) icons
- :star: [Docker watcher] - Add `watchatstart` option to disable automatic check during startup

:::warning
**Breaking changes!** \
**WUD** has moved to its own organization! \
GitHub repository: [https://github.com/getwud/wud](https://github.com/getwud/wud) \
Docker image: [https://hub.docker.com/r/getwud/wud](https://hub.docker.com/r/getwud/wud)
:::

## 6.6.1

- :star: [API/UI] - Add option to allow/disallow delete operations (`WUD_SERVER_FEATURE_DELETE`)
- :star: [Apprise] - Add support for [Apprise persistent YAML configuration](https://github.com/caronc/apprise/wiki/config_yaml)
- :star: [DISCORD] - Add [Discord trigger](configuration/triggers/discord/)
- :star: [Docker / Docker-compose trigger] - Allow pruning old image versions (except current and candidate versions)
- :star: [FORGEJO] - Add support for [Forgejo registries](configuration/registries/forgejo/)
- :star: [GCR] - Allow anonymous access (for public images)
- :star: [GITEA] - Add support for [Gitea registries](configuration/registries/gitea/)
- :star: [HTTP trigger] - Add support for Basic and Bearer authentication
- :star: [HTTP trigger] - Add HTTP proxy support
- :star: [MQTT trigger / Home Assistant] - Replace binary sensors with [update sensors](https://www.home-assistant.io/integrations/update/)
- :star: [MQTT] - Add Home Assistant global sensors (total containers, pending updates, etc.)
- :star: [MQTT] - Prefix client ID with `wud_` instead of generic `mqttjs_`
- :star: [TELEGRAM] - Add [Telegram trigger](configuration/triggers/telegram/)
- :star: [UI] - Add dark mode
- :star: [UI] - Add filter dropdown for update types (major, minor, patch)
- :star: [UI] - Auto-focus login input field on page load
- :star: [UI] - Make filter values bookmarkable via URL query parameters
- :star: [UI] - Make watcher and registry names visible when container cards are collapsed
- :star: Add `watcher` variable to trigger templates
- :star: Reduce Docker image size
- :star: Upgrade all dependencies
- :star: Upgrade to Node.js 18

:::warning
**Breaking changes!** \
Home Assistant sensors are now created as `update` sensors instead of `binary` sensors. \
Existing Home Assistant entities must be manually cleaned up. \
Remember to update your Home Assistant automations and dashboards accordingly.
:::

## 5.22.1

- :star: [Docker / Docker-compose trigger] - Add dry-run mode (pull new images only)
- :star: [Docker watcher] - Add ability to listen for Docker daemon events
- :star: [ECR] - Add support for `public.ecr.aws` gallery
- :star: [MQTT trigger] - Add `update` device class for Home Assistant
- :star: [MQTT trigger] - Send MQTT message when container status changes
- :star: [MQTT trigger] - Add support for TLS and mTLS
- :star: [SMTP trigger] - Add ability to skip TLS certificate verification
- :star: [UI] - Add Progressive Web App (PWA) support for mobile devices
- :star: [UI] - Redesigned user interface
- :star: Add [Apprise](https://github.com/caronc/apprise) trigger
- :star: Add [CORS](../configuration/server/README.md) support
- :star: Add [Font Awesome](https://fontawesome.com/) and [Simple Icons](https://simpleicons.org/) support
- :star: Add [GitLab Registry](configuration/registries/gitlab/) support
- :star: Add [HTTPS/TLS support](../configuration/server/README.md)
- :star: Add ability to customize container display names and icons ([see `wud.display.name` and `wud.display.icon`](../configuration/watchers/README.md#labels))
- :star: Add ability to link container versions to release notes or changelogs ([see documentation](../configuration/watchers/README.md#associate-a-link-with-the-container-version))
- :star: Add watcher-level option to watch all container digests
- :star: Add authentication system ([see documentation](configuration/authentications/))
- :star: Add Authentik configuration guide
- :star: Track container status (running, stopped, etc.)
- :star: Add custom timeout option for OIDC authentication providers
- :star: Add Docker Compose examples to documentation
- :star: Add Docker Compose trigger ([see documentation](configuration/triggers/docker-compose/))
- :star: Add Docker trigger ([see documentation](configuration/triggers/docker/))
- :star: Add GitHub Container Registry support
- :star: Add Hotio registry support
- :star: Add LinuxServer Container Registry support (`lscr.io`)
- :star: Add OIDC automatic redirect capability
- :star: Add OpenID Connect authentication ([see documentation](configuration/authentications/oidc/))
- :star: Add Quay registry support (`quay.io`)
- :star: Add support for [custom registries](configuration/registries/custom/)
- :star: Add support for `${prerelease}` variable in link templates
- :star: Add configurable trigger thresholds ([see documentation](configuration/triggers/))
- :star: Add tag transform rules before update analysis ([see documentation](../configuration/watchers/README.md#transform-tags-before-performing-version-analysis))
- :star: Add customizable title and body templates for triggers
- :star: Add option to trigger notifications individually or in batches
- :star: Add option to ignore or repeat previous update notifications
- :star: Allow excluding specific containers from being monitored
- :star: Allow storing [secrets in external files](../configuration/README.md#secret-management)
- :star: Automatically enable digest watching for non-semver tags
- :star: Digest management performance optimizations
- :star: Embed Material Design icons and Google Fonts in UI for offline access
- :star: Enable anonymous access by default for public registries (Docker Hub, GHCR, Quay)
- :star: Highlight containers with new digests in the UI
- :star: Improve test code coverage
- :star: Improve log output
- :star: Publish WUD image to `ghcr.io` in addition to Docker Hub
- :star: Support `TZ` environment variable for local timezone configuration
- :star: Update all dependencies
- :star: Upgrade to Node.js 16
- :star: Watch individual containers instead of images

:::warning
**Breaking changes!** \
WUD is now **container-centric** instead of image-centric. \
The data model, API, and some integrations have changed. \
Please review the documentation before upgrading to evaluate any impacts on your setup.
:::

## 4.1.2

- :star: Add container name support
- :star: Add text log format (text by default instead of JSON)
- :star: Add option to monitor all containers (not just running ones)
- :star: Add support for non-semver image versions
- :star: Add TLS support for remote Docker daemon over TCP
- :star: Log current WUD version at startup

## 3.5.0

- :star: Add [Home Assistant](https://www.home-assistant.io/) MQTT integration
- :star: Add Prometheus metrics and health check endpoint
- :star: Add Pushover trigger
- :star: Add registry abstraction with ACR, ECR, GCR, and Docker Hub implementations
- :star: Bundle local assets instead of relying on external CDNs
- :star: Support sha256 image references
- :star: Update all dependencies

## 2.3.1

- :star: Add REST API
- :star: Add support for Docker Hub private repositories
- :star: Add web UI
- :star: Update dependencies
- :star: Upgrade to Node.js 14

## 1.0.0

- :star: Initial release!
