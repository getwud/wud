import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Gitea Container Registry

![logo](gitea.svg)

The `gitea` registry module lets you authenticate against [Gitea](https://gitea.com) container registry instances (hosted or self-hosted).

### Variables

<ConfigList>
  <ConfigOption name="WUD_REGISTRY_GITEA_{registry_name}_LOGIN"
    type="string"
    required={true}
    supported="Required when password/token is provided">
    Gitea username
  </ConfigOption>

  <ConfigOption name="WUD_REGISTRY_GITEA_{registry_name}_PASSWORD"
    type="string"
    required={true}
    supported="Required when username is provided">
    Gitea password or personal access token
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_GITEA_{registry_name}_URL"
    required={true}
    type="url"
    supported="Valid HTTP/HTTPS URL">
    Gitea instance URL (e.g., `https://gitea.example.com`)
  </ConfigOption>

  <ConfigOption name="WUD_REGISTRY_GITEA_{registry_name}_AUTH"
    type="string"
    required={false}
    supported="Mutually exclusive with `LOGIN`/`PASSWORD`">
    Base64-encoded `username:password` string
  </ConfigOption>
</ConfigList>
### Examples

#### Authenticate with a Gitea instance

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_REGISTRY_GITEA_PRIVATE_URL=https://gitea.example.com
      - WUD_REGISTRY_GITEA_PRIVATE_LOGIN=john
      - WUD_REGISTRY_GITEA_PRIVATE_PASSWORD=secret-token
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e "WUD_REGISTRY_GITEA_PRIVATE_URL=https://gitea.example.com" \
  -e "WUD_REGISTRY_GITEA_PRIVATE_LOGIN=john" \
  -e "WUD_REGISTRY_GITEA_PRIVATE_PASSWORD=secret-token" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>
