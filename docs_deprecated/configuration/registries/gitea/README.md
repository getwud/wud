import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Gitea Container Registry

![logo](gitea.png)

The `gitea` registry module lets you authenticate against [Gitea](https://gitea.com) container registry instances (hosted or self-hosted).

### Variables

| Env var                                       |    Required    | Description                                            | Supported values                           | Default value when missing |
| --------------------------------------------- | :------------: | ------------------------------------------------------ | ------------------------------------------ | -------------------------- |
| `WUD_REGISTRY_GITEA_{registry_name}_URL`      |  :red_circle:  | Gitea instance URL (e.g., `https://gitea.example.com`) | Valid HTTP/HTTPS URL                       |                            |
| `WUD_REGISTRY_GITEA_{registry_name}_LOGIN`    |  :red_circle:  | Gitea username                                         | Required when password/token is provided   |                            |
| `WUD_REGISTRY_GITEA_{registry_name}_PASSWORD` |  :red_circle:  | Gitea password or personal access token                | Required when username is provided         |                            |
| `WUD_REGISTRY_GITEA_{registry_name}_AUTH`     | :white_circle: | Base64-encoded `username:password` string              | Mutually exclusive with `LOGIN`/`PASSWORD` |                            |

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
