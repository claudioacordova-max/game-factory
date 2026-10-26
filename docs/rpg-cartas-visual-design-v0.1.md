# RPG de cartas — Transformación visual v0.1

Fecha: 2026-10-26. Encargo autorizado por el diseñador: transformación integral de presentación y procedimiento reutilizable. Fuente de gameplay: [especificación v0.2](rpg-cartas-prototype-spec-v0.2.md).

## Brief y límites

La página provisional apila mapa, catálogo, colección y combate. El objetivo es una demo con contextos claros, mesa legible y preparación cómoda. Se autoriza reconsiderar componentes, distribución y navegación, y resolver decisiones estéticas convencionales. No se cambian motor, contenido, orden de cartas, costes, balance, progresión ni reglas. Sin dependencias nuevas.

Criterios: exploración y combate diferenciados; mapa 3D funcional de tres encuentros; gestión de catálogo/copias/baraja con orden y heridas; mano, mesa, vida, maná, fatiga y acción de fase legibles; selección de sacrificios, atacantes y bloqueadores múltiples conserva intención y orden; resultados, desbloqueo y reintento siguen funcionando. Estados vacíos, bloqueados, seleccionados y heridos distinguibles por texto o forma además de color. Tests y build pasan; inspección real de exploración, gestión y fases de duelo a 1440×900 y 1024×768 cuando las herramientas lo permitan.

## A. Diseño estructural previo

- **Marco común:** identidad discreta, contexto, recursos del invocador y progreso. Un mensaje breve anuncia resultados o errores; se elimina la explicación técnica del motor y los IDs de copias de la presentación.
- **Exploración:** mapa 3D dominante (aprox. 70% del ancho), tres encuentros con estados y entrada directa al disponible; lateral de preparación (aprox. 30%) con baraja ordenada y acceso a colección. El mapa conserva nodos clicables y equivalentes de teclado.
- **Gestión contextual:** catálogo distingue desbloqueo de propiedad; colección muestra vida persistente y pertenencia a baraja; baraja conserva orden, retiro y selección vacía. La navegación de presentación no reinicia ni altera el estado de partida. Durante duelo no se permite editar baraja.
- **Duelo:** se retiran mapa y gestión de la vista principal. Oponente arriba, criaturas enemigas, división de mesa, criaturas propias y mano abajo. Recursos y fase próximos a las acciones, con panel contextual para invocar o avanzar fase. No añadir confirmaciones distintas de las existentes.
- **Principal:** seleccionar carta, ver coste y salud real de su copia, seleccionar sacrificios propios cuando corresponde y confirmar invocación.
- **Ataque:** seleccionar criaturas de mesa y declarar, incluso ninguna. **Defensa:** asignación por atacante; múltiples bloqueadores en orden de selección, sin doble asignación.
- **Resolución y fin:** acción de terminar turno tras resolver; victoria/derrota vuelve a exploración con heridas, pérdidas, fatiga, descubrimiento y siguiente encuentro/reintento existentes. Final de mazmorra sin invitaciones a rivales inexistentes.
- **Espacio:** composición compacta de escritorio; a 1024×768 reducir márgenes y proporciones sin ocultar recursos/acción. Listas largas y mano sin límite pueden desplazarse en su región; no reducir textos a tamaños ilegibles ni cortar controles.

## B. Propuesta gráfica previa

Cripta de piedra azul oscura y bronce envejecido, iluminación espectral turquesa. La identidad usa el nombre existente “Duelo en la cripta”; no agrega historia ni facciones. Encabezados serif locales (Georgia), interfaz y cifras system-ui, sin fuentes de red.

| Función | Color |
|---|---|
| Fondo | `#101b22` |
| Piedra/panel | `#1b2b32` |
| Bronce/acción | `#bc995b` |
| Texto marfil | `#eee4cf` |
| Magia/selección | `#71c5bc` |
| Herida/peligro | `#d48072` |

Paneles con líneas finas y esquinas contenidas; jerarquía por composición y tipografía. Cartas verticales con emblema reconocible, gema de maná, nombre y cifras de ataque/salud; fichas de mesa más compactas pero con salud actual/máxima. Iconos SVG propios coherentes (espada, corazón, maná, escudo, calavera y siluetas por criatura), accesibles y acompañados de etiquetas cuando comunican una regla. Sin librerías de iconos ni promesas de arte de criaturas completo.

Mapa como pequeño diorama de criptas/portales de piedra con camino visible, geometría simple, luces turquesa y bronce en el encuentro disponible. Mantener coherencia con el tablero 2D; no introducir cámara libre ni movimiento del jugador.

Referencia estética: [visual-reference-v1.png](design/rpg-cartas/visual-reference-v1.png), generada con imagegen integrado y observada antes de implementar. Es una propuesta de composición, no una captura de la aplicación ni una especificación nueva. Sus nombres, cifras, arte y ornamentos ilustrativos no sustituyen los datos reales: usar exactamente el contenido del motor y emblemas SVG realizables; no copiar los costes ni los nombres inventados en la imagen.

### Prompt de referencia (imagegen integrado)

```text
Use case: ui-mockup
Asset type: project-bound visual reference board for an existing Spanish card RPG browser game, two complete main screens.
Primary request: design a coherent playable-demo interface for "Duelo en la cripta". Show TWO widescreen mockups stacked vertically, exploration above and combat below. These are aesthetic references for functional React/CSS implementation, achievable with simple 3D geometry and vector card emblems.
Style/medium: deliberate fantasy game interface, restrained dark stone and aged bronze frames, misty teal magical illumination, warm ivory typography, serif display headings and readable sans-serif numbers. Elegant, atmospheric, generous negative space; not a web dashboard. No expensive character models required.
Composition: exploration screen: compact header with game name, life 20/20, mana 1/1 and fatigue 0; dominant isometric tabletop crypt map with exactly three linked stone encounter gates; first available, others locked; below, three small readable encounter plaques. Right sidebar a selected encounter summary and a compact ordered active deck of seven cards. Collection management may be contextual.
Combat screen: compact top bar opponent name "Centinela del umbral", life and turn. Broad central battlefield, enemy row above player row separated by subtle glowing line, 2 creature tiles each with stylized emblem, name, attack and current/max health. Bottom hand of 4 vertical cards: Escudero, Vanguardia, Diablillo, Basilisco. Each with large emblem, mana gem, name, attack/health. Right slim contextual column for current phase "Fase principal", mana 1/1, and primary action "Declarar atacantes". Selected hand card and an "Invocar" control. Limited text, legible at desktop 1024x768 as well as 1440x900.
Palette: midnight #101b22, stone #1b2b32, bronze #bc995b, ivory #eee4cf, spectral teal #71c5bc, injury terracotta #d48072.
Constraints: only existing mechanics: linear three encounters, deck management outside duels, mana, attack, health, persistent injuries, sacrifice. NO coins, experience bars, quests, new abilities, minimap, timers or extra mechanics. No new lore, no commercial branding, no watermark. No screenshots of code. Do not add decorative text paragraphs. Keep fantasy presentation practical to implement with HTML/CSS and Three.js.
```

## C–D. Ejecución y evaluación

Implementación delegada al rol nativo implementer; revisión independiente posterior con rol reviewer. Verificación técnica y visual y ciclos correctivos se registran en la sección de iteraciones del [plan existente](rpg-cartas-implementation-plan-v0.1.md).

Se requirió playtesting del diseñador para cerrar esta transformación, por el cambio amplio de navegación y controles presentados. Esta condición quedó satisfecha con la confirmación personal y aprobación definitiva registradas al final de este documento.

Recorrido propuesto originalmente para el cierre: exploración y preparación a los tamaños de escritorio previstos, gestión de baraja, invocación y sacrificios, ataques y bloqueos, consecuencias entre encuentros y resultados. No se afirma que se haya ejecutado exhaustivamente cada escenario propuesto. La aprobación final del diseñador acepta como suficientes las comprobaciones humanas concretas que declara a continuación; no quedan comprobaciones adicionales pendientes para esta iteración.

### Disponibilidad de inspección en esta sesión

Node v22.17.1 disponible. La invocación offline de `@playwright/cli@0.1.22` documentada en la skill falla con `ENOTCACHED`; no se instaló ni descargó. El inventario de Computer Use detectó Chrome, pero al seleccionar su ventana la herramienta se detuvo porque no pudo determinar con suficiente confianza la URL para aplicar la política. Se detuvo esa automatización; no se intentó sortear la restricción. El agente no observó píxeles de la aplicación ni verificó WebGL, tamaños de viewport o interacciones en navegador. La imagen generada es solo propuesta, nunca evidencia del resultado implementado. No se completó inspección automatizada a 1440×900 y 1024×768 ni se ejecutó Playwright.

### Aprobación posterior del diseñador — 2026-10-26

El diseñador revisó visualmente el juego y aprobó expresamente la implementación y el resultado visual, considerando alcanzado el nivel de calidad buscado. Valora la separación entre exploración, colección y duelo, la organización de la información, la navegación y la coherencia general. No considera necesarias más modificaciones gráficas para aprobar la iteración. También aprueba el procedimiento reutilizable incorporado a las skills y al workflow; las mejoras futuras se abordarán como iteraciones independientes.

Esta primera evidencia es una revisión visual manual del diseñador. No equivale a una ejecución de Playwright, una inspección automatizada o una comprobación exhaustiva de 1440×900 y 1024×768. En esa primera aprobación el diseñador no declaró completado el playtesting funcional; la confirmación posterior queda diferenciada en el registro siguiente. Se conservan los resultados técnicos previos (32/32 tests, build correcto y revisión independiente sin defectos técnicos reproducibles).

### Playtesting completado y aprobación definitiva — 2026-10-26

El diseñador confirma que jugó personalmente una partida completa de principio a fin, probó la navegación y los controles principales, agregó y quitó cartas del mazo y comprobó la vida y las interacciones principales. Todas sus comprobaciones fueron satisfactorias: el juego funciona según lo esperado y cumple los criterios de aceptación de esta iteración. También examinó la interfaz mediante emulación móvil en las herramientas del navegador y considera su presentación aceptable para el alcance actual, que no incluye desarrollar una versión móvil.

Quedan aprobados definitivamente el diseño, la implementación y el procedimiento visual reutilizable de Game Factory. El diseñador considera suficiente la revisión manual para el alcance aprobado y ordena cerrar formalmente la iteración. La inspección automatizada de 1440×900 y 1024×768 no se realizó y se conserva únicamente como antecedente histórico, sin tarea pendiente ni necesidad de ejecutarla ahora. No se atribuyen al agente ni a Playwright las comprobaciones humanas. Sin nuevas modificaciones gráficas, rondas de diseño o validaciones adicionales; las mejoras futuras serán iteraciones independientes. El cierre y el commit local se registran en el plan existente; no se realiza push.
