# Xmpp

The `xmpp` trigger lets you send notifications via XMPP (Jabber) instant messaging.

### Variables

| Env var                                          | Required       | Description                                                                             | Supported values                          | Default value when missing |
| ------------------------------------------------ |:--------------:|:--------------------------------------------------------------------------------------  | ----------------------------------------- | -------------------------- |
| `WUD_TRIGGER_XMPP_{trigger_name}_SERVICE`        | :red_circle:   | XMPP server service URL                                                                 | `xmpp://…`, `xmpps://…`, `ws://…`, `wss://…` |                        |
| `WUD_TRIGGER_XMPP_{trigger_name}_DOMAIN`         | :white_circle: | XMPP domain (inferred from JID if not set)                                              |                                           |                            |
| `WUD_TRIGGER_XMPP_{trigger_name}_USER`           | :red_circle:   | XMPP username (local part of JID, e.g. `user` from `user@example.com`)                 |                                           |                            |
| `WUD_TRIGGER_XMPP_{trigger_name}_PASSWORD`       | :red_circle:   | XMPP account password                                                                   |                                           |                            |
| `WUD_TRIGGER_XMPP_{trigger_name}_TO`             | :red_circle:   | Recipient JID to send the message to                                                    | Valid JID, e.g. `friend@example.com`      |                            |

?> This trigger also supports the [common configuration variables](configuration/triggers/?id=common-trigger-configuration).

### Examples

#### Send an XMPP chat message

<!-- tabs:start -->
#### **Docker Compose**

```yaml
services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
        - WUD_TRIGGER_XMPP_MAIN_SERVICE=xmpps://chat.example.com:5223
        - WUD_TRIGGER_XMPP_MAIN_DOMAIN=example.com
        - WUD_TRIGGER_XMPP_MAIN_USER=wud
        - WUD_TRIGGER_XMPP_MAIN_PASSWORD=mysecretpass
        - WUD_TRIGGER_XMPP_MAIN_TO=admin@example.com
```

#### **Docker**

```bash
docker run \
    -e WUD_TRIGGER_XMPP_MAIN_SERVICE="xmpps://chat.example.com:5223" \
    -e WUD_TRIGGER_XMPP_MAIN_DOMAIN="example.com" \
    -e WUD_TRIGGER_XMPP_MAIN_USER="wud" \
    -e WUD_TRIGGER_XMPP_MAIN_PASSWORD="mysecretpass" \
    -e WUD_TRIGGER_XMPP_MAIN_TO="admin@example.com" \
  ...
  getwud/wud
```
<!-- tabs:end -->

?> The `SERVICE` URL scheme `xmpps://` uses direct TLS on port 5223 (recommended). Use `xmpp://` for plain-text STARTTLS on port 5222. WebSocket transports `ws://` and `wss://` are also supported for servers that expose an XMPP-over-WebSocket endpoint.
