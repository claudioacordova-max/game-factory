# Duelo en la cripta — interfaz v1

Propósito: referencia de la presentación e interacción vigentes de la demo. Revisión: 2026-10-28; código de referencia `54955677ec9430695b233c99a8fb4067b103a86d`. Estado: síntesis editorial de la dirección y contratos aprobados en A1–A6 (`a16c9c560335be109f11ffe58a258f27b82d9f13`), conservando la iteración de combate anterior. No añade decisiones de diseño.

## Modos y estructura

- **Exploración:** escena 3D ocupa el área de juego, HUD compacto de vida/maná/fatiga/nivel, nombre de sala discreto, acceso Colección inferior y prompt E de un objeto cercano disponible. Avisos internos y ayuda consultable; sin preparación lateral permanente.
- **Colección:** modal sobre escena conservada, I abre/cierra y Esc cierra. Mantiene pose/sala/visita, suspende movimiento e interacción del mundo, limpia entradas retenidas y contiene/restaura foco. Presenta tipos, copias, reserva/baraja, salud, costes, rareza, bonos y reinvocación; sin flechas de orden de robo.
- **Combate:** rival arriba, criaturas por lados y mano abajo; invocadores y recursos integrados, acción contextual junto al tablero. R1–R3 muestran nombre y campo del grupo sin vida/maná/mazo de un rival inexistente. Las listas sin límite se desplazan dentro del juego.
- **Resultado:** superposición con consecuencias reales, Continuar explorando y regreso a sala/punto seguro. Errores y acciones tienen mensajes breves accesibles dentro del juego.

## Contratos de interacción

| Acción | Comportamiento aprobado |
|---|---|
| Invocar | Arrastre al campo o activación de carta por clic/teclado. Intentos insuficientes informan razón, sin mutaciones parciales. |
| Sacrificar | Selección sobre campo con progreso y aviso permanente; desmarcar mientras falte, Esc/Cancelar antes de completar. Última selección revalida y ejecuta una sola invocación/pérdida, sin otra confirmación. |
| Atacar | Clic selecciona/deselecciona. Confirmación táctica o pase con cero; objetivos directos obligatorios en escaramuza, incluyendo varios atacantes a un mismo enemigo. |
| Bloquear | Arrastre asigna/reasigna; varias propias por atacante, cada bloqueador exclusivo. Retirada, orden y conexiones numeradas sobre cartas; alternativa por clic/teclado. |
| Fases | Principal automático solo sin invocaciones legales ni selección pendiente. Ataque resuelto enlaza enemigo y defensa resuelta enlaza turno propio. No fin manual de turno ni confirmación de defensa sin atacantes. |
| Accesibilidad | Foco visible, navegación de controles y modales, alternativas a arrastre. I no interrumpe entradas editables ni responde a repetición sostenida. Activaciones repetidas de mano/fase no deben ejecutar la siguiente decisión accidentalmente. |

La legalidad, recursos y daño pertenecen al motor. No se añade una máquina de combate distinta por razones visuales. Detalle normativo en [spec-v1.md](../spec-v1.md).

## Dirección y recursos

Cripta azul carbón/piedra, bronce envejecido, texto marfil y selección turquesa. Fuentes locales Georgia/system-ui e iconos SVG propios. Rarezas comunes neutras, raras azules y épicas violetas, comunicadas también por texto o forma; heridas, selección, sacrificios y bloqueos distinguibles. Composición principal de escritorio a 1440×900 y 1024×768, con desplazamiento interno y acciones accesibles.

La [referencia gráfica y su prompt original](../history/design/ui-redesign-v1/design.md) se conservan junto a [reference.png](../history/design/ui-redesign-v1/reference.png). Son procedencia de diseño, no capturas ni fuente de cartas/cifras. La [primera propuesta visual](../history/design/visual-v0.1/design.md) conserva identidad estética, pero sus portales estáticos, preparación lateral y confirmaciones antiguas fueron sustituidos.

## Evidencia y límites

El [registro histórico A1–A6](../history/implementation-plan-v0.1.md) conserva revisión independiente, 160/160 pruebas más spatial/build y aceptación visual, funcional y de UX del diseñador. La automatización del juego quedó limitada por herramientas de navegador; la inspección de la imagen generada y SSR no acreditan píxeles ni gestos del juego. La aceptación humana sí quedó satisfecha, sin navegador/resolución exactos registrados ni validación móvil dedicada. No se atribuye una nueva ejecución a esta migración.
