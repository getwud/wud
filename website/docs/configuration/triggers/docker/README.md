import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Docker

![logo](docker.svg)

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

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_DOCKER_{trigger_name}_DRYRUN"
    required={false}
    type="boolean"
    defaultValue="false">
    When enabled, only pull the new image ahead of time without updating
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_DOCKER_{trigger_name}_PRUNE"
    required={false}
    type="boolean"
    defaultValue="false">
    Prune the old image after the upgrade completes
  </ConfigOption>
</ConfigList>
:::info
This trigger also supports [common trigger configuration options](../README.md#common-trigger-configuration).
:::

:::info
This trigger automatically reuses Docker connection settings from the [configured Docker watchers](configuration/watchers/) and can perform updates on both local and remote Docker hosts.
:::

### Examples

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_DOCKER_LOCAL_PRUNE=true
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e "WUD_TRIGGER_DOCKER_LOCAL_PRUNE=true" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>
