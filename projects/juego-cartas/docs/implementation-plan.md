# Duelo en la cripta — plan vivo

Propósito: autorizaciones, estado de hitos y cierres de `projects/juego-cartas/`. Revisión: 2026-11-07. Formato compacto según el [workflow v1.2](../../../docs/factory/workflow-v1.md#token-efficiency-v12). Reglas e invariantes: [decisions.md](decisions.md). Evidencia detallada anterior: [plan archivado hasta M3](history/implementation-plan-2026-11-07.md) y [registro M0–M3](history/migracion-v04b-m0-m3.md).

## Estado actual

- Migración V0.4B: **M0–M3 cerrados y aceptados**. **M4 cerrado (2026-11-08)**; **M5–M8 no autorizados**; ver hoja de ruta y pendientes en [decisions.md](decisions.md#5-hoja-de-ruta-m4m8-ninguno-autorizado).
- Juego activo: legado. Incidencia diferida: scroll de Colección.
- Última evidencia técnica (cierre M4): 292/292 + spatial, build correcto (aviso de bundle >500 kB conocido).

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
| V0.4B M4 | Diez encuentros aislados, MIG-D02, IA nivel 1 | commit local de cierre M4 (hash en Git) |

## Registro de la siguiente intervención

Usar la [plantilla de hito](../../../docs/factory/templates/milestone-record.md). Al cerrar, dejar aquí una fila de cierre y un resumen de 5–10 líneas; mover la evidencia detallada a `history/` y llevar a [decisions.md](decisions.md) toda decisión o pendiente nuevo.

## V0.4B M4 — diez encuentros aislados e IA nivel 1 (cerrado 2026-11-08)

### Brief

- Autorización: el diseñador ratificó la convención A02 predesplegada y el maná rival 1, y autorizó «M4» con el plan propuesto, 2026-11-07.
- Alcance: datos de los diez encuentros (duelos 02/09/06/18/19, escaramuzas 04/07/08/16/17) con cifras y orden del paquete v0.4; preparación aislada `createV04BEncounterDuel`; robo rival MIG-D02 solo en V0.4B; IA nivel 1 en `enemy.ts` para las cartas presentes en mazos/campos rivales; pruebas `tests/m4` y simulación automática de los diez combates.
- Fuera de alcance: mundo/mapa, orbe, premios, balance, IA nivel 2, UI nueva, N01/A03/A04/R04 en la IA, scroll de Colección.
- Criterios de aceptación: composiciones/vidas/orden exactos y nombres oficiales (escaramuzas marcadas tentativas); A02 predesplegada sin ficha y A02 invocada con ficha; MIG-D02 (mano 3, sin robo en el primer turno rival, uno por turno después); IA sin acciones ilegales ni turnos bloqueados; H04 rival paga tres reales, nunca fichas; Rey Esqueleto alcanza R03 legalmente; Escudo 1 agrupado en 17; los diez combates simulados terminan; legado intacto; suite previa + nuevas y build correctos.
- **Mecánicas e invariantes:** decisions.md §2 completo; M2/M3, P3/P4/P5/P8, D1/D2, MIG-D02, MIG-D07; `ACTIVE_CONTENT = LEGACY_CONTENT`; robo/IA legados sin cambios.
- Heurísticas nivel 1 aprobadas con el plan: orden de mano jugando toda carta pagable; sacrificios fichas primero y luego reales de menor ATQ+VID (H04 solo reales); R01 solo si habilita una carta de mano impagable; curas H02/H03 a la aliada con más vida perdida, desempate por orden de campo; ataque y bloqueo actuales.
- Decisiones creativas: ninguna abierta. Riesgos a registrar sin corregir: apertura 6 ATQ de la Señora de las Ratas, sacrificios poco estratégicos, turnos rivales instantáneos.
- Revisión: completa. Playtesting humano: no requerido (sin acceso desde el mapa; calidad de encuentros en M8 según MIG-D07).
- Modelos: implementer sonnet, reviewer sonnet.

### Baseline

- `HEAD ae4f3b14f97af706fca3b862770dec0f9d9e5b4b`; cambios previos de esta sesión, autorizados e incluidos en M4: `docs/decisions.md`, `docs/status.md` (ratificaciones).

### Resultado

- Rutas: `src/engine/content/v04bEncounters.ts` (nuevo), `src/engine/v04bPreparations.ts` (`createV04BEncounterDuel`), `src/engine/index.ts`, `src/engine/session.ts` (`firstPlayer` en opciones), `src/engine/rules.ts` (MIG-D02 en `endTurn`, solo V0.4B), `src/engine/enemy.ts` (IA nivel 1 V0.4B; rama legada intacta), `tests/m4.ts` (nuevo), `tests/run.ts`; docs `decisions.md`, `status.md`, este plan.
- Checks del coordinador: tests 292/292 + spatial, build correcto, `git diff --check` limpio.
- Comportamiento observado: Señora de las Ratas abre con A02→ficha→N03→N02 y 6 ATQ; El Devoto invoca H04 legal en 5/8 simulaciones (sesión inicial); El Rey Esqueleto invoca R03/N08/N09 solo en partidas largas (prueba con jugador pasivo); sacrificios poco estratégicos según heurística aprobada.
- Caso abierto aplazado a M8 por el diseñador: agotamiento mutuo sin ganador (18/5 y 18/8 en sesión inicial), acotado exactamente en la simulación. Ver decisions.md §4.
- Revisión: completa, aprobada sin bloqueantes; N1 (aserción tautológica) y N2 (agotamiento no acotado) corregidos en un ciclo; N3 (jugador automático no bloquea) aceptado sin cambio. Revisión acotada del ciclo aprobada. Ciclos correctivos 1/2.
- Inspección visual: no aplica (sin cambios de UI). Playtesting: no requerido (ver brief).
- Decisiones nuevas en decisions.md: convención A02 predesplegada, maná rival 1, heurísticas IA nivel 1; pendiente de agotamiento mutuo (M8).
- Cierre: commit local `juego-cartas: cerrar V0.4B M4 de encuentros aislados e IA`, sin push.
