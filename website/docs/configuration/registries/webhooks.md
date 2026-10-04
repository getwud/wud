---
title: Registry Webhooks
description: Check matching watched images immediately after registry push notifications.
---

# Registry Webhooks

Registry push notifications can request an immediate check of matching watched containers. WUD queries the configured registry provider, stores the normal update result, and evaluates existing triggers. Scheduled watcher polling remains enabled as reconciliation when notifications are lost or checks fail.

Providers based on Docker Registry V2 accept the Docker Distribution notification format, including GitLab Self-Managed registries. This format is different from GitLab project push webhooks. Configuring GitLab registry notifications requires registry administration access; a GitLab.com project webhook does not provide this integration.

## Configuration

Enable incoming notifications on an existing configured registry instance by setting its webhook token. Environment names are normalized to lowercase, so a GitLab registry named `LOCAL` uses `POST /api/registries/gitlab.local/events`. The endpoint uses the full registry identifier shown by WUD, including its provider and instance name.

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `WUD_REGISTRY_GITLAB_LOCAL_WEBHOOK_TOKEN` | String | None | Nonempty shared webhook secret; omitting it disables incoming notifications for this registry instance. |

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      WUD_REGISTRY_GITLAB_LOCAL_URL: "https://registry.example.com"
      WUD_REGISTRY_GITLAB_LOCAL_AUTHURL: "https://gitlab.example.com"
      WUD_REGISTRY_GITLAB_LOCAL_WEBHOOK_TOKEN: "${WUD_WEBHOOK_TOKEN}"
```

Send `Authorization: Bearer <WUD_WEBHOOK_TOKEN>` on every request. This endpoint uses its webhook secret independently of UI/API authentication. Keep the secret private and expose the receiver through HTTPS. Registry read credentials still belong in the [GitLab registry configuration](./gitlab/README.md); the webhook token does not grant registry access.

For another supported provider, use `WUD_REGISTRY_{PROVIDER}_{NAME}_WEBHOOK_TOKEN` and `POST /api/registries/{provider}.{name}/events`. The provider must support the incoming notification format and the sender must allow a custom Authorization header.

## Configure GitLab notifications

Follow [GitLab's container registry notification administration guide](https://docs.gitlab.com/administration/packages/container_registry/#configure-container-registry-notifications). For a Linux package installation, add a WUD entry to `registry['notifications']` in `/etc/gitlab/gitlab.rb`, preserving existing notification endpoints:

```ruby
{
  'name' => 'wud-local',
  'url' => 'https://wud.example.com/api/registries/gitlab.local/events',
  'timeout' => '2s',
  'maxretries' => 5,
  'backoff' => '1s',
  'headers' => {
    'Authorization' => ['Bearer replace-with-your-wud-receiver-secret']
  }
}
```

Replace the secret with the same value configured in WUD, then run `sudo gitlab-ctl reconfigure`. Preserve GitLab's own notification endpoint and its existing authorization secret. For other installation types, configure the equivalent additional endpoint in the registry's notification configuration.

## Payload and matching

The receiver accepts `application/json` and `application/vnd.docker.distribution.events.v2+json`. A tagged manifest push looks like:

```json
{
  "events": [
    {
      "action": "push",
      "target": {
        "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
        "repository": "apps/my-container",
        "tag": "latest",
        "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "url": "https://registry.example.com/v2/apps/my-container/manifests/latest"
      },
      "request": { "host": "registry.example.com" }
    }
  ]
}
```

WUD derives the registry host from `target.url`, or from `request.host` when no URL is present. It handles Docker and OCI manifest and index pushes with a tag and SHA-256 digest. Pulls, deletes, layer pushes, and untagged manifests are ignored.

Only containers already known to WUD and assigned to the addressed registry instance with the same registry host, repository, and **current tag** are checked. A push to `apps/my-container:latest` does not immediately check a container running `apps/my-container:1.0`; polling still discovers other candidate tags. Another configured registry instance's containers are not selected, even if their image names match. The pushed digest is a hint and a deduplication key: WUD reads remote registry metadata rather than trusting the event as an update command.

## Existing policies still apply

The watcher refreshes workload discovery and uses its normal check and report path for matching containers. All existing settings remain effective: `wud.watch`, `wud.watch.digest`, `wud.tag.include`, `wud.tag.exclude`, `wud.trigger.include`, `wud.trigger.exclude`, `trigger.includeByDefault`, `trigger.auto`, and `trigger.dryrun`.

For mutable tags such as `latest`, enable `wud.watch.digest` to detect a changed digest. With `WUD_TRIGGER_DOCKERCOMPOSE_LOCAL_INCLUDEBYDEFAULT=false`, the Compose trigger still requires the container's explicit opt-in:

```yaml
services:
  my-container:
    image: registry.example.com/apps/my-container:latest
    labels:
      wud.watch: "true"
      wud.watch.digest: "true"
      wud.trigger.include: "dockercompose.local"
```

Configure the [Docker Compose trigger](../triggers/docker-compose/README.md) normally. Receiving a notification only requests a check; it does not directly update a container or override trigger eligibility.

## Responses and reliability

- `202`: hints accepted for asynchronous processing, with an `accepted` count. This does not guarantee a completed check or update. Unknown images and ignored events do no work.
- `400`: malformed notification or unsupported notification format; `413`: request exceeds 256 KiB.
- `401`: missing or incorrect webhook authorization; `404`: unknown registry instance or webhook token not configured.
- `429`: pending hint capacity exceeded; retry later.

Requests contain at most 100 events. Pending and recently completed hints are bounded to 1,000 entries. Checks are serialized. Repeated registry-instance/host/repository/tag/digest hints are suppressed while pending and for 60 seconds after successful processing. Deduplication is in memory and resets on restart.

Failed registry checks are logged and are not marked successfully processed; a later delivery can retry. Because processing begins after the `202` response, GitLab's delivery retries do not automatically retry an already accepted registry-query failure. Keep scheduled polling enabled as fallback.
