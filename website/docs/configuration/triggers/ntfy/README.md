import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# ntfy

![logo](ntfy.svg)

The `ntfy` trigger lets you send container update push notifications via [ntfy](https://ntfy.sh/).

### Variables

<ConfigList>
  <ConfigOption name="WUD_TRIGGER_NTFY_{trigger_name}_TOPIC"
    required={true}
    type="email">
    Target ntfy topic name
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_NTFY_{trigger_name}_AUTH_PASSWORD"
    required={false}
    type="string">
    Password (for Basic authentication)
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_NTFY_{trigger_name}_AUTH_TOKEN"
    required={false}
    type="email">
    Access token (for Bearer authentication)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_NTFY_{trigger_name}_AUTH_USER"
    required={false}
    type="string">
    Username (for Basic authentication)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_NTFY_{trigger_name}_PRIORITY"
    required={false}
    type="url"
    defaultValue="3"
    supported="Integer between `1` (min) and `5` (max) [see docs](https://docs.ntfy.sh/publish/#message-priority)">
    ntfy notification priority
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_NTFY_{trigger_name}_URL"
    required={false}
    type="url"
    defaultValue="https://ntfy.sh"
    supported="Valid HTTP or HTTPS URL">
    ntfy server base URL
  </ConfigOption>
</ConfigList>
:::info
This trigger also supports [common trigger configuration options](../README.md#common-trigger-configuration).
:::

### Examples

#### Publish to the public ntfy.sh service

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_NTFY_SH_TOPIC=my_secret_topic_name
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_NTFY_SH_TOPIC="my_secret_topic_name" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>

#### Publish to a self-hosted ntfy instance with Basic authentication

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_NTFY_PRIVATE_URL=https://ntfy.example.com
      - WUD_TRIGGER_NTFY_PRIVATE_TOPIC=my_secret_topic_name
      - WUD_TRIGGER_NTFY_PRIVATE_AUTH_USER=john
      - WUD_TRIGGER_NTFY_PRIVATE_AUTH_PASSWORD=mysecretpassword
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_NTFY_PRIVATE_URL="https://ntfy.example.com" \
  -e WUD_TRIGGER_NTFY_PRIVATE_TOPIC="my_secret_topic_name" \
  -e WUD_TRIGGER_NTFY_PRIVATE_AUTH_USER="john" \
  -e WUD_TRIGGER_NTFY_PRIVATE_AUTH_PASSWORD="mysecretpassword" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>
