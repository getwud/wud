---
name: issue_resolution
title: Issue Resolution Playbook
trigger: GitHub Issue or Bug Report
participants:
  - support_triage
  - pm (for feature request routing)
  - dev_fullstack
  - architect (conditional)
  - doc_specialist
  - qa_tester
---

# 🛠️ Issue Resolution Workflow

This playbook details the end-to-end lifecycle for handling incoming user bug reports and GitHub issues.

```mermaid
flowchart TD
    A[New GitHub Issue] --> B[support_triage: Silent Intake & Qualification]
    B -->|Missing Info| C[support_triage: 1 Concise Question for Manfred]
    B -->|User Error or Question| D[support_triage: Concise Direct Answer for Manfred]
    B -->|Feature Request| E[pm: Transition to New Feature Workflow]
    B -->|Confirmed Bug (Silent)| F{Architectural Impact?}
    F -->|Yes| G[architect: Technical RFC & Blueprint]
    F -->|No| H[dev_fullstack: Fix Branch & Unit Test]
    G --> H
    H --> I[dev_fullstack: Run Tests, Lint & Coverage Check]
    I --> J[dev_fullstack / doc_specialist: Doc & Changelog Review]
    J --> K[qa_tester: E2E Validation & gh pr checks --watch]
    K --> L[Open PR with Full Technical Context & Report CI Status]
    L --> M[Wait for Manfred's Merge Approval]
    M --> N[support_triage: Post Concise Closing Comment & Close Issue]
```

---

## Step 1: Intake & Qualification (`support_triage`)
1. **Fetch Issue Data**:
   ```bash
   gh issue view <issue-number> --comments
   ```
2. **Examine Context & Root Cause**:
   - Extract WUD version, container runtime (Docker, Podman, Kubernetes, Nomad), OS architecture, and configuration snippets.
   - Cross-reference logs with matching source code in `app/`.
3. **Qualification Decision**:
   - **Scenario A: User Configuration Error or Usage Question**
     - Draft a concise, human, direct explanation pointing to documentation and correct configuration syntax (max 2-3 sentences, zero AI corporate fluff).
     - Present draft to Manfred. Do NOT post to GitHub without approval.
   - **Scenario B: Feature Request Filed as an Issue**
     - **Route immediately to the Product Manager (`pm`)**: Hand off the issue to the [New Feature Playbook](new_feature.md) to assess value, roadmap fit, and architectural scope.
   - **Scenario C: Confirmed Bug (Silent Triage)**
     - **DO NOT comment on the issue**: Avoid noisy or robotic comments during investigation.
     - Identify root cause file and line numbers.
     - Document minimal reproduction steps for the PR.
     - Proceed to Step 2 (if architectural) or Step 3.
   - **Exception: Missing Critical Information**
     - If reproduction is impossible without missing logs or configuration, draft a **single, concise, targeted question** (e.g. *"Could you share your docker-compose labels?"*) for Manfred's approval.

---

## Step 2: Architectural Review (`architect`) — *Conditional*
- **Trigger**: The bug is caused by a fundamental protocol incompatibility, data storage limitation, or requires schema migration.
- **Action**: The architect (using an advanced reasoning model) defines a migration plan or interface refactoring guaranteeing strict backward compatibility before code changes are attempted.

---

## Step 3: Branch Creation & Implementation (`dev_fullstack`)
1. **Branch Preparation**:
   ```bash
   git checkout main && git pull origin main
   git checkout -b fix/<issue-number>_<short-description> origin/main
   ```
2. **Reproducing Test**:
   - Add a unit test in Jest (`app/**/*.test.ts`) that asserts the expected behavior and fails against the bug.
3. **Fix Implementation**:
   - Implement minimal, robust fix strictly addressing the root cause without side-effects.
   - Preserve backward compatibility (Joi schemas, environment variables, OpenAPI contracts, SQLite migrations).
4. **Validation & Coverage**:
   - Run tests and linter:
     ```bash
     cd app && npm test
     cd app && npm run lint
     ```
   - Verify that test coverage did not regress.
5. **Initial Documentation & Changelog Update**:
   - If configuration options were adjusted, update `website/docs/configuration/...`.

---

## Step 4: Quality & E2E Validation (`qa_tester`)
1. If the fix touches container watchers, triggers, or external registries, verify against local E2E suite:
   ```bash
   LOCAL_MODE=true ./scripts/run-e2e-tests.sh
   ```
2. If the fix touches the frontend SPA (`ui/`):
   ```bash
   cd ui && npm run test:unit
   cd ui && npm run lint
   ```

---

## Step 5: Pull Request & CI Gate
1. **Commit & Push**:
   - Author: User's configured Git author (never an AI/bot identity).
   - Message: `🐛 [COMPONENT] Fix description (fixes #<issue-number>)`
   - Push to origin: `git push -u origin fix/<issue-number>_<short-description>`
2. **Open PR (Detailed Context Hub)**:
   - **All technical explanations, root causes, and diff rationale belong on the PR**:
   ```bash
   gh pr create --title "🐛 [COMPONENT] Fix description (fixes #<issue-number>)" --body "$(cat <<'EOF'
   ## Problem
   Brief description of the bug and its root cause.

   ## Solution
   Explanation of the code changes and why this approach was chosen.

   ## Validation
   - Unit tests added / updated
   - Coverage maintained
   - Linters clean

   Fixes #<issue-number>
   EOF
   )"
   ```
3. **Mandatory CI Pipeline Monitoring**:
   - Monitor remote checks until 100% green:
     ```bash
     gh pr checks <pr-number> --watch
     ```
4. **Report to Manfred**:
   - Provide PR URL, root cause explanation, and confirmation of green CI checks.
   - **NEVER merge into `main` without Manfred's explicit authorization.**

---

## Step 6: Post-Merge Issue Closure (`support_triage`)
1. **Trigger**: Manfred has validated and merged the Pull Request into `main`.
2. **Action**:
   - Draft a minimal, human closing comment (1-2 sentences max, no corporate fluff):
     > *"Fix merged via #<pr-number>. It will be included in the next release. Thanks for reporting!"*
   - Once approved by Manfred, post the comment and close the issue:
     ```bash
     gh issue comment <issue-number> --body "Fix merged via #<pr-number>. It will be included in the next release. Thanks for reporting!"
     gh issue close <issue-number>
     ```
