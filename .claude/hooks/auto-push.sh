#!/usr/bin/env bash
# auto-push.sh
#
# Wired into .claude/settings.json as a PostToolUse (Bash) hook AND a Stop hook.
# Ensures local commits actually reach origin/main instead of sitting unpushed.
# Runs on ANY branch: each Conductor workspace lives on its own throwaway local
# branch (a git worktree rule — one branch cannot be checked out twice), and
# every one of them must still land on main. Because parallel workspaces all
# push to `main`, a workspace often falls behind and a plain push is rejected,
# leaving commits stuck locally. So when there is anything to push, this rebases
# onto origin/main first (autostashing any uncommitted work), then pushes HEAD to
# main explicitly, so no origin/<branch> is ever created. A genuine conflict is
# left for the agent to finish. Never force-push, never --no-verify.
#
# It deliberately does NOT `git add -A` and commit for you, unlike the sibling
# hook in the PeerFreight docs repo. `main` here has Vercel deployments enabled
# (vercel.json), so every push to main ships the live site — an autosave of the
# working tree at the end of every message would deploy half-finished edits.
# The gate stays where AGENTS.md puts it: the agent commits a finished, verified
# change, and this hook guarantees that commit reaches main immediately. An
# uncommitted tree is reported so nothing is silently left behind.

set -uo pipefail

# Discard any stdin payload the harness pipes in.
[ -t 0 ] || cat >/dev/null

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[ -z "$repo_root" ] && exit 0
cd "$repo_root"

# Detached HEAD has no branch to rebase; leave it alone.
[ "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)" = "HEAD" ] && exit 0

# Surface — but never auto-commit — pending working-tree changes.
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  echo "auto-push: uncommitted changes present; commit them so they reach main"
fi

# Fast path: nothing to push relative to our last-known origin/main. Cheap; runs
# on every Bash call.
[ -z "$(git rev-list origin/main..HEAD 2>/dev/null)" ] && exit 0

# There are local commits to push. Require a reachable origin.
if ! git ls-remote --exit-code origin >/dev/null 2>&1; then
  echo "auto-push: origin unreachable; skipping"
  exit 0
fi

git fetch origin main >/dev/null 2>&1 || true

# If origin moved ahead, rebase onto it (autostashing uncommitted work). Leave a
# real conflict for manual resolution rather than guessing.
if [ -n "$(git rev-list HEAD..origin/main 2>/dev/null)" ]; then
  if ! git -c rebase.autoStash=true rebase origin/main >/dev/null 2>&1; then
    git rebase --abort >/dev/null 2>&1 || true
    echo "auto-push: rebase onto origin/main hit a conflict; resolve it, then push"
    exit 0
  fi
fi

# Our commit may already be on origin after the rebase.
[ -z "$(git rev-list origin/main..HEAD 2>/dev/null)" ] && exit 0

if git push origin HEAD:refs/heads/main >/dev/null 2>&1; then
  echo "auto-push: pushed to origin/main"
else
  echo "auto-push: push failed after rebase; resolve manually"
fi
exit 0
