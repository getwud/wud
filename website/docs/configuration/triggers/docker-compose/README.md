import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Docker Compose

![logo](docker-compose.svg)

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

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_DOCKERCOMPOSE_{trigger_name}_BACKUP"
    required={false}
    type="boolean"
    defaultValue="false">
    Back up `docker-compose.yml` to `.back` before updating
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_DOCKERCOMPOSE_{trigger_name}_DRYRUN"
    required={false}
    type="boolean"
    defaultValue="false">
    When enabled, only pull the new image ahead of time without updating
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_DOCKERCOMPOSE_{trigger_name}_FILE"
    type="path"
    required={false}
    defaultValue="com.docker.compose.project.config_files"
    supported="File path">
    Path to the `docker-compose.yml` file inside the container
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_DOCKERCOMPOSE_{trigger_name}_PRUNE"
    required={false}
    type="boolean"
    defaultValue="false">
    Prune the old image after the upgrade completes
  </ConfigOption>
</ConfigList>
:::info
This trigger supports [common trigger configuration options](../README.md#common-trigger-configuration) and runs in `batch` mode only.
:::

:::warning[This trigger only works with locally monitored containers on the same Docker host.]
:::

:::warning[Ensure the `docker-compose.yml` file is mounted into the WUD container. If relying on the automatic `com.docker.compose.project.config_files` label, mount the file at the exact same path inside the container as on the Docker host.]
:::

### Examples

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

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

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -v /etc/my-services/docker-compose.yml:/wud/docker-compose.yml \
  -e "WUD_TRIGGER_DOCKERCOMPOSE_LOCAL_FILE=/wud/docker-compose.yml" \
  ...
  getwud/wud
```

</TabItem>
<TabItem value="container-label" label="Container Label">

```yaml
labels:
  - wud.compose.file=/my/path/docker-compose.yaml
```

</TabItem>
</Tabs>
