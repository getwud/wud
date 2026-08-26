import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Gotify

![logo](gotify.svg)

The `gotify` trigger lets you send container update notifications via [Gotify](https://gotify.net/).

### Variables

<ConfigList>
  <ConfigOption name="WUD_TRIGGER_GOTIFY_{trigger_name}_TOKEN"
    type="email"
    required={true}
    supported="Valid Gotify app token">
    Gotify application token
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_GOTIFY_{trigger_name}_URL"
    required={true}
    type="url"
    supported="Valid HTTP/HTTPS URL">
    Gotify server base URL
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_GOTIFY_{trigger_name}_PRIORITY"
    required={false}
    type="integer"
    defaultValue="5"
    supported="Integer >= `0`">
    Gotify message priority
  </ConfigOption>
</ConfigList>
:::info
This trigger also supports [common trigger configuration options](../README.md#common-trigger-configuration).
:::

### Examples

#### 1. Create an application in Gotify

![image](gotify_01.png)

#### 2. Copy the application token

![image](gotify_02.png)

#### 3. Configure WUD

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_GOTIFY_LOCAL_URL=http://gotify.localhost
      - WUD_TRIGGER_GOTIFY_LOCAL_TOKEN=AWp8A.TbBO3xpn4
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_GOTIFY_LOCAL_URL="http://gotify.localhost" \
  -e WUD_TRIGGER_GOTIFY_LOCAL_TOKEN="AWp8A.TbBO3xpn4" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>
