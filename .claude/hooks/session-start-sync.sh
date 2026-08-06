#!/usr/bin/env bash
# session-start-sync.sh
#
# Wired into .claude/settings.json as a SessionStart hook. Everything in this
# repo lands on `main`, and several workspaces (plus a second operator) push
# there, so a session should never start from a stale checkout.
#
# Runs on ANY branch, not just main: each Conductor workspace sits on its own
# throwaway local branch but still tracks main as its source of truth, so every
# workspace should start a session rebased onto the latest origin/main.
#
# Behavior:
# - Skip if not in a git repo.
# - Skip if uncommitted changes exist (operator handles them first).
# - Skip if origin is unreachable (offline OK).
# - Skip on detached HEAD (no branch to rebase).
# - Otherwise: git pull --rebase origin main.
# - On conflict: surface the failure and exit cleanly. Never auto-resolve,
#   never force-push.

set -uo pipefail

# Bound the git network legs so a stalled remote cannot sit here. The hard
# `timeout` on this hook in .claude/settings.json is the real backstop (it also
# covers a blackholed connection that never opens); these abort a connection that
# opens and then goes quiet.
export GIT_HTTP_LOW_SPEED_LIMIT=1000
export GIT_HTTP_LOW_SPEED_TIME=15

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[ -z "$repo_root" ] && exit 0
cd "$repo_root"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "session-start-sync: uncommitted changes; skipping auto-pull"
  exit 0
fi

if ! git ls-remote --exit-code origin >/dev/null 2>&1; then
  echo "session-start-sync: remote 'origin' unreachable; skipping"
  exit 0
fi

current_branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$current_branch" = "HEAD" ]; then
  echo "session-start-sync: detached HEAD; skipping"
  exit 0
fi

echo "session-start-sync: on '$current_branch'; pulling --rebase origin main"
if ! git pull --rebase origin main; then
  echo "session-start-sync: pull failed (likely conflict)"
  echo "Resolve manually: 'git rebase --continue' or 'git rebase --abort'"
  exit 0
fi

echo "session-start-sync: in sync with origin/main"
exit 0
