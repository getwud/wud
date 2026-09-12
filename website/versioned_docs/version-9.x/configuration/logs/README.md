import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Logs

You can adjust the log level and output format using environment variables.

### Variables

<ConfigList>
  <ConfigOption name="WUD_LOG_FORMAT"
    type="enum"
    required={false}
    defaultValue="text"
    supported="`text`, `json`">
    Log format (Applies only to console output, UI always shows structured logs)
  </ConfigOption>

  <ConfigOption name="WUD_LOG_LEVEL"
    type="enum"
    required={false}
    defaultValue="info"
    supported="`error`, `info`, `debug`, `trace`">
    Log level
  </ConfigOption>
</ConfigList>

### UI Live Logs

You can view the logs in real-time directly from the WUD User Interface. 
Navigate to **Monitoring** > **Logs** in the sidebar menu to see a live stream of the application logs. The UI displays the logs in a formatted table regardless of the `WUD_LOG_FORMAT` setting.

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
