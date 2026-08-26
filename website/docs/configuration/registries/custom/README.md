import { ConfigList, ConfigOption } from '@site/src/components/ConfigOption';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# CUSTOM (Self-Hosted Docker Registry)

![logo](custom.svg)

The `custom` registry module lets you integrate self-hosted [Docker Registry (v2)](https://docs.docker.com/registry/) instances.

### Variables

<ConfigList>
  <ConfigOption
    name="WUD_REGISTRY_CUSTOM_{registry_name}_URL"
    required={true}
    type="url"
    supported="Valid HTTP/HTTPS URL">
    Registry URL (e.g., `http://localhost:5000` or `https://registry.local`)
  </ConfigOption>

  <ConfigOption name="WUD_REGISTRY_CUSTOM_{registry_name}_AUTH"
    type="string"
    required={false}
    supported="Mutually exclusive with `LOGIN`/`PASSWORD`">
    Base64-encoded `username:password` string
  </ConfigOption>

  <ConfigOption name="WUD_REGISTRY_CUSTOM_{registry_name}_LOGIN"
    type="string"
    required={false}
    supported="Required when password is provided">
    Username (when Basic/htpasswd authentication is enabled)
  </ConfigOption>

  <ConfigOption name="WUD_REGISTRY_CUSTOM_{registry_name}_PASSWORD"
    type="string"
    required={false}
    supported="Required when username is provided">
    Password (when Basic/htpasswd authentication is enabled)
  </ConfigOption>
</ConfigList>
### Examples

#### Configure for anonymous access

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - WUD_REGISTRY_CUSTOM_PRIVATE_URL=http://localhost:5000
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e "WUD_REGISTRY_CUSTOM_PRIVATE_URL=http://localhost:5000" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>

#### Configure with Basic authentication

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

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

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -e "WUD_REGISTRY_CUSTOM_PRIVATE_URL=http://localhost:5000" \
  -e "WUD_REGISTRY_CUSTOM_PRIVATE_LOGIN=john" \
  -e "WUD_REGISTRY_CUSTOM_PRIVATE_PASSWORD=secret" \
  ...
  getwud/wud
```

</TabItem>
</Tabs>

#### Configure multiple self-hosted registries

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

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

</TabItem>
<TabItem value="docker" label="Docker">

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

</TabItem>
</Tabs>
