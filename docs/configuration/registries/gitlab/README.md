# GHCR (Gitlab Container Registry)
![logo](gitlab.png)

The `gitlab` registry lets you configure [GITLAB](https://docs.gitlab.com/ee/user/packages/container_registry/) integration.

### Variables

| Env var                       |   Required   | Description                    | Supported values                         | Default value when missing  |
|-------------------------------|:------------:|--------------------------------| ---------------------------------------- |-----------------------------| 
| `WUD_REGISTRY_GITLAB_URL`     | :red_circle: | Gitlab Registry base url       |                                          | https://registry.gitlab.com |
| `WUD_REGISTRY_GITLAB_AUTHURL` | :red_circle: | Gitlab Authentication base url |                                          | https://gitlab.com          |
| `WUD_REGISTRY_GITLAB_TOKEN`   | :red_circle: | Gitlab Personal Access Token   |                                          |                             |

### Examples

#### Configure to access images from gitlab.com

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_REGISTRY_GITLAB_TOKEN=xxxxx 
```
#### **Docker**
```bash
docker run \
  -e WUD_REGISTRY_GITLAB_TOKEN="xxxxx" \
  ...
  getwud/wud
```
<!-- tabs:end -->

#### Configure to access images from self hosted gitlab instance

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_REGISTRY_GITLAB_URL=https://registry.mygitlab.acme.com
      - WUD_REGISTRY_GITLAB_AUTHURL=https://mygitlab.acme.com
      - WUD_REGISTRY_GITLAB_TOKEN=xxxxx 
```
#### **Docker**
```bash
docker run \
  -e WUD_REGISTRY_GITLAB_URL="https://registry.mygitlab.acme.com"
  -e WUD_REGISTRY_GITLAB_AUTHURL="https://mygitlab.acme.com"
  -e WUD_REGISTRY_GITLAB_TOKEN="xxxxx" \
  ...
  getwud/wud
```
<!-- tabs:end -->

### How to create a Gitlab Personal Access Token
#### Go to your Gitlab settings and open the Personal Access Token page
[Click here](https://gitlab.com/-/profile/personal_access_tokens)

#### Enter the details of the token to be created
Choose an expiration time & appropriate scopes (`read_registry` is only needed for wud) and generate.
![image](gitlab_01.png)

#### Copy the token & use it as the WUD_REGISTRY_GITLAB_TOKEN value
![image](gitlab_02.png)