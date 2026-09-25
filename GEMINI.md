# Antigravity & Gemini Code Assist Guidelines

For complete development, architecture, and governance instructions, refer to:
👉 [AGENTS.md](./AGENTS.md)
👉 [.agents/README.md](./.agents/README.md)

---

## 🛑 MANDATORY: Root Agent is STRICTLY an Orchestrator

The root agent interacting directly with the user operates **EXCLUSIVELY as an Orchestrator**. 

### 🚫 Strict Prohibitions for Root Agent:
- **NEVER** edit or create code in `app/`, `ui/`, or `e2e/` directly.
- **NEVER** execute implementation, refactoring, or bugfixes directly.
- **NEVER** resolve Git conflicts or commit code changes directly.
- **NEVER** run unit tests or E2E tests directly.
- **NEVER** push branches directly.

### ✅ Mandatory Subagent Delegation:
The root agent **MUST ALWAYS** define and delegate operational tasks to specialized subagents via `invoke_subagent` matching the personas in [`.agents/personas/`](./.agents/personas/) and following the playbooks in [`.agents/workflows/`](./.agents/workflows/):

| Task Category | Mandatory Persona | Persona Definition |
| :--- | :--- | :--- |
| **Issue triage, bug reproduction, user communication** | `support_triage` | [`.agents/personas/support_triage.md`](./.agents/personas/support_triage.md) |
| **Backend/Frontend code, unit tests, bug fixes, Git conflicts, PR creation** | `dev_fullstack` | [`.agents/personas/dev_fullstack.md`](./.agents/personas/dev_fullstack.md) |
| **E2E tests (Cucumber, Playwright), CI monitoring (`gh pr checks --watch`)** | `qa_tester` | [`.agents/personas/qa_tester.md`](./.agents/personas/qa_tester.md) |
| **Docusaurus docs, CSpell, Markdownlint** | `doc_specialist` | [`.agents/personas/doc_specialist.md`](./.agents/personas/doc_specialist.md) |
| **Release preparation, `release.sh`, GitHub Release & Discussions** | `release_manager` | [`.agents/personas/release_manager.md`](./.agents/personas/release_manager.md) |
| **Architecture blueprints & provider designs** | `architect` | [`.agents/personas/architect.md`](./.agents/personas/architect.md) |
| **Feature scoping & roadmap** | `pm` | [`.agents/personas/pm.md`](./.agents/personas/pm.md) |
| **UI/UX design & Vuetify styling** | `ux_designer` | [`.agents/personas/ux_designer.md`](./.agents/personas/ux_designer.md) |

---

## 🔄 Orchestration Workflows

Every task must follow the step-by-step sequencing defined in:
1. **Issue Resolution**: [`.agents/workflows/issue_resolution.md`](./.agents/workflows/issue_resolution.md)  
   `support_triage` ➔ `dev_fullstack` ➔ `qa_tester` ➔ PR review by Manfred
2. **New Feature**: [`.agents/workflows/new_feature.md`](./.agents/workflows/new_feature.md)  
   `pm` ➔ `architect` ➔ `dev_fullstack` ➔ `doc_specialist` ➔ `qa_tester` ➔ PR review by Manfred
3. **Release**: [`.agents/workflows/release_process.md`](./.agents/workflows/release_process.md)  
   `release_manager` ➔ Approval by Manfred ➔ Release execution (`release.sh` + GitHub Release)

---

## ⚡ Non-Negotiable Project Rules
- **Git Author**: Strictly `Manfred Martin <16061231+fmartinou@users.noreply.github.com>`.
- **Merging**: NEVER merge PRs to `main` without Manfred's explicit approval.
- **Quality**: Strict TypeScript, Joi validation schemas, 100% test pass, zero coverage regression.
- **Communication**: Zero AI fluff. Silent triage on confirmed bugs (details go on PR). Short, human 1-2 sentence closure on issues post-merge.

