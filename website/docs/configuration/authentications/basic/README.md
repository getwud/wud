import DocHero from '@site/src/components/DocHero';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';

# Basic Authentication

<DocHero
  icon="basic"
  description="The basic authentication module lets you protect WUD access using the HTTP Basic authentication standard."
/>

### Variables

<ConfigList>
  <ConfigOption
    name="WUD_AUTH_BASIC_{auth_name}_HASH"
    required={true}
    type="string"
    supported="htpasswd-compliant Apache hash (MD5, SHA1, Crypt, APR1, Bcrypt)">
    htpasswd-compliant password hash ([see htpasswd documentation](https://httpd.apache.org/docs/current/programs/htpasswd.html)).
  </ConfigOption>

  <ConfigOption
    name="WUD_AUTH_BASIC_{auth_name}_USER"
    required={true}
    type="string">
    Username for the authorized user.
  </ConfigOption>
</ConfigList>

:::warning[Password hashes typically contain `$` characters; make sure to escape or quote them appropriately:]

- Use **double `$$`** in Docker Compose files ([see variable substitution](https://docs.docker.com/compose/compose-file/compose-file-v3/#variable-substitution)):
  `WUD_AUTH_BASIC_JOHN_HASH: $$apr1$$aefKbZEa$$ZSA5Y3zv9vDQOxr283NGx/`
- Use **single quotes** in shell commands:
  `WUD_AUTH_BASIC_JOHN_HASH='$apr1$aefKbZEa$ZSA5Y3zv9vDQOxr283NGx/'`
- Or **escape `\$`** with backslashes in double-quoted strings:
  `WUD_AUTH_BASIC_JOHN_HASH="\$apr1\$aefKbZEa\$ZSA5Y3zv9vDQOxr283NGx/"`
:::

:::warning[**Known limitation:** Passwords containing colon characters (`:`) are not supported due to a limitation in the underlying `passport-http` library. Authentication will fail if your password contains a colon. Use passwords without colons until this is resolved.]
:::

### Examples

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_AUTH_BASIC_JOHN_USER=john
      - WUD_AUTH_BASIC_JOHN_HASH=$$apr1$$8zDVtSAY$$62WBh9DspNbUKMZXYRsjS/
      - WUD_AUTH_BASIC_JANE_USER=jane
      - WUD_AUTH_BASIC_JANE_HASH=$$apr1$$5iyu65pm$$m/6I35fjUT7.1CMnS2w9d1
      - WUD_AUTH_BASIC_BOB_USER=bob
      - WUD_AUTH_BASIC_BOB_HASH=$$apr1$$aefKbZEa$$ZSA5Y3zv9vDQOxr283NGx/
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_AUTH_BASIC_JOHN_USER="john" \
  -e WUD_AUTH_BASIC_JOHN_HASH='$apr1$8zDVtSAY$62WBh9DspNbUKMZXYRsjS/' \
  -e WUD_AUTH_BASIC_JANE_USER="jane" \
  -e WUD_AUTH_BASIC_JANE_HASH='$apr1$5iyu65pm$m/6I35fjUT7.1CMnS2w9d1' \
  -e WUD_AUTH_BASIC_BOB_USER="bob" \
  -e WUD_AUTH_BASIC_BOB_HASH='$apr1$aefKbZEa$ZSA5Y3zv9vDQOxr283NGx/' \
  ...
  getwud/wud
```

</TabItem>
</Tabs>

### How to generate a password hash

#### Using the `htpasswd` command

```bash
htpasswd -nib john doe

# Output: john:$apr1$8zDVtSAY$62WBh9DspNbUKMZXYRsjS/
```

#### Using an online generator

You can use an online htpasswd generator like [wtools.io](https://wtools.io/generate-htpasswd-online).
