# Duelo en la cripta — continuidad de implementación

Propósito: punto vivo de planificación, decisiones, verificaciones y cierres de `projects/juego-cartas/`. Revisión: 2026-10-28. Corte de migración: `54955677ec9430695b233c99a8fb4067b103a86d`. El usuario aceptó la migración y su limpieza final y autorizó el commit de cierre el 2026-10-28; el ejecutor seguro ya admite las bajas verificadas necesarias para ese cierre.

## Estado al corte

No hay implementación jugable activa ni un siguiente hito autorizado. Los siete hitos originales y las iteraciones siguientes constan cerrados. Esta referencia sustituye al plan antiguo como punto de continuidad, sin reabrir hitos, casillas o validaciones dispensadas ni inventar roadmap. El [plan original completo](history/implementation-plan-v0.1.md) conserva los briefs, autorizaciones, rutas históricas, revisiones, correcciones, pruebas y aprobaciones humanas.

Referencias vigentes: [estado implementado](status.md), [especificación consolidada](spec-v1.md), [interfaz](design/interface-v1.md) y [exploración 3D](design/exploration-3d-v1.md). Procedimiento: [AGENTS.md](../../../AGENTS.md) y [workflow-v1.md](../../../docs/factory/workflow-v1.md).

## Implementaciones cerradas y evidencia

| Trabajo | Resultado y evidencia histórica | Commit estable |
|---|---|---|
| Prototipo original, hitos 1–7 | Reglas, UI, consecuencias persistentes, colección y tres encuentros; doce criterios de aceptación. [Validación](history/validation-report-v0.1.md). | `caf6309770148eeab65dbc988b5f592e36fc7a22` |
| Primera transformación visual | Demo coherente, dirección de cripta y procedimiento visual reutilizable; 32/32 pruebas, build y revisión registrados, aceptación humana. [Diseño original](history/design/visual-v0.1/design.md). | `2d477ff9ef793a8754f24826f763ade53b10b29f` |
| Expedición y recuperación H0–H6 | Catálogo 18/14/7, reinvocación, épicas, siete salas, objetos y ala; 102/102 más spatial y build registrados; aceptación integrada. [D01–D12 y ejecución](history/iteration-v1.md). | `f401a0ed719d7b61cc41d95b789389e3df8813eb` |
| Combate H1–H3 | Mezcla propia reproducible en pruebas, arrastre/selección directa y avance principal; 110/110 más spatial y build registrados; aceptación humana. | `3c4f0d4229488169ac4dec22197574fbfa4036b8` |
| Rediseño A1–A6 | Colección modal, tablero, sacrificio por última selección, multibloqueo por arrastre, conexiones y fases sin fin manual; 160/160 más spatial y build, revisión y aceptación humana. [Diseño/registro](history/design/ui-redesign-v1/design.md). | `a16c9c560335be109f11ffe58a258f27b82d9f13` |
| Transformación y estabilización 3D | Siete ambientes y siluetas, batch estático, inicialización del suelo y DPR1; 167/167 más spatial, build y revisión final registrados. Aprobación humana cualitativa de arte, ausencia del bloque y fluidez. | `54955677ec9430695b233c99a8fb4067b103a86d` |

Los cinco cierres recientes se verificaron en Git durante la migración. La tabla conserva la evidencia de sus cierres originales; la regresión técnica repetida durante la migración se registra por separado abajo. No se repitieron aquellos builds ni playtesting. El balance H6 [conserva 26/27 expediciones completas](history/iteration-v1-balance.md), una derrota legítima y sus hashes de motor; no equivale a tasa de victoria humana ni a ensayo del robo aleatorio posterior. La [guía H6](history/iteration-v1-playtesting.md) conserva el protocolo y la aceptación que dispensó recorridos manuales exhaustivos. Las mediciones 3D del plan son previas al último fallback de normales, no FPS instrumentales del build final.

## Decisiones que deben conservarse al continuar

- Autoridad: requisitos compatibles originales, D01–D12 y autorizaciones posteriores; consultar [spec-v1.md](spec-v1.md) y su tabla de procedencia. El código corrobora implementación, no autoriza reglas nuevas.
- Crecimiento por **victoria de copia invocada y superviviente**, no por eliminaciones. Cero/una copia por tipo, reinvocación básica fuera de combate y coste de máximo con suelo 1.
- Mezclar solo baraja propia; enemigos deterministas. No restaurar ordenación manual de robo, confirmación separada de sacrificios o fin de turno manual a partir de documentos anteriores.
- Estado de sesión en memoria, sin guardado durable; nivel fijo 1. Estadísticas, recompensas y +3 de épicas son baseline experimental autorizado; no rebalancear automáticamente.
- Motor TypeScript separado de UI/3D; reutilizar stack existente, sin nuevas dependencias o arquitectura implícitas. Render estático agrupado conserva normales mediante fallback de piezas incompatibles y resolución DPR1.
- Las aceptaciones humanas cerradas no se sustituyen por tests ni deben repetirse como ritual documental; una intervención nueva tendrá sus propios criterios y alcance de validación.

## Migración documental del 2026-10-28

Autorización: solicitud explícita del usuario de reorganizar y consolidar documentación. Se archivan fuentes versionadas y README anterior, se crean referencias vigentes con nombres estándar y se reparan enlaces y referencias de cierre. No se cambian gameplay, código, datos de balance, dependencias, herramientas ni procedimientos principales de Factory. La consolidación de especificación no representa una aprobación creativa nueva.

Baseline de la migración principal: HEAD indicado arriba, índice y archivos versionados entonces limpios. Quedaron inicialmente fuera de alcance `docs/rpg-cartas-estado-actual-traspaso-2026-10-26.md` y cuatro archivos del piloto `experiments/multiagent-ts-pilot/` (`.gitignore`, `src/clamp.ts`, `test/clamp.test.cjs`, `tsconfig.json`), que se preservaron en aquella fase. Durante esa migración, el coordinador reejecutó `npm.cmd test`: 167/167 pruebas más comprobaciones espaciales satisfactorias, y verificó enlaces, integridad y preflight documental. Revisión independiente de la migración: aprobada sin hallazgos. No hubo builds, inspecciones visuales ni playtesting nuevos; las referencias históricas conservan su alcance.

En la limpieza final expresamente autorizada se eliminaron el piloto sin uso y el traspaso redundante, cuyo contenido relevante está respaldado por los históricos conservados y el corte Git `2d477ff9ef793a8754f24826f763ade53b10b29f`. Esta limpieza no repite la suite de gameplay ni modifica requisitos. El 2026-10-28 el usuario aceptó el resultado completo y autorizó un único commit documental de cierre, sin push. El impedimento del ejecutor quedó resuelto por una corrección técnica separada, comprobada en el [estado de Factory](../../../docs/factory/status.md). Este registro acompaña el cierre documental autorizado; su hash real se obtiene de Git después de la operación, sin insertarlo circularmente aquí. No hay aceptación humana ni trabajo jugable pendientes por esta migración.

## Registro de la siguiente intervención

Cuando exista una nueva solicitud autorizada, registrar aquí un brief proporcional, alcance y criterios, baseline Git, decisiones aplicables, cambios, verificaciones realmente ejecutadas, revisión independiente, correcciones, playtesting cuando corresponda y cierre/commit real si está autorizado. Una iteración grande puede usar `iterations/AAAA-MM-DD-tema.md` enlazada desde aquí; no se crea una carpeta vacía ni un encargo futuro ahora.
