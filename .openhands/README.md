# 🤖 OpenHands Integration for WUD

This directory contains configuration, micro-agents, and instructions for running [OpenHands](https://github.com/All-Hands-AI/OpenHands) (self-hosted or hosted) against the WUD repository.

---

## 🏗️ How it Works

OpenHands uses **Micro-Agents** to load contextual repo knowledge into the agent's prompt during task execution.

```text
.openhands/
├── README.md                 # OpenHands integration overview and setup instructions
├── microagents/
│   └── repo.md               # Repository micro-agent automatically loaded by CodeActAgent
├── agent-profiles/
│   └── default.json          # Base agent profile (enable_sub_agents: true)
├── llm-profiles/             # LLM profiles referenced by the sub-agents' `model:`
│   ├── deepseek-v4-pro.json
│   └── deepseek-v4.1-flash.json
└── agents/                   # GENERATED sub-agents (git-ignored) — do not edit
    └── *.md
```

The repository microagent (`.openhands/microagents/repo.md`) injects:
1. **Core identity and commit rules** (Strictly inherit user's configured Git author; never commit as AI/bot).
2. **Architecture guidelines** (Backend `app/`, Frontend `ui/`, E2E `e2e/`, Docs `website/`).
3. **The WUD Multi-Agent Personas and Workflows** located in [`.agents/`](../.agents/).

---

## 🧩 Persona sub-agents (generated)

The WUD personas have a **single source of truth**: [`.agents/personas/`](../.agents/personas/) (also consumed natively by Google Antigravity through [`GEMINI.md`](../GEMINI.md)).

OpenHands needs two provider-specific frontmatter fields that must **not** live in those shared files, because their semantics differ between tools:

- `tools` — OpenHands uses `terminal`, `file_editor`, ... while Antigravity uses `run_command`, `view_file`, ... (an unknown tool name may hang an Antigravity subagent).
- `model` — OpenHands expects an **LLM profile name**; Antigravity expects a **tier** (`inherit`, `flash`, `pro`).

They are therefore **generated** into the git-ignored `.openhands/agents/` directory:

```bash
scripts/install-agent-profiles.sh
```

That command also installs the LLM profiles and the default agent profile (`enable_sub_agents: true`) into the local server store (`~/.openhands/`), so a conversation can delegate to the personas through the `task` tool.

| Persona | Model profile |
| :-- | :-- |
| `architect` | `deepseek-v4-pro` |
| all other personas | `deepseek-v4.1-flash` |

The versioned LLM profiles contain **no credentials and no deployment-specific provider-connection id**. The install script binds your local provider connection (override with `OPENHANDS_PROVIDER_CONNECTION_ID`); if none is found, the profiles rely on the server/environment credentials.

This keeps Antigravity working unchanged (`.agents/personas/` is untouched) while giving OpenHands fully-tooled sub-agents, with no duplicated persona content.

---

## 🚀 Running OpenHands Locally (Self-Hosted)

To run OpenHands with Docker against your local clone of WUD:

```bash
docker run -it --rm \
    -e SANDBOX_USER_ID=$(id -u) \
    -e WORKSPACE_BASE=$(pwd) \
    -e LLM_API_KEY="your-llm-api-key" \
    -e LLM_MODEL="anthropic/claude-3-5-sonnet-20241022" \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v $(pwd):/workspace \
    -p 3000:3000 \
    --name openhands-app \
    ghcr.io/all-hands-ai/openhands:latest
```

Once running, navigate to `http://localhost:3000`. OpenHands will detect `.openhands/microagents/repo.md` and adhere to all project conventions.
