# Informe de balance V0.4B M8c

Datos medidos con la IA nivel 2 (heurísticas aprobadas 2026-11-08) frente al nivel 1 de referencia. **No se ha cambiado ningún número del contenido real**; las propuestas de cifras se simularon reescribiendo solo el duelo recién creado en la simulación. Todas son **propuestas para el diseñador**, no decisiones.

## Método

- Código: `tests/balance.ts` (bucle de duelo y estadísticas), `tests/balanceWhatIf.ts` (variantes solo de simulación), `tests/balanceRun.ts` (informe) y `tests/m8c.tsx` (versión reducida dentro de la suite). Sin dependencias nuevas.
- Informe completo (unos 3 s): `npx.cmd tsc -p tsconfig.test.json && node .test-dist/tests/balanceRun.js [--quick] [--what-if]` desde `projects/juego-cartas/`. Determinista.
- Diez encuentros × semillas 1-20 × ambos jugadores iniciales = 40 duelos por celda. Rival nivel 1 (`runEnemyTurn(d, 1)`) o nivel 2 (por defecto en V0.4B).
- Dos estilos de jugador automático, ambos invocan todo lo pagable (sacrificando fichas y luego lo más débil), curan, activan R01 solo para habilitar una carta y atacan con toda criatura de ATQ > 0 (en escaramuza, todas al primer enemigo real):
  - **agresivo**: nunca bloquea.
  - **prudente**: bloquea a cada atacante rival con una criatura libre que sobreviva al golpe; nunca hace de escudo.
- Dos colecciones: **inicial** (las 8 cartas de partida, que es lo que tiene la ruta mínima 01-02-03-04-05-06-14-15-19) y **esperada**, la sesión que tiene el recorrido completo (11 cofres) al llegar a cada sala, con todas las copias en el mazo, como en m8b. Esa colección es mayor pero el jugador automático la diluye (mazo de ~20 cartas sin criterio), por lo que **no siempre mejora los resultados**.
- Los jugadores automáticos son simples: los porcentajes son una cota baja de lo que lograría una persona, útil sobre todo para comparar niveles y propuestas.
- Celda: % de victorias · turnos medios/máximos · `E` = duelos con Eco / tamaño máximo del Eco. Turno máximo observado en todo el informe: 30. No hubo acciones ilegales ni turnos bloqueados (el bucle lanza error ante ambos).
- Las rendiciones no se miden: el jugador automático no se rinde.

## Resultados: colección inicial

| Sala | Encuentro | agresivo vs N1 | agresivo vs N2 | prudente vs N1 | prudente vs N2 |
|---|---|---|---|---|---|
| 02 | El Centinela | 97.5% · 11/17 · E17/3 | 75% · 10.5/15 · E13/2 | 100% · 9.6/18 · E14/4 | 85% · 10.9/15 · E15/2 |
| 09 | Señora de las Ratas | 55% · 10.8/16 · E19/2 | 70% · 11.2/16 · E15/3 | 70% · 11.6/17 · E24/3 | 77.5% · 11.5/16 · E15/3 |
| 06 | El Prior | 2.5% · 11.7/14 · E11/1 | 0% · 10.4/14 · E5/1 | 2.5% · 12.9/16 · E26/2 | 0% · 11.4/14 · E21/1 |
| 18 | El Devoto | 0% · 15.7/18 · E36/3 | 42.5% · 11.4/16 · E5/2 | 25% · 15.3/19 · E33/4 | 47.5% · 11.2/16 · E8/2 |
| 19 | El Rey Esqueleto | 47.5% · 16/18 · E39/4 | 0% · 13.3/14 · E36/1 | 62.5% · 15.3/19 · E35/4 | 0% · 14.6/16 · E40/2 |
| 04 | Los Caídos | 100% · 5.6/7 | 100% · 5.6/7 | 100% · 4.5/6 | 100% · 4.5/6 |
| 07 | Ratas de la Madriguera | 100% · 3.5/4 | 100% · 3.5/4 | 100% · 3.2/4 | 100% · 3.2/4 |
| 08 | Ratas del Nido | 100% · 3.5/4 | 100% · 3.5/4 | 100% · 3.5/4 | 100% · 3.5/4 |
| 16 | Carroñeros del Foso | 100% · 6.1/8 | 100% · 6.1/8 | 100% · 6.1/8 | 100% · 6.1/8 |
| 17 | Los Encadenados | 45% · 8.1/11 | 45% · 8.1/11 | 47.5% · 8.1/11 | 47.5% · 8.1/11 |

Las escaramuzas no cambian entre niveles (el grupo no usa la IA) y no producen Eco (terminan antes).

## Resultados: colección esperada en cada sala del recorrido completo

| Sala | Encuentro | agresivo vs N1 | agresivo vs N2 | prudente vs N1 | prudente vs N2 |
|---|---|---|---|---|---|
| 02 | El Centinela | 97.5% · 11/17 · E17/3 | 75% · 10.5/15 · E13/2 | 100% · 9.6/18 · E14/4 | 85% · 10.9/15 · E15/2 |
| 09 | Señora de las Ratas | 57.5% · 8.7/14 | 75% · 10.6/16 | 77.5% · 8.6/14 | 72.5% · 10/14 |
| 06 | El Prior | 12.5% · 10.6/15 | 15% · 11/18 | 35% · 11.7/20 | 25% · 11.5/21 |
| 18 | El Devoto | 62.5% · 11.9/19 | 57.5% · 10.6/13 | 100% · 12.7/26 | 67.5% · 11/16 |
| 19 | El Rey Esqueleto | 37.5% · 13.8/26 | 32.5% · 16/25 | 70% · 15.7/29 | 35% · 16.7/30 |
| 04 | Los Caídos | 100% · 5.5/6 | 100% · 5.5/6 | 100% · 3.8/6 | 100% · 3.8/6 |
| 07 | Ratas de la Madriguera | 100% · 2.9/4 | 100% · 2.9/4 | 100% · 2.4/4 | 100% · 2.4/4 |
| 08 | Ratas del Nido | 100% · 3.4/4 | 100% · 3.4/4 | 100% · 3.4/4 | 100% · 3.4/4 |
| 16 | Carroñeros del Foso | 90% · 7.1/14 | 90% · 7.1/14 | 95% · 6.3/14 | 95% · 6.3/14 |
| 17 | Los Encadenados | 12.5% · 6.2/10 | 12.5% · 6.2/10 | 25% · 6.9/10 | 25% · 6.9/10 |

Con la colección esperada no hay Eco salvo en 02, que usa la colección inicial (el mazo de unas 20 cartas no se agota). Las salas 02 y 04-08 ya se jugaron con una colección casi igual a la inicial.

## Recorrido completo 01→19 (m8b, jugador automático prudente, intentos hasta la primera victoria)

Un intento es un duelo completo desde la sala, sin liquidar la derrota (límite 60 por sala). `*` = la sala no se ganó en 60 intentos contra el nivel 2 y se repitió contra el nivel 1 para poder seguir.

| Recorrido | Intentos por sala |
|---|---|
| Completo, rival nivel 1 | 02×1 04×1 07×1 08×1 09×1 07×1 06×2 18×1 16×1 **17×7** 19×1 |
| Completo, rival nivel 2 | 02×1 04×1 07×1 08×1 09×1 07×1 06×1 18×1 16×1 17×1 **19×21** |
| Ruta mínima, rival nivel 1 | 02×1 04×1 06×1 19×1 |
| Ruta mínima, rival nivel 2 | 02×1 04×1 **06×4\*** (60 intentos perdidos antes) **19×6\*** (60 perdidos antes) |

Con el nivel 2 la ruta mínima (solo las 8 cartas iniciales) **no es superable** por este jugador en 06 ni en 19. Los intentos aislados dependen de la semilla y son ruidosos; la tabla de porcentajes es más fiable.

## Observaciones del nivel 2 frente al nivel 1

- **Más difícil**: 02 (−12 a −22 puntos con el agresivo), 19 con la colección inicial (47-62% → 0%) y 06 (ya casi imposible con el nivel 1). Los bloqueos selectivos y no atacar con criaturas condenadas conservan al rival; en 19 además el Rey mantiene su tablero.
- **Más fácil**: 18 (El Devoto: 0-25% → 42-47% con la colección inicial) y 09 (+7 a +15 puntos). Causas probables, no aisladas con experimentos: en 18 la regla de sacrificios evita gastar tres reales en H04 cuando valen más que el ídolo y el orden por coste cambia la mano; en 09 el rival conserva mejor sus criaturas.
- El Eco aparece en 5-40 de cada 40 duelos de duelo con colección inicial (tamaño máximo 1-4) y el nivel 2 no lo evita; es frecuente en 19, donde los duelos son largos.
- Los duelos duran 9-17 turnos de media; las escaramuzas, 3-8.

## Por qué pierde el jugador automático

**Sala 17 (Los Encadenados: H01 0/3, N04 4/3, R03 3/3 con escudo 1).**
- Reloj: el grupo ataca con 7 ATQ por turno desde su segundo turno (N04 4 + R03 3) y no se cura. Con 20 de vida el jugador muere en el tercer golpe (turno 6) si no mata a N04 o R03 antes. El jugador automático gasta el primer ataque en H01 (primero de la lista, 0 ATQ), así que N04 y R03 siguen golpeando.
- Los atacantes iniciales del jugador (A01 2/1, N05 1/1, N06 3/1) tienen 1 de vida y mueren a cualquier golpe; el escudo de R03 anula una andanada completa.
- Resultado: 45-48% con la colección inicial y 12-25% con la esperada (el mazo diluido empeora el resultado); partidas ganadas por poco (vida final media 3,5 con la colección inicial).

**Sala 06 (El Prior: 20 de vida, H01 0/3 ×2, H03 1/3, H02 1/4, N05, N02, N03 3/2, N07 2/3, N04 4/3).**
- Composición: 4 de 9 cartas cuestan 0 y entran sin maná (H01 ×2, N05, H03); con maná base rival 1 el Prior despliega 2-3 criaturas por turno, el mismo ritmo que el jugador pero con mejor cuerpo.
- ATQ/VID: las criaturas del Prior tienen 3-4 de vida (H01, H03, H02, N07, N04) frente a ATQ de jugador de 1-3, así que casi ningún ataque mata; las del jugador tienen 1 de vida y mueren a N02, N03 o N04. El jugador pierde sus atacantes en 2-3 turnos y el resto de la partida solo recibe daño.
- Curas: H02 (al empezar cada principal) y H03 (al entrar) deshacen el daño acumulado; el daño al invocador no se cura, pero el Prior nunca se queda sin cuerpos.
- Vida del invocador: 20 es alta para el daño que mete el jugador (en las derrotas el Prior conserva 12-15 de vida de 20 con la colección inicial); además el mazo de 8 cartas se agota hacia el turno 6-7 y aparecen Ecos (en 0-26 de 40 duelos).
- Con el nivel 1 ya ocurría (2,5%): no es consecuencia del nivel 2.

## Propuestas de cifras (no aplicadas; medidas solo en simulación)

Cada celda es % de victorias base → con propuesta, **agresivo / prudente**, rival nivel 2, 40 duelos por celda. «Composición» sustituye cartas del encuentro por otras ya existentes (no exige tocar los tipos de carta del jugador).

### Sala 17 (prioridad 1)

| Propuesta | Colección inicial | Colección esperada | Turnos medios (inicial, agr.) |
|---|---|---|---|
| P17-1 Grupo `H01, N02, R03` (N04 4/3 → N02 2/2) | 45 → 100 / 47.5 → 100 | 12.5 → 77.5 / 25 → 85 | 8.1 → 8 |
| P17-2 Grupo `H01, N07, R03` (N04 → N07 2/3) | 45 → 100 / 47.5 → 100 | 12.5 → 72.5 / 25 → 77.5 | 8.1 → 8 |
| P17-3 Grupo `H01, N04, N07` (R03 → N07 2/3, sin escudo) | 45 → 100 / 47.5 → 100 | 12.5 → 77.5 / 25 → 82.5 | 8.1 → 6.1 |
| P17-4 R03 sin escudo (3/3) | 45 → 97.5 / 47.5 → 97.5 | 12.5 → 22.5 / 25 → 52.5 | 8.1 → 6 |
| P17-5 Grupo `H01, N02, N07` (P17-1 + P17-3) | 45 → 100 / 47.5 → 100 | 12.5 → 95 / 25 → 95 | 8.1 → 5.6 |
| P17-6 (referencia) Jugador con 25 de vida | 45 → 100 / 47.5 → 100 | 12.5 → 57.5 / 25 → 62.5 | 8.1 → 9.6 |

Recomendación de lectura (a decidir por el diseñador): P17-1 o P17-2 bastan para sacar la sala de una zona de azar a una de dominio; P17-5 la hace casi trivial. Lo que mueve el resultado es bajar el reloj de 7 ATQ por turno a 5 o menos, no el escudo por sí solo.

### Sala 06 (prioridad 2)

| Propuesta | Colección inicial | Colección esperada | Turnos medios (inicial, agr.) |
|---|---|---|---|
| P06-1 Vida del Prior 20 → 16 | 0 → 2.5 / 0 → 2.5 | 15 → 17.5 / 25 → 25 | 10.4 → 10.3 |
| P06-2 Vida 20 → 14 | 0 → 5 / 0 → 5 | 15 → 25 / 25 → 30 | 10.4 → 10.3 |
| P06-3 Vida 20 → 12 | 0 → 15 / 0 → 15 | 15 → 30 / 25 → 35 | 10.4 → 9.6 |
| P06-4 H02 → N05 (sin sanación de inicio) | 0 → 5 / 0 → 5 | 15 → 22.5 / 25 → 32.5 | 10.4 → 11 |
| P06-5 H02 y H03 → N05 (sin curas) | 0 → 10 / 0 → 10 | 15 → 37.5 / 25 → 47.5 | 10.4 → 13.1 |
| P06-6 Vida 14 + H02 → N05 | 0 → 20 / 0 → 20 | 15 → 30 / 25 → 40 | 10.4 → 10.6 |
| P06-7 Vida 14 + H02 y H03 → N05 | 0 → 35 / 0 → 35 | 15 → 57.5 / 25 → 60 | 10.4 → 11.9 |

Lectura: bajar solo la vida rinde poco (cada −2 de vida ≈ +2,5 a +5 puntos); las curas son la palanca mayor, pero quitar H02/H03 cambia la identidad del Prior (jefe de curación): decisión creativa. Con la colección inicial ninguna propuesta aislada llega al 50%; la ruta mínima probablemente requiere cambiar también la colección inicial o el combate del jugador (fuera del alcance de este informe).

### Otras salas (secundario)

| Propuesta | Colección inicial | Colección esperada |
|---|---|---|
| P19-1 Vida del Rey 28 → 22 | 0 → 0 / 0 → 0 | 32.5 → 37.5 / 35 → 37.5 |
| P19-2 Vida del Rey 28 → 18 | 0 → 17.5 / 0 → 17.5 | 32.5 → 42.5 / 35 → 42.5 |
| P18-1 Vida del Devoto 18 → 14 | 42.5 → 72.5 / 47.5 → 75 | 57.5 → 70 / 67.5 → 80 |

El Rey Esqueleto es inalcanzable con la colección inicial incluso con 18 de vida; con la esperada ya está en 33-70%. El Devoto no necesita cambios urgentes con el nivel 2.

## Conclusiones principales

1. El nivel 2 no rompe la terminación ni el flujo (sin acciones ilegales ni turnos bloqueados, máximo 30 turnos) y cambia la dificultad por sala: sube en 02 y 19, baja en 18 y 09.
2. La sala 17 es el mayor problema de balance medible y el más barato de arreglar: un único cambio de composición del grupo (N04 → N02/N07) pasa del 45% al 100% con la colección inicial y de 12-25% a 72-85% con la esperada.
3. La sala 06 es casi invencible para el jugador automático con la colección inicial (0-2,5%), con el nivel 1 y con el 2; baja de vida del Prior más cambios de curas la acercan a 35% (inicial) y 60% (esperada), pero implican tocar la identidad del Prior. 19 también es inalcanzable con la colección inicial.

## Limitaciones

- Estilos automáticos simples: no eligen objetivo en escaramuza (siempre el primer enemigo real), no construyen mazo y no se rinden.
- La colección esperada es la del recorrido completo con todas las copias en el mazo.
- No se evalúa el efecto sobre el diseño de jefes (identidad) ni la sensación de juego: eso queda para el playtesting.
