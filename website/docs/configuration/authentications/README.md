# Authentication & User Management

WUD enforces mandatory authentication across all UI views and API endpoints. Anonymous access is disabled by default.

## Roles & Permissions

WUD features Role-Based Access Control (RBAC) with three roles:

| Role | Name | Description |
| :--- | :--- | :--- |
| **`admin`** | Administrator | Full access to all features, configuration, user management, and API tokens. |
| **`rw`** | Read / Write | Can view all data and trigger container updates and actions. Cannot modify system configurations or manage other users. |
| **`ro`** | Read-Only | Read-only access to container dashboards, logs, and triggers. Cannot trigger actions or modify settings. |

---

## Bootstrapping the Initial Administrator

On a fresh WUD instance, at least one administrator account must be available. You can provision this initial admin account using environment variables:

```bash
# Recommended: bootstrap initial administrator account
WUD_AUTH_ADMIN_USER=admin
WUD_AUTH_ADMIN_PASSWORD=MySecurePassword123
```

Alternatively, WUD maintains backward compatibility with legacy basic authentication variables (`WUD_AUTH_BASIC_{name}_USER` / `HASH`).

### Omitting the Local Administrator with OIDC SSO

If you configure an OpenID Connect provider with an administrator group (`WUD_AUTH_OIDC_{name}_ADMINGROUP`), **you do not need any local administrator account** (`WUD_AUTH_ADMIN_USER` / `WUD_AUTH_ADMIN_PASSWORD`).

WUD's startup verification recognizes the OIDC admin group configuration and starts cleanly without requiring local admin credentials. Upon their first login, any user belonging to the configured admin group is automatically provisioned and assigned the `admin` role in WUD. This enables a 100% SSO-driven, zero-local-credentials deployment!

:::tip[Fail-Fast Startup Check]
If no administrator is found in the database, no bootstrap administrator credentials (`WUD_AUTH_ADMIN_USER`/`PASSWORD`) are provided, and no OIDC admin group is configured, WUD will fail to start and log an explicit error to prevent lockout.
:::

---

## Managing Users & API Tokens

Once authenticated as an administrator, you can manage users directly in the Web UI under **Configuration > Users**:
- Add new local users with assigned roles (`admin`, `rw`, `ro`).
- Edit user roles and reset passwords.
- Delete users (with safety checks preventing deletion of the last remaining admin or self-deletion).

All users can also navigate to **My Profile** to:
- Synchronize their interface preferences (such as **Dark / Light theme**).
- Change their account password (for local accounts).
- Generate and manage **Personal API Tokens** for automation scripts, CI/CD pipelines, or Home Assistant integrations using `Authorization: Bearer wud_...`.

---

## Authentication Strategies

:::info
[**OpenID Connect (OIDC) & Group Mapping**](./oidc/README.md)  
*Recommended for enterprise and homelab Single Sign-On (Authentik, Keycloak, Authelia, Okta, Azure AD...). Supports automatic onboarding and role synchronization.*
:::

:::warning[Deprecated: Static Basic Authentication]
[**Basic Authentication (Legacy)**](./basic/README.md)  
*The static environment-based basic authentication provider (`WUD_AUTH_BASIC_*`) is deprecated in favor of database-backed user management and bootstrap admin credentials.*
:::
