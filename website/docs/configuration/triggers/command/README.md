---
title: Command
description: Run custom shell commands and automation scripts upon container updates in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Command

<DocHero
  icon="command"
  description="The command trigger executes a shell command or script whenever container updates are detected."
/>

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_COMMAND_{trigger_name}_CMD"
    required={true}
    type="string">
    The shell command or script path to execute
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_COMMAND_{trigger_name}_SHELL"
    type="path"
    required={false}
    defaultValue="/bin/sh"
    supported="Valid installed shell path (e.g. `/bin/sh`, `/bin/bash`)">
    Shell binary path to use for execution
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_COMMAND_{trigger_name}_TIMEOUT"
    required={false}
    type="integer"
    defaultValue="60000"
    supported="Positive integer (`0` for no timeout)">
    Command execution timeout in milliseconds
  </ConfigOption>
</ConfigList>

:::info
This trigger also supports all [common trigger configuration options](../README.md#common-trigger-configuration) (such as thresholds, scheduling, and batching).
:::

---

## 🚀 Examples

### Run an Inline Shell Command

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_COMMAND_LOCAL_CMD=echo "$${display_name} can be updated to $${update_kind_remote_value}"
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e 'WUD_TRIGGER_COMMAND_LOCAL_CMD=echo "${display_name} can be updated to ${update_kind_remote_value}"' \
  getwud/wud
```

</TabItem>
</Tabs>

### Run a Mounted Shell Script

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    volumes:
      - ./trigger.sh:/wud/trigger.sh:ro
    environment:
      - WUD_TRIGGER_COMMAND_LOCAL_CMD=/wud/trigger.sh
      - WUD_TRIGGER_COMMAND_LOCAL_SHELL=/bin/bash
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -v ./trigger.sh:/wud/trigger.sh:ro \
  -e WUD_TRIGGER_COMMAND_LOCAL_CMD="/wud/trigger.sh" \
  -e WUD_TRIGGER_COMMAND_LOCAL_SHELL="/bin/bash" \
  getwud/wud
```

</TabItem>
</Tabs>

---

## 📦 Environment Variables Passed to Command

### In Simple Mode (One execution per update)

The following environment variables are exported to the child process:

- `display_icon`: Container display icon (e.g. `mdi:docker`)
- `display_name`: Container display name (e.g. `web-app`)
- `id`: Docker container ID
- `image_architecture`: OS architecture (e.g. `amd64`, `arm64`)
- `image_created`: Timestamp of image creation
- `image_digest_repo`: Remote image digest SHA-256
- `image_digest_watch`: Whether digest watching is active
- `image_id`: Local Docker image ID
- `image_name`: Image repository name (e.g. `library/nginx`)
- `image_os`: Target operating system (e.g. `linux`)
- `image_registry_name`: Registry identifier in WUD
- `image_registry_url`: Base URL of the container registry
- `image_tag_semver`: Whether tag follows semantic versioning
- `image_tag_value`: Current running tag
- `name`: Raw container name
- `result_tag`: Candidate update tag
- `status`: Current container status (e.g. `running`)
- `update_available`: `true`
- `update_kind_kind`: Update type (`tag` or `digest`)
- `update_kind_local_value`: Current local version value
- `update_kind_remote_value`: New remote version value
- `update_kind_semver_diff`: Semver bump type (`major`, `minor`, `patch`)
- `watcher`: Watcher identifier
- `container_json`: Full serialized JSON representation of the container object

### In Batch Mode (One execution for a batch of updates)

- `containers_json`: Full serialized JSON array containing all updated container objects
