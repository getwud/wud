# Docker

![logo](docker.png)

The `docker` trigger automatically replaces standalone containers with their updated versions.

When triggered, WUD will:

- Clone the existing container configuration
- Pull the new image
- Stop the running container
- Remove the old container
- Create the new container
- Start the new container (if the previous container was running)
- Prune the old image (optional)

### Variables

| Env var                                    |    Required    | Description                                                          | Supported values | Default value when missing |
| ------------------------------------------ | :------------: | -------------------------------------------------------------------- | ---------------- | -------------------------- |
| `WUD_TRIGGER_DOCKER_{trigger_name}_PRUNE`  | :white_circle: | Prune the old image after the upgrade completes                      | `true`, `false`  | `false`                    |
| `WUD_TRIGGER_DOCKER_{trigger_name}_DRYRUN` | :white_circle: | When enabled, only pull the new image ahead of time without updating | `true`, `false`  | `false`                    |

?> This trigger also supports [common trigger configuration options](configuration/triggers/?id=common-trigger-configuration).

?> This trigger automatically reuses Docker connection settings from the [configured Docker watchers](configuration/watchers/) and can perform updates on both local and remote Docker hosts.

### Examples

<!-- tabs:start -->

#### **Docker Compose**

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_DOCKER_LOCAL_PRUNE=true
```

#### **Docker**

```bash
docker run \
  -e "WUD_TRIGGER_DOCKER_LOCAL_PRUNE=true" \
  ...
  getwud/wud
```

<!-- tabs:end -->
