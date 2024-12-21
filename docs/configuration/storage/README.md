# Storage
  
If you want the state to persist after the container removal, you need to mount  ```/store``` as a volume.

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
  -v /path-on-my-host:/store
  ...
  getwud/wud
```
<!-- tabs:end -->
