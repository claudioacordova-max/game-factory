# Duelo en la cripta — plan vivo

Propósito: autorizaciones, estado de hitos y cierres de `projects/juego-cartas/`. Revisión: 2026-11-07. Formato compacto según el [workflow v1.2](../../../docs/factory/workflow-v1.md#token-efficiency-v12). Reglas e invariantes: [decisions.md](decisions.md). Evidencia detallada anterior: [plan archivado hasta M3](history/implementation-plan-2026-11-07.md) y [registro M0–M3](history/migracion-v04b-m0-m3.md).

## Estado actual

- Migración V0.4B: **M0–M3 cerrados y aceptados**. **M4 cerrado (2026-11-08)**; **M5 cerrado (2026-11-08)**; **M6 cerrado: M6a y M6b (2026-11-08)**; **M7 cerrado (2026-11-08)**; **M8 autorizado por fases: M8a cerrado (2026-11-08), M8b siguiente**; ver hoja de ruta y pendientes en [decisions.md](decisions.md#5-hoja-de-ruta-m4m8-ninguno-autorizado).
- Juego activo: legado. Incidencia diferida: scroll de Colección.
- Última evidencia técnica (cierre M8a): 396/396 + spatial, build correcto (aviso de bundle >500 kB conocido).

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
| V0.4B M6a | Grafo de 19 salas y estado de exploración, puzle, muro | `7c0b1c1` |
| V0.4B M6b | Expedición V0.4B jugable en 3D (`?expedicion=v04b`), combates reales, rendimiento | `0e0d2b5` |
| V0.4B M7 | Once cofres, 31 premios únicos a reserva, panel de premios | `dc03b34` |
| V0.4B M8a | Mazo exhausto (Eco de la cripta), Rendirse, terminación de encuentros | commit local de cierre M8a (hash en Git) |

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
- Cierre: `7c0b1c1` (`juego-cartas: cerrar V0.4B M6a de grafo y exploración`), sin push.

## V0.4B M6b — expedición V0.4B jugable en 3D (cerrado 2026-11-08)

### Brief

- Autorización: el diseñador aprobó el plan, sus cuatro decisiones y exigió pruebas de rendimiento, 2026-11-08.
- Alcance: 19 salas 3D compactas reutilizando geometría, paleta y estabilización aprobadas, con salidas en muros (hasta 4) y ambiente por zona; salidas con estado visible y motivo; altar 10, inscripción 11, pedestales 12 y muro 14 interactivos; combates M4 conectados por sala con liquidación existente, restauración gratuita B1/B2 y ciclo de ratas; HUD V0.4B (orbe M5, nombre oficial de sala); acceso solo con `?expedicion=v04b`; representación de enemigos según decisions.md; medición de rendimiento.
- Fuera de alcance: cofres y premios (M7), V0.4B por defecto y balance (M8), scroll de Colección.
- Criterios de aceptación: sin parámetro el juego legado es idéntico (suite legada intacta); con parámetro se juega 01→19 con combates reales; todas las salidas alcanzables y ninguna bloqueada por obstáculos en las 19 salas; estados de salida visibles con motivo; puzle, muro, altar y orbe operables con E; victorias desbloquean, derrotas aplican fatiga 0–1 y permiten reintentar; nombres oficiales; suite previa + nuevas y build correctos; inspección visual de las 19 salas a 1440×900 y 1024×768.
- **Rendimiento (obligatorio):** (1) presupuesto por sala medido con `renderer.info` (draw calls, triángulos, geometrías, texturas): ninguna sala V0.4B supera en más de un 25 % el máximo de las siete salas legadas medido en la misma ejecución; (2) sin fugas: tras recorrer las 19 salas y volver a 01, geometrías y texturas vuelven al valor inicial (±5 %); (3) FPS: muestra automática por sala en navegador con aceleración (harness `--headed`), mediana ≥ 90 % de la mediana legada en la misma máquina y ejecución; (4) contador de FPS y `renderer.info` visible solo con `?perf` para el playtesting; el diseñador confirma fluidez aceptable en su equipo. Si no se cumple, optimizar dentro del alcance (instancias, agrupado estático existente, menos geometría) sin degradar el arte aprobado.
- **Mecánicas e invariantes:** decisions.md §2 completo (render estático agrupado con fallback de normales y DPR1; controles, foco y colisiones aceptados); M4–M6a y sus contratos; `ACTIVE_CONTENT = LEGACY_CONTENT` por defecto.
- Decisiones creativas: ninguna abierta (representación provisional del Devoto y escaramuzas aceptada).
- Revisión: completa. Playtesting humano: **requerido** antes del cierre.
- Modelos: implementer opus (3D/UI), reviewer sonnet.

### Baseline

- `HEAD 7c0b1c13d23569619f8023ac77507a2363c8927c`; cambios previos de esta sesión, autorizados e incluidos en M6b: `docs/decisions.md`, `docs/implementation-plan.md`, `docs/status.md`.

### Resultado

- Rutas nuevas: `src/adventure/{types,legacyAdventure,v04bAdventure,mode,select}.ts` (adaptador por expedición sobre un único shell), `src/engine/v04bSpatial.ts` (19 salas 14×12, salidas por muro, apariciones por arista), `src/engine/v04bPlay.ts` (objetos, interacción validada por posición, liquidación idempotente con `recordRoomVictory` y restauración B1/B2), `src/scene/V04BActors.tsx`, `src/scene/PerfProbe.tsx` (solo con `?perf`), `src/ui/v04bMessages.ts`, `tests/m6b.tsx`. Modificadas: `src/App.tsx`, `src/engine/{index,spatial}.ts`, `src/scene/{CryptEnvironment,CryptGeometry,ExplorationActors,ExplorationScene}.tsx`, `src/scene/{cryptVisuals.ts,exploration.css}`, `src/ui/ExplorationHUD.tsx`, `tests/run.ts`, `README.md` (uso de `?expedicion=v04b` y `?perf`); docs `decisions.md`, `status.md`, este plan.
- Checks del coordinador: tests 356/356 + spatial, build correcto, `git diff --check` limpio.
- Rendimiento (harness `--headed`, 1440×900, misma ejecución; evidencia fuera del repo): máximo V0.4B 253 llamadas / 18.867 triángulos / 37 geometrías / 3 texturas frente a máximo legado 293 / 21.759 / 39 / 3 (límite +25 % cumplido); sin fugas tras dos circuitos (geometrías/texturas iguales al volver a 01); FPS mediana 144 V0.4B vs 143,2 legado (ratio 1,006; ambas al tope del refresco). El diseñador confirmó fluidez en su equipo.
- Inspección visual: 65 capturas de las 19 salas y estados (bloqueo con motivo, Titán sellado/abierto, altar, inscripción, pedestales, puzle resuelto, muro, combate 04) a 1440×900 y 1024×768; correcciones dentro del alcance durante la implementación. Móvil (<640 px) no inspeccionado.
- Revisión: completa, aprobada sin bloqueantes; legado verificado línea a línea. No bloqueantes aceptados sin cambio: motivo de sello con «sala 12» en lugar del nombre oficial; desplazamiento fijo del muro agrietado. Ciclos correctivos 0/2.
- Playtesting: **aceptado por el diseñador 2026-11-08** («Todo bien, cerrar»).
- Decisiones en decisions.md: «M6b aprobado por el diseñador» (acceso, combates, representación, rendimiento obligatorio).
- Pendientes: zona de 03/10 provisional; agotamiento mutuo (M8); cofres (M7).
- Cierre: commit local `juego-cartas: cerrar V0.4B M6b de expedición 3D jugable`, sin push.

## V0.4B M7 — cofres y 31 premios únicos (cerrado 2026-11-08)

### Brief

- Autorización: el diseñador autorizó M7 y decidió destino, aviso y estado bloqueado, 2026-11-08 (decisions.md «M7 aprobado por el diseñador»).
- Alcance: once cofres V0.4B visibles en 3D en sus salas (`v04bMap.ts`), interacción E validada por posición, concesión atómica con `grantCreatureCopies` (evento único por cofre, copias sanas en reserva), estado abierto persistente en la expedición y no reactivado por el ciclo de ratas, aviso de motivo si no está disponible, panel de premios con nombres oficiales (E/Esc, foco al avatar), Colección refleja las copias nuevas. Expedición inicia con las ocho iniciales de `createV04BInitialSession()`.
- Fuera de alcance: V0.4B por defecto, integración y balance (M8), juego legado, scroll de Colección, agotamiento mutuo.
- Criterios de aceptación: sin parámetro el legado es idéntico (suite legada intacta); los 11 cofres aparecen, alcanzables sin bloquear salidas ni colisiones; disponibilidad según M6a (13/15 al llegar, 12 con puzle, 03 tras B1, 14 tras B2, 04/07/09/16/17/18 tras victoria alguna vez); cada cofre concede exactamente sus cartas una vez; reclamar todos lleva a 39 copias/21 tipos con cupos = máximos; pérdida previa de copia no impide reclamar (MIG-D01); bloqueado en combate; ciclo de ratas no reactiva; rendimiento sin regresión frente a M6b (+25 % máximo legado, sin fugas); tests previos + nuevos y build correctos; inspección visual de cofres cerrado/bloqueado/abierto y panel a 1440×900 y 1024×768.
- **Mecánicas e invariantes:** decisions.md §2; MIG-D01; M5/M6 y sus contratos; `ACTIVE_CONTENT = LEGACY_CONTENT` por defecto.
- Decisiones creativas: ninguna abierta.
- Revisión: completa. Playtesting humano: **requerido** antes del cierre.
- Modelos: implementer opus (3D/UI), reviewer sonnet.

### Baseline

- `HEAD 0e0d2b5012319ed5191cf79359251a7508826f1a`, árbol limpio; cambios de esta sesión incluidos en M7: `docs/decisions.md`, `docs/implementation-plan.md`.

### Resultado

- Rutas: `src/engine/{v04bWorld,v04bSpatial,v04bPlay}.ts` (`openChest`, evento `v04b-chest:<sala>`, estado abierto derivado de `grantedCopyEventIds`, ancla común de cofre), `src/adventure/{types,v04bAdventure}.ts` (`reward` opcional; el legado no lo devuelve), `src/ui/ChestRewardOverlay.tsx` (nuevo), `src/ui/v04bMessages.ts`, `src/App.tsx`, `src/scene/V04BActors.tsx`, `src/styles.css`, `tests/m7.tsx` (nuevo), `tests/run.ts`, `tests/m6b.tsx` (aserción «cofres ocultos» sustituida por la expectativa M7); docs `decisions.md`, este plan.
- Checks del coordinador: tests 369/369 + spatial, build correcto (aviso de bundle conocido), `git diff --check` limpio, rutas dentro del alcance.
- Rendimiento (harness `--headed`, 1440×900; evidencia fuera del repo): máximo V0.4B 269 / 18.915 / 39 / 3 frente a legado 293 / 21.759 / 39 / 3; sin fugas tras dos circuitos; FPS mediana 143,1 vs 144,0 (tope de refresco).
- Inspección visual: cofre bloqueado con motivo, disponible, abierto, panel y Colección a 1440×900 y 1024×768 con estados de fixture; corregida la altura del panel.
- Revisión: aprobada sin bloqueantes. No bloqueantes: E sobre cofre abierto da motivo genérico (ruta no ofrecida en la UI); el aviso «Abres el cofre…» aparece tras cerrar el panel, duplicando información; el panel muestra el identificador interno de copia. Ciclos correctivos 0/2.
- Limitaciones: ancla de cofre común a las 11 salas; retratos genéricos de cartas V0.4B (estilo existente).
- Playtesting: **aceptado por el diseñador 2026-11-08** («Todo bien, cerrar»); no bloqueantes aceptados sin cambio.
- Cierre: commit local `juego-cartas: cerrar V0.4B M7 de cofres y premios únicos`, sin push.

## V0.4B M8a — mazo exhausto y rendirse (cerrado 2026-11-08)

### Brief

- Autorización: el diseñador autorizó M8 por fases y la regla «Mazo exhausto», «Rendirse» y su alcance, 2026-11-08 (decisions.md §3).
- Alcance: perfil V0.4B únicamente. (1) «Mazo exhausto: refuerzos de la cripta» según decisions.md, en duelos y escaramuzas: invocación rival N/N creciente (1/1, 2/2…) por cada mantenimiento del jugador sin robo posible, no bloquea, no sacrificable por el rival, no cuenta para A04, afectable por efectos del jugador, no cuenta para la victoria de escaramuza, sin colección/cupos/premios/persistencia; derrota normal. Nombre provisional «Eco de la cripta» con representación sencilla en la mesa e indicador visible de mazo agotado con el tamaño de la próxima invocación. (2) Botón «Rendirse» con confirmación, en el turno del jugador sin selección pendiente; derrota normal (+1 fatiga) y vuelta a exploración. (3) Simulación: los diez encuentros terminan en un número acotado de turnos con jugadores automáticos variados (incluido el que nunca bloquea y uno con solo ATQ 0), incluidos 18/semilla 5 y 18/semilla 8; retirar la aceptación de esos casos colgados.
- Fuera de alcance: V0.4B por defecto e integración completa (M8b), IA nivel 2 y balance (M8c), legado, scroll de Colección.
- Criterios de aceptación: legado idéntico (suite legada intacta); reglas (1)–(2) cubiertas por pruebas de dominio (aparición y tamaño, sin bloqueo, IA no la sacrifica, A04 no la cuenta, N01/A03 la afectan, escaramuza se gana sin eliminarla, derrota normal); rendirse con confirmación, bloqueado durante selección, liquida derrota normal; simulación sin combates colgados; tests previos + nuevos y build correctos; inspección visual de la mesa con invocación, indicador y confirmación de rendirse a 1440×900 y 1024×768.
- **Mecánicas e invariantes:** decisions.md §2; M2–M7 y sus contratos; IA nivel 1; `ACTIVE_CONTENT = LEGACY_CONTENT` por defecto.
- Decisiones creativas: ninguna abierta (nombre y aspecto provisionales aceptados).
- Revisión: completa. Playtesting humano: **requerido**.
- Modelos: implementer sonnet (lógica con UI acotada), reviewer sonnet.

### Baseline

- `HEAD dc03b34`; cambios previos de esta sesión incluidos en M8a: `docs/decisions.md`, `docs/status.md`, este plan.

### Resultado

- Rutas: `src/engine/{types,rules,enemy}.ts` (Eco `echo`/`echoCount`, creación en `endTurn` solo V0.4B, `surrender`/`surrenderAvailability`, exclusiones de bloqueo, sacrificio, A04 y curas), `src/ui/{CombatView,CardViews,GameIcons,combatActions}.ts(x)`, `src/ui/combat.css`, `src/App.tsx`, `tests/m8a.tsx` (nuevo), `tests/m4.ts` (retirada la aceptación de 18/5 y 18/8), `tests/run.ts`; docs `decisions.md`, `status.md`, este plan.
- Checks del coordinador: tests 396/396 + spatial, build correcto, `git diff --check` limpio, rutas dentro del alcance.
- Simulación: diez encuentros × semillas 1–8 × ambos iniciales con tres estrategias (todo al ataque sin bloquear, solo bloquear, solo ATQ 0), cota 40 turnos; máximos medidos 18/24/12. Simulación M4 sin casos colgados.
- Inspección visual: Eco en mesa, indicador de mazo agotado y confirmación de rendirse a 1440×900 y 1024×768 con estado de fixture; foco y Esc comprobados por script; 0 errores de consola.
- Revisión: aprobada sin bloqueantes. Dudas del implementer resueltas por el diseñador (Eco no curable; rendirse en principal y ataque; Eco ficha normal salvo exclusiones). Ciclo correctivo 1/2 (filtro de curas) revisado y aprobado.
- Playtesting: **aceptado por el diseñador 2026-11-08** («Todo bien, cerrar»).
- Cierre: commit local `juego-cartas: cerrar V0.4B M8a de mazo exhausto y rendirse`, sin push.
