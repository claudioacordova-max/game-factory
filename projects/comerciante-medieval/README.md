# Comerciante Medieval

Prototipo de Comerciante Medieval basado en Vite, React, TypeScript, Three.js y React Three Fiber. El motor económico puede ejecutarse sin interfaz gráfica.

## Requisitos

- Node.js 20.19+ o 22.12+
- npm

## Uso

Desde esta carpeta, instala las dependencias y arranca el servidor de desarrollo:

```sh
npm install
npm run dev
```

Abre en el navegador la dirección local que muestra Vite (normalmente `http://localhost:5173`).

## Bucle comercial (Hito 6)

Muévete con WASD o las flechas y pulsa E, o usa el botón de interacción junto a un NPC. En **Negocio** puedes comprar del stock comercial o vender insumos pertinentes; en **Hogar** puedes vender bienes que la familia necesite. El menú muestra el precio fijo, el máximo actual, el total y el resultado previsto. Confirma una cantidad entera para ver el resultado; una operación rechazada no cambia dinero ni inventario.

Comerciar y caminar no avanzan el calendario. Usa **Avanzar día** o viaja al otro pueblo para procesar un día económico global.

Para compilar y previsualizar la versión de producción:

```sh
npm run build
npm run preview
```

Para ejecutar simulaciones económicas reproducibles de 9, 36 y 90 días desde Node:

```sh
npm run simulate
```

También se puede indicar otra duración entera, por ejemplo `npm run simulate -- 18`.

Modifica la escena según la especificación aprobada para este juego.
