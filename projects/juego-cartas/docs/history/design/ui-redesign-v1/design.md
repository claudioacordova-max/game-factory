> Archivo histórico trasladado el 2026-10-28 desde `docs/design/rpg-cartas/ui-redesign-v1.md`. Conserva el contexto y las afirmaciones de su etapa; la referencia consolidada vigente es [spec-v1.md](../../../spec-v1.md) y la continuidad está en [implementation-plan.md](../../../implementation-plan.md). Las rutas de los registros de ejecución son históricas; los enlaces navegables se adaptaron al traslado.

# RPG de cartas — Rediseño integrado de interfaz v1

Fecha: 2026-10-27. Proyecto: `projects/juego-cartas/`, «Duelo en la cripta».

## Encargo autorizado y límites

El diseñador aprobó el plan A1–A6 y autorizó su implementación continua en el mensaje «Game Factory — Aprobación del plan y autorización de ejecución». La solicitud «RPG de cartas — Nueva iteración: rediseño de interfaz de exploración y combate», incluida íntegramente en la conversación, es el documento rector de esta intervención. Se delegan layout, paleta, componentes y detalles convencionales de interacción; no se necesita una aprobación estética intermedia. El cierre y commit de A requieren el playtesting y la aceptación final del diseñador.

**Comportamiento actual:** la exploración controlable se encuentra rodeada por encabezado, mensajes y preparación; Colección sustituye su vista; combate conserva un panel de acciones y listas. Ya existen robo aleatorio, invocación por arrastre, selección directa de atacantes/objetivos y avance principal sin invocaciones legales. Sacrificios exigen confirmación aparte; los bloqueadores no se arrastran; tras el ataque propio queda un fin de turno manual.

**Resultado:** un único espacio de juego con exploración dominante y HUD contextual, colección superpuesta, y combate independiente centrado en tablero, mano e invocadores. Tipo: mejora integral de UX/presentación y controles de una demo existente. Plan adicional: el plan A1–A6 ya aprobado. Decisiones creativas bloqueantes: ninguna. Playtesting humano: necesario por el cambio de controles y experiencia.

Se preservan estadísticas, habilidades, costes, rarezas, daño, objetivos dirigidos, multibloqueo, heridas, bajas, mejoras, progreso, recuperación, reinvocación, enemigos, recompensas, mazmorras, una copia por tipo y mezcla aleatoria vigente. El motor sigue siendo la autoridad de legalidad. No se amplía contenido, balance, persistencia durable ni dependencias.

Fuentes complementarias: [especificación funcional original](../../prototype-spec-v0.2.md), decisiones vigentes de la [iteración de expedición](../../iteration-v1.md) y última iteración de robo/interacciones del [plan existente](../../implementation-plan-v0.1.md). Las referencias antiguas a robo fijo y confirmación separada de sacrificios son históricas; no se reintroducen.

## 1. Flujos y estados reales

| Contexto actual | Estado y transición que debe conservarse |
|---|---|
| Exploración | `ExpeditionState` conserva sesión, sala, progreso y visita. `ExplorationScene` mueve y orienta avatar, valida cercanía, informa pose y limpia teclas al perder foco. `interactWorldObject` abre encuentro o aplica interacción. |
| Colección | Tipos desbloqueados con o sin copia; copias en reserva o baraja, heridas y bonos. Añadir/retirar y reinvocar están limitados a fuera de combate. Abrir y cerrar no reinicia sala ni visita. |
| Principal | Mano y campo propios; invocación sin sacrificios o selección pendiente. `summonAvailability` verifica recursos; `summonCreature` valida y produce el nuevo estado sin pagos parciales. |
| Ataque de duelo | Selección propia, incluso cero; el enemigo asigna bloqueos y se resuelve con las reglas existentes. |
| Ataque de escaramuza R1–R3 | Cada atacante propio requiere un enemigo concreto; varios pueden compartir objetivo. Se conserva el orden de mesa que gobierna la represalia vigente. |
| Defensa | En turno enemigo, se asignan criaturas propias a sus atacantes. Cada bloqueador pertenece a un solo atacante; varios bloqueadores se ordenan contra uno. Confirmar resuelve y empieza el siguiente turno si continúa. |
| Resultado | Se liquida el encuentro una vez, se preservan consecuencias y se retorna a pose segura de la misma aventura. La confirmación de continuación permite leer heridas, pérdidas, mejoras y premios. |

En R1–R3 el rival es `CreatureGroup`: mostrar nombre del grupo y criaturas, sin invocador, vida, maná o mazo ficticios. R4 y B1–B3 conservan invocador con vida actual y máxima. Los valores provienen del motor, la sesión y el encuentro vigente.

## 2. Distribución estructural

El contenedor de juego ocupa el viewport disponible (`100dvh`), sin exigir fullscreen del navegador. Los modos son excluyentes: exploración o combate. Las superposiciones pertenecen a ese contenedor; no hay encabezado general, pie de página, preparación lateral ni mensajes externos permanentes.

**Exploración.** La escena 3D llena el área. HUD compacto arriba a la izquierda: vida actual/máxima, maná utilizable, fatiga y nivel. Nombre discreto de sala arriba. Botón Colección con icono y atajo `I` abajo al centro. La indicación contextual queda cerca del borde inferior, separada del botón y de las alertas. Se preservan cámara, orientación, colisiones y contenido; el rediseño no reconstruye las salas.

**Colección.** Superposición amplia sobre la escena conservada, con título, cierre visible y recursos relevantes para reinvocar. Rejilla de tipos descubiertos y copias; agrupación de baraja activa dentro de la misma interfaz. Salud actual/máxima, ataque, coste, rareza, mejoras, propiedad y pertenencia a baraja se leen en cada carta o su detalle. Añadir/retirar y reinvocar siguen disponibles según las reglas actuales. Se eliminan flechas, numeración como orden de robo y texto de preparación de secuencia. El desplazamiento es interno al inventario.

**Combate.** Eje vertical: identidad/vida rival en el extremo superior; criaturas enemigas arriba del centro; criaturas propias debajo; invocador propio con vida actual/máxima y maná/fatiga cerca de la mano inferior. El centro queda libre para leer relaciones. Acción táctica contextual a la derecha del tablero, integrada en él. El nombre de grupo sustituye al invocador rival en R1–R3. No se muestran permanentemente nivel, fatiga, maná o tamaño de mazo enemigo.

**Resultado y mensajes.** El resultado importante es una superposición con resumen, consecuencias consultables y Continuar. Alertas de errores/acciones son breves, dentro del juego, con anuncio accesible. Las instrucciones tácticas aparecen durante la decisión correspondiente; las instrucciones de movimiento dejan de ser permanentes. La ayuda y alternativas de entrada permanecen discretas y consultables.

Mesas y manos no tienen un límite nuevo de cartas: usar composición adaptable y desplazamiento interno cuando haga falta. El foco o carta ampliada no debe tapar la acción de fase ni impedir seleccionar objetivos. Las conexiones deben actualizarse al cambiar tamaño o desplazar filas.

## 3. Dirección visual concreta

- Fondo de cripta azul carbón `#101b22` y piedra `#263a43`, con iluminación turquesa suave `#71c5bc`; superficies de controles oscuras suficientemente opacas para leer sobre el 3D.
- Bordes y acentos de bronce envejecido `#bc995b`; texto marfil `#eee4cf` y secundario claro. Evitar marcos gruesos repetidos que fragmenten el espacio.
- Georgia o serif local equivalente para nombres/títulos; `system-ui` para valores, acciones y ayuda. Cifras de recursos alineadas y legibles. No descargar fuentes.
- Reutilizar retratos e iconos SVG propios. La carta mantiene nombre, coste y ataque/salud como jerarquía principal; rareza y crecimiento son secundarios. Conservar comunes neutras, raras azules y épicas violetas.
- Invocable, arrastrando, destino válido, destino rechazado, atacante elegido, sacrificio y bloqueo tienen tratamientos distintos. Selección combina contorno/símbolo/texto; heridas y pérdida se reconocen sin depender solo del color.
- Tablero con textura/profundidad moderada mediante CSS; líneas de relación sobre una capa SVG sin interceptar entradas. Sin nueva escena 3D de combate ni librería de componentes.
- Referencias de Hearthstone y Magic Arena: lectura por lados, mano inferior, invocadores integrados y acciones en tablero. No incorporar reglas, marcas ni arte de esos juegos.

Referencia seleccionada: [composición de los tres contextos](reference.png), generada con la herramienta integrada `image_gen.imagegen` e inspeccionada visualmente por el coordinador. El resultado concreta separación entre modos, extremos de invocadores y conexiones turquesas de bloqueo. Sus nombres, textos, ilustraciones o reglas inventados son solo referencia gráfica; no modifican contenido ni marcan una exigencia de calidad artística. La implementación usará los retratos SVG existentes, fuentes locales y superficies CSS. Esta inspección corresponde a la referencia, no a una interfaz implementada.

Prompt exacto utilizado:

```text
Use case: ui-mockup. Create a polished but realistically implementable desktop browser fantasy card RPG interface reference sheet, 1536x1024 landscape, three clear separate labeled panels: EXPLORACIÓN, COLECCIÓN, COMBATE. Existing game Duelo en la cripta. Visual direction dark slate crypt stone, restrained aged bronze outlines, warm ivory readable text, magical turquoise lighting; rare cards blue and epic violet. Local Georgia-like serif headings and clean sans body. Main large panel COMBATE should take right two-thirds full height: full-bleed digital card battle board, subtle top-down stone arena, enemy invoker centered at top with 17/17 life, enemy creature cards upper half, own creatures lower half, player hero medallion and 20/20 life plus blue mana 1/1 at bottom, compact fan of five readable illustrated cards at bottom. On-board turquoise/bronze connection lines link two own blockers to one attacking enemy card, numbered 1 and 2. Small contextual action button 'Resolver bloqueos' near right edge, no sidebar, no website header. Left upper panel EXPLORACIÓN: full area is isometric low-poly crypt room, small hooded avatar, chest, pillars, teal shrine, compact top-left 20/20 health and mana HUD, bottom-center circular card collection button, small 'E · Abrir cofre' prompt. Left lower panel COLECCIÓN: in-game overlay with three large cards, compact active deck grouping, visible close X, wounds and cost indicators, no deck-order arrows. This is an aesthetic composition reference, not final game data or a new game mechanic. Strong spatial hierarchy, pleasant legibility, generous board space, tactile cards, simple art assets. Avoid dense tiny text, permanent instructions, external panels, logos, copied Hearthstone or Magic assets, browser chrome.
```

## 4. Contratos de interacción aprobados

| Acción | Contrato observable |
|---|---|
| Colección | Botón o `I` abre/cierra; `Esc` cierra. Detiene movimiento y E del mundo, limpia teclas y conserva pose/sala/visita. No responde a repetición sostenida ni a escritura en controles. Foco contenido en la superposición y restaurado al salir. |
| Mundo | Mostrar una acción cercana y disponible, p. ej. `E · Abrir cofre` o `E · Entrar`; ocultarla al alejarse, consumirse o cambiar modo. Conservar botón contextual accesible equivalente. |
| Invocación | Arrastre de cualquier carta en fase principal, incluso con recursos insuficientes. Rechazar con motivo sin mutar mano, campo, recursos ni copias. La alternativa por teclado/clic intenta la misma operación. |
| Sacrificios | Tras intento legal, mostrar carta y `n/N`; marcar criaturas propias al clic y permitir desmarcar mientras falten. Aviso visible: «Al elegir la última criatura, se invoca y los sacrificios se pierden permanentemente». Última selección revalida y ejecuta una sola invocación atómica. `Esc` o Cancelar antes de completar no cobra ni pierde criaturas. No hay confirmación separada. |
| Atacantes | Clic selecciona y segundo clic deselecciona. Confirmar ataques o pasar con cero es una decisión explícita. En escaramuza, elegir y modificar el objetivo sobre cartas enemigas; mostrar todas las relaciones, incluso objetivos compartidos. No permitir confirmar una selección con objetivos incompletos. |
| Bloqueadores | Arrastrar propia sobre enemigo atacante asigna; arrastrarla a otro reasigna. Control contextual en carta retira. Varias propias pueden bloquear al mismo atacante; numeración y controles discretos permiten consultar y modificar orden. Alternativa de teclado/clic sobre cartas con la misma semántica, sin listas laterales permanentes. |
| Resolución | Mantener confirmación táctica de ataques y bloqueos, incluyendo decisiones vacías. Principal avanza solo sin invocaciones legales ni selección pendiente. Ataque propio resuelto encadena turno enemigo; defensa resuelta inicia turno propio. Si termina el duelo, liquidar antes de cualquier continuación. No duplicar mantenimiento, robo, pagos ni premios. |

## 5. Componentes y responsabilidades

`App.tsx` seguirá coordinando aventura, duelo, resultados y comandos de dominio. Extraer vistas compactas cuando clarifique sus límites: HUD y notificaciones; contenedor de colección; tablero con identidad de lados, filas, mano y acción contextual; conexiones entre cartas. Los nombres finales de componentes son una decisión convencional delegada.

`ExplorationScene.tsx` conserva runtime de movimiento, pose, proximidad y cámara; recibe suspensión durante superposiciones. `CollectionViews.tsx` conserva representación de copias y gestión de baraja/reinvocación. `CardViews.tsx` presenta estados de selección, arrastre, asignación y accesibilidad. `combatSelection.ts` y controladores pequeños concentran transformaciones verificables de selección y avance, sin duplicar legalidad ni reglas de daño. `styles.css` y `scene/exploration.css` resuelven composición y adaptación.

El estado interno `resolved` del motor puede conservarse: quitar el paso manual de interfaz no exige rediseñar su máquina de fases. La mezcla del jugador y las políticas/mazos enemigos no se tocan. Se retiran callbacks/imports de ordenación de la interfaz; no se requiere eliminar un helper de dominio independiente para cumplir el encargo.

## 6. Hitos aprobados y evidencia prevista

| Hito | Dependencia | Entrega y aceptación |
|---|---|---|
| A1 | Ninguna de B | Este mapa estructural, propuesta gráfica, contratos y referencia seleccionada cuando llegue. Registro de autorización en el plan existente. |
| A2 | A1 | Exploración llena el espacio, HUD contextual, colección superpuesta con `I`/`Esc`, mensajes internos y ordenación de UI retirada; posición y controles conservados. |
| A3 | A1–A2 | Tablero completo con dos lados, mano e invocadores integrados; R1–R3 sin vida rival ficticia; sin paneles externos. |
| A4 | A3 | Invocación/sacrificio directo y atómico; atacantes y objetivos accesibles; fin automático tras ataque sin decisiones omitidas. |
| A5 | A3–A4 | Bloqueo por arrastre, conexiones, multibloqueo y orden editable; retirada/reasignación y confirmación correcta. |
| A6 | A2–A5 | Regresión, inspección renderizada disponible, correcciones, README y guía breve de playtesting. Entrega técnica para aceptación humana. |

Cada hito se implementa y verifica mediante el workflow existente con revisión independiente posterior y hasta dos ciclos de corrección. B1 es independiente y no condiciona el funcionamiento del RPG. Los registros de estado, revisión, resultados y cierre viven en el plan existente, no en un sistema paralelo.

Pruebas técnicas: suite `npm.cmd run test` y `npm.cmd run build`; regresiones de ambos modos, coste combinado, identidad/heridas/bonos, mezcla, copia única y persistencia; selección parcial/cancelación/último sacrificio/rechazos; objetivos compartidos; bloqueos inválidos, múltiples, exclusivos, reasignados y ordenados; cero atacantes/bloqueadores; mantenimiento y liquidación una vez. Verificar entrada real mediante clic/teclado/arrastre cuando el navegador disponible lo permita; helpers aislados no prueban eventos React.

Inspección renderizada principal de versión integrada: 1440×900 y 1024×768; exploración, proximidad, colección, cartas heridas/perdidas, mano amplia, sacrificios, objetivos dirigidos, multibloqueo, resultado y retorno. Abrir capturas y comprobar legibilidad, recortes, solapamiento, foco, conexiones y acción contextual. Registrar tamaños y estados realmente observados; si falla el navegador, respetar restricciones y preparar verificación manual sin atribuir cobertura inexistente. La revisión visual corresponde a esta intervención de UI y no añade una obligación general a trabajos internos.

## 7. Registro de A1 y estado de la implementación

**Estado vigente de cierre:** A1–A6 completados y aceptados definitivamente por el diseñador tras playtesting visual, funcional y de UX. Se conservan 160/160 pruebas, comprobaciones espaciales, build y preflight previo de 33 rutas. El P3 documental se corrigió en un ciclo y se comprobó independientemente sin hallazgos; no quedan defectos ni validaciones humanas pendientes. Cierre formal y commit local autorizados mediante el procedimiento seguro del coordinador, con referencia en el plan existente. La evaluación principal fue en escritorio y la emulación móvil orientativa resultó aceptable, sin cobertura dedicada ni requisitos nuevos. No se facilitaron navegador, resolución o dispositivo exactos. Los párrafos siguientes conservan el contexto histórico de A1 y la limitación de inspección automática.

A1 documental preparado sobre el código actual y referencia generada incorporada. El coordinador comunicó baseline de 110/110 pruebas más comprobaciones espaciales y build correcto; no se ejecutaron tests adicionales del juego por este cambio documental. No se ha implementado A2–A6 en este hito y no se afirma una inspección renderizada nueva de la aplicación. El intento de Playwright offline informó `ENOTCACHED`; la alternativa nativa queda por comprobar en la validación integrada. A permanece sin cierre ni commit hasta la aceptación humana requerida.

Actualización A6: A2–A5 están implementados y tienen revisión independiente aprobada sin hallazgos. La versión integrada contiene HUD/colección superpuestos, tablero completo, sacrificio por última selección, ataques dirigidos, bloqueo por arrastre con orden/conexiones y avance automático. A6 agrega protección de activación simple en cartas de mano y decisiones de fase, documentación y [guía breve de playtesting](../../README-before-migration-2026-10-28.md#playtesting-breve-del-rediseño--aceptado). El estado y comprobaciones vigentes se registran en el [plan existente](../../implementation-plan-v0.1.md) y el [informe de validación](../../validation-report-v0.1.md).

La inspección de la referencia generada sí se realizó. La inspección renderizada de la aplicación no se completó: tras reanudar, Chrome pudo activarse, pero la herramienta nativa detuvo Computer Use al no poder determinar con confianza la URL actual en Windows para aplicar su política. No se continuó operando la interfaz ni se eludió la restricción. Los fallos previos de Playwright offline (`ENOTCACHED`) e IAB no disponible se conservan como antecedentes. Análisis de CSS para los tamaños previstos, SSR y tests no son evidencia de píxeles ni de gestos ejecutados en navegador. La comodidad, claridad y presentación funcional fueron aceptadas en el playtesting humano final. Esa confirmación satisface la condición humana sin convertir la inspección automática no realizada en evidencia ejecutada; ya no es un bloqueo pendiente.
