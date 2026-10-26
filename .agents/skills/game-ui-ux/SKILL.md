---
name: game-ui-ux
description: Transform technical game prototypes into coherent playable demos, or make focused later UI/UX corrections, including interfaces connected to 3D scenes.
---

# Game Factory: UI and UX

Use this skill when a request concerns how a player sees, understands, or uses a game's interface. It supports analysis and design decisions; it does not replace the project's change brief, approval, implementation, or review workflow.

## Choose the intervention

Distinguish a **technical-prototype-to-demo transformation** from a **focused correction**. The first is a principal visual intervention after a playable technical prototype exists: provisional components, layout, navigation and appearance may be reconsidered completely within the authorized scope. It must produce a functional interface, not just findings or a concept. A later readability, feedback or spacing request normally receives a local correction; do not reopen the whole design without a reason and authorization.

Use the existing brief and workflow for scope, authorization, roles and closure. If the designer has authorized the whole transformation and delegated conventional visual decisions, record that authorization and proceed between activities without asking again. Choose ordinary palette, typography, layout, icons and component treatments within that scope. Preserve designer authority over gameplay, balance, content and particular identity constraints; isolate unresolved material decisions while continuing independent work.

## Transform a technical prototype

Keep these four activities identifiable in the existing project record, with detail proportional to the game:

1. **Understand and structure.** Read the specification and implementation. Map the real screens, modes, states, player actions, required information and 3D relationships. Define a structural layout before implementing the definitive interface: persistent versus contextual information, action placement and navigation. Do not assume the provisional components organize the experience well.
2. **Make a concrete visual proposal.** Establish a suitable art direction, palette, fonts, composition/proportions, hierarchy, panels, cards or other game objects, controls, indicators, iconography and relation to the 3D scene. Use the official imagegen skill when available for aesthetic references of the main existing views/states. Store selected project references and prompts; generated names, statistics and invented elements never override real game data. If integrated generation is unavailable or fails, document an achievable visual substitute such as a standalone HTML/CSS mockup and capture; do not silently switch to a paid API/CLI, which needs explicit authorization. Reference art is not a replacement for functional components.
3. **Implement the proposal.** Use the existing stack and real states/actions, allowing substantial composition changes. Prioritize immediate reading, distinct control states, recognizable icons, useful space, comfortable navigation and coherence across UI and 3D. Remove redundant technical text and unnecessary interaction. Preserve approved mechanics and action intent; do not add confirmation steps or new game systems for aesthetics.
4. **Evaluate and refine.** Run the applicable tests/build, then perform the principal rendered inspection on the complete implementation when tools permit. Cover the real main views and interaction states at representative supported sizes (for example 1440×900 and 1024×768 for desktop). Check legibility, action clarity, overlap/cropping, proportions, working controls, fidelity to the proposal and unnecessary text/panels/steps. Correct evident in-scope defects, repeating only affected checks/captures. Do not inspect after every minor edit or turn each refinement into another research phase. Record exactly what was observed and what remains unverified; never claim visual inspection from source, a build or an unopened image.

Reuse this procedure, not one game's palette, layout or asset style. A small 2D game and an immersive 3D game may need different structures, references and inspection coverage.

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

For a focused correction, offer the smallest change that plausibly addresses the demonstrated problem. Explain its expected effect and relevant tradeoffs. For an authorized integral transformation, follow the four activities above and reconsider the whole provisional composition as needed. Do not invent mechanics, rules or content; use any delegated visual discretion within its stated limits. Mark material decisions that still need designer approval.

For a post-closure change request, use [`game-iteration`](../game-iteration/SKILL.md) to prepare the required change brief. Follow the authorization and execution rules in [`workflow-v1.md`](../../../docs/factory/workflow-v1.md); this skill does not duplicate or replace them. Do not implement a proposal while its design or required approval is pending.

## Prepare implementation

Once the relevant design and scope are approved, inspect the project's existing UI patterns and conventions. Keep changes bounded to the approved experience. Prefer existing components, tokens, and styling approaches; extract or reuse a component when it meaningfully reduces duplication or keeps related states consistent. Avoid imposing a framework, component library, or generic visual style, and do not add dependencies without justification and approval where required.

Before substantial implementation, follow the repository's applicable planning and workflow instructions. Preserve approved gameplay behavior and specifications. Treat technical structure as an implementation choice only when it does not alter the agreed player experience.

## Review the result

Check the affected flow in the implemented interface, not only the code. Verify relevant control states, action clarity, visible feedback, legibility, and consistency with surrounding UI and the game scene. Inspect the screen sizes and input methods the prototype supports or the issue affects; do not assume a single desktop layout is sufficient. Use technical checks for functional behavior, visual inspection for presentation, and human playtesting when hands-on evaluation of the changed gameplay experience or controls is needed under the project workflow.

Report what was checked, what changed in the player's experience, and any remaining limitation or decision. A passing build alone does not establish that an interface improvement is clear or usable.

### Inspect a rendered build

For work that changes the interface, 3D composition, legibility, feedback, or placement of elements, inspect the running result when a compatible browser tool is available. Keep the inspection proportional: a small correction may need only the affected screen and one relevant state; broader layout work may need several desktop sizes and states.

Use the project's documented development command and a local loopback URL. Check the installed Node.js version with `node --version`; the README published for `@playwright/cli@0.1.22` lists Node.js 18 or newer. Requirements may differ for later CLI versions. On Windows/PowerShell, the validated temporary invocation is:

```powershell
$visualDir = Join-Path $env:TEMP ("game-factory-visual-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $visualDir | Out-Null
Push-Location $visualDir
node --version
npm.cmd exec --offline --yes --package=@playwright/cli@0.1.22 -- playwright-cli --version
npm.cmd exec --offline --yes --package=@playwright/cli@0.1.22 -- playwright-cli -s=gf-visual open http://127.0.0.1:5173/ --browser=chrome --headed
npm.cmd exec --offline --yes --package=@playwright/cli@0.1.22 -- playwright-cli -s=gf-visual snapshot
npm.cmd exec --offline --yes --package=@playwright/cli@0.1.22 -- playwright-cli -s=gf-visual eval "() => ({ title: document.title, canvases: Array.from(document.querySelectorAll('canvas')).map(c => { const gl = c.getContext('webgl2') || c.getContext('webgl'); return { width: c.width, height: c.height, webgl: Boolean(gl) }; }) })"
npm.cmd exec --offline --yes --package=@playwright/cli@0.1.22 -- playwright-cli -s=gf-visual resize 1440 900
npm.cmd exec --offline --yes --package=@playwright/cli@0.1.22 -- playwright-cli -s=gf-visual screenshot --filename=desktop-1440x900.png
npm.cmd exec --offline --yes --package=@playwright/cli@0.1.22 -- playwright-cli -s=gf-visual resize 1024 768
npm.cmd exec --offline --yes --package=@playwright/cli@0.1.22 -- playwright-cli -s=gf-visual screenshot --filename=desktop-1024x768.png
npm.cmd exec --offline --yes --package=@playwright/cli@0.1.22 -- playwright-cli -s=gf-visual close
Pop-Location
```

Replace the example URL and sizes with those used by the project and task. The sizes are examples, not a fixed test matrix. Run the development server separately, and stop it after inspection. Run the CLI from the temporary directory so screenshots and CLI snapshots/logs stay outside source files and Git staging. This procedure requires Node.js 18 or newer, the pinned CLI package already present in npm's cache, and Chrome installed. `--offline` prevents npm from accessing the network; it will not fetch the package. If the CLI is missing from cache, or Chrome is unavailable, report the limitation. Obtaining the package over the network requires authorization before changing the execution policy. Do not install the CLI globally or add it to project dependencies. Do not run `playwright-cli install`, `install-browser`, or skill installation as part of this procedure. Consult `playwright-cli --help` or `playwright-cli --help <command>` when command syntax differs.

Confirm that the expected page loaded and that a 3D canvas has non-zero dimensions and an active WebGL context when the game uses WebGL. A canvas or DOM snapshot alone does not prove the scene rendered: open the saved PNGs in an image-capable tool and inspect the pixels. Check the relevant composition, legibility, overlap, scale, element placement, and visual feedback at the chosen sizes. For interaction changes, use CLI input commands such as `click` or `press` to reach representative states and capture those states when feasible; a complete playthrough is not required for a focused visual change.

Correct evident visual defects only within the approved scope, then repeat the affected captures and visual inspection. Report the sizes and states actually inspected, concrete observations, anything that could not be checked, and whether human playtesting remains necessary. If PNGs were generated but could not be opened and examined, state that visual review was not completed. Close only the browser session started for this inspection, stop its development server, and keep generated evidence outside the repository and staging.
