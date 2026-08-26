import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Container Labels

Container labels allow you to customize WUD behavior on a **per-container basis** by attaching `wud.*` labels directly to your Docker or Compose services.

---

## Available Labels

<ConfigList>
  <ConfigOption
    name="wud.display.icon"
    required={false}
    type="url"
    defaultValue="mdi:docker"
    supported="Material Design, Font Awesome, Simple Icons, Homarr, Selfh.st">
    Custom display icon for the container in the UI and integrations
  </ConfigOption>

  <ConfigOption
    name="wud.display.name"
    required={false}
    type="string"
    defaultValue="Container name"
    supported="Any string">
    Custom display name for the container in notifications and UI
  </ConfigOption>

  <ConfigOption
    name="wud.link.template"
    required={false}
    type="enum"
    supported="JS string template (${container}, ${original}, ${transformed}, ${major}, ${minor}, ${patch}, ${prerelease})">
    Browsable URL template for changelogs and release notes
  </ConfigOption>

  <ConfigOption
    name="wud.tag.exclude"
    required={false}
    type="regex"
    supported="Valid JavaScript RegExp">
    Regular expression matching image tags to ignore
  </ConfigOption>

  <ConfigOption
    name="wud.tag.include"
    required={false}
    type="regex"
    supported="Valid JavaScript RegExp">
    Regular expression matching image tags to consider as update candidates
  </ConfigOption>

  <ConfigOption
    name="wud.tag.transform"
    required={false}
    type="regex"
    supported="`$regex => $string` with capturing groups">
    Transform rule to extract clean semver versions from non-standard tags
  </ConfigOption>

  <ConfigOption
    name="wud.trigger.exclude"
    type="list"
    required={false}
    supported="`trigger1,trigger2:threshold`">
    List of triggers to exclude for this container
  </ConfigOption>

  <ConfigOption
    name="wud.trigger.include"
    type="list"
    required={false}
    supported="`trigger1,trigger2:threshold`">
    List of triggers to include for this container
  </ConfigOption>

  <ConfigOption
    name="wud.watch"
    required={false}
    type="boolean"
    defaultValue="true"
    supported="Boolean (`true`, `false`)">
    Enable or disable monitoring for this container
  </ConfigOption>

  <ConfigOption
    name="wud.watch.digest"
    required={false}
    type="boolean"
    defaultValue="false"
    supported="Boolean (`true`, `false`)">
    Track digest changes on registry for mutable tags (e.g. `latest`)
  </ConfigOption>
</ConfigList>

---

## Practical Examples

### 1. Opt-in Monitoring (Monitor Only Selected Containers)

Set `WUD_WATCHER_{watcher_name}_WATCHBYDEFAULT=false` in your WUD configuration:

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - WUD_WATCHER_LOCAL_WATCHBYDEFAULT=false
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run -d \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -e WUD_WATCHER_LOCAL_WATCHBYDEFAULT="false" \
  getwud/wud
```

</TabItem>
</Tabs>

Then add `wud.watch=true` only to the containers you want to monitor:

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  mariadb:
    image: mariadb:10.4.5
    labels:
      - wud.watch=true
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run -d --name mariadb --label wud.watch=true mariadb:10.4.5
```

</TabItem>
</Tabs>

---

### 2. Exclude Specific Containers

When `WATCHBYDEFAULT=true` (the default), you can exclude specific containers with `wud.watch=false`:

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  legacy_app:
    image: myapp:1.0.0
    labels:
      - wud.watch=false
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run -d --name legacy_app --label wud.watch=false myapp:1.0.0
```

</TabItem>
</Tabs>

---

### 3. Filter Tags with Regular Expressions

You can filter which tags are considered valid candidates for updates by specifying inclusion or exclusion regex patterns.

For example, to monitor only standard `x.y.z` 3-part semver tags (ignoring `alpine`, `beta`, etc.):

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  mariadb:
    image: mariadb:10.4.5
    labels:
      - wud.tag.include=^\d+\.\d+\.\d+$$
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run -d --name mariadb --label 'wud.tag.include=^\d+\.\d+\.\d+$' mariadb:10.4.5
```

</TabItem>
</Tabs>

---

### 4. Transform Non-Standard Tags Before Semver Analysis

In certain cases, image tags include metadata suffixes (such as commit hashes or build numbers) like `1.0.0-99-7b368146` or `1.0.0-273-21d7efa6`.

By default, the trailing SHA-1 hash (`-7b368146`) interferes with comparison, even though `1.0.0-99` represents a valid semver version (`$major.$minor.$patch-$prerelease`).

#### Syntax
```
$valid_regex_with_capturing_groups => $valid_string_with_placeholders
```

Capturing groups are referenced using `$1`, `$2`, etc.

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  searx:
    image: searx/searx:1.0.0-269-7b368146
    labels:
      - wud.tag.include=^\d+\.\d+\.\d+-\d+-.*$$
      - wud.tag.transform=^(\d+\.\d+\.\d+-\d+)-.*$$ => $$1
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run -d --name searx \
  --label 'wud.tag.include=^\d+\.\d+\.\d+-\d+-.*$' \
  --label 'wud.tag.transform=^(\d+\.\d+\.\d+-\d+)-.*$ => $1' \
  searx/searx:1.0.0-269-7b368146
```

</TabItem>
</Tabs>

---

### 5. Enable Digest Watching

In addition to semver tag tracking, you can track whether the remote image digest for a mutable tag (such as `latest`, `10`, or `stable`) has changed on the registry:

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  redis:
    image: redis:alpine
    labels:
      - wud.watch.digest=true
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run -d --name redis --label wud.watch.digest=true redis:alpine
```

</TabItem>
</Tabs>

---

### 6. Link Container Versions to Changelogs / Release Notes

You can generate a direct clickable link to release notes using a URL template:

The available template variables are:
- `${original}`: The original unparsed tag
- `${transformed}`: The tag after applying `wud.tag.transform`
- `${major}`: Major version number
- `${minor}`: Minor version number
- `${patch}`: Patch version number
- `${prerelease}`: Prerelease identifier

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  mariadb:
    image: mariadb:10.6.4
    labels:
      - wud.link.template=https://mariadb.com/kb/en/mariadb-$${major}$${minor}$${patch}-changelog
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run -d --name mariadb \
  --label 'wud.link.template=https://mariadb.com/kb/en/mariadb-${major}${minor}${patch}-changelog' \
  mariadb:10.6.4
```

</TabItem>
</Tabs>

---

### 7. Customize Display Name & Icon

Customize how containers appear in the WUD Web UI and smart home integrations (e.g. Home Assistant):

#### Supported Icon Prefixes
- `mdi:` or `mdi-` for [Material Design Icons](https://materialdesignicons.com/) (`mdi:database`, `mdi-server`)
- `si:` or `si-` for [Simple Icons](https://simpleicons.org/) (`si:mysql`, `si-plex`)
- `fab:`, `far:`, `fas:` for [Font Awesome](https://fontawesome.com/) (`fab:github`, `fas:heart`)
- `hl:` or `hl-` for [Homarr Labs](https://dashboardicons.com/) (`hl:plex`, `hl-authelia`)
- `sh:` or `sh-` for [Selfh.st](https://selfh.st/icons/) (`sh:authentik`, `sh-authelia-light`)

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  mariadb:
    image: mariadb:10.6.4
    labels:
      - wud.display.name=Production MariaDB
      - wud.display.icon=si:mariadb
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run -d --name mariadb \
  --label 'wud.display.name=Production MariaDB' \
  --label 'wud.display.icon=si:mariadb' \
  mariadb:10.6.4
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

#### Example: Send Email for All Updates, Auto-Update on Minor/Patch Only
<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  web_app:
    image: web_app:1.2.0
    labels:
      - wud.trigger.include=smtp.gmail,dockercompose.local:minor
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run -d --name web_app \
  --label 'wud.trigger.include=smtp.gmail,dockercompose.local:minor' \
  web_app:1.2.0
```

</TabItem>
</Tabs>
