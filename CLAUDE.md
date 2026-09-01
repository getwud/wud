# Claude Code Instructions

Please refer to the single source of truth:
👉 [AGENTS.md](./AGENTS.md)

### Quick Cheatsheet

- **Architecture**:
  - `app/` : Backend (TypeScript, Express, LokiJS, Dockerode, Joi)
  - `ui/` : Frontend (Vue 3, Vuetify 3, TypeScript)
  - `website/` : Docs (Docusaurus)
  - `e2e/` & `ui-e2e/` : Cucumber & Playwright E2E tests

- **Essential Commands**:
  - Backend tests: `cd app && npm test`
  - Backend lint: `cd app && npm run lint`
  - Frontend tests: `cd ui && npm run test:unit`
  - Frontend lint: `cd ui && npm run lint`
  - Local E2E: `cd e2e && npm run test:local`
  - Website build: `cd website && npm run build`

- **Mandatory Rules**:
  - Always write/update unit tests for any code changes.
  - Always update documentation in `website/docs/` if config/features change.
  - Always update `website/docs/changelog/next.md` with your change.
  - Run linters before finishing.
