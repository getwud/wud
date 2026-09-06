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

Alternatively, WUD maintains backward compatibility with legacy basic authentication variables (`WUD_AUTH_BASIC_{name}_USER` / `HASH`), or automatically promotes users matching the OIDC administrator group.

:::tip[Fail-Fast Startup Check]
If no administrator is found in the database and no bootstrap administrator credentials are provided in the environment, WUD will fail to start and log an explicit error to prevent lockout.
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
[**Local Authentication & Password Hashing**](./basic/README.md)
:::

:::info
[**OpenID Connect (OIDC) & Group Mapping**](./oidc/README.md)
:::
