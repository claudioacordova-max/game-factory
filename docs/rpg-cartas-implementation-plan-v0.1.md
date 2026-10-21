# Plan de implementación técnica — RPG de cartas

**Versión:** 0.1  
**Fecha:** 21 de octubre de 2026  
**Proyecto:** `projects/juego-cartas`  
**Estado:** Plan aprobado; Hitos 1–4 implementados; hitos 5–7 pendientes
**Fuente de requisitos:** [`rpg-cartas-prototype-spec-v0.2.md`](rpg-cartas-prototype-spec-v0.2.md)

## Propósito y forma de trabajo

Este plan convierte la especificación funcional aprobada en siete hitos pequeños y verificables. Cada hito puede abordarse en una sesión independiente. Antes de empezar un hito, se revisarán su alcance, dependencias y criterios de aceptación; se registrarán aquí los resultados y las decisiones tomadas. No se comenzará un hito hasta que el anterior cumpla sus criterios de aceptación.

El alcance se limita a las mecánicas aprobadas en la especificación. Las ideas experimentales o reservadas para el futuro no se implementarán como parte de este plan.

## Decisiones técnicas provisionales aprobadas

Estas decisiones completan detalles que la especificación deja abiertos. Deben mantenerse documentadas y revisarse si las pruebas revelan un problema:

1. **Reglas y estado:** mantener las reglas del juego en módulos TypeScript sencillos y separados de React. La interfaz presenta el estado y comunica acciones al motor; no contiene reglas de combate duplicadas.
2. **Persistencia:** conservar el estado de partida entre duelos durante la sesión del navegador. No se requiere guardar o restaurar la partida después de cerrar o recargar el navegador.
3. **Bloqueadores múltiples:** el defensor elige el orden de sus bloqueadores. El atacante asigna daño en ese orden y debe asignar daño letal a cada bloqueador antes de asignar daño al siguiente. El daño entre criaturas se resuelve simultáneamente. Una criatura bloqueada no asigna daño sobrante al invocador defensor.
4. **Fatiga y maná:** el máximo de maná utilizable es `máximo de maná base − fatiga`, con mínimo de cero. La fatiga no cambia el nivel ni el maná base.
5. **Enemigos:** emplear una política simple y determinista para que los enemigos jueguen criaturas, ataquen y bloqueen. Esto hace los encuentros repetibles y verificables sin añadir sistemas de IA más amplios.
6. **Contenido inicial:** definir un conjunto pequeño de criaturas de prueba con costes de maná o sacrificio, estadísticas y una condición de desbloqueo. Se respetará el máximo provisional de una copia por tipo en la colección.
7. **Interfaz:** la interfaz del primer duelo puede ser 2D provisional para validar pronto el flujo de juego. El prototipo final debe aprovechar el stack web 3D existente (Three.js y React Three Fiber) y presentar la mazmorra y/o los duelos con una escena 3D funcional. La lógica de juego se mantendrá independiente de la representación para facilitar esa transición.
8. **Pruebas:** introducir pruebas automatizadas ligeras para las reglas deterministas del motor. El proyecto actual no tiene todavía un comando ni un framework de pruebas; se elegirá una herramienta mínima al llegar al Hito 1. No se añade infraestructura de pruebas en esta etapa de planificación.

## Hitos

### Hito 1 — Núcleo de reglas del duelo

**Objetivo:** implementar y verificar las reglas fundamentales del combate en TypeScript, sin interfaz ni continuidad entre enfrentamientos.

**Dependencias:** ninguna.

**Alcance:** estado de invocadores y criaturas durante un duelo; valores iniciales; nivel y maná; mano y robo; fases de turno; invocaciones y costes; declaración de atacantes y bloqueadores; resolución del daño; victoria al llegar a cero de vida; no robar cuando el mazo está vacío; posibilidad de que criaturas recién invocadas ataquen ese turno. Se incluyen costes de maná y sacrificio mínimos para probar las reglas aprobadas.

**Tareas**

- [x] Definir los tipos de datos mínimos para duelo, invocador, criatura, carta, mazo y fases.
- [x] Implementar mantenimiento, recuperación de maná, robo y avance de turno.
- [x] Implementar invocaciones con costes de maná y sacrificio.
- [x] Implementar declaración de atacantes y bloqueadores, incluyendo bloqueo múltiple según la decisión provisional.
- [x] Resolver el daño a criaturas e invocadores, las muertes y las condiciones de victoria.
- [x] Añadir pruebas automatizadas para valores iniciales, robo, costes, fases, combate, muerte, victoria y mazo vacío.
- [x] Ejecutar las pruebas y `npm run build`; registrar resultados abajo.

**Verificación:** pruebas automatizadas del motor y compilación. Revisar especialmente el orden de asignación de daño a bloqueadores múltiples.

**Criterios de aceptación**

- [x] Los casos cubiertos producen resultados deterministas y coherentes con la especificación.
- [x] Un invocador pierde al llegar a cero de vida; quedarse sin cartas no causa derrota.
- [x] Una criatura recién invocada puede atacar ese turno.
- [x] El motor se puede probar sin montar la interfaz React.
- [x] Las pruebas y la compilación terminan correctamente.

### Hito 2 — Duelo jugable contra un enemigo

**Objetivo:** conectar el motor a una interfaz mínima para iniciar y completar un duelo.

**Dependencias:** Hito 1.

**Alcance:** mostrar mano, maná, vidas y criaturas en mesa; ofrecer controles para jugar cartas, declarar atacantes y bloqueadores, y avanzar fases/turnos; ejecutar un enemigo con comportamiento sencillo; presentar victoria o derrota. La interfaz puede ser 2D provisional. No se exige aún representar el duelo en 3D.

**Tareas**

- [x] Mostrar el estado relevante del duelo y sus fases.
- [x] Conectar las acciones de interfaz con comandos del motor.
- [x] Permitir jugar cartas legales, elegir sacrificios y declarar ataques y bloqueos.
- [x] Implementar una política determinista del enemigo.
- [x] Mostrar claramente el resultado del duelo y prevenir acciones inválidas.
- [x] Añadir pruebas automatizadas de turnos de enemigo, bloqueos y resultados de victoria/derrota.
- [ ] Recorrer manualmente una victoria y una derrota en navegador; el entorno no ofreció un navegador disponible.
- [x] Ejecutar `npm run test` y `npm run build` y registrar resultados.

**Verificación:** `npm run test` y `npm run build` pasan. Las pruebas del motor verifican victoria y derrota. Falta recorrer manualmente la interfaz: no hubo navegador disponible en el entorno.

**Criterios de aceptación**

- [x] El jugador puede iniciar y terminar un duelo desde la interfaz.
- [x] La interfaz refleja el estado del motor y permite las acciones legales principales.
- [x] Los resultados mostrados corresponden con las reglas del motor.
- [x] Se verificaron victoria y derrota con pruebas del motor; falta comprobarlas manualmente en la interfaz.

### Hito 3 — Consecuencias entre duelos

**Objetivo:** conservar las heridas y pérdidas de criaturas entre duelos durante la sesión del navegador.

**Dependencias:** Hitos 1 y 2.

**Alcance:** mantener vida actual por copia; retirar permanentemente las criaturas que mueran o sean sacrificadas; conservar desbloqueos aunque se pierda una copia; aplicar el resultado del duelo a la partida. El invocador recupera toda su vida después de victoria o derrota; las criaturas supervivientes no se curan automáticamente.

**Tareas**

- [x] Definir el estado de partida que contiene las copias individuales y los desbloqueos.
- [x] Trasladar heridas del duelo a las copias de la colección.
- [x] Eliminar definitivamente las criaturas muertas y sacrificadas de la colección.
- [x] Conservar el desbloqueo del tipo después de perder su copia.
- [x] Restaurar completamente la vida del invocador al cerrar el duelo.
- [x] Añadir pruebas de heridas entre duelos, muerte permanente, sacrificio y restauración de vida.
- [x] Ejecutar pruebas y build; registrar resultados.

**Verificación:** pruebas automatizadas con varios duelos sucesivos y comprobación del estado resultante.

**Criterios de aceptación**

- [x] Una criatura superviviente comienza el siguiente duelo con su vida actual previa y su vida máxima intacta.
- [x] Las criaturas muertas o sacrificadas ya no están disponibles en duelos posteriores.
- [x] El tipo de carta perdido sigue desbloqueado.
- [x] La vida del invocador se restaura completamente al terminar cada duelo.
- [x] No se requiere persistencia después de cerrar o recargar el navegador.

### Hito 4 — Catálogo, colección y baraja activa

**Objetivo:** permitir desbloquear cartas y decidir cuáles se utilizan en los duelos.

**Dependencias:** Hito 3.

**Alcance:** catálogo permanente de tipos desbloqueados durante la sesión; colección de copias individuales; máximo provisional de una copia por tipo; baraja editable libremente fuera del combate, sin tamaño mínimo ni máximo y permitiendo cero cartas; las bajas se retiran de la baraja.

**Tareas**

- [x] Representar por separado catálogo, copias de la colección y baraja activa.
- [x] Implementar el desbloqueo que registra el tipo en el catálogo y entrega su primera copia.
- [x] Aplicar el límite provisional de una copia por tipo en la colección.
- [x] Permitir añadir y quitar cartas de la baraja fuera del combate, incluso dejarla vacía.
- [x] Retirar de la baraja las copias eliminadas permanentemente.
- [x] Añadir pruebas de desbloqueo, límite de copias, edición de baraja y bajas.
- [x] Ejecutar `npm run test` y `npm run build`.
- [ ] Completar un recorrido manual de obtención y preparación; no había navegador disponible en el entorno.

**Verificación:** pruebas automatizadas de las invariantes de colección y baraja y un recorrido manual de obtención y preparación.

**Criterios de aceptación**

- [ ] El desbloqueo agrega el tipo al catálogo y entrega una copia a la colección.
- [ ] El jugador puede agregar o quitar cartas de su baraja fuera de un duelo.
- [ ] Se permiten barajas vacías y no se impone un tamaño máximo o mínimo.
- [ ] Una baja deja de estar disponible, pero no elimina el desbloqueo del catálogo.

### Hito 5 — Fatiga y ciclo de derrota

**Objetivo:** aplicar la fatiga aprobada y hacer posible continuar después de perder.

**Dependencias:** Hitos 3 y 4.

**Alcance:** derrota añade un punto de fatiga; victoria resta un punto con mínimo de cero; cada punto bloquea un punto de maná máximo base; no se modifica el nivel; después de perder, regresar a exploración frente al enemigo derrotante, con vida del invocador recuperada y consecuencias de criaturas conservadas. No se incluyen objetos, habilidades ni lugares para quitar fatiga.

**Tareas**

- [x] Aplicar el incremento de fatiga después de una derrota.
- [x] Aplicar la reducción de fatiga después de una victoria, con mínimo de cero.
- [x] Calcular el maná utilizable según maná base y fatiga, con mínimo de cero.
- [x] Mantener el flujo entre duelos existente frente al mismo enemigo después de la derrota, sin adelantar la exploración del Hito 6.
- [x] Permitir reorganizar la baraja y reintentar ese encuentro.
- [x] Añadir pruebas de derrotas consecutivas, victorias, fatiga cero, maná bloqueado, continuidad e idempotencia de finalización.
- [x] Ejecutar pruebas automatizadas y build; registrar resultados.
- [ ] Completar el recorrido manual en navegador.

**Verificación:** automatizar los cálculos y probar manualmente derrota, reorganización y reintento.

**Criterios de aceptación**

- [x] Derrota suma exactamente un punto de fatiga y victoria resta exactamente uno hasta cero.
- [x] La fatiga limita el maná utilizable sin cambiar el nivel ni el maná base.
- [x] Tras una derrota se conservan las heridas y bajas, se restaura la vida del invocador y se puede reintentar el mismo encuentro.
- [x] No se han añadido mecanismos para eliminar fatiga.

**Limitación de diseño para playtesting:** con nivel 1, el maná máximo base inicial es 1; una derrota deja 1 punto de fatiga y, por tanto, 0 de maná utilizable. Esto puede impedir invocar cartas con coste de maná hasta reducir fatiga (por ejemplo, ganando un duelo) o reiniciar la sesión. Es una consecuencia de las reglas aprobadas: no se cambiará en la implementación. Debe comprobarse y anotarse durante las pruebas.

### Hito 6 — Exploración y progresión mínima

**Objetivo:** conectar varios encuentros, la gestión de baraja y la obtención de cartas en un ciclo jugable.

**Dependencias:** Hitos 2, 4 y 5.

**Alcance:** mazmorra de representación sencilla con acceso a varios encuentros, al menos una condición de desbloqueo de carta, edición de baraja entre combates y continuidad después de victorias y derrotas. El prototipo final debe aprovechar el stack 3D web existente (Three.js y React Three Fiber). La exploración puede ser una escena espacial pequeña con interacciones directas; no requiere navegación o mazmorras complejas.

**Tareas**

- [x] Conectar tres encuentros lineales a un mapa 3D interactivo; solo está disponible el primero y cada victoria habilita el siguiente.
- [x] Conservar el encuentro disponible tras una derrota y bloquear permanentemente los encuentros completados.
- [x] Integrar el descubrimiento de Brote de musgo tras la primera victoria y permitir gestionar la baraja entre duelos.
- [x] Presentar la mazmorra mediante una escena 3D funcional; los controles accesibles también permiten entrar al nodo disponible.
- [x] Mantener la progresión y las reglas de juego en módulos TypeScript separados de React y la escena.
- [x] Recorrer manualmente el ciclo completo, incluyendo pérdida y reintento; el usuario completó los tres encuentros.
- [x] Ejecutar pruebas, build y registrar resultados.

**Verificación:** recorrido completo de exploración, desbloqueo, edición de baraja, varios duelos, persistencia de heridas/bajas/fatiga y reintento tras derrota; build.

**Criterios de aceptación**

- [x] Se puede acceder a varios enfrentamientos desde la mazmorra.
- [x] Se puede obtener al menos una nueva carta durante la progresión.
- [x] Se puede gestionar la baraja entre duelos.
- [x] El estado y las consecuencias conectan los encuentros durante la sesión.
- [x] El prototipo utiliza el stack 3D web para representar funcionalmente la mazmorra.
- [x] El ciclo se puede continuar después de ganar o perder.

### Observaciones de playtesting del Hito 6

Las siguientes observaciones fueron aportadas por el usuario tras completar manualmente los tres encuentros. Son hallazgos y posibles asuntos de diseño para futuras iteraciones; **no aprueban cambios de reglas, recompensas, enemigos ni equilibrio**.

- Se consiguió completar la mazmorra de tres encuentros, pero requirió varios intentos.
- Las criaturas se pierden más rápido de lo que se obtienen copias nuevas.
- El descubrimiento de una sola carta no compensa necesariamente el desgaste acumulado.
- Las mecánicas principales funcionan según el diseño aprobado y la experiencia comienza a resultar entretenida.
- El mapa 3D provisional cumple su función; la presentación visual deberá revisarse en una futura fase de desarrollo 3D.

### Hito 7 — Revisión técnica y entrega

**Objetivo:** comprobar el prototipo completo frente a los criterios mínimos de la especificación y documentar los resultados.

**Dependencias:** Hitos 1 a 6.

**Tareas**

- [ ] Ejecutar todas las pruebas automatizadas disponibles.
- [ ] Ejecutar `npm run build`.
- [ ] Recorrer los 12 criterios de aceptación de la especificación funcional.
- [ ] Corregir defectos que impidan completar el ciclo aprobado.
- [ ] Registrar pruebas ejecutadas y sus resultados.
- [ ] Registrar las decisiones provisionales tomadas y las limitaciones conocidas.
- [ ] Confirmar que no se implementaron funcionalidades futuras o experimentales.

**Verificación:** pruebas automatizadas, build y checklist manual de aceptación.

**Criterios de aceptación**

- [ ] Es posible iniciar y completar duelos, robar e invocar, declarar ataques y bloqueos y resolver daño.
- [ ] Heridas y bajas se conservan entre duelos; la baraja se puede editar y se puede desbloquear una carta.
- [ ] Se pueden jugar varios duelos consecutivos y aplicar/recuperar fatiga según las reglas.
- [ ] La vida del invocador se recupera tras victoria o derrota.
- [ ] Se puede continuar el ciclo después de una derrota.
- [ ] Se entrega un informe de pruebas, decisiones provisionales y limitaciones.

## Riesgos, ambigüedades y limitaciones

1. **Asignación de daño a bloqueadores múltiples:** la especificación aprueba varios bloqueadores, pero no define cómo asignar el daño. Se usará el orden elegido por el defensor y la asignación de daño letal del atacante descrita en las decisiones provisionales.
2. **Fatiga que bloquea todo el maná:** a nivel 1, una derrota deja al jugador sin maná utilizable. Esta limitación debe probarse y documentarse; las reglas aprobadas no se modificarán.
3. **Persistencia acotada a la sesión:** no se guarda la partida tras recargar o cerrar el navegador. Esto satisface la decisión de alcance actual; guardado durable requeriría planificación y aprobación aparte.
4. **Reglas de enemigos y contenido:** la especificación no define comportamiento de enemigos, estadísticas de las cartas ni condiciones específicas de desbloqueo. Se utilizarán ejemplos pequeños y deterministas que permitan evaluar los sistemas aprobados.
5. **Progresión de nivel:** se especifica el incremento de maná base por nivel, pero no un método para subir de nivel. El prototipo comienza en nivel 1 y no inventa una progresión.
6. **Preparación del mazo:** no se define el procedimiento para crear/mezclar el mazo de duelo ni qué ocurre con cartas no jugadas al finalizar. Se fijarán reglas operativas mínimas al implementar el Hito 1 y se documentarán sin alterar la baraja persistente.
7. **Transición visual:** la interfaz 2D sirve para validar el primer duelo; la entrega final debe usar Three.js y React Three Fiber de forma funcional. Mantener la lógica desacoplada de la vista reduce el riesgo de rehacer reglas al cambiar la representación.
8. **Infraestructura de pruebas:** el proyecto no incluye pruebas automatizadas actualmente. La herramienta y los scripts se decidirán al iniciar el Hito 1, manteniendo dependencias de desarrollo al mínimo.
9. **Alcance futuro excluido:** creación o reinvocación mediante habilidades, fichas, mejoras persistentes, descanso y curación avanzada, rendición, habilidades adicionales, arquetipos, torneos, mazmorras complejas, puzles y recompensas avanzadas quedan fuera de estos hitos.

## Registro de resultados de pruebas

Añadir una entrada al completar cada hito. Indicar comandos y escenarios manuales; si algo falla, registrar el síntoma y el seguimiento acordado.

| Hito / fecha | Pruebas y comandos ejecutados | Resultado | Defectos o seguimiento |
|---|---|---|---|
| Hito 1 — 2026-10-21 | `npm run test` (10 casos); `npm run build` | 10/10 pruebas aprobadas; compilación TypeScript y build Vite aprobados. Incluye comprobación por ID de sacrificio/invocación y persistencia de daño no letal tras avanzar turnos. Vite mostró el aviso de chunk mayor a 500 kB, propio de la plantilla 3D existente. | Sin defectos del motor pendientes en el alcance del Hito 1. No se añadió prueba visual; el motor se prueba sin React. |
| Hito 2 — 2026-10-21 | `npm run test` (14 casos); `npm run build`; intento de abrir la interfaz con CUA | 14/14 pruebas aprobadas; compilación TypeScript y build Vite aprobados (235,89 kB JS sin gzip). Se probaron turno del enemigo con sacrificio, bloqueos deterministas y finales de victoria y derrota. No se pudo hacer comprobación manual: no había navegadores ni pestañas disponibles. | Falta recorrer visualmente una victoria y una derrota en navegador. No se avanzó al Hito 3. |
| Hito 3 — 2026-10-21 | `npm run test` (19 casos); `npm run build` | 19/19 pruebas aprobadas; compilación TypeScript y build Vite aprobados (237,29 kB JS sin gzip). Se verificaron heridas tras daño real de combate, muerte, sacrificio, recuperación del invocador tras victoria/derrota y continuidad de copias entre duelos. | Comprobación manual pendiente; seguir los pasos del informe de entrega. Sin guardado después de cerrar o recargar, según alcance. |
| Hito 4 — 2026-10-21 | `npm run test` (24 casos); `npm run build`; consulta de navegadores disponibles | 24/24 pruebas aprobadas; TypeScript y Vite build aprobados (241,89 kB JS sin gzip). La comprobación visual no se pudo ejecutar: el entorno CUA no mostró navegadores ni pestañas disponibles. | Recorrido manual pendiente. Se documentaron pasos para catálogo, colección, edición de baraja, heridas, bajas y herramienta de desbloqueo en la entrega. No se implementó Hito 5. |
| Hito 5 — 2026-10-21 | `npm.cmd run test` (27 casos); `npm.cmd run build` | 27/27 pruebas aprobadas; TypeScript y Vite build aprobados (242,47 kB JS sin gzip). Se verificaron derrotas consecutivas, finalización duplicada, victorias hasta fatiga cero, maná bloqueado, límite de cero y fatiga del jugador aislada del maná del enemigo. | Recorrido manual en navegador pendiente; pasos de comprobación incluidos en la entrega. La fatiga persiste en `GameSession` durante la sesión de la página, no tras recargar. |
| Hito 6 — 2026-10-21 | `npm.cmd run test` (32 casos); `npm.cmd run build` | 32/32 pruebas aprobadas; compilación TypeScript y build Vite aprobados. Bundle principal: 1.160,64 kB sin comprimir; Vite conserva el aviso de chunks mayores a 500 kB. | El usuario completó manualmente los tres encuentros y confirmó el flujo. Se registran sus observaciones de playtesting abajo; cualquier ajuste futuro queda pendiente de aprobación. |
| Hito 7 — pendiente | — | — | — |

## Registro de decisiones importantes

Anotar la fecha, el hito, la decisión, su motivo y si reemplaza una decisión provisional. No cambiar silenciosamente reglas aprobadas; cualquier cambio de mecánica requiere aprobación del diseñador.

| Fecha | Hito | Decisión | Motivo / evidencia | Estado |
|---|---|---|---|---|
| 2026-10-21 | Planificación | Persistencia limitada a la sesión del navegador | Aclaración aprobada durante la planificación técnica | Aprobada |
| 2026-10-21 | Planificación | Resolución de bloqueadores múltiples según decisiones provisionales de este documento | Aclaración aprobada durante la planificación técnica | Aprobada |
| 2026-10-21 | Planificación | Mantener y probar la limitación de maná cero con fatiga 1 a nivel 1 | Consecuencia de las reglas aprobadas; no cambiar mecánicas | Aprobada |
| 2026-10-21 | Planificación | Interfaz 2D provisional para el primer duelo; stack 3D web en el prototipo final | Aclaración aprobada durante la planificación técnica | Aprobada |
| 2026-10-21 | Hito 1 | El mazo de duelo conserva el orden recibido; las tres cartas iniciales se toman desde arriba y los robos posteriores también siguen ese orden | Mantener resultados repetibles y evitar introducir aleatoriedad de barajado no definida | Provisional |
| 2026-10-21 | Hito 1 | El mantenimiento inicial se aplica al crear el duelo; cada fin de turno alterna al siguiente jugador, recupera su maná hasta el nivel y roba una carta si queda disponible | Ciclo mínimo y determinista mientras no hay interfaz | Provisional |
| 2026-10-21 | Hito 1 | Pruebas TypeScript compiladas con `tsc` y ejecutadas por Node.js; no se agregó framework externo | Reutilizar Node 22 y TypeScript ya disponibles en el proyecto | Provisional |
| 2026-10-21 | Hito 2 | Interfaz 2D HTML/CSS; las fases de combate y el daño siguen en el motor TypeScript existente | Hito 2 permite interfaz 2D temporal y requiere evitar reglas de combate duplicadas en React | Provisional |
| 2026-10-21 | Hito 2 | Enemigo juega cartas legales en orden de mano, usa sus primeras criaturas como sacrificio cuando hace falta y ataca con todas las criaturas | Política simple, fija y verificable según el plan aprobado | Provisional |
| 2026-10-21 | Hito 2 | Al defender contra un ataque del jugador, el enemigo asigna como máximo un bloqueador disponible por atacante; elige el primero que pueda matarlo y, si no lo hay, el primero disponible | Mantiene la política determinista sin ampliar la IA | Provisional |
| 2026-10-21 | Hito 2 | Los mazos y el orden de cartas son fijos; reiniciar crea un duelo nuevo | Repetibilidad; no introduce colección ni persistencia entre duelos | Provisional |
| 2026-10-21 | Hito 3 | `GameSession` es la fuente de verdad persistente en memoria: registra copias con ID propio, salud y tipos desbloqueados; cada duelo se construye desde las copias supervivientes y consolida cambios al terminar | Implementar continuidad de sesión sin mezclar el estado temporal del combate ni introducir guardado externo | Provisional |
| 2026-10-21 | Hito 3 | El control provisional “Iniciar siguiente duelo” aparece al finalizar un combate y reutiliza las copias de la sesión; el mazo determinista del enemigo vuelve a empezar | Permitir comprobar manualmente dos duelos sin incorporar exploración, recompensas ni edición de baraja | Provisional |
| 2026-10-21 | Hito 4 | `GameSession` mantiene `unlockedCardIds`, las copias individuales y `activeDeckCopyIds` ordenados; el duelo usa únicamente las copias activas. Las siete copias iniciales permanecen seleccionadas al iniciar la sesión | La baraja pasa a ser la selección entre duelos y conserva la continuidad probada en Hito 3 | Provisional |
| 2026-10-21 | Hito 4 | Retirar una copia de la baraja no la retira de la colección. Solo las copias seleccionadas pueden recibir heridas o bajas; al morir o sacrificarse, la copia desaparece de colección y baraja, mientras el desbloqueo permanece | Mantener separadas la propiedad, la selección para el duelo y el catálogo permanente | Aprobada por el diseñador |
| 2026-10-21 | Hito 4 | El primer desbloqueo añade una copia a la colección, pero no la selecciona automáticamente en la baraja. Un tipo ya desbloqueado no puede otorgar otra copia, aunque la anterior se haya perdido | La especificación define la entrega de la primera copia y permite que el jugador la incorpore a su baraja; el límite por tipo sigue vigente tras una baja | Provisional |
| 2026-10-21 | Hito 4 | La carta “Brote de musgo · prueba” (1 ATQ, 4 VID) permanece bloqueada al iniciar. El botón provisional la desbloquea una vez, sin condición de exploración ni recompensa, y la edición solo está habilitada entre duelos | Comprobar el flujo de desbloqueo sin anticipar exploración | Reemplazada en Hito 6 |
| 2026-10-21 | Hito 5 | La fatiga se conserva en `GameSession`, se copia al invocador del jugador al iniciar el duelo y el motor calcula su maná inicial y de mantenimiento como `max(0, nivel − fatiga)`; el enemigo mantiene fatiga cero | Mantener la consecuencia persistente en sesión y aplicar la misma regla en cada recuperación de maná sin afectar al oponente | Aprobada |
| 2026-10-21 | Hito 5 | Cada duelo recibe un ID y `finishSessionDuel` registra los IDs ya asentados; repetir la finalización del mismo duelo devuelve la sesión sin reaplicar fatiga, heridas, bajas ni recuperación | Hacer idempotente el asentamiento del resultado ante llamadas duplicadas | Provisional |
| 2026-10-21 | Hito 6 | La mazmorra contiene tres encuentros lineales: Centinela del umbral (Explorador sombrío, Murciélago), Custodia de las catacumbas (Murciélago, Saqueador, Guardia de la cripta) y Guardián de la cripta (mazo original de siete cartas, sin cambios) | Composiciones, estadísticas, costes, nombres y orden aprobados por el diseñador antes de implementar | Aprobada |
| 2026-10-21 | Hito 6 | Una victoria completa el encuentro y habilita el siguiente; una derrota se registra sin avance, dejando disponible el encuentro actual. Ambos resultados se liquidan una sola vez por ID de duelo | Aplicar el flujo lineal aprobado e impedir que se dupliquen avance o recompensas | Aprobada |
| 2026-10-21 | Hito 6 | Vencer al Centinela desbloquea Brote de musgo mediante `unlockCreatureType`; se añade al catálogo y colección, no a la baraja. Se elimina el botón provisional | Cumplir la condición de descubrimiento aprobada y reutilizar el sistema del Hito 4 | Aprobada |
| 2026-10-21 | Hito 6 | El progreso de exploración se conserva en memoria de sesión, separado de `GameSession` y del motor de combate; el mapa presenta nodos 3D y delega las acciones a transiciones TypeScript | Mantener reglas y progreso independientes de React y la presentación, sin cambiar el motor de combate | Aprobada |
