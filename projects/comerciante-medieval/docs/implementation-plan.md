# Comerciante Medieval — plan vivo

Propósito: autorizaciones, estado y cierres de `projects/comerciante-medieval/`. Revisión: 2026-11-07. Formato compacto según el [workflow v1.2](../../../docs/factory/workflow-v1.md#token-efficiency-v12). Reglas e invariantes: [decisions.md](decisions.md). Evidencia detallada anterior: [plan archivado 2026-10-28](history/implementation-plan-2026-10-28.md) y [plan histórico íntegro](history/implementation-plan-v0.1.md).

Leer [status.md](status.md), [spec-v1.md](spec-v1.md), [AGENTS.md](../../../AGENTS.md) y el [workflow](../../../docs/factory/workflow-v1.md) antes de continuar. La consolidación no otorga aprobación nueva; no trasladar casillas históricas a pendientes.

## Estado actual

- Sin implementación activa ni roadmap autorizado. Último cierre del juego: ITER-10, `737fea910ae0461eabf2520d365cbb49035b1cd5`.
- Última evidencia técnica (cierre ITER-10): 51 pruebas y build correctos; `npm test` reejecutado el 2026-10-28 (51 satisfactorias).
- Migración documental 2026-10-28: consolidación en spec-v1 y limpieza, sin cambios de gameplay; detalle en el [plan archivado](history/implementation-plan-2026-10-28.md).

## Cierres

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

## Registro de la siguiente intervención

Usar la [plantilla de hito](../../../docs/factory/templates/milestone-record.md). Al cerrar, dejar aquí una fila de cierre y un resumen de 5–10 líneas; mover la evidencia detallada a `history/` y llevar a [decisions.md](decisions.md) toda decisión o pendiente nuevo.
