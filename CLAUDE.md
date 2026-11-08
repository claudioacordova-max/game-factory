@AGENTS.md

# Claude Code adapter

`AGENTS.md` above is the shared source of truth for Codex and Claude Code. This file only maps it to Claude Code; it adds no rules, roles or gates.

## Role mapping

| Factory role | Claude Code |
|---|---|
| Coordinator | Main session |
| `implementer` | `.claude/agents/implementer.md` (Codex: `.codex/agents/implementer.toml`) |
| `reviewer` | `.claude/agents/reviewer.md`, technically read-only (no edit tools) |
| `runner` | `.claude/agents/runner.md`: mechanical commands only (tests, build, preflight, Git inspection, commit executor) |
| Skills | `.claude/skills/*` wrappers pointing to the canonical `.agents/skills/*/SKILL.md` |
| Command rules | `.claude/settings.json` permissions (Codex: `.codex/rules/*.rules`) |

## Model routing and token efficiency

Normative rules, including the model-tier table, are in **Token efficiency (v1.2)** in `docs/factory/workflow-v1.md`. In Claude Code: planning, design, UI/UX and 3D on `opus` (main session, or the implementer with `model: "opus"`); logic implementation and review on `sonnet` (agent defaults); mechanical commands batched into one `runner` (`haiku`) call. Start every session from the Factory continuity card in `docs/factory/status.md` and the active game's `status.md` card; record unexecuted Factory follow-ups in the Factory card before ending.
