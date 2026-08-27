---
title: Apprise
description: Configure Apprise API notification triggers in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Apprise

<DocHero
  icon="apprise"
  description="The apprise trigger sends notifications via Apprise, unlocking delivery to 80+ notification services including Matrix, Signal, Nextcloud, Line, and more."
/>

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_APPRISE_{trigger_name}_URL"
    required={true}
    type="url"
    supported="Valid HTTP/HTTPS URL">
    Base URL of the Apprise API server
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_APPRISE_{trigger_name}_CONFIG"
    required={false}
    type="string"
    supported="[Apprise persistent configuration documentation](https://github.com/caronc/apprise/wiki/config_yaml)">
    Name of an Apprise YAML configuration file
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_APPRISE_{trigger_name}_TAG"
    required={false}
    type="string"
    supported="[Apprise persistent configuration documentation](https://github.com/caronc/apprise/wiki/config_yaml)">
    Optional tag(s) to match when using an Apprise YAML configuration
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_APPRISE_{trigger_name}_URLS"
    required={false}
    type="string"
    supported="[Supported Apprise notification URLs](https://github.com/caronc/apprise#popular-notification-services)">
    Comma-separated list of Apprise service notification URLs
  </ConfigOption>
</ConfigList>

:::info
This trigger also supports all [common trigger configuration options](../README.md#common-trigger-configuration) (such as thresholds, scheduling, and batching).
:::

---

## 🚀 Examples

### Send an Email and SMS via Apprise

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_APPRISE_LOCAL_URL=http://apprise:8000
      - WUD_TRIGGER_APPRISE_LOCAL_URLS=mailto://john.doe:secret@gmail.com,sns://AHIAJGNT76XIMXDBIJYA/bu1dHSdO22pfaaVy/wmNsdljF4C07D3bndi9PQJ9/us-east-2/+1(800)555-1223
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_APPRISE_LOCAL_URL="http://apprise:8000" \
  -e WUD_TRIGGER_APPRISE_LOCAL_URLS="mailto://john.doe:secret@gmail.com,sns://AHIAJGNT76XIMXDBIJYA/bu1dHSdO22pfaaVy/wmNsdljF4C07D3bndi9PQJ9/us-east-2/+1(800)555-1223" \
  getwud/wud
```

</TabItem>
</Tabs>

### Use Persistent YAML Configuration

Declare an Apprise YAML configuration ([see docs](https://github.com/caronc/apprise/wiki/config_yaml)), such as `wud.yml`:

```yaml
# wud.yml example
urls:
  - tgram://{bot_token}/{chat_id}:
      - tag: devops
```

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_APPRISE_LOCAL_URL=http://apprise:8000
      - WUD_TRIGGER_APPRISE_LOCAL_CONFIG=wud # name of the YAML config file
      - WUD_TRIGGER_APPRISE_LOCAL_TAG=devops # tag filter for the config (optional)
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_APPRISE_LOCAL_URL="http://apprise:8000" \
  -e WUD_TRIGGER_APPRISE_LOCAL_CONFIG="wud" \
  -e WUD_TRIGGER_APPRISE_LOCAL_TAG="devops" \
  getwud/wud
```

</TabItem>
</Tabs>

---

## 📖 Setup Guide: Running the Apprise API Server

Run the official [Apprise Docker image](https://hub.docker.com/r/caronc/apprise). For more details, see the [official Apprise API documentation](https://github.com/caronc/apprise-api).

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  apprise:
    image: caronc/apprise
    container_name: apprise
    ports:
      - "8000:8000"
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run -d --name apprise -p 8000:8000 caronc/apprise
```

</TabItem>
</Tabs>
