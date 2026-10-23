# Game Factory workflow v1

## Roles

- **Coordinator:** the main Codex session. It reads the approved design and technical plan, assigns bounded work, runs checks, evaluates review findings, tracks milestone state, and makes eligible local commits.
- **Implementer:** the native `implementer` subagent. It implements only the authorized scope, updates necessary tests, runs applicable checks, and reports results. It does not change approved design or commit.
- **Reviewer:** the native `reviewer` subagent. It independently inspects the specification, acceptance criteria, code, and tests after implementation. It reports evidence and a verdict without editing or committing.

The reviewer receives the relevant specification, criteria, changed files, and useful check results—not the implementer's internal reasoning. Both subagents share the workspace and sandbox in v1. The reviewer has an instruction not to edit, but no technical read-only barrier.

## Run an approved milestone

1. Confirm the user has authorized the milestone in an approved technical plan. Read the game's approved specification, plan, `AGENTS.md`, and any applicable directory instructions.
2. Confirm scope and acceptance criteria. Record the starting commit (`HEAD`) and full Git status, including staged, unstaged, and untracked changes. Identify the user's pre-existing work.
3. Delegate the bounded task to the native `implementer` agent and wait for it to finish. Do not pass it unresolved creative choices as permission to decide them.
4. Inspect the resulting diff and changed paths. Run the applicable tests and build, and check that the result satisfies the milestone criteria without unrelated changes.
5. Start a new, independent `reviewer` subagent after implementation. Provide the relevant specification, criteria, changed paths, and verification evidence. Wait for its report; assess each finding.
6. Ask the implementer to fix reproducible technical defects. Allow at most two correction cycles per milestone. After each correction, repeat the applicable checks and independent review.
7. Close and commit only when checks pass, review is complete with no blocking finding, the scope is intact, no creative decision remains unresolved, and any required human playtesting has already been approved and completed.
8. Continue only to another milestone already covered by the user's authorization.

Do not ask for confirmation between routine operations of an authorized milestone. Stop for unresolved creative decisions, scope expansion, an unauthorized dependency, persistent failures, blocking review findings, or required human playtesting that has not happened. Never start an unapproved milestone. If a condition cannot be verified, do not commit; record the blocker and current state.

## Automatic local commits

The coordinator owns commits. The implementer and reviewer never commit. A commit is allowed only after the milestone was approved, its changes remain within scope, required tests and build pass, the independent review is complete with no blocking findings, no creative decision is pending, required human playtesting is complete, and the verified diff contains no unrelated files.

Before implementation, record `HEAD` and the complete status. Preserve all pre-existing user changes. Stage only explicit authorized file paths; never use `git add -A` or `git add .`. If a target path already contains pre-existing edits, stage only the milestone's exact changes with patch staging; stop without committing if they cannot be separated safely. Then inspect `git diff --cached --check`, the staged path list, and every staged change. Exclude generated files, temporary files, and secrets. Use a descriptive commit message that names the project and milestone. Do not push, hard reset, run `clean -fd`, perform destructive rebases, or amend someone else's commit. Respect any approval required by the execution environment.

Explicit path staging keeps untracked `experiments/` out of a factory commit. If Git state or any other condition is uncertain, leave the work uncommitted.

## Record and resume milestone state

Keep durable progress in the approved technical plan and, where useful, the project's existing validation or progress report. Record each milestone's status, scope, changed paths, checks and outcomes, reviewer verdict and findings, correction cycles, blockers or playtesting status, and commit hash. Do not create a parallel tracking system for routine work. On a new session, read those records and Git history/status, confirm the approved plan and current milestone, then resume only work already authorized. If repository state conflicts with the record, inspect and resolve the discrepancy before continuing.

## Start a new project

Start from the new project's approved game specification and approved technical milestone plan. Check that both define the gameplay scope and acceptance criteria before delegating implementation. Use the repository's existing project/template process when authorized; do not migrate or modify another project as part of setup. Track the new project's milestone status in its plan, and execute only approved milestones through this workflow.

## Post-closure iterations (v1.1)

Use this procedure for a designer's change request after the prototype's original milestones have been closed. It supports successive iterations without reopening or rewriting the original milestones.

1. **Turn the request into a change brief.** Record the current behavior, desired behavior, change type, scope, verifiable acceptance criteria, constraints, and whether human playtesting is needed. Keep the brief short when the request is simple; clarify only details needed to define the authorized change.
2. **Classify the size proportionally.** Treat the request as a small correction, a UX/presentation improvement, or a large functionality change. Small changes do not need a new milestone plan. Add planning detail, including milestones when useful, only when the scope and dependencies justify it.
3. **Resolve authorization.** Identify creative decisions (including changes to game rules, content, balance, or player-facing behavior) and obtain the designer's explicit approval for them before implementation. Technical choices within the approved scope may be assigned by the coordinator; they do not authorize a creative change or scope expansion. If the request does not resolve a material creative choice, pause the affected work and ask the designer.
4. **Execute through the existing roles.** The coordinator confirms the brief and scope, records the starting `HEAD` and full Git status, and identifies pre-existing changes. Delegate only the authorized implementation to the native `implementer`; inspect the diff and run applicable tests, regression checks, and build. Then request an independent review from the native `reviewer`, with the relevant brief, criteria, changed paths, and check results, but not the implementer's internal reasoning. Apply the existing correction-cycle limit and repeat affected checks and review after corrections. Do not change approved specifications or unrelated files.
5. **Validate the experience when needed.** Require and record human playtesting before closing and committing a change when it directly affects gameplay experience or controls and hands-on evaluation is necessary. Do not require playtesting for purely internal changes; use appropriate automated or technical checks instead. Tests and review do not substitute for required human playtesting.
6. **Record and close the iteration.** Add a distinct post-closure iterations section to the corresponding game's existing implementation plan. Record the brief or summary, approval, scope, changed paths, checks and outcomes, review findings, any required playtesting, and closure or blocker status. Keep the original milestone records intact. Use a separate tracking record only if the existing plan can no longer reasonably hold the iteration history. Apply the existing local commit policy: commit only eligible, in-scope changes after required checks, independent review, and playtesting are complete; stage explicit paths, preserve pre-existing work, and never push automatically.

Once an iteration is closed, another request can follow this procedure as a new iteration; it does not require reopening the original plan or milestones.

## Known limitations

- The reviewer is asked not to edit, but v1 does not technically enforce read-only access. Subagents share the workspace and sandbox.
- Custom agent profiles may require a fresh Codex session to load. If the `implementer` or `reviewer` role is not available, do not pretend it ran; report the limitation and resume with the configured agent in a new session.
- Human playtesting remains a human decision and cannot be replaced by tests or code review.
