# Duelo en la cripta

Prototipo 2D jugable del RPG de cartas. Usa React y TypeScript para la interfaz, y el motor en `src/engine/` como fuente de verdad de las reglas. La escena Three.js de plantilla se conserva, pero no forma parte de este hito.

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
5. Repite hasta que la vida de un invocador llegue a cero. **Reiniciar duelo** inicia una partida nueva.

Cartas y orden del mazo son fijos para que las partidas sean repetibles. No hay guardado entre duelos.

## Verificación

```sh
npm run test
npm run build
```
