import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# LSCR (LinuxServer.io Container Registry)

![logo](linuxserver.png)

The `lscr` registry module lets you authenticate against the [LinuxServer.io Container Registry](https://fleet.linuxserver.io/) (`lscr.io`), which is hosted on GitHub Container Registry.

:::info
Public LSCR images work out of the box without authentication. Configure this module to authenticate with GitHub credentials if needed.
:::

### Variables

| Env var                                      |   Required   | Description                  | Supported values | Default value when missing |
| -------------------------------------------- | :----------: | ---------------------------- | ---------------- | -------------------------- |
| `WUD_REGISTRY_LSCR_{registry_name}_USERNAME` | :red_circle: | GitHub username              | String           |                            |
| `WUD_REGISTRY_LSCR_{registry_name}_TOKEN`    | :red_circle: | GitHub Personal Access Token | Valid GitHub PAT |                            |

### Examples

#### Authenticate with GitHub credentials

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_REGISTRY_LSCR_PRIVATE_USERNAME=johndoe
      - WUD_REGISTRY_LSCR_PRIVATE_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_REGISTRY_LSCR_PRIVATE_USERNAME="johndoe" \
  -e WUD_REGISTRY_LSCR_PRIVATE_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>

### How to create a GitHub Personal Access Token

#### 1. Open your GitHub Personal Access Tokens settings

Navigate to [GitHub Token Settings](https://github.com/settings/tokens).

#### 2. Click "Generate new token (classic)"

Set an expiration date and select the `read:packages` scope (the only scope required by WUD).
![image](lscr_01.png)

#### 3. Copy the token and configure WUD

![image](lscr_02.png)
