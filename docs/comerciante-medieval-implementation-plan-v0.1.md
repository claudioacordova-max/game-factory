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

## Ejecución posterior con Game Factory v1

Antes de cada hito, el coordinador relee especificación, plan e instrucciones; registra `HEAD` y estado Git completo e identifica cambios preexistentes. Delega solo el alcance aprobado al `implementer`; inspecciona diff, pruebas, build y alcance; luego solicita revisión independiente al `reviewer`, sin compartir razonamiento interno del implementador. Se permiten hasta dos ciclos de corrección de defectos técnicos reproducibles, repitiendo verificaciones y revisión tras cada ciclo.

El coordinador solo crea commit local al pasar verificaciones, recibir revisión sin bloqueos, mantener alcance y cumplir el playtesting requerido. Stagea rutas explícitas, inspecciona diff preparado y no incluye cambios preexistentes, `experiments/`, secretos ni archivos generados. No hace push. Continúa únicamente con hitos ya autorizados; se detiene ante playtesting pendiente, decisiones creativas, expansión de alcance, bloqueos persistentes o fallos no resueltos.
