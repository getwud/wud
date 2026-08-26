import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# LSCR (LinuxServer.io Container Registry)

![logo](linuxserver.svg)

The `lscr` registry module lets you authenticate against the [LinuxServer.io Container Registry](https://fleet.linuxserver.io/) (`lscr.io`), which is hosted on GitHub Container Registry.

:::info[Public LSCR images work out of the box without authentication. Configure this module to authenticate with GitHub credentials if needed.]
:::

### Variables

<ConfigList>
  <ConfigOption name="WUD_REGISTRY_LSCR_{registry_name}_TOKEN"
    type="email"
    required={true}
    supported="Valid GitHub PAT">
    GitHub Personal Access Token
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_LSCR_{registry_name}_USERNAME"
    required={true}
    type="string">
    GitHub username
  </ConfigOption>
</ConfigList>
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
