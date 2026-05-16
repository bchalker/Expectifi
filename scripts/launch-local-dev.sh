#!/usr/bin/env bash
# Opens 3 Terminal windows: SSH MySQL tunnel -> API -> Vite.
#
# Automator "Run Shell Script" (plain straight quotes only):
#   /bin/bash "/Users/bryan/retirement-calculator/scripts/launch-local-dev.sh"
#
# Optional: ~/.retirement-calc-dev.env with DEV_SSH_CONFIG_HOST=your-ssh-config-Host
# See scripts/retirement-calc-dev.env.example
#
# Generated helper scripts go to ~/.retirement-calc-dev/ (overwritten each launch).

set -euo pipefail

if [[ -f "${HOME}/.retirement-calc-dev.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${HOME}/.retirement-calc-dev.env"
  set +a
fi

REPO="${RETIREMENT_CALC_HOME:-$HOME/retirement-calculator}"
SSH_PORT="${DEV_SSH_PORT:-2200}"
SSH_USER="${DEV_SSH_USER:-root}"
SSH_HOST="${DEV_SSH_HOST:-158.106.134.135}"
LOCAL_DB_PORT="${DEV_LOCAL_DB_PORT:-3307}"
CONFIG_HOST="${DEV_SSH_CONFIG_HOST:-}"

if [[ -n "$CONFIG_HOST" ]]; then
  TUNNEL_SLEEP="${DEV_SSH_TUNNEL_SLEEP:-2}"
else
  TUNNEL_SLEEP="${DEV_SSH_TUNNEL_SLEEP:-5}"
fi

if [[ ! -d "$REPO" ]]; then
  osascript -e 'display alert "Launch local dev" message "Folder not found. Set RETIREMENT_CALC_HOME."'
  exit 1
fi

# Escape single quotes for use inside single-quoted shell lines in generated scripts
sq_escape() {
  printf '%s' "$1" | sed "s/'/'\\\\''/g"
}
REPO_SQ=$(sq_escape "$REPO")
CH_SQ=$(sq_escape "$CONFIG_HOST")
UH_SQ=$(sq_escape "$SSH_USER")
HH_SQ=$(sq_escape "$SSH_HOST")

WORKDIR="${HOME}/.retirement-calc-dev"
mkdir -p "$WORKDIR"
T_SH="$WORKDIR/tunnel.sh"
S_SH="$WORKDIR/server.sh"
C_SH="$WORKDIR/client.sh"

if [[ -n "$CONFIG_HOST" ]]; then
  cat >"$T_SH" <<EOF
#!/bin/bash
set -e
cd '${REPO_SQ}'
printf '\n=== 1/3 MySQL tunnel - leave this window open ===\n'
exec ssh -L ${LOCAL_DB_PORT}:127.0.0.1:3306 '${CH_SQ}'
EOF
else
  cat >"$T_SH" <<EOF
#!/bin/bash
set -e
cd '${REPO_SQ}'
printf '\n=== 1/3 MySQL tunnel - leave this window open ===\n'
exec ssh -p ${SSH_PORT} -L ${LOCAL_DB_PORT}:127.0.0.1:3306 '${UH_SQ}'@'${HH_SQ}'
EOF
fi

cat >"$S_SH" <<EOF
#!/bin/bash
set -e
cd '${REPO_SQ}'
printf '\n=== 2/3 API (port 3001) ===\n'
exec npm run dev -w server
EOF

cat >"$C_SH" <<EOF
#!/bin/bash
set -e
cd '${REPO_SQ}'
printf '\n=== 3/3 Vite client ===\n'
exec npm run dev -w client
EOF

chmod +x "$T_SH" "$S_SH" "$C_SH"

osascript <<OSA
tell application "Terminal"
  activate
  do script "bash " & quoted form of "$T_SH"
end tell
OSA

sleep "${TUNNEL_SLEEP}"

osascript <<OSA
tell application "Terminal"
  do script "bash " & quoted form of "$S_SH"
end tell
OSA

sleep 1

osascript <<OSA
tell application "Terminal"
  do script "bash " & quoted form of "$C_SH"
end tell
OSA

osascript -e 'display notification "Tunnel + API + Vite (see Terminal)" with title "Retirement calculator dev"'
