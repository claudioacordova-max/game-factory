# Comerciante Medieval — continuidad de implementación

Revisión: 2026-10-28. Ámbito: `projects/comerciante-medieval/`. Corte de migración: `54955677ec9430695b233c99a8fb4067b103a86d`. Propósito: punto principal para planificar y registrar las siguientes intervenciones, conservando accesible el historial anterior.

## Estado y autoridad

No hay una implementación activa ni un nuevo roadmap autorizado en este corte. El usuario aceptó la migración documental y su limpieza final y autorizó un único commit documental de cierre el 2026-10-28, sin cambios de gameplay ni push. El ejecutor seguro ya admite las bajas verificadas necesarias para ese cierre. El último cierre del videojuego es ITER-10, `737fea910ae0461eabf2520d365cbb49035b1cd5`.

Leer [status.md](status.md), [spec-v1.md](spec-v1.md), [AGENTS.md](../../../AGENTS.md) y el [workflow vigente](../../../docs/factory/workflow-v1.md) antes de continuar. La especificación consolidada reúne decisiones ya aprobadas; no otorga una nueva aprobación ni amplía permisos. Toda intervención futura requiere el alcance/autorización correspondiente. No trasladar las casillas o estados intermedios históricos a pendientes actuales.

## Desarrollo completado

| Trabajo | Resultado registrado | Commit estable |
|---|---|---|
| Hito 1 | Proyecto desde plantilla e infraestructura | `9371c67` |
| Hito 2 | Modelo, escenario y necesidades; D9 aplicada | `4a74e0d` |
| Hito 3 | Economía autónoma y simulaciones | `7c9d0f0` |
| Hito 4 | Jugador, comercio y tiempo | `11bfaaf` |
| Hito 5 | Pueblos y NPC 3D, aceptación humana | `b4488c2` |
| Hito 6 | Bucle comercial integrado, aceptación humana | `fd7bf3f` |
| Hito 7 | Inspección/escenarios, aceptación humana | `51e90c6` |
| ITER-01 | Cierre de menú por distancia | `1d9848e` |
| ITER-02 | Interacción contextual y overlays | `58a6fb1` |
| ITER-03 | Comprar/Vender, clic por unidad, prohibición de recompra familiar | `1416078` |
| ITER-04 | Identidad de pueblos, NPC y negocios | `c168b44` |
| ITER-05 | Ambientes y protagonista orientable | `77b7180` |
| ITER-06 | Salidas de viaje y caravana visible | `f88572a` |
| ITER-07/08 | Rediseños sustituidos por la línea posterior; sin aprobación/cierre formal propio documentado | Sin commit de cierre atribuido |
| ITER-09 | UX Atlas del camino, clic directo y revisión final aceptada | `bbd8b30f901c4ba97e7934677861f03f196ea81e` |
| ITER-10 | Inventario/carga, saldo familiar, iconografía y atajo I aceptados | `737fea910ae0461eabf2520d365cbb49035b1cd5` |

El [plan histórico](history/implementation-plan-v0.1.md) conserva íntegramente briefs, aprobaciones, rutas modificadas, checks, revisiones y ciclos correctivos; incluye la reconciliación expresa de ITER-07/08. La aprobación de ITER-09/10 no se retrotrae a esas dos fichas. Los materiales visuales `docs/comerciante-medieval-uiux-propuesta.md` y `docs/comerciante-medieval-uiux/` mencionados allí no están disponibles; no se consideran evidencias accesibles.

## Decisiones aplicables para continuar

- Motor económico determinista TypeScript independiente de la UI; React/R3F presenta el estado y solicita acciones. Moneda en décimas y carga en medias unidades para evitar ambigüedades de precisión.
- Conservar inventarios separados, fondo familiar compartido, operaciones atómicas, reglas anti-recompra y límites diarios. Cambiar presentación no autoriza cambiar economía.
- D9: 1.000 monedas para ascenso 2→3 y mantenimiento de 3; 2.000 solo meta de prosperidad. No crear tramo 4 ni histéresis no aprobada.
- Mantener baseline experimental de recetas, tarifas, durabilidades y escenarios. Riesgos de balance requieren evidencia y autorización posterior; no ajustar cifras para forzar prosperidad.
- Comercio actual por unidad, inventario con I/Esc, carga dentro del inventario y fondo familiar junto al NPC sustituyen los flujos viejos de cantidad/confirmación y distribución del HUD.
- Puerto exclusivo de caravana; viaje solo entre los dos pueblos, un día global. Persistencia únicamente durante la sesión.

## Evidencia y asuntos abiertos

El cierre ITER-10 registra 51 pruebas y build correctos, revisión independiente sin bloqueantes y aceptación visual/playtesting manual del diseñador (2026-10-24). No se presenta ese registro como ejecución nueva ni como validación de cambios futuros. El aviso de bundle >500 kB y la cobertura incompleta de DOM son límites conocidos, no tareas nuevas autorizadas.

Única discrepancia concreta identificada en esta consolidación: los colores `needs.progression` mostrados por el panel experimental usan metas de tramo 2 incluso en tramo 3, mientras compras y `prosperityGoalsMet` usan las metas superiores. Véase [spec-v1.md, límites de corroboración](spec-v1.md#límites-de-corroboración). Se conserva el requisito aprobado y no se altera código; no hay una corrección de gameplay autorizada por esta migración.

## Registro desde este corte

La próxima intervención autorizada se registrará aquí con brief, alcance, criterios, autorización, baseline Git, cambios, checks, revisión independiente, correcciones, aceptación humana cuando proceda y cierre/commit real si está permitido. Una iteración grande puede enlazar un documento propio sin duplicar el historial.

Durante la migración documental principal del 2026-10-28, el coordinador reejecutó `npm.cmd test`: las 51 pruebas resultaron satisfactorias, y verificó enlaces, integridad y preflight documental. Revisión independiente de la migración: aprobada sin hallazgos. No hubo builds, revisiones visuales ni playtesting nuevos y no se cambió el código. Los cinco archivos preexistentes excluidos se preservaron en aquella fase; su eliminación posterior fue autorizada expresamente como limpieza final. Esta limpieza no repite la suite de gameplay. La aceptación final y autorización del commit documental único se recibieron el 2026-10-28. El [estado de Factory](../../../docs/factory/status.md) registra la corrección técnica separada que resolvió el impedimento del ejecutor. Este registro acompaña el cierre documental autorizado; su hash real se obtiene de Git después de la operación, sin insertarlo circularmente aquí. No hay aceptación humana ni trabajo jugable pendientes por esta migración.
