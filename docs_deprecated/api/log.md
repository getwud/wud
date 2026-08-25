# Log API

This API allows you to retrieve the logger configuration.

## Get log configuration

This endpoint returns the current configuration and level of the logger.

```bash
curl http://wud:3000/api/log

{
  "level":"debug"
}
```
