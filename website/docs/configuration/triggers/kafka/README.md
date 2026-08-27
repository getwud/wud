---
title: Kafka
description: Publish container update events to Apache Kafka topics in What's Up Docker (WUD).
---

import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Kafka

![logo](kafka.svg)

The `kafka` trigger lets you stream container update notification records directly into an [Apache Kafka](https://kafka.apache.org/) topic.

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_KAFKA_{trigger_name}_BROKERS"
    required={true}
    type="string"
    supported="Comma-separated `host:port` pairs">
    Comma-separated list of Kafka broker bootstrap endpoints
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_KAFKA_{trigger_name}_TOPIC"
    required={false}
    type="string"
    defaultValue="wud-container">
    Kafka topic name to publish records to
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_KAFKA_{trigger_name}_SSL"
    required={false}
    type="boolean"
    defaultValue="false">
    Enable TLS/SSL encryption for broker connections
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_KAFKA_{trigger_name}_AUTHENTICATION_TYPE"
    type="enum"
    required={false}
    defaultValue="PLAIN"
    supported="`PLAIN`, `SCRAM-SHA-256`, `SCRAM-SHA-512`">
    SASL authentication mechanism
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_KAFKA_{trigger_name}_AUTHENTICATION_USER"
    required={false}
    type="string">
    SASL username (required when authentication is enabled)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_KAFKA_{trigger_name}_AUTHENTICATION_PASSWORD"
    required={false}
    type="string">
    SASL password (required when authentication is enabled)
  </ConfigOption>
</ConfigList>

:::warning[Topic Pre-creation Required]
The destination Kafka topic must already exist on your cluster; WUD will not create missing topics automatically.
:::

:::info
This trigger also supports all [common trigger configuration options](../README.md#common-trigger-configuration) (such as thresholds, scheduling, and batching).
:::

---

## 🚀 Examples

### Publish Events to a Secured Kafka Cluster

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_KAFKA_LOCAL_BROKERS=kafka-1.example.com:9094,kafka-2.example.com:9094
      - WUD_TRIGGER_KAFKA_LOCAL_SSL=true
      - WUD_TRIGGER_KAFKA_LOCAL_TOPIC=wud-container-updates
      - WUD_TRIGGER_KAFKA_LOCAL_AUTHENTICATION_USER=wud-publisher
      - WUD_TRIGGER_KAFKA_LOCAL_AUTHENTICATION_PASSWORD=your_sasl_secret
      - WUD_TRIGGER_KAFKA_LOCAL_AUTHENTICATION_TYPE=SCRAM-SHA-256
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_KAFKA_LOCAL_BROKERS="kafka-1.example.com:9094,kafka-2.example.com:9094" \
  -e WUD_TRIGGER_KAFKA_LOCAL_SSL="true" \
  -e WUD_TRIGGER_KAFKA_LOCAL_TOPIC="wud-container-updates" \
  -e WUD_TRIGGER_KAFKA_LOCAL_AUTHENTICATION_USER="wud-publisher" \
  -e WUD_TRIGGER_KAFKA_LOCAL_AUTHENTICATION_PASSWORD="your_sasl_secret" \
  -e WUD_TRIGGER_KAFKA_LOCAL_AUTHENTICATION_TYPE="SCRAM-SHA-256" \
  getwud/wud
```

</TabItem>
</Tabs>
