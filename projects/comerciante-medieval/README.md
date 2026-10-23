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
