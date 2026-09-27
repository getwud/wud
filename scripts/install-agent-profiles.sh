#!/usr/bin/env bash
#
# Set up the WUD agent team for a local OpenHands server.
#
# Steps:
#   1. Generate the OpenHands sub-agents from the single source of truth
#      (.agents/personas/) into .openhands/agents/ (git-ignored).
#   2. Install the LLM (model) profiles into ~/.openhands/profiles/ so the
#      sub-agents' `model:` references resolve.
#   3. Install the default agent profile (enable_sub_agents: true) into
#      ~/.openhands/agent-profiles/ so conversations expose sub-agent delegation.
#
# The agent-server resolves these from its home store, not from the repository,
# so this script is what "links" the versioned configuration to the server.
#
# Usage: scripts/install-agent-profiles.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OH_HOME="${OPENHANDS_HOME:-$HOME/.openhands}"

echo "==> Generating OpenHands sub-agents from .agents/personas/"
"$REPO_ROOT/scripts/generate-openhands-agents.sh"

echo "==> Installing LLM profiles into $OH_HOME/profiles"
mkdir -p "$OH_HOME/profiles"

# The versioned profiles carry no credentials and no deployment-specific
# provider-connection id. Bind the local provider connection here.
# Override with OPENHANDS_PROVIDER_CONNECTION_ID, otherwise reuse the first
# connection declared in the local store (if any).
CONN_ID="${OPENHANDS_PROVIDER_CONNECTION_ID:-}"
CONN_FILE="$OH_HOME/provider-connections/provider_connections.json"
if [ -z "$CONN_ID" ] && [ -f "$CONN_FILE" ]; then
  CONN_ID="$(grep -oE '"id"[[:space:]]*:[[:space:]]*"[A-Za-z0-9._-]+"' "$CONN_FILE" | head -1 | sed -E 's/.*"([^"]+)"$/\1/')"
fi

if [ -n "$CONN_ID" ]; then
  echo "    binding provider connection: $CONN_ID"
else
  echo "    no provider connection found; profiles will rely on server/environment credentials"
fi

for template in "$REPO_ROOT"/.openhands/llm-profiles/*.json; do
  name="$(basename "$template")"
  awk -v id="$CONN_ID" '
    { print }
    !bound && id != "" && /^[[:space:]]*"model"[[:space:]]*:/ {
      print "  \"provider_connection_id\": \"" id "\","
      bound = 1
    }
  ' "$template" >"$OH_HOME/profiles/$name"
  echo "    installed profiles/$name"
done

echo "==> Installing agent profiles into $OH_HOME/agent-profiles"
mkdir -p "$OH_HOME/agent-profiles"
cp -v "$REPO_ROOT"/.openhands/agent-profiles/*.json "$OH_HOME/agent-profiles/"

echo "Done. Restart or start a new OpenHands conversation to pick up the profiles."
