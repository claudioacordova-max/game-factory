# Duelo en la cripta

Demo de RPG de cartas: explora una cripta 3D, reúne criaturas y prepara una baraja para duelos y escaramuzas. Las heridas y bajas se conservan durante la sesión. El juego es la **expedición V0.4B** de 19 salas (el prototipo anterior de siete salas se retiró en la iteración LEG-1; sigue recuperable en el commit `047581b`). Revisión de esta guía: 2026-11-08.

La iteración UX y fatiga queda cerrada con alcance parcialmente aceptado: el diseñador aceptó combate, distribución contextual, prioridades, conexiones, turnos/fases, foco y fatiga. Se conserva la eliminación verificada de transiciones hover en botones de colección, pero no resolvió la onda observada durante scroll lento con rueda en el menú abierto con I. El scroll queda como incidencia conocida, no resuelta y diferida, sin investigación adicional autorizada ni fecha comprometida. La evidencia y el cierre constan en el [plan archivado](docs/history/implementation-plan-2026-11-07.md), enlazado desde el [plan vivo](docs/implementation-plan.md); el detalle de la limitación está en el [estado vigente](docs/status.md). Cierre con commit exclusivamente local, sin push.

## Ejecutar

Requisitos: Node.js 20.19+ o 22.12+ y npm. Desde `projects/juego-cartas/`:

```sh
npm install
npm run dev
```

Abre la URL que indique Vite. No se presupone un servidor anterior ni un puerto concreto. Recargar o cerrar la página inicia otra partida: no hay guardado durable.

```sh
npm run test
npm run build
npm run preview
```

`test` y `build` generan sus salidas locales habituales. Estos comandos son instrucciones, no resultados ejecutados al editar esta guía.

### Modo y medición

- **Sin parámetro** (por ejemplo `http://localhost:5173/`): expedición V0.4B de 19 salas, con ocho copias iniciales, once cofres, orbe de restauración, ciclo de ratas, puzle rúnico y muro oculto opcionales. Vencer a El Rey Esqueleto en el Salón del Trono completa la expedición y permite seguir explorando. No existe otro modo: cualquier valor de `?expedicion` se ignora.
- **`?perf`** muestra un panel con FPS y `renderer.info` y publica los mismos datos en `window.__gfPerf`.

## Controles

1. **WASD/flechas** mueve el avatar. Acércate a un objeto disponible y pulsa **E** o su botón contextual. **?** abre ayuda y controles alternativos; Tab navega los controles. No hay combates por simple contacto.
2. **I** o Colección abre la gestión sobre el mundo; **I/Esc** o el cierre la cierra. Mientras está abierta se detiene el personaje y se conserva posición. Añade/retira copias y reinvoca tipos conocidos perdidos. El robo propio es aleatorio, sin ordenar manualmente el mazo.
3. En principal, **arrastra una carta al campo propio o actívala por clic/teclado**. Una operación inválida informa el motivo sin gastar recursos. Si exige sacrificios, selecciona criaturas propias: puedes desmarcar mientras falten o cancelar con **Esc/Cancelar**. **La última selección ejecuta la invocación y pierde permanentemente los sacrificios, sin otra confirmación.**
4. **Ir al ataque** permite escoger atacantes; principal avanza sola si no quedan invocaciones legales ni una selección pendiente. En duelo, clic selecciona/deselecciona participantes del ataque directo al invocador. En escaramuzas (grupos sin invocador rival, como las ratas), **arrastra una criatura propia sobre su objetivo enemigo**; varias pueden compartirlo. Sus flechas adelantan/retrasan la recepción de represalia dentro de ese grupo y cambian el resultado real del daño. Confirma ataques o pasa con cero.
5. En defensa, **arrastra una propia sobre un atacante enemigo**; permite varias por atacante. Para cambiar el vínculo, arrastra a otro enemigo; para retirarlo, a **Sin asignar**. Esc o soltar fuera de un destino válido conserva lo anterior. Los botones de prioridad cambian el orden de bloqueo y la posición visible. No hay asignación por clic/selectores/teclado. **Resolver bloqueos** confirma incluso dejar ataques sin bloquear. Las fases continúan automáticamente; no hay «Terminar turno».
6. Lee victoria/derrota y pulsa **Continuar explorando**. Regresas a tu sala/punto seguro con las consecuencias. Cofres y demás objetos se usan por cercanía con **E**.

«Rendirse» (con confirmación) cuenta como derrota normal. Cada derrota deja la fatiga en 1 (máximo 1); el **Orbe** del HUD, fuera de combate, sana las copias heridas, devuelve la vida máxima a 20 y elimina la fatiga, y se recarga en el Altar tras completar de nuevo el circuito de las ratas. Vencer a El Centinela y a El Prior aplica una restauración gratuita. Las salas con encuentro bloquean las salidas hacia delante hasta vencerlo; el regreso queda abierto. Los cofres no son necesarios para llegar al Salón del Trono.

El tablero agrupa las relaciones: durante las asignaciones, las propias disponibles quedan centradas debajo de los grupos y regresan allí al retirar un vínculo. Fuera de esas situaciones vuelven las filas habituales; no hay dos zonas permanentes. El desplazamiento compartido permite recorrer contenido que exceda el espacio disponible. El lado iluminado identifica el turno; fase y decisión disponible se muestran por separado. Los bloqueos enemigos del ataque propio aparecen brevemente y continúan sin otra confirmación; los ataques directos no bloqueados siguen identificados como participantes. Al cerrar una superposición que devuelve a exploración puedes volver a moverte sin clic adicional.

Las vinculaciones carta-a-carta requieren arrastre; las demás acciones mantienen sus controles de teclado.

## Documentación

- [Estado vigente](docs/status.md): sistemas, desarrollo y límites.
- [Decisiones vigentes](docs/decisions.md): reglas aprobadas, invariantes y pendientes de la expedición V0.4B.
- [Especificación del prototipo legado (histórica)](docs/history/spec-v1-legado.md): reglas del juego retirado, solo como procedencia.
- [Plan de continuidad](docs/implementation-plan.md): cierres, decisiones de trabajo y siguiente intervención cuando sea autorizada.
- [Interfaz](docs/design/interface-v1.md) y [exploración 3D](docs/design/exploration-3d-v1.md): diseños vigentes y referencias visuales.
- [Plan histórico](docs/history/implementation-plan-v0.1.md) y [README anterior](docs/history/README-before-migration-2026-10-28.md): ejecución, aprobaciones y guía de playtesting histórica, sin tareas implícitas nuevas.
