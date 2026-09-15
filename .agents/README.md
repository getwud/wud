# 🤖 WUD Multi-Agent System & Governance

Welcome to the **WUD Multi-Agent Operating Framework**. This directory defines the specialization personas, operational boundaries, and business workflows for autonomous AI agents collaborating on the WUD (What's Up Docker?) project.

This architecture is designed to be **portable and future-proof**, operating seamlessly across agent orchestration platforms including **OpenHands** (self-hosted), **Google Antigravity**, and other LLM agent runtimes.

---

## 🏛️ System Architecture

```text
.agents/
├── README.md               # Framework overview, governance, and routing rules
├── personas/               # Specialized agent role definitions & permissions
│   ├── support_triage.md   # Issue triage, reproduction, user communication
│   ├── dev_fullstack.md    # TypeScript backend/frontend, unit tests, Joi schemas
│   ├── architect.md        # System design, provider patterns, architectural RFCs
│   ├── qa_tester.md        # E2E test suites (Cucumber, Playwright), CI monitoring
│   ├── doc_specialist.md   # Docusaurus, documentation standards, changelog
│   ├── release_manager.md  # SemVer analysis, release automation, announcements
│   ├── pm.md               # Product roadmap, feature prioritization, scope boundaries
│   └── ux_designer.md      # UI/UX consistency, Vuetify components, ergonomics
│
└── workflows/              # Step-by-step orchestration playbooks
    ├── issue_resolution.md # GitHub issue -> Triage -> Dev -> QA -> PR
    ├── new_feature.md      # Feature request -> PM -> Architect -> Dev -> QA -> PR
    └── release_process.md  # Release -> SemVer check -> release.sh -> CI -> Announcement
```

---

## 👥 Personas Overview

| Persona | Primary Focus | Key Responsibilities | Allowed Scope |
| :--- | :--- | :--- | :--- |
| [**Support & Triage**](personas/support_triage.md) | Issues & Bug Qualification | Reproduce bugs, diagnose root causes, draft user answers | Read-only codebase, GitHub issues |
| [**Architect**](personas/architect.md) | Technical Architecture | Provider design, core abstraction, technical implementation plans | Architecture specs, reviews |
| [**Fullstack Dev**](personas/dev_fullstack.md) | Implementation | Backend (`app/`), UI (`ui/`), unit tests, Joi validation | Feature/fix branches, unit tests |
| [**QA & Tester**](personas/qa_tester.md) | Quality & E2E Testing | Cucumber API tests (`e2e/`), Playwright (`ui-e2e/`), CI triage | E2E test files, test scripts, CI logs |
| [**Doc Specialist**](personas/doc_specialist.md) | Documentation & Clarity | Docusaurus site (`website/`), guides, changelog | `website/docs/`, markdown files |
| [**Release Manager**](personas/release_manager.md) | Releases & Versioning | SemVer auditing, release execution (`release.sh`), post-release announcements | Release scripts, versions, changelogs |
| [**Product Manager**](personas/pm.md) | Product Roadmap & Scope | Triage feature requests, guard WUD core vision, scope control | Roadmap specs, triage matrix |
| [**UX Designer**](personas/ux_designer.md) | Interface & Usability | Topbar/footer layout, responsive design, Vuetify components | UI styling, layouts, components |

---

## 🔄 Orchestration Workflows

The main orchestrating agent delegates tasks sequentially to specialized personas based on the trigger:

1. **[Issue Resolution Workflow](workflows/issue_resolution.md)**  
   *Trigger*: An incoming GitHub issue or bug report.  
   *Flow*: Support Triage (reproduce & qualify) ➔ Fullstack Dev (branch, code fix & unit test) ➔ QA Tester (CI validation & E2E) ➔ Pull Request.

2. **[New Feature Workflow](workflows/new_feature.md)**  
   *Trigger*: A user feature request or roadmap item.  
   *Flow*: Product Manager (scope alignment) ➔ Architect (technical plan & interfaces) ➔ Fullstack Dev (implementation) ➔ Doc Specialist (docs) ➔ QA Tester (E2E) ➔ Pull Request.

3. **[Release Process Workflow](workflows/release_process.md)**  
   *Trigger*: Preparing a new public release.  
   *Flow*: Release Manager (SemVer analysis & highlights) ➔ User validation ➔ `release.sh` execution ➔ CI build & publish ➔ Announcement in GitHub Discussions.

---

## ⚖️ Immutable Golden Rules (All Agents Must Follow)

1. **Commit Author Strict Identity**  
   Every Git commit must strictly be authored by:  
   `Manfred Martin <16061231+fmartinou@users.noreply.github.com>`.  
   **NEVER** mention "AI", "Antigravity", "OpenHands", or LLM assistant names in commits, PR descriptions, or documentation.

2. **No Automatic Merge**  
   **NEVER** merge Pull Requests into `main` automatically without Manfred's explicit approval. Always report the status of CI checks and wait for user validation.

3. **No Direct Unapproved GitHub Comments**  
   Never post comments or close GitHub issues directly without prior review and consent from Manfred.

4. **Strict Quality Gates**  
   - Backend unit tests (`cd app && npm test`) must pass cleanly.
   - Frontend unit tests (`cd ui && npm run test:unit`) must pass cleanly.
   - Linters (`npm run lint` / `npm run lint:docs`) must report 0 errors.
   - Static documentation (`cd website && npm run build`) must compile with exit code 0.
   - E2E tests (`./scripts/run-e2e-tests.sh` / `./scripts/run-ui-tests.sh`) must pass.

5. **Changelog Tracking**  
   Every user-facing change must be documented in `website/docs/changelog/next.md` with conventional emoji prefixes (`🚀`, `🐛`, `⚠️`, `💄`).
