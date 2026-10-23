# AI Game Factory

## Project purpose

This repository contains an AI-assisted factory for developing
3D browser game prototypes from approved design specifications.

The factory must be reusable across different game projects.

## Technology stack

- TypeScript
- React
- Three.js
- React Three Fiber
- Vite
- Additional libraries only when justified

## Development principles

1. Prioritize playable prototypes over polished products.
2. Follow approved game design specifications.
3. Do not invent or change core gameplay mechanics without approval.
4. Keep experimental ideas separate from approved requirements.
5. Prefer simple, maintainable and reusable solutions.
6. Avoid unnecessary dependencies and overengineering.
7. Explain significant technical decisions.

## Agent workflow

Before implementing a substantial task:

1. Read the relevant specifications.
2. Identify requirements and constraints.
3. Propose a concise implementation plan.
4. Wait for approval before making substantial changes.

During implementation:

1. Work in small, verifiable steps.
2. Run relevant tests and build checks.
3. Fix errors when possible.
4. Report changes, test results and remaining limitations.

## Approved technical milestones

When the user authorizes execution of a technical milestone from an approved plan, the coordinator (the main Codex session) must run the milestone workflow in `docs/factory/workflow-v1.md` automatically:

1. Read the applicable game specification, approved technical plan, and repository instructions.
2. Confirm the milestone scope and acceptance criteria. Record the starting Git `HEAD` and full status, including staged, unstaged, and untracked paths; identify pre-existing user changes before editing.
3. Delegate only the approved implementation scope to the native `implementer` subagent. The implementer may update code and necessary tests, but must not change approved specifications or commit.
4. Wait for the implementer to finish. Inspect its changes, run applicable tests and builds, and verify scope against the recorded baseline.
5. Start the native `reviewer` subagent only after implementation, in an independent context. Give it the relevant specification, acceptance criteria, and changed files; do not pass the implementer's internal reasoning. Wait for its report and classify each finding.
6. For reproducible technical defects, ask the implementer to correct them. Allow at most two correction cycles per milestone. After each cycle, repeat applicable checks and independent review.
7. If checks pass, the review has no blocking findings, scope is intact, and all other closure conditions in the commit policy are met, record the milestone outcome and create its local commit using the safe procedure below.
8. Continue to the next technical milestone only if it is already covered by the user's authorization.

For designer change requests after a prototype's original milestones are closed, apply the post-closure iteration procedure in `docs/factory/workflow-v1.md`.

Do not ask for conversational confirmation between routine operations of an already approved milestone. Stop and consult the user for unresolved creative decisions, scope expansion, an unauthorized new dependency, persistent failures, blocking review findings, or required human playtesting that has not yet occurred. Never execute an unapproved milestone. If any safety or commit condition cannot be verified, leave the changes uncommitted and report why.

## Local commit policy

The coordinator may create a local commit automatically only for a previously approved milestone or a post-closure iteration authorized under the procedure in `docs/factory/workflow-v1.md`, whose changes remain in scope, whose required tests and build pass, whose independent review is complete with no blocking findings, and which has no unresolved creative decision. If closure requires human playtesting, that playtesting must already be approved and completed. The coordinator must verify the complete diff and ensure it contains no unrelated files.

Before work, record `HEAD` and the complete Git status. Never include pre-existing user changes. Stage only explicit, authorized paths; never use indiscriminate `git add -A` or `git add .`. If pre-existing changes overlap a target path, separate the authorized work's exact changes with careful patch staging, or stop if they cannot be distinguished safely. Before committing, inspect `git diff --cached --check`, the staged path list, and the staged content; exclude generated files, temporary files, and secrets. Use a descriptive message naming the project and milestone or iteration. Do not push, reset hard, run `clean -fd`, perform destructive rebases, or amend another commit. Respect execution-environment approval requirements. If any condition is uncertain, do not commit.

## Important restrictions

- Do not modify approved design specifications without permission.
- Do not implement features marked as experimental or deferred.
- Do not introduce major architectural changes without approval.
- Never assume a task is complete solely because code was written.

## Current project

The first prototype is a card-based RPG.

Its approved functional specification is located at:

docs/rpg-cartas-prototype-spec-v0.2.md

Treat this document as the source of truth for gameplay requirements.
