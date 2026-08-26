import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# SMTP

![logo](smtp.svg)

The `smtp` trigger lets you send container update notifications via email using SMTP.

### Variables

<ConfigList>
  <ConfigOption name="WUD_TRIGGER_SMTP_{trigger_name}_FROM_ADDRESS"
    type="email"
    required={true}
    supported="Valid email address">
    Sender email address (`From`)
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_SMTP_{trigger_name}_HOST"
    type="string"
    required={true}
    supported="Valid hostname or IP address">
    SMTP server hostname or IP address
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_SMTP_{trigger_name}_PORT"
    required={true}
    type="integer"
    supported="Valid port number (e.g. `465`, `587`)">
    SMTP server port
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_SMTP_{trigger_name}_TO"
    type="email"
    required={true}
    supported="Valid email address">
    Recipient email address (`To`)
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_SMTP_{trigger_name}_ALLOWCUSTOMTLD"
    required={false}
    type="boolean"
    defaultValue="false">
    Allow non-standard/custom TLDs in email addresses
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_SMTP_{trigger_name}_FROM"
    type="email"
    required={false}
    supported="Valid email address">
    Sender email address (legacy alias)
  </ConfigOption>

  <ConfigOption name="WUD_TRIGGER_SMTP_{trigger_name}_FROM_NAME"
    required={false}
    type="email">
    Sender display name
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_SMTP_{trigger_name}_PASS"
    required={false}
    type="string">
    SMTP authentication password
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_SMTP_{trigger_name}_TLS_ENABLED"
    required={false}
    type="boolean"
    defaultValue="false">
    Enable TLS/SSL connection
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_SMTP_{trigger_name}_TLS_VERIFY"
    required={false}
    type="boolean"
    defaultValue="true">
    Verify server TLS certificate
  </ConfigOption>

  <ConfigOption
    name="WUD_TRIGGER_SMTP_{trigger_name}_USER"
    required={false}
    type="string">
    SMTP authentication username
  </ConfigOption>
</ConfigList>
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
