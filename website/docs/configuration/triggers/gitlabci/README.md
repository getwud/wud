---
title: GitLab CI
description: Trigger GitLab CI/CD pipelines on container updates in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# GitLab CI (Pipeline Triggers)

<DocHero
  icon="simple-icons:gitlab"
  description="The GitLab CI trigger triggers GitLab CI/CD pipelines with custom variables when new container versions are detected, automating automated testing, deployments, or GitOps pipelines."
/>

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_GITLABCI_{trigger_name}_PROJECTID"
    required={true}
    type="string">
    GitLab project ID (numeric ID, or URL-encoded path like `mygroup%2Fmyproject`)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_GITLABCI_{trigger_name}_TOKEN"
    required={true}
    type="string">
    GitLab Pipeline Trigger Token (generated in Project > Settings > CI/CD > Pipeline triggers)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_GITLABCI_{trigger_name}_REF"
    required={false}
    type="string"
    defaultValue="main">
    Git branch or tag name to run the pipeline on
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_GITLABCI_{trigger_name}_URL"
    required={false}
    type="url"
    defaultValue="https://gitlab.com">
    GitLab instance base URL (can be customized for self-hosted GitLab instances)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_GITLABCI_{trigger_name}_DISABLETITLE"
    required={false}
    type="boolean"
    defaultValue="false">
    Whether to omit the notification title in pipeline variables
  </ConfigOption>
</ConfigList>

:::info
This trigger also supports all [common trigger configuration options](../README.md#common-trigger-configuration) (such as thresholds, scheduling, and batching).
:::

---

## 📦 Injected Pipeline Variables

When the pipeline is triggered, WUD supplies the following environment variables:

| Variable | Description |
| :--- | :--- |
| `WUD_MODE` | Trigger execution mode (`simple` or `batch`) |
| `WUD_CONTAINER` | Name of the updated container |
| `WUD_WATCHER` | Name of the watcher that detected the container |
| `WUD_IMAGE` | Base container image name |
| `WUD_LOCAL_TAG` | Currently running container tag |
| `WUD_REMOTE_TAG` | Newly available remote image tag |
| `WUD_LINK` | Registry or release notes link |
| `WUD_TITLE` | Formatted update title |
| `WUD_MESSAGE` | Formatted update message body |

---

## 🚀 Examples

### Basic Pipeline Trigger

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_GITLABCI_DEPLOY_PROJECTID=12345678
      - WUD_TRIGGER_GITLABCI_DEPLOY_TOKEN=glptt-secrettrigger123456
      - WUD_TRIGGER_GITLABCI_DEPLOY_REF=main
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_GITLABCI_DEPLOY_PROJECTID="12345678" \
  -e WUD_TRIGGER_GITLABCI_DEPLOY_TOKEN="glptt-secrettrigger123456" \
  -e WUD_TRIGGER_GITLABCI_DEPLOY_REF="main" \
  getwud/wud
```

</TabItem>
</Tabs>
