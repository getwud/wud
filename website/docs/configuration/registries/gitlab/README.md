import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# GitLab Container Registry

![logo](gitlab.svg)

The `gitlab` registry module lets you authenticate against the [GitLab Container Registry](https://docs.gitlab.com/ee/user/packages/container_registry/) (both gitlab.com and self-hosted instances).

### Variables

<ConfigList>
  <ConfigOption name="WUD_REGISTRY_GITLAB_{registry_name}_TOKEN"
    required={true}
    type="email">
    GitLab Personal Access Token or Deploy Token
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_GITLAB_{registry_name}_AUTHURL"
    required={false}
    type="url"
    defaultValue="https://gitlab.com"
    supported="Valid URL">
    GitLab authentication base URL
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_GITLAB_{registry_name}_URL"
    required={false}
    type="url"
    defaultValue="https://registry.gitlab.com"
    supported="Valid URL">
    GitLab Registry base URL
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_GITLAB_{registry_name}_USERNAME"
    required={false}
    type="string">
    Username (required when using a Group Access Token or Deploy Token)
  </ConfigOption>
</ConfigList>
### Examples

#### Authenticate with gitlab.com

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_REGISTRY_GITLAB_PUBLIC_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_REGISTRY_GITLAB_PUBLIC_TOKEN="glpat-xxxxxxxxxxxxxxxxxxxx" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>

#### Authenticate with a self-hosted GitLab instance

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_REGISTRY_GITLAB_PRIVATE_URL=https://registry.gitlab.example.com
      - WUD_REGISTRY_GITLAB_PRIVATE_AUTHURL=https://gitlab.example.com
      - WUD_REGISTRY_GITLAB_PRIVATE_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_REGISTRY_GITLAB_PRIVATE_URL="https://registry.gitlab.example.com" \
  -e WUD_REGISTRY_GITLAB_PRIVATE_AUTHURL="https://gitlab.example.com" \
  -e WUD_REGISTRY_GITLAB_PRIVATE_TOKEN="glpat-xxxxxxxxxxxxxxxxxxxx" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>

### How to create a GitLab Personal Access Token

#### 1. Open your GitLab Personal Access Tokens page

Navigate to [GitLab Personal Access Tokens](https://gitlab.com/-/profile/personal_access_tokens).

#### 2. Create the token

Set an expiration date and select the `read_registry` scope (the only scope required by WUD).
![image](gitlab_01.png)

#### 3. Copy the token and configure WUD

![image](gitlab_02.png)
