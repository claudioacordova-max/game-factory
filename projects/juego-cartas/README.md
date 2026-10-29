# Duelo en la cripta

Demo de RPG de cartas: explora siete salas 3D, descubre criaturas y prepara una baraja para duelos y escaramuzas. Las heridas, bajas y mejoras se conservan durante la sesión. Revisión de esta guía: 2026-10-28; referencia implementada `54955677ec9430695b233c99a8fb4067b103a86d`.

La iteración UX y fatiga queda cerrada con alcance parcialmente aceptado: el diseñador aceptó combate, distribución contextual, prioridades, conexiones, turnos/fases, foco y fatiga. Se conserva la eliminación verificada de transiciones hover en botones de colección, pero no resolvió la onda observada durante scroll lento con rueda en el menú abierto con I. El scroll queda como incidencia conocida, no resuelta y diferida, sin investigación adicional autorizada ni fecha comprometida. La evidencia y el cierre constan en el [plan vivo](docs/implementation-plan.md); el detalle de la limitación está en el [estado vigente](docs/status.md). Cierre con commit exclusivamente local, sin push.

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

## Controles

1. **WASD/flechas** mueve el avatar. Acércate a un objeto disponible y pulsa **E** o su botón contextual. **?** abre ayuda y controles alternativos; Tab navega los controles. No hay combates por simple contacto.
2. **I** o Colección abre la gestión sobre el mundo; **I/Esc** o el cierre la cierra. Mientras está abierta se detiene el personaje y se conserva posición. Añade/retira copias y reinvoca tipos conocidos perdidos. El robo propio es aleatorio, sin ordenar manualmente el mazo.
3. En principal, **arrastra una carta al campo propio o actívala por clic/teclado**. Una operación inválida informa el motivo sin gastar recursos. Si exige sacrificios, selecciona criaturas propias: puedes desmarcar mientras falten o cancelar con **Esc/Cancelar**. **La última selección ejecuta la invocación y pierde permanentemente los sacrificios, sin otra confirmación.**
4. **Ir al ataque** permite escoger atacantes; principal avanza sola si no quedan invocaciones legales ni una selección pendiente. En duelo, clic selecciona/deselecciona participantes del ataque directo al invocador. En R1–R3, **arrastra una criatura propia sobre su objetivo enemigo**; varias pueden compartirlo. Sus flechas adelantan/retrasan la recepción de represalia dentro de ese grupo y cambian el resultado real del daño. Esos grupos no tienen invocador rival. Confirma ataques o pasa con cero.
5. En defensa, **arrastra una propia sobre un atacante enemigo**; permite varias por atacante. Para cambiar el vínculo, arrastra a otro enemigo; para retirarlo, a **Sin asignar**. Esc o soltar fuera de un destino válido conserva lo anterior. Los botones de prioridad cambian el orden de bloqueo y la posición visible. No hay asignación por clic/selectores/teclado. **Resolver bloqueos** confirma incluso dejar ataques sin bloquear. Las fases continúan automáticamente; no hay «Terminar turno».
6. Lee victoria/derrota y pulsa **Continuar explorando**. Regresas a tu sala/punto seguro con las consecuencias. Cofres y santuarios se reclaman por cercanía; el ala opcional se reinicia solo al salir al sector 1 y volver a entrar.

El tablero agrupa las relaciones: durante las asignaciones, las propias disponibles quedan centradas debajo de los grupos y regresan allí al retirar un vínculo. Fuera de esas situaciones vuelven las filas habituales; no hay dos zonas permanentes. El desplazamiento compartido permite recorrer contenido que exceda el espacio disponible. El lado iluminado identifica el turno; fase y decisión disponible se muestran por separado. Los bloqueos enemigos del ataque propio aparecen brevemente y continúan sin otra confirmación; los ataques directos no bloqueados siguen identificados como participantes. Al cerrar una superposición que devuelve a exploración puedes volver a moverte sin clic adicional.

Una victoria contra R4, B1, B2 o B3 deja toda la fatiga en cero. R1–R3 no la reducen y cada derrota suma un punto. Las vinculaciones carta-a-carta requieren arrastre; las demás acciones mantienen sus controles de teclado.

## Documentación

- [Estado vigente](docs/status.md): sistemas, contenido, desarrollo y límites.
- [Especificación consolidada v1](docs/spec-v1.md): reglas aplicables y procedencia de decisiones.
- [Plan de continuidad](docs/implementation-plan.md): cierres, decisiones de trabajo y siguiente intervención cuando sea autorizada.
- [Interfaz](docs/design/interface-v1.md) y [exploración 3D](docs/design/exploration-3d-v1.md): diseños vigentes y referencias visuales.
- [Plan histórico](docs/history/implementation-plan-v0.1.md) y [README anterior](docs/history/README-before-migration-2026-10-28.md): ejecución, aprobaciones y guía de playtesting histórica, sin tareas implícitas nuevas.
