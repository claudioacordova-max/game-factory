# Comerciante Medieval — especificación consolidada v1

Revisión: 2026-10-28. Ámbito: demo `projects/comerciante-medieval/`. Código de referencia: `54955677ec9430695b233c99a8fb4067b103a86d`; último cierre del juego: `737fea910ae0461eabf2520d365cbb49035b1cd5`.

**Estado:** consolidación de requisitos previamente aprobados, no nueva aprobación de diseño. Sustituye como entrada de consulta la v0.2 y reúne modificaciones posteriores, sin reescribir los originales archivados. **[C]** decisión confirmada; **[E]** baseline experimental autorizado, no equilibrio validado; **[R]** riesgo o discrepancia de evidencia; **[F]** fuera de alcance. No autoriza funcionalidades nuevas.

## Autoridad y fuentes

| Fuente conservada | Información y precedencia |
|---|---|
| [Especificación v0.2](history/spec-v0.2.md), aprobada 2026-10-22 | Base económica, entidades, recetas, cifras, pruebas y exclusiones. D9 incorpora la aclaración del 23 de octubre. |
| [Plan histórico](history/implementation-plan-v0.1.md), Hitos 1–7 | Implementación, decisiones, comprobaciones y aceptación de la demo original. |
| Mismo plan, ITER-01/02 | Proximidad, cierre por distancia, interacción contextual y overlays. |
| Mismo plan, ITER-03 y continuación | Prohibición de recompra de producción familiar y comercio por clic de una unidad; sustituyen el flujo de UI Hogar/Negocio y cantidad/confirmación. |
| Mismo plan, ITER-04/05/06 | Identidad y nombres de pueblos/personajes, ambientes, orientación, salida de viaje y caravana visible. |
| Mismo plan, ITER-09/10 | UI actual: clic directo, inventario I/Esc, carga dentro del inventario, saldo familiar e iconografía. ITER-07/08 son antecedentes sustituidos sin cierre formal propio. |

Las decisiones posteriores expresas prevalecen dentro de su alcance. La lectura de motor, escena, App y `ui/presentation.ts` corrobora implementación, pero no convierte por sí sola conducta no autorizada en requisito. El [estado](status.md) separa implementación y límites; el [plan de continuidad](implementation-plan.md) conserva cierres y asuntos abiertos. No hay requisitos nuevos pendientes autorizados en esta consolidación.

## 1. Propuesta y alcance

**[C]** Sandbox de comerciante medieval sin combate: recorrer pueblos, consultar oferta/necesidades, comprar, transportar y vender bienes. Las familias consumen, producen, disponen de dinero y progresan. Las oportunidades dependen de inventarios, necesidades y diferencias entre canales, sin precios dinámicos ni regateo.

Dos pueblos visitables, cuatro familias/negocios por pueblo, nueve mercancías y una caravana. El puerto es exclusivo del circuito de caravana, no escena ni destino del jugador. No hay victoria/derrota, necesidades domésticas del jugador ni negocio propio suyo. Quedarse sin dinero/carga no termina la partida.

El bucle es aproximarse a un NPC, consultar Comprar/Vender, ejecutar operaciones, preparar carga, viajar o avanzar día y evaluar oportunidades nuevas. Caminar, consultar y comerciar no consumen días. El estado dura mientras la página permanece cargada; recargar reinicia. No se promete guardado durable.

## 2. Entidades, propiedad e identidad

| Pueblo/ID | NPC y oficio | Produce | Recurso profesional |
|---|---|---|---|
| Valle de Robles / A | Inés, agricultora | Comida | Herramienta |
| Valle de Robles / A | Martín, leñador | Leña y madera | Herramienta |
| Valle de Robles / A | Alda, herrera | Herramientas | Metal |
| Valle de Robles / A | Tomás, sastre | Ropa | Tela |
| Piedra Alta / B | Mateo, agricultor | Comida | Herramienta |
| Piedra Alta / B | Bruna, minera | Metal | Herramienta |
| Piedra Alta / B | Nerea, carpintera | Muebles | Madera |
| Piedra Alta / B | Darío, joyero | Joyas | Metal |

La familia es el agente económico; todos sus negocios y hogar comparten un fondo monetario real. El NPC es interlocutor visual, sin economía personal adicional. El escenario **[E]** usa dos adultos y un negocio por familia; las fórmulas contemplan una o más personas, sin demografía.

Separar inventario doméstico no vendible al jugador, stock comercial, reserva productiva y herramientas. Una transferencia interna mueve bienes reales sin pago ficticio a sí mismo. Producir consume insumos y añade salidas comerciales. No permitir existencias/dinero negativos ni duplicaciones.

No hay producción local de tela; Pueblo B carece de leña local. La caravana no es familiar, no tiene necesidades ni progresión y dispone de oferta/dinero abstractos ilimitados. Solo compra excedentes reales y cobra a familias con saldo limitado.

## 3. Mercancías, tarifas y carga

Solo mercancías genéricas, sin calidades/subtipos. Cantidades enteras, importes con precisión para décimas y carga para medias unidades. El motor usa décimas monetarias y medias unidades de peso.

| Bien | Precio referencia P [E] | Peso/unidad [E] |
|---|---:|---:|
| Comida | 5 | 1 |
| Leña | 8 | 2 |
| Madera | 10 | 2 |
| Metal | 22 | 2 |
| Tela | 18 | 1 |
| Herramienta | 200 | 4 |
| Ropa | 90 | 1 |
| Mueble | 100 | 5 |
| Joya | 180 | 0,5 |

| Canal | Tarifa unitaria [E] |
|---|---|
| Familia compra a negocio local | P |
| Caravana compra excedente al negocio | 0,8 P |
| Caravana vende al hogar/negocio | 1,2 P |
| Jugador compra stock comercial | 0,9 P |
| Jugador vende a necesidad doméstica/productiva | 1,1 P |

No hay precio manual, trueque ni formación dinámica del precio. Mostrar la tarifa en la oferta antes del clic; necesidad, stock/fondos determinan disponibilidad, no precio nuevo. Cambiar tarifas solo en experimentos declarados o con autorización posterior.

Jugador **[E]**: 300 monedas, inventario vacío y carga máxima 20; dinero sin peso. Comprar valida saldo, stock y carga; vender libera carga al transferir. No hay almacén personal externo, caída de mercancías, carros o mejoras de capacidad. Márgenes brutos ilustrativos metal 19,8→24,2, madera 9→11 o ropa 81→99 no garantizan compradores ni beneficio neto.

## 4. Producción, consumo y desgaste

| Oficio | Salida/receta [E] | Insumo [E] | Período global [E] |
|---|---|---|---|
| Agricultor A/B | 10 comidas | Herramienta, sin materia prima | 1 día |
| Leñador | 5 leñas y 2 maderas | Herramienta | 1 día |
| Minero | 2 metales | Herramienta | 1 día |
| Herrero | 1 herramienta | 2 metales | 4 días |
| Sastre | 1 ropa | 1 tela | 2 días |
| Carpintero | 1 mueble | 2 maderas | 2 días |
| Joyero | 1 joya | 1 metal | 4 días |

Sin herramienta un extractor produce cero. Fabricantes necesitan receta íntegra. Producir en múltiplos del período global con insumos presentes al inicio; si faltan, no acumular producción debida, reintentar el siguiente día programado. No simular sueldos, descanso o capacidad laboral.

- Consumo: una comida/integrante/día y una leña/familia/día.
- Herramienta **[E]**: 60 días de trabajo efectivo, desgastando solo la usada. Si se agota se retira después de obtener la producción del día; otra reserva puede usarse después.
- Ropa **[E]**: 80 días de uso. La agotada deja de contar inmediatamente. El escenario actual inicia las dos mudas con duración plena; no se exige escalonamiento adicional.
- Muebles/joyas no se consumen ni deterioran. Materiales desaparecen por receta, sin caducidad. No hay reparación/mejoras/subtipos de herramientas.

## 5. Necesidades y progresión familiar

**[C]** Priorizar supervivencia y actividad profesional, después metas materiales del tramo actual antes de ahorrar deliberadamente para el siguiente. Los colores expresan cobertura, no una variable psicológica. Bienes anteriores cuentan para metas nuevas y se conservan al descender.

| Meta | Tramo 1 | Tramo 2 | Tramo 3, techo |
|---|---|---|---|
| Comida/leña | 14 días | Mantener base | Mantener base |
| Ropa utilizable | 1 muda/integrante | 2/integrante | 4/integrante |
| Herramientas extractivas | 2 utilizables | Mantener base | Mantener base |
| Insumos manufactureros | Reserva de ciclo | Mantener base | Mantener base |
| Muebles | Sin meta | 1/integrante | 4/familia |
| Joyas | Sin meta | 1/adulto | 4/adulto |
| Dinero | Entrada a 2: 200 + 100×integrantes | Entrada a 3: 1.000 | Prosperidad: 2.000, sin tramo 4 |

Las cuantías son **[E]**. **D9** cierra la interpretación monetaria: 1.000 permite ascender 2→3 y mantener 3; 2.000 es solo meta de prosperidad, nunca umbral de ascenso a 3 ni creación de 4.

Estados aprobados:

- Comida: raciones/integrantes; leña: unidades/familia. Menos de 7 días rojo; de 7 a menos de 14 amarillo; desde 14 verde **[E]**.
- Herramientas: 0 rojo, 1 amarillo, 2+ verde **[C]**.
- Insumos: ninguna receta íntegra rojo; una pero menos de reserva amarillo; reserva completa verde. Objetivo **[E]** de nueve días: 3 lotes herrero/joyero, 5 lotes sastre/carpintero: 6 metales/3 metales/5 telas/10 maderas respectivamente.
- Ropa/muebles/joyas **[E]**: verde al alcanzar meta, amarillo desde 50 % sin completarla, rojo por debajo. Ver «Límites de corroboración» para la representación de tramo 3.
- Dinero es condición de entrada/salida, no producto a comprar.

Ascenso 1→2: básicas pertinentes verdes y dinero ≥200+100×integrantes. Ascenso 2→3: básicas verdes, metas materiales de 2 completas y dinero ≥1.000. Tramo 2 tolera amarillo, pero básica roja o saldo bajo su umbral provoca descenso a 1. Tramo 3 desciende si saldo <1.000, básicas rojas o metas de sostén de 2 rojas; puede continuar descendiendo hasta 1. Recalcular tras transacciones/consumos relevantes, descenso antes que ascenso. Sin histéresis monetaria, sin destruir duraderos por bajar. Prosperidad exige las metas de 3 y 2.000, sin tramo nuevo.

## 6. Compras y exportación

Fundamentales admiten varias unidades hasta objetivo o agotar dinero/stock. Progreso (ropa adicional, muebles, joyas) admite **una unidad total por familia y día**, sin reinicio por menú, NPC o cambio de tramo.

Fundamentales: rojas antes de amarillas; supervivencia antes de producción, orden determinista. La espera nace al haber oferta local/caravana: roja intenta en la próxima oportunidad económica; amarilla tras un día de disponibilidad. El motor cuenta dos evaluaciones diarias consecutivas como espera satisfecha, no dos días adicionales. Si desaparece oferta, reinicia; si pasa a rojo, intento inmediato. Las ofertas directas del jugador no esperan el proceso autónomo.

Progreso se evalúa una vez/día: objetivo insatisfecho con menor cobertura entre disponibles y asequibles; empate ropa→muebles→joyas **[E]**. Verde significa satisfecho, no compras cada dos días. No acumular sin objetivo ni generar ahorros ficticios.

Hogar acepta solo necesidad activa hasta su objetivo. Negocio acepta herramientas/insumos de su oficio hasta reserva. Fondos compartidos limitan toda compra. El jugador solo compra stock comercial. **ITER-03 [C]: una familia no compra al jugador bienes producidos por cualquiera de sus negocios**, desde hogar o negocio, cualquiera sea el origen del bien. No limita comprar al productor ni vender a otra familia. Aplicar en oferta, cotización y transacción autoritativa.

Operación atómica: validar cantidad positiva entera, ubicación/destinatario, mercancía, fondos, stock, carga, necesidad y límite diario antes de transferir exactamente una vez. Revalidar al ejecutar; rechazar sin cambiar dinero, inventarios, necesidades, progreso ni eventos. No aplicar cantidad parcial silenciosa cuando se exige cantidad exacta. La UI actual solicita una unidad.

Caravana: solo comercia durante visitas. Tras demanda local/doméstica exporta salidas comerciales sobre reserva **[E]** de dos días de producción, redondeada a unidades enteras: 20 comidas; 10 leñas y 4 maderas; 1 herramienta/ropa/mueble/joya. No exportar inventarios domésticos ni insumos. El jugador no tiene comercio presencial implementado con caravana; la posibilidad condicional original no es capacidad actual ni tarea pendiente.

## 7. Tiempo y orden económico

Inicio día 1. Avanzar día/viajar procesa una vez las dos economías. Viajar solo al otro pueblo consume exactamente un día, sin precio monetario ni trayecto 3D. Esperar en pantalla no avanza tiempo. Puerto no seleccionable.

| Día del ciclo [E] | Caravana |
|---|---|
| 1–2 | Puerto |
| 3 | Viaje a Valle de Robles |
| 4–5 | Valle de Robles, comercio |
| 6 | Viaje a Piedra Alta |
| 7–8 | Piedra Alta, comercio |
| 9 | Viaje al puerto |

Repite cada nueve días: `((día global − 1) mod 9) + 1`. Visitas de varios días, sin liquidar todas las operaciones necesariamente al llegar. Puerto/tránsito no comercian con pueblos.

Orden diario autorizado **[E]**: (1) avanzar calendario/localizar caravana del nuevo día; (2) consumir comida/leña y desgastar ropa; (3) producir con recursos al inicio y desgastar herramienta usada; (4) recalcular necesidades/tramos y disponibilidad; (5) compras fundamentales locales y después caravana; (6) una compra de progreso/familia; (7) exportar excedentes; (8) recalcular/registrar eventos. Determinista, auditable, independiente de velocidad del navegador.

«Inmediato» significa oportunidad de procesamiento económico, no tiempo real. Ofertas directas se evalúan durante transacción. Abastecer un negocio debe habilitar el paso determinista de necesidades rojas sin avanzar fecha ni repetir consumo/producción. No ejecutar dos veces el mismo día.

## 8. Escenario inicial [E]

Cada familia: dos adultos, 450 monedas, 28 comidas, 14 leñas y dos mudas. Extractores: dos herramientas, sin duplicarlas en otros inventarios. Jugador: Valle de Robles, 300 monedas, inventario vacío y carga 20. Caravana: puerto, día 1.

| Negocio | Equipamiento/insumos iniciales | Stock comercial inicial |
|---|---|---|
| Agricultor A/B, cada uno | 2 herramientas | 20 comidas |
| Leñador A | 2 herramientas | 10 leñas y 4 maderas |
| Herrero A | 6 metales | 2 herramientas |
| Sastre A | 5 telas | 2 ropas |
| Minero B | 2 herramientas | 4 metales |
| Carpintero B | 10 maderas | 2 muebles |
| Joyero B | 3 metales | 2 joyas |

Se crean en tramo 1 con básicas verdes y dinero para ascender pronto, no con comodidad completa regalada. Arranques alternativos son escenarios explícitos, no cambios ocultos.

## 9. Presentación y controles aprobados

ITER-01–06/09/10, implementadas en el corte señalado:

- Pueblos exteriores 3D, ocho NPC accesibles, identidades/nombres/oficios y señales. Valle agrícola/arbolado, Piedra pétreo/minero; entorno extendido decorativo sin ampliar área jugable. Sin interiores.
- Protagonista comerciante común a ambos pueblos; orientación cardinal/diagonal por movimiento, retenida al parar/viajar. No exigir animación nueva de pasos.
- WASD/flechas, E o botón contextual para NPC/salida cercana. Prompt contextual. Comercio operativo hasta radio 1,85 incluido del NPC activo y cerrado al superarlo; caminar con comercio abierto disponible salvo captura en editables.
- Comprar/Vender superpuesto, sin navegación obligatoria Hogar/Negocio. Cada oferta opera **una unidad por clic**, sin cantidad editable, proyección extensa ni confirmación adicional. Bien, precio/importe, stock de compra o cantidad aceptada/destinatario de venta, disponibilidad y feedback breve. Si hogar/negocio aceptan el mismo bien, ofertas separadas.
- Fondo familiar real junto al NPC, actualizado. HUD compacto con dinero/día/localidad y bienes poseídos con cantidades. Inventario representado por bolsa sin moneda; joyas por gema.
- I alterna inventario desde controles/overlays, cierra vistas incompatibles e ignora repetición, modificadores y entradas que capturan texto. Esc cierra. Foco de teclado visible y sin marca residual de ratón.
- Inventario solo bienes poseídos con cantidades, carga usada/máxima/disponible y `Ocupa N` por bien; tamaño acorde y cierres sin solapamiento. Sin tarjeta de carga duplicada en HUD.
- Viaje compacto, ubicación actual/único destino y «1 día de viaje», sin confirmación redundante. Salida señalizada y caravana visual solo en visitas, sin rutas/transacciones nuevas.
- Navegación accesible y adaptación de composición; registros previos cubrieron escritorio 1440×900 y estrecho 390×844. No son certificación universal ni inspección nueva.

## 10. Inspección y criterios de verificación

Motor económico ejecutable sin interfaz gráfica. Panel de pruebas separado e inicialmente cerrado: familias, miembros, dinero, tramos, necesidades/decisiones; inventarios separados/herramientas/durabilidad/jugador; calendario/operaciones de caravana; informes diarios/ciclo copiables/exportables.

Simular 1/9/36/90 o duración entera con escenario/datos/semilla repetibles. Parámetros declarados para tarifas, producción/frecuencia, durabilidad y umbrales en ejecuciones aisladas; restaurarlos no cambia partida abierta. Ocho escenarios actuales: normal, sin herramienta, sin insumos, escasez B, oportunidad comercial, regresión de tramo, mercado sin comprador y caravana ausente. Observar 36/90 días extiende horizonte, no inventa escenarios.

Conservar criterios: separación de inventarios/fondos compartidos; producción real; conservación salvo fuentes/sumideros declarados; compras limitadas por necesidad/stock/fondos; ascenso/descenso/bienes acumulados; una unidad de progreso diaria; caravana solo en visitas; tiempo global sincronizado; precios/carga; ocho NPC y dos pueblos accesibles, puerto inaccesible; determinismo; anti-recompra; clic por unidad e I/Esc/carga/saldo actuales. Técnica no sustituye aceptación humana cuando el cambio la requiera.

No exigir todas las familias ricas a 90 días ni ausencia de quiebra. Reportar crisis, saturación, inyección de dinero, oscilación y oportunidades reales. Márgenes teóricos/build no prueban equilibrio, estabilidad ni diversión. Rebalanceo futuro requiere autorización.

### Límites de corroboración

**[R]** `evaluateNeeds` en `src/engine/needs.ts` llena `needs.progression` con metas del tramo 2 incluso en tramo 3; `ExperimentPanel.tsx` muestra ese objeto. `tierThreeGoals`/`prosperityGoalsMet`, `autonomous.ts` y `player.ts` sí usan metas de 3 para prosperidad/compras. Es una diferencia entre representación observada y metas aprobadas de §5: no se declaran cambiadas las metas ni se corrige código en esta migración. No confundir esos colores intermedios con prosperidad cumplida. No se reprodujo mediante navegador.

ITER-10 registra 51 pruebas, build/revisión y aceptación humana en el plan archivado; no es ejecución nueva ni prueba exhaustiva de todo campo. No se identificaron otras contradicciones materiales necesarias para consolidar; no se auditó exhaustivamente cada regla de código.

## 11. Exclusiones

**[F]** Combate; misiones/narrativa extensa; fabricación/habilidades del jugador; casas decorables/negocios propios; carros/caballos/compañeros; personalidades económicas; interiores/mundo abierto; estaciones/mortalidad/demografía; impuestos/crédito/intereses/sueldos; trueque/reputación/regateo; precios dinámicos/mercado global; caravana con capital/carga finitos; día/noche real y guardado durable. Estas funcionalidades quedan fuera del alcance aprobado y no deben interpretarse como requisitos implícitos.
