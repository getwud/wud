# Storage
  
To persist WUD state across container restarts and removals, mount `/store` as a persistent volume.

### Examples 

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    volumes:
      - /path-on-my-host:/store
```
#### **Docker**
```bash
docker run \
  -v /path-on-my-host:/store \
  ...
  getwud/wud
```
<!-- tabs:end -->

