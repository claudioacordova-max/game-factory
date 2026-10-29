# Duelo en la cripta — especificación consolidada v1

Ámbito: demo RPG de cartas de `projects/juego-cartas/`. Revisión documental: 2026-10-28; corte contrastado: `54955677ec9430695b233c99a8fb4067b103a86d`. Estado: consolidación de requisitos y decisiones ya aprobados, con implementación existente. **No representa una nueva aprobación de diseño, un rebalanceo ni autorización de funciones futuras.**

## 1. Autoridad y procedencia

Esta referencia reúne las partes compatibles de la [especificación original v0.2](history/prototype-spec-v0.2.md), el [plan histórico](history/implementation-plan-v0.1.md), el [anexo aprobado de expedición D01–D12](history/iteration-v1.md) y las iteraciones posteriores allí registradas. Las decisiones posteriores expresamente aprobadas sustituyen solo los comportamientos afectados. El código permite corroborar qué está implementado; no concede por sí solo aprobación de una regla.

Actualización autorizada 2026-10-28: la [iteración UX y fatiga](implementation-plan.md) sustituye las asignaciones carta-a-carta por clic/teclado y la reducción de un punto de D12 por los contratos siguientes. Su continuación autoriza disposición vertical contextual y prioridad de represalia elegida por el jugador, sustituyendo el orden fijo de mesa para ese caso. El diseñador aceptó las mejoras de foco, combate/interfaz y fatiga, y autorizó cerrar con alcance parcialmente aceptado: el scroll de colección sigue defectuoso, conocido y diferido según el [estado vigente](status.md), sin nueva corrección autorizada ni fecha comprometida. El cierre no valida ese comportamiento.

| Fuente y cierre comprobado en Git | Autoridad que se conserva |
|---|---|
| Especificación original y siete hitos; validación `caf6309` | Combate, consecuencias persistentes, catálogo/colección/baraja, fatiga y continuidad compatibles con las decisiones posteriores. |
| Transformación visual, `2d477ff9ef793a8754f24826f763ade53b10b29f` | Identidad gráfica y separación de modos; composición e interacciones posteriormente sustituidas por A1–A6. |
| Expedición H0–H6, `f401a0ed719d7b61cc41d95b789389e3df8813eb` | D01–D12, recuperación, catálogo/encuentros, épicas, avatar, salas, objetos y persistencia. |
| Combate H1–H3, `3c4f0d4229488169ac4dec22197574fbfa4036b8` | Mezcla aleatoria del jugador, intentos directos de invocación, selección en campo y avance principal automático. |
| Interfaz A1–A6, `a16c9c560335be109f11ffe58a258f27b82d9f13` | Colección modal, tablero e invocadores, sacrificio al completar selección, arrastre de bloqueos, conexiones y eliminación del fin de turno manual. |
| Exploración/estabilización, `54955677ec9430695b233c99a8fb4067b103a86d` | Arte programático de siete salas/personajes, preservación de gameplay y corrección de mosaico/rendimiento. |

Los materiales de [planificación integral, CSV y XLSX](history/iteration-v1/) se conservan juntos como procedencia. Sus afirmaciones «no implementar todavía», crecimiento por eliminación, pendientes y heurísticas corresponden a la preparación anterior. No sustituyen D01–D12 ni las autorizaciones posteriores. Sus cifras siguen siendo un baseline experimental autorizado; no balance definitivo.

## 2. Alcance y ciclo aprobado

Explorar una mazmorra 3D con avatar, descubrir criaturas, preparar una baraja, combatir por turnos y conservar consecuencias entre encuentros. La pérdida de una copia es permanente para esa identidad, pero el tipo conocido puede recuperarse creando una copia básica nueva. El jugador puede optar por el ala de ratas para recuperarse y entrenar antes de los tres jefes principales.

Persistencia en memoria durante la página cargada; recargar o cerrar inicia otra sesión. No se exige almacenamiento durable. El nivel permanece fijo en 1, sin progresión de nivel implementada.

## 3. Estado inicial y recursos

- Invocador: vida actual y máxima 20, fatiga 0, nivel/maná base 1.
- Ocho tipos descubiertos con una copia sana, sin mejoras, seleccionados en baraja: P01, P02, P11, P03, P04, P05, P06 y P07. Ese orden de selección no determina el robo.
- Tres cartas iniciales; cada mantenimiento posterior roba una si quedan. No hay límite de mano, derrota por agotamiento ni robo adicional sobre las tres cartas al crear el primer turno propio.
- El maná recuperado al iniciar cada turno es `max(0, nivel − fatiga)`, aquí `max(0, 1 − fatiga)`.
- La baraja del jugador se mezcla una vez antes del reparto en cada combate. La fuente aleatoria puede inyectarse para pruebas reproducibles; no se aleatorizan los mazos ni la política enemigos.

## 4. Combate e interacción táctica

Turnos alternos con mantenimiento, principal y combate: declaración de atacantes, bloqueos y resolución. Invocar cuesta maná, sacrificios o ambos según la carta; los costes se pagan conjuntamente. Una acción inválida debe informar el motivo sin pagar recursos, retirar cartas ni efectuar sacrificios. Las criaturas recién invocadas pueden atacar ese turno.

Se permite seleccionar cero atacantes y pasar explícitamente. El defensor puede dejar atacantes sin bloquear o asignar varias criaturas a uno, pero cada bloqueador solo puede pertenecer a un atacante. El orden de bloqueadores determina la recepción del daño: se asigna daño letal a cada uno antes de continuar al siguiente. El daño entre criaturas es simultáneo. Un atacante bloqueado no inflige daño sobrante al invocador; los no bloqueados sí pueden dañarlo. La política enemiga es simple y determinista, no un optimizador estratégico general.

### Duelos

B1–B3 y R4 tienen invocador rival, mano, mazo y fase principal. Pierde un invocador al llegar a vida cero o inferior. Agotar la baraja solo impide robar. No hay rendición voluntaria.

### Escaramuzas R1–R3 (D03)

Todas las enemigas empiezan desplegadas: sin invocador, vida rival, mano, mazo ni invocación enemigos. Cada atacante propio requiere un objetivo enemigo válido; varios pueden compartir objetivo y el jugador puede adelantar/retrasar su prioridad de recepción de represalia dentro de ese grupo. El motor conserva el orden de atacantes declarado y reparte la represalia de cada objetivo según esa subsecuencia, manteniendo daño letal antes de pasar al siguiente. Las flechas sólo cambian prioridad, nunca asignan objetivos. Un arrastre nuevo/reasignado se añade al final del grupo de destino; repetir destino conserva su prioridad. En turno enemigo las supervivientes atacan al invocador propio, que puede bloquear con las reglas compatibles. Se gana al eliminar el grupo manteniendo vivo al invocador. Si mueren las últimas criaturas de ambos lados y el invocador vive, hay victoria con las bajas propias conservadas; invocador a cero implica derrota.

### Controles y automatización de fases aprobados

- Intentar invocación arrastrando al campo o activando la carta por clic/teclado, incluso si los recursos son insuficientes; conservar rechazo atómico.
- Si se exigen sacrificios, mostrar carta y progreso de selección. Se pueden desmarcar criaturas mientras falten, o cancelar con Esc/Cancelar. **La última selección requerida ejecuta la invocación y pierde permanentemente los sacrificios**, con aviso visible y sin confirmación adicional.
- En duelos, clic propio selecciona/deselecciona participantes del ataque directo al invocador; el invocador no es un destino de carta. En R1–R3, arrastrar una propia sobre una enemiga selecciona al atacante y asigna su objetivo explícito. Varios atacantes pueden compartir objetivo. Confirmar ataques exige objetivos completos. No decidir atacantes ni bloqueos automáticamente.
- Arrastrar criatura propia sobre atacante enemigo asigna o reasigna bloqueo. Cada bloqueador es exclusivo y varios pueden compartir atacante. Tanto en escaramuza como en defensa, arrastrar a otro enemigo reasigna y arrastrar a «Sin asignar» retira la relación; drop inválido o cancelación conservan la decisión anterior. No existen rutas paralelas de asignación por clic, selectores o teclado. Se conservan los controles de prioridad de bloqueadores.
- El tablero agrupa cartas por relaciones y refleja el orden real del motor. En situaciones tácticas las propias disponibles se centran debajo de los grupos, sin anexarse a sus costados; al asignar suben al grupo y al retirar regresan a la fila inferior. Fuera de esas situaciones ambos lados recuperan sus filas normales centradas. No se crean dos zonas permanentes ni destinos artificiales; se conservan conexiones y espacios existentes. Los ataques directos no bloqueados son participantes, aunque no tengan conexión carta-a-carta. No hay flecha provisional siguiendo el cursor ni posicionamiento manual. Los bloqueos enemigos reales se muestran brevemente antes del daño visible y continúan automáticamente, sin recalcular IA, duplicar consecuencias ni introducir otra decisión. Turno, fase y decisión propia se señalan por separado.
- Avanzar principal automáticamente solo cuando no existe una invocación legal ni selección pendiente. Resolver ataque propio encadena turno enemigo; resolver defensa inicia turno propio. No existe paso manual «Terminar turno».
- Omitir una defensa sin atacantes enemigos; cuando los hay, conservar la confirmación incluso de cero bloqueadores. Liquidar victoria/derrota antes de cualquier mantenimiento posterior. No duplicar robo, pagos o premios por activaciones repetidas.

Detalles de estados, accesibilidad y composición: [interfaz v1](design/interface-v1.md). Procedencia de estos cambios: iteraciones H1–H3 y A1–A6 del [plan archivado](history/implementation-plan-v0.1.md).

## 5. Catálogo, copias y recuperación

El catálogo guarda tipos descubiertos; la colección guarda identidades poseídas con salud y bonos individuales; la baraja referencia las seleccionadas. Cero o una copia por tipo propio en colección, reserva, mano, pila y campo; los enemigos no tienen esta restricción. Editar baraja solo fuera de combate, sin mínimo ni máximo, permitiendo cero cartas. No se ofrece ordenación manual de robo.

Heridas de supervivientes persisten entre turnos y encuentros. Muertas y sacrificadas se eliminan de colección y baraja, conservando el desbloqueo. Reserva no participante protegida; no sanación automática al liquidar.

El primer descubrimiento entrega una copia básica sana en reserva, sin incorporarla a la baraja (D08). Repetir premio o desbloqueo no duplica ni repone pérdidas.

Reinvocar requiere estar fuera de combate, conocer el tipo y no poseer su copia, tampoco en reserva. Crea otra identidad, salud base completa y bonos cero. Coste en vida máxima: P01–P04 gratis; comunes estándar 1, raras 2 y épicas 3. El máximo resultante debe ser ≥1; la vida actual no lo supera. Mostrar coste y máximo resultante antes de la acción y costes también en tipos poseídos para planificar. No usar reinvocación para sanar copias existentes.

## 6. Progresión, fatiga y sanación

Cada derrota suma 1 fatiga. Una victoria R4/B1/B2/B3 deja toda la fatiga en 0, independientemente de su valor previo; R1–R3 no reducen fatiga. Esta regla autorizada en la iteración UX y fatiga sustituye únicamente la reducción de un punto de D12. No aplicar además una reducción genérica duplicada.

R1–R3 ganados aumentan máximo en 1 y B1/B2 en 4, siempre hasta 20. R4/B3 restauran máximo a 20. Tras victoria o derrota, aplicar recompensas y restaurar vida actual al máximo persistente vigente (D09), sin curar criaturas. Cada intento, recompensa y baja se asienta una sola vez.

P16/P18 aumentan ataque en 1 y P17 vida máxima y actual en 1 por victoria completa en la que esa copia fue invocada y sobrevivió (D01–D04). Se aplica también a encuentros repetibles, hasta +3 por copia. No exige atacar, bloquear, dañar ni causar bajas. Mano/pila/reserva exclusivas, muertas, sacrificadas y derrotas no progresan. P17 no revive ni modifica daño retroactivo; reinvocar pierde los bonos anteriores. No hay atribución de último golpe, daño o multibloqueo.

Tres santuarios, uno por sector principal y un uso cada uno por sesión (D05), sanan todas las copias poseídas heridas, incluida reserva, hasta su máximo individual con bonos. No reviven ni restauran máximo del invocador. Sin heridas no consumen uso.

## 7. Contenido experimental autorizado

Los valores siguientes pertenecen al baseline implementado y aprobado para prueba; cambios de balance requieren nueva decisión. Estadísticas se expresan como ataque/vida base. M/S son maná/sacrificios; el coste de reinvocar es distinto.

| ID | Criatura | Rareza | M/S | ATQ/VID | Reinvocar | Fuente inicial |
|---|---|---|---|---|---|---|
| P01 | Rata amaestrada | Común, semilla | 0/0 | 1/2 | 0 | Inicio |
| P02 | Chispa errante | Común, semilla | 0/0 | 2/1 | 0 | Inicio |
| P03 | Esqueleto remendado | Común, semilla | 0/0 | 1/3 | 0 | Inicio |
| P04 | Lodo guardián | Común, semilla | 0/0 | 0/4 | 0 | Inicio |
| P05 | Exploradora de cripta | Común | 0/0 | 2/3 | 1 | Inicio |
| P06 | Bribón de ceniza | Común | 0/0 | 3/2 | 1 | Inicio |
| P07 | Guardia de cobre | Común | 1/0 | 2/5 | 1 | Inicio |
| P08 | Arquera de hollín | Común | 1/0 | 3/3 | 1 | Cofre ala |
| P09 | Acólita del umbral | Común | 0/0 | 2/4 | 1 | Cofre sector 1 |
| P10 | Perro sepulcral | Común | 1/0 | 4/2 | 1 | Cofre sector 2 |
| P11 | Espadachina espectral | Rara | 1/0 | 4/4 | 2 | Inicio |
| P12 | Centinela pétreo | Rara | 1/0 | 2/8 | 2 | Cofre ala |
| P13 | Quimera menor | Rara | 0/1 | 5/5 | 2 | B1 |
| P14 | Carroñero de hierro | Rara | 0/1 | 6/4 | 2 | Cofre sector 3 |
| P15 | Custodia rúnica | Rara | 1/0 | 4/6 | 2 | B2 |
| P16 | Basilisco ancestral | Épica, crece ATQ | 1/1 | 5/6 | 3 | B1 |
| P17 | Coloso de hueso | Épica, crece VID | 1/1 | 4/8 | 3 | B2 |
| P18 | Espectro hambriento | Épica, crece ATQ | 1/0 | 3/5 | 3 | Cofre sector 3 |

| ID | Enemigo | M/S | ATQ/VID |
|---|---|---|---|
| E01 | Rata | 0/0 | 1/1 |
| E02 | Rata torpe | 0/0 | 1/2 |
| E03 | Rata grande | 0/0 | 2/3 |
| E04 | Rata mordedora | 0/0 | 2/1 |
| E05 | Alfa de la madriguera | 0/0 | 3/2 |
| E06 | Esqueleto novato | 0/0 | 2/2 |
| E07 | Vigía exánime | 0/0 | 2/3 |
| E08 | Murmurante | 1/0 | 3/2 |
| E09 | Acólito de fosa | 1/0 | 2/4 |
| E10 | Guardián sepulcral | 0/0 | 3/5 |
| E11 | Gólem agrietado | 1/0 | 4/5 |
| E12 | Bruja del umbral | 0/1 | 3/4 |
| E13 | Caballero hueco | 1/0 | 4/6 |
| E14 | Verdugo de cripta | 0/1 | 5/5 |

| Encuentro | Formato y vida rival | Campo inicial | Mazo enemigo en orden | Premio de victoria |
|---|---|---|---|---|
| R1 Ratas · 1 | Grupo, sin invocador | E01 | Ninguno | Máximo +1 |
| R2 Ratas · 2 | Grupo, sin invocador | E01/E03 | Ninguno | Máximo +1 |
| R3 Ratas · 3 | Grupo, sin invocador | E01/E02/E04 | Ninguno | Máximo +1 |
| R4 Señora de las ratas | Duelo, 12 | Vacío | E01/E05 | Máximo 20, fatiga a 0; habilita cofre único P08/P12 |
| B1 Centinela del umbral | Duelo, 17 | Vacío | E08/E07/E09 | Máximo +4, fatiga a 0, P13/P16 y acceso sector 2 |
| B2 Custodia de catacumbas | Duelo, 22 | Vacío | E08/E09/E07/E11/E10 | Máximo +4, fatiga a 0, P15/P17 y acceso sector 3 |
| B3 Guardián de la cripta | Duelo, 30 | E06 | E11/E13/E08/E09/E14/E12 | Máximo 20, fatiga a 0 y final de demo |

R1–R4 son repetibles por visita; B1–B3 no. Los cofres de sectores entregan P09, P10 y P14/P18 y no requieren combate adicional. Cofres y primeros descubrimientos son únicos durante la sesión. Fuente literal: [cartas propias](history/iteration-v1/rpg_cartas_jugador_v01.csv), [enemigas](history/iteration-v1/rpg_cartas_enemigos_v01.csv) y [encuentros](history/iteration-v1/rpg_encuentros_v01.csv), contrastados con [contenido implementado](../src/engine/content.ts) y [mundo](../src/engine/world.ts).

## 8. Exploración y presentación

Tres sectores y ala opcional de cuatro salas. Acceso voluntario desde sector 1, avance secuencial R1→R4 y salida voluntaria desde cada sala al sector 1. Solo salir realmente y entrar otra vez reinicia los cuatro encuentros; derrota, menú o retorno de combate conserva los completados de esa visita (D07). La salida no reinicia salud, pérdidas, mejoras, máximo, fatiga, cofres ni santuarios.

Movimiento WASD/flechas y controles accesibles de ayuda; orientación, cámara elevada, colisiones y acercamiento antes de interactuar con E o botón equivalente. No iniciar combates por simple contacto. Menús y combate suspenden movimiento, limpian entradas y preservan posición. Retorno a la misma sala y punto seguro, sin activar encuentros involuntarios. Las puertas abiertas tras victoria permanecen disponibles y se puede retroceder.

Al cerrar una superposición y retornar a exploración, el control del avatar recupera foco sin clic adicional y sin reutilizar teclas retenidas. Un aviso dentro de otro modal no devuelve foco al mundo. La exclusividad de arrastre para vincular cartas elimina deliberadamente la posibilidad de completar esas asignaciones solo con teclado; se conservan etiquetas, foco y controles accesibles de las demás acciones.

Exploración llena el área; HUD compacto, colección superpuesta con I/Esc, mensajes y resultados internos. Combate con mano inferior, campos por lados, vida de invocadores y acción contextual; R1–R3 sin recursos rivales ficticios. Filas/listas sin límite disponen de desplazamiento y controles accesibles. Referencias: [interfaz](design/interface-v1.md) y [exploración 3D](design/exploration-3d-v1.md). Los PNG son referencias conceptuales, no datos de cartas ni capturas que acrediten la implementación.

## 9. Verificación y límites de autorización

Conservar cobertura de costes y rechazos atómicos, identidades/tipos únicos, daño/bloqueos, persistencia, liquidación idempotente, recuperación severa, crecimiento elegible, visitas, objetos y retorno espacial. Las pruebas técnicas, revisión independiente e inspección renderizada tienen alcances distintos; no sustituyen playtesting humano cuando la experiencia lo requiere conforme al [workflow de Factory](../../../docs/factory/workflow-v1.md).

La aceptación H6 posterior dispensó la ejecución manual exhaustiva de tres protocolos: no deben reabrirse sus casillas históricas como tareas actuales. A1–A6 y la estabilización tienen aceptación humana registrada. El [plan de continuidad](implementation-plan.md) enlaza resultados anteriores y sus límites; la migración no crea una nueva validación completa.

Fuera de este alcance: monedas/tiendas, narrativa completa, guardado permanente, niveles ganados, generación procedural, cuarta rareza, hechizos/fichas, nuevas habilidades, rendición, multijugador, música/doblaje y arte definitivo. La representación 3D de invocaciones se mencionó como futura intervención independiente, sin autorización de implementación actual. No se identificó una discrepancia material de reglas sin resolver en las fuentes utilizadas; el equilibrio y la experiencia a largo plazo siguen siendo experimentales, no decisiones automáticamente delegadas.
