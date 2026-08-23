# Timezone

WUD runs in UTC by default. \
If you prefer using your local timezone, you have two options:

### Option 1: Mount the host timezone file

<!-- tabs:start -->

#### **Docker Compose**

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    volumes:
      - /etc/localtime:/etc/localtime:ro
```

#### **Docker**

```bash
docker run -v /etc/localtime:/etc/localtime:ro ... getwud/wud
```

<!-- tabs:end -->

### Option 2: Set the `TZ` environment variable

<!-- tabs:start -->

#### **Docker Compose**

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - TZ=Europe/Paris
```

#### **Docker**

```bash
docker run -e "TZ=Europe/Paris" ... getwud/wud
```

<!-- tabs:end -->

?> You can find the [list of supported TZ database timezones here](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones).
