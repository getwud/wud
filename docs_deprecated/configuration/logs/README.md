import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Logs

You can adjust the log level and output format using environment variables.

### Variables

| Env var          |    Required    | Description | Supported values                  | Default value when missing |
| ---------------- | :------------: | ----------- | --------------------------------- | -------------------------- |
| `WUD_LOG_LEVEL`  | :white_circle: | Log level   | `error`, `info`, `debug`, `trace` | `info`                     |
| `WUD_LOG_FORMAT` | :white_circle: | Log format  | `text`, `json`                    | `text`                     |

### Examples

#### Set log level to debug

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_LOG_LEVEL=debug
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run -e WUD_LOG_LEVEL=debug ... getwud/wud
```

</TabItem>
</Tabs>

#### Set JSON log format (for example, for Elasticsearch ingestion)

<Tabs>
<TabItem value="docker" label="Docker">

```bash
docker run -e WUD_LOG_FORMAT=json ... getwud/wud
```

</TabItem>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_LOG_FORMAT=json
```

</TabItem>
</Tabs>
