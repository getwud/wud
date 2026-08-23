# GitLab Container Registry

![logo](gitlab.png)

The `gitlab` registry module lets you authenticate against the [GitLab Container Registry](https://docs.gitlab.com/ee/user/packages/container_registry/) (both gitlab.com and self-hosted instances).

### Variables

| Env var                                        |    Required    | Description                                         | Supported values | Default value when missing  |
| ---------------------------------------------- | :------------: | --------------------------------------------------- | ---------------- | --------------------------- |
| `WUD_REGISTRY_GITLAB_{registry_name}_AUTHURL`  | :white_circle: | GitLab authentication base URL                      | Valid URL        | `https://gitlab.com`        |
| `WUD_REGISTRY_GITLAB_{registry_name}_TOKEN`    |  :red_circle:  | GitLab Personal Access Token or Deploy Token        | String           |                             |
| `WUD_REGISTRY_GITLAB_{registry_name}_USERNAME` | :white_circle: | Username (required when using a Group Access Token or Deploy Token) | String |                             |
| `WUD_REGISTRY_GITLAB_{registry_name}_URL`      | :white_circle: | GitLab Registry base URL                            | Valid URL        | `https://registry.gitlab.com` |

### Examples

#### Authenticate with gitlab.com

<!-- tabs:start -->

#### **Docker Compose**

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_REGISTRY_GITLAB_PUBLIC_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
```

#### **Docker**

```bash
docker run \
  -e WUD_REGISTRY_GITLAB_PUBLIC_TOKEN="glpat-xxxxxxxxxxxxxxxxxxxx" \
  ...
  getwud/wud
```

<!-- tabs:end -->

#### Authenticate with a self-hosted GitLab instance

<!-- tabs:start -->

#### **Docker Compose**

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_REGISTRY_GITLAB_PRIVATE_URL=https://registry.gitlab.example.com
      - WUD_REGISTRY_GITLAB_PRIVATE_AUTHURL=https://gitlab.example.com
      - WUD_REGISTRY_GITLAB_PRIVATE_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
```

#### **Docker**

```bash
docker run \
  -e WUD_REGISTRY_GITLAB_PRIVATE_URL="https://registry.gitlab.example.com" \
  -e WUD_REGISTRY_GITLAB_PRIVATE_AUTHURL="https://gitlab.example.com" \
  -e WUD_REGISTRY_GITLAB_PRIVATE_TOKEN="glpat-xxxxxxxxxxxxxxxxxxxx" \
  ...
  getwud/wud
```

<!-- tabs:end -->

### How to create a GitLab Personal Access Token

#### 1. Open your GitLab Personal Access Tokens page
Navigate to [GitLab Personal Access Tokens](https://gitlab.com/-/profile/personal_access_tokens).

#### 2. Create the token
Set an expiration date and select the `read_registry` scope (the only scope required by WUD).
![image](gitlab_01.png)

#### 3. Copy the token and configure WUD
![image](gitlab_02.png)

