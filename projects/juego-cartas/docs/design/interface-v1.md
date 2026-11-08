# Duelo en la cripta — interfaz v1

> Nota (LEG-1, 2026-11-08): el prototipo legado de siete salas se retiró del juego; las menciones a R1–R4, B1–B3 y sectores describen aquel prototipo y son históricas. La expedición vigente es la V0.4B (ver [status.md](../status.md)); los contratos de interacción de esta síntesis siguen aplicándose.

Propósito: referencia de la presentación e interacción vigentes de la demo. Revisión: 2026-10-28; código de referencia `54955677ec9430695b233c99a8fb4067b103a86d`. Estado: síntesis editorial de la dirección y contratos aprobados en A1–A6 (`a16c9c560335be109f11ffe58a258f27b82d9f13`), conservando la iteración de combate anterior. No añade decisiones de diseño.

Actualización de la iteración UX y fatiga autorizada el 2026-10-28: cerrada con alcance parcialmente aceptado. Foco, combate, distribución contextual, prioridades, conexiones/transiciones, presentación enemiga, turnos/fases y fatiga tienen aceptación expresa del diseñador, basada en playtesting y verificaciones técnicas. Se conserva la eliminación de transiciones hover en colección, pero el scroll defectuoso persiste y queda diferido. La autorización, evidencia y cierre constan en el [plan vivo](../implementation-plan.md); los cierres anteriores conservan su alcance histórico.

## Modos y estructura

- **Exploración:** escena 3D ocupa el área de juego, HUD compacto de vida/maná/fatiga/nivel, nombre de sala discreto, acceso Colección inferior y prompt E de un objeto cercano disponible. Avisos internos y ayuda consultable; sin preparación lateral permanente.
- **Colección:** modal sobre escena conservada, I abre/cierra y Esc cierra. Mantiene pose/sala/visita, suspende movimiento e interacción del mundo, limpia entradas retenidas y contiene foco; al cerrar devuelve control al avatar sin clic adicional. Presenta tipos, copias, reserva/baraja, salud, costes, rareza, bonos y reinvocación; sin flechas de orden de robo. Sus botones conservan colores de hover y foco visible, con cambios instantáneos sin transiciones decorativas. Persiste una onda/recolocación percibida durante rueda lenta, confirmada por el diseñador tras ese ajuste; incidencia conocida, no resuelta y diferida en el [estado vigente](../status.md), sin nueva corrección autorizada ni fecha comprometida.
- **Combate:** rival arriba, criaturas por lados y mano abajo; invocadores y recursos integrados, acción contextual junto al tablero. R1–R3 muestran nombre y campo del grupo sin vida/maná/mazo de un rival inexistente. Las listas sin límite se desplazan dentro del juego.
- **Resultado:** superposición con consecuencias reales, Continuar explorando y regreso a sala/punto seguro. Errores y acciones tienen mensajes breves accesibles dentro del juego.

## Contratos de interacción

| Acción | Comportamiento aprobado |
|---|---|
| Invocar | Arrastre al campo o activación de carta por clic/teclado. Intentos insuficientes informan razón, sin mutaciones parciales. |
| Sacrificar | Selección sobre campo con progreso y aviso permanente; desmarcar mientras falte, Esc/Cancelar antes de completar. Última selección revalida y ejecuta una sola invocación/pérdida, sin otra confirmación. |
| Atacar | En duelo, clic selecciona/deselecciona participantes del ataque directo al invocador. En escaramuza, arrastrar propia sobre enemiga selecciona al atacante y fija su objetivo; admite varios atacantes al mismo enemigo. Flechas cambian prioridad real de represalia dentro del grupo, sin asignar objetivos. Confirmación táctica o pase con cero. |
| Bloquear | Solo arrastre propia sobre atacante enemigo para asignar/reasignar; varias propias por atacante, cada bloqueador exclusivo. La prioridad se conserva mediante controles junto a la carta y se refleja en posiciones y números. |
| Retirar/corregir vínculo | Arrastrar a otro enemigo reasigna; a «Sin asignar» retira. Drop sobre el mismo destino conserva orden; destino inválido o Esc conserva el vínculo anterior. Sin selectores ni asignación por clic/teclado. |
| Fases | Principal automático solo sin invocaciones legales ni selección pendiente. Ataque resuelto enlaza enemigo y defensa resuelta enlaza turno propio. No fin manual de turno ni confirmación de defensa sin atacantes. |
| Accesibilidad | Foco visible, navegación de controles y modales, etiquetas y controles de prioridad. Por decisión expresa de esta iteración, las vinculaciones carta-a-carta requieren arrastre y no se completan solo con teclado. Las otras acciones conservan sus controles. I no interrumpe entradas editables ni responde a repetición sostenida. Activaciones repetidas de mano/fase no deben ejecutar la siguiente decisión accidentalmente. |

Las columnas compartidas agrupan objetivo/atacantes en R1–R3, o atacante/bloqueadores en defensa. Durante esas situaciones, las propias aún disponibles forman una fila centrada debajo del conjunto de grupos, sin sumarse al ancho lateral; al asignar/reasignar/retirar cambian de fila/grupo. Fuera de decisiones carta-a-carta y de la presentación de relaciones, ambos lados conservan sus filas normales centradas. No se crean zonas permanentes ni nuevas casillas de destino. Los ataques directos no bloqueados de duelos permanecen identificados como participantes en su presentación.

Las flechas junto a cada atacante dirigido cambian su prioridad de recepción de represalia dentro del mismo objetivo y actualizan posiciones, números y el orden declarado al motor. Reasignar añade al final del nuevo grupo y repetir destino conserva prioridad. Bloqueadores mantienen su array de prioridad. El render no reordena criaturas del dominio para acomodar el espacio. Los campos comparten desplazamiento horizontal y, cuando el contenido contextual supera la altura, desplazamiento vertical dentro de la mesa; conservan el centro al cambiar el ancho sin reiniciarlo por hover o prioridad. Las cartas conservan identidad y padre DOM y transiciones breves, anuladas con movimiento reducido. Las conexiones miden las cartas reales durante transición, scroll y resize, omitiendo las recortadas completamente.

El ataque propio en duelo muestra durante 420 ms la declaración real con los bloqueos enemigos antes de publicar el daño calculado. La IA y las consecuencias se calculan una sola vez; las entradas quedan suspendidas y el flujo continúa automáticamente. No hay nueva fase de reglas ni confirmación. El lado activo, la fase y la decisión propia se señalan por separado; durante turno enemigo el jugador puede estar decidiendo bloqueos. Los avisos no son necesarios para conocer esos estados.

Los cierres de colección/resultado/ayuda y el descarte de avisos de exploración solicitan devolución de foco después de cerrar la superposición, con entradas limpias. Caducar un aviso solo solicita devolución si tenía foco; los avisos dentro de colección o combate no sacan el foco hacia el mundo.

La legalidad, recursos y daño pertenecen al motor. No se añade una máquina de combate distinta por razones visuales. Reglas vigentes en [decisions.md](../decisions.md); las del prototipo legado retirado, solo como procedencia, en [spec-v1-legado.md](../history/spec-v1-legado.md).

## Dirección y recursos

Cripta azul carbón/piedra, bronce envejecido, texto marfil y selección turquesa. Fuentes locales Georgia/system-ui e iconos SVG propios. Rarezas comunes neutras, raras azules y épicas violetas, comunicadas también por texto o forma; heridas, selección, sacrificios y bloqueos distinguibles. Composición principal de escritorio a 1440×900 y 1024×768, con desplazamiento interno y acciones accesibles.

La [referencia gráfica y su prompt original](../history/design/ui-redesign-v1/design.md) se conservan junto a [reference.png](../history/design/ui-redesign-v1/reference.png). Son procedencia de diseño, no capturas ni fuente de cartas/cifras. La [primera propuesta visual](../history/design/visual-v0.1/design.md) conserva identidad estética, pero sus portales estáticos, preparación lateral y confirmaciones antiguas fueron sustituidos.

## Evidencia y límites

El [registro histórico A1–A6](../history/implementation-plan-v0.1.md) conserva revisión independiente, 160/160 pruebas más spatial/build y aceptación visual, funcional y de UX del diseñador. La automatización del juego quedó limitada por herramientas de navegador; la inspección de la imagen generada y SSR no acreditan píxeles ni gestos del juego. La aceptación humana sí quedó satisfecha, sin navegador/resolución exactos registrados ni validación móvil dedicada. No se atribuye una nueva ejecución a esta migración.

La continuación UX y fatiga cuenta con comprobaciones de Chrome mediante Playwright temporal a 1440×900 y 1024×768: gestos nativos sobre App con inicializadores controlados, capturas abiertas de grupos/prioridades/retirada/retorno/overflow y mediciones de trayectoria/anclajes; 176/176 + spatial, build y revisión independiente satisfactorios. El diseñador aceptó posteriormente el combate completo y dispensó ampliar resoluciones para el cierre. En colección, un puntero fijo durante scroll lento activó transiciones de color/borde de 130 ms en botones sucesivos; después del ajuste no se registraron esas animaciones, con gestión de baraja, hover y foco visibles conservados. La automatización no reprodujo el síntoma completo y el diseñador confirmó que persiste: no se declara corregido. Cierre parcial autorizado con esa incidencia diferida, sin investigación nueva en este cierre. Evidencia y límites exactos en el plan vivo.
