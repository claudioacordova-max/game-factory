# Duelo en la cripta

Prototipo jugable del RPG de cartas con presentación de demo. La exploración usa un diorama 3D interactivo de la cripta con Three.js y React Three Fiber. Los duelos tienen mesa 2D, mano de cartas y acciones de fase contextuales. React presenta el estado y comunica acciones al motor TypeScript en `src/engine/`, que sigue siendo la fuente de verdad de las reglas.

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

1. Desde **Explorar**, entra al encuentro disponible mediante su portal 3D o el botón equivalente. **Colección** permite preparar la baraja entre encuentros: añadir coloca la copia al final; retirar conserva su propiedad. La lista lateral muestra el orden de robo y la salud persistente.
2. En tu fase principal, selecciona una carta de la mano y pulsa **Invocar criatura**. Su vida muestra las heridas conservadas. Si exige sacrificio, selecciona criaturas propias en la mesa: se perderán permanentemente al invocar. Pulsa **Declarar atacantes**, selecciona tus criaturas y confirma **Declarar ataques**. Puedes no seleccionar ninguna. El enemigo decide sus bloqueos automáticamente.
3. Pulsa **Terminar turno**. El enemigo invoca sus cartas disponibles y ataca.
4. Elige tus bloqueadores para cada atacante enemigo. El orden de selección también es el orden de asignación de daño si varios bloqueadores enfrentan al mismo atacante. Confirma para resolver el combate.
5. Repite hasta terminar el duelo. Tras una derrota puedes ajustar la baraja y volver a entrar al encuentro disponible; tras una victoria queda disponible el siguiente encuentro.

Los mazos de los enemigos y su orden son fijos para que las partidas sean repetibles. La colección, las heridas, las bajas, la fatiga y el avance de la mazmorra se conservan entre duelos durante la sesión actual del navegador. No se guarda ni restaura la partida después de recargar o cerrar la página.

La dirección visual combina piedra oscura, bronce y luz turquesa, con emblemas SVG propios y fuentes locales. El [diseño estructural y propuesta gráfica](../../docs/rpg-cartas-visual-design-v0.1.md) incluye la referencia generada con imagegen. Los nombres, valores y reglas de las cartas proceden siempre del motor, no de la ilustración de referencia. No se incorporaron dependencias ni servicios nuevos.

El layout contempla 1440×900 y 1024×768; las listas y filas sin límite disponen de desplazamiento. La observación renderizada y el playtesting del diseñador se registran por separado en la [iteración del plan](../../docs/rpg-cartas-implementation-plan-v0.1.md). La compilación no sustituye esas verificaciones.

## Verificación

```sh
npm run test
npm run build
```
