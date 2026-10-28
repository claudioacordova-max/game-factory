> Archivo histórico trasladado el 2026-10-28 desde `docs/rpg-cartas-iteration-v1-balance.md`. Conserva el contexto y las afirmaciones de su etapa; la referencia consolidada vigente es [spec-v1.md](../spec-v1.md) y la continuidad está en [implementation-plan.md](../implementation-plan.md). Las rutas de los registros de ejecución son históricas; los enlaces navegables se adaptaron al traslado.

# RPG de cartas — evidencia técnica de expediciones H6

Fecha: 2026-10-26. Resultado observado: **26 expediciones completas y una derrota en 27 políticas deterministas**, cuatro rescates críticos completos y cuatro continuaciones comparables de entrenamiento. Esto acredita secuencias legales y continuidad técnica; no estima probabilidad humana de victoria ni acepta el balance o la experiencia. Playtesting humano y aceptación final pendientes.

## Alcance y reproducción

Fuente de autoridad: [anexo aprobado D01–D12](iteration-v1.md), [catálogos archivados](iteration-v1) y [especificación original](prototype-spec-v0.2.md). El modelado heurístico anterior no se usa como prueba. Se añadió exclusivamente el [harness](../../tests/expedition.ts), este informe y la [guía humana](iteration-v1-playtesting.md). No se modificaron reglas, estadísticas, IA enemiga, UI, dependencias, Factory ni especificaciones. Sin staging, commits o push.

HEAD de partida y de estas comprobaciones: `2d477ff9ef793a8754f24826f763ade53b10b29f`. El árbol ya contenía los cambios H0–H5 y trabajo ajeno en App, motor, UI, estilos, runner, escena, pruebas, plan/anexo y archivos de traspaso/experimentos. Ninguno pertenece a este diff H6. Las tres rutas H6 eran nuevas. Los módulos probados son archivos de trabajo posteriores a HEAD, identificados por SHA-256:

| Módulo en `projects/juego-cartas/src/engine/` | SHA-256 |
|---|---|
| content.ts | `8FDF7518308497BCFD68EE8F058E52B283DE36EFE683DABA630F38B880CFC636` |
| rules.ts | `D73CA5DA50D0F1E9479C9FEDCBAB4B7E0152FBFD78D25AA4424435EC53A7FE16` |
| enemy.ts | `BF85B63704A1BEEAA276748007B75F1505CE45F915BF31E5AA16ED5343547E56` |
| session.ts | `1EB8F76B830CBE3221B2A8F130F399D61EB436E883FB839BD10242F482DD6050` |
| exploration.ts | `22E643D71E5E8C9C0E4199CBB25C630CEF8365DC84158312743F25FD1415EF31` |
| world.ts | `09D2A6953ABDB68EFC465A535E8AA3C08FDAFA3BFE46E5ACB3AF1345A2CFAB8E` |

Comandos ejecutados desde `projects/juego-cartas/`, sin generar temporales en el repositorio:

```powershell
node node_modules/typescript/bin/tsc -p tsconfig.test.json --outDir "$env:TEMP/game-factory-h6-tests"
node --experimental-default-type=module --input-type=module -e "const {pathToFileURL}=await import('node:url'); const m=await import(pathToFileURL(process.env.TEMP+'/game-factory-h6-tests/tests/expedition.js')); for(const t of m.expeditionTests){t.run();console.log('PASS',t.name)}"
```

TypeScript correcto; tres pruebas H6 correctas. Hubo un fallo transitorio anterior de compilación global mientras otro agente añadía `tests/presentation.ts`; se repitió la compilación completa cuando ese archivo estuvo disponible. El runner oficial queda a cargo del coordinador; este trabajo exporta `expeditionTests` sin modificarlo. Build, integración visual y revisión independiente final corresponden a los checks del coordinador; este informe no afirma haberlos realizado.

El módulo también exporta `runExpeditionMatrix()`, `runExpedition(route, order, policy)`, `runEpicPreparationComparison()`, `runCriticalRecovery(fatigue, mode)` y `EXPEDITION_LIMITS`. Sus valores retornados incluyen por encuentro snapshots de copias con ID/salud/bonos, mazo, máximo/fatiga, heridas, fuentes descubiertas, servicios gastados, bajas, vida final de combate, épicas invocadas supervivientes, turnos propios/alternantes, acciones y trazas; las reinvocaciones detallan ID nuevo, tipo, coste y máximo antes/después. Se pueden serializar con `JSON.stringify` fuera del repositorio. Los resultados de esta muestra no dependen del contador global de IDs de duelo.

## Método

Todas las expediciones comienzan mediante `createExpeditionState()` con las ocho copias aprobadas. Descubrimientos, cofres, puertas, ala y encuentros usan `objectsForRoom`, `interactWorldObject` y `settleExpeditionEncounter`; selección/reordenación/reinvocación usan sus APIs públicas reales. El harness envía poses cercanas transitables de las salas fijas; la API valida colisión, distancia y disponibilidad. No simula caminar ni demuestra controles, cámara, foco o accesibilidad del recorrido en pantalla.

No hay un segundo motor de daño. Las políticas consultan resultados de `summonCreature`, `declareAttackers`, `declareBlockers`, `resolveCombat`, `resolveEnemyBlocks`, `runEnemyTurn` y `endTurn`. Las acciones candidatas se calculan sobre estados inmutables; solo la elegida continúa la expedición. Los grupos reciben objetivos válidos, con ataques sumados y represalia compartida en orden de mesa por el motor. La IA enemiga conserva exactamente su política de producción.

Invariantes durante las transacciones: una copia/ID por tipo, descubrimientos con fuente legal, referencias activas válidas, mano/pila/campo propios disjuntos, salud individual válida, máximo 1–20, maná/fatiga válidos, bonos por tipo/cap +3, reinvocación con ID nuevo/base sana/sin bonos. Cada liquidación se repite y debe devolver el mismo estado; los incrementos observados requieren victoria con la copia invocada y viva. Se mantienen heridas, reservas, bajas, sacrificios, máximo, fatiga y servicios. Ninguna expedición recibe bonos inyectados, resultados terminales falsos o recompensas anticipadas.

Límites: 60 turnos **propios** por encuentro, 100 encuentros por ejecución, hasta 20 intentos de R1 para el ensayo de máximo y tres victorias de entrenamiento por etapa. Superar un límite devuelve `inconclusive` con diagnóstico; no cuenta como derrota. No hubo inconclusos en esta muestra. `alternatingTurn` es el contador del motor; por ejemplo T17 es el noveno turno propio. `actions` cuenta las acciones comprometidas de gestión/mundo/combate, incluidas las enemigas, y excluye previews de política; no mide clics o tiempo humano.

Las tres políticas comparten invocación simple: jugar primero las gratuitas sin sacrificio; después priorizar épicas y fuerza/aguante entre cartas asequibles; sacrificar primero la copia de menor valor, evitando épicas o una copia no semilla de ataque igual/superior a la invocada. No es una búsqueda de barajas ni un optimizador general.

- **pressure:** prioriza daño al invocador y tolera más pérdidas.
- **quality:** penaliza más perder calidad y heridas; gasta vida del héroe cuando no es letal. Su horizonte de un combate inmediato puede dejar una defensa futura insuficiente.
- **trades:** equilibrio entre presión, supervivencia y bloqueos conjuntos.

La puntuación usa diferencias de salud/vida y bajas **obtenidas del motor**. Valor de política: semilla=1; otras=`3×coste de reinvocación + ataque + salud/4`, con prima épica `8 + 3×bono`. Penalizaciones pérdida/herida/vida del héroe: pressure `(0,6;0,15;0,8)`, quality `(3;0,8;0,3)`, trades `(1,4;0,4;1,2)`. Premia bajas enemigas por 8, salud enemiga reducida por 1,5 y daño al invocador rival por 4/2/2. Ganar domina la puntuación; perder tiene penalización dominante, conservando preferencia por reducir el exceso letal para construir varios bloqueos necesarios. Son preferencias transparentes del ensayo, no reglas del juego ni indicadores de balance de cartas.

En duelos se ensayan todos los atacantes de ataque positivo y una pasada de exclusiones. En escaramuzas y defensa se ensayan singles/pares/tríos y el grupo restante por objetivo, con una pasada voraz. No anticipan próximos robos ni todas las respuestas futuras. En entrenamiento se espera hasta invocar las épicas previstas y se absorbe el ataque de la rata si no es letal, evitando cerrar R1 antes de que sean elegibles.

Órdenes completos (se filtran tipos aún no descubiertos; los ocho iniciales siguen siendo los mismos):

| Orden | Secuencia de IDs Pxx |
|---|---|
| baseline | 01,02,11,03,04,05,06,07,09,13,16,08,12,10,15,17,14,18 |
| offense | 02,06,11,05,09,01,03,04,16,13,18,17,14,15,10,08,07,12 |
| endurance | 03,09,11,01,05,04,07,06,02,16,17,18,12,15,13,14,08,10 |

Antes de cada encuentro normal se intenta reinvocar lo perdido en ese orden, solo si la API lo permite, y se selecciona/reordena. Se reclaman cofres al llegar. Un santuario disponible se usa antes del jefe si hay heridas. No se sana una copia mediante reinvocación ni se sustituyen heridas mientras la copia siga poseída.

- **progress:** B1→B2→B3, sin entrar al ala.
- **recovery:** una visita completa R1–R4 antes de B1 y otra después de B1/B2: doce encuentros voluntarios adicionales.
- **epic3:** una visita inicial R1–R4; tres R1 con P16 tras B1 y tres R1 con P16/P17/P18 tras reclamar el cofre del sector 3. Baraja de entrenamiento: P04, épicas descubiertas, P01,P03,P02. Vuelve a su orden normal en jefes. Son diez encuentros voluntarios adicionales; puede mantener épicas entrenadas en pila sin llegar a jugarlas en el jefe.

## Matriz acumulada de 27 recorridos

`V`=B3 ganado; `D`=derrota real (se detiene el recorrido, sin reintento automático). `E` encuentros, `T` turnos propios, `B` bajas acumuladas por ID, incluidos sacrificios y copias recreadas; `H` suma de copias heridas observadas tras encuentros, pudiendo contar varias veces una herida persistente. `R/HP` reinvocaciones pagadas / gasto total de máximo. `M/F` máximo/fatiga finales. `Farm` encuentros voluntarios. Bonos finales se muestran solo de épicas aún poseídas; ausencia significa pérdida, no bono cero.

| Ruta | Orden | Política | Fin | E | T | B | H | R/HP | M/F | Farm | Bonos finales |
|---|---|---|---|---:|---:|---:|---:|---|---|---:|---|
| progress | baseline | pressure | V | 3 | 20 | 19 | 0 | 5/7 | 20/0 | 0 | 16:1,17:0,18:0 |
| progress | baseline | quality | V | 3 | 21 | 18 | 2 | 3/4 | 20/0 | 0 | 16:1,17:0,18:0 |
| progress | baseline | trades | V | 3 | 20 | 18 | 1 | 3/4 | 20/0 | 0 | 16:1,17:0,18:0 |
| progress | offense | pressure | V | 3 | 22 | 18 | 4 | 5/6 | 20/0 | 0 | 16:1,17:0,18:1 |
| progress | offense | quality | D B3 | 3 | 12 | 12 | 3 | 2/3 | 17/1 | 0 | 16:0,17:0,18:0 |
| progress | offense | trades | V | 3 | 14 | 12 | 4 | 2/3 | 20/0 | 0 | 16:1,17:0,18:1 |
| progress | endurance | pressure | V | 3 | 15 | 9 | 5 | 2/3 | 20/0 | 0 | 16:0,17:0,18:0 |
| progress | endurance | quality | V | 3 | 13 | 5 | 8 | 0/0 | 20/0 | 0 | 16:0,17:0,18:0 |
| progress | endurance | trades | V | 3 | 13 | 6 | 6 | 1/1 | 20/0 | 0 | 16:0,17:0,18:0 |
| recovery | baseline | pressure | V | 15 | 35 | 31 | 18 | 5/7 | 20/0 | 12 | 16:1,17:0,18:0 |
| recovery | baseline | quality | V | 15 | 35 | 28 | 21 | 4/6 | 20/0 | 12 | 16:0,17:0,18:0 |
| recovery | baseline | trades | V | 15 | 35 | 30 | 19 | 4/6 | 20/0 | 12 | 16:1,17:0,18:0 |
| recovery | offense | pressure | V | 15 | 37 | 30 | 26 | 9/11 | 20/0 | 12 | 16:1,17:0,18:1 |
| recovery | offense | quality | V | 15 | 30 | 24 | 26 | 6/8 | 20/0 | 12 | 16:1,17:0,18:1 |
| recovery | offense | trades | V | 15 | 29 | 24 | 26 | 6/8 | 20/0 | 12 | 16:1,17:0,18:1 |
| recovery | endurance | pressure | V | 15 | 30 | 16 | 32 | 6/8 | 20/0 | 12 | 16:0,17:0,18:0 |
| recovery | endurance | quality | V | 15 | 28 | 13 | 33 | 3/4 | 20/0 | 12 | 16:0,17:0,18:0 |
| recovery | endurance | trades | V | 15 | 28 | 13 | 31 | 5/6 | 20/0 | 12 | 16:0,17:0,18:0 |
| epic3 | baseline | pressure | V | 13 | 40 | 32 | 14 | 5/7 | 20/0 | 10 | 16:3,17:3,18:3 |
| epic3 | baseline | quality | V | 13 | 40 | 29 | 20 | 3/3 | 20/0 | 10 | 16:3,17:3,18:3 |
| epic3 | baseline | trades | V | 13 | 41 | 33 | 17 | 5/6 | 20/0 | 10 | 16:3,17:3,18:3 |
| epic3 | offense | pressure | V | 13 | 41 | 31 | 18 | 7/9 | 20/0 | 10 | 16:3,17:3,18:3 |
| epic3 | offense | quality | V | 13 | 36 | 25 | 19 | 3/4 | 20/0 | 10 | 17:3,18:3 |
| epic3 | offense | trades | V | 13 | 34 | 24 | 20 | 3/4 | 20/0 | 10 | 16:3,17:3,18:3 |
| epic3 | endurance | pressure | V | 13 | 36 | 22 | 22 | 4/5 | 20/0 | 10 | 16:3,17:3,18:3 |
| epic3 | endurance | quality | V | 13 | 33 | 16 | 26 | 0/0 | 20/0 | 10 | 16:3,17:3,18:3 |
| epic3 | endurance | trades | V | 13 | 33 | 17 | 24 | 2/2 | 20/0 | 10 | 16:3,17:3,18:3 |

Las 18 expediciones con ala descubren los 18 tipos mediante sus fuentes exactas. Las nueve sin ala descubren 16: P08/P12 requieren su cofre. Ningún resultado afirma mantener todas las copias vivas. Por ejemplo, ganar con 19 bajas acumuladas puede ser técnicamente posible y poco satisfactorio para una persona.

## Trazas representativas

**Sin farm, baseline/trades:** B1 inicia 20/0, gana en cuatro turnos propios con vida de combate 20; pierde P01/P02/P03 y P11 queda a 1. Se recrean las tres semillas gratis y el santuario del sector 2 sana a P11 antes de B2. B2 gana en siete turnos propios, vida 9; pierde siete copias. Antes de B3 se recrean semillas y se pagan P11=2, P05=1, P06=1: máximo 20→16. B3 gana en nueve turnos propios, vida 14, restaura máximo 20. En su último turno se invoca P16 sacrificando P09, y P06/P13/P16 atacan: P16 sobrevive y obtiene su primer +1, aunque P17/P18 permanecen sin progreso.

**Épicas acumuladas, endurance/trades:** visita inicial R1/R2/R3/R4 gana en 1/1/1/2 turnos propios; las heridas P03 3→2→1 y P09 4→2→1 persisten, y ambas copias llegan a perderse. Se paga P09=1 antes de B1. B1 gana en tres turnos propios; tres R1 llevan la misma P16 0→1→2→3, sacrificando/recreando P04 y conservando las heridas de P16. B2 gana en tres turnos propios. Se paga otra P09=1, se recrean semillas y se entrenan juntas las tres épicas en tres R1 (cuatro turnos propios cada uno). Antes de B3, el santuario del sector 3 sana al máximo individual vigente, incluido P17 11; B3 gana en siete turnos propios, vida 17, conservando los tres bonos +3. Total: 33 turnos propios, 17 bajas, dos reinvocaciones pagadas, dos puntos de máximo gastados.

Primer R1 de entrenamiento conjunto de esa expedición, con máximo 19/fatiga 0:

```text
Propio 1 (T1): P04; P16 sacrifica P04. Pasar ataque.
Enemigo (T2): absorber E01; vida 19→18.
Propio 2 (T3): P17 aún no tiene semilla sacrificable. Pasar.
Enemigo (T4): absorber E01; vida 18→17.
Propio 3 (T5): robar/jugar P01; P17 sacrifica P01. Pasar.
Enemigo (T6): absorber E01; vida 17→16.
Propio 4 (T7): robar/jugar P03; invocar P18; P16 ataca E01.
Victoria: P16 sigue +3; P17 0→1 salud 8→9; P18 0→1.
```

P17/P18 ganan el bono sin atacar ni bloquear. Las siguientes victorias mantienen sus identidades y llegan a +2/+3, sin asignar bajas ni fabricar bonos.

**Derrota conservada, progress/offense/quality:** B1/B2 ganados en 2/3 turnos propios. Antes de B3 se pagan P06=1 y P11=2: máximo 17. La política absorbe ataques para proteger calidad, baja vida 17→13→4 y llega tarde a las épicas. Se defiende después con múltiples bloqueos reales, pero pierde ocho copias y termina derrotada en su séptimo turno propio (T14 enemigo), vida −3; la sesión queda máximo 17/fatiga 1, vida restaurada 17 y ocho copias. El valor negativo es exceso de daño al héroe dentro del duelo, no máximo negativo. No se reinicia, fuerza un ganador o prueba que ese estado sea irrecuperable.

## Comparación 0/1/2/3 victorias de entrenamiento

Las cuatro ramas parten de una copia profunda del **mismo checkpoint ganado legalmente** desde ocho iniciales: cofre del sector 1, selección endurance/trades y victoria B1 en tres turnos propios, vida 20, ninguna baja. Copias, heridas, máximo, fatiga, cofres y disponibilidad de santuarios se preservan. Cada continuación vuelve a ejecutar acciones y combates reales; la copia de checkpoint solo permite comparar alternativas, no corresponde a guardado/rollback del producto.

En las cuatro: B2/B3 usan el mismo orden adelantando `P04, épicas descubiertas, P01,P03,P02`, seguido de endurance sin duplicados. Se entrenan P16 antes de B2 y P16/P17/P18 antes de B3 en 0/1/2/3 R1 por etapa. Todas reclaman únicamente cofres de sectores y usan una vez los santuarios 2/3 tras preparar la baraja; llegan sin heridas a los jefes. B2 empieza máximo 20/fatiga 0 y B3 máximo 17/fatiga 0 en todas, con dos reinvocaciones pagadas y gasto total 3 en todas. No se igualaron recursos mediante resets.

| R1 por etapa | Farm total | Bonos antes B2 (16) | Bonos antes B3 (16/17/18) | T B2 / B3 | T totales | Bajas | Vida al ganar B3 | Épicas finales |
|---:|---:|---|---|---|---:|---:|---:|---|
| 0 | 0 | 0 | 1/0/0 | 8 / 9 | 20 | 12 | 1 | Ninguna |
| 1 | 2 | 1 | 3/1/1 | 8 / 7 | 23 | 14 | 1 | P16 +3 |
| 2 | 4 | 2 | 3/2/2 | 7 / 6 | 26 | 16 | 1 | P16 +3, P18 +3 |
| 3 | 6 | 3 | 3/3/3 | 7 / 6 | 31 | 19 | 1 | P16 +3, P18 +3 |

Todas ganan B3 con esa política; P17 muere incluso entrenada +3. La variante 0 tiene cero farm voluntario, pero P16 obtiene +1 legal al sobrevivir B2. La variante 1 llega a P16 +3 porque suma entrenamiento, victoria B2 y entrenamiento posterior; «una visita» no significa «bono final +1». El entrenamiento reduce turnos de jefe en esta muestra, pero aumenta turnos totales y sacrificios. El tercer entrenamiento no reduce los turnos B2/B3 respecto al segundo. No permite concluir una relación causal universal, equivalencia con todas las barajas, ni rentabilidad humana del tiempo invertido.

## Recuperación crítica real

Fixture inicial **solo técnica**, explícita: máximo/vida 1, fatiga 1 o 4, únicamente P01–P04 descubiertos, cero copias poseídas y ninguna referencia de baraja. No es una partida completa desde ocho ni un estado disponible como preset de UI. Desde allí todo se obtiene por acciones reales; solo se recrean/seleccionan semillas, incluso después de abrir el cofre.

| Fatiga inicial | Ruta | Encuentros ganados | T propios | Acciones | Reinvocaciones gratis | Bajas | Máximo/fatiga final | Cofres |
|---:|---|---:|---:|---:|---:|---:|---|---:|
| 1 | R1 hasta máximo 20, luego R1→R4 | 23 | 31 | 355 | 14 | 12 | 20/0 | 1 |
| 4 | R1 hasta máximo 20, luego cuatro visitas R1→R4 | 35 | 67 | 781 | 32 | 30 | 20/0 | 1 |
| 1 | Directa R1→R4 | 4 | 8 | 104 | 8 | 5 | 20/0 | 1 |
| 4 | Directa, cuatro visitas R1→R4 | 16 | 32 | 407 | 23 | 20 | 20/0 | 1 |

En la ruta de máximo se ganan 19 R1, saliendo y reentrando realmente al ala: primero P01 ataca y queda a 1; después P02 intercambia y muere; posteriores R1 usan P03 conservando sus heridas hasta perderla/recrearla. El máximo sube 1→20 sin coste y la fatiga no baja. Esta ruta voluntariamente ineficiente muestra persistencia y techo, no una recomendación de 19 combates para cada rescate.

La ruta directa usa orden P01,P02,P03,P04, recreando solo semillas muertas entre encuentros:

| Encuentro | Ataques dirigidos del primer turno | Máximo, primera visita | Fatiga con inicio 4 |
|---|---|---|---|
| R1 | P01→E01 | 1→2 | 4→4 |
| R2 | P01+P02→E03; P03→E01 | 2→3 | 4→4 |
| R3 | P01→E01; P02→E02; P03→E04 | 3→4 | 4→4 |
| R4 | Atacar con semillas ofensivas; defensa real | 4→20 | 4→3 |

En R4, primer turno P01/P02/P03 infligen 4 al invocador; en turno enemigo P03 bloquea E01 y P02 bloquea E05, eliminando ambos enemigos y perdiendo P02. P04 se roba después. P01/P03 repiten ataques de 2 hasta ganar en cinco turnos propios, conservando vida del héroe 4 y heridas P01=1/P03=2. El cofre se abre una vez, añade P08/P12 a reserva. Se sale/reentra y repite la visita completa: las otras R4 dejan fatiga 3→2→1→0 sin duplicar cofre; semillas heridas o muertas conservan consecuencias entre visitas. Las cuatro variantes terminan con heridas, sin sanación ficticia.

## Riesgos y siguientes decisiones

El baseline tiene rutas ganadoras con y sin ala, reinvocaciones pagadas y crecimiento legítimo. B3 exige más que llegar con muchas copias; el orden y el momento de gastar vida importan. La muestra no demuestra que todo estado sea ganable, que una política de un turno sea competente en todos los casos, ni que las pérdidas sean aceptables para una persona. El ensayo se detiene tras la primera derrota principal; no mide toda la recuperación desde esa derrota.

La repetición R1 puede entrenar simultáneamente varias épicas y alcanzar cap en tres victorias; exige esperar robos/semillas y mantenerlas vivas. Un orden largo puede dejar esas épicas sin jugar en el jefe. Entrenarlas consume más turnos que los ahorrados en la comparación concreta y puede terminar con una épica perdida; medir comprensión, apego, frustración y tiempo de navegación/farm con humanos antes de ajustar cifras.

La ruta directa severa es mucho más corta que farmear máximo con R1, pero fatiga 4 aún exige cuatro visitas completas y 32 turnos propios. Falta saber si el jugador descubre ese camino y lo disfruta. Recomendar al diseñador evaluar señalización del papel de R4, sensación de coste de reinvocación y utilidad de los santuarios durante los tres recorridos de la guía. Cualquier rebalanceo futuro requiere autorización; aquí no se aplicó ninguno.

La ejecución de CPU no mide tiempo humano. 26/27 es una fracción de **esta muestra de políticas y órdenes**, nunca tasa de victoria humana. No se realizaron playtesting humano, inspección renderizada o aceptación mediante este harness. El cierre de H6 permanece pendiente del procedimiento y la aceptación de la versión integrada.
