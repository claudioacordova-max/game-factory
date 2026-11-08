# Comerciante Medieval

Demo de comercio en dos pueblos 3D con economía autónoma de familias, negocios y caravana. Stack: TypeScript, React, Vite, Three.js y React Three Fiber; el motor también funciona sin interfaz gráfica.

Revisión documental: 2026-10-28; corte de código `5495567`, último cierre del juego `737fea9` (ITER-10). Sin guardado tras recargar ni condición de victoria/derrota.

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

## Jugar

1. Camina con **WASD o flechas** y usa **E** o el botón contextual junto a un NPC.
2. En **Comprar/Vender**, pulsa una oferta para operar **una unidad inmediatamente**, sin cantidad editable ni confirmación adicional. Cada venta identifica al destinatario. Precio, stock/máximo y restricciones vienen del estado real; un rechazo no transfiere dinero ni bienes.
3. Abre/cierra inventario con **I** o su botón: mercancías, cantidades y carga utilizada/máxima/disponible. **Esc** cierra ventanas. El comercio se cierra al alejarse del NPC.
4. Usa **Avanzar día** o acércate a la salida señalizada y elige el otro pueblo: viajar avanza **un día global**, sin tarifa monetaria. El puerto pertenece solo a la caravana.

Comerciar y caminar no avanzan días. Las familias solo aceptan necesidades activas y no recompran bienes producidos por sus negocios. Carga, existencias, fondos y límite diario de progreso restringen las operaciones.

Para compilar y previsualizar la versión de producción:

```sh
npm test
npm run build
npm run preview
```

Para ejecutar simulaciones económicas reproducibles de 9, 36 y 90 días desde Node:

```sh
npm run simulate
```

También se puede indicar otra duración entera, por ejemplo `npm run simulate -- 18`.

El panel **Herramientas de inspección y prueba** está separado de la partida y empieza cerrado. Inspecciona familias, necesidades, inventarios, durabilidad, negocios, jugador y caravana; ejecuta escenarios reproducibles de 1/9/36/90 o duración entera y copia/exporta informes. Cada experimento reinicia su escenario; sus parámetros declarados y su restauración no alteran la partida normal abierta. Los resultados no certifican por sí solos equilibrio económico.

Ejecutar todos los escenarios por nueve días con semilla registrada, o uno específico:

```sh
npm run simulate -- --scenario all --days 9 --seed 42
npm run simulate -- --scenario trade-opportunity --days 9 --seed 42
```

## Documentación

- [Estado actual: propuesta, sistemas, contenido y limitaciones](docs/status.md).
- [Especificación consolidada de requisitos aprobados](docs/spec-v1.md).
- [Decisiones vigentes: reglas aprobadas, invariantes y pendientes](docs/decisions.md).
- [Plan y punto de continuidad](docs/implementation-plan.md) (enlaza el plan archivado de 2026-10-28).
- [Historial íntegro de implementación e iteraciones](docs/history/implementation-plan-v0.1.md).
