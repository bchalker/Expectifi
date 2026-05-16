#!/usr/bin/env bash
# Commit (if needed), verify client build, push to GitHub → Railway auto-deploys.
# Usage: deploy-railway.sh "Your commit message"
# Secrets in server/.env and client/.env are never committed.

set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"

MSG="${1:-}"
BRANCH="$(git branch --show-current)"

if [[ -z "$BRANCH" ]]; then
  echo "Not on a git branch — cannot push."
  exit 1
fi

if [[ "$BRANCH" != "main" ]]; then
  echo "Warning: you are on '$BRANCH', not main. Railway usually tracks main."
fi

block_env_commit() {
  if git diff --cached --name-only 2>/dev/null | grep -qE '(^|/)server/\.env$|(^|/)client/\.env$'; then
    echo "Refusing to commit server/.env or client/.env — unstage those files first."
    exit 1
  fi
}

HAS_CHANGES=0
if [[ -n "$(git status --porcelain)" ]]; then
  HAS_CHANGES=1
fi

if [[ "$HAS_CHANGES" -eq 1 ]]; then
  if [[ -z "${MSG//[[:space:]]/}" ]]; then
    MSG="Deploy $(date '+%Y-%m-%d %H:%M')"
    echo "No commit message — using: $MSG"
  fi

  echo "── Staging changes ──"
  git add -A
  git reset -- server/.env client/.env 2>/dev/null || true
  block_env_commit

  echo ""
  echo "── Production build check (same as Railway Docker) ──"
  npm run build -w client

  echo ""
  echo "── Committing ──"
  git status --short
  git commit -m "$MSG"
  echo "Committed: $(git log -1 --oneline)"
else
  echo "Working tree clean — pushing existing commits only."
fi

echo ""
echo "── Pushing to origin/$BRANCH ──"
git push -u origin "$BRANCH"

echo ""
echo "Done. Railway will build from this push."
echo "  • Railway → retirement_calc_app → Deployments (wait for Success)"
echo "  • Then hard-refresh https://eggspectifi.com (Cmd+Shift+R)"
echo "  • Health: https://eggspectifi.com/api/health"
