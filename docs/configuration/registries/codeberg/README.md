# Codeberg Container Registry

![logo](codeberg.png)

The `codeberg` registry module lets you authenticate against the [Codeberg Container Registry](https://codeberg.org/).

?> Public Codeberg repositories work out of the box without authentication. Configure this module to access private repositories or increase API rate limits.

### Variables

| Env var                                          |    Required    | Description                                | Supported values                           | Default value when missing |
| ------------------------------------------------ | :------------: | ------------------------------------------ | ------------------------------------------ | -------------------------- |
| `WUD_REGISTRY_CODEBERG_{registry_name}_LOGIN`    |  :red_circle:  | Codeberg username                          | Required when password/token is provided   |                            |
| `WUD_REGISTRY_CODEBERG_{registry_name}_PASSWORD` |  :red_circle:  | Codeberg password or personal access token | Required when username is provided         |                            |
| `WUD_REGISTRY_CODEBERG_{registry_name}_AUTH`     | :white_circle: | Base64-encoded `username:password` string  | Mutually exclusive with `LOGIN`/`PASSWORD` |                            |

### Examples

#### Authenticate with credentials

<!-- tabs:start -->

#### **Docker Compose**

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_REGISTRY_CODEBERG_PRIVATE_LOGIN=john
      - WUD_REGISTRY_CODEBERG_PRIVATE_PASSWORD=secret-token
```

#### **Docker**

```bash
docker run \
  -e "WUD_REGISTRY_CODEBERG_PRIVATE_LOGIN=john" \
  -e "WUD_REGISTRY_CODEBERG_PRIVATE_PASSWORD=secret-token" \
  ...
  getwud/wud
```

<!-- tabs:end -->
