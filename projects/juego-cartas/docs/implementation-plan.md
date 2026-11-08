# Duelo en la cripta — plan vivo

Propósito: autorizaciones, estado de hitos y cierres de `projects/juego-cartas/`. Revisión: 2026-11-07. Formato compacto según el [workflow v1.2](../../../docs/factory/workflow-v1.md#token-efficiency-v12). Reglas e invariantes: [decisions.md](decisions.md). Evidencia detallada anterior: [plan archivado hasta M3](history/implementation-plan-2026-11-07.md) y [registro M0–M3](history/migracion-v04b-m0-m3.md).

## Estado actual

- Migración V0.4B: **M0–M3 cerrados y aceptados**. **M4 cerrado (2026-11-08)**; **M5 cerrado (2026-11-08)**; **M6 dividido: M6a cerrado (2026-11-08), M6b (3D) no autorizado**; **M7–M8 no autorizados**; ver hoja de ruta y pendientes en [decisions.md](decisions.md#5-hoja-de-ruta-m4m8-ninguno-autorizado).
- Juego activo: legado. Incidencia diferida: scroll de Colección.
- Última evidencia técnica (cierre M6a): 336/336 + spatial, build correcto (aviso de bundle >500 kB conocido).

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
| V0.4B M4 | Diez encuentros aislados, MIG-D02, IA nivel 1 | `fbde853` |
| V0.4B M5 | Restauración, orbe en HUD, ciclo de ratas MIG-D03 | `7aabf7a` |
| V0.4B M6a | Grafo de 19 salas y estado de exploración, puzle, muro | commit local de cierre M6a (hash en Git) |

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
- Cierre: `fbde853` (`juego-cartas: cerrar V0.4B M4 de encuentros aislados e IA`), sin push.

## V0.4B M5 — restauración, orbe y ciclo de ratas (cerrado 2026-11-08)

### Brief

- Autorización: el diseñador definió restauración/orbe, aprobó los detalles (activación fuera de combate desde el HUD de exploración, sin gasto si no hay nada que restaurar, restauración gratuita B1/B2) y autorizó «M5» con el plan propuesto, 2026-11-08.
- Alcance (solo perfil V0.4B, aislado): efecto de restauración en sesión; orbe inicial cargado, capacidad 1, `activateOrb`; `applyBossRestoration` sin consumo (no conectado a B1/B2); estado del ciclo de ratas MIG-D03 dirigido por eventos abstractos (victoria 07/08/09, altar, salida 10→04, reentrada desde 03); botón del orbe en `ExplorationHUD` solo para sesiones V0.4B; pruebas `tests/m5`.
- Fuera de alcance: mapa/salas reales y conexión de eventos (M6), premios (M7), conexión B1/B2 e integración (M8), legado, scroll de Colección.
- Criterios de aceptación: restauración sana copias vivas heridas (baraja y reserva) a máximo, vida máxima y actual a 20, fatiga 0, no revive, bloqueada en combate; recuperar tras restaurar vuelve a costar vida máxima; orbe inicial cargado, capacidad 1, activación rechazada en combate/vacío/sin nada que restaurar; restauración de jefe no consume carga; MIG-D03: altar recarga solo con orbe vacío y 07/08/09 vencidos en el ciclo, recarga reactiva 07–09, cierra 10→09, exige salida 10→04 y reentrada desde 03, orbe lleno no recarga ni reinicia, sin recarga no hay reinicio, cofres nunca se reactivan; botón HUD con carga, desactivado con motivo y aviso de resultado; legado sin botón ni cambios; suite previa + nuevas y build correctos; inspección visual headless a 1440×900 y 1024×768.
- **Mecánicas e invariantes:** decisions.md §2 completo; MIG-D01 (recuperación y cupos), MIG-D03, MIG-D06, restauración/orbe 2026-11-08; foco al cerrar superposiciones y controles de exploración aceptados; `ACTIVE_CONTENT = LEGACY_CONTENT`.
- Decisiones creativas: ninguna abierta.
- Revisión: completa. Playtesting humano: no requerido (botón no alcanzable desde el juego normal; se prueba al integrar en M6/M8). Capturas disponibles para el diseñador.
- Modelos: implementer sonnet, reviewer sonnet.

### Baseline

- `HEAD fbde85321bef95c23b2863410bffb09d8b078472`; cambios previos de esta sesión, autorizados e incluidos en M5: `docs/decisions.md`, `docs/status.md` (decisiones de restauración/orbe).

### Resultado

- Rutas: `src/engine/restoration.ts` (nuevo: restauración, orbe, `applyBossRestoration`, ciclo de ratas), `src/engine/session.ts` (`orb?`, `ratCycle?` opcionales), `src/engine/v04bPreparations.ts` (orbe cargado y ciclo vacío), `src/engine/index.ts`, `src/ui/ExplorationHUD.tsx` (botón del orbe, solo V0.4B), `src/ui/GameIcons.tsx` (icono `orb`), `src/styles.css`, `src/App.tsx` (handler y prop), `tests/m5.tsx` (nuevo), `tests/run.ts`; docs `decisions.md`, `status.md`, este plan.
- Contrato técnico para M6: eventos incoherentes del ciclo (victoria repetida, victoria con circuito cerrado, reentrada sin salir por 04) lanzan `RuleViolation`; interacción legítima sin efecto con el altar devuelve `recharged: false` con motivo. MIG-D03 no fija orden entre 07/08/09; lo resuelve la topología de M6.
- Checks del coordinador: tests 309/309 + spatial, build correcto, `git diff --check` limpio.
- Inspección visual headless (harness compartido, App real parcheado en memoria con sesión V0.4B; evidencia fuera del repo): estados cargado, vacío, sin nada que restaurar y tras activar, a 1440×900 y 1024×768. Botón a la derecha de Colección sin solape; aviso con lo restaurado (vida 17→20, fatiga 1→0); foco al viewport; juego normal sin botón. Móvil (<640 px) no capturado.
- Revisión: completa, aprobada sin bloqueantes; N1 (texto «Vacío · Orbe vacío») corregido en un ciclo y revisión acotada aprobada; N2 (orden de imports) y N3 (posición fija del botón) aceptados sin cambio. Ciclos correctivos 1/2.
- Playtesting: no requerido (botón no alcanzable desde el juego normal; se prueba al integrar en M6/M8).
- Decisiones nuevas en decisions.md: restauración y orbe con sus detalles (2026-11-08).
- Cierre: `7aabf7a` (`juego-cartas: cerrar V0.4B M5 de restauración y orbe`), sin push.

## V0.4B M6a — grafo y estado de exploración (cerrado 2026-11-08)

### Brief

- Autorización: el diseñador aprobó las decisiones de 04, puzle, muro, bloqueo por encuentro y runas, la división M6a/M6b, y autorizó «M6a», 2026-11-08.
- Alcance (solo V0.4B, aislado, motor sin UI): datos de 19 salas con nombres oficiales y zonas; aristas aprobadas (bidireccionales y 10→04 de un sentido) con condiciones; estado de exploración (sala actual, encuentros vencidos, progreso del puzle, sello, muro); interacciones (viajar, leer inscripción 11, activar pedestal 12, examinar muro 14, registrar victoria por sala); integración con el ciclo de ratas M5 (03→07 entra, 10→04 sale, 07/08/09 registran victoria, cierre 10→09); exposición de cofres disponibles sin concederlos; pruebas `tests/m6a`.
- Fuera de alcance: 3D/escena, UI, cofres y premios (M7), combates reales y restauración B1/B2 conectada (M8), juego legado.
- Criterios de aceptación: grafo exacto (19 salas, aristas de la fuente; sin 12→13, 18→15, 04→10 ni 13 desde 12); condiciones: 02→03 tras B1, 06→14 tras B2, bloqueo hacia delante en salas con encuentro y regreso siempre abierto, 04→03 siempre abierta, 03→13 visible tras B1 y abierta tras puzle, 14↔18 oculta hasta examinar el muro, 10→09 cerrada tras recarga; puzle Hueso→Sombra→Maná con reinicio sin penalización y disponibilidad del cofre 12; camino a 19 sin opcionales; ningún estado alcanzable sin salida; nombres oficiales; legado intacto; suite previa + nuevas y build correctos.
- **Mecánicas e invariantes:** decisions.md §2; MIG-D03 y contrato M5 (eventos incoherentes lanzan, interacción legítima sin efecto devuelve motivo); MIG-D05 y su excepción; decisiones M6 de 2026-11-08; `ACTIVE_CONTENT = LEGACY_CONTENT`.
- Decisiones creativas: ninguna abierta.
- Revisión: completa. Playtesting humano: no requerido (sin UI).
- Modelos: implementer sonnet, reviewer sonnet.

### Baseline

- `HEAD 7aabf7a1cfefd727622251d4496a8767b8049ce4`; cambios previos de esta sesión, autorizados e incluidos en M6a: `docs/decisions.md`, `docs/status.md`.

### Resultado

- Rutas: `src/engine/content/v04bMap.ts` (nuevo: 19 salas, zonas provisionales, aristas, regreso por sala, cofres informativos, datos del puzle), `src/engine/v04bWorld.ts` (nuevo: expedición V0.4B, salidas con estado y motivo, viaje, victoria por sala, altar, inscripción, pedestales, muro, disponibilidad de cofres), `src/engine/index.ts`, `tests/m6a.ts` (nuevo), `tests/run.ts`; docs `decisions.md`, `status.md`, este plan.
- Checks del coordinador: tests 336/336 + spatial, build correcto, `git diff --check` limpio. BFS exhaustivo: 34.012 estados alcanzables, ninguno sin salida abierta y B3 alcanzable desde todos.
- Revisión: completa, aprobada sin hallazgos. Ciclos correctivos 0/2.
- Inspección visual y playtesting: no aplican (sin UI).
- Decisiones en decisions.md: bloqueo por encuentro, runas, criterios M6a aceptados (zonas provisionales, regreso por conexión de entrada, condiciones de cofre).
- Cierre: commit local `juego-cartas: cerrar V0.4B M6a de grafo y exploración`, sin push.
