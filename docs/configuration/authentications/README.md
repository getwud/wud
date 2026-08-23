# Authentication

WUD allows anonymous access by default.

You can enable one or more authentication strategies using `WUD_AUTH_*` environment variables.

!> Note that when enabled, all API routes and UI views require authentication.

Currently, the following strategies are supported:

?> [**Basic Authentication**](configuration/authentications/basic/)

?> [**OpenID Connect (OIDC)**](configuration/authentications/oidc/)
