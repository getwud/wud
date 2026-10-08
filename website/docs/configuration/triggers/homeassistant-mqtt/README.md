---
title: Home Assistant (MQTT Auto-Discovery)
description: Integrate WUD with Home Assistant using MQTT Auto-Discovery for update entities and one-click installs.
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Home Assistant (MQTT Auto-Discovery)

<DocHero
  icon="simple-icons:homeassistant"
  description="The Home Assistant MQTT integration provides native Update entities, device topology, and one-click container installations."
/>

---

## 🏠 Home Assistant Integration

WUD integrates deeply with [Home Assistant](https://www.home-assistant.io/) via [MQTT Auto-Discovery](https://www.home-assistant.io/docs/mqtt/discovery/). This is the recommended and most feature-rich way to connect WUD to Home Assistant.

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_MQTT_HASS_URL=mqtt://homeassistant.local:1883
      - WUD_TRIGGER_MQTT_HASS_HASS_ENABLED=true
      - WUD_TRIGGER_MQTT_HASS_HASS_DISCOVERY=true
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_MQTT_HASS_URL="mqtt://homeassistant.local:1883" \
  -e WUD_TRIGGER_MQTT_HASS_HASS_ENABLED="true" \
  -e WUD_TRIGGER_MQTT_HASS_HASS_DISCOVERY="true" \
  getwud/wud
```

</TabItem>
</Tabs>

### 🔄 Update Entity & One-Click Install

Containers are exposed in Home Assistant as native **`update` entities** (e.g. `update.wud_local_my_container`):

- **Installed Version**: Displays the current image tag (or digest).
- **Latest Version**: Displays the available update tag (or truncated digest for digest-based updates).
- **Update Action ("Install" button)**: When clicking **Install** on an update entity in Home Assistant, an MQTT command is sent to WUD via `command_topic` (`{topic}/{watcher}/{container}/install` with payload `INSTALL`).
- **In-Progress State**: WUD sets `in_progress: true` while the update runs, triggers the update trigger associated with the container (see below), and resets `in_progress: false` once completed.

:::tip[Requirements for One-Click Install]
To enable the **Install** button to perform container updates, make sure you have configured an update-capable trigger such as:

- [Docker Trigger](../docker/README.md) for standalone containers.
- [Docker Compose Trigger](../docker-compose/README.md) for compose stacks.
- [Command Trigger](../command/README.md) to run a custom update script (e.g. a wrapper that decrypts secrets before recreating the container).
- [Nomad Trigger](../nomad/README.md) for Nomad-orchestrated containers.

:::

#### Choosing which trigger the Install button runs

The Install button fires exactly one associated trigger per container, the same one the web UI's own **Update** dialog would default to: it prefers a `docker`/`docker-compose` trigger when one is associated with the container, otherwise it falls back to whichever other update-capable trigger (`command`, `nomad`) is associated.

"Associated" honors the same [`wud.trigger.include` / `wud.trigger.exclude` container labels](../../watchers/labels.md) used everywhere else in WUD. This matters if the built-in `docker`/`docker-compose` update logic isn't correct for a given container — for example, a compose stack that needs a custom script to decrypt secrets before running `docker compose up -d`. In that case, associate a [Command Trigger](../command/README.md) with the container and exclude the default `docker`/`docker-compose` trigger so the Install button runs your script instead:

```yaml
services:
  my-app:
    image: my-app
    labels:
      - wud.trigger.exclude=dockercompose.default
```

With that label, the Install button (and the web UI's Update dialog) will resolve to the container's `command` trigger instead of the excluded `dockercompose.default` trigger.

:::note[Multiple associated triggers of the same priority]
If a container ends up with more than one non-`docker`/`docker-compose` trigger associated at once (e.g. two `command` triggers, neither excluded), the Install button picks whichever one sorts first alphabetically by `{type}.{name}` — the same tie-break the web UI's Update dialog uses. This is a deterministic rule, but not necessarily an obvious one, so if you have more than one candidate trigger for a container, use `wud.trigger.include`/`wud.trigger.exclude` to name the one you want explicitly rather than relying on alphabetical ordering.
:::

### 📦 Device Topology (Per-Watcher Devices)

To keep Home Assistant devices organized and clean:

- **Watcher Devices**: Each watcher gets its own dedicated device (e.g. `wud (local)` for a watcher named `local`). All containers monitored by this watcher are grouped under this device.
- **Global WUD Device**: Represents the core WUD service, providing connection status (`binary_sensor`), total container count (`sensor`), total update count (`sensor`), and global update status (`binary_sensor`).

:::note[Migrating from Previous Versions]
When upgrading to this version, if the legacy monolithic **wud** device already exists in Home Assistant, it is recommended to delete it from the Home Assistant UI (**Settings > Devices & services > MQTT > wud device > Delete**). Home Assistant will then cleanly rediscover the new per-watcher devices (`wud_<watcher>`) alongside the global `wud` device without orphan entities or duplicates.
:::

### 📋 Summary Mode (Lite Integration)

On larger setups with many containers or watchers, exposing individual Home Assistant `update` entities can flood the **Settings > Updates** panel, entity registry, and recorder.

To avoid this entity explosion while still getting full visibility into available updates, set `WUD_TRIGGER_MQTT_{trigger_name}_HASS_DISCOVERY_ENTITIES=summary`:

- **Summary topic (`{topic}/updates`)**: Publishes a retained JSON array of all containers that currently have an update available. If no updates are pending, publishes an empty array (`[]`). Each item includes:
  - `name`: Container name
  - `displayName`: Container display name (falls back to name)
  - `watcher`: Watcher name
  - `stack`: Compose project / stack name (if known)
  - `kind`: Update kind (`tag` or `digest`)
  - `localValue`: Currently deployed tag or digest
  - `remoteValue`: Newly available tag or digest
  - `semverDiff`: SemVer change type (`major`, `minor`, `patch`, `prerelease`, if applicable)
  - `link`: Release notes / repository link (if available)
- **Single Summary Sensor (`sensor.wud_updates`)**: Discovers a single sensor with:
  - **State**: Total count of pending updates (`{topic}/update_count`).
  - **Attributes (`json_attributes_topic`)**: The full array from `{topic}/updates`.
- **Global Sensors Kept**: The global connection status (`binary_sensor.wud_connection_status`), total container count (`sensor.wud_total_count`), total update count (`sensor.wud_total_update_count`), and update status (`binary_sensor.wud_total_update_status`) continue to be discovered and updated.
- **Skipped & Cleaned Up Entities**: Per-container `update` entities and per-watcher devices/sensors are omitted. If switching from `all` to `summary` mode, their discovery topics are automatically deleted.

### 🔐 MQTT Permissions & Broker ACLs

When using an MQTT broker with Access Control Lists (ACLs) enabled (e.g. Mosquitto):

- **Read & Write on WUD Topics**: WUD requires both publish and subscribe permissions on `{topic}/#` (by default `wud/container/#`) to publish container states and listen for install commands on `{topic}/+/+/install`.
- **Write on Discovery Topics**: WUD needs publish permissions on `{prefix}/#` (by default `homeassistant/#`) to register entities via auto-discovery and publish empty retained tombstones when containers are removed.

---

## ⚙️ Configuration Variables

The Home Assistant integration uses the underlying MQTT trigger. You can use all [MQTT generic configuration options](../mqtt/README.md).

Here are the variables specifically relevant to Home Assistant:

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_MQTT_{trigger_name}_HASS_ENABLED"
    required={false}
    type="boolean"
    defaultValue="false">
    Enable Home Assistant integration and publish state updates
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_MQTT_{trigger_name}_HASS_DISCOVERY"
    required={false}
    type="boolean"
    defaultValue="true (when HASS_ENABLED=true)">
    Enable Home Assistant MQTT Auto-Discovery. Defaults to <code>true</code> when <code>HASS_ENABLED=true</code> (<code>false</code> when <code>HASS_ENABLED=false</code>).
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_MQTT_{trigger_name}_HASS_DISCOVERY_ENTITIES"
    required={false}
    type="string"
    defaultValue="all">
    Discovery entities mode (<code>all</code> or <code>summary</code>). In <code>all</code> mode (default), discovers individual container update entities and per-watcher devices/sensors. In <code>summary</code> mode, discovers a single summary sensor (<code>sensor.wud_updates</code>) with pending updates list in attributes, plus global counts/status.
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_MQTT_{trigger_name}_HASS_PREFIX"
    required={false}
    type="string"
    defaultValue="homeassistant">
    MQTT discovery prefix topic for Home Assistant
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_MQTT_{trigger_name}_HASS_DEVICEID"
    required={false}
    type="string"
    defaultValue="wud">
    Device identifier in Home Assistant
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_MQTT_{trigger_name}_HASS_DEVICENAME"
    required={false}
    type="string"
    defaultValue="wud">
    Device display name in Home Assistant
  </ConfigOption>
</ConfigList>

:::tip[Customizing Entity Names & Icons in Home Assistant]
You can customize how containers display in Home Assistant using the [`wud.display.name` and `wud.display.icon` labels](../../watchers/labels.md#7-customize-display-name--icon).
:::
