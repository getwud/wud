---
title: GitHub Actions
description: Trigger GitHub Actions workflows via repository_dispatch events in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# GitHub Actions

<DocHero
  icon="simple-icons:githubactions"
  description="The GitHub Actions trigger dispatches repository_dispatch events to your GitHub repositories when container updates are discovered, automating CI/CD pipelines, GitOps rollouts, or build workflows."
/>

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_GITHUBACTIONS_{trigger_name}_OWNER"
    required={true}
    type="string">
    GitHub repository owner or organization (e.g. `octocat`)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_GITHUBACTIONS_{trigger_name}_REPO"
    required={true}
    type="string">
    GitHub repository name (e.g. `infrastructure`)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_GITHUBACTIONS_{trigger_name}_TOKEN"
    required={true}
    type="string">
    GitHub Personal Access Token (classic token with `repo` scope, or fine-grained PAT with `Actions: Read and write` permissions)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_GITHUBACTIONS_{trigger_name}_EVENTTYPE"
    required={false}
    type="string"
    defaultValue="wud-update">
    Custom `event_type` string matched by your workflow's `on.repository_dispatch.types`
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_GITHUBACTIONS_{trigger_name}_URL"
    required={false}
    type="url"
    defaultValue="https://api.github.com">
    GitHub API base URL (can be pointed to GitHub Enterprise Server)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_GITHUBACTIONS_{trigger_name}_DISABLETITLE"
    required={false}
    type="boolean"
    defaultValue="false">
    Whether to omit the notification title in payload
  </ConfigOption>
</ConfigList>

:::info
This trigger also supports all [common trigger configuration options](../README.md#common-trigger-configuration) (such as thresholds, scheduling, and batching).
:::

---

## 📖 GitHub Actions Workflow Example

Create a workflow file `.github/workflows/wud.yml` in your repository:

```yaml
name: WUD Update Receiver

on:
  repository_dispatch:
    types: [wud-update]

jobs:
  on-update:
    runs-on: ubuntu-latest
    steps:
      - name: Inspect Payload
        run: |
          echo "Container: ${{ github.event.client_payload.container }}"
          echo "Image: ${{ github.event.client_payload.image }}"
          echo "New Tag: ${{ github.event.client_payload.remoteTag }}"
```

---

## 🚀 Examples

### Basic Repository Dispatch

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_GITHUBACTIONS_GITOPS_OWNER=myorg
      - WUD_TRIGGER_GITHUBACTIONS_GITOPS_REPO=gitops-repo
      - WUD_TRIGGER_GITHUBACTIONS_GITOPS_TOKEN=ghp_secrettoken1234567890
      - WUD_TRIGGER_GITHUBACTIONS_GITOPS_EVENTTYPE=wud-update
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_GITHUBACTIONS_GITOPS_OWNER="myorg" \
  -e WUD_TRIGGER_GITHUBACTIONS_GITOPS_REPO="gitops-repo" \
  -e WUD_TRIGGER_GITHUBACTIONS_GITOPS_TOKEN="ghp_secrettoken1234567890" \
  getwud/wud
```

</TabItem>
</Tabs>
