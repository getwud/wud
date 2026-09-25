import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Storage

WUD uses an embedded SQLite database (managed via Drizzle ORM) stored at `/store/wud.sqlite` by default.

To persist WUD state across container restarts and removals, mount `/store` as a persistent volume on your host.

:::info[Automatic Migration from legacy LokiJS]
If you are upgrading from an older version of WUD that used LokiJS (`wud.json`), WUD will **automatically migrate** all your containers, history, and app state into the new `wud.sqlite` database upon startup. The legacy `wud.json` file will then be renamed to `wud.json.migrated` as a backup.
:::

### Configuration Options

<ConfigList>
  <ConfigOption
    name="WUD_STORE_PATH"
    type="path"
    required={false}
    defaultValue="/store"
    supported="Directory path">
    Directory where database files are stored
  </ConfigOption>

  <ConfigOption
    name="WUD_STORE_FILE"
    type="string"
    required={false}
    defaultValue="wud.sqlite"
    supported="File name">
    Name of the SQLite database file
  </ConfigOption>
</ConfigList>

### Examples

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    volumes:
      - /path-on-my-host:/store
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -v /path-on-my-host:/store \
  ...
  getwud/wud
```

</TabItem>
</Tabs>
