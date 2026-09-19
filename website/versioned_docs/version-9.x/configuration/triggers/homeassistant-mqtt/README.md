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
- **In-Progress State**: WUD sets `in_progress: true` while the update runs, triggers your configured update triggers (such as `docker` or `docker-compose`), and resets `in_progress: false` once completed.

:::tip[Requirements for One-Click Install]
To enable the **Install** button to perform container updates, make sure you have configured an update trigger such as:

- [Docker Trigger](../docker/README.md) for standalone containers.
- [Docker Compose Trigger](../docker-compose/README.md) for compose stacks.

:::

### 📦 Device Topology (Per-Watcher Devices)

To keep Home Assistant devices organized and clean:

- **Watcher Devices**: Each watcher gets its own dedicated device (e.g. `wud (local)` for a watcher named `local`). All containers monitored by this watcher are grouped under this device.
- **Global WUD Device**: Represents the core WUD service, providing connection status (`binary_sensor`), total container count (`sensor`), total update count (`sensor`), and global update status (`binary_sensor`).

:::note[Migrating from Previous Versions]
When upgrading to this version, if the legacy monolithic **wud** device already exists in Home Assistant, it is recommended to delete it from the Home Assistant UI (**Settings > Devices & services > MQTT > wud device > Delete**). Home Assistant will then cleanly rediscover the new per-watcher devices (`wud_<watcher>`) alongside the global `wud` device without orphan entities or duplicates.
:::

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
    defaultValue="false">
    Enable Home Assistant MQTT Auto-Discovery
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
