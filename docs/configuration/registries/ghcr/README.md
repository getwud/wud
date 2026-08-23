# GHCR (GitHub Container Registry)

![logo](github.png)

The `ghcr` registry module lets you authenticate against the [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-docker-registry).

?> Public GHCR images work out of the box without authentication. Configure this module to access private repositories or avoid rate limits.

### Variables

| Env var                                      |    Required    | Description                  | Supported values | Default value when missing |
| -------------------------------------------- | :------------: | ---------------------------- | ---------------- | -------------------------- |
| `WUD_REGISTRY_GHCR_{registry_name}_USERNAME` | :white_circle: | GitHub username              | String           |                            |
| `WUD_REGISTRY_GHCR_{registry_name}_TOKEN`    | :white_circle: | GitHub Personal Access Token | Valid GitHub PAT |                            |

### Examples

#### Authenticate to access private images

<!-- tabs:start -->

#### **Docker Compose**

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_REGISTRY_GHCR_PRIVATE_USERNAME=johndoe
      - WUD_REGISTRY_GHCR_PRIVATE_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

#### **Docker**

```bash
docker run \
  -e WUD_REGISTRY_GHCR_PRIVATE_USERNAME="johndoe" \
  -e WUD_REGISTRY_GHCR_PRIVATE_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx" \
  ...
  getwud/wud
```

<!-- tabs:end -->

### How to create a GitHub Personal Access Token

#### 1. Open your GitHub Personal Access Tokens settings

Navigate to [GitHub Token Settings](https://github.com/settings/tokens).

#### 2. Click "Generate new token (classic)"

Set an expiration date and select the `read:packages` scope (the only scope required by WUD).
![image](ghcr_01.png)

#### 3. Copy the token and configure WUD

![image](ghcr_02.png)
