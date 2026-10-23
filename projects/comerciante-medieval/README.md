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

El panel **Herramientas de inspección y prueba** está separado de la partida normal y empieza cerrado. Permite inspeccionar hogares, estados de necesidad, inventarios separados, durabilidad, negocios, jugador y calendario/operaciones de la caravana; ejecutar los escenarios del §12 con 1, 9, 36, 90 o cualquier duración; y consultar, copiar o exportar informes diarios y por ciclo. Cada ejecución reinicia al escenario elegido. Los controles de tarifas, producción, frecuencia, durabilidades y umbrales se aplican solo a esa ejecución y parten de los valores predeterminados aprobados; restaurarlos no cambia la partida abierta.

Ejecutar todos los escenarios por nueve días con semilla registrada, o uno específico:

```sh
npm run simulate -- --scenario all --days 9 --seed 42
npm run simulate -- --scenario trade-opportunity --days 9 --seed 42
```

Modifica la escena según la especificación aprobada para este juego.
