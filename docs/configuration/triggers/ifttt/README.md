# Ifttt
![logo](ifttt.png)

The `ifttt` trigger lets you send container update notifications to Ifttt via the [Maker Webhook applet](https://ifttt.com/maker_webhooks/).

### Variables

| Env var                                  | Required       | Description     | Supported values | Default value when missing |
| ---------------------------------------- |:--------------:| --------------- | ---------------- | -------------------------- | 
| `WUD_TRIGGER_IFTTT_{trigger_name}_KEY`   | :red_circle:   | The Webhook key |                  |                            |
| `WUD_TRIGGER_IFTTT_{trigger_name}_EVENT` | :white_circle: | The event name  |                  | `wud-image`.               |

?> This trigger also supports the [common configuration variables](configuration/triggers/?id=common-trigger-configuration).

### Ifttt ingredients
On Webhook call, Ifttt captures the following ingredients:
- eventName
- occuredAt
- value1 (the image which can be updated)
- value2 (the new version)
- value3 (the image notification JSON message)

### Examples

#### Configuration

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_IFTTT_PROD_KEY=*******************************************
```

#### **Docker**
```bash
docker run \
  -e WUD_TRIGGER_IFTTT_PROD_KEY="*******************************************" \
  ...
  getwud/wud
```
<!-- tabs:end -->

#### Ifttt captured ingredients
- EventName: `wud-container`
- OccuredAt: `August 30, 2019 at 06:51PM`
- Value1: `homeassistant`
- Value2: `2021.6.5`
- Value3: `{"id":"31a61a8305ef1fc9a71fa4f20a68d7ec88b28e32303bbc4a5f192e851165b816","name":"homeassistant","watcher":"local","includeTags":"^\\d+\\.\\d+.\\d+$","image":{"id":"sha256:d4a6fafb7d4da37495e5c9be3242590be24a87d7edcc4f79761098889c54fca6","registry":{"url":"123456789.dkr.ecr.eu-west-1.amazonaws.com"},"name":"test","tag":{"value":"2021.6.4","semver":true},"digest":{"watch":false,"repo":"sha256:ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72"},"architecture":"amd64","os":"linux","created":"2021-06-12T05:33:38.440Z"},"result":{"tag":"2021.6.5"},"updateAvailable":true}`

### How to find the IFTTT key
#### Open the Webhook channel & Connect
[Click here](https://ifttt.com/maker_webhooks)

And click on `Connect`
![image](ifttt_connect.jpg)

#### Get the key from the settings
[Click here](https://ifttt.com/maker_webhooks/settings)

And copy the key from the URL
![image](ifttt_key.png)

### How to create an IFTTT receipt
#### Create a new receipt & add a "this" trigger
[Click here to create a new receipt](https://ifttt.com/create)

![image](ifttt_add_this.png)

#### Add the Webhook service
![image](ifttt_search_webhook.png)

#### Select the 'Receive a web request' trigger
![image](ifttt_request_trigger.png)

#### Enter the trigger event name (wud-container by default)
![image](ifttt_event.png)

#### Define the 'then that' action
![image](ifttt_then_that.png)

It's up to you :) Send an email...
