# Duelo en la cripta — plan vivo

Propósito: autorizaciones, estado de hitos y cierres de `projects/juego-cartas/`. Revisión: 2026-11-07. Formato compacto según el [workflow v1.2](../../../docs/factory/workflow-v1.md#token-efficiency-v12). Reglas e invariantes: [decisions.md](decisions.md). Evidencia detallada anterior: [plan archivado hasta M3](history/implementation-plan-2026-11-07.md) y [registro M0–M3](history/migracion-v04b-m0-m3.md).

## Estado actual

- Migración V0.4B: **M0–M3 cerrados y aceptados**. **M4–M8 no autorizados**; ver hoja de ruta y pendientes en [decisions.md](decisions.md#5-hoja-de-ruta-m4m8-ninguno-autorizado).
- Juego activo: legado. Incidencia diferida: scroll de Colección.
- Última evidencia técnica (cierre M3): 279/279 + spatial, build correcto (aviso de bundle >500 kB conocido).

## Cierres

| Trabajo | Resultado | Commit |
|---|---|---|
| Prototipo original, hitos 1–7 | Reglas, UI, consecuencias, colección, tres encuentros. [Validación](history/validation-report-v0.1.md) | `caf6309` |
| Primera transformación visual | Demo coherente, dirección de cripta. [Diseño](history/design/visual-v0.1/design.md) | `2d477ff` |
| Expedición H0–H6 | D01–D12, catálogo 18/14/7, siete salas. [Registro](history/iteration-v1.md) | `f401a0e` |
| Combate H1–H3 | Mezcla propia, arrastre, avance principal | `3c4f0d4` |
| Rediseño A1–A6 | Colección modal, tablero, multibloqueo. [Diseño](history/design/ui-redesign-v1/design.md) | `a16c9c5` |
| Transformación y estabilización 3D | Siete ambientes, batch estático, DPR1 | `5495567` |
| Iteración UX y fatiga | Aceptación parcial; scroll diferido. [Registro](history/implementation-plan-2026-11-07.md#iteración-ux-y-fatiga--2026-10-28--cerrada-con-aceptación-parcial) | `8fb9c4f` |
| V0.4B M0 | Aislamiento legado, decisiones MIG-D01–D07 | `be974b9` |
| V0.4B M1 | Catálogo 21/39, cupos, copias e identidades | `3ec644a` |
| V0.4B M2 | Recursos, fichas, R01 y P5 | `a449504` |
| V0.4B M3 | Escudos, A03/N01, H02/H03, ritual H04 (P3/P4/P8) | `52b9e77` |

## Registro de la siguiente intervención

Usar la [plantilla de hito](../../../docs/factory/templates/milestone-record.md). Al cerrar, dejar aquí una fila de cierre y un resumen de 5–10 líneas; mover la evidencia detallada a `history/` y llevar a [decisions.md](decisions.md) toda decisión o pendiente nuevo.
