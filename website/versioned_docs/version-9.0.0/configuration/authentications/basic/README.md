import DocHero from '@site/src/components/DocHero';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';

# Basic Authentication

<DocHero
  icon="basic"
  description="The basic authentication module lets you protect WUD access using the HTTP Basic authentication standard."
/>

:::warning[Deprecation Notice: Static Basic Auth Environment Variables]
Configuring users via static environment variables (`WUD_AUTH_BASIC_{auth_name}_*`) is **deprecated** and will be removed in a future release.

- **To bootstrap your administrator account**: Use `WUD_AUTH_ADMIN_USER` and `WUD_AUTH_ADMIN_PASSWORD`.
- **To manage local users**: Manage users and their roles (`admin`, `rw`, `ro`) directly in the Web UI under **Configuration > Users**.
- **For external scripts and CI/CD automation**: Use **Personal API Tokens** (`Authorization: Bearer wud_...`) generated from **My Profile** instead of sharing static credentials.
- **For Single Sign-On**: Use [**OpenID Connect (OIDC)**](../oidc/README.md).
:::

### Variables

<ConfigList>
  <ConfigOption
    name="WUD_AUTH_ADMIN_USER"
    required={false}
    type="string"
    defaultValue="admin">
    Username for the bootstrap administrator account created on initial startup.
  </ConfigOption>

  <ConfigOption
    name="WUD_AUTH_ADMIN_PASSWORD"
    required={false}
    type="string">
    Password for the bootstrap administrator account. Automatically hashed using bcrypt when seeded into the database.
  </ConfigOption>

  <ConfigOption
    name="WUD_AUTH_BASIC_{auth_name}_USER"
    required={false}
    type="string">
    Legacy variable: username for an authorized user seeded at startup.
  </ConfigOption>

  <ConfigOption
    name="WUD_AUTH_BASIC_{auth_name}_HASH"
    required={false}
    type="string"
    supported="htpasswd-compliant Apache hash (MD5, SHA1, Crypt, APR1, Bcrypt)">
    Legacy variable: htpasswd-compliant password hash ([see htpasswd documentation](https://httpd.apache.org/docs/current/programs/htpasswd.html)).
  </ConfigOption>
</ConfigList>

:::tip[Database Persistence]
User accounts and their hashed passwords are now persisted directly in the WUD database. Environment variables are used to automatically seed or update administrator access upon startup. You can also create and manage subsequent users directly through the WUD Web UI.
:::

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
