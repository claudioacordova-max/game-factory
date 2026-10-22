# Duelo en la cripta

Prototipo jugable del RPG de cartas. La mazmorra se presenta en un mapa 3D interactivo con Three.js y React Three Fiber; los combates usan una interfaz 2D provisional. React presenta el estado y comunica acciones al motor TypeScript en `src/engine/`, que es la fuente de verdad de las reglas.

## Requisitos y arranque

- Node.js 20.19+ o 22.12+
- npm

Desde esta carpeta:

```sh
npm install
npm run dev
```

Abre la dirección local que indique Vite (normalmente `http://localhost:5173`).

## Cómo jugar

1. En tu fase principal, selecciona una carta de la mano y confirma la invocación. Las cartas con coste de sacrificio te pedirán elegir criaturas propias.
2. Pulsa **Pasar a declarar atacantes**, selecciona tus criaturas y confirma. El enemigo decide sus bloqueos automáticamente.
3. Pulsa **Terminar turno**. El enemigo invoca sus cartas disponibles y ataca.
4. Elige tus bloqueadores para cada atacante enemigo. El orden de selección también es el orden de asignación de daño si varios bloqueadores enfrentan al mismo atacante. Confirma para resolver el combate.
5. Repite hasta terminar el duelo. Tras una derrota puedes ajustar la baraja y volver a entrar al encuentro disponible; tras una victoria queda disponible el siguiente encuentro.

Los mazos de los enemigos y su orden son fijos para que las partidas sean repetibles. La colección, las heridas, las bajas, la fatiga y el avance de la mazmorra se conservan entre duelos durante la sesión actual del navegador. No se guarda ni restaura la partida después de recargar o cerrar la página.

La presentación visual es provisional y prioriza validar el ciclo de exploración, preparación y combate. La escena de exploración es 3D; el tablero de combate permanece en 2D.

## Verificación

```sh
npm run test
npm run build
```
