# Docker-Compose
![logo](docker-compose.png)

The `dockercompose` trigger lets you update docker-compose.yml files & replace existing containers with their updated versions.

The trigger will:
- Update the related docker-compose.yml file
- Clone the existing container specification
- Pull the new image
- Stop the existing container
- Remove the existing container
- Create the new container
- Start the new container (if the previous one was running)
- Remove the previous image (optionally)

### Variables

| Env var                                           | Required       | Description                                                    | Supported values | Default value when missing |
| ------------------------------------------------- |:--------------:| -------------------------------------------------------------- | ---------------- | -------------------------- | 
| `WUD_TRIGGER_DOCKERCOMPOSE_{trigger_name}_FILE`   | :red_circle:   | The docker-compose.yml file location                           |                  |                            |
| `WUD_TRIGGER_DOCKERCOMPOSE_{trigger_name}_BACKUP` | :white_circle: | Backup the docker-compose.yml file as `.back` before updating? | `true`, `false`  | `false`                    |
| `WUD_TRIGGER_DOCKERCOMPOSE_{trigger_name}_PRUNE`  | :white_circle: | If the old image must be pruned after upgrade                  | `true`, `false`  | `false`                    |
| `WUD_TRIGGER_DOCKERCOMPOSE_{trigger_name}_DRYRUN` | :white_circle: | When enabled, only pull the new image ahead of time            | `true`, `false`  | `false`                    |

?> This trigger also supports the [common configuration variables](configuration/triggers/?id=common-trigger-configuration). but only supports the `batch` mode.

!> This trigger will only work with locally watched containers.

!> Do not forget to mount the docker-compose.yml file in the wud container.

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
      - WUD_TRIGGER_DOCKERCOMPOSE_EXAMPLE_FILE=/wud/docker-compose.yml
```
#### **Docker**
```bash
docker run \
  -v /etc/my-services/docker-compose.yml:/wud/docker-compose.yml
  -e "WUD_TRIGGER_DOCKERCOMPOSE_EXAMPLE_FILE=/wud/docker-compose.yml" \
  ...
  getwud/wud
```
<!-- tabs:end -->
