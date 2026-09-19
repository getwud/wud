---
title: MQTT
description: Publish container update notifications to MQTT brokers and Home Assistant in WUD (What's Up Docker?).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# MQTT

<DocHero
  icon="mqtt"
  description="The mqtt trigger publishes JSON update payloads to an MQTT message broker with Home Assistant auto-discovery support."
/>

:::tip[Looking for Home Assistant?]
If you are looking to integrate WUD with Home Assistant via MQTT Auto-Discovery (Update Entities, One-Click Install), please read the [Home Assistant (MQTT) Guide](../homeassistant-mqtt/README.md).
:::

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_MQTT_{trigger_name}_URL"
    required={true}
    type="url"
    supported="Valid `mqtt`, `mqtts`, `tcp`, `ws`, `wss` URL">
    URL of the MQTT broker
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_MQTT_{trigger_name}_TOPIC"
    required={false}
    type="string"
    defaultValue="wud/container">
    Base MQTT topic to which updates are published
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_MQTT_{trigger_name}_USER"
    required={false}
    type="string">
    MQTT broker username
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_MQTT_{trigger_name}_PASSWORD"
    required={false}
    type="string">
    MQTT broker password
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_MQTT_{trigger_name}_CLIENTID"
    required={false}
    type="string"
    defaultValue="wud_$random">
    MQTT client ID to use for the broker connection
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_MQTT_{trigger_name}_TLS_CACHAIN"
    type="path"
    required={false}
    supported="Valid PEM certificate chain path">
    Path to CA certificate chain PEM file (for private CAs)
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_MQTT_{trigger_name}_TLS_CLIENTCERT"
    type="path"
    required={false}
    supported="Valid PEM certificate path">
    Path to client certificate PEM file (for mutual TLS)
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_MQTT_{trigger_name}_TLS_CLIENTKEY"
    type="path"
    required={false}
    supported="Valid PEM private key path">
    Path to client private key PEM file (for mutual TLS)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_MQTT_{trigger_name}_TLS_REJECTUNAUTHORIZED"
    required={false}
    type="boolean"
    defaultValue="true">
    Whether to reject unauthorized/untrusted server SSL certificates
  </ConfigOption>
</ConfigList>

:::info
This trigger supports all [common trigger configuration options](../README.md#common-trigger-configuration) and runs in `simple` mode by default.
:::

:::tip[Customizing Entity Names & Icons in Home Assistant]
You can customize how containers display in Home Assistant using the [`wud.display.name` and `wud.display.icon` labels](../../watchers/labels.md#7-customize-display-name--icon).
:::

---

## 🚀 Examples

### Basic Mosquitto Broker Setup

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_MQTT_LOCAL_URL=mqtt://mosquitto:1883
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_MQTT_LOCAL_URL="mqtt://mosquitto:1883" \
  getwud/wud
```

</TabItem>
</Tabs>

### Mutual TLS (mTLS) Authentication

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    volumes:
      - /etc/certs/mqtt/client-key.pem:/wud/mqtt/client-key.pem:ro
      - /etc/certs/mqtt/client-cert.pem:/wud/mqtt/client-cert.pem:ro
      - /etc/certs/mqtt/ca.pem:/wud/mqtt/ca.pem:ro
    environment:
      - WUD_TRIGGER_MQTT_LOCAL_URL=mqtts://mosquitto:8883
      - WUD_TRIGGER_MQTT_LOCAL_TLS_CLIENTKEY=/wud/mqtt/client-key.pem
      - WUD_TRIGGER_MQTT_LOCAL_TLS_CLIENTCERT=/wud/mqtt/client-cert.pem
      - WUD_TRIGGER_MQTT_LOCAL_TLS_CACHAIN=/wud/mqtt/ca.pem
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -v /etc/certs/mqtt/client-key.pem:/wud/mqtt/client-key.pem:ro \
  -v /etc/certs/mqtt/client-cert.pem:/wud/mqtt/client-cert.pem:ro \
  -v /etc/certs/mqtt/ca.pem:/wud/mqtt/ca.pem:ro \
  -e WUD_TRIGGER_MQTT_LOCAL_URL="mqtts://mosquitto:8883" \
  -e WUD_TRIGGER_MQTT_LOCAL_TLS_CLIENTKEY="/wud/mqtt/client-key.pem" \
  -e WUD_TRIGGER_MQTT_LOCAL_TLS_CLIENTCERT="/wud/mqtt/client-cert.pem" \
  -e WUD_TRIGGER_MQTT_LOCAL_TLS_CACHAIN="/wud/mqtt/ca.pem" \
  getwud/wud
```

</TabItem>
</Tabs>
