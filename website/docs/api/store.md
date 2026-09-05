# Store API

This API allows you to query the storage configuration.

## Get store configuration

This endpoint returns the configuration and state of the internal store.

```bash
curl http://wud:3000/api/store

{
   "configuration":{
      "path":"/store",
      "file":"wud.sqlite"
   }
}
```
