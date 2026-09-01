# WUD (What's Up Docker?) — AI Agent Guidelines

Welcome, AI agent! This document is the single source of truth for working on the **WUD (What's Up Docker?)** repository. Follow these instructions, conventions, and workflows whenever you analyze, modify, or add code to this project.

---

## 🏗️ Project Architecture & Tech Stack

WUD is a modular monorepo structured as follows:

```text
wud/
├── app/          # Backend engine: Node.js (v24), Express, TypeScript, LokiJS, Dockerode, Bunyan, Joi
├── ui/           # Frontend SPA: Vue 3, Vuetify 3, TypeScript, Iconify (@iconify/vue)
├── e2e/          # Backend E2E API tests: Cucumber / Gherkin against live Docker containers
├── ui-e2e/       # Frontend UI E2E tests: Playwright
├── website/      # Documentation site: Docusaurus
├── scripts/      # Automation & test scripts (build-wud.sh, run-e2e-tests.sh, run-ui-tests.sh)
└── Dockerfile    # Multi-stage release build
```

### Key Subsystems (`app/`)
- **Watchers (`app/watchers/`)**: Scan container runtimes (e.g. Docker socket) for running containers.
- **Registries (`app/registries/`)**: Connect to container registries (Docker Hub, GitHub GHCR, Quay, ECR, etc.) to fetch tag/digest metadata. Inherit from Docker Registry v2 base classes where applicable.
- **Triggers (`app/triggers/`)**: Dispatch notifications or execute actions when updates are found (e.g., Apprise, Discord, Gotify, MQTT, Slack, Webhook, Docker Compose, etc.).
- **Validation (`Joi`)**: Every watcher, registry, trigger, and configuration option **must** define a Joi validation schema.
- **Storage (`app/store/`)**: In-memory document store using LokiJS.

---

## ⚡ Key Commands

### Backend (`app/`)
```bash
cd app
npm ci                 # Install dependencies
npm start              # Run development server with auto-reload (nodemon + ts-node + bunyan)
npm run build          # Compile TypeScript to dist/
npm test               # Run Jest unit tests with coverage
npm run lint           # Run ESLint
npm run lint:fix       # Auto-fix linting and Prettier formatting
```

### Frontend (`ui/`)
```bash
cd ui
npm ci                 # Install dependencies
npm run serve          # Start dev server with hot reload (proxies backend on :3000)
npm run build          # Build production SPA bundle to dist/
npm run test:unit      # Run unit tests with Jest
npm run test:unit:watch# Watch mode for unit tests
npm run lint           # Lint frontend code
```

### Backend E2E Tests (`e2e/`)
```bash
cd e2e
npm ci
npm run test:local     # Fast local run skipping @ci-only tests (public registries only)
# OR from root:
LOCAL_MODE=true ./scripts/run-e2e-tests.sh
```

### Frontend UI E2E Tests (`ui-e2e/`)
```bash
# Automated headless run (builds UI, starts containers, runs tests):
./scripts/run-ui-tests.sh

# Or directly:
cd ui-e2e
npm ci
npx playwright install # First time setup
npm test               # Run Playwright tests headless
```

### Documentation Website (`website/`)
```bash
cd website
npm ci
npm start              # Start local Docusaurus preview server
npm run build          # Build static documentation (must pass cleanly)
```

---

## 🌟 Golden Rules for AI Agents

Whenever implementing a feature or bugfix, **strictly adhere to the following workflow**:

### 1. Code Quality & Standards
- **Strict TypeScript**: Avoid `any` where possible; define explicit interfaces/types.
- **Validation**: When adding or updating watchers, registries, or triggers, provide or update the corresponding Joi validation schema.
- **Backward Compatibility**: Never break existing environment variables or configuration keys without an explicit deprecation path.
- **Dependencies**: Do NOT edit `package-lock.json` manually. Only install dependencies through `npm install` when strictly required.

### 2. Mandatory Tests
- **Backend Unit Tests**: Every change in `app/` must be covered by a corresponding `*.test.ts` file. Run `npm test` inside `app/` and ensure all tests pass.
- **Frontend Unit Tests**: Every UI change must be validated by component unit tests in `ui/tests/unit/`. Run `npm run test:unit` inside `ui/`.
- **E2E Tests**: If adding a new watcher, trigger, or registry, add or update Cucumber scenarios (`e2e/features/`) or Playwright tests (`ui-e2e/tests/`).

### 3. Linting and Formatting
- Always execute `npm run lint` (or `npm run lint:fix`) in the touched modules (`app`, `ui`, `e2e`) before submitting your changes.

### 4. Documentation
- If adding or changing configuration options, env vars, triggers, registries, or UI features:
  - Update the relevant markdown files in `website/docs/`.
  - Validate documentation build: `cd website && npm run build`.
  - Update `README.md` at root if it introduces high-level changes or new feature highlights.

### 5. Changelog Updates (`website/docs/changelog/next.md`)
- **Always** document your unreleased change in `website/docs/changelog/next.md`.
- Use the standard category emoji conventions:
  - 🚀 `Feature` / Enhancement (e.g. `- 🚀 [TRIGGER] Add new XYZ trigger`)
  - 🐛 `Bug Fix` (e.g. `- 🐛 [REGISTRY] Fix token refresh on 401`)
  - ⚠️ `Breaking / Deprecation` (e.g. `- ⚠️ [CONFIG] Deprecate WUD_OLD_VAR in favor of WUD_NEW_VAR`)
  - 🔧 `Maintenance / Refactoring / CI` (e.g. `- 🔧 [CI] Update action versions`)

---

## 🎯 PR Verification Checklist

Before finishing any task, check off the following:
- [ ] Backend unit tests pass: `cd app && npm test`
- [ ] Frontend unit tests pass (if UI touched): `cd ui && npm run test:unit`
- [ ] Code is linted without errors: `cd app && npm run lint` / `cd ui && npm run lint`
- [ ] Documentation updated in `website/docs/` and builds cleanly: `cd website && npm run build`
- [ ] `website/docs/changelog/next.md` updated with release entry
- [ ] Root `README.md` updated (if new trigger/watcher/feature added)
