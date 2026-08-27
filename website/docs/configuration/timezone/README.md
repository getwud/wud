import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Timezone

WUD runs in UTC by default. \
If you prefer using your local timezone, you have two options:

### Option 1: Mount the host timezone file

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    volumes:
      - /etc/localtime:/etc/localtime:ro
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run -v /etc/localtime:/etc/localtime:ro ... getwud/wud
```

</TabItem>
</Tabs>

### Option 2: Set the `TZ` environment variable

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - TZ=Europe/Paris
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run -e "TZ=Europe/Paris" ... getwud/wud
```

</TabItem>
</Tabs>

:::info
You can find the [list of supported TZ database timezones here](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones).
:::
