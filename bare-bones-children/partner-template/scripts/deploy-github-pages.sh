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

# Promote the latest deploy-generated env into .env.local. Vite's `.env.local`
# is the only env file it auto-loads on every mode, so a stale .env.local from
# an old local-anvil run will bake the WRONG (local or empty) contract
# addresses into a staging/live bundle. The local-anvil deploy + the staging
# deploy both write a fresh .env.local.generated; promoting it here makes the
# gh-pages build self-healing regardless of which deploy ran most recently.
ENV_GENERATED="${PROJECT_DIR}/.env.local.generated"
ENV_LIVE="${PROJECT_DIR}/.env.local"
if [[ -f "$ENV_GENERATED" ]]; then
  if ! cmp -s "$ENV_GENERATED" "$ENV_LIVE" 2>/dev/null; then
    printf "→ Promoting .env.local.generated → .env.local (was stale or missing)\n"
    cp -f "$ENV_GENERATED" "$ENV_LIVE"
  fi
else
  printf "  WARN: %s not found — bundle may have stale VITE_*_ADDRESS values.\n" "$ENV_GENERATED" >&2
fi

printf "Building app from branch: %s (deployment target: %s)\n" "$CURRENT_BRANCH" "$DEPLOYMENT_TARGET"
# Route through the per-target build script (build:local / build:staging /
# build:live) so target-specific env vars like VITE_API_URL get applied.
# The previous `npm run build` ran the generic `tsc && vite build` and
# dropped VITE_API_URL on the floor — the deployed bundle ended up with
# the localhost fallback baked in.
npm run "build:${DEPLOYMENT_TARGET}"

if [[ ! -d "$DIST_DIR" ]]; then
  echo "Build failed: dist directory was not created."
  exit 1
fi

# Ensure local target branch is in sync with origin so the push at the end
# fast-forwards cleanly. Without this, deploys made from a clone that doesn't
# track gh-pages history (e.g. another machine, or after another deploy ran)
# get rejected with "fetch first".
if git ls-remote --exit-code --heads origin "$TARGET_BRANCH" >/dev/null 2>&1; then
  git fetch origin "$TARGET_BRANCH"
  git update-ref "refs/heads/${TARGET_BRANCH}" "refs/remotes/origin/${TARGET_BRANCH}"
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
