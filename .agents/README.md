# 🤖 WUD Multi-Agent System & Governance

Welcome to the **WUD Multi-Agent Operating Framework**. This directory defines the specialization personas, operational boundaries, and business workflows for autonomous AI agents collaborating on the WUD (What's Up Docker?) project.

This architecture is designed to be **portable and future-proof**, operating seamlessly across agent orchestration platforms including **OpenHands** (self-hosted), **Google Antigravity**, and other LLM agent runtimes.

---

## 🏛️ System Architecture

```text
.agents/
├── README.md               # Framework overview, governance, safe commands, and routing rules
├── personas/               # Specialized agent role definitions & permissions
│   ├── support_triage.md   # Issue triage, reproduction, user communication
│   ├── dev_fullstack.md    # TypeScript backend/frontend, unit tests, coverage, Joi, backward compatibility
│   ├── architect.md        # System design, provider patterns, blueprints (requires reasoning model)
│   ├── qa_tester.md        # E2E test suites (Cucumber, Playwright), CI monitoring (--watch)
│   ├── doc_specialist.md   # Docusaurus, CSpell glossary, Markdownlint, dev doc review
│   ├── release_manager.md  # SemVer analysis, release.sh, exclusive main/tag push authority
│   ├── pm.md               # Product roadmap, feature prioritization, scope boundaries
│   └── ux_designer.md      # UI/UX consistency, Vuetify components, ergonomics
│
└── workflows/              # Step-by-step orchestration playbooks
    ├── issue_resolution.md # GitHub issue -> Triage (bug vs feature) -> Dev -> QA -> PR
    ├── new_feature.md      # Feature request -> PM -> Architect -> Dev -> Docs -> QA -> PR
    └── release_process.md  # Release -> SemVer check -> release.sh -> CI -> Announcement
```

---

## 👥 Personas Overview

| Persona | Primary Focus | Key Responsibilities | Allowed Scope |
| :--- | :--- | :--- | :--- |
| [**Support & Triage**](personas/support_triage.md) | Issues & Bug Qualification | Reproduce bugs, diagnose root causes, draft user answers | Read-only codebase, GitHub issues |
| [**Architect**](personas/architect.md) | Technical Architecture | Provider design, core abstraction, technical implementation plans *(requires high-reasoning model)* | Architecture specs, reviews |
| [**Fullstack Dev**](personas/dev_fullstack.md) | Implementation | Backend (`app/`), UI (`ui/`), unit tests, no coverage drop, Joi schemas, first-pass docs | Feature/fix branches, unit tests |
| [**QA & Tester**](personas/qa_tester.md) | Quality & E2E Testing | Audit E2E tests, CI checks monitoring (`gh pr checks --watch`), flakiness prevention | E2E test files, test scripts, CI logs |
| [**Doc Specialist**](personas/doc_specialist.md) | Documentation & Quality | Review dev docs, Docusaurus site (`website/`), CSpell dictionary, Markdownlint | `website/docs/`, markdown files |
| [**Release Manager**](personas/release_manager.md) | Releases & Versioning | SemVer auditing, release execution (`release.sh`), announcements, **exclusive main/tag rights** | Release scripts, versions, tags |
| [**Product Manager**](personas/pm.md) | Product Roadmap & Scope | Triage feature requests, guard WUD core vision, scope control | Roadmap specs, triage matrix |
| [**UX Designer**](personas/ux_designer.md) | Interface & Usability | Topbar/footer layout, responsive design, Vuetify components | UI styling, layouts, components |

---

## 🔄 Orchestration Workflows

The main orchestrating agent delegates tasks sequentially to specialized personas based on the trigger:

1. **[Issue Resolution Workflow](workflows/issue_resolution.md)**  
   *Trigger*: An incoming GitHub issue or bug report.  
   *Flow*: Support Triage (reproduce & qualify) ➔ If Feature Request: route to PM & New Feature flow; If Confirmed Bug: Fullstack Dev (branch, code fix & unit test) ➔ QA Tester (CI validation `gh pr checks --watch`) ➔ Pull Request.

2. **[New Feature Workflow](workflows/new_feature.md)**  
   *Trigger*: A user feature request or roadmap item.  
   *Flow*: Product Manager (scope alignment) ➔ Architect (reasoning blueprint & backward compatibility) ➔ Fullstack Dev (implementation, unit tests, first-pass docs) ➔ Doc Specialist (CSpell & Markdownlint) ➔ QA Tester (E2E audit & CI watch) ➔ Pull Request.

3. **[Release Process Workflow](workflows/release_process.md)**  
   *Trigger*: Preparing a new public release.  
   *Flow*: Release Manager (SemVer analysis & highlights) ➔ User validation ➔ `release.sh` execution ➔ Push main & tag ➔ CI build & publish ➔ Announcement in GitHub Discussions.

---

## ⚡ Safe & Auto-Approved Commands Whitelist

Agents are authorized to execute the following non-destructive commands without human confirmation:

```bash
# Testing & Code Quality
npm test
npm run test:unit
npm run test:local
npm run lint
npm run lint:fix
npm run build
npm run lint:docs

# Documentation & Spell-Checking
npx cspell "docs/**/*.md"
npx markdownlint-cli2 "docs/**/*.md"

# Git (Read-only & local branch operations)
git status
git diff
git log
git branch
git checkout -b <branch-name> origin/main

# GitHub CLI (Inspection only)
gh issue view <number>
gh pr view <number>
gh pr checks <number>
gh pr checks <number> --watch
gh run list
gh run view <id>
```

*Commands modifying remote repositories (`git push origin main`, `git tag`, `gh pr merge`, `gh issue comment`) strictly require explicit human validation.*

---

## ⚖️ Immutable Golden Rules (All Agents Must Follow)

1. **Commit Author Identity & Fork Portability**  
   - Every commit must use the human developer's configured Git author (`git config user.name` and `git config user.email`).
   - In Manfred's repository, this resolves to `Manfred Martin <16061231+fmartinou@users.noreply.github.com>`.
   - On forks and external developer environments, the agent adopts the local contributor's Git identity.
   - **NEVER** attribute commits to "AI", "Antigravity", "OpenHands", or bot names. Never mention AI assistants in commit logs or PR descriptions.

2. **Exclusive Authority for `main` and Git Tags**  
   - **Only the Release Manager** is authorized to push commits to `main` and create Git tags (and only upon explicit approval from the user).
   - All other personas (Dev, QA, Architect, Doc, etc.) work strictly on dedicated feature/fix branches.

3. **No Automatic Merge & Mandatory CI Watch**  
   - **NEVER** merge Pull Requests into `main` automatically without Manfred's explicit approval.
   - Agents must monitor remote CI checks (`gh pr checks <PR> --watch`) and ensure all GitHub Actions jobs pass green before declaring a task completed.

4. **No Direct Unapproved GitHub Comments**  
   - Never post comments or close GitHub issues directly without prior review and consent from Manfred.

5. **Strict Quality Gates & Backward Compatibility**  
   - **Backend unit tests** (`cd app && npm test`): 100% pass, zero coverage regression.
   - **Frontend unit tests** (`cd ui && npm run test:unit`): 100% pass.
   - **Linters & Formatters**: Zero errors (`npm run lint`, `npm run lint:docs`).
   - **Documentation**: CSpell and Markdownlint clean; static site compiles cleanly (`npm run build`).
   - **Backward Compatibility**: Never break existing environment variables, Joi schemas, OpenAPI REST contracts, or SQLite database migrations.
