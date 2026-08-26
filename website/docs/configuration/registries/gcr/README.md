import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# GCR (Google Container Registry)

![logo](gcr.svg)

The `gcr` registry module lets you authenticate against [Google Container Registry](https://cloud.google.com/container-registry) (GCR) and Google Artifact Registry.

:::info[Public GCR images work out of the box without authentication. Configure this module to access private repositories.]
:::

### Variables

<ConfigList>
  <ConfigOption
    name="WUD_REGISTRY_GCR_{registry_name}_CLIENTEMAIL"
    required={false}
    type="url"
    supported="See [Service Account credentials](https://cloud.google.com/container-registry/docs/advanced-authentication#json-key)">
    Service Account client email (required for private images)
  </ConfigOption>

  <ConfigOption
    name="WUD_REGISTRY_GCR_{registry_name}_PRIVATEKEY"
    required={false}
    type="url"
    supported="See [Service Account credentials](https://cloud.google.com/container-registry/docs/advanced-authentication#json-key)">
    Service Account private key (required for private images)
  </ConfigOption>
</ConfigList>
### Examples

#### Authenticate with a Google Service Account

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_REGISTRY_GCR_PRIVATE_CLIENTEMAIL=johndoe@mysuperproject.iam.gserviceaccount.com
      - WUD_REGISTRY_GCR_PRIVATE_PRIVATEKEY=-----BEGIN PRIVATE KEY-----\nxxxxxxxxxxx\n-----END PRIVATE KEY-----\n
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e WUD_REGISTRY_GCR_PRIVATE_CLIENTEMAIL="johndoe@mysuperproject.iam.gserviceaccount.com" \
  -e WUD_REGISTRY_GCR_PRIVATE_PRIVATEKEY="-----BEGIN PRIVATE KEY-----\nxxxxxxxxxxx\n-----END PRIVATE KEY-----\n" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>

### How to create a Service Account on Google Cloud Platform

#### 1. Open the [Google Cloud Service Accounts Console](https://console.cloud.google.com/iam-admin/serviceaccounts)

![image](gcr_01.png)

#### 2. Create a new Service Account

![image](gcr_02.png)

#### 3. Assign the Container Registry Service Agent or Artifact Registry Reader role

![image](gcr_03.png)

#### 4. Save the Service Account

![image](gcr_04.png)

#### 5. Create a new JSON key for the Service Account

![image](gcr_05.png)

#### 6. Download and store the JSON key file securely

![image](gcr_06.png)

#### 7. Open the JSON file, copy `client_email` and `private_key`, and configure WUD with them
