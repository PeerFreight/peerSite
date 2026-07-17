# Aaron's Codex System

## Git Conventions

- Never add Codex, OpenAI, Claude, or Anthropic as a co-author on commits.
- After a code change is finished and verified, commit it with a concise message and push it to the tracked remote without waiting to be asked.
- Before committing, check `git status` and avoid bundling unrelated in-progress user changes. If the working tree already contained unrelated changes, leave those out or stop and explain the conflict.
- Do not force-push `main` or `master`.

## Engineering Rules

- Do not hard-code product, site, user, fixture, or one-off task-specific behavior to make an implementation or test pass. Model the general behavior and use representative fixtures.
- Tests should prove reusable contracts and failure modes, not encode the exact customer task as the target behavior. If a special-case integration is truly required, document why in code and in the commit or PR.

## Automation Mode

- The supported automation runner is direct desktop OpenAI Computer only: Peer sends live macOS screenshots to the backend, receives computer actions, and executes them through the native macOS action executor.
- Do not add hidden browser bootstraps, local Chrome setup, Playwright/browser harnesses, or browser-specific action suppression to the direct runner. App and browser opening should happen visibly through the same screenshot/action feedback loop until a separate isolation runner exists.

## Design Rules

- Onboarding and settings-style modals should avoid shadows, glow, blur halos, and decorative highlights unless explicitly requested.
