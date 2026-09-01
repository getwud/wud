---
title: AMQP / RabbitMQ
description: Publish container update events to AMQP 0-9-1 message brokers (such as RabbitMQ) in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# AMQP (RabbitMQ)

<DocHero
  icon="simple-icons:rabbitmq"
  description="The AMQP trigger publishes structured container update events to AMQP 0-9-1 message brokers (such as RabbitMQ or Apache Qpid), allowing decoupled message processing in event-driven systems."
/>

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_AMQP_{trigger_name}_URL"
    required={true}
    type="url"
    supported="Valid amqp:// or amqps:// connection URL (e.g. amqp://user:password@localhost:5672/vhost)">
    AMQP broker connection string
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_AMQP_{trigger_name}_EXCHANGE"
    required={false}
    type="string"
    defaultValue="">
    Exchange name to publish messages to (leave empty for the default direct exchange)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_AMQP_{trigger_name}_ROUTINGKEY"
    required={false}
    type="string"
    defaultValue="wud-container">
    AMQP routing key (or target queue name if using the default exchange)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_AMQP_{trigger_name}_EXCHANGETYPE"
    required={false}
    type="enum"
    defaultValue="topic"
    supported="`direct`, `topic`, `fanout`, `headers`">
    Exchange type if declaring a named exchange
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_AMQP_{trigger_name}_PERSISTENT"
    required={false}
    type="boolean"
    defaultValue="true">
    Whether messages are published with delivery mode 2 (persistent disk storage)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_AMQP_{trigger_name}_DISABLETITLE"
    required={false}
    type="boolean"
    defaultValue="false">
    Whether to omit the notification title in payload
  </ConfigOption>
</ConfigList>

:::info
This trigger also supports all [common trigger configuration options](../README.md#common-trigger-configuration) (such as thresholds, scheduling, and batching).
:::

---

## 🚀 Examples

### Publishing to RabbitMQ Exchange

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_AMQP_RABBIT_URL=amqp://guest:guest@rabbitmq:5672
      - WUD_TRIGGER_AMQP_RABBIT_EXCHANGE=docker.events
      - WUD_TRIGGER_AMQP_RABBIT_ROUTINGKEY=container.update
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_AMQP_RABBIT_URL="amqp://guest:guest@rabbitmq:5672" \
  -e WUD_TRIGGER_AMQP_RABBIT_EXCHANGE="docker.events" \
  -e WUD_TRIGGER_AMQP_RABBIT_ROUTINGKEY="container.update" \
  getwud/wud
```

</TabItem>
</Tabs>
