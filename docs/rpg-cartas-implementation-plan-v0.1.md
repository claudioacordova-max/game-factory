# Plan de implementación técnica — RPG de cartas

**Versión:** 0.1  
**Fecha:** 21 de octubre de 2026  
**Proyecto:** `projects/juego-cartas`  
**Estado:** Plan aprobado; Hito 1 implementado; hitos restantes pendientes
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

- [ ] Mostrar el estado relevante del duelo y sus fases.
- [ ] Conectar las acciones de interfaz con comandos del motor.
- [ ] Permitir jugar cartas legales y declarar ataques y bloqueos.
- [ ] Implementar la política determinista del enemigo.
- [ ] Mostrar claramente el resultado del duelo y prevenir acciones inválidas.
- [ ] Probar manualmente una victoria y una derrota; añadir pruebas automatizadas de transiciones críticas cuando corresponda.
- [ ] Ejecutar `npm run build` y registrar resultados.

**Verificación:** recorrer manualmente un duelo ganado y uno perdido; ejecutar pruebas y compilación.

**Criterios de aceptación**

- [ ] El jugador puede iniciar y terminar un duelo desde la interfaz.
- [ ] La interfaz refleja el estado del motor y permite las acciones legales principales.
- [ ] Los resultados mostrados corresponden con las reglas del motor.
- [ ] Se han probado tanto victoria como derrota.

### Hito 3 — Consecuencias entre duelos

**Objetivo:** conservar las heridas y pérdidas de criaturas entre duelos durante la sesión del navegador.

**Dependencias:** Hitos 1 y 2.

**Alcance:** mantener vida actual por copia; retirar permanentemente las criaturas que mueran o sean sacrificadas; conservar desbloqueos aunque se pierda una copia; aplicar el resultado del duelo a la partida. El invocador recupera toda su vida después de victoria o derrota; las criaturas supervivientes no se curan automáticamente.

**Tareas**

- [ ] Definir el estado de partida que contiene las copias individuales y los desbloqueos.
- [ ] Trasladar heridas del duelo a las copias de la colección.
- [ ] Eliminar definitivamente las criaturas muertas y sacrificadas de la colección.
- [ ] Conservar el desbloqueo del tipo después de perder su copia.
- [ ] Restaurar completamente la vida del invocador al cerrar el duelo.
- [ ] Añadir pruebas de heridas entre duelos, muerte permanente, sacrificio y restauración de vida.
- [ ] Ejecutar pruebas y build; registrar resultados.

**Verificación:** pruebas automatizadas con varios duelos sucesivos y comprobación del estado resultante.

**Criterios de aceptación**

- [ ] Una criatura superviviente comienza el siguiente duelo con su vida actual previa y su vida máxima intacta.
- [ ] Las criaturas muertas o sacrificadas ya no están disponibles en duelos posteriores.
- [ ] El tipo de carta perdido sigue desbloqueado.
- [ ] La vida del invocador se restaura completamente al terminar cada duelo.
- [ ] No se requiere persistencia después de cerrar o recargar el navegador.

### Hito 4 — Catálogo, colección y baraja activa

**Objetivo:** permitir desbloquear cartas y decidir cuáles se utilizan en los duelos.

**Dependencias:** Hito 3.

**Alcance:** catálogo permanente de tipos desbloqueados durante la sesión; colección de copias individuales; máximo provisional de una copia por tipo; baraja editable libremente fuera del combate, sin tamaño mínimo ni máximo y permitiendo cero cartas; las bajas se retiran de la baraja.

**Tareas**

- [ ] Representar por separado catálogo, copias de la colección y baraja activa.
- [ ] Implementar el desbloqueo que registra el tipo en el catálogo y entrega su primera copia.
- [ ] Aplicar el límite provisional de una copia por tipo en la colección.
- [ ] Permitir añadir y quitar cartas de la baraja fuera del combate, incluso dejarla vacía.
- [ ] Retirar de la baraja las copias eliminadas permanentemente.
- [ ] Añadir pruebas de desbloqueo, límite de copias, edición de baraja y bajas.
- [ ] Completar un recorrido manual de obtención y preparación; ejecutar pruebas y build.

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

- [ ] Aplicar el incremento de fatiga después de una derrota.
- [ ] Aplicar la reducción de fatiga después de una victoria, con mínimo de cero.
- [ ] Calcular el maná utilizable según maná base y fatiga, con mínimo de cero.
- [ ] Devolver al jugador a la exploración frente al enemigo tras la derrota.
- [ ] Permitir reorganizar la baraja y reintentar ese encuentro.
- [ ] Añadir pruebas de fatiga, límite inferior, maná utilizable y derrota seguida de reintento.
- [ ] Ejecutar pruebas, recorrido manual y build; registrar resultados.

**Verificación:** automatizar los cálculos y probar manualmente derrota, reorganización y reintento.

**Criterios de aceptación**

- [ ] Derrota suma exactamente un punto de fatiga y victoria resta exactamente uno hasta cero.
- [ ] La fatiga limita el maná utilizable sin cambiar el nivel ni el maná base.
- [ ] Tras una derrota se conservan las heridas y bajas, se restaura la vida del invocador y se puede reintentar el mismo encuentro.
- [ ] No se han añadido mecanismos para eliminar fatiga.

**Limitación de diseño para playtesting:** con nivel 1, el maná máximo base inicial es 1; una derrota deja 1 punto de fatiga y, por tanto, 0 de maná utilizable. Esto puede impedir invocar cartas con coste de maná hasta reducir fatiga (por ejemplo, ganando un duelo) o reiniciar la sesión. Es una consecuencia de las reglas aprobadas: no se cambiará en la implementación. Debe comprobarse y anotarse durante las pruebas.

### Hito 6 — Exploración y progresión mínima

**Objetivo:** conectar varios encuentros, la gestión de baraja y la obtención de cartas en un ciclo jugable.

**Dependencias:** Hitos 2, 4 y 5.

**Alcance:** mazmorra de representación sencilla con acceso a varios encuentros, al menos una condición de desbloqueo de carta, edición de baraja entre combates y continuidad después de victorias y derrotas. El prototipo final debe aprovechar el stack 3D web existente (Three.js y React Three Fiber). La exploración puede ser una escena espacial pequeña con interacciones directas; no requiere navegación o mazmorras complejas.

**Tareas**

- [ ] Conectar los encuentros a una representación sencilla de mazmorra.
- [ ] Implementar las condiciones de acceso a los encuentros definidos para el prototipo.
- [ ] Integrar al menos un desbloqueo y la gestión de baraja fuera de combate.
- [ ] Presentar funcionalmente la mazmorra y/o el duelo mediante una escena 3D con Three.js y React Three Fiber.
- [ ] Mantener las reglas de juego separadas de la capa visual para que el flujo pueda verificarse.
- [ ] Recorrer manualmente el ciclo completo, incluyendo pérdida y reintento.
- [ ] Ejecutar pruebas, build y registrar resultados.

**Verificación:** recorrido completo de exploración, desbloqueo, edición de baraja, varios duelos, persistencia de heridas/bajas/fatiga y reintento tras derrota; build.

**Criterios de aceptación**

- [ ] Se puede acceder a varios enfrentamientos desde la mazmorra.
- [ ] Se puede obtener al menos una nueva carta durante la progresión.
- [ ] Se puede gestionar la baraja entre duelos.
- [ ] El estado y las consecuencias conectan los encuentros durante la sesión.
- [ ] El prototipo final utiliza el stack 3D web para representar funcionalmente la mazmorra y/o los duelos.
- [ ] El ciclo se puede continuar después de ganar o perder.

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
| Hito 2 — pendiente | — | — | — |
| Hito 3 — pendiente | — | — | — |
| Hito 4 — pendiente | — | — | — |
| Hito 5 — pendiente | — | — | — |
| Hito 6 — pendiente | — | — | — |
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
| — | — | — | — | — |
