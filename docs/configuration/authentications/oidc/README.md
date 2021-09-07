### Openid Connect Authentication
![logo](oidc.png)

The `oidc` authentication lets you protect WUD access using the [Openid Connect standard](https://openid.net/).

#### Variables

| Env var                                  | Description             | Supported values | Default value |
| ---------------------------------------- |:-----------------------:|:----------------:|:-------------:|
| `WUD_AUTH_OIDC_{auth_name}_CLIENTID`     | Client ID               |                  |               |
| `WUD_AUTH_OIDC_{auth_name}_CLIENTSECRET` | Client Secret           |                  |               |
| `WUD_AUTH_OIDC_{auth_name}_DISCOVERY`    | Oidc discovery URL      |                  |               |

?> The callback URL (to configure in the IDP is built as `${wud_public_address}/auth/oidc/${auth_name}/cb`

!> WUD tries its best to determine the public address to forge redirections on its own. \
If it fails (irregular reverse proxy configuration...), you can enforce the value using the env var `WUD_PUBLIC_ADDRESS` 

#### How to integrate with&nbsp;[Authelia](https://www.authelia.com)
![logo](authelia.png)

##### Configure an Openid Client for WUD in Authelia configuration.yml ([see official authelia documentation](https://www.authelia.com/docs/configuration/identity-providers/oidc.html))
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
      - id: my-wud-client-id
        description: WUD openid client
        secret: this-is-a-very-secure-secret
        public: false
        authorization_policy: one_factor
        audience: []
        scopes:
          - openid
          - profile
          - email
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

##### Configure WUD
<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  whatsupdocker:
    image: fmartinou/whats-up-docker
    ...
    environment:
      - WUD_AUTH_OIDC_AUTHELIA_CLIENTID=my-wud-client-id
      - WUD_AUTH_OIDC_AUTHELIA_CLIENTSECRET=this-is-a-very-secure-secret
      - WUD_AUTH_OIDC_AUTHELIA_DISCOVERY=https://<your_authelia_public_domain>/.well-known/openid-configuration
```
#### **Docker**
```bash
docker run \
  -e WUD_AUTH_OIDC_AUTHELIA_CLIENTID="my-wud-client-id" \
  -e WUD_AUTH_OIDC_AUTHELIA_CLIENTSECRET="this-is-a-very-secure-secret" \
  -e WUD_AUTH_OIDC_AUTHELIA_DISCOVERY="https://<your_authelia_public_domain>/.well-known/openid-configuration" \
  ...
  fmartinou/whats-up-docker
```
<!-- tabs:end -->

![image](authelia_00.png)

![image](authelia_01.png)

#### How to integrate with&nbsp;[Auth0](http://auth0.com)
![logo](auth0.png)

##### Create an application (Regular Web Application)
- `Allowed Callback URLs`: `https://<your_wud_public_domain>/auth/oidc/auth0/cb`

##### Configure WUD
<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  whatsupdocker:
    image: fmartinou/whats-up-docker
    ...
    environment:
      - WUD_AUTH_OIDC_AUTH0_CLIENTID=<paste the Client ID from auth0 application settings>
      - WUD_AUTH_OIDC_AUTH0_CLIENTSECRET=<paste the Client Secret from auth0 application settings>
      - WUD_AUTH_OIDC_AUTH0_DISCOVERY=https://<paste the domain from auth0 application settings>/.well-known/openid-configuration
```
#### **Docker**
```bash
docker run \
  -e WUD_AUTH_OIDC_AUTH0_CLIENTID="<paste the Client ID from auth0 application settings>" \
  -e WUD_AUTH_OIDC_AUTH0_CLIENTSECRET="<paste the Client Secret from auth0 application settings>" \
  -e WUD_AUTH_OIDC_AUTH0_DISCOVERY="https://<paste the domain from auth0 application settings>/.well-known/openid-configuration" \
  ...
  fmartinou/whats-up-docker
```
<!-- tabs:end -->

![image](auth0_00.png)

![image](auth0_01.png)