import DocHero from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Kubernetes Watcher

<DocHero
  icon="kubernetes"
  badge="Kubernetes"
  badgeType="info"
  description="The Kubernetes watcher discovers and monitors workloads running in Kubernetes clusters, reporting when newer image versions are available."
/>

:::info[Supported workload types]

- `Deployment`
- `StatefulSet`
- `DaemonSet`
- `CronJob`

:::

---

## Prerequisites

WUD must be able to reach the Kubernetes API server. Two modes are supported:

- **In-cluster** (default): WUD runs inside the cluster with an appropriate `ServiceAccount`.
- **Out-of-cluster**: provide a path to a `kubeconfig` file via `WUD_WATCHER_KUBERNETES_{name}_KUBECONFIG`.

---

## RBAC (In-Cluster Mode)

When running WUD inside a Kubernetes cluster, configure the following RBAC resources so that WUD can read workloads, nodes, and pods:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: wud
  namespace: wud
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: wud-reader
rules:
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets", "daemonsets"]
    verbs: ["get", "list"]
  - apiGroups: ["batch"]
    resources: ["cronjobs"]
    verbs: ["get", "list"]
  - apiGroups: [""]
    resources: ["nodes", "pods"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: wud-reader-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: wud-reader
subjects:
  - kind: ServiceAccount
    name: wud
    namespace: wud
```

---

## Configuration Options

<ConfigList>
  <ConfigOption
    name="WUD_WATCHER_KUBERNETES_{name}_CRON"
    required={false}
    type="string"
    defaultValue="0 * * * *"
    supported="[Valid CRON expression](https://crontab.guru/)">
    CRON schedule for automatic checks
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_KUBERNETES_{name}_JITTER"
    type="integer"
    required={false}
    defaultValue="60000"
    supported="> 0">
    Random jitter in milliseconds applied to the CRON schedule
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_KUBERNETES_{name}_KUBECONFIG"
    type="path"
    required={false}
    supported="File path">
    Path to a kubeconfig file. When omitted, in-cluster ServiceAccount is used.
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_KUBERNETES_{name}_NAMESPACE"
    type="string"
    required={false}
    defaultValue="">
    Kubernetes namespace to watch. Empty means all namespaces.
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_KUBERNETES_{name}_WATCHATSTART"
    type="boolean"
    required={false}
    defaultValue="true">
    Trigger a watch cycle immediately at startup
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_KUBERNETES_{name}_WATCHBYDEFAULT"
    type="boolean"
    required={false}
    defaultValue="true">
    If true, all workloads are watched unless explicitly opted out
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_KUBERNETES_{name}_WATCHDIGESTDEFAULT"
    type="boolean"
    required={false}>
    Default behavior for digest watching on non-semver images
  </ConfigOption>

  <ConfigOption
    name="WUD_WATCHER_KUBERNETES_{name}_WORKLOADTYPES"
    type="string"
    required={false}
    defaultValue="Deployment,StatefulSet,DaemonSet,CronJob"
    supported="Comma-separated list or JSON array: Deployment, StatefulSet, DaemonSet, CronJob">
    Workload kinds to discover and monitor
  </ConfigOption>
</ConfigList>

---

## Workload Annotations

WUD supports annotations on Kubernetes workloads to fine-tune update discovery, filtering, and notifications:

| Annotation | Description | Example |
| --- | --- | --- |
| `wud.getwud.io/watch` | Opt-in or opt-out | `"true"` / `"false"` |
| `wud.getwud.io/tag.include` | Regex to include tags | `"^1\\.27\\..*"` |
| `wud.getwud.io/tag.exclude` | Regex to exclude tags | `".*-alpine"` |
| `wud.getwud.io/tag.transform` | Tag transform expression | `"s/^v//"` |
| `wud.getwud.io/watch.digest` | Watch image digest | `"true"` |
| `wud.getwud.io/link.template` | Link template | `` "`https://hub.docker.com/r/library/nginx/tags?name=${tag}`" `` |
| `wud.getwud.io/display.name` | Friendly display name | `"My Nginx"` |
| `wud.getwud.io/display.icon` | Iconify icon | `"mdi:kubernetes"` |
| `wud.getwud.io/trigger.include` | Trigger include filter | `"slack.*"` |
| `wud.getwud.io/trigger.exclude` | Trigger exclude filter | `"email"` |
| `wud.getwud.io/stack` | Stack/group name (default: namespace) | `"frontend"` |

### Per-container annotations (multi-container pods)

Suffix annotations with the container name to target a specific container within a pod:

```yaml
annotations:
  wud.getwud.io/display.name.nginx: "My Nginx"
  wud.getwud.io/display.name.sidecar: "My Sidecar"
  wud.getwud.io/watch.digest.nginx: "true"
```

---

## Examples

<Tabs>
<TabItem value="in-cluster" label="In-Cluster (default)">

```bash
WUD_WATCHER_KUBERNETES_MYCLUSTER_NAMESPACE=production
WUD_WATCHER_KUBERNETES_MYCLUSTER_WATCHBYDEFAULT=false
```

</TabItem>
<TabItem value="kubeconfig" label="Out-of-Cluster (kubeconfig)">

```bash
WUD_WATCHER_KUBERNETES_HOMELAB_KUBECONFIG=/home/wud/.kube/config
WUD_WATCHER_KUBERNETES_HOMELAB_NAMESPACE=default
```

</TabItem>
<TabItem value="annotation" label="Deployment with annotations">

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-nginx
  namespace: production
  annotations:
    wud.getwud.io/watch: "true"
    wud.getwud.io/tag.include: "^1\\.27\\..*"
    wud.getwud.io/display.name: "My Nginx"
    wud.getwud.io/display.icon: "mdi:nginx"
spec:
  selector:
    matchLabels:
      app: my-nginx
  template:
    metadata:
      labels:
        app: my-nginx
    spec:
      containers:
        - name: nginx
          image: nginx:1.27.0
```

</TabItem>
</Tabs>

---

## Container ID format

WUD builds a unique ID for each watched container:

```text
{namespace}_{kind}_{workloadName}_{containerName}
```

Example: `production_deployment_my-nginx_nginx`
