#!/usr/bin/env bash
# Stop local Vite (5173/5178) and API (3001) dev processes.
# Pair with VS Code task "Restart: client + server" to start fresh.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORTS=(3001 5173 5178)
for port in "${PORTS[@]}"; do
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    echo "Stopping process(es) on port ${port}: ${pids}"
    # shellcheck disable=SC2086
    kill ${pids} 2>/dev/null || true
  fi
done

pkill -f "tsx watch index.ts" 2>/dev/null || true

sleep 1
echo "Dev servers stopped (ports 3001, 5173, 5178)."
