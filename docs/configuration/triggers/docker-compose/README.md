# Docker Compose

![logo](docker-compose.png)

The `dockercompose` trigger automatically updates `docker-compose.yml` files and recreates containers with their updated images.

When triggered, WUD will:

- Update the image tag in the corresponding `docker-compose.yml` file
- Clone the existing container configuration
- Pull the new image
- Stop the running container
- Remove the old container
- Create the new container
- Start the new container (if the previous container was running)
- Prune the old image (optional)

### Variables

| Env var                                           |    Required    | Description                                                          | Supported values | Default value when missing                                               |
| ------------------------------------------------- | :------------: | -------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------ |
| `WUD_TRIGGER_DOCKERCOMPOSE_{trigger_name}_FILE`   | :white_circle: | Path to the `docker-compose.yml` file inside the container           | File path        | Value of the container's `com.docker.compose.project.config_files` label |
| `WUD_TRIGGER_DOCKERCOMPOSE_{trigger_name}_BACKUP` | :white_circle: | Back up `docker-compose.yml` to `.back` before updating              | `true`, `false`  | `false`                                                                  |
| `WUD_TRIGGER_DOCKERCOMPOSE_{trigger_name}_PRUNE`  | :white_circle: | Prune the old image after the upgrade completes                      | `true`, `false`  | `false`                                                                  |
| `WUD_TRIGGER_DOCKERCOMPOSE_{trigger_name}_DRYRUN` | :white_circle: | When enabled, only pull the new image ahead of time without updating | `true`, `false`  | `false`                                                                  |

?> This trigger supports [common trigger configuration options](configuration/triggers/?id=common-trigger-configuration) and runs in `batch` mode only.

!> This trigger only works with locally monitored containers on the same Docker host.

!> Ensure the `docker-compose.yml` file is mounted into the WUD container. If relying on the automatic `com.docker.compose.project.config_files` label, mount the file at the exact same path inside the container as on the Docker host.

### Examples

<!-- tabs:start -->

#### **Docker Compose**

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    volumes:
      - /etc/my-services/docker-compose.yml:/wud/docker-compose.yml
    environment:
      - WUD_TRIGGER_DOCKERCOMPOSE_LOCAL_FILE=/wud/docker-compose.yml
```

#### **Docker**

```bash
docker run \
  -v /etc/my-services/docker-compose.yml:/wud/docker-compose.yml \
  -e "WUD_TRIGGER_DOCKERCOMPOSE_LOCAL_FILE=/wud/docker-compose.yml" \
  ...
  getwud/wud
```

#### **Container Label**

```yaml
labels:
  - wud.compose.file=/my/path/docker-compose.yaml
```

<!-- tabs:end -->
