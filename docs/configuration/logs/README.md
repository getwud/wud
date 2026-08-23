# Logs

You can adjust the log level and output format using environment variables.

### Variables

| Env var          |    Required    | Description | Supported values                  | Default value when missing |
| ---------------- | :------------: | ----------- | --------------------------------- | -------------------------- |
| `WUD_LOG_LEVEL`  | :white_circle: | Log level   | `error`, `info`, `debug`, `trace` | `info`                     |
| `WUD_LOG_FORMAT` | :white_circle: | Log format  | `text`, `json`                    | `text`                     |

### Examples

#### Set log level to debug

<!-- tabs:start -->

#### **Docker Compose**

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_LOG_LEVEL=debug
```

#### **Docker**

```bash
docker run -e WUD_LOG_LEVEL=debug ... getwud/wud
```

<!-- tabs:end -->

#### Set JSON log format (for example, for Elasticsearch ingestion)

<!-- tabs:start -->

#### **Docker**

```bash
docker run -e WUD_LOG_FORMAT=json ... getwud/wud
```

#### **Docker Compose**

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_LOG_FORMAT=json
```

<!-- tabs:end -->
