import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Kafka

![logo](kafka.svg)

The `kafka` trigger lets you publish container update notification records to an Apache Kafka topic.

### Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_KAFKA_{trigger_name}_BROKERS"
    required={true}
    type="string">
    Comma-separated list of Kafka broker endpoints (`host:port`)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_KAFKA_{trigger_name}_AUTHENTICATION_PASSWORD"
    required={false}
    type="string">
    SASL password (required when authentication is enabled)
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
    name="WUD_TRIGGER_KAFKA_{trigger_name}_SSL"
    required={false}
    type="boolean"
    defaultValue="false">
    Enable TLS/SSL connection
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_KAFKA_{trigger_name}_TOPIC"
    required={false}
    type="email"
    defaultValue="wud-container">
    Kafka topic name to publish records to
  </ConfigOption>
</ConfigList>
:::warning[The Kafka topic must already exist on the broker; WUD will not create it automatically.]
:::

:::info
This trigger also supports [common trigger configuration options](../README.md#common-trigger-configuration).
:::

### Examples

#### Publish messages to a [CloudKarafka](https://www.cloudkarafka.com/) broker

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_KAFKA_KARAFKA_BROKERS=ark-01.srvs.cloudkafka.com:9094,ark-02.srvs.cloudkafka.com:9094,ark-03.srvs.cloudkafka.com:9094
      - WUD_TRIGGER_KAFKA_KARAFKA_SSL=true
      - WUD_TRIGGER_KAFKA_KARAFKA_TOPIC=my-user-id-wud-image
      - WUD_TRIGGER_KAFKA_KARAFKA_AUTHENTICATION_USER=my-user-id
      - WUD_TRIGGER_KAFKA_KARAFKA_AUTHENTICATION_PASSWORD=my-secret
      - WUD_TRIGGER_KAFKA_KARAFKA_AUTHENTICATION_TYPE=SCRAM-SHA-256
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_KAFKA_KARAFKA_BROKERS="ark-01.srvs.cloudkafka.com:9094,ark-02.srvs.cloudkafka.com:9094,ark-03.srvs.cloudkafka.com:9094" \
  -e WUD_TRIGGER_KAFKA_KARAFKA_SSL="true" \
  -e WUD_TRIGGER_KAFKA_KARAFKA_TOPIC="my-user-id-wud-image" \
  -e WUD_TRIGGER_KAFKA_KARAFKA_AUTHENTICATION_USER="my-user-id" \
  -e WUD_TRIGGER_KAFKA_KARAFKA_AUTHENTICATION_PASSWORD="my-secret" \
  -e WUD_TRIGGER_KAFKA_KARAFKA_AUTHENTICATION_TYPE="SCRAM-SHA-256" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>

#### Example published JSON record

```json
{
  "id": "31a61a8305ef1fc9a71fa4f20a68d7ec88b28e32303bbc4a5f192e851165b816",
  "name": "homeassistant",
  "watcher": "local",
  "includeTags": "^\\d+\\.\\d+\\.\\d+$",
  "image": {
    "id": "sha256:d4a6fafb7d4da37495e5c9be3242590be24a87d7edcc4f79761098889c54fca6",
    "registry": {
      "url": "123456789.dkr.ecr.eu-west-1.amazonaws.com"
    },
    "name": "test",
    "tag": {
      "value": "2021.6.4",
      "semver": true
    },
    "digest": {
      "watch": false,
      "repo": "sha256:ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72"
    },
    "architecture": "amd64",
    "os": "linux",
    "created": "2021-06-12T05:33:38.440Z"
  },
  "result": {
    "tag": "2021.6.5"
  },
  "updateAvailable": true
}
```
