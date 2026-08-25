import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# SMTP

The `smtp` trigger lets you send container update notifications via email using SMTP.

### Variables

| Env var                                             |    Required    | Description                                       | Supported values                      | Default value when missing |
| --------------------------------------------------- | :------------: | :------------------------------------------------ | ------------------------------------- | -------------------------- |
| `WUD_TRIGGER_SMTP_{trigger_name}_HOST`              |  :red_circle:  | SMTP server hostname or IP address                | Valid hostname or IP address          |                            |
| `WUD_TRIGGER_SMTP_{trigger_name}_PORT`              |  :red_circle:  | SMTP server port                                  | Valid port number (e.g. `465`, `587`) |                            |
| `WUD_TRIGGER_SMTP_{trigger_name}_FROM_ADDRESS`      |  :red_circle:  | Sender email address (`From`)                     | Valid email address                   |                            |
| `WUD_TRIGGER_SMTP_{trigger_name}_FROM` (deprecated) | :white_circle: | Sender email address (legacy alias)               | Valid email address                   |                            |
| `WUD_TRIGGER_SMTP_{trigger_name}_FROM_NAME`         | :white_circle: | Sender display name                               | String                                |                            |
| `WUD_TRIGGER_SMTP_{trigger_name}_TO`                |  :red_circle:  | Recipient email address (`To`)                    | Valid email address                   |                            |
| `WUD_TRIGGER_SMTP_{trigger_name}_USER`              | :white_circle: | SMTP authentication username                      | String                                |                            |
| `WUD_TRIGGER_SMTP_{trigger_name}_PASS`              | :white_circle: | SMTP authentication password                      | String                                |                            |
| `WUD_TRIGGER_SMTP_{trigger_name}_TLS_ENABLED`       | :white_circle: | Enable TLS/SSL connection                         | `true`, `false`                       | `false`                    |
| `WUD_TRIGGER_SMTP_{trigger_name}_TLS_VERIFY`        | :white_circle: | Verify server TLS certificate                     | `true`, `false`                       | `true`                     |
| `WUD_TRIGGER_SMTP_{trigger_name}_ALLOWCUSTOMTLD`    | :white_circle: | Allow non-standard/custom TLDs in email addresses | `true`, `false`                       | `false`                    |

:::info
This trigger also supports [common trigger configuration options](../README.md#common-trigger-configuration).
:::

### Examples

#### Send email notifications via Gmail

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_TRIGGER_SMTP_GMAIL_HOST=smtp.gmail.com
      - WUD_TRIGGER_SMTP_GMAIL_PORT=465
      - WUD_TRIGGER_SMTP_GMAIL_USER=john.doe@gmail.com
      - WUD_TRIGGER_SMTP_GMAIL_PASS=mysecretpass
      - WUD_TRIGGER_SMTP_GMAIL_FROM_ADDRESS=john.doe@gmail.com
      - WUD_TRIGGER_SMTP_GMAIL_FROM_NAME=John Doe
      - WUD_TRIGGER_SMTP_GMAIL_TO=jane.doe@gmail.com
      - WUD_TRIGGER_SMTP_GMAIL_TLS_ENABLED=true
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_TRIGGER_SMTP_GMAIL_HOST="smtp.gmail.com" \
  -e WUD_TRIGGER_SMTP_GMAIL_PORT="465" \
  -e WUD_TRIGGER_SMTP_GMAIL_USER="john.doe@gmail.com" \
  -e WUD_TRIGGER_SMTP_GMAIL_PASS="mysecretpass" \
  -e WUD_TRIGGER_SMTP_GMAIL_FROM_ADDRESS="john.doe@gmail.com" \
  -e WUD_TRIGGER_SMTP_GMAIL_FROM_NAME="John Doe" \
  -e WUD_TRIGGER_SMTP_GMAIL_TO="jane.doe@gmail.com" \
  -e WUD_TRIGGER_SMTP_GMAIL_TLS_ENABLED="true" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>

:::warning
When using Gmail, create and use a dedicated App Password ([see Google App Passwords documentation](https://security.google.com/settings/security/apppasswords)).
:::
