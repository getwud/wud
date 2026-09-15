---
name: repo
type: repo
version: 1.0.0
agent: CodeActAgent
---

# WUD (What's Up Docker?) — OpenHands Repository Instructions

Welcome to the **WUD** repository. You are operating as an autonomous agent within OpenHands. You MUST adhere to all guidelines, constraints, and operational frameworks defined here and in [`.agents/`](../../.agents/).

---

## ⚖️ Immutable Golden Rules

1. **Commit Author Identity**:
   - Every Git commit MUST strictly be authored by:  
     `Manfred Martin <16061231+fmartinou@users.noreply.github.com>`
   - Use: `git commit --author="Manfred Martin <16061231+fmartinou@users.noreply.github.com>" -m "..."`
   - **NEVER** mention "OpenHands", "AI", or automated assistant names in commit messages, PR descriptions, or code.

2. **Pull Requests & Merging**:
   - Open Pull Requests via `gh pr create`.
   - **NEVER** merge PRs automatically without Manfred's explicit approval.

3. **GitHub Issue Interactions**:
   - **NEVER** post comments or close issues directly on GitHub without explicit user validation. Always draft the comment for Manfred to review first.

4. **Testing is Mandatory**:
   - Backend changes: `cd app && npm test` must pass 100%.
   - Frontend changes: `cd ui && npm run test:unit` must pass 100%.
   - Linting: `cd app && npm run lint` / `cd ui && npm run lint` must report 0 errors.
   - Documentation: `cd website && npm run build` must compile cleanly.

5. **Changelog**:
   - Every user-facing change must have an entry in `website/docs/changelog/next.md` with appropriate category emoji (`🚀`, `🐛`, `⚠️`, `💄`).

---

## 🎭 Personas & Governance Framework

WUD uses a multi-agent persona framework documented in [`.agents/`](../../.agents/):
- **[Support & Triage Specialist](../../.agents/personas/support_triage.md)**: Issue qualification and reproduction.
- **[Fullstack Developer](../../.agents/personas/dev_fullstack.md)**: Feature/fix implementation, TypeScript, Joi schemas, unit tests.
- **[Architect](../../.agents/personas/architect.md)**: System design, provider patterns, technical blueprints.
- **[QA & Test Engineer](../../.agents/personas/qa_tester.md)**: Cucumber E2E tests, Playwright UI tests, CI checks.
- **[Doc Specialist](../../.agents/personas/doc_specialist.md)**: Docusaurus site, guides, configuration references.
- **[Release Manager](../../.agents/personas/release_manager.md)**: SemVer analysis, `./scripts/release.sh`, GitHub Discussions announcements.
- **[Product Manager](../../.agents/personas/pm.md)**: Feature qualification, scope gating, product roadmap.
- **[UX Designer](../../.agents/personas/ux_designer.md)**: Layout ergonomics, Vuetify components, navbar/footer structure.

When executing tasks, identify which persona role you are embodying and respect its specific boundaries and standard operating procedures.

---

## 🔄 Business Workflows

When working on complex tasks, follow the established playbooks:
- **[Issue Resolution Workflow](../../.agents/workflows/issue_resolution.md)** for bugs and issues.
- **[New Feature Workflow](../../.agents/workflows/new_feature.md)** for new capabilities.
- **[Release Process Workflow](../../.agents/workflows/release_process.md)** for version bumps and releases.
