#!/usr/bin/env bash
set -euo pipefail

TARGET_BRANCH="github-pages-release"
DEPLOYMENT_TARGET="local"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKTREE_DIR="${PROJECT_DIR}/.tmp-gh-pages-worktree"
DIST_DIR="${PROJECT_DIR}/dist"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --local|local)
      DEPLOYMENT_TARGET="local"
      shift
      ;;
    --staging|staging)
      DEPLOYMENT_TARGET="staging"
      shift
      ;;
    --live|live|--prod|prod)
      DEPLOYMENT_TARGET="live"
      shift
      ;;
    *)
      echo "Unknown argument: $1"
      echo "Usage: $0 [--local|--staging|--live]"
      exit 1
      ;;
  esac
done

cleanup() {
  if [[ -d "$WORKTREE_DIR" ]]; then
    git -C "$PROJECT_DIR" worktree remove "$WORKTREE_DIR" --force >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

cd "$PROJECT_DIR"

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

printf "Building app from branch: %s (deployment target: %s)\n" "$CURRENT_BRANCH" "$DEPLOYMENT_TARGET"
VITE_DEPLOYMENT_TARGET="$DEPLOYMENT_TARGET" npm run build

if [[ ! -d "$DIST_DIR" ]]; then
  echo "Build failed: dist directory was not created."
  exit 1
fi

# Ensure local target branch exists (from remote if needed, otherwise create)
if ! git show-ref --verify --quiet "refs/heads/${TARGET_BRANCH}"; then
  if git ls-remote --exit-code --heads origin "$TARGET_BRANCH" >/dev/null 2>&1; then
    git fetch origin "${TARGET_BRANCH}:${TARGET_BRANCH}"
  fi
fi

if git show-ref --verify --quiet "refs/heads/${TARGET_BRANCH}"; then
  git worktree add --force "$WORKTREE_DIR" "$TARGET_BRANCH" >/dev/null
else
  git worktree add --force -b "$TARGET_BRANCH" "$WORKTREE_DIR" >/dev/null
fi

# Remove previous contents from release branch worktree (except .git)
find "$WORKTREE_DIR" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +

# Copy fresh build output
cp -R "$DIST_DIR"/. "$WORKTREE_DIR"/
touch "$WORKTREE_DIR/.nojekyll"

# Custom domain — without this file, every deploy clears the GitHub Pages
# custom-domain setting and bear-bones.xyz stops resolving until you re-add
# it in the repo settings. Override via VITE_GH_PAGES_CNAME if you ever need
# a different domain (e.g. a separate staging domain).
GH_PAGES_CNAME="${VITE_GH_PAGES_CNAME:-bear-bones.xyz}"
printf "%s\n" "$GH_PAGES_CNAME" > "$WORKTREE_DIR/CNAME"

# Commit only if there are changes
if [[ -n "$(git -C "$WORKTREE_DIR" status --porcelain)" ]]; then
  git -C "$WORKTREE_DIR" add -A
  git -C "$WORKTREE_DIR" commit -m "gh-pages ${DEPLOYMENT_TARGET} deploy from ${CURRENT_BRANCH} @ ${TIMESTAMP}" >/dev/null
  git -C "$WORKTREE_DIR" push origin "$TARGET_BRANCH"
  printf "Deployed dist to branch: %s\n" "$TARGET_BRANCH"
else
  printf "No changes to deploy on branch: %s\n" "$TARGET_BRANCH"
fi

printf "Returned to branch: %s\n" "$CURRENT_BRANCH"
