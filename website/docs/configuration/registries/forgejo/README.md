import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Forgejo Container Registry

![logo](forgejo.svg)

The `forgejo` registry module lets you authenticate against [Forgejo](https://forgejo.org/) container registry instances (both hosted and self-hosted).

:::info[Public images on `code.forgejo.org` work out of the box. Use this configuration for self-hosted instances or private repositories.]
:::

### Variables

<ConfigList>
  <ConfigOption name="WUD_REGISTRY_FORGEJO_{registry_name}_LOGIN"
    type="string"
    required={true}
    supported="Required when password/token is provided">
    Forgejo username
  </ConfigOption>

  <ConfigOption name="WUD_REGISTRY_FORGEJO_{registry_name}_PASSWORD"
    type="string"
    required={true}
    supported="Required when username is provided">
    Forgejo password or personal access token
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_FORGEJO_{registry_name}_URL"
    required={true}
    type="url"
    supported="Valid HTTP/HTTPS URL">
    Forgejo instance URL (e.g., `https://forgejo.example.com`)
  </ConfigOption>

  <ConfigOption name="WUD_REGISTRY_FORGEJO_{registry_name}_AUTH"
    type="string"
    required={false}
    supported="Mutually exclusive with `LOGIN`/`PASSWORD`">
    Base64-encoded `username:password` string
  </ConfigOption>
</ConfigList>
### Examples

#### Authenticate with a Forgejo instance

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_REGISTRY_FORGEJO_PRIVATE_URL=https://forgejo.example.com
      - WUD_REGISTRY_FORGEJO_PRIVATE_LOGIN=john
      - WUD_REGISTRY_FORGEJO_PRIVATE_PASSWORD=secret-token
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e "WUD_REGISTRY_FORGEJO_PRIVATE_URL=https://forgejo.example.com" \
  -e "WUD_REGISTRY_FORGEJO_PRIVATE_LOGIN=john" \
  -e "WUD_REGISTRY_FORGEJO_PRIVATE_PASSWORD=secret-token" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>
