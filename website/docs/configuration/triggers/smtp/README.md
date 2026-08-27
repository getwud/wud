---
title: SMTP Email
description: Send container update alert emails via SMTP in What's Up Docker (WUD).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# SMTP Email

<DocHero
  icon="smtp"
  description="The smtp trigger sends email notifications for container updates via standard SMTP servers with SSL/TLS and authentication."
/>

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption name="WUD_TRIGGER_SMTP_{trigger_name}_HOST"
    type="string"
    required={true}
    supported="Valid hostname or IP address">
    SMTP server hostname or IP address
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_SMTP_{trigger_name}_PORT"
    required={true}
    type="integer"
    supported="Valid port number (e.g. `465`, `587`, `25`)">
    SMTP server port
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_SMTP_{trigger_name}_FROM_ADDRESS"
    type="string"
    required={true}
    supported="Valid email address (e.g. `wud@example.com`)">
    Sender email address (`From`)
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_SMTP_{trigger_name}_TO"
    type="string"
    required={true}
    supported="Valid email address or comma-separated list">
    Recipient email address (`To`)
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_SMTP_{trigger_name}_FROM_NAME"
    required={false}
    type="string"
    defaultValue="WUD"
    supported="String display name">
    Sender display name
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_SMTP_{trigger_name}_USER"
    required={false}
    type="string">
    SMTP authentication username
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_SMTP_{trigger_name}_PASS"
    required={false}
    type="string">
    SMTP authentication password or App Password
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_SMTP_{trigger_name}_TLS_ENABLED"
    required={false}
    type="boolean"
    defaultValue="false">
    Enable implicit TLS/SSL connection (typically on port 465)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_SMTP_{trigger_name}_TLS_VERIFY"
    required={false}
    type="boolean"
    defaultValue="true">
    Verify server TLS certificate
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_SMTP_{trigger_name}_ALLOWCUSTOMTLD"
    required={false}
    type="boolean"
    defaultValue="false">
    Allow non-standard or internal TLDs in email addresses
  </ConfigOption>
</ConfigList>

:::info
This trigger also supports all [common trigger configuration options](../README.md#common-trigger-configuration) (such as thresholds, scheduling, and batching).
:::

---

## 🚀 Examples

### Send Emails via Gmail (App Password)

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_SMTP_GMAIL_HOST=smtp.gmail.com
      - WUD_TRIGGER_SMTP_GMAIL_PORT=465
      - WUD_TRIGGER_SMTP_GMAIL_TLS_ENABLED=true
      - WUD_TRIGGER_SMTP_GMAIL_USER=myaccount@gmail.com
      - WUD_TRIGGER_SMTP_GMAIL_PASS=abcd efgh ijkl mnop # Gmail 16-char App Password
      - WUD_TRIGGER_SMTP_GMAIL_FROM_ADDRESS=myaccount@gmail.com
      - WUD_TRIGGER_SMTP_GMAIL_TO=admin@example.com
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_SMTP_GMAIL_HOST="smtp.gmail.com" \
  -e WUD_TRIGGER_SMTP_GMAIL_PORT=465 \
  -e WUD_TRIGGER_SMTP_GMAIL_TLS_ENABLED=true \
  -e WUD_TRIGGER_SMTP_GMAIL_USER="myaccount@gmail.com" \
  -e WUD_TRIGGER_SMTP_GMAIL_PASS="abcd efgh ijkl mnop" \
  -e WUD_TRIGGER_SMTP_GMAIL_FROM_ADDRESS="myaccount@gmail.com" \
  -e WUD_TRIGGER_SMTP_GMAIL_TO="admin@example.com" \
  getwud/wud
```

</TabItem>
</Tabs>
