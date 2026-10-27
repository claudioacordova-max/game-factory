# RPG de cartas — guía humana H6

**Estado: H6 e iteración cerrados por aceptación final del diseñador; commit local autorizado mediante el procedimiento seguro del coordinador.** El diseñador confirma una expedición completa B1→B2→B3, pruebas del ala de ratas y reinvocación, y controles/interacciones satisfactorios, sin errores encontrados. No ejecutó exhaustivamente el protocolo experimental siguiente ni registró tiempos o puntuaciones. Su criterio final de cierre acepta la cobertura automatizada real de los extremos y conserva las comparaciones de épicas/balance como antecedentes experimentales, sin exigir esas mediciones manuales para cerrar. Esta aceptación corresponde a la nueva versión integrada, no a la transformación visual anterior.

La guía y sus tablas se conservan como referencia histórica del protocolo propuesto; no son una lista de pendientes ni nuevos requisitos. La demo local registrada fue `http://127.0.0.1:5174/`; su proceso no se reanuda automáticamente entre sesiones. Los ensayos técnicos están en el [informe de balance](rpg-cartas-iteration-v1-balance.md) y la aceptación vigente en el [registro de iteración](rpg-cartas-iteration-v1.md). Las frases de aquel informe sobre aceptación pendiente describen el momento de su entrega técnica, anterior a la declaración humana de cierre.

## Preparación y registro

Usar el servidor local indicado por el coordinador, sin instalar herramientas. Anotar fecha, revisión/HEAD, navegador, resolución y persona. Probar principalmente 1440×900 y comprobar legibilidad/controles en 1024×768 si están disponibles. Recargar inicia otra partida: no hay guardado durable, selector de fixtures ni restauración de checkpoints. No recargar a mitad de un recorrido que se quiera medir.

Antes de cada combate anotar máximo del invocador, fatiga, orden de baraja, copias/heridas, bonos épicos y santuarios/cofres ya usados. Después anotar victoria/derrota, turnos **propios** (la pantalla alterna turnos propios/enemigos), bajas/sacrificios, heridas, máximo/fatiga y premios. Medir minutos de preparación, navegación, combate y farm por separado. Puntuar claridad, frustración y deseo de continuar de 1 a 5, con una frase de motivo; no deducir diversión de ganar.

| Registro por encuentro | Dato por completar |
|---|---|
| Recorrido, sala, encuentro, intento | |
| Máximo / fatiga antes → después | |
| Baraja en orden y copias reservadas | |
| Heridas antes → después | |
| Bajas y sacrificios; reinvocaciones y coste | |
| Bonos P16 / P17 / P18 antes → después | |
| Resultado, vida final de combate, turnos propios | |
| Cofre / santuario y efecto observado | |
| Minutos preparar / navegar / combatir / farmear | |
| Claridad / frustración / deseo de continuar (1–5) | |
| Error o decisión confusa; pasos para reproducir | |

Los IDs facilitan comparar con el informe; la interfaz identifica las cartas por nombre:

| IDs relevantes | Nombre / función |
|---|---|
| P01 / P02 / P03 / P04 | Rata amaestrada / Chispa errante / Esqueleto remendado / Lodo guardián; semillas gratuitas |
| P05 / P11 / P13 | Exploradora de cripta / Espadachina espectral / Quimera menor |
| P16 | Basilisco ancestral: 5/6 base, +1 ATQ por victoria elegible, tope +3 |
| P17 | Coloso de hueso: 4/8 base, +1 vida máxima y actual por victoria elegible, tope +3 |
| P18 | Espectro hambriento: 3/5 base, +1 ATQ por victoria elegible, tope +3 |

Controles implementados para comprobar, no observaciones humanas ya aprobadas:

1. Dar foco a la sala y caminar con WASD/flechas. La cámara debe permitir entender la dirección, ver avatar/obstáculos y acercarse a los objetos. Confirmar colisiones y puertas bloqueadas sin quedar atrapado. Con Tab se deja el foco de la sala para navegar controles HTML; no significa salir físicamente del ala.
2. Acercarse a un enemigo, cofre, santuario o puerta y pulsar **E**; también existe botón HTML **Interactuar · …** al estar cerca. Un clic lejano o rozar al enemigo no debe iniciar combate. Observar señalización de disponible/bloqueado/completado.
3. Abrir **Colección** o **Preparar colección**; añadir/retirar de baraja y ordenar con ↑/↓. Retirar no pierde la copia; los premios nuevos están en reserva. Comprobar nombre, rareza, salud actual/máxima, crecimiento y coste de recuperación.
4. En combate, seleccionar carta y **Invocar criatura**. Si pide sacrificio, elegir exactamente las criaturas propias indicadas; distinguir ese coste y maná del coste de máximo para reinvocar fuera de combate. P16/P17 exigen maná **y** sacrificio.
5. **Declarar atacantes**, seleccionar criaturas; en R1–R3 elegir además el objetivo de cada una. Sin objetivos completos no debe poder declararse ese ataque. Varias pueden elegir el mismo enemigo; su represalia se reparte una vez en orden numerado de mesa. En duelos la defensa enemiga es automática.
6. **Terminar turno**, elegir bloqueadores propios en el orden deseado y **Confirmar bloqueos y resolver**. Una criatura no puede bloquear dos atacantes; un atacante admite varias. Se puede dejar daño al héroe si se considera útil. No hay daño sobrante al invocador cuando el ataque fue bloqueado.
7. Tras el resultado, **Continuar explorando** y comprobar posición segura y estado persistente. Abrir menús, cambiar foco o volver del combate no debe mantener movimiento ni reiniciar encuentros. Probar soltar una tecla después de salir del foco y volver a la sala; no debe seguir caminando sola.

## Recorrido 1 — B1 → B2 → B3 con preparación razonable

Empezar una sesión nueva. Comprobar ocho copias sanas, máximo 20/fatiga 0 y orden inicial Rata, Chispa, Espadachina, Esqueleto, Lodo, Exploradora, Bribón, Guardia. No es necesario imitar la política automatizada: registrar las decisiones propias.

1. Explorar sector 1, localizar cofre, santuario, B1, puerta y entrada voluntaria al ala. Reclamar cofre P09; comprobar que la copia está en reserva y decidir añadirla/ordenarla. Probar santuario sin heridas: no debe consumir su uso.
2. Vencer B1 **Centinela del umbral** (17 vida); comprobar P13/P16 en reserva, máximo +4 con techo 20 y reducción de fatiga si la había. La puerta del sector 2 se abre y queda abierta al retroceder. Si se pierde, registrar consecuencias y recuperación/reintento sin borrar la sesión.
3. Preparar B2: conservar heridas en copias existentes; reinvocar alguna perdida si lo requiere la estrategia y registrar coste/resultado. Semillas 0; común estándar 1; rara 2; épica 3 de máximo, siempre dejando al menos 1. La reinvocada tiene vida base plena y bonos cero. No debe permitirse reinvocar una copia viva que se dejó en reserva.
4. Entrar sector 2, reclamar cofre P10 y decidir si usar su santuario para heridas de baraja/reserva. Vencer B2 **Custodia de catacumbas** (22 vida); comprobar P15/P17, máximo +4 con techo y puerta al sector 3.
5. Reclamar cofre del sector 3 P14/P18, preparar orden y santuario de esa sala. B3 **Guardián de la cripta** tiene 30 vida y un Esqueleto novato ya en campo; no debe aparecer una apertura vacía equivalente a B1/B2. Intentar completar la demo y revisar estado final: máximo 20 al ganar, heridas/bajas/bonos conservados, sin cuarto jefe. Retroceder debe seguir funcionando.

El ala es opcional. Si se entra, registrar en qué momento y por qué; para una referencia sin farm intentar primero sin ella, pero no forzar una derrota para mantener el protocolo. Si se usa, completar R1–R4 abre cofre P08/P12 una sola vez. La colección completa de 18 tipos requiere ese cofre, los tres cofres de sector y las victorias B1/B2; tener tipos descubiertos no exige conservar todas sus copias.

Al terminar, valorar si el orden fijo es comprensible, si las cartas obtenidas llegan a jugarse, si el coste de perder calidad cambia decisiones y si el paso de B2 a B3 parece razonable. Una victoria con muchas pérdidas también merece registrar frustración.

## Recorrido 2 — recuperación severa y fatiga

Objetivo humano: recuperar una sesión con **máximo 1, fatiga ≥1**, usando solo semillas, hasta máximo 20 y posterior eliminación de fatiga por R4. No existe una opción de UI para cargar ese estado. El fixture automatizado además empieza con exactamente cuatro tipos descubiertos y cero copias; esa parte no es reproducible desde la partida inicial de ocho porque los descubrimientos nunca se borran. El recorrido humano mantiene las otras copias en reserva y registra esta diferencia.

Puede utilizarse una sesión deteriorada naturalmente. Para montar el caso de forma deliberada con controles reales, mantener B1 sin completar y dejar solo **Exploradora de cripta (P05)** en baraja. Invocarla, dejar que bloquee Murmurante (3 ATQ/2 vida), donde ambos mueren, y pasar/confirmar sin bloqueos hasta la derrota del héroe. Reinvocar P05 pagando 1 de máximo y repetir. Tras 19 reinvocaciones el máximo pasa 20→1; perder esa última P05 deja máximo 1 y ya no permite pagar otra. Las demás copias quedan protegidas en reserva. Se puede usar P05 con fatiga porque cuesta cero maná. Esta preparación necesita muchas derrotas deliberadas: medir su tiempo aparte, no confundirlo con el tiempo de rescate ni considerarlo una recomendación de juego normal. Si no se monta el caso, dejar la precondición humana pendiente en el registro.

1. Seleccionar únicamente P01,P02,P03,P04 en ese orden; si alguna semilla está perdida, **Reinvocar gratis** y añadirla. Anotar fatiga exacta (el montaje deliberado suele producir bastante más que 4); maná utilizable debe ser 0, semillas siguen jugables. No usar copias de calidad de la reserva durante este ensayo.
2. Entrar físicamente al ala desde sector 1. En R1 invocar Rata/Chispa/Esqueleto; atacar E01 con Rata. Debe ganar, dejar Rata a 1, máximo 1→2 y fatiga sin cambio. Volver al mundo y abrir/cerrar Colección: la visita y la herida deben seguir.
3. Para comprobar repetición, salir realmente al sector 1 y reentrar. R1 reaparece; heridas, copias, máximo y fatiga no se reinician. Chispa puede intercambiarse con E01, morir y otorgar victoria; recrearla gratis fuera de combate. No hace falta farmear hasta 20 antes de avanzar. Si se opta por hacerlo, registrar número de R1/minutos y si se vuelve tedioso.
4. Avanzar por encuentros y puertas de la **misma visita**. En R2, con orden y copias adecuados, dirigir Rata+Chispa a Rata grande y Esqueleto a la Rata pequeña. En R3 dirigir Rata a pequeña, Chispa a torpe y Esqueleto a mordedora. Recrear las semillas perdidas antes de cada encuentro; una superviviente herida no se puede reemplazar para curarla. Verificar máximos incrementales y fatiga sin reducción en R1–R3.
5. Llegar a R4 **Señora de las ratas** (12 vida). Atacar con semillas ofensivas; una secuencia técnica válida desde la ruta directa usa Esqueleto para bloquear la Rata y Chispa para bloquear Alfa de la madriguera, luego repite ataques con supervivientes. Comprobar si resulta entendible y ejecutable manualmente con las heridas reales de esta sesión; registrar cualquier diferencia respecto a la secuencia, no resetearla para fingir equivalencia.
6. Victoria R4: máximo se restaura a 20 y fatiga baja exactamente 1; no necesariamente a 0. Cofre del ala queda habilitado y entrega P08/P12 en reserva tras interacción explícita. Salir/reentrar y completar otra visita si aún hay fatiga: cada R4 reduce una, el cofre no se repite y no repone copias perdidas. Para fatiga alta, medir cada visita y registrar si el jugador desea continuar; si se interrumpe, anotar el estado y dejar la eliminación completa de fatiga pendiente.

Si se pierde dentro del ala, comprobar que se conserva la sala, los encuentros anteriores de la visita y las consecuencias. Reintentar no reinicia la visita; salir/reentrar sí reinicia sus encuentros. Evaluar si se entiende que R1 ayuda al máximo y R4 a la fatiga, y si la vuelta al sector 1 es fácil con movimiento/cámara.

## Recorrido 3 — épicas con 0 / 1 / 2 / 3 victorias elegibles

Empezar una nueva sesión y obtener P16 ganando B1; obtener P17 ganando B2 y P18 reclamando cofre de sector 3. Preparar con fatiga 0 para disponer del maná de esas épicas. Si hay fatiga, recuperarla por R4 usando semillas antes de intentar entrenar; registrar ese trabajo adicional.

1. Tras B1, registrar P16 base 5 ATQ/6 vida, bono 0. Preparar una baraja breve `Lodo, Basilisco, Rata, Esqueleto, Chispa`; las otras copias quedan en reserva. Entrar R1, invocar Lodo/Rata y Basilisco sacrificando Lodo. Ganar manteniendo al Basilisco invocado y vivo. Puede ganar atacando otra criatura: no se exige daño de la épica. Comprobar +1 al cerrar, no durante una baja individual.
2. Salir/reentrar y repetir hasta observar +2 y +3 **en la misma copia**. Recrear Lodo/semillas perdidas gratis, sin reemplazar supervivientes heridas. Registrar tiempo por victoria, heridas acumuladas y claridad del cap. Si muere la épica, no anotar una mejora inexistente: reinvocarla cuesta 3 y vuelve a bono 0. El máximo debe quedar al menos en 1.
3. Tras B2 y el cofre del sector 3, registrar P17/P18 base y las mejoras reales que ya tenga P16. Baraja conjunta de referencia: `Lodo, Basilisco, Coloso, Espectro, Rata, Esqueleto, Chispa`. Esperar a robar/invocar las tres épicas antes de eliminar la rata; no bloquearla con una criatura que la mate durante esa espera si el héroe puede absorber el daño. Se necesitan semillas para los sacrificios y varios turnos de maná.
4. Ganar tres R1 con las épicas invocadas y supervivientes, saliendo/reentrando entre cada uno. Registrar por copia 0→1→2→3 cuando proceda. P17 debe sumar máxima y actual después de la victoria, por ejemplo 8→9 si no recibió daño; si estaba herida se suma 1 a su salud restante. Mano, pila, reserva, muertas o sacrificadas no ganan bono. Una victoria con tres épicas elegibles puede mejorar a las tres a la vez.
5. Usar un santuario aún disponible con heridas, incluidas épicas en reserva: debe sanar al máximo individual vigente (P17 +3: 11) sin tocar máximo del héroe/fatiga y consumir un único uso. No asumir que sigue disponible si se gastó antes.
6. Preparar B2/B3 colocando deliberadamente las épicas donde vayan a robarse; registrar si llegan a invocarse, qué se sacrifica y si sobreviven. Comparar utilidad percibida con el coste de preparación y el riesgo de perder bonos. Llegar a +3 no garantiza ganar ni conservar esa copia.

La observación secuencial permite comprobar 0/1/2/3 sin deshacer estado. Para comparar un jefe con cero entrenamiento voluntario frente a tres victorias, usar **sesiones nuevas independientes**, repetir la obtención legal y mantener el mismo orden/política de referencia. No hay guardado ni forma de volver una copia +3 a +0 sin perderla y pagar reinvocación; eso sería otro tratamiento. La variante sin entrenamiento puede obtener bonos por supervivencia en jefes, y deben anotarse. El informe automatizado ofrece una comparación de checkpoint para orientar preguntas, no resultados humanos que puedan copiarse a esta tabla.

| Preparación observada | P16 / P17 / P18 antes del jefe | Minutos farm | Turnos propios del jefe | Bajas/resultado | ¿Compensó? |
|---|---|---|---|---|---|
| 0 victorias voluntarias | | | | | |
| 1 victoria elegible | | | | | |
| 2 victorias elegibles | | | | | |
| 3 victorias elegibles | | | | | |

## Plantilla del protocolo original — referencia histórica

Las casillas se conservan sin rellenar: no representan una ejecución exhaustiva de ese protocolo ni condiciones actuales de cierre. El registro de aceptación que sigue distingue lo declarado por el diseñador, la automatización y lo no realizado manualmente que dispensó expresamente.

- [ ] Recorrido 1 completado o hallazgos de bloqueo documentados.
- [ ] Recorrido 2 severo ejecutado, precondición real registrada y rescate/fatiga valorados.
- [ ] Recorrido 3 crecimiento 0/1/2/3 observado y utilidad/preparación de jefes valoradas.
- [ ] Navegación, cámara, foco/teclas, retorno seguro, selección de objetivos y multibloqueo evaluados.
- [ ] Cofres, santuarios, bajas, reinvocación/costes y máximo/fatiga comprensibles.
- [ ] Hallazgos clasificados por el coordinador y decisiones de balance resueltas con el diseñador.
- [ ] Aceptación final explícita del diseñador para esta versión integrada.

## Aceptación humana y criterio final de cierre

Registro: declaración explícita del diseñador en el mensaje de cierre de esta iteración.

| Evidencia | Alcance acreditado y decisión |
|---|---|
| Realizado humanamente | Expedición completa B1→B2→B3; ala de ratas y reinvocación; controles e interacciones, colección, preparación, costes, combate, objetivos, bloqueos, retorno y persistencia satisfactorios. El diseñador no encontró errores. No se atribuye a esa declaración una ejecución de cada paso o caso numérico de la plantilla. |
| Automatización real | Motor y mundo de producción: matriz de 27 expediciones acumuladas, cuatro rescates críticos desde máximo 1/fatiga 1 o 4 hasta 20/0 y comparación legal 0/1/2/3 de entrenamiento; 102/102 más comprobaciones espaciales, build y revisión independiente registrados por el coordinador. El diseñador acepta esa cobertura para los casos extremos. |
| No acreditado manualmente; dispensado para cierre | No se acredita ejecución manual exhaustiva ni montaje extremo exacto o comparación controlada de épicas; no se aportaron tiempos/puntuaciones. Las tablas permanecen sin datos humanos; no se inventan resultados ni se arrastran estos ensayos como pendientes o requisitos nuevos. |
| Balance experimental | Se conserva el resultado real 26/27. `progress/offense/quality` pierde legítimamente B3: ocho bajas en ese encuentro, vida de combate −3 por exceso de daño, máximo final 17/fatiga 1 y vida de sesión restaurada a 17. No se cuenta como éxito ni demuestra por sí misma un defecto técnico. El diseñador acepta los antecedentes experimentales sin rebalanceo. |
| Decisión final | H6 e iteración cerrados por aceptación final del diseñador; commit local autorizado. No quedan condiciones humanas de cierre ni cambios de gameplay solicitados. El coordinador verifica sus comprobaciones y el resultado del commit seguro, identificado en el registro de iteración, antes de informar el hash al diseñador. Sin push. |

Esta aceptación sustituye la exigencia inicial de completar manualmente los tres recorridos exhaustivos. No convierte la automatización en observación humana ni autoriza ajustes adicionales de reglas, estadísticas o herramientas.
