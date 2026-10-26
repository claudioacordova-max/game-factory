---
name: game-iteration
description: Turn informal post-closure game change requests into concise, proportional briefs with verifiable criteria and approval needs. Use before planning or implementing a prototype iteration.
---

# Game Factory: change brief

Use this skill to prepare a designer-facing brief for a change requested after the prototype's original milestones have closed. Follow the normative **Post-closure iterations (v1.1)** section in [`docs/factory/workflow-v1.md`](../../../docs/factory/workflow-v1.md); do not reproduce or replace that workflow.

Extract what the designer has actually said, including existing authorization and delegated discretion. Do not invent game rules, content or balance. Conventional presentation decisions may be resolved within explicitly delegated UI/UX scope. If material information is missing, mark it as unknown or ask only what is needed to define the authorized change.

## Prepare the brief

1. State the problem or improvement in plain language. Separate the **current behavior** from the **desired behavior**; label any inferred desired behavior as a proposal for the designer to confirm.
2. Classify the request as one of:
   - **Small correction:** a bounded defect or unintended behavior with a narrow fix.
   - **UX/presentation improvement:** changes how an existing feature is presented or used.
   - **Large functionality:** adds a substantial capability, system, or interaction, or has broad dependencies.
   For presentation work, distinguish a full technical-prototype-to-demo transformation from a later focused correction. Use [game-ui-ux](../game-ui-ux/SKILL.md) for the former's structural design, concrete visual proposal, implementation and evaluation; do not reduce an authorized redesign to a cosmetic patch or a proposal-only deliverable.
3. Define scope and constraints. Include only the requested area, name relevant exclusions, and refer to approved specifications or existing behavior when applicable. Do not broaden the request.
4. Write observable acceptance criteria that a reviewer or tester could check. Avoid criteria that require an unapproved creative choice.
5. Flag unresolved material creative choices, especially rules, economic values, content, balance or particular identity. Mark them **approval required** and state what the designer must decide. Record conventional visual choices already delegated separately; they do not require another approval. A brief does not itself grant permission, but must preserve authorization already supplied in the request.
6. Say whether more planning is warranted and why. Do not require a milestone plan for a small correction; recommend planning only when scope or dependencies justify it.
7. Decide whether human playtesting is needed because the change affects gameplay experience or controls. If uncertain before the design is resolved, say so and revisit it after approval. Internal-only changes generally do not need playtesting.

## Output

Keep the brief proportional to the request. Use this compact format, omitting fields that truly do not apply and marking unresolved details clearly:

Present the brief in the designer's language.

```text
Change: [short title]
Current behavior: [observable behavior]
Desired behavior: [observable result; label assumptions/proposals]
Type: [small correction | UX/presentation | large functionality]
Scope and constraints: [included work, exclusions, governing requirements]
Acceptance criteria: [verifiable outcomes]
Creative decisions: [none | approval required: decision(s)]
Additional planning: [not needed | needed, with reason]
Human playtesting: [not needed | needed, with reason | reassess after approval]
Status: [authorized by the request, with limits | pending specific approval]
```

Ask for approval only for work or material decisions not already authorized. When the request explicitly authorizes implementation within clear limits, record the brief and proceed through the referenced workflow without another conversational gate. If a material decision remains pending, pause only dependent work and continue independent authorized work.
