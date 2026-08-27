---
title: GitLab
description: Configure authentication for GitLab Container Registries in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# GitLab Container Registry

<DocHero
  icon="gitlab"
  badge="⚡ Active by Default"
  badgeType="default"
  description="The gitlab registry module authenticates against GitLab Container Registries (GitLab.com and self-hosted instances)."
/>

:::info[Zero-Config for Public Images]
Public packages work out of the box with zero configuration. Configure this module to monitor private repositories or avoid anonymous rate limits.
:::

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption name="WUD_REGISTRY_GITLAB_{registry_name}_TOKEN"
    required={true}
    type="string"
    supported="Valid GitLab Personal Access Token, Deploy Token, or Project Access Token">
    GitLab Personal Access Token or Deploy Token
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_GITLAB_{registry_name}_USERNAME"
    required={false}
    type="string">
    Username (required when using a Group Access Token or Deploy Token)
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_GITLAB_{registry_name}_URL"
    required={false}
    type="url"
    defaultValue="https://registry.gitlab.com"
    supported="Valid registry URL">
    GitLab Container Registry base URL
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_GITLAB_{registry_name}_AUTHURL"
    required={false}
    type="url"
    defaultValue="https://gitlab.com"
    supported="Valid instance URL">
    GitLab authentication base URL
  </ConfigOption>
</ConfigList>

---

## 🚀 Examples

### Authenticate with GitLab.com

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_REGISTRY_GITLAB_LOCAL_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_REGISTRY_GITLAB_LOCAL_TOKEN="glpat-xxxxxxxxxxxxxxxxxxxx" \
  getwud/wud
```

</TabItem>
</Tabs>

### Authenticate with a Self-Hosted GitLab Instance

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_REGISTRY_GITLAB_LOCAL_URL=https://registry.gitlab.example.com
      - WUD_REGISTRY_GITLAB_LOCAL_AUTHURL=https://gitlab.example.com
      - WUD_REGISTRY_GITLAB_LOCAL_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_REGISTRY_GITLAB_LOCAL_URL="https://registry.gitlab.example.com" \
  -e WUD_REGISTRY_GITLAB_LOCAL_AUTHURL="https://gitlab.example.com" \
  -e WUD_REGISTRY_GITLAB_LOCAL_TOKEN="glpat-xxxxxxxxxxxxxxxxxxxx" \
  getwud/wud
```

</TabItem>
</Tabs>

---

## 📖 Setup Guide: Creating a GitLab Personal Access Token

1. Navigate to [GitLab Personal Access Tokens](https://gitlab.com/-/profile/personal_access_tokens).
2. Select the **`read_registry`** scope (the only scope required by WUD).
3. Click **Create personal access token**, copy the token string, and set it as `WUD_REGISTRY_GITLAB_{registry_name}_TOKEN`.
