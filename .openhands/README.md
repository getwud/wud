# 🤖 OpenHands Integration for WUD

This directory contains configuration, micro-agents, and instructions for running [OpenHands](https://github.com/All-Hands-AI/OpenHands) (self-hosted or hosted) against the WUD repository.

---

## 🏗️ How it Works

OpenHands uses **Micro-Agents** to load contextual repo knowledge into the agent's prompt during task execution.

```text
.openhands/
├── README.md                 # OpenHands integration overview and setup instructions
└── microagents/
    └── repo.md               # Repository micro-agent automatically loaded by CodeActAgent
```

The repository microagent (`.openhands/microagents/repo.md`) injects:
1. **Core identity and commit rules** (Strict commit author: `Manfred Martin <16061231+fmartinou@users.noreply.github.com>`).
2. **Architecture guidelines** (Backend `app/`, Frontend `ui/`, E2E `e2e/`, Docs `website/`).
3. **The WUD Multi-Agent Personas and Workflows** located in [`.agents/`](../.agents/).

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
