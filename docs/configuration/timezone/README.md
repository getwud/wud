# Timezone

WUD is running in UTC by default. \
If you prefer using a local timezone, you have 2 solutions: 

### Solution 1: use the local time of your host machine.

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

### Solution 2: use the standard `TZ` environment variable.

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

?> You can find the [list of the supported values here](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones).