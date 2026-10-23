---
name: game-ui-ux
description: Analyze, propose, implement, and review focused UI and UX improvements for game prototypes, including 2D interfaces and interfaces connected to 3D scenes.
---

# Game Factory: UI and UX

Use this skill when a request concerns how a player sees, understands, or uses a game's interface. It supports analysis and design decisions; it does not replace the project's change brief, approval, implementation, or review workflow.

## Understand the experience

Start from the player's goal and the observed issue. Identify:

- What the player is trying to do.
- The interaction flow, including relevant game or world context.
- The specific confusing, difficult, inconsistent, or unresponsive moment reported or observed.

Inspect the existing implementation or a running build when available. Distinguish observed behavior from assumptions, and ask a focused question only when missing context prevents a useful recommendation.

## Analyze the interface

Evaluate the parts relevant to the issue, including:

- Visual hierarchy and whether important information is easy to find at the moment it is needed.
- Information grouping, spacing, and the relationship between HUD, panels, menus, and the game view.
- Whether actions appear in the context where they can be used, and whether their labels and affordances are clear.
- Control states such as available, unavailable, selected, focused, pressed, loading, or completed, as applicable.
- Feedback after input, including whether the result is visible and timely.
- Legibility, contrast, text size, and basic keyboard or input accessibility where relevant.
- For 3D games, whether interface elements fit the player's attention and view of the scene, and whether world interactions and screen UI communicate consistently.

Do not treat every item as a mandatory redesign checklist. Follow the evidence and the scope of the reported problem.

## Diagnose and propose

Describe findings in concrete terms and distinguish:

- **Functional defect:** an action or display fails or behaves incorrectly.
- **Comprehension problem:** the player cannot readily tell what an action does, when it applies, or what happened.
- **Visual inconsistency:** related elements communicate different priorities or states without a clear reason.
- **Open design decision:** more than one reasonable solution would change emphasis, player-facing behavior, or visual direction.

Offer the smallest change that plausibly addresses the demonstrated problem. Explain the expected effect on the player's task and note tradeoffs or unresolved choices. Do not invent mechanics, rules, content, priorities between mechanics, or an art direction. Mark decisions that need designer approval instead of silently choosing them. A local readability or feedback issue should normally receive a local correction; propose broader restructuring only when evidence shows the problem is broad.

For a post-closure change request, use [`game-iteration`](../game-iteration/SKILL.md) to prepare the required change brief. Follow the authorization and execution rules in [`workflow-v1.md`](../../../docs/factory/workflow-v1.md); this skill does not duplicate or replace them. Do not implement a proposal while its design or required approval is pending.

## Prepare implementation

Once the relevant design and scope are approved, inspect the project's existing UI patterns and conventions. Keep changes bounded to the approved experience. Prefer existing components, tokens, and styling approaches; extract or reuse a component when it meaningfully reduces duplication or keeps related states consistent. Avoid imposing a framework, component library, or generic visual style, and do not add dependencies without justification and approval where required.

Before substantial implementation, follow the repository's applicable planning and workflow instructions. Preserve approved gameplay behavior and specifications. Treat technical structure as an implementation choice only when it does not alter the agreed player experience.

## Review the result

Check the affected flow in the implemented interface, not only the code. Verify relevant control states, action clarity, visible feedback, legibility, and consistency with surrounding UI and the game scene. Inspect the screen sizes and input methods the prototype supports or the issue affects; do not assume a single desktop layout is sufficient. Use technical checks for functional behavior, visual inspection for presentation, and human playtesting when hands-on evaluation of the changed gameplay experience or controls is needed under the project workflow.

Report what was checked, what changed in the player's experience, and any remaining limitation or decision. A passing build alone does not establish that an interface improvement is clear or usable.
