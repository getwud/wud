# CODEBERG
![logo](codeberg.png)

The `codeberg` registry lets you configure [Codeberg](https://codeberg.org/) integration.

### Variables

| Env var                                  |    Required    | Description                                | Supported values                                                         | Default value when missing |
|------------------------------------------|:--------------:|--------------------------------------------|--------------------------------------------------------------------------|----------------------------| 
| `WUD_REGISTRY_CODEBERG_PRIVATE_LOGIN`    | :red_circle:   | Codeberg username                          | WUD_REGISTRY_CODEBERG_PUBLIC_PASSWORD must be defined when login defined |                            |
| `WUD_REGISTRY_CODEBERG_PRIVATE_PASSWORD` | :red_circle:   | Codeberg password or personal access token | WUD_REGISTRY_CODEBERG_PUBLIC_LOGIN must be defined when passowrd defined |                            |
| `WUD_REGISTRY_CODEBERG_PRIVATE_AUTH`     | :white_circle: | A valid Codeberg base64 auth string        | WUD_REGISTRY_CODEBERG_PUBLIC_LOGIN/TOKEN must not be defined             |                            |
### Examples

#### Configure
<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_REGISTRY_CODEBERG_PRIVATE_LOGIN=john
      - WUD_REGISTRY_CODEBERG_PRIVATE_PASSWORD=doe
```
#### **Docker**
```bash
docker run \
  -e "WUD_REGISTRY_CODEBERG_PRIVATE_LOGIN=john" \
  -e "WUD_REGISTRY_CODEBERG_PRIVATE_PASSWORD=doe" \
  ...
  getwud/wud
```
<!-- tabs:end -->
