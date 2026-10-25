---
title: Xmpp
description: Send container update notifications to XMPP (Jabber) recipients in WUD (What's Up Docker?).
---

import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# XMPP

<DocHero
  icon="simple-icons:xmpp"
  description="The xmpp trigger sends notifications via XMPP (Jabber) instant messaging."
/>

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_XMPP_{trigger_name}_SERVICE"
    required={true}
    type="string"
    supported="`xmpp://...`, `xmpps://...`, `ws://...`, `wss://...`">
    XMPP server service URL (`xmpps://` for direct TLS, `xmpp://` for STARTTLS)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_XMPP_{trigger_name}_DOMAIN"
    required={false}
    type="string">
    XMPP domain (inferred from JID if omitted)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_XMPP_{trigger_name}_USER"
    required={true}
    type="string">
    XMPP account username (local part of the JID)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_XMPP_{trigger_name}_PASSWORD"
    required={true}
    type="string">
    XMPP account password
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_XMPP_{trigger_name}_TO"
    required={true}
    type="string"
    supported="Valid JID, e.g. `recipient@example.com`">
    Recipient JID to send notifications to
  </ConfigOption>
</ConfigList>

:::info
This trigger also supports all [common trigger configuration options](../README.md#common-trigger-configuration) (such as thresholds, scheduling, and batching).
:::

---

## 🚀 Examples

### Send an XMPP Notification

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_XMPP_MAIN_SERVICE=xmpps://chat.example.com:5223
      - WUD_TRIGGER_XMPP_MAIN_DOMAIN=example.com
      - WUD_TRIGGER_XMPP_MAIN_USER=wud
      - WUD_TRIGGER_XMPP_MAIN_PASSWORD=mysecretpass
      - WUD_TRIGGER_XMPP_MAIN_TO=admin@example.com
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_XMPP_MAIN_SERVICE="xmpps://chat.example.com:5223" \
  -e WUD_TRIGGER_XMPP_MAIN_DOMAIN="example.com" \
  -e WUD_TRIGGER_XMPP_MAIN_USER="wud" \
  -e WUD_TRIGGER_XMPP_MAIN_PASSWORD="mysecretpass" \
  -e WUD_TRIGGER_XMPP_MAIN_TO="admin@example.com" \
  getwud/wud
```

</TabItem>
</Tabs>
