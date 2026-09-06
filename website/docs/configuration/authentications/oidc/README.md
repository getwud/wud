import DocHero, { BrandIcon } from '@site/src/components/DocHero';
import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# OpenID Connect (OIDC) Authentication

<DocHero
  icon="oidc"
  description="The OIDC authentication module protects WUD using the standard OpenID Connect (OIDC) protocol. Because it conforms to standard OIDC discovery and OAuth 2.0 specifications, WUD is compatible with any OpenID Connect compliant identity provider (IdP)."
/>

### Supported Identity Providers

WUD supports any compliant OpenID Connect Identity Provider. Step-by-step guides are provided below for the most popular systems:

- **[Keycloak](#how-to-integrate-with-keycloak)** (Self-hosted & Cloud)
- **[Authentik](#how-to-integrate-with-authentik)** (Self-hosted)
- **[Authelia](#how-to-integrate-with-authelia)** (Self-hosted)
- **[Okta](#how-to-integrate-with-okta)** (Cloud IAM)
- **[Auth0](#how-to-integrate-with-auth0)** (Cloud IAM)
- **[Other Providers (Google, Microsoft Entra ID, GitLab, Zitadel...)](#other-oidc-providers)**

### Variables

<ConfigList>
  <ConfigOption name="WUD_AUTH_OIDC_{auth_name}_CLIENTID"
    type="string"
    required={true}>
    Client ID
  </ConfigOption>

  <ConfigOption name="WUD_AUTH_OIDC_{auth_name}_CLIENTSECRET"
    type="string"
    required={true}>
    Client Secret
  </ConfigOption>

  <ConfigOption name="WUD_AUTH_OIDC_{auth_name}_DISCOVERY"
    type="string"
    required={true}>
    OpenID Connect discovery URL
  </ConfigOption>

  <ConfigOption
    name="WUD_AUTH_OIDC_{auth_name}_REDIRECT"
    required={false}
    type="boolean"
    defaultValue="false">
    Skip internal login page and automatically redirect to this OIDC provider (note: when only a single OIDC provider is configured without Basic auth, WUD automatically redirects to it by default)
  </ConfigOption>

  <ConfigOption name="WUD_AUTH_OIDC_{auth_name}_TIMEOUT"
    type="integer"
    required={false}
    defaultValue="5000"
    supported="Minimum is 500">
    Timeout (in ms) when calling the OIDC provider
  </ConfigOption>

  <ConfigOption name="WUD_AUTH_OIDC_{auth_name}_TTL"
    type="integer"
    required={false}
    defaultValue="60"
    supported="`-1` or minimum 0">
    Cache TTL (in minutes) for OIDC discovery metadata; use `-1` for unlimited validity
  </ConfigOption>

  <ConfigOption
    name="WUD_AUTH_OIDC_{auth_name}_USERNAMECLAIM"
    required={false}
    type="string"
    defaultValue="email">
    User claim to use as the username
  </ConfigOption>

  <ConfigOption
    name="WUD_AUTH_OIDC_{auth_name}_GROUPSCLAIM"
    required={false}
    type="string"
    defaultValue="groups">
    Claim in ID token / userinfo containing the user's groups or roles array
  </ConfigOption>

  <ConfigOption
    name="WUD_AUTH_OIDC_{auth_name}_ADMINGROUP"
    required={false}
    type="string">
    Identity provider group or role name that grants WUD `admin` (Administrator) privileges upon login
  </ConfigOption>

  <ConfigOption
    name="WUD_AUTH_OIDC_{auth_name}_RWGROUP"
    required={false}
    type="string">
    Identity provider group or role name that grants WUD `rw` (Read / Write) privileges upon login
  </ConfigOption>
</ConfigList>

:::tip[Automatic User Onboarding & Role Sync]
When a user logs in through OIDC, WUD automatically creates an account in the internal database.
- If `ADMINGROUP` or `RWGROUP` is configured, the user's role is automatically synchronized with their IDP groups on each login (granting `admin`, `rw`, or falling back to `ro`).
- If no groups are configured, new OIDC users default to `ro` (Read-Only), and a local administrator can promote their role directly in the WUD Web UI.
:::

:::tip[Zero Local Credentials: Omit Local Administrator with OIDC]
If you define `WUD_AUTH_OIDC_{name}_ADMINGROUP` (or the global `WUD_AUTH_OIDC_ADMIN_GROUP`), **you do not need to configure any local administrator** (`WUD_AUTH_ADMIN_USER` / `WUD_AUTH_ADMIN_PASSWORD`).

WUD's startup verification recognizes that your Identity Provider provides administrative users, allowing the container to start cleanly without local credentials. When a user in the admin group logs in via OIDC for the first time, WUD automatically provisions their account and grants them full `admin` permissions. This enables a 100% SSO-driven, zero-local-credentials deployment!
:::

:::info[The callback URL to configure in your IdP is formatted as: `${wud_public_url}/auth/oidc/${auth_name}/cb`]
:::

:::warning[WUD automatically attempts to determine its public address for redirect URLs. If this fails due to a complex reverse proxy setup, you can explicitly specify the base URL using the `WUD_PUBLIC_URL` environment variable.]
:::

### How to integrate with [Authelia](https://www.authelia.com)

<div style={{ marginBottom: '1rem' }}><BrandIcon name="authelia" size={40} /></div>

#### Configure an OpenID Client for WUD in Authelia `configuration.yml` ([see official Authelia documentation](https://www.authelia.com/docs/configuration/identity-providers/oidc.html))

```yaml
identity_providers:
  oidc:
    hmac_secret: <a-very-long-string>
    issuer_private_key: |
      -----BEGIN RSA PRIVATE KEY-----
      # <Generate & paste here an RSA private key>
      -----END RSA PRIVATE KEY-----
    access_token_lifespan: 1h
    authorize_code_lifespan: 1m
    id_token_lifespan: 1h
    refresh_token_lifespan: 90m
    clients:
      - client_id: my-wud-client-id
        client_name: WUD openid client
        client_secret: this-is-a-very-secure-secret
        public: false
        authorization_policy: one_factor
        token_endpoint_auth_method: client_secret_post
        audience: []
        scopes:
          - openid
          - profile
          - email
          - groups
        redirect_uris:
          - https://<your_wud_public_domain>/auth/oidc/authelia/cb
        grant_types:
          - refresh_token
          - authorization_code
        response_types:
          - code
        response_modes:
          - form_post
          - query
          - fragment
        userinfo_signing_algorithm: none
```

#### Configure WUD

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_AUTH_OIDC_AUTHELIA_CLIENTID=my-wud-client-id
      - WUD_AUTH_OIDC_AUTHELIA_CLIENTSECRET=this-is-a-very-secure-secret
      - WUD_AUTH_OIDC_AUTHELIA_DISCOVERY=https://<your_authelia_public_domain>/.well-known/openid-configuration
      # Role synchronization from Authelia groups claim:
      - WUD_AUTH_OIDC_AUTHELIA_GROUPSCLAIM=groups
      - WUD_AUTH_OIDC_AUTHELIA_ADMINGROUP=admins # grants WUD admin role
      - WUD_AUTH_OIDC_AUTHELIA_RWGROUP=devs      # grants WUD rw role
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_AUTH_OIDC_AUTHELIA_CLIENTID="my-wud-client-id" \
  -e WUD_AUTH_OIDC_AUTHELIA_CLIENTSECRET="this-is-a-very-secure-secret" \
  -e WUD_AUTH_OIDC_AUTHELIA_DISCOVERY="https://<your_authelia_public_domain>/.well-known/openid-configuration" \
  -e WUD_AUTH_OIDC_AUTHELIA_GROUPSCLAIM="groups" \
  -e WUD_AUTH_OIDC_AUTHELIA_ADMINGROUP="admins" \
  -e WUD_AUTH_OIDC_AUTHELIA_RWGROUP="devs" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>

![WUD login with Authelia](./authelia_00.png)

![Authelia consent request](./authelia_01.png)

### How to integrate with [Auth0](https://auth0.com)

<div style={{ marginBottom: '1rem' }}><BrandIcon name="auth0" size={40} /></div>

#### Create an application (Regular Web Application)

- `Allowed Callback URLs`: `https://<your_wud_public_domain>/auth/oidc/auth0/cb`

#### Configure WUD

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_AUTH_OIDC_AUTH0_CLIENTID=<paste the Client ID from auth0 application settings>
      - WUD_AUTH_OIDC_AUTH0_CLIENTSECRET=<paste the Client Secret from auth0 application settings>
      - WUD_AUTH_OIDC_AUTH0_DISCOVERY=https://<paste the domain from auth0 application settings>/.well-known/openid-configuration
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_AUTH_OIDC_AUTH0_CLIENTID="<paste the Client ID from auth0 application settings>" \
  -e WUD_AUTH_OIDC_AUTH0_CLIENTSECRET="<paste the Client Secret from auth0 application settings>" \
  -e WUD_AUTH_OIDC_AUTH0_DISCOVERY="https://<paste the domain from auth0 application settings>/.well-known/openid-configuration" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>

![WUD login with Auth0](./auth0_00.png)

![Auth0 login screen](./auth0_01.png)

### How to integrate with [Authentik](https://goauthentik.io/)

<div style={{ marginBottom: '1rem' }}><BrandIcon name="authentik" size={40} /></div>

#### In Authentik, create a provider of type `OAuth2/OpenID` (or configure an existing one)

![Authentik create provider](./authentik_00.png)

#### Important settings:

- Client Type: `Confidential`
- Client ID: `<generated value>`
- Client Secret: `<generated value>`
- Redirect URIs/Origins: `https://<your_wud_public_domain>/auth/oidc/authentik/cb`
- Scopes: `email`, `openid`, `profile`, and ensure the **`authentik default OAuth Mapping: OpenID 'groups'`** mapping (or `groups` scope) is included in **Selected Property Mappings**.

#### In Authentik, create an application associated with the provider

![Authentik create application](./authentik_01.png)

#### Configure WUD

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_AUTH_OIDC_AUTHENTIK_CLIENTID=<paste the Client ID from authentik wud_oidc provider>
      - WUD_AUTH_OIDC_AUTHENTIK_CLIENTSECRET=<paste the Client Secret from authentik wud_oidc provider>
      - WUD_AUTH_OIDC_AUTHENTIK_DISCOVERY=<authentik_url>/application/o/<authentik_application_name>/.well-known/openid-configuration
      - WUD_AUTH_OIDC_AUTHENTIK_REDIRECT=true # optional (to skip internal login page)
      # Role synchronization from Authentik groups:
      - WUD_AUTH_OIDC_AUTHENTIK_GROUPSCLAIM=groups
      - WUD_AUTH_OIDC_AUTHENTIK_ADMINGROUP=authentik Admins # or your custom admin group
      - WUD_AUTH_OIDC_AUTHENTIK_RWGROUP=wud-users          # optional rw group
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_AUTH_OIDC_AUTHENTIK_CLIENTID="<paste the Client ID from authentik wud_oidc provider>" \
  -e WUD_AUTH_OIDC_AUTHENTIK_CLIENTSECRET="<paste the Client Secret from authentik wud_oidc provider>" \
  -e WUD_AUTH_OIDC_AUTHENTIK_DISCOVERY="<authentik_url>/application/o/<authentik_application_name>/.well-known/openid-configuration" \
  -e WUD_AUTH_OIDC_AUTHENTIK_REDIRECT=true \
  -e WUD_AUTH_OIDC_AUTHENTIK_GROUPSCLAIM="groups" \
  -e WUD_AUTH_OIDC_AUTHENTIK_ADMINGROUP="authentik Admins" \
  -e WUD_AUTH_OIDC_AUTHENTIK_RWGROUP="wud-users" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>

![WUD login with Authentik](./authentik_02.png)

### How to integrate with [Keycloak](https://www.keycloak.org/)

<div style={{ marginBottom: '1rem' }}><BrandIcon name="keycloak" size={40} /></div>

#### 1. In Keycloak Admin Console, configure a Client

Select your Realm (e.g. `master` or a dedicated realm like `homelab`):
1. Navigate to **Clients** > **Create client**.
2. **General Settings**:
   - **Client type**: `OpenID Connect`
   - **Client ID**: `wud` (or your preferred client identifier)
   - **Name**: `What's Up Docker`
3. **Capability config**:
   - **Client authentication**: `On` (this creates a Confidential client with a client secret)
   - **Authentication flow**: Check `Standard flow` (Authorization Code Flow)
4. **Login settings**:
   - **Root URL**: `https://<your_wud_public_domain>`
   - **Home URL**: `https://<your_wud_public_domain>`
   - **Valid redirect URIs**: `https://<your_wud_public_domain>/auth/oidc/keycloak/cb`
   - **Valid post logout redirect URIs**: `https://<your_wud_public_domain>/*`
   - **Web origins**: `+` (or `https://<your_wud_public_domain>`)
5. Click **Save**.

#### 2. Retrieve Credentials

Go to the **Credentials** tab of the created client and copy the **Client Secret**.

#### 3. Map Groups Claim in Keycloak

To automatically synchronize Keycloak groups with WUD roles:
1. Under your `wud` Client, navigate to the **Client scopes** tab.
2. Click the dedicated client scope (e.g., `wud-dedicated`).
3. Click **Add mapper** > **By configuration** > select **Group Membership**.
4. Configure the mapper:
   - **Name**: `groups`
   - **Token Claim Name**: `groups`
   - **Add to ID token**: `On`
   - **Add to userinfo**: `On`
   - **Full group path**: `Off` (produces simple group names like `wud-admins` instead of `/wud-admins`)
5. Click **Save**.

#### 4. Configure WUD

:::tip
Keycloak standard discovery URL follows the format:  
`https://<your_keycloak_domain>/realms/<your_realm>/.well-known/openid-configuration`

By default, Keycloak provides `preferred_username` and `email` claims. You can customize the username displayed in WUD by setting `WUD_AUTH_OIDC_KEYCLOAK_USERNAMECLAIM=preferred_username`.
:::

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_AUTH_OIDC_KEYCLOAK_CLIENTID=wud
      - WUD_AUTH_OIDC_KEYCLOAK_CLIENTSECRET=<paste-your-client-secret>
      - WUD_AUTH_OIDC_KEYCLOAK_DISCOVERY=https://<your_keycloak_domain>/realms/<your_realm>/.well-known/openid-configuration
      - WUD_AUTH_OIDC_KEYCLOAK_USERNAMECLAIM=preferred_username # or email
      - WUD_AUTH_OIDC_KEYCLOAK_REDIRECT=true # optional (to skip internal login page)
      # Role synchronization from Keycloak groups:
      - WUD_AUTH_OIDC_KEYCLOAK_GROUPSCLAIM=groups
      - WUD_AUTH_OIDC_KEYCLOAK_ADMINGROUP=wud-admins # grants WUD admin role
      - WUD_AUTH_OIDC_KEYCLOAK_RWGROUP=wud-editors   # grants WUD rw role
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_AUTH_OIDC_KEYCLOAK_CLIENTID="wud" \
  -e WUD_AUTH_OIDC_KEYCLOAK_CLIENTSECRET="<paste-your-client-secret>" \
  -e WUD_AUTH_OIDC_KEYCLOAK_DISCOVERY="https://<your_keycloak_domain>/realms/<your_realm>/.well-known/openid-configuration" \
  -e WUD_AUTH_OIDC_KEYCLOAK_USERNAMECLAIM="preferred_username" \
  -e WUD_AUTH_OIDC_KEYCLOAK_REDIRECT=true \
  -e WUD_AUTH_OIDC_KEYCLOAK_GROUPSCLAIM="groups" \
  -e WUD_AUTH_OIDC_KEYCLOAK_ADMINGROUP="wud-admins" \
  -e WUD_AUTH_OIDC_KEYCLOAK_RWGROUP="wud-editors" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>

![WUD login with Keycloak](./keycloak_00.png)

### How to integrate with [Okta](https://www.okta.com/)

<div style={{ marginBottom: '1rem' }}><BrandIcon name="okta" size={40} /></div>

#### 1. In Okta Admin Console, create an App Integration

1. In your Okta Admin dashboard, navigate to **Applications** > **Applications** > **Create App Integration**.
2. Select **OIDC - OpenID Connect** as the Sign-in method.
3. Select **Web Application** as the Application type, then click **Next**.
4. Configure the app settings:
   - **App integration name**: `What's Up Docker`
   - **Grant type**: Check **Authorization Code**.
   - **Sign-in redirect URIs**: `https://<your_wud_public_domain>/auth/oidc/okta/cb`
   - **Sign-out redirect URIs**: `https://<your_wud_public_domain>/`
   - **Assignments**: Choose user/group access (e.g. *Allow everyone in your organization to access*).
5. Click **Save**.

#### 2. Retrieve Credentials

Under the application's **General** tab:
- Copy the **Client ID**.
- Copy the **Client Secret** under the *Client Credentials* section.

#### 3. Configure Groups Claim in Okta

To synchronize Okta user groups with WUD roles:
1. In your Okta Admin dashboard, navigate to **Security** > **API** > **Authorization Servers**.
2. Select your authorization server (e.g. `default`).
3. Under the **Claims** tab, click **Add Claim**:
   - **Name**: `groups`
   - **Include in token type**: `ID Token` / `Always`
   - **Value type**: `Groups`
   - **Filter**: `Matches regex` with `.*` (or your specific group prefix)
4. Click **Create**.

#### 4. Configure WUD

:::info
- For Okta API Access Management / Custom Authorization Server, the discovery URL is:  
  `https://<your-okta-domain>/oauth2/default/.well-known/openid-configuration`
- For an Okta Org Authorization Server, the discovery URL is:  
  `https://<your-okta-domain>/.well-known/openid-configuration`
:::

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_AUTH_OIDC_OKTA_CLIENTID=<paste-your-client-id>
      - WUD_AUTH_OIDC_OKTA_CLIENTSECRET=<paste-your-client-secret>
      - WUD_AUTH_OIDC_OKTA_DISCOVERY=https://<your-okta-domain>/oauth2/default/.well-known/openid-configuration
      - WUD_AUTH_OIDC_OKTA_USERNAMECLAIM=email
      # Role synchronization from Okta groups:
      - WUD_AUTH_OIDC_OKTA_GROUPSCLAIM=groups
      - WUD_AUTH_OIDC_OKTA_ADMINGROUP=wud-admins # grants WUD admin role
      - WUD_AUTH_OIDC_OKTA_RWGROUP=wud-users     # grants WUD rw role
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_AUTH_OIDC_OKTA_CLIENTID="<paste-your-client-id>" \
  -e WUD_AUTH_OIDC_OKTA_CLIENTSECRET="<paste-your-client-secret>" \
  -e WUD_AUTH_OIDC_OKTA_DISCOVERY="https://<your-okta-domain>/oauth2/default/.well-known/openid-configuration" \
  -e WUD_AUTH_OIDC_OKTA_USERNAMECLAIM="email" \
  -e WUD_AUTH_OIDC_OKTA_GROUPSCLAIM="groups" \
  -e WUD_AUTH_OIDC_OKTA_ADMINGROUP="wud-admins" \
  -e WUD_AUTH_OIDC_OKTA_RWGROUP="wud-users" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>

![WUD login with Okta](./okta_00.png)

### Other OIDC Providers

Because WUD strictly adheres to OpenID Connect discovery specifications, you can connect any other compliant provider by pointing to its discovery endpoint.

| Provider | Discovery Endpoint Format | Suggested `USERNAMECLAIM` | Callback URI Format |
|---|---|---|---|
| **Google** | `https://accounts.google.com/.well-known/openid-configuration` | `email` | `https://<wud-domain>/auth/oidc/google/cb` |
| **Microsoft Entra ID (Azure AD)** | `https://login.microsoftonline.com/<tenant-id>/v2.0/.well-known/openid-configuration` | `preferred_username` or `email` | `https://<wud-domain>/auth/oidc/entra/cb` |
| **GitLab** | `https://gitlab.com/.well-known/openid-configuration` | `email` or `nickname` | `https://<wud-domain>/auth/oidc/gitlab/cb` |
| **Zitadel** | `https://<your-instance>.zitadel.cloud/.well-known/openid-configuration` | `preferred_username` or `email` | `https://<wud-domain>/auth/oidc/zitadel/cb` |
| **PocketID** | `https://<your-pocket-id-domain>/.well-known/openid-configuration` | `username` or `email` | `https://<wud-domain>/auth/oidc/pocketid/cb` |
| **Kanidm** | `https://<your-kanidm-domain>/oauth2/openid/<client_id>/.well-known/openid-configuration` | `preferred_username` | `https://<wud-domain>/auth/oidc/kanidm/cb` |

#### Example: Microsoft Entra ID (Azure AD) with Security Groups
In the Azure Portal under your App registration > **Token configuration**, click **Add groups claim** (select *Security groups*). In WUD, configure:
```yaml
environment:
  - WUD_AUTH_OIDC_ENTRA_CLIENTID=<azure-app-client-id>
  - WUD_AUTH_OIDC_ENTRA_CLIENTSECRET=<azure-app-client-secret>
  - WUD_AUTH_OIDC_ENTRA_DISCOVERY=https://login.microsoftonline.com/<tenant-id>/v2.0/.well-known/openid-configuration
  - WUD_AUTH_OIDC_ENTRA_USERNAMECLAIM=preferred_username
  - WUD_AUTH_OIDC_ENTRA_GROUPSCLAIM=groups
  - WUD_AUTH_OIDC_ENTRA_ADMINGROUP=<admin-group-object-id>
  - WUD_AUTH_OIDC_ENTRA_RWGROUP=<rw-group-object-id>
```

