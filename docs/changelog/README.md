# Changelog

## dev
- :lock: Migrate backend to typescript
- :fire: [APPRISE] - Fix bad request error ("Payload lacks minimum requirements")
- :fire: [DISCORD] - Fix bad request error ("Invalid URL")

## 8.2.0
- :star: Add TrueForge Container Registry support (oci.trueforge.org)
- :star: Add Codeberge registry
- :star: Allow disabling Prometheus metrics
- :star: Enable digest watching by default (except for Docker hub images)
- :star: Ensure tag candidates keep same number of semver parts
- :star: Ensure tag candidates keep same prefix
- :star: Add `wud.compose.file` supported label
- :star: Add Rocket.chat trigger
- :star: [SMTP] - Allow from address to take a display name
- :lock: [UI] - Migrate to Vue 3
- :lock: [UI] - Migrate to Vuetify 3
- :lock: [UI] - Migrate to typescript
- :lock: Upgrade to node.js 24
- :lock: Switch to Alpine docker image
- :fire: Fix docker-compose yaml when many aliases
- :fire: Ignore `sig` tags

## 8.1.1
- :fire: [TELEGRAM] - Fix markdown character escape

## 8.1.0
- :star: Add 60s default jitter in docker watcher to avoid load spike on Docker Hub
- :star: Add support for custom TLDs in SMTP trigger
- :star: Add title to `telegram` and `slack` triggers
- :star: [UI] - Add support for [Homarr Labs](https://github.com/homarr-labs/dashboard-icons) icons
- :star: [UI] - Add support for sorting containers by oldest creation date
- :fire: Fix prerelase variable in link template

## 8.0.1
- :star: Force watcher to watch at startup only if store is empty ([#570](https://github.com/getwud/wud/issues/570))
- :fire: Fix default healthcheck when http server is disabled ([#562](https://github.com/getwud/wud/issues/556))
- :fire: Fix missing Prometheus label ([#562](https://github.com/getwud/wud/issues/562))
- :fire: [DOCKER-COMPOSE] - Fix manual update ([#546](https://github.com/getwud/wud/issues/546))

## 8.0.0
- :star: [COMMAND] - Add support for [Command](/configuration/triggers/command/) trigger
- :star: [DOCKER] - Add default healthcheck to the `wud` docker image
- :star: [PUSHOVER] - Add support for optional message TTL
- :star: [REGISTRY] - Add support for multiple registries of the same type
- :star: [TRIGGER] - Add support for automatic or manual triggers
- :star: [TRIGGER] - Improve `title`, `body` and `link` templates
- :star: [UI] - Add ability to group containers by label
- :star: New logo! :smile:
- :fire: [TRIGGER] - Fix specific triggers to specific containers association issue
- :lock: Add prettier
- :lock: Upgrade to node.js 23

!> **Breaking changes!** \
Registry configuration has changed; please adapt [your environment variables](/configuration/registries/) \
Internal ids has changed; your [existing state](/configuration/storage/) will be reset

## 7.2.0
- :star: [TRIGGER] - Add support for associating specific triggers to specific containers
- :star: [UI] - Some ux improvements
- :star: [UI/API] - Add support for manually running triggers to help with configuration

## 7.1.1
- :fire: [NTFY] - Fix basic/bearer authentication

## 7.1.0
- :star: [GOTIFY] - Add support for [Gotify](/configuration/triggers/gotify/) trigger
- :star: [NTFY] - Add support for [Ntfy](/configuration/triggers/ntfy/) trigger
- :star: [PUSHOVER] - Add support for HTML templating
- :fire: [UI] - Fix container list sort

## 7.0.0
- :star: [UI] - Add support for [Selfh.st](https://selfh.st/icons/) icons
- :star: [Docker watcher] - Add new `watchatstart` option to disable automatic watch during startup

!> **Breaking changes!** \
**WUD** is moving to its own organization! \
Github project is now located at [https://github.com/getwud/wud](https://github.com/getwud/wud) \
Docker image is now located at [https://hub.docker.com/r/getwud/wud](https://hub.docker.com/r/getwud/wud)

## 6.6.1
- :star: [API/UI] - Add a feature to allow/disallow delete operations (`WUD_SERVER_FEATURE_DELETE`)
- :star: [Apprise] - Add support for [Apprise persistent yaml configuration](https://github.com/caronc/apprise/wiki/config_yaml)
- :star: [DISCORD] - Add [Discord trigger](configuration/triggers/discord/)
- :star: [Docker / Docker-compose trigger] - Allow to prune old versions (except current one and candidate one)
- :star: [FORGEJO] - Add support for [Forgejo registries](/configuration/registries/forgejo/)
- :star: [GCR] - Allow anonymous access (for public images)
- :star: [GITEA] - Add support for [Gitea registries](/configuration/registries/gitea/)
- :star: [HTTP trigger] - Add support for Basic/Bearer authentication
- :star: [HTTP trigger] - Add support for Http proxy
- :star: [Mqtt trigger / Home-assistant] - Replace binary sensors by [update sensors](https://www.home-assistant.io/integrations/update/)
- :star: [MQTT] - Add home-assistant global sensors (number of containers, number of containers to update...)
- :star: [MQTT] - Prefix client id with `wud_` instead of the generic `mqttjs_` prefix 
- :star: [TELEGRAM] - Add [Telegram trigger](configuration/triggers/telegram/)
- :star: [UI] - Add dark mode
- :star: [UI] - Add filter dropdown for update kinds (major, minor...)
- :star: [UI] - Focus login input field on page load
- :star: [UI] - Make filter values bookmarkable (url query params)
- :star: [UI] - Make watcher and registry names visible when container box is collapsed
- :star: Add `watcher` placeholder visible to trigger templates  
- :star: Reduce docker image size
- :star: Upgrade all dependencies
- :star: Upgrade to node.js 18

!> **Breaking changes!** \
New Home-Assistant sensors are now created as `update` sensors instead of `binary` sensors. \
Existing Home-Assistant sensors must be manually cleaned up. \
Do not forget to adjust your existing HA configuration accordingly (automations, dashboards... if needed) 

## 5.22.1
- :star: [Docker / Docker-compose trigger] - Add dry-run feature (pull only new images)
- :star: [Docker watcher] - Add ability to listen to Docker events
- :star: [ECR] Add support for public.ecr.aws gallery
- :star: [Mqtt trigger] - Add `update` class to home-assistant devices
- :star: [Mqtt trigger] - Send mqtt message when container status change
- :star: [Mqtt trigger] Add support for (m)TLS
- :star: [Smtp trigger] - Add ability to skip tls verify
- :star: [UI] - Add PWA (Progressive Web Application) for better mobile experience
- :star: [UI] - Revamping
- :star: Add [Apprise](https://github.com/caronc/apprise) trigger
- :star: Add [CORS](configuration/server/?id=server) support
- :star: Add [Fontawesome icons](https://fontawesome.com/) and [Simple icons](https://simpleicons.org/) support
- :star: Add [Gitlab Registry](/configuration/registries/gitlab/) support
- :star: Add [HTTPS support](configuration/server/?id=server)
- :star: Add ability to customize the display of the container ([see `wud.display.name` and `wud.display.icon`](configuration/watchers/?id=label))
- :star: Add ability to specify a link pointing to the container version (changelog...) ([see here](configuration/watchers/?id=associate-a-link-to-the-container-version))
- :star: Add ability to watch all container digests (at `watcher` level)
- :star: Add Authentication system ([see here](configuration/authentications/))
- :star: Add Authentik configuration documentation
- :star: Add Container status (running, stopped...)
- :star: Add custom timeout configuration on OIDC authentication providers
- :star: Add Docker Compose examples to the documentation
- :star: Add Docker Compose Trigger ([see here](configuration/triggers/docker-compose/))
- :star: Add Docker Trigger ([see here](configuration/triggers/docker/))
- :star: Add Github Container Registry support
- :star: Add Hotio Registry support
- :star: Add LinuxServer Container Registry support (lscr.io)
- :star: Add OIDC auto redirect capabilities
- :star: Add Openid Connect authentication ([see here](configuration/authentications/oidc/))
- :star: Add Quay Registry support (quay.io)
- :star: Add support for [custom registries](configuration/registries/custom/)
- :star: Add support for `prerelease` placeholder in link templates
- :star: Add Trigger configurable threshold ([see here](configuration/authentications/triggers/))
- :star: Add Trigger configuration to be able to transform tags before performing the analysis ([see here](configuration/watchers/?id=transform-the-tags-before-performing-the-analysis))
- :star: Add Trigger configuration to customize title / body templates
- :star: Add Trigger configuration to fire container updates individually or to fire all container updates as 1 batch
- :star: Add Trigger configuration to ignore/repeat previous updates
- :star: Allow excluding specific containers from being watched
- :star: Allow to externalize [secrets to external files](/configuration/?id=secret-management) 
- :star: Automatically enable digest watching for non semver tags
- :star: Digest management optimizations
- :star: Embed Material Design icons & Google fonts in UI for offline access
- :star: Enable by default all registries with possible anonymous access (hub, ghcr, quay)
- :star: Highlight containers in UI when new digest
- :star: Improve code coverage
- :star: Improve logs
- :star: Push wud image to ghcr.io in addition to docker hub
- :star: Support TZ env var for local time configuration
- :star: Update all dependencies
- :star: Upgrade to nodejs 16
- :star: Watch individual containers instead of images

!> **Breaking changes!** \
WUD is now **container centric** instead of image centric. \
The data model changed, the API changed, some integrations changed... \
Please take a look at the documentation before upgrading to analyse all potential impacts on your integrations.

## 4.1.2
- :star: Add Container name
- :star: Add Log format (text by default instead of json)
- :star: Add Option to watch all containers (not only the running ones)
- :star: Add Support for Non Semver image versions
- :star: Add TLS support for Remote Docker API over TCP
- :star: Add WUD current version in the logs

## 3.5.0
- :star: Add [Home-Assistant](https://www.home-assistant.io/) MQTT integration
- :star: Add Prometheus metrics & HealthCheck endpoint
- :star: Add Pushover trigger
- :star: Add Registry Concept & ACR / ECR / GCR / Docker Hub (private repositories) implementations
- :star: Load local assets instead of relying on external CDN
- :star: Support sha256 image references
- :star: Update all dependencies

## 2.3.1
- :star: Add REST API
- :star: Add support for Docker Hub private repositories
- :star: Add UI
- :star: Update dependencies
- :star: Upgrade to Node.js 14

## 1.0.0
- :star: Yeah!
