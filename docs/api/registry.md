# Registry API
This API allows you to query the state of configured registries.

?> [Need to configure registries?](configuration/registries/)

## Get all registries
This endpoint returns all configured registries.

```bash
curl http://wud:3000/api/registries

[
    {
        "id":"ecr.private",
        "type":"ecr",
        "name":"private",
        "configuration":{
            "region":"eu-west-1",
            "accesskeyid":"A******************D",
            "secretaccesskey":"T**************************************D"
        }
    },
    {
        "id":"hub.private",
        "type":"hub",
        "name":"private",
        "configuration":{
            "auth": "dXNlcm5hbWU6cGFzc3dvcmQ="
        }
    }
]
```

## Get a registry by ID
This endpoint retrieves a specific registry by its ID.

```bash
curl http://wud:3000/api/registries/hub/private

{
    "id": "hub.private",
    "type": "hub",
    "name": "private",
    "configuration": {
        "auth": "dXNlcm5hbWU6cGFzc3dvcmQ="
    }
}
```


