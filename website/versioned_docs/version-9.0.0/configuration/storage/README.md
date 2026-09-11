import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Storage

WUD uses an embedded SQLite database (managed via Drizzle ORM) stored at `/store/wud.sqlite` by default.

To persist WUD state across container restarts and removals, mount `/store` as a persistent volume on your host.

:::info[Automatic Migration from legacy LokiJS]
If you are upgrading from an older version of WUD that used LokiJS (`wud.json`), WUD will **automatically migrate** all your containers, history, and app state into the new `wud.sqlite` database upon startup. The legacy `wud.json` file will then be renamed to `wud.json.migrated` as a backup.
:::

### Configuration Options

| Environment Variable | Description | Default |
| --- | --- | --- |
| `WUD_STORE_PATH` | Directory where database files are stored | `/store` |
| `WUD_STORE_FILE` | Name of the SQLite database file | `wud.sqlite` |

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
