# Game Factory workflow v1

Purpose: operative procedure for the Factory and its games. Documentation revised 2026-10-28; milestone, review and closure architecture retained.

## Roles

- **Coordinator:** the main Codex or Claude Code session. It reads the approved design and technical plan, assigns bounded work, runs checks, evaluates review findings, tracks milestone state, and makes eligible local commits.
- **Implementer:** the native `implementer` subagent. It implements only the authorized scope, updates necessary tests, runs applicable checks, and reports results. It does not change approved design or commit.
- **Reviewer:** the native `reviewer` subagent. It independently inspects the specification, acceptance criteria, code, and tests after implementation. It reports evidence and a verdict without editing or committing.

The reviewer receives the relevant specification, criteria, changed files, and useful check results—not the implementer's internal reasoning. Both subagents share the workspace and sandbox in v1. The reviewer has an instruction not to edit, but no technical read-only barrier.

## Run an approved milestone

1. Confirm the user has authorized the milestone in an approved technical plan. Identify the game from the task scope. Read its applicable `projects/<game>/docs/spec-vN.md`, `status.md`, `implementation-plan.md`, later authorized decisions, `AGENTS.md`, and any applicable directory instructions. A consolidated specification records prior authority; it does not grant new design approval.
2. Confirm scope and acceptance criteria. Record the starting commit (`HEAD`) and full Git status, including staged, unstaged, and untracked changes. Identify the user's pre-existing work.
3. Delegate the bounded task to the native `implementer` agent and wait for it to finish. Do not pass it unresolved creative choices as permission to decide them.
4. Inspect the resulting diff and changed paths. Run the applicable tests and build, and check that the result satisfies the milestone criteria without unrelated changes.
5. Start a new, independent `reviewer` subagent after implementation. Provide the relevant specification, criteria, changed paths, and verification evidence. Wait for its report; assess each finding.
6. Ask the implementer to fix reproducible technical defects. Allow at most two correction cycles per milestone. After each correction, repeat the applicable checks and independent review.
7. Close and commit only when checks pass, review is complete with no blocking finding, the scope is intact, no creative decision remains unresolved, and any required human playtesting has already been approved and completed.
8. Continue only to another milestone already covered by the user's authorization.

Do not ask for confirmation between routine operations of an authorized milestone. Stop for unresolved creative decisions, scope expansion, an unauthorized dependency, persistent failures, blocking review findings, or required human playtesting that has not happened. Never start an unapproved milestone. If a condition cannot be verified, do not commit; record the blocker and current state.

## Automatic local commits

The coordinator owns commits. The implementer and reviewer never commit. A commit is allowed only after the milestone or iteration was authorized, its changes remain within scope, required tests and build pass, the independent review is complete with no blocking findings, no other blocker or creative decision is pending, and any required human playtesting has been approved by the designer and completed. The verified diff must contain no unrelated files. An explicit instruction to deliver uncommitted changes takes precedence; leave the index and commits untouched when the task requires it.

Before implementation, record `HEAD` and the complete status. Preserve all pre-existing user changes. Before invoking the executor, reconfirm authorization and that required checks and review have passed, no blocker is pending, and required human playtesting has designer approval and is complete. The reviewed source is `.codex/tools/local-commit-executor.cjs`; install its reviewed copy at `%USERPROFILE%\.codex\bin\game-factory-commit.cjs`, outside the editable repository, and compare source and installed SHA-256 hashes. A repository edit alone must not alter the installed copy. Replace that copy only for an explicitly authorized correction after its checks and independent review pass, retaining the authorized location and verifying the new hashes before use. Respect environment permissions for installation. `.codex/rules/git.rules` authorizes only the absolute Node executable and installed helper; direct `git add` and `git commit` are not authorized.

Before the final independent review, run the preventive format check with the explicit authorized closure paths, including new files and tests: `node .codex/tools/commit-format-preflight.cjs --path relative/file --path another/file`. It checks tracked files against `HEAD` and checks new files as complete additions with Git's whitespace checks; it never stages, commits, changes Git configuration, or calls the executor. Preserve the recorded baseline: do not authorize a whole file or an EOF correction when it would include pre-existing user work; separate that work safely under the commit policy or stop. The default invocation only detects and reports. For an unequivocally mechanical extra EOF-blank suffix, the coordinator may inspect the exact file and add `--safe-eof relative/file SHA256`, using the SHA-256 of those reviewed bytes. This is a semantic-safety attestation, not a filename/extension rule: establish that the suffix is outside literals, fixtures, snapshots, embedded data or any meaningful content, and record that conclusion in the existing milestone record. Do not issue the attestation when safety is uncertain. It needs no additional conversational approval within an authorized milestone. The helper rejects stale attestations and only removes the extra blank suffix, retaining the final content-line terminator and all other bytes, including BOM and line endings. It does not fix other trailing spaces or Markdown hardbreaks. Review the resulting diff and repeat affected checks; an unresolved diagnostic names the file and Git's line/cause and prevents invoking the executor. A safe EOF correction may remain in the working tree if another formatting problem is unresolved; the index remains untouched. Immediately before the executor, repeat the same explicit path list without `--safe-eof` so the final preflight is read-only. A Git/process error must be reported and not treated as a clean check. This prevention supplements all existing closure gates; it does not authorize unrelated files, general formatting or bypasses. The preflight's safety/detection tests run with `node --test .codex/tools/commit-format-preflight.test.cjs`.

The executor accepts only a single-line commit message and individual repository-relative `--path` entries. Existing entries must be regular files through non-link directories. A missing entry is accepted as a deletion only when it exactly matches a regular file in `HEAD` and the stage-zero index with identical mode and object; missing parent directories are permitted, existing links or ambiguous prefixes are not. Unknown missing paths, directories, tracked symlinks/submodules, pathspecs, traversal, outside paths, unknown arguments and a pre-existing staged index are rejected. Classify the whole list and revalidate before staging. The preflight accepts the same explicit complete list, checks deletions through Git without reading absent files, and rejects `--safe-eof` for deletions.

It stages only those paths with literal pathspecs, verifies exact staged paths and expected deletion types, runs `git diff --cached --check`, and invokes only a normal `git commit -m` through process arguments without a shell. It then verifies committed paths and types with rename detection disabled. For a move, include both its old and new paths explicitly; do not stage a directory or depend on rename similarity. If a commit hook is configured, it stops before staging rather than disable or bypass the hook, since hooks can change the index. It does not amend or push. Tests, independent review, and required human playtesting remain workflow gates; the executor does not replace them. If any validation differs or Git reports an error such as `.git/index.lock` permission denial, stop without retrying or committing.

Each game is its own repository nested at `projects/<game>/` and ignored by the Factory repository. For game work, pass `--repo projects/<game>` to both the preflight and the executor; paths are then relative to that game's repository. Without `--repo` they target the Factory repository. A milestone that touches both commits each repository separately. The executor receives only the approved file paths, keeping unrelated and untracked paths out of a factory commit. If Git state or any other condition is uncertain, leave the work uncommitted.

## Record and resume milestone state

Keep durable progress in `projects/<game>/docs/implementation-plan.md` and, where useful, the project's existing validation or progress report. Record each milestone's status, scope, changed paths, checks and outcomes, reviewer verdict and findings, correction cycles, blockers or playtesting status, and commit hash. The live plan links to earlier plans and evidence in `history/`; consult them when needed without reopening superseded work or copying the full history. Do not create a parallel tracking system for routine work. On a new session, read those records and Git history/status, confirm the approved scope and current milestone, then resume only work already authorized. If repository state conflicts with the record, inspect and resolve the discrepancy before continuing.

## Token efficiency (v1.2)

Adopted 2026-11-07. These rules reduce repeated reading and writing without removing any role, check, review, playtesting or commit gate. They apply to every game and to both Codex and Claude Code. **Reduce evidence, never rules:** approved rules, invariants and open decisions stay in documents that are always read; only process evidence is archived.

### Game documents and layered reading

Each game keeps, in `projects/<game>/docs/`:

- `status.md` starting with a **continuity card** ([template](templates/status-card.md)): last closure, next milestone and its authorization, open decisions, active configuration, check commands and known incidents.
- `decisions.md` ([template](templates/decisions.md)): sources and precedence, invariants every change must preserve, approved decisions (implemented and future), open decisions and roadmap. It consolidates without reinterpreting; the source prevails on discrepancy.
- `spec-vN.md` and `implementation-plan.md` as before; the live plan stays compact (current state, closures table, links).

The Factory itself keeps a **Factory continuity card** at the top of `docs/factory/status.md`: last Factory change, game states, current limitations and a table of Factory pending items (proposed, deferred or authorized but unfinished). Every session reads it at start, together with the active game's card. **Before ending a session, record there every Factory proposal or follow-up that was not executed**, and remove items once closed. Chat history and tool-specific memory are not continuity sources.

Reading order for a new session or a delegated task: continuity card → `decisions.md` → applicable `spec-vN.md` → the code and tests affected. `history/` is consulted only for provenance or when a source is disputed. The coordinator gives subagents exact paths and sections instead of whole records. The spec and `decisions.md` are always read in full by the implementer and reviewer; they are the guard against breaking existing mechanics.

### Briefs and records

- Every milestone or iteration brief includes **"Mechanics and invariants to preserve"**: the existing rules the change touches or borders, referenced to `decisions.md`/spec. The coordinator writes it; implementer and reviewer check against it.
- Records use the compact [milestone template](templates/milestone-record.md): bullets, no narration of each step. Screenshots, logs, probe output and harnesses stay outside the repository; the record keeps only their path and result.
- Subagent reports are compact: changed paths, checks, findings, blockers. No restating of the brief.

### Archive on closure

When a milestone or iteration closes: (1) move every new or changed approved decision and open item into `decisions.md`, and verify none is lost; (2) leave a closure row and a 5–10 line summary in the live plan; (3) move detailed evidence to `history/` with a note of its original location. Step 1 must happen before step 3. Consolidation is not a new design approval.

### Proportional review

- **Full independent review** (as in the milestone procedure): every milestone, and any iteration that changes rules, engine logic, data, or player-facing behavior beyond a local presentation tweak.
- **Scoped review**: a correction cycle or small presentation fix limited to a few lines (for example a single CSS value). The reviewer still runs independently but only over the diff, the affected criterion and the checks; it does not re-audit the milestone. This counts toward the correction-cycle limit as before.
- Do not re-run unchanged suites or captures to re-document an unchanged result; cite the existing evidence. After any correction, still repeat every check the diff can affect, as the milestone procedure requires.

### Model routing

Use the strongest model only where judgment is the product.

| Work | Tier | Claude Code | Codex |
|---|---|---|---|
| Planning, milestone definition, creative/design analysis, UI/UX, visual and 3D design, architecture | Strong | `opus` | strong model, high reasoning |
| Implementation of a well-specified logic/engine milestone; independent review | Medium | `sonnet` (agent default) | medium model or reasoning |
| Implementation whose core is UI/UX, visual or 3D | Strong | implementer with `model: "opus"` | strong model |
| Tests, builds, preflight, Git inspection, commit executor, files from exact instructions | Small | `haiku` via `runner` | small model, low reasoning |

Each subagent starts cold: batch mechanical work into one call (for example tests + build + preflight, reporting failures only) and do not spawn an agent for a single short command. Agent profiles: `.claude/agents/` (Claude Code) and `.codex/agents/` (Codex).

### Tool parity

Command permissions exist in `.codex/rules/*.rules` and `.claude/settings.json`; skills are canonical in `.agents/skills/` with thin wrappers in `.claude/skills/`. A change to one permission set or profile must be mirrored in the other.

## Start a new project

Start from the new project's approved game specification and approved technical milestone plan. Check that both define the gameplay scope and acceptance criteria before delegating implementation. Use the repository's existing project/template process when authorized; do not migrate or modify another project as part of setup. Establish documentation in `projects/<game>/docs/` under the conventions below, including the continuity card and `decisions.md` from `docs/factory/templates/` (see Token efficiency); the generator provides the technical template and the game's own Git repository (initial commit), and does not automatically create these documents. Track milestone status in `implementation-plan.md`, and execute only approved milestones through this workflow.

## Post-closure iterations (v1.1)

Use this procedure for a designer's change request after the prototype's original milestones have been closed. It supports successive iterations without reopening or rewriting the original milestones.

1. **Turn the request into a change brief.** Record the current behavior, desired behavior, change type, scope, verifiable acceptance criteria, constraints, and whether human playtesting is needed. Keep the brief short when the request is simple; clarify only details needed to define the authorized change.
2. **Classify the size proportionally.** Treat the request as a small correction, a UX/presentation improvement, or a large functionality change. Small changes do not need a new milestone plan. Add planning detail, including milestones when useful, only when the scope and dependencies justify it.
3. **Resolve authorization.** Record authorization already present in the request, including delegated conventional presentation decisions. Obtain explicit approval for material unresolved choices about game rules, content, balance, player-facing behavior beyond the delegated UI scope or particular identity. Technical and delegated visual choices within scope do not require another approval and do not authorize gameplay changes or scope expansion. Pause only work dependent on an unresolved material choice; continue independent authorized work.
4. **Execute through the existing roles.** The coordinator confirms the brief and scope, records the starting `HEAD` and full Git status, and identifies pre-existing changes. Delegate only the authorized implementation to the native `implementer`; inspect the diff and run applicable tests, regression checks, and build. Then request an independent review from the native `reviewer`, with the relevant brief, criteria, changed paths, and check results, but not the implementer's internal reasoning. Apply the existing correction-cycle limit and repeat affected checks and review after corrections. Do not change approved specifications or unrelated files.
5. **Validate the experience when needed.** For iterations that affect visual presentation or interface behavior, inspect the rendered result with a compatible browser tool when available, following the [`game-ui-ux`](../../.agents/skills/game-ui-ux/SKILL.md) skill; record the observed result and evidence in the existing iteration report. If inspection cannot be performed, record the limitation and leave visual validation pending when appropriate. Require and record human playtesting before closing and committing a change when it directly affects gameplay experience or controls and hands-on evaluation is necessary. Do not require playtesting for purely internal changes; use appropriate automated or technical checks instead. Visual inspection, tests, and review do not substitute for required human playtesting.
6. **Record and close the iteration.** Add a distinct iteration entry to the corresponding game's `docs/implementation-plan.md`. Record the brief or summary, approval, scope, changed paths, checks and outcomes, review findings, any required playtesting, and closure or blocker status. Keep original milestone records intact in the plan or linked history. Use a separate iteration record only when scope or volume warrants it, retaining the link from the live plan. Update material state changes under the conventions below. Apply the existing local commit policy: commit only eligible, in-scope changes after required checks, independent review, and playtesting are complete; stage explicit paths, preserve pre-existing work, and never push automatically.

Once an iteration is closed, another request can follow this procedure as a new iteration; it does not require reopening the original plan or milestones.

### Technical prototype to playable demo

Recognize an explicitly requested integral visual transformation as the principal presentation intervention after a technical prototype becomes playable. It may replace provisional layout, components, navigation and appearance deeply while preserving approved gameplay. It uses the existing brief, implementer/reviewer roles, checks, correction limits, project records and closure/commit gates; no new agent or orchestration layer is needed.

Follow the four activities in [game-ui-ux](../../.agents/skills/game-ui-ux/SKILL.md): structural design, concrete graphic proposal with achievable visual references, functional implementation, and evaluation/refinement of the complete rendered result. Record the layout, art decisions/references, validation evidence and remaining limits in identifiable project files linked from the existing plan. When the designer has authorized the full work and delegated conventional visual decisions, advance across these activities without requesting intermediate aesthetic approvals.

Adapt the structure and visual direction to each game; do not make one project's design universal. Subsequent narrow graphical requests stay focused corrections unless another integral redesign is authorized. Unavailable image generation or browser inspection must be reported truthfully and handled with the skill's documented alternatives; absent rendered inspection remains a validation limitation. Required human playtesting remains a closure gate and does not prevent completing independent implementation and technical review.

## Documentation maintenance

- Keep transversal Factory documentation in `docs/factory/` and game-specific documentation in `projects/<game>/docs/`. Root `README.md` files present practical use and navigation. `overview.md` explains the Factory conceptually; `status.md` describes implemented capabilities, development state and limitations. `implementation-plan.md` is the game's stable planning, authorization and continuity record, with links to prior history.
- Use `spec-vN.md` for approved requirements of a defined scope, `design/<topic>-vN.md` for specific designs, and `validation-report-vN.md` for a particular validation. A significant scope revision warrants a new version; an editorial correction does not. Consolidating already approved decisions is not a new design approval. Create documents only for a distinct purpose; update the existing reference for ordinary maintenance. Do not create validation reports merely because files moved.
- Keep ordinary iteration entries in the live plan. A substantial independent iteration may use `iterations/YYYY-MM-DD-topic.md`, linked from the plan. Archive superseded documents in the relevant `history/`, preserving results, decisions, provenance and related resources together. Summarize still-applicable information in current references and link its historical authority; do not turn old unchecked boxes into current work when later closure resolves them.
- Give current documents a concise purpose, scope and review date; include a real reference commit when useful. Identify drafts, approved scopes, superseded references and historical records clearly. Use verified commit hashes for specific closures, not the latest commit touching a file. Distinguish historical test results from checks actually rerun, and technical success from required human acceptance.
- When an approved implementation materially changes a game's capabilities, mechanics, content or limitations, update its `status.md` to the implemented and approved result. Apply the same rule to `docs/factory/status.md` for material Factory changes. Minor technical edits do not require state-document churn. Keep pending implementation or acceptance explicitly pending; do not present it as an existing approved capability.
- Update affected links and operative path mentions when relocating documentation, and verify resource integrity. Historical path mentions may remain when clearly identified as original locations. Keep the generator's README text contracts and commit tools intact unless a separate authorized change requires them. These conventions add no roles, routine approval gates or independent workflows.

## Known limitations

- The reviewer is asked not to edit, but v1 does not technically enforce read-only access. Subagents share the workspace and sandbox.
- Custom agent profiles (`.codex/agents/`, `.claude/agents/`) may require a fresh session to load. If the `implementer` or `reviewer` role is not available, do not pretend it ran; report the limitation and resume with the configured agent in a new session.
- Human playtesting remains a human decision and cannot be replaced by tests or code review.
