#!/usr/bin/env bash
# Commit (if needed) and push to GitHub → Railway auto-deploys.
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

block_env_commit() {
  if git diff --cached --name-only 2>/dev/null | grep -qE '(^|/)server/\.env$|(^|/)client/\.env$'; then
    echo "Refusing to commit server/.env or client/.env — unstage those files first."
    exit 1
  fi
}

if [[ -n "$(git status --porcelain)" ]]; then
  if [[ -z "$MSG" ]]; then
    echo "You have uncommitted changes. Run the task again and enter a commit message."
    exit 1
  fi
  echo "Staging changes (excluding nothing — check status below)..."
  git add -A
  block_env_commit
  git commit -m "$MSG"
  echo "Committed."
else
  echo "Working tree clean — pushing existing commits only."
fi

echo ""
echo "Pushing to origin/$BRANCH …"
echo "Railway will build and deploy automatically."
echo ""
git push -u origin "$BRANCH"

echo ""
echo "Done. Open Railway → retirement_calc_app → Deployments to watch the build."
echo "Then check https://eggspectifi.com/api/health"
