import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Container & Workload Customization

WUD allows you to fine-tune monitoring behavior on a **per-workload basis** using metadata attached directly to your containers, pods, or jobs.

Regardless of your orchestrator, the property names and logic are **100% identical**:

| Orchestrator | Metadata Type | Canonical Key Format | Supported Aliases |
| :--- | :--- | :--- | :--- |
| 🐳 **Docker / Compose** | Container Labels | `wud.<property>` | — |
| 🐝 **Docker Swarm** | Service Labels (`deploy.labels`) | `getwud.app/<property>` | `wud.<property>`, `wud/<property>` |
| ☸️ **Kubernetes** | Workload Annotations | `getwud.app/<property>` | `wud/<property>`, `wud.getwud.io/<property>` |
| 🟢 **Nomad** | Task / Group / Job Meta | `getwud.app/<property>` | `wud.<property>`, `wud/<property>` |

---

## Multi-Container Targeting

In orchestrators that support multi-container workloads (such as Kubernetes Pods or Nomad Task Groups):

- **Workload-level default**: Set the property globally on the Deployment, StatefulSet, or Nomad Job/Group to apply to all containers.
- **Per-container override**: Suffix the property with `.<container_name>` (or `<task_name>`) to target a specific container:
  - Kubernetes: `getwud.app/tag.include.nginx: "^1\\.27"`
  - Nomad: `"getwud.app/tag.include.web" = "^1\\.27"` (or place directly inside the task's `meta {}` block)

---

## Available Properties

<ConfigList>
  <ConfigOption
    name="display.icon"
    required={false}
    type="string"
    defaultValue="mdi:docker"
    supported="Any Iconify icon (mdi, simple-icons, selfhst, logos, fa6, etc.)">
    Custom display icon for the workload in the UI and integrations
  </ConfigOption>

  <ConfigOption
    name="display.name"
    required={false}
    type="string"
    defaultValue="Container or Task name"
    supported="Any string">
    Custom display name for the container in notifications and UI
  </ConfigOption>

  <ConfigOption
    name="link.template"
    required={false}
    type="enum"
    supported="JS string template (${container}, ${original}, ${transformed}, ${major}, ${minor}, ${patch}, ${prerelease})">
    Browsable URL template for changelogs and release notes
  </ConfigOption>

  <ConfigOption
    name="tag.exclude"
    required={false}
    type="regex"
    supported="Valid JavaScript RegExp">
    Regular expression matching image tags to ignore
  </ConfigOption>

  <ConfigOption
    name="tag.include"
    required={false}
    type="regex"
    supported="Valid JavaScript RegExp">
    Regular expression matching image tags to consider as update candidates
  </ConfigOption>

  <ConfigOption
    name="tag.transform"
    required={false}
    type="regex"
    supported="`$regex => $string` with capturing groups">
    Transform rule to extract clean semver versions from non-standard tags
  </ConfigOption>

  <ConfigOption
    name="trigger.exclude"
    type="list"
    required={false}
    supported="`trigger1,trigger2:threshold`">
    List of triggers to exclude for this container
  </ConfigOption>

  <ConfigOption
    name="trigger.include"
    type="list"
    required={false}
    supported="`trigger1,trigger2:threshold`">
    List of triggers to include for this container
  </ConfigOption>

  <ConfigOption
    name="watch"
    required={false}
    type="boolean"
    defaultValue="true"
    supported="Boolean (`true`, `false`)">
    Enable or disable monitoring for this container / workload
  </ConfigOption>

  <ConfigOption
    name="watch.delay"
    required={false}
    type="string"
    supported="Duration string (e.g. `30s`, `10m`, `24h`, `3d`, `1w`)">
    Cool-down period before considering an update available for this container (can also be specified as `tag.delay`)
  </ConfigOption>

  <ConfigOption
    name="watch.digest"
    required={false}
    type="boolean"
    defaultValue="false"
    supported="Boolean (`true`, `false`)">
    Track digest changes on registry for mutable tags (e.g. `latest`)
  </ConfigOption>

  <ConfigOption
    name="stack"
    required={false}
    type="string"
    supported="Any string">
    Custom stack or project name for grouping (defaults to Compose project, K8s namespace, or Nomad namespace)
  </ConfigOption>
</ConfigList>

---

## Practical Examples

### 1. Opt-in Monitoring (Monitor Only Selected Workloads)

When `WATCHBYDEFAULT=false` is configured on the watcher, workloads are ignored unless explicitly marked with `watch=true`:

<Tabs groupId="orchestrator">
<TabItem value="docker" label="🐳 Docker">

```yaml title="compose.yaml"
services:
  mariadb:
    image: mariadb:10.4.5
    labels:
      - wud.watch=true
```

```bash title="Docker CLI"
docker run -d --name mariadb --label wud.watch=true mariadb:10.4.5
```

</TabItem>
<TabItem value="kubernetes" label="☸️ Kubernetes">

```yaml title="deployment.yaml"
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mariadb
  namespace: default
  annotations:
    getwud.app/watch: "true"
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: mariadb
          image: mariadb:10.4.5
```

</TabItem>
<TabItem value="nomad" label="🟢 Nomad">

```hcl title="job.nomad.hcl"
job "mariadb" {
  meta {
    "getwud.app/watch" = "true"
  }
  group "db" {
    task "server" {
      driver = "docker"
      config {
        image = "mariadb:10.4.5"
      }
    }
  }
}
```

</TabItem>
<TabItem value="swarm" label="🐝 Docker Swarm">

```yaml title="stack.yaml"
version: '3.8'

services:
  mariadb:
    image: mariadb:10.4.5
    deploy:
      labels:
        - getwud.app/watch=true
```

</TabItem>
</Tabs>

---

### 2. Exclude Specific Workloads

When `WATCHBYDEFAULT=true` (the default), exclude specific workloads by setting `watch=false`:

<Tabs groupId="orchestrator">
<TabItem value="docker" label="🐳 Docker">

```yaml title="compose.yaml"
services:
  legacy_app:
    image: myapp:1.0.0
    labels:
      - wud.watch=false
```

</TabItem>
<TabItem value="kubernetes" label="☸️ Kubernetes">

```yaml title="deployment.yaml"
apiVersion: apps/v1
kind: Deployment
metadata:
  name: legacy-app
  annotations:
    getwud.app/watch: "false"
spec:
  template:
    spec:
      containers:
        - name: app
          image: myapp:1.0.0
```

</TabItem>
<TabItem value="nomad" label="🟢 Nomad">

```hcl title="job.nomad.hcl"
job "legacy-app" {
  meta {
    "getwud.app/watch" = "false"
  }
  group "app" {
    task "server" {
      driver = "docker"
      config {
        image = "myapp:1.0.0"
      }
    }
  }
}
```

</TabItem>
<TabItem value="swarm" label="🐝 Docker Swarm">

```yaml title="stack.yaml"
version: '3.8'

services:
  legacy_app:
    image: myapp:1.0.0
    deploy:
      labels:
        - getwud.app/watch=false
```

</TabItem>
</Tabs>

---

### 3. Filter Tags with Regular Expressions

Filter which tags are considered valid candidates for updates by specifying inclusion or exclusion regex patterns.

For example, to monitor only standard `x.y.z` 3-part semver tags (ignoring `alpine`, `beta`, `rc`):

<Tabs groupId="orchestrator">
<TabItem value="docker" label="🐳 Docker">

```yaml title="compose.yaml"
services:
  mariadb:
    image: mariadb:10.4.5
    labels:
      - wud.tag.include=^\d+\.\d+\.\d+$
```

</TabItem>
<TabItem value="kubernetes" label="☸️ Kubernetes">

```yaml title="deployment.yaml"
metadata:
  annotations:
    getwud.app/tag.include: "^\\d+\\.\\d+\\.\\d+$"
```

</TabItem>
<TabItem value="nomad" label="🟢 Nomad">

```hcl title="job.nomad.hcl"
job "mariadb" {
  meta {
    "getwud.app/tag.include" = "^\\d+\\.\\d+\\.\\d+$"
  }
}
```

</TabItem>
<TabItem value="swarm" label="🐝 Docker Swarm">

```yaml title="stack.yaml"
version: '3.8'

services:
  mariadb:
    image: mariadb:10.4.5
    deploy:
      labels:
        - getwud.app/tag.include=^\d+\.\d+\.\d+$
```

</TabItem>
</Tabs>

---

### 4. Transform Non-Standard Tags Before Semver Analysis

In certain cases, image tags include metadata suffixes (such as commit hashes or build numbers) like `1.0.0-99-7b368146`.

By default, the trailing SHA-1 hash (`-7b368146`) interferes with comparison, even though `1.0.0-99` represents a valid semver version.

#### Syntax

```text
$valid_regex_with_capturing_groups => $valid_string_with_placeholders
```

Capturing groups are referenced using `$1`, `$2`, etc.

<Tabs groupId="orchestrator">
<TabItem value="docker" label="🐳 Docker">

```yaml title="compose.yaml"
services:
  searx:
    image: searx/searx:1.0.0-269-7b368146
    labels:
      - wud.tag.include=^\d+\.\d+\.\d+-\d+-.*$
      - wud.tag.transform=^(\d+\.\d+\.\d+-\d+)-.*$ => $1
```

</TabItem>
<TabItem value="kubernetes" label="☸️ Kubernetes">

```yaml title="deployment.yaml"
metadata:
  annotations:
    getwud.app/tag.include: "^\\d+\\.\\d+\\.\\d+-\\d+-.*$"
    getwud.app/tag.transform: "^(\\d+\\.\\d+\\.\\d+-\\d+)-.*$ => $1"
```

</TabItem>
<TabItem value="nomad" label="🟢 Nomad">

```hcl title="job.nomad.hcl"
job "searx" {
  meta {
    "getwud.app/tag.include"   = "^\\d+\\.\\d+\\.\\d+-\\d+-.*$"
    "getwud.app/tag.transform" = "^(\\d+\\.\\d+\\.\\d+-\\d+)-.*$ => $1"
  }
}
```

</TabItem>
<TabItem value="swarm" label="🐝 Docker Swarm">

```yaml title="stack.yaml"
version: '3.8'

services:
  searx:
    image: searx/searx:1.0.0-269-7b368146
    deploy:
      labels:
        - getwud.app/tag.include=^\d+\.\d+\.\d+-\d+-.*$
        - getwud.app/tag.transform=^(\d+\.\d+\.\d+-\d+)-.*$ => $1
```

</TabItem>
</Tabs>

---

### 5. Enable Digest Watching

In addition to semver tag tracking, you can track whether the remote image digest for a mutable tag (such as `latest`, `10`, or `stable`) has changed on the registry:

<Tabs groupId="orchestrator">
<TabItem value="docker" label="🐳 Docker">

```yaml title="compose.yaml"
services:
  redis:
    image: redis:alpine
    labels:
      - wud.watch.digest=true
```

</TabItem>
<TabItem value="kubernetes" label="☸️ Kubernetes">

```yaml title="deployment.yaml"
metadata:
  annotations:
    getwud.app/watch.digest: "true"
```

</TabItem>
<TabItem value="nomad" label="🟢 Nomad">

```hcl title="job.nomad.hcl"
job "redis" {
  meta {
    "getwud.app/watch.digest" = "true"
  }
}
```

</TabItem>
<TabItem value="swarm" label="🐝 Docker Swarm">

```yaml title="stack.yaml"
version: '3.8'

services:
  redis:
    image: redis:alpine
    deploy:
      labels:
        - getwud.app/watch.digest=true
```

</TabItem>
</Tabs>

---

### 6. Link Container Versions to Changelogs / Release Notes

Generate a direct clickable link to release notes in notifications and the Web UI using a URL template:

Available template variables:

- `${original}`: The original unparsed tag
- `${transformed}`: The tag after applying `tag.transform`
- `${major}`: Major version number
- `${minor}`: Minor version number
- `${patch}`: Patch version number
- `${prerelease}`: Prerelease identifier

<Tabs groupId="orchestrator">
<TabItem value="docker" label="🐳 Docker">

```yaml title="compose.yaml"
services:
  mariadb:
    image: mariadb:10.6.4
    labels:
      - wud.link.template=https://mariadb.com/kb/en/mariadb-${major}${minor}${patch}-changelog
```

</TabItem>
<TabItem value="kubernetes" label="☸️ Kubernetes">

```yaml title="deployment.yaml"
metadata:
  annotations:
    getwud.app/link.template: "https://mariadb.com/kb/en/mariadb-${major}${minor}${patch}-changelog"
```

</TabItem>
<TabItem value="nomad" label="🟢 Nomad">

```hcl title="job.nomad.hcl"
job "mariadb" {
  meta {
    "getwud.app/link.template" = "https://mariadb.com/kb/en/mariadb-${major}${minor}${patch}-changelog"
  }
}
```

</TabItem>
<TabItem value="swarm" label="🐝 Docker Swarm">

```yaml title="stack.yaml"
version: '3.8'

services:
  mariadb:
    image: mariadb:10.6.4
    deploy:
      labels:
        - getwud.app/link.template=https://mariadb.com/kb/en/mariadb-${major}${minor}${patch}-changelog
```

</TabItem>
</Tabs>

---

### 7. Customize Display Name & Icon

Customize how workloads appear in the WUD Web UI and smart home integrations (e.g. Home Assistant):

#### Supported Icons

WUD supports the full [Iconify](https://icon-sets.iconify.design/) catalog (over 150,000+ open-source icons across 150+ collections) using the standard `collection:icon-name` format:

- `mdi:` for [Material Design Icons](https://icon-sets.iconify.design/mdi/) (`mdi:database`, `mdi:docker`)
- `simple-icons:` (or `si:`) for [Simple Icons](https://icon-sets.iconify.design/simple-icons/) (`simple-icons:mysql`, `si:mariadb`)
- `selfhst:` (or `sh:`) for [Selfh.st Icons](https://icon-sets.iconify.design/selfhst/) (`selfhst:authentik`, `selfhst:jellyfin`)
- `logos:` for [SVG Logos](https://icon-sets.iconify.design/logos/) (`logos:redis`, `logos:postgresql`)
- `fa6-solid:`, `fa6-regular:`, `fa6-brands:` for [Font Awesome](https://icon-sets.iconify.design/fa6-solid/) (`fa6-brands:github`, `fa:heart`)

<Tabs groupId="orchestrator">
<TabItem value="docker" label="🐳 Docker">

```yaml title="compose.yaml"
services:
  mariadb:
    image: mariadb:10.6.4
    labels:
      - wud.display.name=Production MariaDB
      - wud.display.icon=si:mariadb
```

</TabItem>
<TabItem value="kubernetes" label="☸️ Kubernetes">

```yaml title="deployment.yaml"
metadata:
  annotations:
    getwud.app/display.name: "Production MariaDB"
    getwud.app/display.icon: "si:mariadb"
```

</TabItem>
<TabItem value="nomad" label="🟢 Nomad">

```hcl title="job.nomad.hcl"
job "mariadb" {
  meta {
    "getwud.app/display.name" = "Production MariaDB"
    "getwud.app/display.icon" = "si:mariadb"
  }
}
```

</TabItem>
<TabItem value="swarm" label="🐝 Docker Swarm">

```yaml title="stack.yaml"
version: '3.8'

services:
  mariadb:
    image: mariadb:10.6.4
    deploy:
      labels:
        - getwud.app/display.name=Production MariaDB
        - getwud.app/display.icon=si:mariadb
```

</TabItem>
</Tabs>

---

### 8. Assign Specific Triggers & Thresholds

Route notifications or auto-updates for a specific container to designated triggers:

#### Threshold Levels

- `all`: Triggers on all updates (semver & digest).
- `major`: Triggers on `major`, `minor`, or `patch` updates.
- `minor`: Triggers only on `minor` or `patch` updates.
- `patch`: Triggers only on `patch` updates.

<Tabs groupId="orchestrator">
<TabItem value="docker" label="🐳 Docker">

```yaml title="compose.yaml"
services:
  web_app:
    image: web_app:1.2.0
    labels:
      - wud.trigger.include=smtp.gmail,dockercompose.local:minor
```

</TabItem>
<TabItem value="kubernetes" label="☸️ Kubernetes">

```yaml title="deployment.yaml"
metadata:
  annotations:
    getwud.app/trigger.include: "smtp.gmail,webhook.prod:minor"
```

</TabItem>
<TabItem value="nomad" label="🟢 Nomad">

```hcl title="job.nomad.hcl"
job "web-app" {
  meta {
    "getwud.app/trigger.include" = "smtp.gmail,webhook.prod:minor"
  }
}
```

</TabItem>
<TabItem value="swarm" label="🐝 Docker Swarm">

```yaml title="stack.yaml"
version: '3.8'

services:
  web_app:
    image: web_app:1.2.0
    deploy:
      labels:
        - getwud.app/trigger.include=smtp.gmail,webhook.prod:minor
```

</TabItem>
</Tabs>

---

### 9. Configure Cool-Down Period Before Update Trigger

To prevent updating to fresh upstream releases immediately (e.g. to wait for hotfixes or community feedback), set a cool-down delay:

<Tabs groupId="orchestrator">
<TabItem value="docker" label="🐳 Docker">

```yaml title="compose.yaml"
services:
  web_app:
    image: web_app:1.2.0
    labels:
      - wud.watch.delay=3d
```

</TabItem>
<TabItem value="kubernetes" label="☸️ Kubernetes">

```yaml title="deployment.yaml"
metadata:
  annotations:
    getwud.app/watch.delay: "3d"
```

</TabItem>
<TabItem value="nomad" label="🟢 Nomad">

```hcl title="job.nomad.hcl"
job "web-app" {
  meta {
    "getwud.app/watch.delay" = "3d"
  }
}
```

</TabItem>
<TabItem value="swarm" label="🐝 Docker Swarm">

```yaml title="stack.yaml"
version: '3.8'

services:
  web_app:
    image: web_app:1.2.0
    deploy:
      labels:
        - getwud.app/watch.delay=3d
```

</TabItem>
</Tabs>
