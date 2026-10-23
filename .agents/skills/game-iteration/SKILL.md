---
name: game-iteration
description: Turn informal post-closure game change requests into concise, proportional briefs with verifiable criteria and approval needs. Use before planning or implementing a prototype iteration.
---

# Game Factory: change brief

Use this skill to prepare a designer-facing brief for a change requested after the prototype's original milestones have closed. Follow the normative **Post-closure iterations (v1.1)** section in [`docs/factory/workflow-v1.md`](../../../docs/factory/workflow-v1.md); do not reproduce or replace that workflow.

Extract what the designer has actually said. Do not invent game rules, content, balance, or UX decisions. If information is missing, mark it as unknown or ask only the question needed to make the request understandable and verifiable.

## Prepare the brief

1. State the problem or improvement in plain language. Separate the **current behavior** from the **desired behavior**; label any inferred desired behavior as a proposal for the designer to confirm.
2. Classify the request as one of:
   - **Small correction:** a bounded defect or unintended behavior with a narrow fix.
   - **UX/presentation improvement:** changes how an existing feature is presented or used.
   - **Large functionality:** adds a substantial capability, system, or interaction, or has broad dependencies.
3. Define scope and constraints. Include only the requested area, name relevant exclusions, and refer to approved specifications or existing behavior when applicable. Do not broaden the request.
4. Write observable acceptance criteria that a reviewer or tester could check. Avoid criteria that require an unapproved creative choice.
5. Flag every unresolved creative choice, especially rules, economic values, content, balance, or player-facing behavior. Mark it **approval required** and state what the designer must decide. Do not resolve it yourself or treat this brief as permission to implement.
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
Status: Pending designer approval
```

End by asking for approval of the defined change and any listed creative decisions. Do not begin implementation, create or edit game files, or imply approval has been granted. Once the designer approves, the coordinator can handle planning and execution under the referenced workflow.
