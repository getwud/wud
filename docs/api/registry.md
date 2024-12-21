# Registry API
This API allows to query the state of the registries.

?> Need to add a new Registry?  
[Take a look at the documentation.](/registries/)

## Get all Registries
This operation lets you get all the configured registries.

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

## Get a Registry by id
This operation lets you get a specific Registry.

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

