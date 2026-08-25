# Watcher API

This API allows you to query the state of configured watchers.

:::info
[Need to configure watchers?](configuration/watchers/)
:::

## Get all watchers

This endpoint returns all configured watchers.

```bash
curl http://wud:3000/api/watchers

[
   {
      "id":"docker.local",
      "type":"docker",
      "name":"local",
      "configuration":{
         "socket":"/var/run/docker.sock",
         "port":2375,
         "cron":"0 * * * *",
         "watchbydefault":true
      }
   }
]
```

## Get a watcher by ID

This endpoint retrieves a specific watcher by its ID.

```bash
curl http://wud:3000/api/watchers/docker/local

{
   "id":"docker.local",
   "type":"docker",
   "name":"local",
   "configuration":{
      "socket":"/var/run/docker.sock",
      "port":2375,
      "cron":"0 * * * *",
      "watchbydefault":true
   }
}
```
