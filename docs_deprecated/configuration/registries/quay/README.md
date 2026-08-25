import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Quay (Red Hat Quay)

![logo](quay.png)

The `quay` registry module lets you authenticate against [Quay.io](https://quay.io/) and self-hosted Red Hat Quay registries.

?> Public Quay images work out of the box without authentication. Configure this module to access private repositories.

### Variables

| Env var                                       |    Required    | Description                         | Supported values | Default value when missing |
| --------------------------------------------- | :------------: | ----------------------------------- | ---------------- | -------------------------- |
| `WUD_REGISTRY_QUAY_{registry_name}_NAMESPACE` | :white_circle: | Quay organization or user namespace | String           |                            |
| `WUD_REGISTRY_QUAY_{registry_name}_ACCOUNT`   | :white_circle: | Quay robot account name             | String           |                            |
| `WUD_REGISTRY_QUAY_{registry_name}_TOKEN`     | :white_circle: | Quay robot account token            | String           |                            |

### Examples

#### Authenticate to access private images

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_REGISTRY_QUAY_PRIVATE_NAMESPACE=mynamespace
      - WUD_REGISTRY_QUAY_PRIVATE_ACCOUNT=myrobotaccount
      - WUD_REGISTRY_QUAY_PRIVATE_TOKEN=BA8JI3Y2BWQDH849RYT3YD5J0J6CYEORYTQMMJK364B4P88VPTJIAI704L0BBP8D6CYE4P88V
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_REGISTRY_QUAY_PRIVATE_NAMESPACE="mynamespace" \
  -e WUD_REGISTRY_QUAY_PRIVATE_ACCOUNT="myrobotaccount" \
  -e WUD_REGISTRY_QUAY_PRIVATE_TOKEN="BA8JI3Y2BWQDH849RYT3YD5J0J6CYEORYTQMMJK364B4P88VPTJIAI704L0BBP8D6CYE4P88V" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>

### How to create a Quay.io robot account

#### 1. Open your Quay.io Organization or User settings and select "Robot Accounts"

#### 2. Click "Create Robot Account"

Choose a name and grant read permissions to the appropriate repositories.
![image](quay_01.png)

#### 3. Retrieve credentials and configure WUD

Robot accounts follow the format `<namespace>+<account>`.

- Set the portion before the `+` as `WUD_REGISTRY_QUAY_{registry_name}_NAMESPACE`
- Set the portion after the `+` as `WUD_REGISTRY_QUAY_{registry_name}_ACCOUNT`
- Set the generated token as `WUD_REGISTRY_QUAY_{registry_name}_TOKEN`
  ![image](quay_02.png)
