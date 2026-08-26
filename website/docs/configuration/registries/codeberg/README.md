import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Codeberg Container Registry

![logo](codeberg.svg)

The `codeberg` registry module lets you authenticate against the [Codeberg Container Registry](https://codeberg.org/).

:::info[Public Codeberg repositories work out of the box without authentication. Configure this module to access private repositories or increase API rate limits.]
:::

### Variables

<ConfigList>
  <ConfigOption name="WUD_REGISTRY_CODEBERG_{registry_name}_LOGIN"
    type="string"
    required={true}
    supported="Required when password/token is provided">
    Codeberg username
  </ConfigOption>

  <ConfigOption name="WUD_REGISTRY_CODEBERG_{registry_name}_PASSWORD"
    type="string"
    required={true}
    supported="Required when username is provided">
    Codeberg password or personal access token
  </ConfigOption>

  <ConfigOption name="WUD_REGISTRY_CODEBERG_{registry_name}_AUTH"
    type="string"
    required={false}
    supported="Mutually exclusive with `LOGIN`/`PASSWORD`">
    Base64-encoded `username:password` string
  </ConfigOption>
</ConfigList>
### Examples

#### Authenticate with credentials

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_REGISTRY_CODEBERG_PRIVATE_LOGIN=john
      - WUD_REGISTRY_CODEBERG_PRIVATE_PASSWORD=secret-token
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e "WUD_REGISTRY_CODEBERG_PRIVATE_LOGIN=john" \
  -e "WUD_REGISTRY_CODEBERG_PRIVATE_PASSWORD=secret-token" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>
