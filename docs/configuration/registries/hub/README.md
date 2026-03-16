# HUB (Docker Hub incl private repositories)

![logo](docker.png)

The `hub` registry lets you configure [Docker Hub](https://hub.docker.com/) integration.

Currently, the supported credentials are:

- Docker Hub auth + Docker Hub Access Token
- Docker Base64 credentials (like in [.docker/config.json](https://docs.docker.com/engine/reference/commandline/auth/))
- Docker Hub auth + Docker Hub password (not recommended)

!> By default, if you don't configure any registries, WUD will configure a default one with anonymous access. \
Don't forget to configure authentication if you're using [Docker Hub Private Repositories](https://docs.docker.com/docker-hub/repos/#private-repositories).

### Variables

| Env var                                              |    Required    | Description                                                                           | Supported values                                        | Default value when missing |
| ---------------------------------------------------- | :------------: | ------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------- |
| `WUD_REGISTRY_HUB_PUBLIC_LOGIN`                      | :white_circle: | A valid Docker Hub Login                                                              | WUD_REGISTRY_HUB_PUBLIC_TOKEN must be defined           |                            |
| `WUD_REGISTRY_HUB_PUBLIC_PASSWORD`                   | :white_circle: | A valid Docker Hub Token                                                              | WUD_REGISTRY_HUB_PUBLIC_LOGIN must be defined           |                            |
| `WUD_REGISTRY_HUB_PUBLIC_TOKEN`                      | :white_circle: | A valid Docker Hub Token (deprecated; replaced by `WUD_REGISTRY_HUB_PUBLIC_PASSWORD`) | WUD_REGISTRY_HUB_PUBLIC_LOGIN must be defined           |                            |
| `WUD_REGISTRY_HUB_PUBLIC_AUTH`                       | :white_circle: | A valid Docker Hub Base64 Auth String                                                 | WUD_REGISTRY_HUB_PUBLIC_LOGIN/TOKEN must not be defined |                            |
| `WUD_REGISTRY_HUB_PUBLIC_WATCHDIGEST`                | :white_circle: | Watch digests                                                                         | `true`, `false`                                         | `false`                    |
| `WUD_REGISTRY_HUB_PUBLIC_SUPPRESSDIGESTWATCHWARNING` | :white_circle: | Suppress digest watch warning                                                         | `true`, `false`                                         | `false`                    |

### Examples

#### Configure Authentication using Login/Token

##### 1. Login to your&nbsp;[Docker Hub Account](https://hub.docker.com/)

![image](hub_login.png)

##### 2. Go to your&nbsp;[Security Settings](https://hub.docker.com/settings/security)

- Create a new Access Token
- Copy it and use it as the `WUD_REGISTRY_HUB_PUBLIC_TOKEN` value

![image](hub_token.png)

<!-- tabs:start -->

#### **Docker Compose**

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_REGISTRY_HUB_PUBLIC_LOGIN=mylogin
      - WUD_REGISTRY_HUB_PUBLIC_PASSWORD=fb4d5db9-e64d-3648-8846-74d0846e55de
```

#### **Docker**

```bash
docker run \
  -e WUD_REGISTRY_HUB_PUBLIC_LOGIN="mylogin"
  -e WUD_REGISTRY_HUB_PUBLIC_PASSWORD="fb4d5db9-e64d-3648-8846-74d0846e55de"
  ...
  getwud/wud
```

<!-- tabs:end -->

#### Configure Authentication using Base64 encoded credentials

##### 1. Create an Access Token

[See above](registries/hub/?id=configure-authentication-using-logintoken)

##### 2. Encode with Base64

Concatenate `$auth:$password` and [encode with Base64](https://www.base64encode.org/).

For example,

- if your auth is `johndoe`
- and your password is `2c1bd872-efb6-4f3a-81aa-724518a0a592`
- the resulting encoded string would be `am9obmRvZToyYzFiZDg3Mi1lZmI2LTRmM2EtODFhYS03MjQ1MThhMGE1OTI=`

<!-- tabs:start -->

#### **Docker Compose**

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_REGISTRY_HUB_PUBLIC_AUTH=am9obmRvZToyYzFiZDg3Mi1lZmI2LTRmM2EtODFhYS03MjQ1MThhMGE1OTI=
```

#### **Docker**

```bash
docker run \
  -e WUD_REGISTRY_HUB_PUBLIC_AUTH="am9obmRvZToyYzFiZDg3Mi1lZmI2LTRmM2EtODFhYS03MjQ1MThhMGE1OTI="
  ...
  getwud/wud
```

<!-- tabs:end -->

#### Enable digest watching

By default, WUD tracks container updates by comparing image tags (e.g., `latest`, `1.2.3`). However, you can also enable digest watching to detect updates even when the tag hasn't changed.

?> Digest watching is useful for tracking images with non-semantic tags like `latest`, `stable`, or `nightly` where the underlying image content can change without a tag change.

<!-- tabs:start -->

#### **Docker Compose**

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_REGISTRY_HUB_PUBLIC_WATCHDIGEST=true
```

#### **Docker**

```bash
docker run \
  -e WUD_REGISTRY_HUB_PUBLIC_WATCHDIGEST="true" \
  ...
  getwud/wud
```

<!-- tabs:end -->

### Docker Hub Rate Limiting

!> Docker Hub enforces [rate limits](https://docs.docker.com/docker-hub/download-rate-limit/) on API requests which can affect WUD's ability to check for updates, especially when digest watching is enabled.

#### Understanding Docker Hub Rate Limits

Docker Hub limits the number of container image pulls and manifest requests based on your account type:

- **Anonymous users**: 100 pulls per 6 hours per IP address
- **Authenticated users**: 200 pulls per 6 hours
- **Pro/Team subscriptions**: Higher or unlimited pulls

#### How Rate Limiting Affects WUD

When digest watching is enabled (`WUD_REGISTRY_HUB_PUBLIC_WATCHDIGEST=true`), WUD makes additional API requests to the Docker Registry to check image manifests. This can consume your Docker Hub quota more quickly.

#### Recommendations to Avoid Rate Limit Issues

1. **Authenticate with Docker Hub** - Use a personal access token to increase your quota from 100 to 200 requests per 6 hours

   ```yaml
   - WUD_REGISTRY_HUB_PUBLIC_LOGIN=mylogin
   - WUD_REGISTRY_HUB_PUBLIC_PASSWORD=your-access-token
   ```

2. **Slow down the watcher frequency** - Adjust the CRON schedule to check less frequently

   ```yaml
   - WUD_WATCHER_LOCAL_CRON=0 20 * * * # at 8 PM
   ```

3. **Enable digest watching selectively** - Use the `wud.watch.digest` label on specific containers instead of enabling it globally

   ```yaml
   labels:
     - wud.watch.digest=true
   ```

4. **Consider upgrading** - Docker Hub Pro or Team subscriptions provide higher rate limits

5. **Suppress warnings** - If you're aware of the limitations and want to suppress warnings:
   ```yaml
   - WUD_REGISTRY_HUB_PUBLIC_SUPPRESSDIGESTWATCHWARNING=true
   ```

?> If you encounter rate limit errors, you can check your current usage at [Docker Hub Rate Limit Info](https://hub.docker.com/usage/pulls)
