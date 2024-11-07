# Changelog

# 7.1.0 (wip)
- :star: [PUSHOVER] - Add support for HTML templating
- :fire: [UI] - Fix container list sort

# 7.0.0
- :star: [UI] - Add support for [Selfh.st](https://selfh.st/icons/) icons
- :star: [Docker watcher] - Add new `watchatstart` option to disable automatic watch during startup

!> **Breaking changes!** \
**WUD** is moving to its own organization! \
- Github project is now located at [https://github.com/getwud/wud](https://github.com/getwud/wud)
- Docker image is now located at [https://hub.docker.com/r/getwud/wud](https://hub.docker.com/r/getwud/wud)

# 6.6.1
- :fire: [UI] - Fix container view (mobile layout)
- :fire: [API/UI] - Sort by default containers by watcher, registry, name and version

# 6.6.0
- :star: [UI] - Make watcher and registry names visible when container box is collapsed
- :fire: Fix edge case where comparing different tags with identical digests (e.g. `mongo:8` = `mongo:8.0.0`)
- :fire: [UI] - Fix sporadic 401 error when loading backend info from the UI

# 6.5.0
- :star: [API/UI] - Add a feature to allow/disallow delete operations (`WUD_SERVER_FEATURE_DELETE`)
- :star: [UI] - Add filter dropdown for update kinds (major, minor...)
- :star: [UI] - Make filter values bookmarkable (url query params)
- :star: Upgrade all dependencies
- :fire: [SMTP] - Make user / password optional (e.g. for posfix usage)
- :fire: [QUAY] - Fix quay.io paging API

# 6.4.1
- :fire: [GHCR] - Bring back username because needed for image pulling

# 6.4.0
- :star: [HTTP trigger] - Add support for Basic/Bearer authentication
- :star: [HTTP trigger] - Add support for Http proxy
- :star: Upgrade to node.js 18
- :star: Upgrade all dependencies

!> **Breaking changes!** \
Hotio.dev registry specific support has been dropped; it's now automatically covered by the GHCR registry.

# 6.3.0
- :star: [GITEA] - Add support for [Gitea registries](/configuration/registries/gitea/)
- :star: [FORGEJO] - Add support for [Forgejo registries](/configuration/registries/forgejo/)
- :star: [GCR] - Allow anonymous access (for public images)
- :star: [DISCORD] - Add [Discord trigger](configuration/triggers/discord/)
- :star: [UI] - Add dark mode
- :star: Upgrade all dependencies

# 6.2.0
- :star: [MQTT] - Add home-assistant global sensors (number of containers, number of containers to update...)
- :star: [TELEGRAM] - Add [Telegram trigger](configuration/triggers/telegram/)

# 6.1.1
- :fire: [Docker watcher] - Fix `manifest not found` error on `arm64` images when no `variant` is defined

# 6.1.0
- :star: [Docker / Docker-compose trigger] - Allow to prune old versions (except current one and candidate one)
- :star: [Apprise] - Add support for [Apprise persistent yaml configuration](https://github.com/caronc/apprise/wiki/config_yaml)
- :star: [MQTT] - Prefix client id with `wud_` instead of the generic `mqttjs_` prefix 
- :star: [UI] - Focus login input field on page load
- :star: Upgrade all dependencies
- :star: Reduce docker image size
- :fire: [GHCR] - Fix bearer authentication (username is not needed anymore)
- :fire: [GHCR] - Fix anonymous authentication
- :fire: [PUSHOVER] - Allow to set needed `expire`, `retry` properties when `priority=2`

# 6.0.2
- :star: Add `watcher` placeholder visible to trigger templates  
- :fire: Fix support for `application/vnd.oci.image.index.v1+json manifests`
- :fire: [HUB] Fix images from Docker hub prepended with `docker.io/` 

# 6.0.1
- :fire: [Mqtt trigger / Home-assistant] - Fix update sensor state for non semver images (e.g.`latest`, `dev`...)

# 6.0.0
- :star: [Mqtt trigger / Home-assistant] - Replace binary sensors by [update sensors](https://www.home-assistant.io/integrations/update/)

!> **Breaking changes!** \
New Home-Assistant sensors are now created as `update` sensors instead of `binary` sensors. \
Existing Home-Assistant sensors must be manually cleaned up. \
Do not forget to adjust your existing HA configuration accordingly (automations, dashboards... if needed) 

# 5.22.1
- :fire: Fix netlify es-sorter lib deprecation warning

# 5.22.0
- :star: [Mqtt trigger] Add support for (m)TLS
- :star: Update all dependencies
- :fire: [Docker-compose trigger] Fix containers updated whereas not belonging to the Compose file

# 5.21.0
- :star: [ECR] Add support for public.ecr.aws gallery
- :star: Allow to externalize [secrets to external files](/configuration/?id=secret-management) 
- :fire: [UI] Fix misaligned icons in sidebar

# 5.20.3
- :fire: [Docker-compose trigger] Fix missing comments & formatting when rewriting the docker-compose.yaml file
- :fire: [Docker-compose trigger] Improve docker-compose.yaml file parsing errors

# 5.20.2
- :fire: Fix favicon on Firefox

# 5.20.1
- :star: Update all dependencies
- :fire: Fix LSCR registry (github credentials are now required)

# 5.20.0
- :star: Add [Gitlab Registry](/configuration/registries/gitlab/) support

# 5.19.0
- :star: Add Hotio Registry support
- :star: Add custom timeout configuration on OIDC authentication providers
- :fire: Fix missing transform function calls when computing links and semver comparisons

# 5.18.0
- :star: Add support for `prerelease` placeholder in link templates
- :fire: Rename trigger `single` mode to `simple` mode for better consistency with `simple_title` and `simple_body` variables

# 5.17.2
- :fire: [Home-Assistant] - Fix entity id when multiple identical containers on different hosts

# 5.17.1
- :fire: [Docker / Docker-compose trigger] - Fix error when recreating a container using `network_mode: service:other_service`

# 5.17.0
- :star: Add [CORS](configuration/server/?id=server) support
- :star: Add [Fontawesome icons](https://fontawesome.com/) and [Simple icons](https://simpleicons.org/) support

# 5.16.2
- :fire: [Docker / Docker-compose trigger] - Fix prune old image when updateKind=digest

# 5.16.1
- :fire: Fix regression on basic Auth authentication (present in `5.16.0`)

# 5.16.0
- :star: Add support for [custom registries](configuration/registries/custom/)
- :star: Enable by default all registries with possible anonymous access (hub, ghcr, quay)
- :star: Add [HTTPS support](configuration/server/?id=server)
- :star: Update all dependencies
- :fire: [Docker / Docker-compose trigger] - Fix error when pulling from private registry

# 5.15.0
- :star: Add ability to customize the display of the container ([see `wud.display.name` and `wud.display.icon`](configuration/watchers/?id=label))
- :fire: [Docker / Docker-compose trigger] - Add cloning Network settings from current container 

# 5.14.1
- :star: [MQTT trigger] - Add `update` class to home-assistant devices
- :fire: [Docker / Docker-compose trigger] - Fix errors when pulling the new image
- :fire: [Quay.io registry] - Fix paging error

# 5.14.0
- :star: [UI] - Revamping

# 5.13.0
- :star: [UI] - Add PWA (Progressive Web Application) for better mobile experience

# 5.12.1
- :star: [Mqtt trigger] - Send mqtt message when container status change
- :fire: [Smtp trigger] - Fix documentation regarding how to configure Gmail since _less secure apps_ are disabled.

## 5.12.0
- :star: [Docker watcher] - Add ability to listen to Docker events
- :star: [Docker / Docker-compose trigger] - Add dry-run feature (pull only new images)
- :star: [Smtp trigger] - Add ability to skip tls verify
- :star: Update all dependencies

## 5.11.2
- :star: Push wud image to ghcr.io in addition to docker hub
- :fire: Remove extra blank lines from Pushover notifications

## 5.11.1
- :fire: Rollback node-open-id dependency version from v5 to v4 because of JWT signature error (experimented on Authelia) 

## 5.11.0
- :star: Add OIDC auto redirect capabilities
- :star: Add Authentik configuration documentation
- :fire: Fix wrong updateAvailable value when transform function is used

## 5.10.0
- :star: Add LinuxServer Container Registry support (lscr.io)
- :star: Add Quay Registry support (quay.io)
- :star: Update all dependencies

## 5.9.0
- :star: Add Docker Trigger ([see here](configuration/triggers/docker/))
- :star: Add Docker Compose Trigger ([see here](configuration/triggers/docker-compose/))
- :star: Add Trigger configuration to customize title / body templates
- :star: Add Trigger configuration to fire container updates individually or to fire all container updates as 1 batch
- :star: Add Trigger configuration to ignore/repeat previous updates
- :star: Add Trigger configuration to be able to transform tags before performing the analysis ([see here](configuration/watchers/?id=transform-the-tags-before-performing-the-analysis))
- :fire: Remove the container `Refresh` button from the UI because confusing

## 5.8.0
- :star: Automatically enable digest watching for non semver tags
- :fire: Rollback update detection for non semver tags (added in `5.7.1`)

!> **Deprecation warnings** \
[`WUD_WATCHER_{watcher_name}_WATCHDIGEST` environment variable](/configuration/watchers/?id=variables) is deprecated and won't be supported in upcoming versions.

## 5.7.2
- :fire: [UI] Fix container bad state after manual refresh (or refresh all)

## 5.7.1
- :fire: Improve update detection for non semver tags

## 5.7.0
- :star: Add Container status (running, stopped...)
- :star: Add ability to watch all container digests (at `watcher` level)
- :star: Update all dependencies
- :fire: Add support for prerelease tags (e.g. 1.2.3-alpha1)

## 5.6.0
- :star: Add Trigger configurable threshold ([see here](configuration/authentications/triggers/))

## 5.5.0
- :star: Add Openid Connect authentication ([see here](configuration/authentications/oidc/))
- :fire: Fix duplicate notifications when multiple Docker watchers configured

## 5.4.0
- :star: Add Authentication system ([see here](configuration/authentications/))
- :star: Add ability to specify a link pointing to the container version (changelog...) ([see here](configuration/watchers/?id=associate-a-link-to-the-container-version))
- :star: Update all dependencies

## 5.3.0
- :star: Add [Apprise](https://github.com/caronc/apprise) trigger
- :star: Support TZ env var for local time configuration
- :star: Improve logs
- :star: Update all dependencies
- :fire: Fix [DEP0152] DeprecationWarning (caused by prom-client)
- :fire: Fix paging issue when getting tag list (proven error on Github Container Registry)

## 5.2.0
- :star: Allow excluding specific containers from being watched
- :star: Add Github Container Registry support
- :star: Add Docker Compose examples to the documentation

## 5.1.0
- :star: Upgrade to nodejs 16
- :star: Embed Material Design icons & Google fonts in UI for offline access
- :star: Update all dependencies
- :star: Improve code coverage

## 5.0.2
- :fire: Fix digest wrong results for v1 manifests

## 5.0.1
- :star: Highlight containers in UI when new digest
- :fire: Fix wrong update status when new digest
- :fire: Fix container removal when container went away

## 5.0.0
- :star: New UI
- :star: Watch individual containers instead of images
- :star: Digest management optimizations

!> **Breaking changes!** \
WUD is now **container centric** instead of image centric. \
The data model changed, the API changed, some integrations changed... \
Please take a look at the documentation before upgrading to analyse all potential impacts on your integrations.

## 4.1.2
- :fire: Add better support for tags partially coerced as semver 

## 4.1.1
- :fire: Fix error when image doesn't have a RepoDigest (e.g. locally built images)
- :fire: Fix documentation bad links

## 4.1.0
- :star: Revamp documentation
- :fire: Fix wrong digests for arch different from amd64
- :fire: Remove the hass sensor when the container goes away

## 4.0.2
- :star: Add WUD current version in the logs
- :fire: Fix false-positive notifications

## 4.0.1
- :star: Add Container name
- :fire: Fix missing digest for images with v2 manifests

## 4.0.0
- :star: Add Support for Non Semver image versions
- :star: Add TLS support for Remote Docker API over TCP
- :star: Add Option to watch all containers (not only the running ones)
- :star: Add Log format (text by default instead of json)

## 3.5.0
- :star: Add Registry Concept & ACR / ECR / GCR / Docker Hub (private repositories) implementations
- :star: Add [Home-Assistant](https://www.home-assistant.io/) MQTT integration
- :star: Add Prometheus metrics & HealthCheck endpoint
- :star: Support sha256 image references
- :star: Load local assets instead of relying on external CDN
- :star: Add Pushover trigger
- :star: Update all dependencies
- :fire: Fix toggle menu in UI
- :fire: Fix missing Http Trigger
- :fire: Fix duplicated images
- :fire: Fix IFTTT trigger
- :fire: Fix semver candidates filter

## 2.3.1
- :star: Add REST API
- :star: Add UI
- :star: Add support for Docker Hub private repositories
- :star: Upgrade to Node.js 14
- :star: Update dependencies
- :fire: Fix error when current tag is a "coerced" semver
- :fire: Fix missing Http Trigger

## 1.0.0
- :star: Yeah!
