import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# FAQ

## Core dump on Raspberry Pi

If you encounter an error like the following during startup on a Raspberry Pi:

```
#
# Fatal error in , line 0
# unreachable code
#
#
#
#FailureMessage Object: 0x7eace25c
```

Add the `--security-opt seccomp=unconfined` flag to your Docker command:

<Tabs>
<TabItem value="docker" label="Docker">

```bash
docker run -d --name wud \
  --security-opt seccomp=unconfined \
  -v "/var/run/docker.sock:/var/run/docker.sock" \
  -p 3000:3000 \
  getwud/wud
```

</TabItem>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    container_name: wud
    security_opt:
      - seccomp:unconfined
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    ports:
      - 3000:3000
```

</TabItem>
</Tabs>
