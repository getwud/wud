---
title: IFTTT
description: Send container update notifications to IFTTT applets using Webhooks in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# IFTTT

<DocHero
  icon="ifttt"
  description="The ifttt trigger fires custom events on the IFTTT Webhooks service to trigger smart home and automation applets."
/>

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_IFTTT_{trigger_name}_KEY"
    required={true}
    type="string"
    supported="Valid IFTTT Webhook Key">
    IFTTT Maker Webhook secret key
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_IFTTT_{trigger_name}_EVENT"
    required={false}
    type="string"
    defaultValue="wud-image">
    IFTTT Webhook event name to trigger
  </ConfigOption>
</ConfigList>

:::info
This trigger also supports all [common trigger configuration options](../README.md#common-trigger-configuration) (such as thresholds, scheduling, and batching).
:::

---

## 🚀 Examples

### Basic Webhook Notification

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_IFTTT_LOCAL_KEY=your_ifttt_webhook_key
      - WUD_TRIGGER_IFTTT_LOCAL_EVENT=wud-container
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_IFTTT_LOCAL_KEY="your_ifttt_webhook_key" \
  -e WUD_TRIGGER_IFTTT_LOCAL_EVENT="wud-container" \
  getwud/wud
```

</TabItem>
</Tabs>

---

## 📦 IFTTT Event Ingredients

When triggering the webhook, WUD supplies the following ingredient variables to your Applet:

- **`EventName`**: The configured event name (e.g. `wud-container`)
- **`OccurredAt`**: Timestamp of the update detection
- **`Value1`**: Container / Image name (e.g. `homeassistant`)
- **`Value2`**: New target version / tag (e.g. `2024.6.5`)
- **`Value3`**: Full container JSON payload

---

## 📖 Setup Guide

### 1. Obtain your IFTTT Webhook Key
1. Navigate to [IFTTT Maker Webhooks](https://ifttt.com/maker_webhooks) and click **Connect**.
2. Go to [Webhooks Settings](https://ifttt.com/maker_webhooks/settings) and copy the secret key component from the URL.

### 2. Create an IFTTT Applet
1. Open [IFTTT Applet Creator](https://ifttt.com/create).
2. For **If This**, choose **Webhooks** > **Receive a web request** and enter your event name (e.g. `wud-container`).
3. For **Then That**, pick your desired action (e.g. send an email, push notification, or smart home action) referencing `{{Value1}}` and `{{Value2}}`.
