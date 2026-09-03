# Container API

This API allows you to query the state of watched containers.

## Get all containers

This endpoint returns all watched containers.

```bash
curl http://wud:3000/api/containers

[
   {
  "id":"31a61a8305ef1fc9a71fa4f20a68d7ec88b28e32303bbc4a5f192e851165b816",
  "name":"homeassistant",
  "watcher":"local",
  "includeTags":"^\\d+\\.\\d+.\\d+$",
  "image":{
    "id":"sha256:d4a6fafb7d4da37495e5c9be3242590be24a87d7edcc4f79761098889c54fca6",
    "registry":{
      "url":"123456789.dkr.ecr.eu-west-1.amazonaws.com"
    },
    "name":"test",
    "tag":{
      "value":"2021.6.4",
      "semver":true
    },
    "digest":{
      "watch":false,
      "repo":"sha256:ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72"
    },
    "architecture":"amd64",
    "os":"linux",
    "created":"2021-06-12T05:33:38.440Z"
  },
  "result":{
    "tag":"2021.6.5"
  },
  "updateAvailable": true
}
]
```

## Check all containers

This endpoint triggers an immediate update check across all containers.

```bash
curl -X POST http://wud:3000/api/containers/watch

[{
  "id":"31a61a8305ef1fc9a71fa4f20a68d7ec88b28e32303bbc4a5f192e851165b816",
  "name":"homeassistant",
  "watcher":"local",
  "includeTags":"^\\d+\\.\\d+.\\d+$",
  "image":{
    "id":"sha256:d4a6fafb7d4da37495e5c9be3242590be24a87d7edcc4f79761098889c54fca6",
    "registry":{
      "url":"123456789.dkr.ecr.eu-west-1.amazonaws.com"
    },
    "name":"test",
    "tag":{
      "value":"2021.6.4",
      "semver":true
    },
    "digest":{
      "watch":false,
      "repo":"sha256:ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72"
    },
    "architecture":"amd64",
    "os":"linux",
    "created":"2021-06-12T05:33:38.440Z"
  },
  "result":{
    "tag":"2021.6.5"
  },
  "updateAvailable": true
}]
```

## Get a container by ID

This endpoint retrieves a specific container by its ID.

```bash
curl http://wud:3000/api/containers/31a61a8305ef1fc9a71fa4f20a68d7ec88b28e32303bbc4a5f192e851165b816

{
  "id":"31a61a8305ef1fc9a71fa4f20a68d7ec88b28e32303bbc4a5f192e851165b816",
  "name":"homeassistant",
  "watcher":"local",
  "includeTags":"^\\d+\\.\\d+.\\d+$",
  "image":{
    "id":"sha256:d4a6fafb7d4da37495e5c9be3242590be24a87d7edcc4f79761098889c54fca6",
    "registry":{
      "url":"123456789.dkr.ecr.eu-west-1.amazonaws.com"
    },
    "name":"test",
    "tag":{
      "value":"2021.6.4",
      "semver":true
    },
    "digest":{
      "watch":false,
      "repo":"sha256:ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72"
    },
    "architecture":"amd64",
    "os":"linux",
    "created":"2021-06-12T05:33:38.440Z"
  },
  "result":{
    "tag":"2021.6.5"
  },
  "updateAvailable": true
}
```

## The `result` object

`result` describes what the registry currently offers for the watched container.

| Field | Description |
|---|---|
| `tag` | The tag WUD would update to. |
| `digest` | The remote manifest digest, when the container is watched by digest. |
| `created` | Build date of the remote image. |
| `version` | The remote image's `org.opencontainers.image.version` label, when it carries one. |
| `link` | Link to the image on the registry, when a link template is available. |

For a container watched by digest, `version` and `created` are read from the remote
image config once per remote digest, and only once an update has been found — so they
describe *what changed*, where the tag alone (typically `latest`) says nothing:

```json
{
  "result":{
    "tag":"latest",
    "digest":"sha256:3eb277accfc7d36706b60365c9f14da711c7070bddb9d078004350c2aa7d1692",
    "created":"2026-09-02T05:35:35.550Z",
    "version":"2.3.7"
  },
  "updateAvailable": true
}
```

Notes:

- `version` is only present when the remote image carries an
  `org.opencontainers.image.version` label. Images whose label is a floating value such
  as `latest` or `nightly` report that value verbatim, so compare `created` against the
  local `image.created` in that case.
- Timestamps are normalized to millisecond precision, even where the registry reports
  more. `image.created` is normalized the same way, so the two stay comparable.
- For legacy schemaVersion 1 manifests, `created` comes from the manifest itself rather
  than the image config, and is set whenever the container is watched by digest.

## Get all triggers associated with the container

This endpoint returns the list of triggers associated with the container.

```bash
curl http://wud:3000/api/containers/31a61a8305ef1fc9a71fa4f20a68d7ec88b28e32303bbc4a5f192e851165b816/triggers

[
  {
    "id": "ntfy.one",
    "type": "ntfy",
    "name": "one",
    "configuration": {
      "topic": "235ef38e-f1db-414a-964f-ce3f2cc8094d",
      "url": "https://ntfy.sh",
      "threshold": "major",
      "mode": "simple",
      "once": true,
      "simpletitle": "New ${kind} found for container ${name}",
      "simplebody": "Container ${container.name} running with ${container.updateKind.kind} ${container.updateKind.localValue} can be updated to ${container.updateKind.kind} ${container.updateKind.remoteValue}${container.result && container.result.link ? \"\\n\" + container.result.link : \"\"}",
      "batchtitle": "${containers.length} updates available"
    }
  }
]
```

## Check a specific container

This endpoint triggers an immediate update check for a specific container.

```bash
curl -X POST http://wud:3000/api/containers/ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72/watch

{
  "id":"31a61a8305ef1fc9a71fa4f20a68d7ec88b28e32303bbc4a5f192e851165b816",
  "name":"homeassistant",
  "watcher":"local",
  "includeTags":"^\\d+\\.\\d+.\\d+$",
  "image":{
    "id":"sha256:d4a6fafb7d4da37495e5c9be3242590be24a87d7edcc4f79761098889c54fca6",
    "registry":{
      "url":"123456789.dkr.ecr.eu-west-1.amazonaws.com"
    },
    "name":"test",
    "tag":{
      "value":"2021.6.4",
      "semver":true
    },
    "digest":{
      "watch":false,
      "repo":"sha256:ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72"
    },
    "architecture":"amd64",
    "os":"linux",
    "created":"2021-06-12T05:33:38.440Z"
  },
  "result":{
    "tag":"2021.6.5"
  },
  "updateAvailable": true
}
```

## Run a trigger on the container

This endpoint manually executes a specific trigger for a container.

```bash
curl -X POST http://wud:3000/api/containers/31a61a8305ef1fc9a71fa4f20a68d7ec88b28e32303bbc4a5f192e851165b816/triggers/ntfy/one
```

## Delete a container

This endpoint deletes a container from the store by its ID.

```bash
curl -X DELETE http://wud:3000/api/containers/ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72
```
