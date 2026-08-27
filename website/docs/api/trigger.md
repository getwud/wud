# Trigger API

This API allows you to query the state of configured triggers and test-run them.

:::info
[Need to configure triggers?](../configuration/triggers/README.md)
:::

## Get all triggers

This endpoint returns all configured triggers.

```bash
curl http://wud:3000/api/triggers

[
   {
      "id":"smtp.gmail",
      "type":"smtp",
      "name":"gmail",
      "configuration":{
         "host":"smtp.gmail.com",
         "port":465,
         "user":"xxx@gmail.com",
         "pass":"secret",
         "from":"admin@wud.com",
         "to":"xxx@gmail.com"
      }
   }
]
```

## Get a trigger by ID

This endpoint retrieves a specific trigger by its ID.

```bash
curl http://wud:3000/api/triggers/smtp/gmail

{
  "id":"smtp.gmail",
  "type":"smtp",
  "name":"gmail",
  "configuration":{
     "host":"smtp.gmail.com",
     "port":465,
     "user":"xxx@gmail.com",
     "pass":"secret",
     "from":"admin@wud.com",
     "to":"xxx@gmail.com"
  }
}
```

## Run a trigger

This endpoint executes a specific trigger with simulated container update data.

```bash
export CONTAINER='{"id":"123456789","name":"container_test","watcher":"watcher_test","updateKind":{"kind":"tag","semverDiff":"patch","localValue":"1.2.3","remoteValue":"1.2.4","result":{"link":"https://my-container/release-notes/"}}}'
curl -X POST -H "Content-Type: application/json" -d "$CONTAINER" http://wud:3000/api/triggers/smtp/gmail
```
