# Informe de validación del prototipo RPG de cartas

**Versión:** 0.1
**Fecha:** 22 de octubre de 2026
**Proyecto:** `projects/juego-cartas`
**Especificación evaluada:** [`rpg-cartas-prototype-spec-v0.2.md`](rpg-cartas-prototype-spec-v0.2.md)
**Plan de implementación:** [`rpg-cartas-implementation-plan-v0.1.md`](rpg-cartas-implementation-plan-v0.1.md)
**Resultado:** los 12 criterios de aceptación se consideran cumplidos con la evidencia de código, pruebas automatizadas registradas y recorridos manuales confirmados por el usuario.

## Alcance y fuentes de evidencia

Esta revisión cubre los 12 criterios mínimos de aceptación de la especificación funcional. No modifica ni amplía el diseño aprobado.

Las fuentes de evidencia se distinguen así:

- **Código y pruebas automatizadas:** inspección de los módulos actuales de `projects/juego-cartas/` y sus casos en `tests/run.ts`. Los resultados nuevos de comandos ejecutados por Codex durante el cierre se registran en la sección «Verificaciones ejecutadas por Codex».
- **Pruebas manuales:** el usuario confirma que realizó estas comprobaciones durante los Hitos 1–6 y confirma también haber realizado las comprobaciones adicionales de cierre descritas en su instrucción. Codex no realizó esos recorridos ni les atribuye resultados más específicos que esa confirmación.
- **Registros previos:** el plan documenta 32/32 pruebas automatizadas y build correcto en Hito 6, además de la finalización manual de los tres encuentros. Son resultados históricos, separados de los comandos ejecutados por Codex para Hito 7.

## Criterios de aceptación

| # | Criterio | Estado | Evidencia técnica y manual |
|---|---|---|---|
| 1 | Iniciar un duelo y completarlo. | Cumplido | El inicio desde la mazmorra está conectado en `src/App.tsx` (`enterEncounter`, `closeDuel`); el motor concluye al reducir a cero la vida del invocador en `src/engine/rules.ts` (`resolveCombat`). `tests/run.ts` incluye victorias y derrotas. El usuario confirma recorridos manuales de combates, victorias y derrotas; el registro del Hito 6 anota la progresión completa de los tres encuentros. |
| 2 | Robar cartas e invocar criaturas. | Cumplido | `src/engine/rules.ts` define mano inicial, robo de mantenimiento, costes de maná y sacrificios (`createDuel`, `summonCreature`, `endTurn`). `tests/run.ts` cubre estado inicial, robo, invocación y costes. El usuario confirma haber probado manualmente invocaciones y sacrificios. |
| 3 | Declarar ataques y bloqueos. | Cumplido | `src/engine/rules.ts` valida atacantes y asignaciones de bloqueadores; `src/App.tsx` expone sus controles. `tests/run.ts` cubre declaración, bloqueos múltiples y bloqueadores únicos por atacante. El usuario confirma haber probado ataques y bloqueos manualmente. |
| 4 | Resolver daño entre criaturas e invocadores. | Cumplido | `resolveCombat` en `src/engine/rules.ts` resuelve daño simultáneo entre criaturas, daño de ataques sin bloqueo y victoria al alcanzar cero de vida. Las pruebas cubren daño letal, daño persistente y victoria/derrota. El usuario confirma la prueba manual de combate y sus resultados. |
| 5 | Mantener el daño recibido entre enfrentamientos. | Cumplido | `src/engine/session.ts` conserva salud individual por copia al cerrar y reconstruye las cartas con esa salud al comenzar otro duelo. `tests/run.ts` verifica la herida persistente. El usuario confirma haber probado heridas persistentes manualmente. |
| 6 | Eliminar permanentemente las criaturas que mueran. | Cumplido | `finishSessionDuel` en `src/engine/session.ts` retira las copias muertas o sacrificadas de la colección y baraja activa, conservando el desbloqueo. `tests/run.ts` cubre bajas y sacrificios. El usuario confirma estas comprobaciones manuales. |
| 7 | Editar la baraja fuera de combate. | Cumplido | `addCopyToActiveDeck`, `removeCopyFromActiveDeck` y `startSessionDuel` en `src/engine/session.ts` gestionan la selección y el orden; `src/App.tsx` habilita los controles entre duelos. Las pruebas cubren selección, baraja vacía y copias fuera de la baraja. El usuario confirma gestión manual de colección y barajas. |
| 8 | Obtener una carta mediante un desbloqueo. | Cumplido | `recordEncounterVictory` en `src/engine/exploration.ts` otorga el descubrimiento único del primer encuentro; `unlockCreatureType` entrega la copia en `src/engine/session.ts`. `tests/run.ts` verifica Brote de musgo y que no se añada automáticamente a la baraja. El usuario confirma haber probado el desbloqueo manualmente. |
| 9 | Participar en varios duelos consecutivos. | Cumplido | `src/engine/exploration.ts` abre el siguiente encuentro tras una victoria y mantiene bloqueados los posteriores; `src/engine/content.ts` define tres encuentros. Hay pruebas de progresión y el registro de Hito 6 confirma que el usuario completó los tres manualmente. |
| 10 | Aplicar y recuperar fatiga. | Cumplido | `finishSessionDuel` aplica +1 tras derrota y −1 hasta cero tras victoria; `baseMana` aplica el mínimo de cero en `src/engine/rules.ts`. `tests/run.ts` cubre derrotas consecutivas, victorias, fatiga cero y maná bloqueado. El usuario confirma haber probado manualmente fatiga y bloqueo de maná. |
| 11 | Recuperar toda la vida del invocador tras victoria o derrota. | Cumplido | `closeDuel` en `src/App.tsx` restablece la vida del jugador a 20; `finishSessionDuel` reinicia el registro de vida de sesión. `tests/run.ts` cubre victoria y derrota. El usuario confirma expresamente la comprobación manual de recuperación de vida. |
| 12 | Continuar el ciclo de juego después de una derrota. | Cumplido | `recordEncounterDefeat` conserva disponible el encuentro; la interfaz informa que se puede editar la baraja y reintentar (`src/App.tsx`). `tests/run.ts` cubre derrota y reintento con estado persistente. El usuario confirma haber probado reintentos y continuidad manualmente. |

## Verificaciones ejecutadas por Codex

Se ejecutaron estos comandos como parte del cierre documental:

| Comando | Resultado |
|---|---|
| `npm.cmd run test` | Aprobado: 32/32 pruebas automatizadas. Exit code 0. |
| `npm.cmd run build` | Aprobado: compilación TypeScript y build Vite. Bundle principal de 1.160,64 kB sin comprimir (318,47 kB gzip). Vite emitió el aviso de chunks superiores a 500 kB. Exit code 0. |
| `git diff --check` | Aprobado: exit code 0, sin errores de whitespace. Git mostró avisos de conversión LF→CRLF para los archivos Markdown editados. |

En el cierre del Hito 7, Codex ejecutó `npm.cmd run test`, `npm.cmd run build` y `git diff --check` directamente. Los comandos terminaron correctamente. El tamaño del bundle y el aviso de Vite coinciden con lo registrado en Hito 6. No se ejecutó recorrido manual de Codex: las pruebas manuales se atribuyen a la confirmación del usuario que consta abajo.

## Comprobaciones manuales confirmadas por el usuario

El usuario confirma haber realizado durante los Hitos 1–6 las pruebas manuales de combates, victorias y derrotas, ataques y bloqueos, invocaciones y sacrificios, heridas persistentes, pérdidas permanentes, recuperación completa de vida del invocador, fatiga y bloqueo de maná, gestión de colección y barajas, desbloqueo de Brote de musgo, reintentos y progresión completa de la mazmorra.

El usuario también confirma haber realizado las comprobaciones manuales adicionales contempladas en la auditoría. Esta confirmación es evidencia informada por el usuario; no se atribuye a una ejecución manual de Codex ni se añaden detalles de navegador, secuencias, valores o resultados que no estén documentados.

## Decisiones provisionales y diferencias respecto a reglas no especificadas

Se mantienen las decisiones de implementación registradas en el plan, entre ellas:

- Estado de reglas y partida separado de React; pruebas con TypeScript compilado y Node.js, sin framework de pruebas externo.
- Estado conservado en memoria durante la sesión del navegador, sin restauración después de cerrar o recargar.
- Orden fijo de robo y mazos para resultados repetibles; mantenimiento inicial al crear el duelo y mantenimiento en el cambio de turno.
- Bloqueadores múltiples ordenados por el defensor; el atacante asigna daño letal en ese orden y el daño entre criaturas se resuelve simultáneamente.
- Política simple y determinista del enemigo; su bloqueo asigna como máximo un bloqueador a cada atacante.
- Límite provisional de una copia por tipo; el primer desbloqueo añade una copia a la colección, pero no la incorpora automáticamente a la baraja.
- Tres encuentros lineales; Brote de musgo se desbloquea al ganar el primer encuentro.
- Fatiga según la fórmula aprobada, con mínimo de cero para el maná utilizable.

La especificación deja abiertos detalles como el orden del mazo de duelo, el comportamiento del enemigo, el reparto de daño entre bloqueadores múltiples y el contenido concreto. Las decisiones correspondientes están registradas en el plan; esta validación no las modifica.

## Limitaciones intencionales y observaciones de playtesting

- La persistencia dura solo durante la sesión actual del navegador. Recargar o cerrar la página reinicia la partida.
- La derrota a nivel 1 puede dejar fatiga 1 y maná utilizable 0. Esta consecuencia puede limitar las invocaciones con coste de maná y está aceptada por la especificación; no se cambia aquí.
- No se implementa progresión de nivel porque la especificación no define cómo subir de nivel.
- El mapa de exploración es 3D; los combates son 2D provisionales. El acabado visual del mapa y del prototipo queda pendiente de una futura fase, según las observaciones del playtesting.
- El usuario completó la mazmorra de tres encuentros, aunque requirió varios intentos. Informó que las criaturas se pierden más rápido de lo que se obtienen nuevas copias y que una sola carta descubierta no necesariamente compensa el desgaste acumulado.
- El usuario también observó que las mecánicas principales funcionan y comienzan a resultar entretenidas; el mapa 3D cumple su función provisional.
- Estas observaciones no autorizan cambios de reglas, estadísticas, recompensas, enemigos o presentación visual.

El registro de Hito 6 mostró un aviso de Vite por un bundle principal superior a 500 kB. El build actual confirma el mismo aviso y tamaño del bundle; este informe no introduce cambios de optimización.

## Alcance futuro excluido

La revisión del alcance no identificó implementación de las funcionalidades reservadas en la especificación: creación o reinvocación mediante habilidades, fichas, buffs persistentes, descanso o curación avanzada, rendición, habilidades adicionales, arquetipos, torneos, mazmorras complejas, puzles o sistemas avanzados de recompensas.

## Conclusión

La evidencia disponible y las confirmaciones manuales del usuario respaldan el cumplimiento de los 12 criterios de aceptación. Los ajustes de este cierre son documentales; no cambian la implementación del juego, sus reglas, estadísticas, recompensas ni presentación visual.
