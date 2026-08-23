# CUSTOM (Self-Hosted Docker Registry)

![logo](custom.png)

The `custom` registry module lets you integrate self-hosted [Docker Registry (v2)](https://docs.docker.com/registry/) instances.

### Variables

| Env var                                         | Required       | Description                                                          | Supported values                                             | Default value when missing |
| ----------------------------------------------- |:--------------:| -------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------- | 
| `WUD_REGISTRY_CUSTOM_{registry_name}_URL`      | :red_circle:   | Registry URL (e.g., `http://localhost:5000` or `https://registry.local`) | Valid HTTP/HTTPS URL                                         |                            |
| `WUD_REGISTRY_CUSTOM_{registry_name}_LOGIN`    | :white_circle: | Username (when Basic/htpasswd authentication is enabled)             | Required when password is provided                           |                            |
| `WUD_REGISTRY_CUSTOM_{registry_name}_PASSWORD` | :white_circle: | Password (when Basic/htpasswd authentication is enabled)             | Required when username is provided                           |                            |
| `WUD_REGISTRY_CUSTOM_{registry_name}_AUTH`     | :white_circle: | Base64-encoded `username:password` string                            | Mutually exclusive with `LOGIN`/`PASSWORD`                   |                            |

### Examples

#### Configure for anonymous access

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_REGISTRY_CUSTOM_PRIVATE_URL=http://localhost:5000
```
#### **Docker**
```bash
docker run \
  -e "WUD_REGISTRY_CUSTOM_PRIVATE_URL=http://localhost:5000" \
  ...
  getwud/wud
```
<!-- tabs:end -->

#### Configure with Basic authentication

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_REGISTRY_CUSTOM_PRIVATE_URL=http://localhost:5000
      - WUD_REGISTRY_CUSTOM_PRIVATE_LOGIN=john
      - WUD_REGISTRY_CUSTOM_PRIVATE_PASSWORD=secret
```
#### **Docker**
```bash
docker run \
  -e "WUD_REGISTRY_CUSTOM_PRIVATE_URL=http://localhost:5000" \
  -e "WUD_REGISTRY_CUSTOM_PRIVATE_LOGIN=john" \
  -e "WUD_REGISTRY_CUSTOM_PRIVATE_PASSWORD=secret" \
  ...
  getwud/wud
```
<!-- tabs:end -->

#### Configure multiple self-hosted registries

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_REGISTRY_CUSTOM_PRIVATE1_URL=http://localhost:5000
      - WUD_REGISTRY_CUSTOM_PRIVATE1_LOGIN=john
      - WUD_REGISTRY_CUSTOM_PRIVATE1_PASSWORD=secret1
      - WUD_REGISTRY_CUSTOM_PRIVATE2_URL=http://localhost:5001
      - WUD_REGISTRY_CUSTOM_PRIVATE2_LOGIN=jane
      - WUD_REGISTRY_CUSTOM_PRIVATE2_PASSWORD=secret2
```
#### **Docker**
```bash
docker run \
  -e "WUD_REGISTRY_CUSTOM_PRIVATE1_URL=http://localhost:5000" \
  -e "WUD_REGISTRY_CUSTOM_PRIVATE1_LOGIN=john" \
  -e "WUD_REGISTRY_CUSTOM_PRIVATE1_PASSWORD=secret1" \
  -e "WUD_REGISTRY_CUSTOM_PRIVATE2_URL=http://localhost:5001" \
  -e "WUD_REGISTRY_CUSTOM_PRIVATE2_LOGIN=jane" \
  -e "WUD_REGISTRY_CUSTOM_PRIVATE2_PASSWORD=secret2" \
  ...
  getwud/wud
```
<!-- tabs:end -->

