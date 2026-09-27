#!/usr/bin/env bash
#
# Generate OpenHands file-based sub-agents from the WUD persona definitions.
#
# Single source of truth: .agents/personas/*.md. Those files stay portable and
# are ALSO consumed natively by Google Antigravity (via GEMINI.md).
#
# OpenHands needs two provider-specific frontmatter fields that must NOT live in
# the shared persona files, because their semantics differ across tools:
#   - tools : OpenHands tool names (terminal, file_editor, ...) whereas
#             Antigravity uses another namespace (run_command, view_file, ...)
#             and may hang on unknown tool names.
#   - model : an LLM profile name from the profile store, whereas Antigravity
#             expects a tier (inherit|flash|pro).
#
# This script emits the OpenHands-specific copies into .openhands/agents/ (which
# is git-ignored) so the shared personas remain unmodified.
#
# Usage: scripts/generate-openhands-agents.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PERSONAS_DIR="$REPO_ROOT/.agents/personas"
OUT_DIR="$REPO_ROOT/.openhands/agents"

# Persona -> LLM profile name (see .openhands/llm-profiles/).
declare -A MODEL=(
  [architect]="deepseek-v4-pro"
)
DEFAULT_MODEL="deepseek-v4.1-flash"

# Tools granted to every sub-agent (OpenHands tool names).
BASE_TOOLS=(terminal file_editor task_tracker)
# Extra tools for specific personas.
declare -A EXTRA_TOOLS=(
  [qa_tester]="browser_tool_set"
  [ux_designer]="browser_tool_set"
)

mkdir -p "$OUT_DIR"
rm -f "$OUT_DIR"/*.md

for persona_file in "$PERSONAS_DIR"/*.md; do
  [ -e "$persona_file" ] || continue
  name="$(basename "$persona_file" .md)"
  [ "$name" = "README" ] && continue

  model="${MODEL[$name]:-$DEFAULT_MODEL}"
  description="$(awk '/^description:/{sub(/^description:[[:space:]]*/, ""); print; exit}' "$persona_file")"
  body="$(awk '
    BEGIN { c = 0 }
    /^---[[:space:]]*$/ { c++; if (c == 1 || c == 2) next }
    c >= 2 { print }
  ' "$persona_file")"

  tools=("${BASE_TOOLS[@]}")
  if [ -n "${EXTRA_TOOLS[$name]:-}" ]; then
    tools+=("${EXTRA_TOOLS[$name]}")
  fi

  {
    echo "---"
    echo "name: ${name}"
    echo "description: $description"
    echo "tools:"
    for tool in "${tools[@]}"; do
      echo "  - $tool"
    done
    echo "model: $model"
    echo "---"
    echo
    printf '%s\n' "$body"
  } >"$OUT_DIR/$name.md"

  echo "generated .openhands/agents/$name.md (model=$model)"
done

echo "Generated $(find "$OUT_DIR" -maxdepth 1 -name '*.md' | wc -l) OpenHands sub-agent(s)."
