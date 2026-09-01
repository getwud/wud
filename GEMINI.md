# Antigravity & Gemini Code Assist Guidelines

For complete development and architecture instructions, refer to the master guidelines:
👉 [AGENTS.md](./AGENTS.md)

## Summary of Rules
- **Backend (`app/`)**: Node.js v24, Express, TypeScript, LokiJS, Dockerode, Joi schemas required for validation. Tests: `npm test`. Lint: `npm run lint`.
- **Frontend (`ui/`)**: Vue 3, Vuetify 3, TypeScript. Tests: `npm run test:unit`. Lint: `npm run lint`.
- **E2E**: Backend Cucumber tests in `e2e/` (`npm run test:local`), UI Playwright tests in `ui-e2e/` (`./scripts/run-ui-tests.sh`).
- **Docs & Changelog**: Update `website/docs/` when configs change (`cd website && npm run build`), and append entry in `website/docs/changelog/next.md`.
- **Strict Quality**: Never bypass tests or break existing config compatibility.
