# Duelo en la cripta

Demo de RPG de cartas: explora siete salas 3D, descubre criaturas y prepara una baraja para duelos y escaramuzas. Las heridas, bajas y mejoras se conservan durante la sesión. Revisión de esta guía: 2026-10-28; referencia implementada `54955677ec9430695b233c99a8fb4067b103a86d`.

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
4. **Ir al ataque** permite escoger atacantes; principal avanza sola si no quedan invocaciones legales ni una selección pendiente. Clic selecciona/deselecciona. En R1–R3 asigna un enemigo concreto a cada atacante; esos grupos no tienen invocador rival. Confirma ataques o pasa con cero.
5. En defensa, **arrastra una propia sobre un atacante enemigo**; permite varias, reasignación, retirada y orden. Alternativa: activar el atacante y luego las propias por clic/teclado. **Resolver bloqueos** confirma incluso dejar ataques sin bloquear. Las fases continúan automáticamente; no hay «Terminar turno».
6. Lee victoria/derrota y pulsa **Continuar explorando**. Regresas a tu sala/punto seguro con las consecuencias. Cofres y santuarios se reclaman por cercanía; el ala opcional se reinicia solo al salir al sector 1 y volver a entrar.

## Documentación

- [Estado vigente](docs/status.md): sistemas, contenido, desarrollo y límites.
- [Especificación consolidada v1](docs/spec-v1.md): reglas aplicables y procedencia de decisiones.
- [Plan de continuidad](docs/implementation-plan.md): cierres, decisiones de trabajo y siguiente intervención cuando sea autorizada.
- [Interfaz](docs/design/interface-v1.md) y [exploración 3D](docs/design/exploration-3d-v1.md): diseños vigentes y referencias visuales.
- [Plan histórico](docs/history/implementation-plan-v0.1.md) y [README anterior](docs/history/README-before-migration-2026-10-28.md): ejecución, aprobaciones y guía de playtesting histórica, sin tareas implícitas nuevas.
