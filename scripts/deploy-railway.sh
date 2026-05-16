#!/usr/bin/env bash
# Commit (if needed), verify client build, push to GitHub → Railway auto-deploys.
#
# Usage:
#   deploy-railway.sh "Commit message"     # commit dirty tree + build + push main
#   deploy-railway.sh --push-only          # push existing commits only (fails if dirty)
#
# Secrets in server/.env and client/.env are never committed.

set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"

PUSH_ONLY=0
MSG=""

for arg in "$@"; do
  case "$arg" in
    --push-only) PUSH_ONLY=1 ;;
    -h | --help)
      sed -n '2,8p' "$0"
      exit 0
      ;;
    *)
      if [[ -z "$MSG" ]]; then
        MSG="$arg"
      fi
      ;;
  esac
done

DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
BRANCH="$(git branch --show-current 2>/dev/null || true)"

if [[ -z "$BRANCH" ]]; then
  echo "ERROR: Not on a git branch — cannot push."
  exit 1
fi

if [[ "$BRANCH" != "$DEPLOY_BRANCH" ]]; then
  echo "ERROR: You are on '$BRANCH'. Railway tracks '$DEPLOY_BRANCH'."
  echo "  git checkout $DEPLOY_BRANCH"
  exit 1
fi

block_env_commit() {
  if git diff --cached --name-only 2>/dev/null | grep -qE '(^|/)server/\.env$|(^|/)client/\.env$'; then
    echo "ERROR: Refusing to commit server/.env or client/.env — unstage those files first."
    exit 1
  fi
}

DIRTY="$(git status --porcelain)"
HAS_CHANGES=0
if [[ -n "$DIRTY" ]]; then
  HAS_CHANGES=1
fi

if [[ "$PUSH_ONLY" -eq 1 ]]; then
  if [[ "$HAS_CHANGES" -eq 1 ]]; then
    echo "ERROR: Uncommitted changes — Railway only deploys what is on GitHub."
    echo "  Use task: Deploy: commit, build check, push to Railway"
    echo ""
    git status --short
    exit 1
  fi
else
  if [[ "$HAS_CHANGES" -eq 1 ]]; then
    if [[ -z "${MSG//[[:space:]]/}" ]]; then
      MSG="Deploy $(date '+%Y-%m-%d %H:%M')"
      echo "No commit message — using: $MSG"
    fi

    echo "── Staging changes ──"
    git add -A
    git reset -- server/.env client/.env 2>/dev/null || true
    block_env_commit

    if [[ -z "$(git diff --cached --name-only)" ]]; then
      echo "Nothing to commit after staging (only ignored .env files?)."
    else
      echo ""
      echo "── Production build check (same as Railway Docker) ──"
      npm run build -w client

      echo ""
      echo "── Committing ──"
      git status --short
      git commit -m "$MSG"
      echo "Committed: $(git log -1 --oneline)"
    fi
  else
    echo "Working tree clean — pushing existing commits."
  fi
fi

echo ""
echo "── Fetching origin ──"
git fetch origin "$DEPLOY_BRANCH"

LOCAL_HEAD="$(git rev-parse HEAD)"
REMOTE_HEAD="$(git rev-parse "origin/$DEPLOY_BRANCH" 2>/dev/null || echo "")"

if [[ -n "$REMOTE_HEAD" && "$LOCAL_HEAD" == "$REMOTE_HEAD" ]]; then
  echo ""
  echo "WARNING: origin/$DEPLOY_BRANCH already at $(git rev-parse --short HEAD)."
  echo "  No new commits to push — Railway will NOT rebuild unless you redeploy in the dashboard."
  if [[ "$HAS_CHANGES" -eq 1 && "$PUSH_ONLY" -eq 0 ]]; then
    echo "  (Commit step may have been skipped — check status above.)"
  fi
  exit 1
fi

AHEAD="$(git rev-list --count "origin/$DEPLOY_BRANCH"..HEAD 2>/dev/null || echo 0)"
echo "Pushing $AHEAD commit(s) to origin/$DEPLOY_BRANCH …"
echo "  Local:  $(git log -1 --oneline)"

echo ""
echo "── git push origin $DEPLOY_BRANCH ──"
git push origin "$DEPLOY_BRANCH"

REMOTE_AFTER="$(git ls-remote origin "refs/heads/$DEPLOY_BRANCH" | awk '{print $1}')"
if [[ "$REMOTE_AFTER" != "$LOCAL_HEAD" ]]; then
  echo "ERROR: Push finished but origin/$DEPLOY_BRANCH does not match local HEAD."
  echo "  local:  $LOCAL_HEAD"
  echo "  remote: ${REMOTE_AFTER:-<missing>}"
  exit 1
fi

echo ""
echo "Done. GitHub has $(git rev-parse --short HEAD) — Railway should start a new deployment."
echo "  • Railway → retirement_calc_app → Deployments (wait for Success)"
echo "  • Hard-refresh https://eggspectifi.com (Cmd+Shift+R)"
echo "  • Health: https://eggspectifi.com/api/health"
