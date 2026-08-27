import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Storage

To persist WUD state across container restarts and removals, mount `/store` as a persistent volume.

### Examples

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    volumes:
      - /path-on-my-host:/store
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run \
  -v /path-on-my-host:/store \
  ...
  getwud/wud
```

</TabItem>
</Tabs>
