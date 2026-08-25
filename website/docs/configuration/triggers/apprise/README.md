import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Apprise

![logo](apprise.png)

The `apprise` trigger lets you send container update notifications via the [Apprise API](https://github.com/caronc/apprise-api).

### Variables

| Env var                                     |    Required    | Description                                                       | Supported values                                                                                       | Default value when missing |
| ------------------------------------------- | :------------: | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------- |
| `WUD_TRIGGER_APPRISE_{trigger_name}_URL`    |  :red_circle:  | Base URL of the Apprise API server                                | Valid HTTP/HTTPS URL                                                                                   |                            |
| `WUD_TRIGGER_APPRISE_{trigger_name}_URLS`   | :white_circle: | Comma-separated list of Apprise service notification URLs         | [Supported Apprise notification URLs](https://github.com/caronc/apprise#popular-notification-services) |                            |
| `WUD_TRIGGER_APPRISE_{trigger_name}_CONFIG` | :white_circle: | Name of an Apprise YAML configuration file                        | [Apprise persistent configuration documentation](https://github.com/caronc/apprise/wiki/config_yaml)   |                            |
| `WUD_TRIGGER_APPRISE_{trigger_name}_TAG`    | :white_circle: | Optional tag(s) to match when using an Apprise YAML configuration | [Apprise persistent configuration documentation](https://github.com/caronc/apprise/wiki/config_yaml)   |                            |

:::info
This trigger also supports [common trigger configuration options](../README.md#common-trigger-configuration).
:::

### Examples

#### Send an email and an SMS

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_APPRISE_LOCAL_URL=http://apprise:8000
      - WUD_TRIGGER_APPRISE_LOCAL_URLS=mailto://john.doe:secret@gmail.com,sns://AHIAJGNT76XIMXDBIJYA/bu1dHSdO22pfaaVy/wmNsdljF4C07D3bndi9PQJ9/us-east-2/+1(800)555-1223
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_APPRISE_LOCAL_URL="http://apprise:8000" \
  -e WUD_TRIGGER_APPRISE_LOCAL_URLS="mailto://john.doe:secret@gmail.com,sns://AHIAJGNT76XIMXDBIJYA/bu1dHSdO22pfaaVy/wmNsdljF4C07D3bndi9PQJ9/us-east-2/+1(800)555-1223" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>

#### Use a persistent YAML configuration

Declare an Apprise YAML configuration ([see docs](https://github.com/caronc/apprise/wiki/config_yaml)), such as `wud.yml`:

```yaml
# wud.yml example
urls:
  - tgram://{bot_token}/{chat_id}:
      - tag: devops
```

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_APPRISE_LOCAL_URL=http://apprise:8000
      - WUD_TRIGGER_APPRISE_LOCAL_CONFIG=wud # name of the YAML config file
      - WUD_TRIGGER_APPRISE_LOCAL_TAG=devops # tag filter for the config (optional)
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_APPRISE_LOCAL_URL="http://apprise:8000" \
  -e WUD_TRIGGER_APPRISE_LOCAL_CONFIG="wud" \
  -e WUD_TRIGGER_APPRISE_LOCAL_TAG="devops" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>

### How to run the Apprise API server

Run the official [Apprise Docker image](https://hub.docker.com/r/caronc/apprise).

For more details, see the [official Apprise API documentation](https://github.com/caronc/apprise-api).

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  apprise:
    image: caronc/apprise
    container_name: apprise
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run caronc/apprise
```

</TabItem>
</Tabs>
