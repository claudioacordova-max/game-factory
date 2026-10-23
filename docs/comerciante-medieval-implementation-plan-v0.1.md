# Comerciante medieval — Plan técnico de implementación v0.1

**Estado:** aprobado por el diseñador para ejecución con los ajustes registrados en el mensaje de aprobación.
**Fuente de verdad funcional:** `docs/comerciante-medieval-spec-v0.2.md`.
**Alcance:** demo jugable. Los valores [E] se usan como configuración inicial autorizada; los riesgos [R] se miden y reportan, sin retocar automáticamente las reglas.

## Arquitectura y límites

- Motor económico TypeScript determinista e independiente de React, Three.js y el navegador. La interfaz solicita acciones y representa el estado del motor.
- Estado explícito para ocho familias, hogares, negocios, inventarios domésticos/comerciales/productivos, fondos compartidos, herramientas y durabilidad; jugador, carga, calendario y caravana.
- Catálogo, recetas, tarifas, pesos, necesidades, parámetros de prueba y escenario inicial en datos/configuración separados de las reglas.
- Importes en décimas de moneda para reproducir precios como 17,6 y 24,2 sin errores acumulados; cantidades de bienes enteras y pesos escalados para representar 0,5.
- Registro determinista y auditable de producción, consumo, transacciones, desgaste, cambios de tramo y movimientos de caravana.
- Interfaz React/R3F con escena 3D únicamente para los dos pueblos y UI 2D superpuesta. El puerto aparece solo en el calendario de caravana; no es escena ni destino del jugador.
- Pruebas del motor ejecutables con Node, siguiendo el patrón de TypeScript compilado y runner propio ya usado por el RPG de cartas, sin dependencia adicional de pruebas.

## Estructura prevista

El primer hito crea el proyecto exclusivamente con `node scripts/create-project.mjs comerciante-medieval`, copiando `template/` a `projects/comerciante-medieval/`. Estructura objetivo:

```text
projects/comerciante-medieval/
  src/engine/     # reglas, estado, escenarios, eventos y simulación
  src/scene/      # pueblos, jugador, edificios y NPC exteriores
  src/ui/         # HUD, comercio, viaje e inspección
  src/App.tsx
  src/main.tsx
  src/styles.css
  tests/          # pruebas deterministas del motor y escenarios
  tsconfig.test.json
  README.md
```

## Hitos

### Hito 1 — Generar el proyecto y preparar infraestructura verificable

**Dependencias:** aprobación del plan.
**Alcance:** ejecutar el generador existente; instalar dependencias en el proyecto generado; adaptar solo el proyecto; añadir runner de pruebas y separar motor, escena y UI. El motor queda vacío.
**Entregables:** proyecto generado con metadatos correctos, infraestructura de pruebas y build.
**Pruebas:** prueba mínima de motor vacío ejecutable con Node y build TypeScript/Vite.
**Aceptación:** el generador parte de `template/`; el motor vacío y las pruebas funcionan; build pasa; plantilla, generador y RPG existente quedan intactos.
**Playtesting humano:** no.

### Hito 2 — Modelo económico, escenario inicial y reglas domésticas

**Dependencias:** Hito 1.
**Alcance:** nueve mercancías, dos pueblos, ocho familias y negocios; inventarios separados; fondos familiares compartidos; escenario inicial autorizado; consumo, producción, desgaste, herramientas, necesidades, colores y progresión de tramos.
**Entregables:** modelo de dominio, configuración inicial y reglas económicas básicas independientes de la UI.
**Pruebas:** reservas iniciales; cobertura de comida/leña; umbrales; herramientas 0/1/2; recetas íntegras; desgaste; ascensos/descensos; bienes duraderos; familias de un integrante.
**Aceptación:** reglas de §§3–6 y valores iniciales de §10 de la especificación; sin cantidades ni saldos negativos, producción sin insumos, ni doble conteo.
**Playtesting humano:** no.

### Hito 3 — Transacciones, economía autónoma y simulaciones básicas

**Dependencias:** Hito 2.
**Alcance:** canales y tarifas fijas; compras familiares, esperas y topes de progreso; transacciones atómicas; caravana y reserva comercial; orden diario aprobado; registro de eventos. Añadir simulaciones económicas automáticas de 9, 36 y 90 días con informes básicos reproducibles, sin interfaz gráfica.
**Entregables:** motor autónomo y comando/runner de escenarios que informe cambios diarios o resúmenes reproducibles de producción, consumo, comercio, dinero, inventarios y tramos.
**Pruebas:** conservación de bienes/dinero; aceptación/rechazo; límite diario global de progreso; calendario y exportación; orden de procesamiento; determinismo al repetir parámetros/escenario/acciones; ejecuciones de 9/36/90 días.
**Aceptación:** mismas entradas generan los mismos estados, eventos e informes; los escenarios observan posibles crisis, saturación o inyección de dinero, sin exigir prosperidad ni modificar reglas.
**Playtesting humano:** no.

### Hito 4 — Jugador, transacciones personales y tiempo

**Dependencias:** Hito 3.
**Alcance:** jugador con 300 monedas, carga 20 e inventario vacío; compra/venta a precio fijo; validación de inventario, fondos, peso y pertinencia; avance manual y viaje de un día con sincronización económica global.
**Entregables:** estado y acciones del jugador en el motor, sin depender de la escena.
**Pruebas:** tarifas 0,9 P/1,1 P, pesos y capacidad; rechazo sin transferencia; revalidación de stock; caminar/comerciar no avanza día; viajar avanza exactamente un día y una vez cada economía.
**Aceptación:** no se compran bienes domésticos ni insumos reservados; ofertas solo se aceptan según necesidad y límites actuales; resultados exactos.
**Playtesting humano:** no.

### Hito 5 — Pueblos 3D e interacción exterior con NPC

**Dependencias:** Hitos 1 y 4.
**Alcance:** dos pueblos sencillos diferenciados; jugador controlable; ocho NPC exteriores accesibles; interacción Hogar/Negocio, sin interiores. No representar el puerto como escena visitable.
**Entregables:** primera versión 3D evaluable conectada al estado del juego.
**Pruebas:** build; consistencia de destinos y asignación de NPC; pruebas automatizables de integración sin navegador.
**Aceptación:** se puede alcanzar cada NPC y abrir sus opciones; destinos limitados a Pueblo A/B; puerto no visible como destino ni accesible.
**Playtesting humano requerido:** comprobar movimiento, legibilidad de los pueblos y acceso a los ocho NPC. Detenerse antes del cierre/commit del hito hasta recibir evaluación humana.

### Hito 6 — Interfaz jugable integrada

**Dependencias:** Hitos 4 y 5.
**Alcance:** HUD de día, lugar, dinero, carga e inventario; avanzar y viajar; menús Hogar/Negocio; cantidades, tarifas, máximos y resultados/rechazos.
**Entregables:** bucle de compra, transporte, viaje y venta integrado.
**Pruebas:** recorridos de acciones contra motor; sincronización de estado y rechazos obsoletos; build.
**Aceptación:** flujo funcional en ambos pueblos, sin combate, negociación, precios dinámicos ni tiempo automático.
**Playtesting humano requerido:** evaluar el bucle comercial, al menos una operación aceptada y una rechazada.

### Hito 7 — Herramientas de inspección y escenarios completos

**Dependencias:** Hitos 2–6.
**Alcance:** inspección de familias, tramos, necesidades, decisiones, inventarios separados, herramientas, jugador y caravana; simulación acelerada de 1/9/36/90 días; reinicio reproducible, parámetros declarados y exportación/copia de informes avanzados. Preparar escenarios de ciclo normal, sin herramienta, sin insumos, escasez de leña en B, oportunidad comercial, regresión de tramo, mercado sin comprador y caravana ausente.
**Entregables:** panel de pruebas separado de la experiencia normal y reportes detallados por día/ciclo.
**Pruebas:** reproducibilidad de estados, informes y eventos; fronteras del ciclo de caravana; asserts funcionales por escenario y reportes 9/36/90 días. No exigir resultados de balance no definidos.
**Aceptación:** escenarios repetibles sin caminar/viajar; métricas permiten reportar crisis, saturación, flujo de dinero y oportunidades sin cambiar el diseño.
**Playtesting humano requerido:** evaluar comprensión de la interfaz y utilidad del panel; no sustituye la revisión de reglas.

## Verificación y playtesting

Las pruebas automáticas cubrirán reglas individuales, conservación de inventario y dinero, orden estable de compras, límites diarios, visitas de caravana, sincronización temporal, reproducibilidad y build de producción. Las simulaciones de 9/36/90 días medirán comportamiento; no impondrán que todas las familias prosperen ni que no haya quiebras. La revisión visual, acceso a NPC y jugabilidad requieren evaluación humana en los hitos indicados.

## Riesgos y gobernanza

- Medir y reportar inyección monetaria de la caravana, disponibilidad tras reserva de dos días, oscilación de tramos, dependencias minero/herrero y tela/leña externa, y oportunidades comerciales. No alterar automáticamente el balance.
- No introducir combate, negociación, precios dinámicos, interiores, puerto accesible ni funciones [F].
- Si aparece una contradicción material o decisión creativa no resuelta, detener solo el trabajo afectado y consultar al diseñador.
- El runner propio evita una dependencia de testing nueva; dependencias adicionales requerirían justificación y aprobación conforme a la gobernanza del repositorio.

## Registro de ejecución

| Hito | Estado y verificación | Commit local |
|---|---|---|
| 1 | Proyecto generado desde `template/`; motor vacío, pruebas y build aprobados. | `9371c67` |
| 2 | Modelo y reglas económicas base aprobados; aclaración D9 aplicada. | `4a74e0d` |
| 3 | Economía autónoma y simulaciones reproducibles 9/36/90; 21 pruebas, build y revisión aprobados. | `7c9d0f0` |
| 4 | Jugador, transacciones personales y tiempo; 29 pruebas, build y revisión aprobados. | `11bfaaf` |
| 5 | Playtesting humano aprobado por el diseñador (23-10-2026): movimiento, exploración de ambos pueblos e interacciones con NPC confirmados; 31 pruebas, build y revisión aprobados. | Cierre local en este commit |
| 6 | Playtesting humano aprobado por el diseñador (23-10-2026): compras, ventas, límites, rechazos y actualización de dinero/inventario confirmados. 34 pruebas y build aprobados; revisión independiente aprobada. Observación baja pendiente: agregar aserción de reintento tras rechazo. | `fd7bf3f` |
| 7 | Playtesting humano aprobado por el diseñador (23-10-2026): herramientas de inspección, escenarios y resultados aceptados. Dos ciclos de corrección; 37 pruebas, build, simulaciones de 1/9/36/90 y los ocho escenarios a 9 días/semilla 42 aprobados; revisión independiente sin bloqueos. | `51e90c6` |

**Estado de la demo:** los siete hitos técnicos están completados y aprobados; no se modificó el balance a partir de los resultados observados.

## Ejecución posterior con Game Factory v1

Antes de cada hito, el coordinador relee especificación, plan e instrucciones; registra `HEAD` y estado Git completo e identifica cambios preexistentes. Delega solo el alcance aprobado al `implementer`; inspecciona diff, pruebas, build y alcance; luego solicita revisión independiente al `reviewer`, sin compartir razonamiento interno del implementador. Se permiten hasta dos ciclos de corrección de defectos técnicos reproducibles, repitiendo verificaciones y revisión tras cada ciclo.

El coordinador solo crea commit local al pasar verificaciones, recibir revisión sin bloqueos, mantener alcance y cumplir el playtesting requerido. Stagea rutas explícitas, inspecciona diff preparado y no incluye cambios preexistentes, `experiments/`, secretos ni archivos generados. No hace push. Continúa únicamente con hitos ya autorizados; se detiene ante playtesting pendiente, decisiones creativas, expansión de alcance, bloqueos persistentes o fallos no resueltos.

## Iteraciones post-hito (Game Factory v1.1)

### ITER-2026-10-23-01 — Cierre del menú contextual al alejarse del NPC

- **Clasificación:** corrección pequeña.
- **Comportamiento actual:** el menú contextual permanece abierto aunque el jugador se aleje del NPC que originó la interacción.
- **Cambio aprobado:** cerrar automáticamente ese menú cuando la distancia horizontal al NPC activo supere 1,85 unidades; el menú permanece operativo hasta el límite incluido y se conserva la apertura normal de interacción. Aprobación expresa del diseñador en la solicitud de iteración post-hito.
- **Alcance y restricciones:** reutilizar el radio de proximidad existente y el `npcId` activo. Sin cambios a Hogar/Negocio, reglas de comercio, controles de viaje u otras mecánicas; sin dependencias nuevas.
- **Criterios verificables:** (1) interacción normal abre el menú; (2) distancia de hasta 1,85 mantiene el menú; (3) superar 1,85 respecto al NPC de esa interacción lo cierra; (4) la comprobación corresponde al NPC activo aunque cambie el NPC cercano.
- **Playtesting humano requerido:** sí, por afectar directamente a la interacción del jugador. Aprobado por el diseñador: confirmó que probó el juego y que la corrección funciona correctamente; autorizó el cierre y el commit local.
- **Cambios de esta iteración:** `projects/comerciante-medieval/src/App.tsx`, `projects/comerciante-medieval/src/scene/VillageScene.tsx`, `projects/comerciante-medieval/src/scene/world.ts`, `projects/comerciante-medieval/tests/run.ts` y este registro.
- **Comprobaciones técnicas:** `npm test` — 38 pruebas aprobadas; `npm run build` — build de producción aprobado (Vite informa el aviso de chunk minificado mayor a 500 kB). Ambos comandos terminaron con código 0.
- **Revisión independiente:** aprobada, sin hallazgos bloqueantes. Observación no bloqueante: la prueba automatizada verifica el umbral, pero no cubre de extremo a extremo que el cambio cierre el estado del menú para el NPC activo; el código sí consulta el `npcId` de esa interacción. Se recomienda confirmarlo durante el playtesting.
- **Estado:** iteración cerrada tras playtesting humano aprobado, implementación y comprobaciones técnicas completadas, y revisión independiente sin bloqueos.

### ITER-2026-10-23-02 — Interfaz contextual sobre la escena

- **Comportamiento actual:** la exploración, proximidad y viaje aparecen en tarjetas permanentes junto a la escena; los menús de NPC, hogar y negocio aparecen en la misma columna.
- **Cambio aprobado:** sustituir las tarjetas permanentes de exploración por una indicación contextual «E · Hablar» cerca del personaje cuando un NPC esté dentro del rango existente; retirar la indicación al salir del rango. Presentar los menús actuales de NPC, Hogar y Negocio superpuestos sobre la escena. Mantener movimiento de teclado con los menús abiertos, cerrar el menú al alejarse como en ITER-2026-10-23-01, evitar que los campos editables activen movimiento y conservar el mecanismo/botón de viaje. La distribución, dimensiones, estilos y adaptación a anchos de escritorio quedan a criterio UX dentro de la estética actual.
- **Clasificación:** mejora UX/presentación.
- **Alcance y restricciones:** interfaz de exploración, interacción/comercio y viaje en `projects/comerciante-medieval/`; conservar contenido, formularios y comportamiento económico. Sin cambios a mecánicas o arquitectura, sin puertas/mapas exteriores, sin dependencias nuevas y sin modificaciones a `experiments/`.
- **Criterios verificables:** (1) no existe tarjeta permanente «Explorar»; (2) la indicación contextual aparece al entrar en rango y desaparece al salir; (3) las vistas actuales de NPC, Hogar y Negocio se presentan sobre la escena y conservan su contenido y acciones; (4) WASD/flechas siguen moviendo al jugador con el menú abierto; (5) al editar campos de comercio, las teclas de movimiento no alteran el movimiento y no se atasca al cambiar foco; (6) el menú activo se cierra al superar el rango existente; (7) el viaje sigue cambiando al pueblo destino y avanzando un día; (8) compra, venta, límites y feedback de comercio siguen funcionando; (9) distribución usable en varios anchos de ventana de escritorio.
- **Decisiones creativas:** ninguna pendiente; dirección y autonomía UX aprobadas expresamente por el diseñador en la solicitud del 23-10-2026.
- **Planificación adicional:** no necesaria; alcance acotado a presentación y manejo de foco en los controles existentes.
- **Playtesting humano:** requerido y completado; el diseñador confirmó que interacción contextual, overlays, movimiento con menú abierto, cierre por distancia y comercio funcionan correctamente.
- **Archivos modificados:** `projects/comerciante-medieval/src/App.tsx`, `projects/comerciante-medieval/src/scene/VillageScene.tsx`, `projects/comerciante-medieval/src/styles.css` y este registro.
- **Verificaciones:** `npm test` — 38 pruebas aprobadas; `npm run build` — aprobado (aviso de chunk minificado mayor a 500 kB); `git diff --check` — limpio. No se pudo realizar comprobación visual en navegador porque no había navegador disponible en el entorno.
- **Revisión independiente:** revisión de código aprobada sin defectos funcionales demostrables ni hallazgos bloqueantes de implementación. Limitación señalada: las pruebas existentes no ejercitan prompt, foco/teclado ni overlay de extremo a extremo; se requiere confirmación práctica.
- **Playtesting humano:** aprobado por el diseñador para el cierre de ITER-2026-10-23-02.
- **Estado:** iteración cerrada con implementación, verificaciones técnicas, revisión independiente sin hallazgos bloqueantes y playtesting humano aprobado. Commit local autorizado.

### ITER-2026-10-23-03 — Interfaz de comercio y prohibición de recompra de producción familiar

- **Estado inicial registrado antes de implementar:** `HEAD` `58a6fb1f0f5b50df4039ac8cd403adc9708413bf` (ITER-2026-10-23-02 cerrada); rama `main`, 15 commits por delante de `origin/main`; sin cambios staged ni tracked unstaged. Preexistente sin seguimiento: `experiments/multiagent-ts-pilot/.gitignore`, `experiments/multiagent-ts-pilot/src/clamp.ts`, `experiments/multiagent-ts-pilot/test/clamp.test.cjs`, `experiments/multiagent-ts-pilot/tsconfig.json`. No tocar ni incluir esos archivos.
- **Brief y aprobación:** comportamiento actual: el comercio divide la navegación entre Hogar/Negocio y selector desplegable de mercancías; una familia puede recomprar producción propia. Cambio aprobado expresamente por el diseñador: panel único Comprar/Vender con tarjetas, ofertas identificadas por destinatario, cantidad y cotización en el mismo panel; ninguna familia puede comprar al jugador mercancías producidas por cualquiera de sus negocios, tanto desde hogar como negocio. La prohibición considera todas las empresas de la familia, sin importar el origen del bien; no limita comprar al productor ni vender a otra familia. Rechazos económicos inválidos deben ser atómicos y no generar eventos.
- **Clasificación proporcional:** mejora UX/presentación combinada con corrección económica acotada. No se abre un hito nuevo ni se requiere más planificación; ejecutar como una iteración post-cierre con interfaz y motor verificados por separado.
- **Alcance y restricciones:** solamente comercio y regla económica asociada en `projects/comerciante-medieval/`; conservar movimiento mientras comercia, cierre fuera de radio 1,85, controles editables, viaje y avance de días, escena/NPC/edificios/caravana, parámetros de balance y reglas restantes. Sin nombres nuevos, dependencias, cambios a arquitectura ni modificaciones a `experiments/`.
- **Criterios verificables:** (1) panel único con acciones Comprar/Vender y tarjetas visuales; (2) compras solo desde stock comercial; ventas listan cada oferta de hogar/negocio pertinente y separan compradores cuando ambos aceptan; (3) selección, cantidad, precio, máximo, total, efectos de dinero/carga, botón inequívoco y feedback; (4) vacíos/restricciones explicados; sin navegación Hogar/Negocio ni desplegables; (5) regla anti-recompra en listados, cotización/máximo y ejecución autoritativa; rechazo sin mutar dinero, inventarios, necesidades, progreso ni eventos; (6) regresiones para compra, hogar, insumos/herramientas, dos compradores, sastre/ropa, familia con varias empresas, restricciones previas de dinero/carga/stock/necesidades; (7) viaje, días, movimiento con panel abierto, foco editable y distancia se mantienen.
- **Decisiones creativas:** ninguna pendiente. Nueva regla económica y autonomía UX aprobadas expresamente en el encargo de ITER-2026-10-23-03. La regla se registra aquí como aprobación suplementaria; la especificación v0.2 aprobada no se edita retrospectivamente.
- **Planificación adicional:** no necesaria; cambios acotados a interfaz existente y validación del motor.
- **Playtesting humano:** aprobado para la versión ajustada; el diseñador considera aceptable su experiencia para la demo actual y autoriza el cierre. La primera versión había recibido aprobación de dirección general con los ajustes registrados en la continuación de esta ficha.
- **Archivos modificados:** `projects/comerciante-medieval/src/App.tsx`, `projects/comerciante-medieval/src/engine/player.ts`, `projects/comerciante-medieval/src/styles.css`, `projects/comerciante-medieval/tests/run.ts` y este plan. Sin cambios a la especificación, escena 3D, dependencias ni `experiments/`.
- **Verificaciones:** `npm.cmd test` — 42 pruebas aprobadas; incluye compra del jugador, venta de herramienta e insumos, venta al hogar, compradores separados, sastre/ropa, familia con varias empresas, vendedor externo, compra al productor y rechazos sin mutaciones. `npm.cmd run build` — aprobado; conserva aviso Vite de chunk minificado >500 kB. `git diff --check` — limpio. No se pudo comprobar visualmente: no hay navegador disponible en esta sesión y CUA rechazó crear una pestaña iab.
- **Revisión independiente:** aprobada sin defectos de implementación demostrables ni hallazgos de código bloqueantes. Confirmó controles de producción en listado, cotización y transacción autoritativa. La inspección visual de esta sesión no estuvo disponible; el playtesting humano de la versión ajustada se registra abajo.
- **Playtesting humano:** aprobado por el diseñador para la versión ajustada; los aspectos de experiencia que motivaron el ajuste se atendieron dentro de esta misma iteración.
- **Estado:** ITER-03 cerrada con playtesting humano aprobado, implementación dentro del alcance, 43 pruebas, build y revisión independiente completados. Commit local autorizado.

#### Ajuste UX aprobado tras playtesting — continuación de ITER-2026-10-23-03

- **Playtesting y decisión del diseñador:** la dirección general del nuevo comercio es mejor, pero requiere una ronda de ajuste. Aprobado: reducir texto e información interna; usar feedback genérico y breve; hacer la operación inmediata de una unidad al pulsar una tarjeta/oferta; eliminar el selector de cantidad, el detalle inferior y la confirmación adicional; mantener precio por unidad, stock o máximo, destinatario y estado disponible. Si hay dos compradores, cada destino debe seguir siendo una acción diferenciada. Esta ronda cambia UX/presentación; mantiene todas las reglas económicas aprobadas.
- **Estado inicial de esta ronda:** `HEAD` `58a6fb1f0f5b50df4039ac8cd403adc9708413bf`; sin cambios staged. Ya estaban modificados por ITER-03 `docs/comerciante-medieval-implementation-plan-v0.1.md`, `projects/comerciante-medieval/src/App.tsx`, `projects/comerciante-medieval/src/engine/player.ts`, `projects/comerciante-medieval/src/styles.css`, `projects/comerciante-medieval/tests/run.ts`. Preexistentes sin seguimiento, fuera de alcance: `experiments/multiagent-ts-pilot/.gitignore`, `experiments/multiagent-ts-pilot/src/clamp.ts`, `experiments/multiagent-ts-pilot/test/clamp.test.cjs`, `experiments/multiagent-ts-pilot/tsconfig.json`.
- **Criterios de esta ronda:** (1) quitar `Fondo familiar compartido` y el texto específico de producción propia; (2) al pulsar tarjeta de compra/vendedor, procesar exactamente una unidad y actualizar estado; (3) compradores hogar/negocio se pueden elegir por separado para el mismo bien; (4) tarjetas muestran solo icono, nombre, precio unitario, stock/máximo, destino y disponibilidad; (5) no queda cantidad editable, proyección extensa ni confirmación; (6) conservar feedback breve y comprensible y todas las reglas/interacciones previas.
- **Implementación de esta ronda:** `projects/comerciante-medieval/src/App.tsx`, `projects/comerciante-medieval/src/styles.css` y `projects/comerciante-medieval/tests/run.ts`. El motor y sus reglas no cambiaron en este ajuste.
- **Verificaciones:** `npm.cmd test` — 43 pruebas aprobadas, incluida regresión de compra y venta de exactamente una unidad; `npm.cmd run build` — aprobado, con aviso Vite existente de chunk minificado >500 kB; `git diff --check` — limpio.
- **Revisión independiente:** sin defectos de código bloqueantes. Confirmó la operación inmediata de una unidad, separación de destinos, feedback breve y persistencia de las restricciones económicas previas. Hallazgo UX no bloqueante: tarjetas de compra etiquetadas «No disponible» aún son pulsables y generan feedback de rechazo; confirmar durante playtesting si este comportamiento resulta claro o si esas tarjetas deben ser inertes.
- **Limitación visual:** no hay navegadores/apps disponibles en CUA, por lo que no se comprobó visualmente el render final.
- **Playtesting humano de esta versión:** aprobado por el diseñador; considera aceptable la experiencia ajustada para la demo actual y autoriza el cierre y commit local.
- **Observación no bloqueante:** las tarjetas de compra «No disponible» pueden pulsarse y muestran el feedback de rechazo. Se registra para evaluación posterior; no se cambia en esta iteración.
- **Estado:** ITER-03 cerrada con playtesting humano aprobado, implementación dentro del alcance, 43 pruebas, build y revisión independiente sin defectos bloqueantes. Commit local autorizado.

### ITER-2026-10-23-04 — Identidad visual de pueblos, personajes y negocios

- **Estado inicial registrado antes de implementar:** `HEAD` `1416078e93366bf52eaa6b8b21dc6e9ec0a865ed`; rama `main`, 16 commits por delante de `origin/main`; sin cambios staged ni tracked unstaged. Preexistente sin seguimiento: `experiments/`. Se mantiene fuera de alcance y no se modifica.
- **Brief y aprobación:** comportamiento actual: la UI y los destinos usan «Pueblo A/B»; los NPC se identifican con el oficio genérico, comparten la misma silueta/atuendo y los negocios usan un único panel claro sin símbolo legible. El personaje jugador cambia el color del sombrero según el pueblo. Cambio aprobado expresamente en la solicitud de ITER-04: dar nombres propios a Valle de Robles y Piedra Alta, asignar nombres a los ocho NPC existentes, mostrar nombre y oficio donde se los presenta, diferenciarlos con recursos low-poly individuales y claves visuales compartidas por oficio, señalar negocios con símbolos coherentes y mantener la apariencia del jugador idéntica entre pueblos.
- **Clasificación proporcional:** mejora UX/presentación. No requiere un nuevo plan de hitos; se registra como iteración post-cierre del plan vigente.
- **Alcance y restricciones:** presentación visual y textual de las dos escenas, ocho NPC existentes, sus edificios y sus interfaces pertinentes. Nombres de referencia aprobados: Valle de Robles — Inés (agricultora), Martín (leñador), Alda (herrera), Tomás (sastre); Piedra Alta — Mateo (agricultor), Bruna (minera), Nerea (carpintera), Darío (joyero). Conservar IDs internos, asignaciones de familias/negocios, economía, controles y navegación. Sin nuevas entidades, profesiones, edificios, dependencias, comercio adicional, puertas/salidas, caravana representada, viaje rediseñado, cambios al horizonte ni cambios a `experiments/`, workflow o skills.
- **Criterios verificables:** (1) nombres de los pueblos aparecen consistentemente en HUD/captions y destinos; (2) los ocho NPC muestran nombre y oficio en prompt/interacción y paneles donde corresponda; (3) cada NPC tiene silueta, ropa o accesorio reconocible aun sin depender solo del color; (4) señales visuales de oficio se repiten entre personaje y negocio correspondiente y son legibles desde la cámara actual; (5) las dos escenas mantienen al jugador con representación idéntica; (6) identificadores y referencias del motor económico permanecen intactos y las pruebas de economía siguen pasando; (7) no se introducen nuevos elementos fuera del alcance.
- **Decisiones creativas:** ninguna pendiente dentro del alcance delegado por el diseñador: nombres indicados y decisiones convencionales de color, accesorios, símbolos y composición low-poly quedan autorizadas por esta solicitud. La especificación funcional v0.2 no se modifica.
- **Planificación adicional:** no necesaria; trabajo acotado a la presentación ya existente.
- **Playtesting humano:** necesario antes del cierre, porque afecta la legibilidad visual del mundo y el reconocimiento de NPC y negocios. Instrucciones: visitar ambos pueblos con la cámara actual; identificar los ocho personajes por nombre y oficio; relacionar señales y accesorios con sus profesiones; comprobar que el jugador conserva el mismo aspecto antes/después de viajar; confirmar legibilidad sin apoyarse en la iluminación.
- **Archivos modificados:** `projects/comerciante-medieval/src/scene/world.ts`, `projects/comerciante-medieval/src/scene/VillageScene.tsx`, `projects/comerciante-medieval/src/App.tsx`, `projects/comerciante-medieval/src/styles.css`, `projects/comerciante-medieval/tests/run.ts` y este plan. No se modificó `src/engine/`, la especificación, dependencias ni `experiments/`.
- **Verificaciones:** `npm.cmd test` — 44/44 aprobadas, incluyendo identidades visibles y vínculos de pueblo/NPC/familia/negocio; `npm.cmd run build` — aprobado con aviso Vite existente de chunk >500 kB; `git diff --check` — limpio. Se intentó abrir la demo local, pero CUA indicó que el navegador IAB no está disponible; no hubo inspección visual automatizada.
- **Revisión independiente:** sin defectos de código bloqueantes. Confirmó que los IDs y referencias económicas permanecen intactos, que los materiales del jugador son constantes entre pueblos y que personajes/letreros comparten señales geométricas por oficio. Limitación no bloqueante de cobertura: las pruebas automáticas verifican datos, no render ni legibilidad final.
- **Playtesting humano:** pendiente. Se requiere evaluar ambos pueblos, los ocho nombres/oficios, reconocimiento de señales y accesorios desde la cámara actual y apariencia constante del jugador tras viajar.
- **Estado:** implementación y verificaciones técnicas completadas; revisión independiente sin defectos bloqueantes; cierre pendiente de playtesting humano. No hacer commit en esta entrega.

#### Ajuste visual tras playtesting — continuación de ITER-2026-10-23-04

- **Estado al iniciar el ajuste:** `HEAD` `1416078e93366bf52eaa6b8b21dc6e9ec0a865ed`; sin cambios staged. Persisten las seis modificaciones tracked de ITER-04 en su plan, UI, escena, datos visibles y pruebas. Preexistentes sin seguimiento y fuera de alcance: `experiments/multiagent-ts-pilot/.gitignore`, `experiments/multiagent-ts-pilot/src/clamp.ts`, `experiments/multiagent-ts-pilot/test/clamp.test.cjs`, `experiments/multiagent-ts-pilot/tsconfig.json`.
- **Playtesting humano y problema:** el diseñador confirma que pueblos, oficios y negocios se entienden mejor; dos NPC femeninos aún se perciben como un modelo masculino calvo reutilizado. La causa observable en la escena es que la variante femenina usa solo dos pequeños volúmenes laterales de cabello y conserva una base corporal/vestimenta casi igual a la masculina.
- **Ajuste aprobado:** reforzar de forma simple y reutilizable las bases visuales femeninas y masculinas para que se distingan por silueta, cabello y/o vestimenta, no solo por color. Mantener identidad individual, señales por oficio y edificio, nombres e IDs actuales. El ajuste cubre todas las apariciones de la variante femenina para que la solución compartida sea coherente; no crear un sistema complejo de personajes.
- **Alcance:** modelo visual de NPC en `projects/comerciante-medieval/src/scene/VillageScene.tsx` y pruebas visuales/regresiones pertinentes. No modificar jugador, decorado general, pueblos/árboles/rocas/fondo/puerta/caravana, nombres, oficios, señales, relaciones económicas, motor, especificación, dependencias ni `experiments/`.
- **Criterios de aceptación:** (1) todas las NPC femeninas usan una base con cabello claramente visible y una silueta/vestimenta diferenciable desde la cámara actual; (2) la variante femenina se percibe distinta sin depender del color; (3) la variante masculina conserva su identidad; (4) se mantienen accesorios y colores de profesión y sus correspondencias con los letreros; (5) nombres, IDs y referencias económicas existentes no cambian; (6) pruebas, build y revisión independiente pasan; (7) playtesting humano confirma la legibilidad antes del cierre.
- **Planificación y decisiones:** ajuste pequeño dentro de ITER-04; no requiere otro plan ni nuevas decisiones creativas. Se autoriza una solución low-poly convencional y reutilizable.
- **Archivos previstos:** `projects/comerciante-medieval/src/scene/VillageScene.tsx`, pruebas pertinentes si hace falta, y este plan. Playtesting visual final requerido; commit explícitamente pendiente.
- **Implementación del ajuste:** se modificó solo `projects/comerciante-medieval/src/scene/VillageScene.tsx`. La variante femenina usa cofia low-poly con cobertura superior, volumen posterior y mechones frontales largos, además de una túnica inferior acampanada; la masculina conserva su cofia corta. La solución se aplica de forma común a las cuatro NPC femeninas. Se conservaron accesorios y señales de oficio, nombres, jugador, mundo e IDs.
- **Verificaciones:** `npm.cmd test` — 44/44 aprobadas; `npm.cmd run build` — aprobado con aviso Vite existente de chunk >500 kB; `git diff --check` — limpio (Git solo advierte la conversión LF/CRLF).
- **Revisión independiente de esta ronda:** aprobada, sin defectos de código bloqueantes. Confirmó diferencias por forma, cabello y vestimenta además del color; accesorios por oficio y letreros conservados; jugador sin cambios; referencias de mundo/economía protegidas y sin diff en `src/engine/`.
- **Playtesting humano final:** aprobado expresamente por el diseñador. Confirma las variantes visuales femeninas y masculinas, la identificación de oficios por siluetas/cabello/vestimenta/accesorios, la correspondencia entre NPC y negocios y la consistencia del jugador al viajar entre pueblos.
- **Cierre:** aceptación del playtesting recibida; los cambios están dentro del alcance y no hay hallazgos bloqueantes. Commit local autorizado con el mensaje `feat(comerciante-medieval): improve NPC and business visual identity`. Sin push.
- **Estado:** ITER-04 cerrada tras pruebas, build, revisión independiente y playtesting humano aprobados.
