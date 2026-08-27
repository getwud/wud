---
title: Nomad
description: Update HashiCorp Nomad-managed containers cleanly via the Nomad API in What's Up Docker (WUD).
---

import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Nomad

![logo](nomad.svg)

The `nomad` trigger updates containers managed by [HashiCorp Nomad](https://www.nomadproject.io/) cleanly through the Nomad HTTP API without conflicting with Nomad's container lifecycle supervision.

---

## 🔄 How It Works

Nomad actively supervises its containers (handling service discovery, templating, health checks, and restart policies). Rather than replacing containers via the Docker socket, the `nomad` trigger instructs Nomad's API to restart the allocation task natively.

:::important[Force Pull Required in Job Spec]
Ensure the target task has `force_pull = true` set in its Nomad job definition so Nomad pulls the newly released image before restarting the task.
:::

---

## ⚙️ Configuration Variables

<ConfigList>
  <ConfigOption
    name="WUD_TRIGGER_NOMAD_{trigger_name}_ADDRESS"
    required={false}
    type="url"
    defaultValue="http://127.0.0.1:4646"
    supported="Valid HTTP/HTTPS URL">
    Base URL of the Nomad HTTP API
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_NOMAD_{trigger_name}_TOKEN"
    required={false}
    type="string"
    supported="Valid Secret ID UUID">
    Nomad Secret ID / ACL token (sent via `X-Nomad-Token`)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_NOMAD_{trigger_name}_ALLTASKS"
    required={false}
    type="boolean"
    defaultValue="false">
    Restart all tasks in the allocation instead of only the target task
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_NOMAD_{trigger_name}_ALLOCLABEL"
    required={false}
    type="string"
    defaultValue="com.hashicorp.nomad.alloc_id">
    Container label containing the Nomad allocation ID
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_NOMAD_{trigger_name}_TASKLABEL"
    required={false}
    type="string"
    defaultValue="com.hashicorp.nomad.task_name">
    Container label containing the Nomad task name
  </ConfigOption>
</ConfigList>

:::info
This trigger also supports all [common trigger configuration options](../README.md#common-trigger-configuration) (such as thresholds, scheduling, and batching).
:::

---

## 🚀 Examples

### Basic Nomad API Setup

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_NOMAD_LOCAL_ADDRESS=http://127.0.0.1:4646
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_NOMAD_LOCAL_ADDRESS="http://127.0.0.1:4646" \
  getwud/wud
```

</TabItem>
</Tabs>

### ACL-Secured Nomad Cluster

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      - WUD_TRIGGER_NOMAD_LOCAL_ADDRESS=https://nomad.internal:4646
      - WUD_TRIGGER_NOMAD_LOCAL_TOKEN=00000000-0000-0000-0000-000000000000
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_NOMAD_LOCAL_ADDRESS="https://nomad.internal:4646" \
  -e WUD_TRIGGER_NOMAD_LOCAL_TOKEN="00000000-0000-0000-0000-000000000000" \
  getwud/wud
```

</TabItem>
</Tabs>
