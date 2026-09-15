---
name: repo
type: repo
version: 1.1.0
agent: CodeActAgent
---

# WUD (What's Up Docker?) — OpenHands Repository Instructions

Welcome to the **WUD** repository. You are operating as an autonomous agent within OpenHands. You MUST adhere to all guidelines, constraints, and operational frameworks defined here and in [`.agents/`](../../.agents/).

---

## ⚖️ Immutable Golden Rules

1. **Commit Author Identity & Fork Portability**:
   - Commits must use the human developer's configured Git author (`git config user.name` and `git config user.email`).
   - In Manfred's environment, this resolves to:  
     `Manfred Martin <16061231+fmartinou@users.noreply.github.com>`
   - On forks or external contributor setups, adopt the local user's Git author.
   - **NEVER** attribute commits to "OpenHands", "AI", or automated bot names in commit messages, PR descriptions, or code.

2. **Branching & Pull Requests**:
   - Always create dedicated feature or fix branches (`feat/*`, `fix/*`).
   - Open Pull Requests via `gh pr create`.
   - **NEVER** push directly to `main` or create Git tags (strictly reserved for the Release Manager upon explicit user approval).
   - **NEVER** merge PRs automatically without Manfred's explicit approval.

3. **Mandatory CI Pipeline Monitoring**:
   - Never declare a task completed without watching GitHub Actions CI checks until all jobs pass green:  
     `gh pr checks <PR> --watch`

4. **Testing & Backward Compatibility are Mandatory**:
   - Backend unit tests (`cd app && npm test`): 100% pass, **zero coverage regression**.
   - Frontend unit tests (`cd ui && npm run test:unit`): 100% pass.
   - Initial E2E tests written for new watchers, registries, or triggers.
   - Strict backward compatibility: never break existing environment variables, Joi schemas, OpenAPI specs, or SQLite migrations.
   - Documentation & Spell checking: `cd website && npm run build` and `npm run lint:docs` (CSpell + Markdownlint) must pass with 0 errors.

5. **Changelog Policy**:
   - Only user-facing product changes belong in `website/docs/changelog/next.md`. Internal tooling, developer scripts, and agent governance files MUST NOT be added to `next.md`.

---

## ⚡ Safe & Auto-Approved Commands

You may freely execute non-destructive build, test, and read-only inspection commands:
```bash
npm test
npm run test:unit
npm run test:local
npm run lint
npm run lint:fix
npm run build
npm run lint:docs
git status
git diff
git log
git branch
git checkout -b <branch> origin/main
gh pr view <number>
gh pr checks <number> --watch
gh run list
gh run view <id>
```

---

## 🎭 Personas & Governance Framework

WUD uses a multi-agent persona framework documented in [`.agents/`](../../.agents/):
- **[Support & Triage Specialist](../../.agents/personas/support_triage.md)**: Issue qualification and reproduction.
- **[Fullstack Developer](../../.agents/personas/dev_fullstack.md)**: Implementation, TypeScript, Joi schemas, unit tests (no coverage regression), first-pass docs.
- **[Architect](../../.agents/personas/architect.md)**: System design, provider patterns, blueprints (*strictly requires high-reasoning model*).
- **[QA & Test Engineer](../../.agents/personas/qa_tester.md)**: E2E test audit, Playwright UI tests, CI pipeline monitoring (`--watch`).
- **[Doc Specialist](../../.agents/personas/doc_specialist.md)**: Docusaurus site, CSpell glossary, Markdownlint, developer doc polishing.
- **[Release Manager](../../.agents/personas/release_manager.md)**: SemVer analysis, `./scripts/release.sh`, exclusive authority for tags and `main` branch pushes.
- **[Product Manager](../../.agents/personas/pm.md)**: Feature qualification, scope gating, product roadmap.
- **[UX Designer](../../.agents/personas/ux_designer.md)**: Layout ergonomics, Vuetify components, navbar/footer structure.

When executing tasks, identify which persona role you are embodying and respect its specific boundaries and standard operating procedures.

---

## 🔄 Business Workflows

When working on complex tasks, follow the established playbooks:
- **[Issue Resolution Workflow](../../.agents/workflows/issue_resolution.md)** for bugs and issues (routes feature requests to PM).
- **[New Feature Workflow](../../.agents/workflows/new_feature.md)** for new capabilities.
- **[Release Process Workflow](../../.agents/workflows/release_process.md)** for version bumps and releases.
