# App API

This API allows you to retrieve application information.

## Get application information

This endpoint returns general information about the running WUD instance.

```bash
curl http://wud:3000/api/app

{
  "name":"wud",
  "version":"5.0.0"
}
```
