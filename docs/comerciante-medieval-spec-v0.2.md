# Comerciante medieval — Especificación funcional de demo v0.2 · APROBADA

**Estado:** **APROBADO POR EL DISEÑADOR PARA ENTREGA A CODEX.**
**Fecha de aprobación:** 22 de octubre de 2026
**Versión:** v0.2 (revisión aprobada de la v0.1)
**Propósito:** definir el comportamiento funcional de la primera demo y sus experimentos económicos, para que Codex elabore un plan técnico de implementación por hitos.
**Documentos de referencia:** `00-contexto-comun.md` y `02-chat-diseno-juegos.md`.
**Ámbito:** prototipo jugable y experimentos de economía; **no** desarrollo de un videojuego completo.
**Convenciones de estado:** **[C] Confirmado por el diseñador** · **[E] Parámetro o regla experimental autorizada para esta demo** · **[R] Riesgo u observación que debe evaluarse en testing, no una decisión bloqueante** · **[F] Fuera del alcance de esta demo**.

> **Regla de gobernanza:** el diseñador autorizó expresamente esta especificación, incluidos todos los valores y comportamientos [E] como configuración inicial del prototipo. **Aprobado no significa equilibrado ni validado por pruebas.** Codex debe presentar primero un plan técnico por hitos para la aprobación de ese plan, siguiendo `AGENTS.md` y el procedimiento vigente de la Game Factory. No puede sustituir decisiones creativas, modificar mecánicas o introducir contenido fuera de alcance sin nueva autorización. Los riesgos [R] requieren pruebas y reporte, no rediseño automático. Ante contradicciones materiales no resolubles desde esta especificación, debe detenerse y pedir resolución.

---

## 1. Visión, objetivo y alcance

### 1.1 Concepto [C]

Juego de rol medieval de **comerciante, sin combate**. El jugador recorre pueblos, habla con habitantes y negocios, compra mercancías, las transporta y las vende para conseguir beneficios. Las oportunidades provienen de una economía que sigue funcionando sin él: las familias consumen, poseen dinero y bienes, producen mediante negocios, progresan económicamente, compran entre sí y reciben visitas de una caravana comercial.

La referencia creativa inicial es la experiencia de comerciar de ciudad en ciudad en un RPG como *Skyrim*, aprovechando límites de inventario, desplazamientos y oportunidades de venta. No se trasladan mecánicas de ese juego por defecto.

### 1.2 Preguntas que debe ayudar a responder la demo [C/E]

1. ¿Puede funcionar autónomamente una economía pequeña de familias, inventarios y negocios, sin que todas las familias caigan inevitablemente en crisis?
2. ¿Surgen diferencias reales de disponibilidad y oportunidades comerciales entre dos pueblos y las visitas de una caravana?
3. ¿Resulta interesante comprar, cargar y vender mercancías a las familias y negocios, incluso **sin precios dinámicos ni regateo**?
4. ¿La progresión económica de las familias produce demanda por bienes diferentes con el paso del tiempo?
5. ¿Se siente suficientemente cercana a la fantasía RPG una experiencia sencilla de paseo 3D por el pueblo e interacción exterior con sus habitantes?

La demo **no** pretende probar todavía un modelo completo de formación de precios por oferta/demanda, un mercado global, ni un minijuego de negociación.

### 1.3 Contenido jugable mínimo [C]

- **Dos pueblos** distintos y visitables, con cuatro negocios/oficios cada uno, y **un puerto exclusivo de la caravana**, que no es visitable por el jugador.
- Simulación independiente y persistente durante la sesión de **ocho familias** (una por negocio en el escenario inicial), sus hogares y establecimientos, sus inventarios y dinero compartido.
- **Nueve mercancías genéricas** (tabla §4), producción, consumo y desgaste.
- Economía interna entre familias y abastecimiento/exportación mediante **una caravana itinerante**.
- Progresión doméstica por tramos de bienestar, con condiciones materiales y monetarias.
- Jugador controlable en **pueblos 3D sencillos**, NPC accesibles desde exteriores y dos opciones de interacción: hogar y negocio.
- Comprar y vender a precio fijo; transportar mercancías con capacidad limitada; desplazarse entre pueblos mediante selector, consumiendo un día.
- Avance manual de días, sin ciclo día/noche.
- Paneles/herramientas de inspección y escenarios reproducibles de desarrollo, separados de la experiencia normal.

### 1.4 Fuera de alcance [F]

Combate; misiones narrativas; fabricación manual del jugador; entrenamiento de habilidades; múltiples casas decorables; carreta, caballo y compañeros cargadores; contadores y gestión de múltiples negocios del jugador; personajes/familias con personalidades diferenciadas; interiores explorables; rutas de viaje en mundo abierto; estaciones; mortalidad y demografía; impuestos, créditos, intereses o salarios; trueque y pagos mixtos; reputación comercial; negociación conversacional/minijuego; precios dinámicos; caravana con capital/carga finitos; inventario y precios de un mercado global simulado; ciclo día/noche en tiempo real; guardado persistente después de cerrar/recargar (ver §13).

La **ausencia de una característica** de este listado no impide construir más tarde una versión avanzada: no introducirla en esta demo ni preparar interfaces engañosamente funcionales.

---

## 2. Bucle jugable y flujos [C/E]

### 2.1 Bucle principal

1. El jugador aparece en un pueblo y observa qué negocios hay y qué mercancías ofrece cada uno.
2. Habla con un NPC situado en el exterior de su hogar/negocio, elige **«Negocio»** o **«Hogar»** y consulta productos o necesidades disponibles para el comercio.
3. Compra cantidades reales de mercancías a los negocios, sujeto a su dinero, al inventario comercial y a su capacidad de carga.
4. Puede ofrecer mercancías directamente a familias o negocios con necesidades pendientes, sujeto al dinero familiar, a lo que efectivamente acepten y al límite de un bien de progreso por familia y día.
5. Viaja al otro pueblo (un día) o avanza días manualmente; el mundo económico progresa en todos los lugares.
6. Vuelve a inspeccionar disponibilidad, demanda, existencias y beneficios; elige nuevas operaciones.

### 2.2 Inicio y término [C/E]

- **Inicio [E]:** día 1, jugador en Pueblo A, dinero y carga inicial definidos en §10; economía inicial estable, pero no idéntica en ambos pueblos; caravana en el punto y día definidos por su circuito.
- **Término [C]:** demo de tipo *sandbox*, **sin condición de victoria o derrota**. Se evalúa por observación y playtesting.
- **Sin dinero/carga insuficiente [E]:** no termina la partida. El jugador puede avanzar días, inspeccionar, viajar si el viaje no tiene costo monetario y reiniciar desde las herramientas de prueba.
- **Progreso durante la sesión [C]:** los cambios del jugador y de las familias tienen efecto inmediato y se conservan mientras se mantiene la misma sesión de juego.

---

## 3. Mundo, entidades y propiedad

### 3.1 Lugares y oficios [C]

| Lugar | Familia/negocio | Oferta producida | Insumo de producción |
|---|---|---|---|
| Pueblo A | Agricultor A | Comida | Herramienta duradera |
| Pueblo A | Leñador A | Leña y madera | Herramienta duradera |
| Pueblo A | Herrero A | Herramientas genéricas | Metal |
| Pueblo A | Sastre A | Ropa genérica | Tela |
| Pueblo B | Agricultor B | Comida | Herramienta duradera |
| Pueblo B | Minero B | Metal | Herramienta duradera |
| Pueblo B | Carpintero B | Muebles genéricos | Madera |
| Pueblo B | Joyero B | Joyas genéricas | Metal |

La tela **no se produce** en estos dos pueblos; la aporta la caravana. **El puerto es exclusivo de la caravana y el jugador no puede visitarlo ni seleccionarlo como destino durante la demo**. No requiere familias, productores, NPC accesibles, escena 3D ni una economía interior simulada.

### 3.2 Familia/hogar [C]

- La **familia**, no cada persona, es el **único agente de decisión económica**: administra necesidades, compras, actividad profesional y patrimonio monetario.
- Puede tener **una o más personas**; una persona sola también es una familia.
- Todos los integrantes y negocios de la familia **comparten un único fondo de dinero**. Cualquier gasto o venta modifica ese fondo inmediatamente; no se crea un saldo ficticio por negocio.
- El **hogar** tiene inventario doméstico no vendible al jugador: alimentos, leña, ropa, muebles, joyas y otros bienes adquiridos para consumo/uso. No es el inventario comercial.
- La familia puede estar vinculada a uno o varios negocios; **el escenario inicial [E] usa un negocio por familia** para aislar el comportamiento económico.
- El rol visual del NPC sirve como interlocutor de una familia; no tiene una IA económica adicional independiente.

### 3.3 Negocio [C]

- Inventario **comercial** propio con productos fabricados u obtenidos para vender, y almacenamiento **productivo** de insumos.
- Produce según su oficio, con insumos/herramientas disponibles; vende bienes comerciales y adquiere insumos faltantes.
- Sus cobros y gastos afectan al dinero **de su familia propietaria**.
- El jugador no puede comprar el inventario doméstico ni los insumos reservados internamente como si fueran mercancías de tienda.

### 3.4 Caravana [C]

- Entidad económica **no familiar**: no tiene hambre, ropa, hogar ni progresión; recorre el circuito de §9.
- En esta versión, **puede comprar excedentes y abastecer mercancías ilimitadamente**, con dinero virtualmente ilimitado.
- El puerto simboliza la reposición y el comercio exterior, **sin que la demo deba llevar contabilidad real de esas existencias**. Solo la caravana lo visita; no es escenario jugable.
- Solo realiza operaciones con las familias del pueblo **mientras está presente allí**.

### 3.5 Jugador [C/E]

- Inventario de mercancías separado de los NPC, saldo monetario propio, límite de carga y ubicación.
- No se simulan sus necesidades domésticas ni un negocio propio en esta demo.
- No fabrica mercancías; su función es trasladar y comerciar.

---

## 4. Mercancías, precios y unidades

### 4.1 Catálogo genérico [C]

Comida, leña, madera, metal, tela, herramienta, ropa, mueble y joya. No hay subtipos (hachas/picos, diferentes muebles, prendas, tipos de joyas) ni calidades.

### 4.2 Tabla de balance inicial [E]

Estos son los precios y márgenes explorados en la conversación, **aceptados como punto de partida del prototipo, no validados mediante simulación**.

| Bien | Precio referencia (P) | Compra caravana (0,8 P) | Venta caravana (1,2 P) | Peso inicial [E] por unidad |
|---|---:|---:|---:|---:|
| Comida | 5 | 4 | 6 | 1 |
| Leña | 8 | 6,4 | 9,6 | 2 |
| Madera | 10 | 8 | 12 | 2 |
| Metal | 22 | 17,6 | 26,4 | 2 |
| Tela | 18 | 14,4 | 21,6 | 1 |
| Herramienta | 200 | 160 | 240 | 4 |
| Ropa | 90 | 72 | 108 | 1 |
| Mueble | 100 | 80 | 120 | 5 |
| Joya | 180 | 144 | 216 | 0,5 |

Los **pesos** son parámetros [E] autorizados en bloque para la demo, aunque sus números se propusieron inicialmente en el borrador. La moneda admite **decimales exactos a una décima o menor precisión interna suficiente** para reproducir 6,4; no redondear sumas de línea de manera acumulativamente inconsistente. Las cantidades de objetos son enteras.

### 4.3 Formación de precios [C/E]

- **[C]** NO hay algoritmo automático de precios dinámicos por escasez o riqueza.
- **[E]** Todas las tarifas se basan en **P** y en la categoría de transacción de §8; se muestran antes de confirmar y son configurables para testing.
- **[E]** Los precios fijos sirven como experimento, **no como evidencia de que la demanda determine el precio**. Disponibilidad y cantidad aceptada sí dependen de inventarios/necesidades.
- **[F]** Precio propio de cada familia basado en disposición a pagar, mercados regionales y regateo.

---

## 5. Producción, insumos y desgaste

### 5.1 Recetas [C/E]

| Negocio | Producción automática | Consumo de materiales | Período |
|---|---|---|---|
| Agricultor A/B | 10 comidas | 0 materias primas; exige herramienta operativa | cada día |
| Leñador A | 5 leñas + 2 maderas | 0 materias primas; exige herramienta operativa | cada día |
| Minero B | 2 metales | 0 materias primas; exige herramienta operativa | cada día |
| Herrero A | 1 herramienta | 2 metales | cada 4 días |
| Sastre A | 1 ropa | 1 tela | cada 2 días |
| Carpintero B | 1 mueble | 2 maderas | cada 2 días |
| Joyero B | 1 joya | 1 metal | cada 4 días |

**[C]** Los extractores **no producen sin herramienta**. Los fabricantes consumen materiales reales; no generan productos a partir de la nada.
**[E]** Los procesos de 2/4 días ejecutan una receta íntegra en días múltiplos de su período global (2, 4, 6… / 4, 8, 12…), si tienen insumos al resolver el turno. Si no pueden producir, no se acumula producción «debida»: reintentan en el siguiente turno programado. Esto evita fracciones de objetos y hace reproducibles los tests.
**[E]** No se simulan sueldos, necesidad de descanso ni capacidad laboral individual.

### 5.2 Herramientas genéricas [C/E]

- **[C]** 0 herramientas utilizables en una familia extractora = estado **rojo**, no produce.
- **[C]** 1 = **amarillo**, puede producir y busca una de repuesto.
- **[C]** 2 o más = **verde**, suficiente para estabilidad básica.
- **[E]** Solo se desgasta la herramienta en uso, durante días efectivamente trabajados. Cada herramienta nueva soporta **60 días de trabajo**; al agotarse se retira y pasa a utilizarse una de reserva si existe.
- **[E]** No hay reparación, mejoras, calidades ni subtipos. La herramienta se representa en el equipamiento profesional de la familia/negocio, no como un artículo doméstico ofrecido al comprador.

### 5.3 Durabilidad de otros bienes [C/E]

- **Comida [E]:** una unidad desaparece cuando se consume.
- **Leña [E]:** una unidad desaparece al consumirse; 1 unidad por familia y día en cualquier pueblo.
- **Ropa [E]:** una muda es un bien duradero; dura **80 días** de uso antes de desaparecer. Los umbrales requieren **mudas utilizables**, no prendas destruidas. Para no provocar roturas simultáneas en todas las familias, las prendas iniciales pueden tener durabilidad remanente escalonada y registrada como dato de escenario.
- **Muebles/joyas [E]:** no se consumen ni deterioran en esta demo. Permanecen aunque una familia descienda de tramo.
- **Materiales [E]:** desaparecen solo por recetas productivas; no caducan.

### 5.4 Movimiento de inventarios [E]

- Comprar un bien para hogar: pasa del inventario comercial o del jugador al doméstico; dinero en sentido inverso.
- Comprar un insumo de producción: pasa a la reserva del establecimiento; dinero compartido de la familia disminuye.
- Producir: consume insumos/equipamiento cuando corresponda, añade productos al inventario comercial.
- Si una familia consume mercancías fabricadas por su propio negocio, puede trasladarlas internamente **sin transferencia ficticia de dinero**; debe quedar registrado como transferencia, no como venta.
- No se permiten existencias negativas, dinero negativo ni creación/duplicación accidental por transferencias.

---

## 6. Necesidades, jerarquía y progresión económica

### 6.1 Filosofía [C]

- La familia prioriza **supervivencia y continuidad de sus actividades profesionales** antes de lujos y acumulación patrimonial.
- Los **colores** describen cobertura de necesidades/objetivos; **no** hay una variable independiente de «interés» ni un algoritmo psicológico de urgencia adicional en esta demo.
- Las necesidades del tramo actual se calculan a partir de **bienes existentes**, integrantes de familia, adultos y dinero. Los objetos de un tramo anterior **cuentan para el nuevo**.
- Los tramos nuevos habilitan metas de consumo más elevadas. **No se compran bienes infinitamente** si la meta está satisfecha.
- La familia puede **subir** al satisfacer condiciones de entrada y **bajar** si se deterioran sus condiciones básicas o cae bajo el dinero mínimo para mantener ese tramo. Los bienes materiales no desaparecen por bajar.

### 6.2 Requisitos materiales por tramo [C/E]

| Necesidad | Tramo 1: básico | Tramo 2: comodidad | Tramo 3: prosperidad (techo demo) |
|---|---|---|---|
| Comida | Reserva de 14 días | Mantener criterio básico | Mantener criterio básico |
| Leña | Reserva de 14 días | Mantener criterio básico | Mantener criterio básico |
| Ropa | 1 muda/integrante | 2 mudas/integrante | 4 mudas/integrante |
| Herramientas de extractor | 2 utilizables | Mantener criterio básico | Mantener criterio básico |
| Insumos de manufactura | Para un circuito de caravana | Mantener criterio básico | Mantener criterio básico |
| Joyas | Sin meta | 1 joya/adulto | 4 joyas/adulto |
| Muebles | Sin meta | 1 mueble/integrante | 4 muebles/familia |
| Dinero para ascender | 200 + 100 × integrantes | 1.000 monedas (ascenso 2→3) | 2.000 monedas (meta de prosperidad; no habilita un tramo 4) |

**Confirmado en conversación:** objetivos acumulativos; ropa 1→2→4 mudas por integrante; metas de bienes duraderos y dinero; formula inicial **200 + 100 por integrante**; la meta de **1.000** y la de **2.000** se mencionaron como cifras para probar.
**[E]** El segundo tramo concreta las expresiones «un mueble por integrante» y «joyas para adultos» con 1 por persona/adulto; el tercero concreta «4 o 5 muebles» en **4** por familia. Estas cuantías se autorizaron en bloque como parámetros [E] para el primer test, sin afirmar que estén balanceadas.
**[E]** El escenario inicial usa dos **adultos** por hogar, aunque el sistema debe soportar 1 y más integrantes; no se exige modelar edades más allá del contador de adultos.
**[E]** El tramo 3 es el **último alcanzable**: completar sus metas genera un indicador de «objetivos de prosperidad cumplidos», no un cuarto tramo inventado.

### 6.3 Estados rojo/amarillo/verde [C/E]

- **Comida:** días de cobertura = raciones en hogar / integrantes. **[E]** rojo si cobertura < 7 días; amarillo de 7 a menos de 14; verde si ≥ 14.
- **Leña:** cobertura = unidades de leña / 1 familia/día. **[E]** mismos umbrales de 7 y 14 días.
- **Herramientas extractivas:** 0 rojo; 1 amarillo; 2+ verde **[C]**.
- **Insumos productivos:** **[E]** rojo si no alcanza para la siguiente receta; amarillo si alcanza para la siguiente pero no para cubrir **un ciclo de nueve días**; verde si alcanza para la reserva objetivo del ciclo. Con recetas de 2 y 4 días, cobertura verde: **5 lotes** (sastre/carpintero) o **3 lotes** (herrero/joyero). La clasificación considera el insumo realmente almacenado.
- **Ropa/muebles/joyas:** **[E]** verde si la cantidad alcanza la meta aplicable; amarillo si ha alcanzado **al menos el 50 %** de la meta pero no toda; rojo si tiene menos del 50 %. Se contabilizan bienes utilizables y pertenencias acumulativas; un objetivo recién activado puede comenzar en amarillo.
- **Dinero:** **[E]** se maneja como condición de entrada/salida, no como un producto que se compra; objetivo del tramo actual y saldo visible.

Los umbrales de 7 días, 5/3 lotes y la interpretación de colores para artículos no fungibles son **valores experimentales autorizados para la demo**, sujetos a evaluación mediante testing; no se presentan como balance definitivo.

### 6.4 Ascenso y descenso [C/E]

- **Ascenso 1→2:** todas las necesidades básicas pertinentes están **verdes** y dinero ≥ **200 + 100×integrantes**.
- **Ascenso 2→3:** se cumplieron los requisitos materiales del tramo 2, necesidades básicas en verde y dinero ≥ **1.000**.
- La meta monetaria de **2.000** del tramo 3 registra prosperidad; no es el umbral de ascenso 2→3 ni crea un tramo 4. El tramo 3 sigue siendo el máximo de esta demo.
- **Mantención de tramo 2:** puede haber necesidades básicas **amarillas**. Desciende a 1 si alguna necesidad básica llega a **rojo** o si el dinero cae **por debajo** del umbral con que accedió a 2.
- **Mantención de tramo 3 [E]:** desciende a 2 si deja de cumplir necesidades fundamentales que sustentan niveles anteriores en estado no rojo o si el dinero cae por debajo de **1.000**. Si un requisito básico está rojo, se aplican descensos sucesivos hasta llegar al tramo que pueda sostener, como máximo al 1.
- **Bienes duraderos:** conservar siempre tras el descenso, salvo desgaste/consumo normal.
- **Actualización [E]:** revaluar después de cada transacción o consumo relevante, con la lógica de **descenso antes que ascenso** cuando ambas condiciones pudieran entrar en conflicto. No conceder compras extras mediante varios cambios de tramo durante un mismo día.
- **[R] Riesgo conocido de diseño:** oscilar por compras pequeñas bajo el mínimo. Se probará **sin histéresis monetaria**, tal como solicitó el diseñador; una banda de entrada/salida distinta sería una alternativa futura, no una regla de esta demo.

### 6.5 Decisiones de compra de familias [C/E]

- **[C]** Las compras de supervivencia y abastecimiento profesional pueden implicar **varias unidades en un mismo día** hasta cubrir la necesidad o agotar dinero/stock.
- **[C]** Las compras **de progreso** (ropa adicional del tramo superior, muebles, joyas) tienen un límite de **una unidad total por familia y día**. Este contador es persistente en el estado de simulación durante el día, aunque cambie de interlocutor o de tramo.
- **[C]** Priorizar satisfacer las necesidades del tramo actual antes de acumular ahorros para el siguiente. No «ahorrar para 1.000» deliberadamente mientras falten compras materiales de ese tramo y pueda atenderlas.
- **[C]** Si falta una joya y no está disponible, la familia puede adquirir otro bien útil que sí esté disponible; nunca espera obligatoriamente una categoría predeterminada.
- **[E]** Para necesidades fundamentales, resolver primero las **rojas** y luego amarillas; en igualdad de color, supervivencia (comida, leña, ropa básica) antes de producción, con desempate estable y configurable.
- **[E]** Para bienes de progreso, escoger el objetivo insatisfecho **con menor porcentaje de cobertura** entre productos disponibles y asequibles; desempate fijo ropa → muebles → joyas. Es **un criterio experimental autorizado para el primer test**, no una jerarquía creativa permanente.
- **[E]** Si nada pertinente está disponible o asequible, no compra ni acumula objetos sin objetivo. Los ahorros crecen solo por ingresos reales de ventas, no por generación periódica de monedas.

### 6.6 Disponibilidad y esperas [C/E]

- **[C]** El contador de espera nace **cuando el producto está disponible en el mercado local o en la caravana**, no cuando surgió la necesidad.
- **[C]** Necesidad fundamental roja: intento automático en cuanto haya oferta y recursos para comprar; amarilla: tras **1 día** de disponibilidad.
- **[E]** Si la oferta deja de estar disponible, se reinicia su espera; si cambia de amarillo a rojo, se intenta inmediatamente. La presencia de la caravana es temporal, el stock de negocios locales puede ser continuo.
- **[E]** Las metas de progreso no usan la antigua regla «verde compra a los dos días»: verde significa **ya satisfecho**. Las familias evalúan objetivos materiales activos **una vez por día** cuando existe oferta, respetando el límite de una unidad. La regla de disponibilidad automática está separada de la oferta directa del jugador (§8).

---

## 7. Precios estáticos y competencia de canales

### 7.1 Propósito [C]

La demo prueba oportunidades por **inventarios y diferencias entre canales**, no un precio variable por oferta/demanda. La caravana es una alternativa comercial con un margen predecible. El jugador puede ofrecer mejores condiciones comprando a productores y abasteciendo a compradores, sin negociar manualmente.

### 7.2 Tarifas cerradas para el primer test [E]

| Canal / transacción | Regla de precio unitario |
|---|---|
| Familia/NPC compra a tienda **local** | P |
| Caravana **compra** excedente a negocio | 0,8 × P |
| Caravana **vende** a negocio u hogar | 1,2 × P |
| Jugador **compra** una mercancía ofertada por negocio | 0,9 × P |
| Jugador **vende** un bien que la familia necesita, al hogar | 1,1 × P |
| Jugador **vende** un insumo necesario a un negocio | 1,1 × P |

Los precios **0,9 P y 1,1 P** para el jugador convierten en regla experimental los ejemplos explorados (metal 19,8 → 24,2; madera 9 → 11; ropa 81 → 99). **El diseñador aprobó estas tarifas universales como parámetros iniciales [E] para la demo**, no como precios definitivos del juego.
**[E]** No hay opción de modificar el precio manualmente. No hay trueque en esta versión.

### 7.3 Reglas de aceptación [E]

- Un hogar compra solo bienes que pueden satisfacer una necesidad doméstica **activa e insatisfecha** y no más unidades de las que le permiten llegar a su objetivo de cobertura/metas; si tiene poco dinero, puede comprar parcialmente.
- Un negocio compra solo **insumos correspondientes a su oficio** en cantidades hasta su reserva objetivo; una herramienta extractiva se compra para su necesidad profesional hasta 2 utilizables.
- Una familia no gasta más dinero del que posee; cada unidad adquirida transfiere la propiedad y el dinero inmediatamente.
- No vender el mismo objeto dos veces por múltiples menús ni aceptar cantidades negativas o fraccionarias de bienes.
- Si dos compradores compiten por el mismo stock escaso, el primero procesado recibe la compra. El orden automático será determinista y auditable (§9).
- **[C]** El jugador **puede presentar ofertas directas** a hogares y negocios. **[E]** En esas ofertas se evalúa al momento necesidad, saldo y topes, sin esperar el día de búsqueda autónoma; no se obliga a la familia a aceptar artículos fuera de sus metas.
- No se compran artículos domésticos a una familia; el jugador solo compra las mercancías declaradas en inventarios **comerciales**.
- **[E]** La venta a la caravana por parte del jugador, si se habilita en la interfaz, usa 0,8 P y su compra a ella 1,2 P, sin condiciones especiales. No es necesaria para cumplir la interacción mínima con NPC de pueblos.

### 7.4 «Excedente» de negocio para la caravana [E]

La caravana **no vacía automáticamente todos los estantes** de los negocios: compra el excedente **posterior a la demanda doméstica/local pendiente del día** y a una **reserva comercial mínima**. Para el primer test, se reserva **hasta dos días de producción** de cada salida (p. ej. 20 comidas del agricultor, 10 leñas y 4 maderas del leñador, 1 herramienta del herrero). El resto de salida vendible se considera exportable.

**[R]** La regla de reserva de dos días y la precedencia de ventas **están aprobadas como experimento**, pero afectan la disponibilidad al jugador y deberán medirse. «Excedente» no significa cualquier unidad de inventario ni que la caravana deba dejar stock infinito en las tiendas.

---

## 8. Interfaz y transacciones del jugador [C/E]

### 8.1 Exploración e interacción [C]

- Pueblo en **3D sencillo**, personaje controlable que camina y se aproxima a NPC exteriores.
- Ninguna vivienda ni tienda necesita un interior jugable.
- Selección de interlocutor y apertura de interacción de **Hogar** (venta del jugador a necesidades familiares) o **Negocio** (compra de stock comercial; venta de insumos profesionales).
- Si una familia tiene más negocios en versiones posteriores, su menú debe poder diferenciarlos; para el escenario inicial, un negocio/familia.
- **[E]** Mostrar al menos nombre/rol del interlocutor, mercancía, precio unitario, cantidad disponible o aceptada, total, dinero/carga resultantes y motivo comprensible de rechazo.
- **[C]** No se requieren diálogos narrativos ni negociación conversacional; interfaz funcional 2D superpuesta al escenario 3D es aceptable.

### 8.2 Compra/venta [E]

Una transacción debe ser **atómica**: validar todas las restricciones antes de aplicar, transferir bienes y dinero exactamente una vez, actualizar estados de necesidades e inventarios y emitir un registro de operación.

Motivos de rechazo observables: stock insuficiente; carga insuficiente del jugador; dinero insuficiente del comprador; bien no ofertado por ese negocio; bien no pertinente para el hogar/negocio; necesidad ya satisfecha; máximo de compras de progreso del día alcanzado; caravana ausente.

### 8.3 Transporte del jugador [C/E]

- **[C]** Capacidad de carga limitada; transportar mercancías y elegir cuánto llevar forma parte de la experiencia.
- **[E]** Límite inicial **20 unidades de peso** y pesos §4.2. Dinero sin peso. No hay caída de mercancías ni almacenamiento personal externo en esta demo.
- **[E]** Compra máxima calculada por saldo + stock + carga. Venta disminuye carga inmediatamente.
- **[F]** Carros, monturas, compañeros y mejoras de carga; pueden formar una línea de progresión futura.

---

## 9. Tiempo, caravanas y orden del simulador

### 9.1 Reloj [C/E]

- **[C]** La economía avanza por **días enteros discretos**; **no** hay día/noche real.
- **[C]** El jugador tiene botón **«Avanzar día»**. Caminar, inspeccionar y comerciar dentro del pueblo **no consumen días**.
- **[C]** Cambiar entre Pueblo A y Pueblo B emplea **1 día**, con selector/salida sin viaje 3D continuo.
- **[E]** El tiempo no avanza automáticamente por esperar en la interfaz; al viajar o avanzar, ambas economías ejecutan un ciclo completo.
- **[C]** El puerto es **exclusivo de la caravana**: el jugador no puede viajar allí, elegirlo en el selector, recorrerlo ni comerciar presencialmente en él. Solo aparece como ubicación del circuito comercial.

### 9.2 Circuito de nueve días [E]

| Día del circuito | Caravana |
|---|---|
| 1–2 | Puerto (comercio exterior representado) |
| 3 | Viajando hacia Pueblo A |
| 4–5 | Pueblo A, comerciando |
| 6 | Viajando hacia Pueblo B |
| 7–8 | Pueblo B, comerciando |
| 9 | Viajando al puerto |

Repite cíclicamente. En el escenario inicial, día 1 global = día 1 del circuito; para cualquier día global `d`, el día de circuito es `((d - 1) mod 9) + 1`. Durante viaje/puerto, no comercia con pueblos. **[C]** Las visitas duran varios días y sus operaciones son posibles mientras la caravana permanece; no se liquidan obligatoriamente todas al llegar.

### 9.3 Orden de cada avance diario, autorizado para el primer test [E]

El orden debe producir resultados deterministas y permitir auditoría. **Orden experimental autorizado de procesamiento** de un salto del día `d` al `d+1`:

1. Avanzar calendario y determinar lugar/estado de la caravana en el **nuevo** día.
2. Consumir raciones y leña y avanzar el desgaste de la ropa; retirar las prendas que agoten su vida útil.
3. Ejecutar las recetas productivas correspondientes al nuevo día si existen herramientas e insumos **al comenzar la producción**. Desgastar después la herramienta que efectivamente se utilizó ese día; si llega a cero, retirarla **después** de obtener la producción de ese día.
4. Recalcular necesidades y tramos; determinar disponibilidad de productos y esperas.
5. Procesar compras prioritarias domésticas/profesionales entre familias locales; después abastecimiento de la caravana (cuando esté presente), aplicando tiempos de espera.
6. Procesar **una** compra de progreso por familia elegible, si existe oferta y es costeable.
7. Si la caravana está en el pueblo, venderle excedentes según §7.4.
8. Recalcular condiciones y registrar todos los eventos para depuración.

**[R]** La precedencia de exportaciones frente a compras domésticas, el desgaste y las compras «rojas inmediatas» quedan **definidos por este orden y por §9.4**. Las pruebas deben verificar su coherencia: sin doble ejecución de un día, resultados dependientes de la velocidad del navegador ni estados de medio turno visibles al usuario. Si se descubre una contradicción material, se informa en lugar de cambiar el orden por iniciativa técnica.

### 9.4 Compras «inmediatas» [E]

«Inmediatamente» significa en la próxima ocasión de procesamiento económico del día actual **cuando aparezca la oferta** o, en una oferta directa del jugador, durante la transacción. El simulador no corre en tiempo real entre pulsaciones, pero una caravana recién llegada puede satisfacer necesidades rojas ese mismo día. **[E]** Si el jugador abastece en medio del día a un negocio local, las compras automáticas rojas que ello habilite se procesan en un paso determinista inmediatamente después de la operación del jugador, sin avanzar fecha y sin repetir la compra por una apertura de menú.

---

## 10. Escenario inicial y cifras de balance

### 10.1 Tamaño, dinero y reserva [C/E]

| Parámetro | Inicio autorizado para testing |
|---|---|
| Familias por pueblo | 4 |
| Personas por familia | 2 adultos |
| Dinero de cada familia | **450 monedas** [E] |
| Comida doméstica por familia | **28 raciones** (=14 días ×2) [E] |
| Leña doméstica por familia | **14 unidades** (=14 días) [E] |
| Ropa doméstica por familia | **2 mudas utilizables** [E] |
| Herramientas por familia extractiva | **2 utilizables** [E] |
| Jugador | Pueblo A; **300 monedas**, inventario vacío, carga 20 [E] |
| Puerto/caravana | Día 1 de circuito; recursos ilimitados [C/E] |

Los saldos 450/300 son **parámetros experimentales autorizados** para que la prueba comience cerca del umbral básico de 400 monedas y el jugador pueda comprar inicialmente ciertas mercancías. Fueron propuestos en la v0.1 y aceptados en bloque por el diseñador.

### 10.2 Insumos y stock comerciales iniciales [E]

Para que ninguna profesión manufacturera se bloquee antes de la próxima visita de la caravana, los insumos iniciales se proponen así:

| Negocio | Insumos iniciales | Mercancía terminada inicial |
|---|---:|---:|
| Agricultor A | 2 herramientas de oficio | 20 comidas |
| Leñador A | 2 herramientas de oficio | 10 leñas + 4 maderas |
| Herrero A | 6 metales (3 lotes) | 2 herramientas |
| Sastre A | 5 telas (5 lotes) | 2 ropas |
| Agricultor B | 2 herramientas de oficio | 20 comidas |
| Minero B | 2 herramientas de oficio | 4 metales |
| Carpintero B | 10 maderas (5 lotes) | 2 muebles |
| Joyero B | 3 metales (3 lotes) | 2 joyas |

**Nota:** las herramientas iniciales aparecen una única vez en el equipamiento de extractor, **no duplicadas** en inventario doméstico y productivo. La tabla del escenario debe almacenar las reservas como cantidades reales. En esta hipótesis, las familias empiezan con todos sus requisitos básicos verdes y 450 monedas, por lo que **pueden entrar en comodidad muy pronto**, pero no tienen automáticamente completos los objetivos de esa comodidad. Para ensayar arranques más lentos, modificar dinero y reservas mediante escenarios de testing, no alterarlos ocultamente en cada ejecución.

### 10.3 Consumo y producción agregados [E]

- Población por pueblo: 4 familias × 2 personas = **8**.
- Comida consumida por pueblo: 8/día. Dos agricultores producen **20/día** entre ambos pueblos; consumo global **16/día**, excedente agregado nominal **4/día**.
- Leña consumida por ambos pueblos: 8/día. Leñador produce **5/día**, déficit global **3/día**; Pueblo B no tiene proveedor local.
- Madera: 2/día producidas en A; carpintería B utiliza promedio **1/día**; excedente agregado nominal **1/día**.
- Metal: minero B produce 2/día; herrero A consume promedio 2/4 = **0,5/día**; joyero B 1/4 = **0,25/día**; excedente agregado nominal **1,25/día**.
- Tela: sin producción local; sastre consume promedio 1/2 = **0,5/día**; importación necesaria.
- Herramientas, ropa, muebles y joyas se producen discretamente; parte puede destinarse a necesidades locales, venta al jugador o exportación. Las cifras agregadas **no indican ventas garantizadas**.

### 10.4 Comprobaciones de margen unitario [E]

Ejemplos correctos de margen **antes de gastos domésticos, espera, variación de ventas o roturas**:

| Oficio | Venta de salida a caravana | Costo de insumo comprado a caravana | Margen por lote | Promedio de margen/día |
|---|---:|---:|---:|---:|
| Herrero: 1 herramienta | 160 | 2 × 26,4 = 52,8 | **107,2** | **26,8** (cada 4 días) |
| Sastre: 1 ropa | 72 | 1 × 21,6 = 21,6 | **50,4** | **25,2** (cada 2 días) |
| Carpintero: 1 mueble | 80 | 2 × 12 = 24 | **56** | **28** (cada 2 días) |
| Joyero: 1 joya | 144 | 1 × 26,4 = 26,4 | **117,6** | **29,4** (cada 4 días) |

El balance anterior presentado en conversación incluía una tabla de excedentes por familia y una entrada monetaria neta de caravana. **No deben tratarse como hechos verificados ni reproducirse como invariantes**, porque dependen de reglas de ventas locales, transferencias familiares, momento de reposición, reserva comercial y demanda de progreso que todavía no estaban cerradas. La simulación debe producir reportes reales y permitir comparar su resultado con las hipótesis, sin manipular las cifras para forzar ganancias.

### 10.5 Oportunidades ilustrativas para el jugador [E]

| Ruta | Compra a 0,9 P | Venta a 1,1 P | Margen bruto por unidad |
|---|---:|---:|---:|
| Metal B → herrería A | 19,8 | 24,2 | **4,4** |
| Madera A → carpintería B | 9 | 11 | **2** |
| Ropa A → hogares B | 81 | 99 | **18** |

Solo existen esas ventas si hay inventario que comprar, capacidad para cargarlo, una necesidad activa del destinatario, dinero suficiente y límite diario disponible cuando corresponda. **No** son operaciones infinitas por defecto ni garantías de que cualquier ruta produzca beneficio neto.

---

## 11. Interfaz mínima y visibilidad

### 11.1 Jugador [C/E]

- Vista de pueblo 3D simple y funcional, sin interiores; representación distinguible de NPC y negocios.
- Indicadores visibles: **día**, pueblo, dinero del jugador, ocupación de carga e inventario.
- Acción clara para **avanzar un día** y selector de viaje Pueblo A ↔ Pueblo B. **El puerto no aparece como destino accesible.**
- Interacción con NPC: menú **Negocio/Hogar**. En Negocio puede comprar salidas comerciales y vender insumos pertinentes; en Hogar puede ofrecer productos para sus necesidades.
- Información de transacción: bien, cantidad, tarifa fija, total, disponibilidad y resultado/rechazo.
- **[E]** No enseñar obligatoriamente todas las cifras internas de necesidad/riqueza de cada NPC al jugador. Para la demo, bastará una indicación comprensible de lo que compraría y de cuántas unidades como máximo; niveles detallados corresponden al panel de pruebas.

### 11.2 Desarrollo y pruebas [C/E]

La interfaz de inspección **no es una habilidad del jugador ni una regla de la economía**. Debe permitir:

- Ver todas las familias, sus miembros, dinero, tramo, metas cumplidas, rojo/amarillo/verde y decisiones tomadas.
- Ver inventarios separados por hogar, mercancía comercial, insumos productivos, herramientas operativas/durabilidad y jugador.
- Ver ubicación y calendario de caravana; disponibilidades y compras/ventas por día.
- Ejecutar **1, 9, 36 y 90 días** (o un número parametrizable) con resultados reproducibles, sin tener que caminar ni viajar físicamente cada vez.
- Reiniciar un escenario con los mismos datos y semilla; preparar al menos los escenarios del §12.
- Exportar o copiar un informe resumido por día/ciclo de producción, consumos, comercio y cambios en dinero/tramos.
- Alterar **parámetros declarados** (precios, producción, duraciones, umbrales y frecuencia) desde configuración de prueba o datos de escenario; no reescribir código para cada balance.

---

## 12. Escenarios y criterios de aceptación

### 12.1 Pruebas funcionales indispensables

1. **Separación hogar/negocio:** el jugador no puede comprar comida o joyas domésticas de un NPC mediante su menú de negocio; puede comprar las mercancías comerciales mostradas. Una venta a cualquiera de los dos menús afecta al mismo saldo familiar.
2. **Producción real:** agricultor/minero/leñador con 0 herramientas producen 0. Con 1 herramienta producen y figuran amarillos; con 2 figuran verdes. Los manufactureros requieren los materiales íntegros de receta.
3. **Conservación:** toda venta real disminuye existencias del vendedor, aumenta las del comprador y mueve exactamente el importe acordado; no hay dinero negativo ni cantidades negativas; solo la extracción y caravana son fuentes/sumideros explícitos de bienes/dinero.
4. **Necesidades:** familia de dos personas con 28 comidas = 14 días de cobertura/verde; al consumir baja su cobertura; no compra 100 unidades si solo necesita reponer hasta el objetivo. La clasificación se actualiza sin esperar una recarga.
5. **Escalera económica:** ascender con todos los requisitos básicos verdes y ahorro requerido; comprar un lujo que deja dinero bajo el umbral produce descenso; joya/mueble adquirido sigue en el hogar; al recuperar condiciones puede ascender y se cuentan pertenencias anteriores.
6. **Progreso diario:** una familia no compra dos muebles/joyas/prendas adicionales de progreso el mismo día por abrir dos veces el menú o por interactuar con dos NPC; sí puede reabastecer varias unidades básicas.
7. **Demanda y disponibilidad:** familia con requisito insatisfecho no compra si no hay vendedor o carece de fondos; si falta joya pero hay mueble pertinente, no se paraliza por la joya.
8. **Caravana:** solo comercia los días presentes en cada pueblo; al exportar transfiere realmente las mercancías del negocio, recibe el negocio dinero y permanece auditable el hecho de que la caravana es abstracta/ilimitada.
9. **Tiempo y sincronía:** viajar A→B consume exactamente un día; caminar/comerciar no consume días; las dos economías avanzan juntas una vez por día, sin duplicaciones de eventos.
10. **Precios y carga:** los precios concuerdan con la tabla y el canal; el jugador no puede comprar más de lo que permite dinero, inventario comercial y peso; no puede obtener dinero por una oferta rechazada.
11. **Interfaz 3D:** el jugador puede moverse por cada pueblo, llegar a todos los NPC y abrir los menús Hogar y Negocio sin entrar a interiores. **El puerto no es accesible al jugador**, tampoco mediante selector de destinos.
12. **Pruebas reproducibles:** dos ejecuciones del mismo escenario y los mismos parámetros/acciones generan el mismo resumen económico y eventos.

### 12.2 Escenarios de estrés / playtesting

| Escenario | Preparación | Observación |
|---|---|---|
| Ciclo normal | Escenario base, sin jugador, 9 días | Circulación del dinero, reposición y exportación sin colapso trivial |
| Economía en marcha | Escenario base, 36 días | Evolución de familias, ingresos netos, stock, requisitos amarillos/rojos |
| Crecimiento | Escenario base, 90 días | Diferencias de riqueza, compras de ropa/muebles/joyas, ascensos y descensos |
| Sin herramienta | Retirar ambas herramientas a una familia extractiva | Producción detenida, necesidad roja, recuperación por compra cuando disponible |
| Sin insumos | Vaciar metal o tela del negocio | Pausa correcta de producción, recuperación por importación y comercio |
| Escasez B | Reducir la reserva de leña doméstica de Pueblo B | Demanda real, posible venta del jugador, intervención de caravana |
| Oportunidad comercial | Jugador lleva metal B→A o madera A→B | Compra/venta finita con margen calculable y stock/fondos suficientes |
| Regresión de tramo | Familia justo sobre mínimo, compra bien de progreso | Baja de tramo sin perder la mercancía; compras coherentes después |
| Mercado sin comprador | Entregar bienes de un objetivo ya verde | Rechazo, sin acumular objetos infinitamente |
| Caravana ausente | Forzar día fuera de visitas | No se admiten compras automáticas a caravana |

**Criterio de éxito del experimento:** no exigir «todas las familias ricas a los 90 días» ni ausencia de quiebras. Exigir reglas consistentes y **reportar** si alguna familia entra en espiral sin salida, si se satura el stock, si la caravana inyecta dinero excesivo o si no hay ventas interesantes. Esas observaciones pueden motivar una revisión posterior del balance, **no cambios de diseño automáticos**.

---

## 13. Estados, persistencia y casos límite

- **[E] Persistencia:** memoria de la sesión; recargar la página reinicia salvo que Codex presente una solución puramente técnica para retomar la sesión **sin prometerla como característica**. El guardado permanente no es requisito de demo.
- **[E] Determinismo:** no usar aleatoriedad no reproducible para orden de compras o producción. Cualquier aleatoriedad futura debe aceptar semilla y quedar registrada.
- **[E] Falta de dinero:** aceptar venta parcial hasta saldo disponible si la oferta admite cantidades enteras; nunca deuda ni saldo negativo.
- **[E] Falta de stock:** venta parcial opcional si comprador desea más de lo disponible, mostrando cantidad real; si el jugador solicita explícitamente una cantidad mayor al máximo, rechazar sin transacción parcial silenciosa.
- **[E] Inventarios simultáneos:** la interfaz debe refrescar el stock inmediatamente después de cada compra; si cambió antes de confirmar, revalidar y evitar doble venta.
- **[E] Autoabastecimiento:** si el agricultor alimenta a su propia familia con producto de su negocio, consume stock real y no se paga a sí mismo. El producto no cuenta dos veces.
- **[E] Caravana ilimitada:** puede comprar solo la cantidad que un negocio tenga realmente como excedente; su oferta de venta no está limitada por inventario propio. El dinero que pagan las familias sí es limitado.
- **[E] Duraderos:** joyas/muebles no se pierden al bajar de tramo; la ropa/herramienta desgastada deja de contar como utilizable en el mismo día en que se agota.
- **[E] Compras pendientes:** si la necesidad cambia de color o desaparece por ascenso/descenso, se invalida cualquier intento de compra obsoleto. Una oferta directa debe volver a comprobar el estado actual.
- **[E] Sin NPC en una tienda:** en el escenario inicial, cada negocio debe tener un interlocutor accesible. No se exige que deambule ni tenga horario.
- **[E] Viaje de un día:** el jugador llega al destino después de procesar el avance global del calendario; no realiza compras desde la ubicación anterior mientras está en tránsito.
- **[E] Familias de 1 integrante:** fórmulas de reservas, dinero y ropa escalan; no dividir por cero en familias vacías, que no son parte de la demo.
- **[F]** Herencia, nacimientos, muertes, robo, deterioro por clima, regateo y otras fuentes de pérdida de inventario.

---

## 14. Revisión de consistencia y riesgos explícitos

1. **Riesgo económico mayor [R]:** la caravana compra excedentes sin límite y exporta producción manufacturada aun sin demanda local, por lo que puede inyectar demasiado dinero; el balance real se mide durante 9/36/90 días y **no se corrige automáticamente**.
2. **Interacción entre saldos y tramos [C]:** comprar un objeto deseado puede producir descenso instantáneo; es comportamiento intencional para probar. No agregar colchón/histéresis sin nueva aprobación.
3. **Oferta local vs exportación [R]:** aplicar la reserva comercial experimental de **hasta dos días de producción** aceptada en §7.4 y medir si deja existencias suficientes para negocios, familias y jugador.
4. **Umbrales de comida/leña [E]:** 14 días verdes, 7–13 amarillos, menos de 7 rojos. El corte exacto de 7 días fue **aceptado como valor experimental**; deberá medirse durante el playtesting.
5. **Tramo 3 [E]:** 4 muebles, 4 joyas/adulto, 4 mudas/persona y 2.000 monedas son objetivos experimentales autorizados; completarlos no crea un tramo 4.
6. **Jerarquía entre objetivos [E]:** los colores de metas superiores miden **cobertura**, no emergencia. Falta verificar si el criterio de menor porcentaje coincide con el ritmo deseado de compras.
7. **Tiempo de espera [E]:** la espera de compra autónoma **amarilla** difiere de las ofertas personales del jugador, que se evalúan al instante. El verde de metas ya cumplidas **no** desencadena compras cada dos días.
8. **Dependencias productivas [C/E]:** el minero requiere herramienta del herrero; el herrero requiere metal del minero. El stock inicial y la caravana evitan bloqueo obligatorio. El sastre depende de tela exterior y el pueblo B de leña externa.
9. **Estabilidad vs rentabilidad [R]:** los márgenes matemáticos unitarios no prueban estabilidad de cada familia; los compradores reales, tiempos y consumos pueden producir resultados distintos de los calculados en una tabla.
10. **Jugabilidad [R]:** explorar si el jugador obtiene decisiones interesantes o solo ejecuta una ruta fija. La falta de precios dinámicos y regateo es **deliberada** para aislar las otras mecánicas.

---

## 15. Registro de decisiones de cierre — APROBADAS

El diseñador **aceptó expresamente en bloque todos los valores [E]** para usarlos como parámetros iniciales de test y confirmó que **el puerto es exclusivo de la caravana**. Las decisiones D1–D6 que figuraban abiertas en la v0.1 quedan cerradas para esta demo. Podrán revisarse **después de observar los resultados**, mediante una nueva decisión de diseño, sin que Codex pueda alterarlas por su cuenta.

| ID | Regla aceptada para la demo | Estado |
|---|---|---|
| D1 | Tarifas universales iniciales **jugador compra 0,9 P / jugador vende 1,1 P**, sin regateo (§7.2). | **[E] Aprobada** |
| D2 | **Reserva comercial de hasta dos días de producción** antes de exportar excedentes a caravana (§7.4). | **[E] Aprobada** |
| D3 | Comida y leña **rojas con menos de 7 días**, amarillas entre 7 y menos de 14, verdes desde 14 (§6.3). | **[E] Aprobada** |
| D4 | Metas de muebles y joyas, adultos iniciales y orden de selección de compras como **parámetros experimentales** (§6). | **[E] Aprobada** |
| D5 | Inicio con **450 monedas por familia**, **300 del jugador**, reservas, pesos y carga descritos (§4, §8, §10). | **[E] Aprobada** |
| D6 | **Orden de procesamiento diario y selección automática de progreso** descritos (§6.5, §9.3–9.4). | **[E] Aprobada** |
| D7 | **Puerto solo para caravana**; no visitable, no seleccionable, sin comercio presencial para el jugador (§1, §3, §9, §11). | **[C] Aprobada** |
| D8 | **Descenso automático de tramo sin colchón monetario** como conducta del primer test; los bienes adquiridos se conservan (§6.4). | **[C] Aprobada** |
| D9 | Aclaración del diseñador (23 de octubre de 2026): el ascenso 2→3 requiere **1.000 monedas**; **2.000 monedas** es solo la meta monetaria de prosperidad del tramo 3, sin implementar ascenso a tramo 4. El descenso de tramo 3→2 sigue ocurriendo por debajo de **1.000 monedas** (§6.2, §6.4). | **[C] Aprobada** |

**No quedan decisiones de diseño previamente identificadas como bloqueantes para entregar esta especificación a Codex.** Los riesgos de §14 son asuntos de verificación y playtesting, no pendientes de aprobación. Si durante la planificación aparece una contradicción nueva que realmente afecte al comportamiento funcional, debe señalarse y consultarse al diseñador antes de resolverla.

**Fuera de la demo:** regateo, trueque, precios dinámicos, mercado global, profesiones adicionales, interiores y viajes realistas. Son posibles líneas futuras, no tareas implícitas de esta entrega.
---

## 16. Instrucción de entrega a Codex — especificación aprobada

> Preparar la implementación de **la demo de comerciante medieval** según esta **especificación funcional v0.2 aprobada**. Consultar y respetar el repositorio, `AGENTS.md`, el flujo operativo vigente de la Game Factory y el stack/plantilla reales, verificándolos antes de trabajar. **Primero presentar un plan técnico por hitos para aprobación del diseñador**, con pruebas automáticas y medios de playtesting reproducibles. La simulación económica debe poder probarse independientemente de la interfaz 3D, sin que esta condición prescriba una arquitectura técnica específica. No introducir precios dinámicos, negociación ni mecánicas no aprobadas. **Todos los valores [E] están autorizados como defaults configurables de testing** y no deben confundirse con resultados validados. Los riesgos [R] se observan y reportan. Si aparece una contradicción material o una decisión creativa nueva necesaria para implementar, solicitar resolución antes de modificar las reglas. **Solo tras la aprobación del plan técnico**, avanzar según el procedimiento de la Game Factory, con verificación y revisión independientes cuando ese flujo esté habilitado.

---

## 17. Registro de aprobación

- [x] El diseñador revisó la visión y el alcance y autorizó la especificación para Codex.
- [x] La distribución de pueblos y ocho oficios, el catálogo y la tabla de balance son los acordados, con cifras experimentales aceptadas.
- [x] Los valores [E], incluidos **D1–D6**, están autorizados para la primera demo sin revisión individual adicional.
- [x] La oscilación entre tramos se ensaya sin margen de tolerancia, conservando siempre los bienes materiales adquiridos.
- [x] **El puerto queda reservado a la caravana y no es accesible por el jugador.**
- [x] Los riesgos de diseño y balance se conservan como objetivos de pruebas, sin bloquear la entrega.
- [x] **El diseñador aprobó expresamente esta especificación funcional para entregarla a Codex (22 de octubre de 2026).**

**Alcance de la aprobación:** autoriza el diseño funcional y sus parámetros iniciales de test. **No constituye aprobación automática del plan técnico que proponga Codex, de futuros cambios de reglas ni certificación de que la economía ya esté equilibrada.**

### Cambios principales respecto de v0.1

1. Se cambia el estado de borrador a **aprobado para entregar a Codex**.
2. Los valores [E] se reconocen como **experimentos autorizados**; los antiguos pendientes que no eran decisiones pasan a riesgos [R] o decisiones confirmadas.
3. Se fija que **el puerto no es visitable ni seleccionable por el jugador**.
4. Se cierra la tabla de decisiones D1–D6 y se registra la confirmación del puerto (D7) y del descenso automático de tramo (D8).
5. Se mantiene íntegro el propósito de la demo y la separación entre decisiones creativas del diseñador, plan técnico de Codex y evaluación posterior por playtesting.
