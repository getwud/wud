import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Quick start

## Run the Docker image

The easiest way to get started is to deploy the official _**WUD**_ container image.

<Tabs>
<TabItem value="docker-compose" label="Docker Compose">

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    container_name: wud
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    ports:
      - 3000:3000
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
docker run -d --name wud \
  -v "/var/run/docker.sock:/var/run/docker.sock" \
  -p 3000:3000 \
  getwud/wud
```

</TabItem>
</Tabs>

:::info[Note that WUD is available on multiple container registries:]

- Docker Hub: `getwud/wud`
- GitHub Container Registry: `ghcr.io/getwud/wud`
:::

## Open the UI

[Open the UI](http://localhost:3000) in your browser and verify that everything is running properly.

## Add your first trigger

:::info[Everything running smoothly?]
It's time to [**configure your triggers**](../configuration/triggers/README.md)!
:::

## Going deeper...

:::info[Need to fine-tune how WUD monitors your containers?]
Check out the [**watcher documentation**](../configuration/watchers/README.md)!
:::

:::info[Need to integrate other registries (ECR, GCR, GitLab...)?]
Check out the [**registry documentation**](../configuration/registries/README.md).
:::

## Ready-to-go examples

:::info
You can find a **[complete configuration example](../configuration/README.md#complete-example)** illustrating common WUD options.
:::
