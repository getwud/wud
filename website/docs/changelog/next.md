---
title: Next (Unreleased)
description: Unreleased changes and upcoming features in WUD (What's Up Docker?).
---

# Next (Unreleased)

> Changes below are merged on `main` and will be included in the upcoming release.

---

- 🚀 [STORE] Migrate persistence layer from LokiJS to SQL (SQLite) with Drizzle ORM, automatic schema migrations, and transparent legacy data migration
- 🚀 [AUTH] Add Role-Based Access Control (RBAC) with 3 roles: Administrator (`admin`), Read/Write (`rw`), and Read-Only (`ro`)
- 🚀 [AUTH] Add Database-backed User Management in Web UI (Configuration > Users) with role management and secure password resets
- 🚀 [AUTH] Add Personal API Tokens with granular scopes (`read`, `write`) and optional expiration dates for programmatic REST API access
- 🚀 [OIDC] Add automatic user onboarding and role synchronization from Identity Provider group claims (`admingroup`, `rwgroup`, `groupsclaim`)
- 🚀 [PROFILE] Add User Profile page with theme preference synchronization (dark/light) across sessions, password change, and API token management
- 🚀 [LOG] Migrate logger from unmaintained Bunyan to Pino with Pino-pretty formatting
- 🚀 [UI] Add live logs viewer via Server-Sent Events (SSE)
- 🚀 [DOCS] Add interactive UI live demo simulator with homelab mock data
- 🚀 [TESTS] Add end-to-end Cucumber API scenarios and Playwright UI tests covering user management, personal API tokens, and full RBAC enforcement
- 🚀 [CI] Add automated UI screenshot capture pipeline with Playwright and dark mode support
- 🚀 [UI] Add demo mode with mock services for static deployment
- 🚀 [REGISTRY] Enable anonymous access by default for Gitlab public registry
- 🚀 [API] Refactor REST API to a Design-First architecture:
  - Establish `openapi.yaml` as the authoritative single source of truth for the entire API contract
  - Standardize API error payload format (`{ error, message }`) across all endpoints
- 🚀 [DOCS] Integrate interactive OpenAPI API Reference in Docusaurus with "Try it out" explorer, request/response schema inspector, and code samples
- 🚀 [REGISTRY] Support direct bearer-token authentication for custom registries
- 🔧 [DOCS] Refresh OpenID Connect (OIDC) and container registry documentation with modern Vue 3 UI screenshots and fix relative asset paths

- ⚠️ [AUTH] Anonymous authentication removed: WUD now enforces mandatory authentication. At least one administrator account must be provisioned (via `WUD_AUTH_ADMIN_USER`/`WUD_AUTH_ADMIN_PASSWORD`, legacy `WUD_AUTH_BASIC_*`, or an OIDC provider with an admin group). WUD will fail-fast on startup if no administrator is available.
- ⚠️ [AUTH] Deprecate static Basic Authentication environment variables (`WUD_AUTH_BASIC_*`): Administrators should be bootstrapped via `WUD_AUTH_ADMIN_USER`/`WUD_AUTH_ADMIN_PASSWORD` (or via OIDC admin groups), and local users should be managed dynamically via the Web UI (Configuration > Users).

- ⚠️ [API] Standardize REST API contract and error responses:
  - **Structured Error Payloads**: All error responses now consistently return `{ "error": "<ErrorType>", "message": "<Details>" }`. Custom scripts or integrations parsing legacy flat error strings (e.g. `{ "error": "Error description..." }`) need to be updated to read `message`.
  - **OpenAPI Schema Alignment**: Endpoints and payloads are now strictly aligned with the OpenAPI specification (`/api/openapi.yaml`).
  - **Authentication**: External REST API requests now use standard HTTP Basic Authentication (`basicAuth`). Direct cookie-based session authentication is no longer exposed as an external API authentication scheme.

- 🐛 [WATCHER] Fix docker watcher crashing on startup when `watchdigestdefault` is configured by restoring the property and passing it to registries (fixes #1150)
- 🐛 [REGISTRY] Fix Gitlab registry provider ignoring configuration defaults (fixes Gitlab registry integration)
- 🐛 [WATCHER] Fix docker watcher ignoring container labels when registry provider is unknown (fixes #1124)
- 🐛 [WATCHER] Fix tag listing exclusion for non-semver tags breaking digest updates when `wud.tag.include` is used (fixes #1164)
- 🐛 [WATCHER] Fix WUD_WATCHER_LOCAL_WATCHATSTART=false being ignored on empty store (fixes #1184)
- 🐛 [TAG] Fix tag comparison when coerced semver versions are equal by falling back to string comparison (fixes #1183)
- 🐛 [UI] Fix group by label in containers table (fixes #1182)
