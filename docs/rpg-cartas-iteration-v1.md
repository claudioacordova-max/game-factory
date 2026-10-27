# RPG de cartas — Iteración de expedición y recuperación v1

**Fecha de autorización:** 2026-10-26. **Proyecto:** `projects/juego-cartas/`.
**Estado:** H6 e iteración cerrados por aceptación final del diseñador. H0–H5 implementados, integrados y revisados técnicamente; H6 aprobado por revisión independiente, sin hallazgos pendientes. 102/102 más comprobaciones espaciales y build correctos registrados por el coordinador. Validación humana de la versión integrada confirmada, con criterio final de cierre actualizado abajo; commit local autorizado mediante las comprobaciones y ejecución segura del coordinador, con referencia al final del registro. Sin push.
**Registro principal:** [plan de implementación existente](rpg-cartas-implementation-plan-v0.1.md#iteraciones-posteriores-al-cierre). Este anexo amplía su nueva iteración; no establece un sistema de seguimiento paralelo.

## Autorización y brief

El diseñador aprobó expresamente el plan H0–H6 y su implementación, incorporando las decisiones D01–D12 descritas abajo. También autorizó actualizar el plan antes de implementar los subsistemas afectados, sin una nueva ronda de planificación o aprobación rutinaria entre hitos. Las decisiones convencionales de implementación quedan delegadas dentro del alcance. La autorización inicial situó la aceptación de la versión integrada y el playtesting humano en H6, sin darlos por realizados entonces. La declaración posterior de cierre los acepta con el criterio final registrado abajo y autoriza el commit local mediante el procedimiento seguro existente. Nunca hacer push.

- **Comportamiento actual:** tres portales lineales, duelo contra invocador, catálogo anterior, heridas y pérdidas persistentes; sin reinvocación, crecimiento, servicios ni avatar controlable.
- **Comportamiento deseado:** expedición 3D con preparación, dos modalidades de combate, colección recuperable de una copia por tipo, vida máxima persistente, fatiga, épicas entrenables, cofres, santuarios y ala voluntaria repetible.
- **Tipo:** funcionalidad grande con adaptación funcional de la presentación aprobada.
- **Alcance:** motor, sesión, colección, UI, escena y contenido del RPG; pruebas, revisión independiente, medición de expedición y guía humana. No modifica Game Factory, skills, perfiles, permisos ni otros juegos.
- **Restricciones:** conservar reglas compatibles, estética aprobada y stack. Sin dependencias nuevas, guardado durable, monedas, niveles ganados, hechizos, habilidades adicionales, multijugador, generación procedural ni arte final.
- **Aceptación:** invariantes E/C/M y contratos de este documento, checks técnicos, revisión independiente y playtesting integrado aceptado. Una victoria automatizada no demuestra balance satisfactorio.
- **Decisiones creativas:** las decisiones D01–D12 de esta autorización quedan resueltas. Cualquier nueva decisión significativa se consulta únicamente para la rama afectada.
- **Planificación adicional:** no se requiere nueva aprobación del plan para ejecutar lo autorizado.

## Baseline Git y preservación

Comprobado al iniciar H0: `HEAD = 2d477ff9ef793a8754f24826f763ade53b10b29f`, mensaje `juego-cartas: close visual redesign and reusable demo workflow`. Índice vacío, sin cambios rastreados staged o unstaged. Estado no rastreado preexistente completo:

```text
?? docs/rpg-cartas-estado-actual-traspaso-2026-10-26.md
?? experiments/multiagent-ts-pilot/.gitignore
?? experiments/multiagent-ts-pilot/src/clamp.ts
?? experiments/multiagent-ts-pilot/test/clamp.test.cjs
?? experiments/multiagent-ts-pilot/tsconfig.json
```

Estos cinco archivos son ajenos a los cambios de la iteración: preservar sus bytes y excluirlos de staging/commit. El informe sirve como antecedente de lectura, no como una modificación autorizada. Antes de cada hito registrar nuevamente Git y los cambios acumulados del lote. Al no haber commits parciales de cierre, distinguir el baseline original del diff específico de cada hito mediante el registro de rutas y revisiones; no atribuir cambios de otro hito a su implementer.

## Fuentes, autoridad y clasificación

En H0 las cinco fuentes originales se archivaron sin modificación en [design/rpg-cartas/iteration-v1/](design/rpg-cartas/iteration-v1/). La tabla conserva los hashes originales como procedencia histórica. Antes del commit se normalizó únicamente el formato Markdown de la copia de la especificación integral, según el registro administrativo de cierre inferior; los CSV/XLSX siguen idénticos a sus originales:

| Fuente | Uso | SHA-256 del original archivado |
|---|---|---|
| [Especificación integral v1](design/rpg-cartas/iteration-v1/RPG_Cartas_Especificacion_Integral_Iteracion_v1.md) | Alcance y propuestas de planificación, con las sustituciones aprobadas abajo. | `BB0783E34BA053B41B6F915F0F41DE7E1563BD0EE57C2785EFC12F5564709C7B` |
| [18 cartas del jugador](design/rpg-cartas/iteration-v1/rpg_cartas_jugador_v01.csv) | Nombres, estadísticas, costes, rarezas, subtipos, atributo/tope de crecimiento y obtención. | `E3BF8BC08C365912F0696E9C9BB598311C06176DA9285B8F50A00AAD6B192F0B` |
| [14 tipos enemigos](design/rpg-cartas/iteration-v1/rpg_cartas_enemigos_v01.csv) | Contenido enemigo literal. | `D5209A5DCEC1C781DF835E2E9D001F15E7FE61EC17600E15479E0339729E38F2` |
| [Siete encuentros](design/rpg-cartas/iteration-v1/rpg_encuentros_v01.csv) | Campo inicial, mazos en orden, vidas y premios. | `95FC86833CD3532AE9136CA24675B7B67A72E016983467B24054373720CB0EC7` |
| [Modelo de balance](design/rpg-cartas/iteration-v1/rpg_cartas_balance_v01.xlsx) | Hipótesis analíticas y resultados heurísticos históricos; no motor real ni balance validado. | `9A1BCF5A2E0799532AB0B66D58BE8480FECE9F1ACE182FEAC066068E50F5FE45` |

La autorización explícita del diseñador en esta iteración prevalece sobre cualquier regla contradictoria de las fuentes archivadas, de la especificación v0.2 y del plan anterior. Las partes compatibles se conservan. El texto y las reglas de las fuentes se mantienen para trazar lo sustituido, con la única normalización administrativa de formato Markdown registrada abajo, incluso cuando dicen «no implementar todavía», progresión por eliminaciones o decisiones pendientes: esas afirmaciones describen el borrador previo y no anulan la autorización posterior.

- **F:** reglas expresamente aprobadas para esta iteración, incluida la unicidad absoluta por tipo en la colección propia, semillas gratuitas, reinvocación básica fuera de combate, suelo de máximo 1, recuperación voluntaria, consecuencias persistentes y elegibilidad/progreso épico por victoria según D01. No se reabre la sustitución de eliminaciones por victorias.
- **B:** baseline experimental autorizado para implementar y probar: estadísticas, costes, 18/14/7, premios numéricos, atributo de crecimiento de cada épica, cap +3 y colores de rareza. No implica balance definitivo.
- **P:** las recomendaciones históricas no ratificadas no se convierten en mecánicas. Las propuestas sustituidas se conservan solo como historia.
- **D:** D01–D12 quedan resueltas conforme al registro siguiente. Las decisiones técnicas/convencionales dentro del alcance son delegadas; una cuestión creativa nueva debe registrarse sin inventar una regla.
- **X:** funcionalidades excluidas del brief y modificaciones de arquitectura o procedimiento de Factory.

## Decisiones definitivas y reglas sustituidas

| ID | Regla autorizada vigente | Sustitución y alcance |
|---|---|---|
| D01 | Una victoria de encuentro completo concede como máximo +1 a cada copia épica propia efectivamente invocada al campo y superviviente. No exige atacar, bloquear ni causar daño. Se aplica en escaramuzas y duelos, incluidos repetibles. | Sustituye por completo el crecimiento por eliminación individual, último golpe, daño aportado y atribución en multibloqueos. No implementar esa atribución. Mano, pila y reserva exclusivas no progresan. Muertas y sacrificadas tampoco. Liquidar una sola vez por victoria y copia elegible. |
| D02 | P17 aumenta vida máxima individual y vida actual en +1 tras resolver el combate, solo si sobrevivió y cumple D01. | No modifica daño retroactivo ni revive. Máximo de mejoras +3. |
| D03 | R1–R3 son grupos sin invocador: todas las enemigas empiezan desplegadas y el jugador selecciona directamente qué criatura atacar con sus criaturas. Reutilizar daño simultáneo y las reglas compatibles. En turno enemigo las supervivientes atacan al invocador propio, que puede bloquear. | Sustituye la propuesta de ataques propios sin objetivo contra un invocador inexistente. Sin barra/valor de vida rival, mano, mazo ni invocación enemigos. Victoria con enemigos eliminados e invocador propio vivo; vida propia cero implica derrota. Si mueren las últimas criaturas de ambos bandos y el invocador sobrevive, victoria con la pérdida propia persistente. Selección y resolución convencionales simples delegadas, sin segundo motor completo. |
| D04 | Cap experimental de +3 por copia, una mejora por victoria elegible. | Farmear encuentros repetibles está permitido; evaluar ritmo en H6 sin rebalanceo anticipado. |
| D05 | Tres santuarios, uno por sector, un uso cada uno durante la sesión. Sana todas las copias poseídas heridas, en baraja o reserva, al máximo individual vigente. | No revive ni modifica máximo del invocador. Si ninguna copia necesita sanación, no consume uso. |
| D06/D11 | Implementar completos los catálogos y encuentros del baseline. Inicio: ocho copias sanas seleccionadas en orden `P01, P02, P11, P03, P04, P05, P06, P07`. | Sustituye catálogo y encuentros antiguos; nunca se añaden a los anteriores. Una sola copia por tipo en toda la colección, también mediante premios, reinvocación y representaciones temporales. |
| D07 | Derrota en el ala deja al jugador en la zona de ese encuentro, con consecuencias y posibilidad de reintento o salida. Los encuentros anteriores de la visita permanecen completados. | Solo salir realmente al sector 1 y volver a entrar reinicia R1–R4. Menús y vuelta del duelo no reinician. No reinicia colección, heridas, mejoras, fatiga, máximo, cofres o santuarios. |
| D08 | Primer descubrimiento entrega una copia básica sana sin incorporarla automáticamente al mazo. | Repetir un desbloqueo/premio no duplica ni repone una copia perdida. La reposición posterior usa reinvocación y su coste. |
| D09 | Tras victoria o derrota, restaurar vida actual al máximo persistente después de aplicar recompensas. | Sustituye restauración incondicional a 20. Máximo nunca inferior a 1. La vida de combate sí puede llegar a cero por derrota. |
| D10 | Cámara, movimiento, velocidad, orientación, animación, salas, colisiones, interacción, señalización y retorno convencionales delegados. | Mantener dirección estética existente. Sin arte final ni herramienta genérica de mundos. |
| D12 | Victoria R4, B1, B2 y B3 resta exactamente 1 fatiga, mínimo cero; R1–R3 no la reducen. Derrota suma 1. | Sustituye «toda victoria −1». No acumular un descuento genérico con el premio específico. |

R4 sigue siendo un duelo contra invocadora de 12 de vida y mazo E01→E05; B1–B3 son duelos contra invocadores. Conservar cifras y recompensas de R1–R4 inicialmente, sin rebalancear por los ataques dirigidos.

### Contratos conservados y economía

- Catálogo de tipos descubiertos separado de copias poseídas y referencias ordenadas de baraja. Cero o una copia por tipo propio; enemigo no sujeto a esa restricción.
- Reinvocar solo un tipo descubierto sin copia poseída, fuera de combate: coste 0 semillas P01–P04, 1 común estándar, 2 rara, 3 épica; solo si máximo resultante ≥1. Crear otro ID, vida base plena y bonos cero. No cobrar acciones rechazadas ni curar una copia existente mediante reinvocación.
- Al reinvocar, vida actual no puede exceder el nuevo máximo. Cada combate empieza con vida actual igual al máximo persistente vigente. Nivel fijo 1; maná utilizable `max(0, 1 − fatiga)`.
- Conservar ataque inmediato, daño simultáneo compatible, orden de bloqueadores y ausencia de daño sobrante al invocador en duelos; costes de maná y sacrificio combinados; robo fijo y mano inicial 3.
- Conservar heridas de supervivientes, eliminar muertas/sacrificadas y sus referencias de baraja, mantener desbloqueos. Reserva no participante protegida; no curación automática de copias al cerrar.
- R1–R3: máximo +1 hasta 20 por victoria. B1/B2: +4 hasta 20. R4/B3: restauración a 20. Premios y bajas idempotentes por intento liquidado.
- Recompensas únicas: cofre ala P08/P12, cofre sector 1 P09, B1 P13/P16, cofre sector 2 P10, B2 P15/P17 y cofre sector 3 P14/P18. B1/B2 abren sector siguiente; B3 finaliza la demo conservando el estado consultable.
- Cofre del ala habilitado tras la primera victoria R4 y reclamable una vez. Restauración y fatiga de R4 siguen siendo repetibles aunque el cofre esté reclamado.
- El progreso dura durante la página cargada. No incorporar almacenamiento durable ni migración de guardados inexistentes.

## Hitos autorizados y dependencias

Los siguientes hitos pertenecen a esta nueva iteración; no son los Hitos 1–7 originales ya cerrados. El grafo siguiente sustituye únicamente para esta iteración la secuencia estrictamente lineal del plan original. Dependencia técnica satisfecha no equivale a cierre humano.

| Hito | Dependencias | Alcance y aceptación técnica | Verificación prevista | Estado inicial |
|---|---|---|---|---|
| H0 | Autorización actual | Registrar reglas definitivas, fuentes literales, baseline y trazabilidad, sin reescribir historia. | Comparación SHA-256 de cinco fuentes, diff/alcance y revisión independiente documental. | Documentado por implementer; revisión pendiente. |
| H1 | H0 | Catálogo 18/14/7, vida máxima persistente, copias/rareza/bonos base, reinvocación, colección/HUD y liquidación única. Bucle duelo→pérdida→reinvocación→reintento jugable. | E01–E08, E11, E13–E15; C05–C07; M10; regresión motor y build. | Pendiente. |
| H2 | H1 | Escaramuzas dirigidas sin invocador y ala repetible con R4. Rescate real Hmáx=1 y fatiga alta; visita no reinicia por derrota/menús. | E09–E11/E13; C01–C04/C11; M05–M06/M09; tests y build. | Pendiente. |
| H3 | H1 | Épicas progresan por victoria jugada/superviviente, cap +3 y reinvocación base. Puede avanzar independiente de H2; integración de entrenamiento en escaramuzas al disponer de ambos. | E07–E08/E13; C08–C10 actualizados y C11; tests y build. | Pendiente. |
| H4 | Contratos H0; integración H1 | Avatar 3D, movimiento, orientación, cámara, salas, colisiones, interacción cercana, foco y retorno seguro. Rama independiente de crecimiento/ala mientras no los integre. | M01–M04/M09/M12; tests espaciales puros, build e inspección renderizada cuando sea posible. | Pendiente. |
| H5 | H1, H2, H4 | Expedición completa: tres sectores, siete encuentros, cofres, santuarios, puertas, visitas y final; todos los tipos obtenibles por su fuente. | E10/E12–E15, C12, M02–M11; pruebas de integración y objetos, build e inspección de flujos. | Pendiente. |
| H6 | H1–H5 | Regresión, expediciones persistentes sobre motor real, métricas y evaluación del baseline, guía de playtesting, revisión final. Aceptación/cierre solo después de playtesting humano y aceptación final del diseñador. | Matriz acumulada y rescate; tres recorridos humanos; revisión independiente y checks de diff. | Pendiente. |

Comandos técnicos existentes desde `projects/juego-cartas/`: `npm.cmd run test` y `npm.cmd run build`. No se autoriza instalar dependencias o descargar herramientas por convertirlas en un requisito técnico. Si falta una herramienta, registrar limitación y continuar verificaciones independientes.

## Criterios de prueba actualizados

Los IDs E/C/M remiten al §13 del rector archivado. Se conservan E01–E15 y M01–M12 con las precisiones definitivas de D05/D07/D09/D12. Estos escenarios son verificaciones futuras; este registro no afirma resultados.

| ID | Criterio vigente / sustitución |
|---|---|
| C01–C02 | R1–R3 sin invocador, campo inicial completo y selección directa de objetivos. No ataques al vacío. Victoria solo al vaciar enemigos con invocador propio vivo. |
| C03 | Desde Hmáx=1, fatiga≥1, tipos semilla descubiertos y cero copias, recrear y jugar semillas gratis y ganar R1 mediante acciones reales, recibiendo máximo +1. Repetir con heridas/bajas entre encuentros. |
| C04 | Medir ruta legítima de recuperación con semillas, R1–R3 y R4, sin trasladar el resultado heurístico antiguo a la nueva aplicación. |
| C05–C07 | Costes combinados legales, sacrificios con maná 0 cuando corresponda, orden fijo y unicidad en colección y zonas temporales. |
| C08 (sustituido) | P16/P18 +1 ATQ por victoria si invocadas y supervivientes, incluso sin atacar/dañar; una unidad por encuentro, cap +3, persistencia en siguiente duelo. Varias víctimas no dan más. |
| C09 (precisado) | P17 +1 máxima y actual por victoria elegible, después del daño y solo viva; no revive. Santuario usa máximo mejorado. |
| C10 (sustituido) | Elegibilidad e idempotencia por victoria: épica solo en mano/pila/reserva, muerta, sacrificada o en derrota no progresa. Invocarla en último turno y ganar con otra criatura sí progresa. Doble liquidación no suma dos veces. Multibloqueo no participa en el cálculo de progreso. |
| C11 | Últimas criaturas de ambos bandos mueren simultáneamente e invocador propio vive: victoria de escaramuza, baja propia conservada. Invocador a cero: derrota. Liquidación una sola vez. |
| C12 | R4/B1–B3 usan vida, campo inicial y mazos exactos de fuentes, sin alterar IA o cifras para forzar victoria. |

Añadir cobertura explícita de: copia en reserva no reinvocable; premios repetidos antes/después de perder la copia; ataque dirigido a objetivo inválido; selección incompleta/inválida rechazada sin mutación; santuario sin heridas no gastado; curación global con P17 mejorado; vuelta al ala sin reiniciar cofres/santuarios; pérdida de mejoras tras reinvocación; progresión de varias épicas elegibles en una victoria; fatiga reducida exactamente una vez en jefes/minijefe.

## UI y exploración: intervención proporcional

1. **Estructura:** explorar con escena dominante/HUD compacto/acción cercana; colección con estado de tipo y copia, costes separados y orden de baraja; combate con formato visible y objetivos claros; resultado detallado con regreso al mundo.
2. **Propuesta concreta:** preservar piedra azul oscura, bronce, marfil y turquesa del diseño aprobado; rarezas gris/azul/violeta con texto/forma; fuentes e iconos locales. Avatar y habitaciones mediante geometría propia sencilla; cámara isométrica o seguimiento estable; WASD/flechas e interacción cercana con equivalente HTML. Son convenciones delegadas, ajustables dentro del alcance, no nuevas mecánicas.
3. **Implementación:** reutilizar componentes y estilo. No nuevo rediseño integral ni conjunto integral de mockups. Reinvocación muestra coste y máximo resultante antes de su acción explícita; sin confirmaciones innecesarias. Epicas indican crecimiento por victoria, no por bajas. Escaramuza muestra nombre del grupo y objetivos, sin vida rival ficticia.
4. **Evaluación:** tests/build y observación de flujos reales explorar/colección/duelo/escaramuza/resultados, idealmente 1440×900 y 1024×768. Registrar tamaños y estados realmente observados y limitaciones. No inferir renderizado desde código/build. La evaluación humana de controles se concentra en H6.

Abrir menús/duelo pausa movimiento, limpia entradas mantenidas y conserva posición. Entrar al ala es transición espacial explícita desde sector 1; salir es transición inversa. Los encuentros se activan por interacción voluntaria inequívoca, nunca al mero contacto o por un spawn aleatorio. Puertas principales permanecen abiertas tras victoria; se puede retroceder a la recuperación. El regreso tras combate usa un punto seguro sin activar accidentalmente el siguiente.

## Balance y validación humana

Los párrafos de procedimiento experimental que siguen conservan el protocolo inicial; el criterio final autorizado de esta misma sección determina el cierre y dispensa su ejecución manual exhaustiva.

Ejecutar pruebas acumuladas mediante el motor TypeScript real: ocho copias iniciales, cofres obtenidos, heridas, bajas, sacrificios, reinvocaciones pagadas y crecimiento ganado en victorias elegibles. No inyectar ganadores o bonos fijos para afirmar una expedición completada. Las fixtures aisladas siguen siendo válidas para probar reglas concretas, identificadas como tales.

Comparar rutas de progreso, recuperación severa y entrenamiento optimizado con varios órdenes y políticas de ataque/defensa. Registrar antes/después de cada encuentro: máximo, fatiga, copias/heridas/bajas, reinvocaciones y gasto, mejoras por copia, premios, turnos propios y acciones. Medir tiempo de farmeo con humanos; una simulación rápida no demuestra que R1 sea entretenido. Fracción de éxito de políticas deterministas no equivale a probabilidad de victoria humana. No ajustar reglas o cifras significativamente sin aprobación; presentar evidencia y alternativas si el baseline falla.

El protocolo inicial propuso tres recorridos humanos indispensables: (1) B1→B2→B3 con preparación razonable, (2) recuperación severa desde Hmáx mínimo/fatiga alta/semillas hasta R4 y reducción de fatiga, (3) entrenamiento por 0/1/2/3 victorias elegibles y valoración de jefes preparados, además de movimiento, cámara, objetivos, bloqueos, cofres y santuarios. Esa exigencia de ejecución manual exhaustiva fue sustituida expresamente por el criterio final siguiente; la guía queda como referencia, sin falsear casillas ni generar pendientes adicionales.

### Aceptación humana y criterio final autorizado

El diseñador confirma haber jugado la expedición completa B1→B2→B3 y probado el ala de ratas y la reinvocación. Considera satisfactorios los controles e interacciones, colección, preparación, costes, combate, selección de objetivos, bloqueos, retorno y persistencia, y no encontró errores. Esta es su aceptación de la nueva versión integrada; no se reutiliza la aprobación del rediseño anterior.

No se acredita ejecución manual exhaustiva ni montaje extremo exacto o comparación controlada de épicas; no se aportaron tiempos/puntuaciones. No se registran esos extremos como realizados. El diseñador acepta que los extremos quedan cubiertos por la automatización real documentada y dispone que las comparaciones de épicas/balance son antecedentes experimentales, sin ser pendientes de cierre ni requisitos nuevos. Los límites de la evidencia y los formularios vacíos se conservan en la [guía](rpg-cartas-iteration-v1-playtesting.md); el [informe de balance](rpg-cartas-iteration-v1-balance.md) conserva intactos sus datos y el estado histórico de su entrega técnica.

La matriz sigue siendo 26/27 expediciones completas y una derrota real de `progress/offense/quality` en B3. Ese intento pierde ocho copias, termina con vida de combate −3 por exceso de daño y se liquida legalmente con máximo 17/fatiga 1 y vida de sesión restaurada a 17. No se reclasifica como éxito ni constituye por sí mismo evidencia de defecto: es el resultado legítimo de esa política determinista. El baseline y las observaciones de balance quedan aceptados como experimentales, sin rebalancear ni afirmar una tasa de victoria humana.

El diseñador acepta H6 y la iteración completa, declara satisfecho el criterio final de cierre y autoriza el cierre y el commit local. H6 y la iteración quedan cerrados por esa aceptación, sin condiciones humanas ni decisiones de balance pendientes. La verificación documental/técnica y ejecución segura del commit corresponden al coordinador, preservando los cinco preexistentes. El commit se identifica mediante la referencia inferior y su resultado real, sin inventar un hash; sin push.

## Ejecución por lote, bloqueos y continuidad

El coordinador aplicará el workflow existente por cada hito: baseline y alcance, implementer, inspección/checks propios, reviewer independiente posterior sin razonamiento interno del implementer, clasificación de hallazgos y hasta dos ciclos correctivos por defecto reproducible. Registrar cada dictamen y las verificaciones que lo sustentan. No editar Factory ni omitir revisión por reducir interrupciones.

Continuar al siguiente trabajo autorizado y técnicamente desbloqueado sin pedir aprobación rutinaria. Una decisión creativa nueva o evaluación humana anticipada imprescindible bloquea solo la rama afectada y sus dependientes cuando sea seguro continuar otras. Un fallo de unicidad/liquidación bloquea consumidores de ese estado. Una duda de balance no autoriza cambiar cartas para forzar resultados. Consultas y necesidades humanas se consolidan cuando sea posible.

H1–H5 pueden quedar implementados/revisados técnicamente y alimentar integración sin declararlos cerrados humanamente. El playtesting requerido está ubicado en la versión integrada H6; no exige una partida humana por cada parcial. No realizar commits de cierre antes de su cumplimiento y aceptación final. Los perfiles nativos y las políticas actuales bastan; no crear agentes nuevos, servicios persistentes ni orquestador.

Al actualizar el registro de cada hito incluir: estado, alcance/rutas modificadas, baseline Git, checks y resultados reales, dictamen y hallazgos, correcciones (0/1/2), bloqueos, playtesting, próximos pasos y commit si finalmente procede. Un cambio posterior en una ruta ya revisada obliga a repetir verificaciones/revisión afectadas.

Para reanudar otra sesión: leer este anexo y la entrada del plan, autorización vigente y Git; distinguir cambios propios de preexistentes, comprobar que registros y diff coinciden, ejecutar únicamente el siguiente trabajo ya autorizado. No presuponer reanudación automática, persistencia de procesos o partida de navegador. Si el estado difiere, resolver la discrepancia antes de continuar esa rama.

## Registro de ejecución y próxima tarea

| Hito | Implementación | Checks / revisión | Correcciones | Cierre / commit |
|---|---|---|---|---|
| H0 | Registro y archivo de cinco fuentes completos por implementer. | Coordinador inspeccionó diff/alcance; cinco hashes idénticos. Reviewer independiente: aprobado, sin hallazgos; historia y Factory intactas. | 0 | Aceptado en el cierre integrado; commit según referencia inferior. |
| H1 | Implementación recibida: motor/contenido/sesión, App, colección/cartas/iconos/estilos y tests H1. | Coordinador: `npm.cmd run test` 53/53 más comprobaciones espaciales; build correcto 1.184,75 kB / gzip 325,00 kB, aviso conocido >500 kB; diff check correcto. Incluye bucle real de pérdida/bloqueo, derrota B1, reinvocación pagada y reintento. Reviewer: aprobado técnicamente, sin bloqueantes; bajo M10: coste de reinvocación no visible en tipos poseídos, resuelto después en H5. | 0 | Aceptado en el cierre integrado; commit según referencia inferior. |
| H2 | Implementación y corrección recibidas: modo de grupo dirigido, visitas y UI temporal. | Reviewer inicial reprodujo P1 de entrada R1/R4 buscando metadatos en lista MAIN después de setters. Corregido: inicio devuelve encuentro validado y handler prepara metadatos antes de actualizar. Coordinador: 78/78 + spatial y build 1.190,69 kB / gzip 326,86 kB; reviewer de ciclo 1 repitió handler real en memoria para R1/R4/rechazo y aprobó, sin pendientes. Ruta real semillas R1→R4 y rescate máximo 1/fatiga 1 y 4 cubiertos. | 1 | Aceptado en el cierre integrado; commit según referencia inferior. |
| H3 | Implementación recibida: progreso en sesión, estadísticas efectivas/indicador UI y tests h3; sustituido caso temporal H1. | Coordinador 15/15 propios y suite integrada 77/77; reviewer independiente: aprobado técnicamente, sin hallazgos; ejecutó 15/15 y TypeScript noEmit. Build global correcto tras finalizar H2. | 0 | Aceptado en el cierre integrado; commit según referencia inferior. |
| H4 | Implementación y corrección espacial recibidas. | Reviewer inicial: defecto medio de retorno sin validar cuerpos de objetos y bajo de runner no conectado. Ambos corregidos, tests reproducen retorno/reaparición/spawn ocupado. Coordinador: suite 53/53 + spatial y build correctos. Reviewer de ciclo 1: aprobado técnicamente, sin hallazgos pendientes. Render/integración completados después en H5 según el registro inferior. | 1 | Aceptado en el cierre integrado; commit según referencia inferior. |
| H5 | Expedición integrada en App/ExplorationScene: siete salas, mundo/servicios, poses, colección, resultados reales y README. | Coordinador 99/99 + spatial y build correcto. Reviewer independiente de integración: aprobado sin hallazgos; repitió 99/99, TypeScript/diff y handlers reales de App en memoria para entrada R1, invocación, objetivo obligatorio, victoria/heridas/retorno, paso R2 y defensa. Coste visible en poseídas resuelve observación H1. Inspección nativa parcial documentada abajo. | 0 | Versión integrada aceptada por el diseñador; commit según referencia inferior. |
| H6 | Harness tests/expedition.ts, informe de balance y guía humana recibidos; runner oficial conectado. | Coordinador 102/102 + spatial y build correcto 1.206,43 kB / gzip 331,54 kB; aviso conocido >500 kB. Reejecutó matriz 26/27 completas, una derrota y cero inconclusas; cuatro rescates máximo 1/fatiga 1 o 4 terminan 20/0; comparación legal 0/1/2/3 completa con B3 en 9/7/6/6 turnos propios. Reviewer cotejó las 27 filas y seis hashes, repitió rescates/comparaciones y aprobó con P3 de cobertura del entrenamiento. Ciclo 1 fortalece conteos por etapa, identidades, elegibilidad y bonos; coordinador repitió 102/102 + spatial. Reviewer repitió test y mutaciones en memoria sin entrenamiento / solo uno por etapa: ambas ahora rechazadas. Dictamen técnico final aprobado, sin hallazgos pendientes; la aceptación humana posterior del baseline experimental consta arriba. | 1 | H6 cerrado por aceptación final, criterio humano satisfecho y sin protocolo exhaustivo pendiente. Commit autorizado según referencia inferior. |

**Baseline técnico informado por el coordinador:** `npm.cmd run test` 32/32; `npm.cmd run build` correcto, bundle principal 1.174,55 kB y gzip 322,34 kB con aviso conocido >500 kB. Son comprobaciones del estado anterior, no validación del contenido nuevo. El implementer H0 no ejecutó tests/build adicionales por tratarse de archivo documental.

**Reanudación tras límite de uso:** se comprobaron HEAD, índice vacío, diff completo y todos los archivos modificados/no rastreados antes de editar. HEAD sigue `2d477ff…`; los cinco preexistentes conservan SHA-256 registrados por el coordinador. Se recuperaron resultados reales de H2, H5 y reviewer H3; no se asumió que «agente completado» acreditara revisión o integración. Se reejecutaron 77/77 + spatial, 15/15 world y build; después del ciclo H2 se verificaron 78/78 + spatial y build. Ningún commit ni cambio de Factory.

**Inspección visual del coordinador:** Chrome nativo, pestaña independiente de prueba en `http://127.0.0.1:5174/`, capturas de ventana de 1536×912 píxeles (no equivalen a medir el viewport CSS). Se observaron sector 1 con avatar/geometría/cámara, colección de ocho con rarezas/base/costes, desplazamiento mediante pasos de teclado de los controles HTML, aproximación e interacción voluntaria con entrada del ala, sala R1, invocación de P01, selección obligatoria de objetivo, ataque dirigido y victoria real. R1 muestra grupo sin vida de invocador; P01 queda a 1/2, resultado detalla la herida y vuelve a la misma zona con enemigo retirado y puerta abierta. Menú y combate no activaron encuentros remotos. No se certifica con ello una expedición humana, movimiento continuo WASD, todos los flujos de servicios/jefes ni los viewports 1440×900/1024×768: quedan en la guía. La herramienta nativa no soporta teclas mantenidas; se usó la alternativa accesible existente, sin cambiar código por la limitación. CLI offline devuelve `ENOTCACHED`, IAB no disponible; no se instaló nada.

**Inspección adicional:** se abrió otra partida desechable y se caminó hasta B1; la interacción cercana abrió el duelo de Centinela con 17/17, maná rival y mesa inicial vacía, diferenciándolo del grupo R1. No se jugó ese duelo entero en pantalla. Las tres pestañas de prueba creadas por el coordinador se cerraron al terminar; la pestaña preexistente del usuario no fue recargada ni cerrada.

**Entrega y continuidad:** disponibles [balance experimental](rpg-cartas-iteration-v1-balance.md) y [guía consolidada H6 con aceptación final](rpg-cartas-iteration-v1-playtesting.md). La entrega técnica inicial dejó los recorridos y la aceptación pendientes; la declaración posterior del diseñador los resuelve con el criterio final registrado arriba. H6 e iteración cerrados por aceptación final, sin defectos técnicos, implementación o condiciones humanas de cierre pendientes. El coordinador verifica las comprobaciones de cierre y el resultado del commit local seguro autorizado. No se incorpora rebalanceo, nuevos requisitos ni trabajo opcional pendiente.

**Estado registrado en el preflight de cierre:** HEAD completo `2d477ff9ef793a8754f24826f763ade53b10b29f`, índice vacío y modificaciones de la iteración entonces sin commit. Los cinco preexistentes enumerados al inicio permanecen ajenos al cierre y preservados; el coordinador debe excluirlos y verificar sus hashes antes de staging. H6 e iteración cerrados por aceptación final, sin pendientes experimentales. Este cambio final es documental; App/core/escena/harness, informe numérico de balance, Factory, dependencias y experimentos permanecen intactos. La única excepción de formato en fuentes archivadas se detalla a continuación. Sin push. Vite registrado `http://127.0.0.1:5174/`, sesión 12214; no presumir supervivencia de proceso/partida ni reanudación automática. La inspección nativa parcial anterior conserva sus límites y no se convierte en mediciones exhaustivas por la aceptación humana posterior.

**Normalización administrativa antes del commit:** el preflight del coordinador detectó nueve saltos de línea Markdown con dos espacios finales y una línea vacía extra al final de la copia archivada `RPG_Cartas_Especificacion_Integral_Iteracion_v1.md`. Solo en esa copia, los nueve hardbreaks de las líneas 3–6, 317–318 y 644–646 se sustituyeron por la sintaxis equivalente de barra inversa al final de línea y se retiró la línea vacía adicional. Se verificó igualdad exacta con esa transformación aplicada al original, sin ningún otro cambio de texto o reglas. El original de Downloads sigue intocado, SHA-256 `BB0783E34BA053B41B6F915F0F41DE7E1563BD0EE57C2785EFC12F5564709C7B`; SHA-256 de la copia con formato normalizado `2C16698DC97B1F4184EC915FC59DDBDF53581C150B20A01468DBBC2E33154C2A`. Los tres CSV y el XLSX permanecen byte a byte idénticos a sus originales, con los hashes de la tabla de procedencia. No es una modificación de diseño ni se atribuye una nueva aprobación creativa al diseñador. La frase del README sobre tres recorridos manuales obligatorios se actualizó para reflejar la aceptación vigente, sin cambiar controles o reglas.

**Preflight comunicado por el coordinador:** repitió `npm.cmd run test` (102/102 más spatial) y build, con el mismo bundle `CiEp4Yys` y el aviso conocido de tamaño. Los seis hashes del motor siguen iguales al informe; reejecutó `progress/offense/quality`: B1/B2 ganados en 2/3 turnos propios, B3 perdido en 7, vida −3; máximo/fatiga/copias pasan de 17/0/16 a 17/1/8. Confirma una derrota legítima, sin reclasificarla como expedición completa. También verificó fuente/helper instalado coincidentes, SHA-256 `7355133D67C7C11DC4CA11C3DBF0DC16F061A736AF800EFFC347AF5B940B1DD1`, sin hooks activos ni `index.lock`, e índice vacío. Son comprobaciones previas; el coordinador debe revisar el diff documental final y ejecutar el helper seguro con rutas explícitas antes de registrar el commit real.

**Revisión documental independiente final:** aprobada; el único P3 de precisión histórica sobre cobertura manual se corrigió en el ciclo 1, distinguiendo falta de acreditación de ejecución manual de una afirmación de que no ocurrió. El reviewer ejecutó el runner (102/102 más spatial) y verificó fuentes/hashes y exclusiones, sin cambios de gameplay. No se atribuye un nuevo build al reviewer.

**Commit local de cierre:** el que incorpora esta entrada, con mensaje `juego-cartas: close H6 expedition and recovery iteration v1`. Su hash real será consultable con `git log -1 --format=%H -- docs/rpg-cartas-iteration-v1.md`. El coordinador verifica el resultado de la ejecución segura y lo informa al diseñador; esta referencia no anticipa un hash ni afirma que el helper se haya ejecutado antes del preflight. Sin push.
