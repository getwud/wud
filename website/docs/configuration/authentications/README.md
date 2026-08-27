# Authentication

WUD allows anonymous access by default.

You can enable one or more authentication strategies using `WUD_AUTH_*` environment variables.

:::warning[Note that when enabled, all API routes and UI views require authentication.]
:::

Currently, the following strategies are supported:

:::info
[**Basic Authentication**](./basic/README.md)
:::

:::info
[**OpenID Connect (OIDC)**](./oidc/README.md)
:::
