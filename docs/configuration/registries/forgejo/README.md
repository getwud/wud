# Forgejo Container Registry

![logo](forgejo.png)

The `forgejo` registry module lets you authenticate against [Forgejo](https://forgejo.org/) container registry instances (both hosted and self-hosted).

?> Public images on `code.forgejo.org` work out of the box. Use this configuration for self-hosted instances or private repositories.

### Variables

| Env var                                         | Required       | Description                                                          | Supported values                                             | Default value when missing |
| ----------------------------------------------- |:--------------:| -------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------- | 
| `WUD_REGISTRY_FORGEJO_{registry_name}_URL`      | :red_circle:   | Forgejo instance URL (e.g., `https://forgejo.example.com`)           | Valid HTTP/HTTPS URL                                         |                            |
| `WUD_REGISTRY_FORGEJO_{registry_name}_LOGIN`    | :red_circle:   | Forgejo username                                                     | Required when password/token is provided                     |                            |
| `WUD_REGISTRY_FORGEJO_{registry_name}_PASSWORD` | :red_circle:   | Forgejo password or personal access token                            | Required when username is provided                           |                            |
| `WUD_REGISTRY_FORGEJO_{registry_name}_AUTH`     | :white_circle: | Base64-encoded `username:password` string                            | Mutually exclusive with `LOGIN`/`PASSWORD`                   |                            |

### Examples

#### Authenticate with a Forgejo instance

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_REGISTRY_FORGEJO_PRIVATE_URL=https://forgejo.example.com
      - WUD_REGISTRY_FORGEJO_PRIVATE_LOGIN=john
      - WUD_REGISTRY_FORGEJO_PRIVATE_PASSWORD=secret-token
```
#### **Docker**
```bash
docker run \
  -e "WUD_REGISTRY_FORGEJO_PRIVATE_URL=https://forgejo.example.com" \
  -e "WUD_REGISTRY_FORGEJO_PRIVATE_LOGIN=john" \
  -e "WUD_REGISTRY_FORGEJO_PRIVATE_PASSWORD=secret-token" \
  ...
  getwud/wud
```
<!-- tabs:end -->

