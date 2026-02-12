# Smtp

The `smtp` trigger lets you send emails with smtp.

### Variables

| Env var                                             | Required       | Description                                | Supported values              | Default value when missing |
| --------------------------------------------------- |:--------------:|:------------------------------------------ | ----------------------------- | -------------------------- |
| `WUD_TRIGGER_SMTP_{trigger_name}_HOST`              | :red_circle:   | Smtp server host                           | Valid hostname or IP address  |                            |
| `WUD_TRIGGER_SMTP_{trigger_name}_PORT`              | :red_circle:   | Smtp server port                           | Valid smtp port               |                            |
| `WUD_TRIGGER_SMTP_{trigger_name}_FROM` (deprecated) | :white_circle: | Email from address                         | Valid email address           |                            |
| `WUD_TRIGGER_SMTP_{trigger_name}_FROM_ADDRESS`      | :red_circle:   | Email from address                         | Valid email address           |                            |
| `WUD_TRIGGER_SMTP_{trigger_name}_FROM_NAME`         | :white_circle: | Email from display name                    |                               |                            |
| `WUD_TRIGGER_SMTP_{trigger_name}_TO`                | :red_circle:   | Email to address                           | Valid email address           |                            |
| `WUD_TRIGGER_SMTP_{trigger_name}_USER`              | :white_circle: | Smtp user                                  |                               |                            |
| `WUD_TRIGGER_SMTP_{trigger_name}_PASS`              | :white_circle: | Smtp password                              |                               |                            |
| `WUD_TRIGGER_SMTP_{trigger_name}_TLS_ENABLED`       | :white_circle: | Use TLS                                    | `true`, `false`               | `false`                    |
| `WUD_TRIGGER_SMTP_{trigger_name}_TLS_VERIFY`        | :white_circle: | Verify server TLS certificate              | `true`, `false`               | `true`                     |
| `WUD_TRIGGER_SMTP_{trigger_name}_ALLOWCUSTOMTLD`    | :white_circle: | Allow custom tlds for the email addresses  | `true`, `false`               | `false`                    |

?> This trigger also supports the [common configuration variables](configuration/triggers/?id=common-trigger-configuration).

### Examples

#### Send an email with Gmail

<!-- tabs:start -->
#### **Docker Compose**

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

#### **Docker**

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
<!-- tabs:end -->

!> For Gmail, you need to create an application specific password first ([See gmail documentation](https://security.google.com/settings/security/apppasswords)).
