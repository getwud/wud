# Command

![logo](command.png)

The `command` trigger lets you run arbitrary shell commands or scripts upon container update notifications.

### Variables

| Env var                                      |    Required    | Description                 | Supported values                            | Default value when missing |
|----------------------------------------------|:--------------:|-----------------------------|---------------------------------------------|----------------------------| 
| `WUD_TRIGGER_COMMAND_{trigger_name}_CMD`     | :red_circle:   | The shell command to run    | String                                      |                            |
| `WUD_TRIGGER_COMMAND_{trigger_name}_SHELL`   | :white_circle: | Shell binary path to use    | Valid installed shell path                  | `/bin/sh`                  |
| `WUD_TRIGGER_COMMAND_{trigger_name}_TIMEOUT` | :white_circle: | Command execution timeout (in ms) | Positive integer (`0` for no timeout) | `60000` (1 minute)         |

?> This trigger also supports [common trigger configuration options](configuration/triggers/?id=common-trigger-configuration).

?> Update information is passed to the command process as environment variables (see below).

### Environment variables passed to the executed command

#### In simple mode (one execution per container update)
- `display_icon`
- `display_name`
- `id`
- `image_architecture`
- `image_created`
- `image_digest_repo`
- `image_digest_watch`
- `image_id`
- `image_name`
- `image_os`
- `image_registry_name`
- `image_registry_url`
- `image_tag_semver`
- `image_tag_value`
- `name`
- `result_tag`
- `status`
- `update_available`
- `update_kind_kind`
- `update_kind_local_value`
- `update_kind_remote_value`
- `update_kind_semver_diff`
- `watcher`

##### Example environment values
```bash
display_icon='mdi:docker'
display_name='test-nginx-1'
id='94f9f845de0fc4f8ad17c0ee1aaeaf495669de229edf41cdcd14d2af7157e47e'
image_architecture='amd64'
image_created='2023-06-13T07:15:33.483Z'
image_digest_repo='sha256:b997b0db9c2bc0a2fb803ced5fb9ff3a757e54903a28ada3e50412cc3ab7822f'
image_digest_watch=false
image_id='sha256:7d3c40f240e18f6b440bf06b1dfd8a9c48a49c1dfe3400772c3b378739cbdc47'
image_name='library/nginx'
image_os='linux'
image_registry_name='hub.public'
image_registry_url='https://registry-1.docker.io/v2'
image_tag_semver=true
image_tag_value='1.25.0'
name='test-nginx-1'
result_tag='stable-alpine3.20-slim'
status='running'
update_available=true
update_kind_kind='tag'
update_kind_local_value='1.25.0'
update_kind_remote_value='stable-alpine3.20-slim'
update_kind_semver_diff='major'
watcher='local'
```

?> In addition, a `container_json` environment variable is passed containing the full container entity serialized as a JSON string.

#### In batch mode (one execution for a batch of container updates)

?> A `containers_json` environment variable is passed containing the JSON array of all update objects.

### Examples

#### Running an inline shell command

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_COMMAND_LOCAL_CMD=echo "$${display_name} can be updated to $${update_kind_remote_value}"
```
#### **Docker**
```bash
docker run \
  -e 'WUD_TRIGGER_COMMAND_LOCAL_CMD=echo "${display_name} can be updated to ${update_kind_remote_value}"' \
  ...
  getwud/wud
```
<!-- tabs:end -->

#### Running a mounted Bash script

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_COMMAND_LOCAL_CMD=/wud/trigger.sh
      - WUD_TRIGGER_COMMAND_LOCAL_SHELL=/bin/bash
    volumes:
      - ${PWD}/wud/trigger.sh:/wud/trigger.sh:ro
```
#### **Docker**
```bash
docker run \
  -e WUD_TRIGGER_COMMAND_LOCAL_CMD="/wud/trigger.sh" \
  -e WUD_TRIGGER_COMMAND_LOCAL_SHELL="/bin/bash" \
  -v ${PWD}/wud/trigger.sh:/wud/trigger.sh:ro \
  ...
  getwud/wud
```
<!-- tabs:end -->

