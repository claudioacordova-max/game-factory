# Duelo en la cripta — estado vigente

Propósito: describir el prototipo implementado de `projects/juego-cartas/`. Revisión: 2026-11-08.

## Ficha de continuidad

Lectura mínima para retomar trabajo (workflow v1.2): esta ficha → [decisions.md](decisions.md) → código afectado. El [plan vivo](implementation-plan.md) registra autorizaciones y cierres; `history/` solo se consulta para procedencia.

| Campo | Valor |
|---|---|
| Último cierre | Iteración UI-2, 2026-11-08 (combate sin scroll, arrastre por gestos, mano solo en invocación, bug de arrastre bloqueado resuelto). Anteriores: LEG-1 `6f85bdb`, UI-1 `047581b` |
| Siguiente hito | Ninguno autorizado. Candidato: balance ([balance-m8c.md](balance-m8c.md)) |
| Decisiones abiertas | Zona de 03/10 provisional; «Mazo exhausto» y «Rendirse» implementados como experimentales (M8a). Ver [decisions.md](decisions.md#4-pendientes-abiertos-requieren-decisión-del-diseñador-antes-de-implementar) |
| Juego activo | Expedición V0.4B (único juego; el legado se retiró en LEG-1, recuperable en `047581b`) |
| Comprobaciones | `npm test` (359/359 + spatial al cierre UI-2; balance: `node .test-dist/tests/balanceRun.js [--what-if]` tras compilar tests) y `npm run build` desde `projects/juego-cartas/` |
| Incidencias conocidas | Onda de scroll en Colección, diferida sin autorización |

## Propuesta y experiencia

RPG de invocaciones que combina exploración de una cripta 3D, colección y preparación de criaturas con combates por cartas. Las decisiones conservan consecuencias: las supervivientes mantienen heridas, morir o sacrificarse elimina su copia (el cupo se conserva) y recuperar una criatura cuesta vida máxima del invocador. El orbe de restauración permite reconstruirse fuera de combate.

Es una demo jugable: la **expedición V0.4B** de 19 salas, diez encuentros y once cofres, con un único camino de juego (ningún parámetro de URL cambia de modo; `?perf` solo añade el panel de rendimiento). El jugador controla un avatar con cámara elevada y activa voluntariamente encuentros, salidas, cofres, altar, pedestales y el muro agrietado al acercarse. Los combates usan una mesa 2D; el grimorio se consulta superpuesto al mundo. El [README](../README.md) explica arranque y controles. El prototipo anterior de siete salas se retiró del juego y del código (iteración LEG-1); su especificación se conserva como [documento histórico](history/spec-v1-legado.md) y el código es recuperable en el commit `047581b`.

## Sistemas implementados

- **Catálogo y copias:** 21 tipos / 39 copias con nombres oficiales; cupos históricos por adquisición, copias con salud e identidad propias y recuperación de vacantes. Se empieza con ocho copias de siete tipos (A01×2, A02, R01, H01, N02, N05, N06). Recuperación individual (suelo de vida máxima 1) y «Reinvocar todas» (solo si la vida máxima resultante queda en 7 o más).
- **Combate:** turnos alternos con mano inicial de tres cartas; maná renovable `max(0, 1 + R02 vivas − fatiga)`; sacrificios y fichas; habilidades R01, A03, A04, N01, H02, H03, H04 (ritual con vista previa y confirmación) y escudos R03/R04. Mazo exhausto con refuerzos de la cripta («Eco») y «Rendirse» con confirmación, ambos experimentales. Duelos contra invocadores y escaramuzas contra grupos (objetivo concreto por atacante, prioridad de represalia).
- **IA rival:** nivel 2 por defecto con heurísticas sencillas y legibles; el nivel 1 se conserva como referencia de simulación. Experimentales; ver el [informe de balance](balance-m8c.md).
- **Interacción táctica:** vincular, reasignar y retirar relaciones carta-a-carta se hace por gestos de arrastre (Pointer Events): soltar hacia el rival asigna al destino más cercano y soltar en el lado propio o fuera retira; en duelos, arrastrar hacia el rival también declara atacante (el clic sigue funcionando). La mano solo se muestra en la fase principal (indicador «Mano N · Mazo M» en las demás) y la mesa se escala para no requerir scroll; prioridad de bloqueo y de atacantes dirigidos mediante flechas; presentación automática de 420 ms de los bloqueos reales del ataque propio. Detalle en el [diseño de interfaz](design/interface-v1.md).
- **Exploración:** 19 salas con colisiones y salidas por muro; las salas con encuentro bloquean las salidas hacia delante hasta vencerlo; ciclo de ratas con altar, puzle rúnico en 11/12 (Hueso → Sombra → Maná), muro oculto 14↔18 y once cofres únicos cuyas copias van a la reserva (panel superpuesto, E/Esc). Vencer a El Rey Esqueleto completa la expedición y permite seguir explorando; ningún secreto es obligatorio.
- **Restauración y orbe:** orbe de un solo uso, inicial cargado, activable fuera de combate desde el HUD; sana las copias vivas, devuelve la vida máxima a 20 y elimina la fatiga; se recarga completando el circuito de ratas. Vencer a El Centinela y a El Prior aplica una restauración gratuita.
- **Grimorio:** copias agrupadas por tipo con contador e indicación de heridas, pestañas Colección / Reinvocar / Filtros (maná y sacrificios) y retratos propios por tipo.
- **Presentación:** cripta de piedra, bronce y luz turquesa; arquitectura y personajes programáticos de baja geometría, temas por zona, iconos SVG propios, HUD con zona y nombre de sala y conexiones de combate. Detalle en el [diseño de exploración 3D](design/exploration-3d-v1.md).

## Recursos y recorrido

Vida máxima 20, fatiga 0 o 1, nivel fijo 1. Cada derrota (o rendición) deja la fatiga en 1; la restauración gratuita de El Centinela y El Prior y el orbe la eliminan. Tras liquidar un duelo la vida actual del invocador vuelve a su máximo vigente, sin curación automática de criaturas. Ruta mínima sin secretos: 01-02-03-04-05-06-14-15-19. Contenido y reglas: [decisiones vigentes](decisions.md); cifras y propuestas: [informe de balance](balance-m8c.md). Las cifras son baseline experimental.

## Desarrollo y límites conocidos

Los hitos V0.4B M1–M8c y las iteraciones UI-1, LEG-1 y UI-2 constan en el [plan de continuidad](implementation-plan.md); los registros anteriores permanecen en `history/` solo como procedencia.

- El progreso dura únicamente mientras permanece cargada la página: no hay guardado durable ni restauración tras recarga.
- No se gana nivel. No hay monedas, tiendas, hechizos adicionales, multijugador, generación procedural ni representación 3D de invocaciones. Las posibilidades futuras no constituyen requisitos pendientes.
- Las cifras, los encuentros y las heurísticas de la IA son baseline experimental; la aceptación de la demo no demuestra equilibrio definitivo. Las propuestas de balance siguen abiertas en el [informe M8c](balance-m8c.md).
- El diseño principal es de escritorio (1440×900 y 1024×768), sin validación móvil dedicada.
- **Incidencia conocida, no resuelta y diferida — scroll de colección:** en el grimorio abierto con I, al desplazar lentamente con la rueda del mouse, las cartas parecen producir una onda o recolocación. Persiste tras el último ajuste (se conserva la eliminación de transiciones hover en botones de cartas); no hay corrección autorizada ni fecha comprometida y no se declara resuelta.
- Las asignaciones carta-a-carta solo por arrastre no pueden completarse solo con teclado, por decisión explícita del diseñador.
- El bundle de producción supera el aviso de 500 kB de Vite (three.js y React Three Fiber); no hay división de código.

## Referencias

- [Decisiones vigentes](decisions.md), [plan de continuidad](implementation-plan.md) e [informe de balance M8c](balance-m8c.md).
- [Diseño vigente de interfaz](design/interface-v1.md) y [exploración 3D](design/exploration-3d-v1.md) (sus referencias a las siete salas legadas son históricas).
- [Especificación del prototipo legado (histórica)](history/spec-v1-legado.md), [registro M0–M3](history/migracion-v04b-m0-m3.md) y el resto de registros en `history/`: cada uno mantiene su alcance temporal y no valida el estado actual.
