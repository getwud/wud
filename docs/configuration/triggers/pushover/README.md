# Pushover

![logo](pushover.png)

The `pushover` trigger lets you send real-time container update notifications to mobile devices and desktops using the [Pushover](https://pushover.net/) push notification service.

### Variables

| Env var                                        | Required       | Description                                                          | Supported values                                                                                   | Default value when missing  |
|------------------------------------------------|:--------------:|----------------------------------------------------------------------| -------------------------------------------------------------------------------------------------- |-----------------------------| 
| `WUD_TRIGGER_PUSHOVER_{trigger_name}_USER`     | :red_circle:   | Pushover User Key (or Group Key)                                     | String                                                                                             |                             |
| `WUD_TRIGGER_PUSHOVER_{trigger_name}_TOKEN`    | :red_circle:   | Pushover Application API token                                       | String                                                                                             |                             |
| `WUD_TRIGGER_PUSHOVER_{trigger_name}_DEVICE`   | :white_circle: | Target device name(s) (comma-separated, e.g., `dev1,dev2`)           | [Pushover device identifiers](https://pushover.net/api#identifiers)                                |                             |
| `WUD_TRIGGER_PUSHOVER_{trigger_name}_PRIORITY` | :white_circle: | Notification priority level (`-2` to `2`)                            | [Pushover message priority](https://pushover.net/api#priority)                                      | `0`                         |
| `WUD_TRIGGER_PUSHOVER_{trigger_name}_RETRY`    | :white_circle: | Notification retry interval in seconds (only when priority=`2`)      | Integer (minimum 30) [see docs](https://pushover.net/api#priority)                                 |                             |
| `WUD_TRIGGER_PUSHOVER_{trigger_name}_EXPIRE`   | :white_circle: | Notification expiration time in seconds (only when priority=`2`)     | Integer (up to 86400) [see docs](https://pushover.net/api#priority)                                |                             |
| `WUD_TRIGGER_PUSHOVER_{trigger_name}_SOUND`    | :white_circle: | Notification sound                                                   | [Supported Pushover sounds](https://pushover.net/api#sounds)                                       | `pushover`                  |
| `WUD_TRIGGER_PUSHOVER_{trigger_name}_HTML`     | :white_circle: | Allow HTML formatting in message body                                | `1` (true), `0` (false) [see docs](https://pushover.net/api#html)                                  | `0`                         |
| `WUD_TRIGGER_PUSHOVER_{trigger_name}_TTL`      | :white_circle: | Message Time to Live in seconds                                      | [Pushover TTL docs](https://pushover.net/api#ttl)                                                  |                             |

?> This trigger also supports [common trigger configuration options](configuration/triggers/?id=common-trigger-configuration).

### Examples

#### Minimal configuration

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_PUSHOVER_1_USER=your_user_key
      - WUD_TRIGGER_PUSHOVER_1_TOKEN=your_app_token
```

#### **Docker**
```bash
docker run \
  -e WUD_TRIGGER_PUSHOVER_1_USER="your_user_key" \
  -e WUD_TRIGGER_PUSHOVER_1_TOKEN="your_app_token" \
  ...
  getwud/wud
```
<!-- tabs:end -->

#### Advanced configuration (Emergency priority)

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_PUSHOVER_1_USER=your_user_key
      - WUD_TRIGGER_PUSHOVER_1_TOKEN=your_app_token
      - WUD_TRIGGER_PUSHOVER_1_DEVICE=myIphone,mySamsung
      - WUD_TRIGGER_PUSHOVER_1_SOUND=cosmic
      - WUD_TRIGGER_PUSHOVER_1_PRIORITY=2
      - WUD_TRIGGER_PUSHOVER_1_EXPIRE=600
      - WUD_TRIGGER_PUSHOVER_1_RETRY=60
```

#### **Docker**
```bash
docker run \
  -e WUD_TRIGGER_PUSHOVER_1_USER="your_user_key" \
  -e WUD_TRIGGER_PUSHOVER_1_TOKEN="your_app_token" \
  -e WUD_TRIGGER_PUSHOVER_1_DEVICE="myIphone,mySamsung" \
  -e WUD_TRIGGER_PUSHOVER_1_SOUND="cosmic" \
  -e WUD_TRIGGER_PUSHOVER_1_PRIORITY="2" \
  -e WUD_TRIGGER_PUSHOVER_1_EXPIRE="600" \
  -e WUD_TRIGGER_PUSHOVER_1_RETRY="60" \
  ...
  getwud/wud
```
<!-- tabs:end -->

### How to get your Pushover credentials

#### 1. Copy your User Key
Log in to your [Pushover Account Dashboard](https://pushover.net/). Your **User Key** is displayed in the top right corner.

#### 2. Create an Application API Token
Create a new application in the [Pushover Application Registration page](https://pushover.net/apps/build).

![image](pushover_register.png)

#### 3. Copy the API Token
Copy the generated API token from your newly created application.

![image](pushover_api_token.png)

