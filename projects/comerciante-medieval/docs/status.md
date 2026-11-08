# Comerciante Medieval — estado actual

Revisión: 2026-11-07 (ficha de continuidad; el resto del documento, 2026-10-28). Ámbito: demo `projects/comerciante-medieval/`. Corte inspeccionado: `54955677ec9430695b233c99a8fb4067b103a86d`; último cambio del juego: `737fea910ae0461eabf2520d365cbb49035b1cd5` (ITER-10, 2026-10-24).

Este documento describe la implementación existente, corroborada mediante lectura del motor, la UI y los registros. Distingue los cierres históricos de las pruebas reejecutadas durante la migración documental; no constituye una nueva aprobación de diseño ni acredita playtesting nuevo.

## Ficha de continuidad

Lectura mínima para retomar trabajo (workflow v1.2): esta ficha → [decisions.md](decisions.md) → [spec-v1.md](spec-v1.md) → código afectado. El [plan vivo](implementation-plan.md) registra autorizaciones y cierres; `history/` solo se consulta para procedencia.

| Campo | Valor |
|---|---|
| Último cierre | ITER-10, `737fea9` (aceptado con playtesting 2026-10-24) |
| Siguiente hito | Ninguno autorizado |
| Decisiones abiertas | Discrepancia `needs.progression` del panel experimental, sin corrección autorizada. Ver [decisions.md](decisions.md#4-pendientes-abiertos) |
| Configuración activa | Dos pueblos, sesión en memoria, panel de inspección cerrado por defecto |
| Comprobaciones | `npm test` (51 casos, última ejecución 2026-10-28) y `npm run build` desde `projects/comerciante-medieval/` |
| Incidencias conocidas | Discrepancia `needs.progression`; bundle >500 kB; cobertura parcial del DOM. Ninguna con tarea autorizada |

## Propuesta y bucle jugable

Sandbox de comercio medieval sin combate ni condición de victoria o derrota. El jugador camina por dos pueblos, consulta negocios y necesidades familiares, compra mercancías, las transporta y las vende. Las oportunidades dependen de existencias, necesidades, dinero y visitas de una caravana; los precios son fijos por canal.

Caminar y comerciar no consumen días. **Avanzar día** o viajar al otro pueblo ejecuta un día económico global para ambos pueblos. El progreso permanece en memoria mientras la página sigue cargada; recargar inicia otra sesión.

## Sistemas implementados

- Ocho familias, una por negocio inicial, con dos adultos cada una. Hogar y negocio comparten dinero; inventarios doméstico, comercial, productivo y herramientas están separados.
- Producción con recetas, insumos y desgaste; consumo diario de comida/leña y durabilidad de ropa/herramientas. No hay producción extractiva sin herramienta.
- Necesidades rojas/amarillas/verdes, compras autónomas y progresión doméstica hasta el tramo 3. Los bienes duraderos se conservan al descender. Ascender a 3 requiere 1.000 monedas; 2.000 es la meta monetaria de prosperidad, sin tramo 4.
- Caravana con circuito de nueve días, abastecimiento y exportación. Su oferta y dinero son abstractos e ilimitados; las familias conservan límites reales de fondos. El puerto solo pertenece al circuito, no es visitable.
- Compra del jugador a 0,9 del precio de referencia y venta a 1,1, sujetas a stock, carga, pertinencia, fondos y topes. Ninguna familia recompra al jugador bienes producidos por cualquiera de sus negocios.
- Comercio con pestañas **Comprar/Vender** y operación inmediata de **una unidad por clic**. Cada comprador pertinente sigue siendo una oferta separada. Rechazos sin transferencia; saldo familiar visible junto al NPC.
- Inventario con cantidades poseídas, carga utilizada/máxima/disponible y ocupación por bien. El HUD muestra saldo y mercancías transportadas con cantidades; la carga se consulta en el inventario.

El jugador comienza en Valle de Robles, día 1, con 300 monedas, inventario vacío y capacidad 20. Los parámetros económicos son un baseline experimental autorizado, no una demostración de equilibrio.

## Contenido y presentación

| Pueblo | Habitantes y negocios |
|---|---|
| Valle de Robles | Inés, agricultora; Martín, leñador; Alda, herrera; Tomás, sastre |
| Piedra Alta | Mateo, agricultor; Bruna, minera; Nerea, carpintera; Darío, joyero |

Hay nueve mercancías: comida, leña, madera, metal, tela, herramienta, ropa, mueble y joya. La tela es importada por la caravana; Pueblo B no produce leña. Los pueblos tienen identidad agrícola/arbolada y minera/pétrea, NPC y señales de oficio diferenciados y un protagonista comerciante low-poly con orientación de movimiento conservada al viajar. La salida señalizada permite viajar; la caravana tiene representación visual durante sus visitas, sin añadir comercio presencial del jugador con ella.

Controles: WASD/flechas, **E** o botón contextual para interactuar; **I** alterna inventario y **Esc** cierra ventanas. El comercio se cierra al alejarse más de 1,85 unidades del NPC activo. La interfaz conserva foco de teclado y adaptación a escritorio/pantalla estrecha; estos últimos son resultados registrados de iteraciones, no una inspección nueva de todos los dispositivos.

## Inspección y experimentos

El motor TypeScript funciona sin React/Three.js. `npm run simulate` produce simulaciones reproducibles de 9, 36 y 90 días; también admite escenarios, duraciones y semilla. El panel **Herramientas de inspección y prueba**, inicialmente cerrado, inspecciona estados e inventarios y permite ejecutar escenarios, modificar parámetros declarados y copiar/exportar informes. Cada experimento reinicia su escenario y no altera la partida normal abierta.

Los ocho escenarios implementados cubren ciclo normal, falta de herramienta, falta de insumos, escasez de leña en B, oportunidad comercial, regresión de tramo, mercado sin comprador y caravana ausente. La especificación conserva también observaciones de 36/90 días para estabilidad y crecimiento; no son escenarios adicionales de UI.

## Desarrollo y límites

Los siete hitos originales están completados. ITER-01–06 tienen cierres registrados; ITER-07/08 fueron sustituidas en la práctica y no tienen cierre formal propio. ITER-09 y 10 sí tienen aprobación humana y cierre. No hay una implementación activa ni un nuevo roadmap autorizado en este corte.

El registro final de ITER-10 informa 51 pruebas, build y revisión independiente aprobados y revisión/playtesting manual aceptados por el diseñador. Son evidencias del cierre de 2026-10-24. El build histórico informa un bundle principal de aproximadamente 1.237 kB y aviso >500 kB.

Durante la migración documental principal del 2026-10-28, el coordinador sí reejecutó `npm.cmd test`: las 51 pruebas resultaron satisfactorias. No se repitieron builds, revisiones visuales ni playtesting; la revisión independiente de la migración fue documental y técnica. Las pruebas no cubren el DOM completo. La limpieza final posterior no vuelve a ejecutar la suite ni amplía esa evidencia; véase el [plan de continuidad](implementation-plan.md).

Limitaciones relevantes:

- Sin guardado durable, interiores, combate, misiones, precios dinámicos, regateo ni progresión propia del jugador.
- La caravana puede inyectar dinero y el balance puede producir saturación, escasez u oscilaciones de tramo. Los márgenes teóricos no garantizan rentabilidad ni diversión; no se declara la economía definitivamente equilibrada.
- Parte de las capturas y referencias de rediseño histórico no está en el repositorio; los reportes completos de cada revisor tampoco se conservan separados del plan.
- Diferencia detectada al consolidar: `evaluateNeeds` en `src/engine/needs.ts` calcula el campo visible `needs.progression` con metas del tramo 2 también cuando la familia está en 3. En cambio, el indicador de prosperidad y las metas usadas para compras del tramo 3 sí emplean las metas superiores. El panel experimental muestra aquel campo; sus colores no acreditan por sí solos cumplimiento de prosperidad. La [especificación](spec-v1.md) conserva las metas aprobadas; esta migración no corrige el código ni decide una nueva regla.

## Referencias

- [README: arranque, controles y comandos](../README.md).
- [Especificación consolidada y procedencia](spec-v1.md).
- [Plan de continuidad y cierres](implementation-plan.md).
- [Especificación original](history/spec-v0.2.md) y [plan histórico íntegro](history/implementation-plan-v0.1.md).
