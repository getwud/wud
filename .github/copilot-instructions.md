# GitHub Copilot Instructions

When working in this repository, follow the master instructions defined in [AGENTS.md](../AGENTS.md).

## Key Guidelines

1. **Architecture**:
   - `app/` (Backend): Node.js v24, Express, TypeScript, Dockerode, LokiJS, Bunyan, Joi.
   - `ui/` (Frontend): Vue 3, Vuetify 3, TypeScript, Iconify (`@iconify/vue`).
   - `e2e/` (Backend E2E): Cucumber / Gherkin test suite.
   - `ui-e2e/` (Frontend E2E): Playwright test suite.
   - `website/` (Documentation): Docusaurus site.

2. **Validation & Configuration**:
   - Always validate any configuration or user options with **Joi** schemas.
   - Preserve backward compatibility of existing configuration keys and environment variables.

3. **Mandatory Testing & Quality**:
   - Unit tests are mandatory for all backend and frontend additions (`app/` -> `npm test`, `ui/` -> `npm run test:unit`).
   - Run linter checks: `npm run lint` / `npm run lint:fix`.

4. **Documentation & Changelog**:
   - When modifying/adding features or settings, update `website/docs/` and verify with `cd website && npm run build`.
   - Always record unreleased changes in `website/docs/changelog/next.md`.
