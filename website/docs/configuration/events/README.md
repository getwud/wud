---
title: Registry Events
description: Check matching watched images immediately after GitLab registry pushes.
---

# Registry Events

GitLab Self-Managed container registry notifications can request an immediate check of matching watched containers. WUD queries the configured registry provider, stores the normal update result, and evaluates existing triggers. Scheduled watcher polling remains enabled as reconciliation when notifications are lost or checks fail.

This receiver accepts native registry notifications, not GitLab project push webhooks. Configuring it requires access to the registry's administration settings; a GitLab.com project webhook does not provide this integration.

## Configuration

Replace `LOCAL` with your receiver name. Environment names are normalized to lowercase, so `LOCAL` uses `POST /api/events/registry/gitlab/local`. Receiver names may contain lowercase letters, digits, and hyphens.

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `WUD_EVENT_GITLAB_LOCAL_ENABLED` | Boolean | `false` | Enable this receiver. |
| `WUD_EVENT_GITLAB_LOCAL_TOKEN` | String | None | Required when enabled. Shared receiver secret. |
| `WUD_EVENT_GITLAB_LOCAL_REGISTRY` | String | None | Optional allowed registry hostname, including port if used; no scheme or path. |

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    environment:
      WUD_EVENT_GITLAB_LOCAL_ENABLED: "true"
      WUD_EVENT_GITLAB_LOCAL_TOKEN: "${WUD_WEBHOOK_TOKEN}"
      WUD_EVENT_GITLAB_LOCAL_REGISTRY: "registry.example.com"
```

Send `Authorization: Bearer <WUD_WEBHOOK_TOKEN>` on every request. This endpoint uses its receiver secret independently of UI/API authentication. Keep the secret private and expose the receiver through HTTPS. Registry read credentials still belong in the [GitLab registry configuration](../registries/gitlab/README.md); the receiver token does not grant registry access.

## Configure GitLab notifications

Follow [GitLab's container registry notification administration guide](https://docs.gitlab.com/administration/packages/container_registry/#configure-container-registry-notifications). For a Linux package installation, add a WUD entry to `registry['notifications']` in `/etc/gitlab/gitlab.rb`, preserving existing notification endpoints:

```ruby
{
  'name' => 'wud-local',
  'url' => 'https://wud.example.com/api/events/registry/gitlab/local',
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

Only containers already known to WUD with the same registry host, repository, and **current tag** are checked. A push to `apps/my-container:latest` does not immediately check a container running `apps/my-container:1.0`; polling still discovers other candidate tags. The pushed digest is a hint and a deduplication key: WUD reads remote registry metadata rather than trusting the event as an update command.

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
- `400`: malformed notification; `413`: request exceeds 256 KiB.
- `401`: missing or incorrect receiver authorization; `404`: unknown or disabled receiver.
- `429`: pending hint capacity exceeded; retry later.

Requests contain at most 100 events. Pending and recently completed hints are bounded to 1,000 entries. Checks are serialized. Repeated receiver/registry/repository/tag/digest hints are suppressed while pending and for 60 seconds after successful processing. Deduplication is in memory and resets on restart.

Failed registry checks are logged and are not marked successfully processed; a later delivery can retry. Because processing begins after the `202` response, GitLab's delivery retries do not automatically retry an already accepted registry-query failure. Keep scheduled polling enabled as fallback.
