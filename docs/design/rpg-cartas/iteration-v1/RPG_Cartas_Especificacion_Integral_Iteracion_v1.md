# RPG de cartas — Especificación integral para planificación de la próxima iteración

**Versión:** borrador consolidado v1.0, 26 de octubre de 2026\
**Proyecto:** `projects/juego-cartas/` — «Duelo en la cripta» (nombre actual, no necesariamente definitivo)\
**Destinatario:** Codex / coordinador de Game Factory\
**Propósito inmediato:** producir un **plan de implementación**, no implementar ni modificar código todavía.\
**Base conocida:** informe de estado de Codex, corte Git `2d477ff9ef793a8754f24826f763ade53b10b29f` (26-10-2026). Antes de planificar, verificar que sigue siendo el corte aplicable.

> **Guía de lectura y autoridad:** Este documento distingue decisiones expresas del diseñador, parámetros experimentales de balance, propuestas de diseño recomendadas por el asistente y aspectos que todavía requieren una decisión. Todos forman parte de una propuesta coherente para **planificación**, pero ni un valor tentativo ni una solución sugerida autorizan por sí solos su implementación definitiva. Donde falte definición, Codex debe proponer opciones o señalar un punto de decisión, sin inventar reglas silenciosamente.

## 0. Cómo utilizar este documento

1. Leerlo íntegro junto con el informe de estado previo, los CSV y el modelo de balance adjuntos.
2. Contrastar con especificación, código y pruebas **actuales** antes de estimar cambios. El informe previo describe un corte, no sustituye la lectura del repositorio si cambió.
3. Elaborar un plan por hitos, dependencias, riesgos, cambios de dominio/UI/escena, migraciones de contenido y pruebas de aceptación.
4. Clasificar las decisiones en **F** (fija por el diseñador), **B** (línea base experimental aceptada como razonable, pendiente de playtesting), **P** (propuesta del asistente sin aprobación específica), **D** (decisión pendiente) o **X** (fuera de alcance). Si una cifra está etiquetada B debe usarse como valor inicial para planificar y probar, no como resultado de balance validado.
5. No implementar inmediatamente; entregar primero el plan, las decisiones bloqueantes y las preguntas creativas que de verdad impidan un hito.
6. Respetar el procedimiento de Game Factory para aprobación, delegación, revisión independiente, checks y validación humana. No rediseñar la arquitectura general de la Factory.

### Fuentes adjuntas y precedencia

- **Este documento:** objetivos y alcance de la próxima iteración; predomina sobre contenido antiguo cuando la modificación está acordada.
- **Informe de estado del 26-10-2026:** comportamiento real del prototipo de partida; no asumir que las reglas nuevas ya existen.
- **`rpg_cartas_jugador_v01.csv`:** fuente literal de los 18 candidatos a carta del jugador.
- **`rpg_cartas_enemigos_v01.csv`:** fuente literal de los 14 tipos enemigos candidatos.
- **`rpg_encuentros_v01.csv`:** fuente literal de los siete encuentros, campo inicial, mazos y recompensas.
- **`rpg_cartas_balance_v01.xlsx`:** fórmulas, supuestos, escenarios y pruebas sugeridas; **artefacto de análisis, no prueba de balance real**.

En caso de discrepancia con documentos previos, no borrar la historia: registrar explícitamente qué se reemplaza. Las estadísticas propuestas no son una ampliación aditiva de las cartas anteriores: reemplazan el catálogo para esta prueba.


## 1. Visión jugable que debe preservar la siguiente iteración

**Objetivo de experiencia [F].** El juego combina exploración de mazmorra en 3D, combates por cartas, colección persistente, preparación estratégica, pérdida real de criaturas y posibilidad de reconstrucción. El jugador **no** debería quedarse sin cartas continuamente ni entrar en un estado irreversible; sí debería sentir escasez de **cartas de calidad**, desear proteger criaturas desarrolladas y considerar cómo prepararse antes de un jefe.

**Distinción central [F].** Perder una criatura mejorada tiene consecuencias, pero la pérdida **no** bloquea indefinidamente el tipo de carta descubierto. El jugador puede reinvocar una **copia nueva y básica**, que no conserva heridas ni progresión de la copia desaparecida.

**Ciclo objetivo [F + B]:** recorrer salas con personaje 3D → encontrar enemigos/cofres/servicios → gestionar copias y baraja → combate principal o escaramuza → resolver heridas, muertes, fatiga, progreso y recompensas → preparar siguiente ruta / recuperar criaturas / entrenar épicas → explorar más. El ala de las ratas es opcional, repetible y funciona como mecanismo de recuperación tras derrotas.

**Evitar:** encuentros aleatorios obligatorios tipo «Zubat en cueva», interrupciones continuas del desplazamiento, penalizadores que vuelvan imposible recuperarse, o una baraja que solo se degrade por acumulación de bajas.

**No confundir:** «RPG» no exige por esta iteración historia extensa, economía de monedas, guardado durable, mundo abierto, editor de niveles ni un sistema genérico de habilidades. Se diseñan únicamente las partes descritas.


## 2. Registro de decisiones y nivel de compromiso

| Tema | Estado | Regla / alcance |
|---|---|---|
| Una copia máxima por tipo **en toda la colección del jugador** | **F** | Confirmado de forma expresa; también vale para una copia en reserva, mano o mazo. Nunca crear duplicados por recompensas o reinvocación. |
| Reinvocación solo de tipos ya desbloqueados | **F** | El catálogo conserva el tipo después de perder la copia; la reinvocación crea una sola copia básica. |
| Reinvocación **fuera de combate** | **F** | Se abandona para esta prueba el ritual dentro del duelo. |
| Recuperación base, sin heridas ni progreso anterior | **F** | La criatura nueva inicia con estadísticas y vida de base. |
| Coste en vida máxima, con suelo en 1 | **F** | No se permite pagar si la vida máxima resultante baja de 1. |
| Tres rarezas comunes, raras y épicas; estética gris/azul/violeta | **B** | Primer catálogo experimental. Lo mítico quedó como idea posible, no cuarta rareza de esta iteración. |
| Reinvocación común/rara/épica 1/2/3 puntos | **B** | Excepción para cuatro semillas gratuitas. |
| Criaturas «semilla» que se recuperan y juegan gratis | **F** concepto / **B** cuatro propuestas | Aseguran salida cuando se pierden todas las cartas y el maná está a 0. |
| Combates pequeños voluntarios en un ala repetible | **F** | No son encuentros aleatorios forzosos. |
| Al salir y volver al ala, reaparecen los cuatro encuentros | **F** | El jugador puede retirarse tras cualquiera, incluso el primero. |
| Recompensa de cofres únicos que **no** se repiten | **F** | Repetir la sala no vuelve a otorgar cartas del cofre. |
| Minijefe de ratas: restauración de vida máxima completa y −1 fatiga | **F** | Recompensa **repetible** al derrotarlo otra vez. |
| Escaramuzas +1 vida máxima; otros jefes cantidades diferentes | **F** concepto / **B** cifras | Primer balance: +1 R1-R3, +4 B1-B2, total B3. |
| Cartas épicas mejoran por eliminar enemigos | **F** concepto / **B** detalles | +1 ataque o +1 vida máxima según tipo, con tope experimental +3. |
| Personaje 3D libre, orientado al desplazarse | **F** | Reemplaza el mapa de portales estáticos como única representación de aventura. |
| Acercarse/interactuar con NPC enemigo, abrir duelo, liberar paso al vencer | **F** | Desaparición o desplazamiento del enemigo; variante visual delegable. |
| Salas explorables, cofres sin combate, ala de ratas | **F** | Primer sector incluye acceso a ala opcional. |
| Un punto de sanación de criaturas por sector/nivel | **F** | Cura **todas las copias poseídas** de la colección, equipadas o no; no revive. |
| Un uso del punto de sanación por sector | **P** | Recomendado contra curación infinita; requiere ratificación. |
| 18 criaturas jugador, 14 enemigas, siete encuentros y distribución de premios de las tablas | **B** | Propuesta detallada aceptada como razonable para prueba, no balance final aprobado. |
| Escaramuzas no quitan fatiga; minijefe y jefes principales sí | **B** | Cambio de la regla previa «toda victoria −1»; debe quedar visible en plan y pruebas. |
| Mantener la persistencia solo mientras la página está cargada | **B** | Alcance técnico actual; todavía no se solicitó guardado durable. |
| Fórmula exacta de muerte épica con varios bloqueadores, detalles de aparición y servicios | **D** | Definir antes de implementar esos subcomponentes; Codex puede proponer opciones. |

**Importante:** cuando hablamos de aprobar una dirección no implica autorizar ciegamente una cifra. El usuario confirmó la restricción de **una copia por tipo** como parte fija del juego y aprobó utilizar el conjunto de balance propuesto como base razonable de trabajo.


## 3. Estado inicial del repositorio y cambios con respecto a él

### 3.1. Hechos del prototipo actual (antes de implementar)

- Aplicación TypeScript/React/Vite; Three.js y React Three Fiber solo para diorama de exploración. Motor de duelo separado de UI; `App.tsx` coordina sesión, exploración y combate.
- Exploración vigente: tres portales/nodos lineales, sin avatar controlable ni salas explorables.
- Vistas existentes: **Explorar**, **Colección** y **Duelo**; rediseño de interfaz aceptado y cerrado. Debe **evolucionarse**, no reabrirse como defecto histórico.
- Jugador empieza con **20 de vida**, nivel **1**, **fatiga 0**, **1 maná utilizable** y mano inicial de **3** cartas; sin robo aleatorio ni barajado.
- Mana utilizable = `max(0, nivel − fatiga)`; el nivel no aumenta actualmente. El mana se repone al inicio del turno propio y no se almacena entre turnos.
- Fase de invocación → declaración de atacantes → bloqueos del enemigo → cierre del turno → acciones del enemigo → asignación de bloqueos del jugador → resolución. Se permite atacar con recién invocadas. El daño de criaturas es simultáneo; los atacantes bloqueados no infligen daño sobrante al invocador; bloqueo múltiple permitido.
- Heridas persistentes de copias supervivientes, muertes y sacrificios permanentes; piezas reservadas fuera de la baraja permanecen protegidas en duelo.
- Al acabar un combate se restaura la vida **actual** del invocador al valor normal; todavía **no existe** atributo persistente de vida máxima reducida.
- La derrota incrementa la fatiga (+1), la victoria vigente la reduce (−1). Nuevo diseño diferencia escaramuzas y jefes.
- No existen progresión individual, rarezas funcionales, reinvocación, curación de copias, cofres permanentes recogibles, alas repetibles ni persistencia durable.
- IA actual es simple y determinista, no usa bloqueos múltiples; la mano se roba en orden fijo.
- Había **32 casos de prueba definidos**, y resultados **históricos** 32/32 + build correcto. El informe no ejecutó nuevos tests y la UI/escena no están cubiertas por E2E automatizados integrados.

### 3.2. Qué debe mantenerse, qué sustituirse

**Mantener salvo decisión explícita contraria:** motor modular de combate, diferenciación tipo/copia/baraja, identidad de copia, daño y bloques, persistencia de heridas y muerte, coste de maná y sacrificio, edición de baraja solo fuera de duelo, principio de una copia por tipo, ausencia de reglas implícitas tomadas de otros juegos.

**Sustituir o extender:** catálogo de siete iniciales y Brote de musgo; tipos/enemigos/mazos antiguos; estadísticas y orden de encuentros; mapa 3D de solo portales; progresión lineal sin desplazamiento; modo único de duelo (incorporar escaramuza sin invocador); vida máxima fija; recompensa única inicial; fatalidad de quedarse sin cartas; ausencia de rarezas/progresión/servicios.

**No aplicar automáticamente:** niveles ganados, hechizos, habilidades especiales distintas de mejora épica, guardado entre recargas, segundo personaje, cambios globales de Factory, mazmorras procedurales, nuevos paquetes de terceros o multijugador.


## 4. Colección, reinvocación, rarezas y economía de vida máxima

### 4.1. Modelo conceptual obligatorio [F]

Una carta tiene un **tipo descubierto** y puede tener cero o una **copia poseída**. La baraja contiene referencias a copias poseídas en un orden elegido. Las bajas no borran los tipos descubiertos. La reinvocación consulta los tipos desbloqueados sin copia; si se cumplen condiciones, crea **una copia nueva** y permite añadirla a la baraja. No actúa sobre cartas del oponente.

**Reglas mínimas observables:**

1. Solo se permite recuperar un tipo ya desbloqueado **sin copia viva en la colección**.
2. Recuperar crea una copia con ID de instancia nuevo, ataque y vida máxima de base y **vida actual plena**; sin bonos, progresión ni heridas de la anterior.
3. No revive la antigua copia, no duplica otras, no extrae criaturas del campo y no puede ejecutarse durante un combate.
4. El usuario mantiene la decisión de incorporar la copia a la baraja; una copia desbloqueada no implica inserción automática en mazo (convención actual). Se puede recomendar un botón que permita realizar ambos pasos explícitamente.
5. La recuperación **consume vida máxima persistente del invocador**. Debe ser independiente del coste de maná/sacrificio de jugar una carta en combate.
6. Las semillas P01-P04 son comunes excepcionalmente gratuitas de recuperar **y** de invocar (0 vida máxima, 0 maná, 0 sacrificios).

### 4.2. Fórmulas y ejemplos [F + B]

Definir `H_max_normal = 20` como techo inicial del prototipo, `H_max_actual` como la vida máxima persistente y `c(tipo)` como 0 para semillas; 1 común estándar; 2 rara; 3 épica.

```text
Puede_reinvocar = tipo_desbloqueado
              y NO_existe_copia_de_ese_tipo
              y fuera_de_combate
              y H_max_actual - c(tipo) >= 1

Al_reinvocar: H_max_actual' = H_max_actual - c(tipo)
               crear_copia(tipo, salud=vida_base, mejoras=0)
               vida_actual_invocador <= H_max_actual'

Victoria_R1_R2_R3: H_max_actual' = min(20, H_max_actual + 1)
Victoria_B1_B2:   H_max_actual' = min(20, H_max_actual + 4)  [B]
Victoria_R4_B3:   H_max_actual' = 20
Fatiga_derrota:   f' = f + 1
Fatiga_victoria_R1_R3: f' = f                        [B]
Fatiga_victoria_R4: f' = max(0, f - 1)              [F]
Fatiga_victoria_B1_B3: f' = max(0, f - 1)           [B, preserva jefes]
```

**Ejemplos deterministas:** 20 de vida máxima → reinvocar común, rara y épica → 14 de máximo. Recuperar una común/rara/épica desde 20 cuesta respectivamente 1/2/3 victorias de R1 si no hay nuevas pérdidas. Recuperar 1 común + 2 raras + 1 épica cuesta 8 de vida máxima → baja de 20 a 12 → necesita 8 victorias R1 sin otros gastos, o una victoria R4 para restaurar a 20. Si queda 1 de vida máxima, solo se pueden recrear semillas gratuitas.

### 4.3. Vida actual frente a vida máxima

- El máximo del invocador **persiste entre duelos** y es distinto de las heridas de las criaturas.
- Cada duelo debe comenzar con `vida_actual = H_max_actual`, no con 20 si el máximo está reducido. La recuperación de vida máxima por recompensas ocurre después del combate, por lo que el siguiente enfrentamiento emplea el máximo actualizado.
- Como el prototipo ya restaura por completo la vida **actual** al cerrar un duelo, para esta iteración se propone restaurarla al nuevo máximo permitido tras aplicar su recompensa. Es un detalle operativo [P], no crear un segundo sistema de consumibles de curación del invocador.
- No permitir `H_max_actual < 1`, ni invocación que provoque ese estado. La vida actual sí puede llegar a 0 **dentro del duelo** por derrota; eso no equivale a bajar la vida máxima a 0.
- Las recompensas nunca exceden el techo de 20 y no deben permitir generar vida máxima infinita.
- Actualizar UI, mensajes, pruebas y cualquier condición de comienzo/fin que actualmente asuma siempre 20.

### 4.4. Fatiga y recuperación de emergencia

Mantener la fatiga como penalización de derrota, pero evitar que impida usar las cuatro semillas. El maná sigue siendo `max(0, 1 − fatiga)` mientras el nivel esté fijo en 1. Con fatiga 1 o más, cartas de maná 1 no se pueden jugar, pero semillas y cartas de coste de maná 0 pueden hacerlo.

El minijefe R4 tiene el papel especial de «punto de recuperación»: al vencerlo, restaurar máximo a 20 y reducir fatiga **una** unidad, aunque su cofre único ya esté reclamado. Repetir R1-R3 restaura máximo de forma incremental, pero no elimina fatiga bajo la propuesta actual. La recuperación de fatiga por jefes principales conserva la lógica previa.

**Riesgo deliberado:** a vida máxima 1 y con fatiga alta el jugador debe poder construir un mazo de semillas, derrotar la primera rata y seguir recuperándose. Es una exigencia de diseño a verificar end-to-end, no un resultado ya certificado del motor.


## 5. Cartas del jugador — catálogo íntegro v0.1 [B]

Este catálogo **sustituye**, no complementa, las criaturas existentes. Una copia por tipo; ID `Pxx` como identificador de contenido **propuesto**. El diseñador puede renombrar cartas y ajustar estadísticas tras las pruebas. **Sin hechizos ni efectos especiales** adicionales para esta prueba.

**Estética de rarezas [B]:** comunes neutro/gris, raras azul, épicas violeta. «Semilla» es **subtipo de común**, no una cuarta rareza. Colores deben apoyarse en texto/ícono para accesibilidad.

### 5.1. Comunes (10; cuatro semillas gratuitas)


| ID | Carta | ATQ | VIDA | Maná | Sac. | Reinv. HPmáx | Crecimiento | Obtención | Rol |
|---|---|---|---|---|---|---|---|---|---|
| P01 | Rata amaestrada | 1 | 2 | 0 | 0 | 0 | Ninguno | Inicio | Semilla sacrificable |
| P02 | Chispa errante | 2 | 1 | 0 | 0 | 0 | Ninguno | Inicio | Semilla ofensiva, recuperable sin HP |
| P03 | Esqueleto remendado | 1 | 3 | 0 | 0 | 0 | Ninguno | Inicio | Semilla defensiva |
| P04 | Lodo guardián | 0 | 4 | 0 | 0 | 0 | Ninguno | Inicio | Semilla muro; cero ataque |
| P05 | Exploradora de cripta | 2 | 3 | 0 | 0 | 1 | Ninguno | Inicio | Común equilibrada de mesa |
| P06 | Bribón de ceniza | 3 | 2 | 0 | 0 | 1 | Ninguno | Inicio | Común agresiva frágil |
| P07 | Guardia de cobre | 2 | 5 | 1 | 0 | 1 | Ninguno | Inicio | Común de aguante |
| P08 | Arquera de hollín | 3 | 3 | 1 | 0 | 1 | Ninguno | Cofre ala | Común con ataque estable |
| P09 | Acólita del umbral | 2 | 4 | 0 | 0 | 1 | Ninguno | Cofre 1 | Común de resistencia media |
| P10 | Perro sepulcral | 4 | 2 | 1 | 0 | 1 | Ninguno | Cofre 2 | Común de daño explosivo |



### 5.2. Raras (5)


| ID | Carta | ATQ | VIDA | Maná | Sac. | Reinv. HPmáx | Crecimiento | Obtención | Rol |
|---|---|---|---|---|---|---|---|---|---|
| P11 | Espadachina espectral | 4 | 4 | 1 | 0 | 2 | Ninguno | Inicio | Rara de fuerza directa |
| P12 | Centinela pétreo | 2 | 8 | 1 | 0 | 2 | Ninguno | Cofre ala | Rara tanque de bloqueo |
| P13 | Quimera menor | 5 | 5 | 0 | 1 | 2 | Ninguno | Jefe 1 | Rara con sacrificio: presión |
| P14 | Carroñero de hierro | 6 | 4 | 0 | 1 | 2 | Ninguno | Cofre 3 | Rara con sacrificio: cristal |
| P15 | Custodia rúnica | 4 | 6 | 1 | 0 | 2 | Ninguno | Jefe 2 | Rara sostenida |



### 5.3. Épicas (3)


| ID | Carta | ATQ | VIDA | Maná | Sac. | Reinv. HPmáx | Crecimiento | Obtención | Rol |
|---|---|---|---|---|---|---|---|---|---|
| P16 | Basilisco ancestral | 5 | 6 | 1 | 1 | 3 | ATQ (máx. +3) | Jefe 1 | Épica: crecimiento ofensivo, requiere 2 recursos |
| P17 | Coloso de hueso | 4 | 8 | 1 | 1 | 3 | VID (máx. +3) | Jefe 2 | Épica: crecimiento de salud, requiere 2 recursos |
| P18 | Espectro hambriento | 3 | 5 | 1 | 0 | 3 | ATQ (máx. +3) | Cofre 3 | Épica: crecimiento de daño sin sacrificio |



### 5.4. Colección inicial y desbloqueos

**Se empieza con exactamente ocho tipos/copias sanas en la colección** y, como primera hipótesis [B], todas seleccionadas en la baraja: `P01, P02, P03, P04, P05, P06, P07, P11`. Se respeta **una copia por tipo**. La ordenación inicial de robo puede ajustarse por playtesting; los archivos experimentales emplean `P01, P02, P11, P03, P04, P05, P06, P07` para un escenario de simulación. La colección y la baraja no tienen por qué mostrarse en idéntico orden.

**Desbloqueos propuestos [B]:**

| Fuente | Nuevos tipos/copias |
|---|---|
| Cofre único del ala de ratas (tras R4) | P08 Arquera de hollín; P12 Centinela pétreo |
| Cofre opcional del sector 1 (exploración) | P09 Acólita del umbral |
| Primera victoria principal B1 | P13 Quimera menor; P16 Basilisco ancestral |
| Cofre opcional del sector 2 | P10 Perro sepulcral |
| Segunda victoria principal B2 | P15 Custodia rúnica; P17 Coloso de hueso |
| Cofre opcional del sector 3 | P14 Carroñero de hierro; P18 Espectro hambriento |

**Convención recomendada [P]:** cuando un tipo se descubre por primera vez, el premio incluye una copia base sana, como hacía el prototipo con su único desbloqueo. Si algún tipo ya está descubierto o poseído, nunca otorgar una segunda copia por ese hecho. El acceso posterior a copias perdidas es mediante reinvocación y su coste.

Las cartas gratuitas no deben desplazar a todas las demás: ofrecen **continuidad**, pero estadísticas intencionalmente limitadas. Proteger y entrenar las cartas de calidad debe seguir mereciendo la pena.


## 6. Mejoras persistentes de épicas [F idea / B detalles]

- Las mejoras son **por copia individual**, no por tipo en catálogo. Persiste el bono entre duelos mientras viva la misma copia.
- Basilisco ancestral P16: por cada eliminación atribuida, **+1 ataque**, hasta +3 acumulado (de 5/6 a **8/6**).
- Coloso de hueso P17: por cada eliminación atribuida, **+1 vida máxima**, hasta +3 acumulado (de 4/8 a **4/11**).
- Espectro hambriento P18: por cada eliminación atribuida, **+1 ataque**, hasta +3 acumulado (de 3/5 a **6/5**).
- Una copia reinvocada vuelve al estado base y pierde todos los bonos, aunque su tipo permanezca desbloqueado.
- Las eliminaciones en escaramuzas **pueden** contribuir al entrenamiento [B], porque el diseñador quiere poder farmear el crecimiento antes de un jefe.
- El tope de +3 es una protección **experimental**, no una regla inmutable: evita una progresión sin límite en encuentros repetibles. Evaluar si resulta divertido o demasiado rápido (con tres ratas, una épica podría completar todo el progreso en un solo encuentro).
- Para el prototipo no se requieren rangos, árboles de talentos ni habilidades activas adicionales para épicas.

**Decisiones concretas que Codex debe exponer antes de codificar esta regla [D]:**

1. **Atribución de eliminación:** ¿gana bono la criatura que causa daño letal al atacante o bloqueador? ¿Qué pasa si varios bloqueadores infligen daño simultáneo y suman letal? No asumir una prioridad arbitraria oculta.
2. **Momento del incremento:** resolver daño y muertes, atribuir eliminaciones, actualizar la copia persistente sin duplicar incentivos por una sola víctima.
3. **Incremento de vida máxima:** cuando Coloso gana +1 máximo en combate, ¿su salud actual también aumenta en +1 o conserva la actual? Ambas alternativas son defendibles; mantener consistencia en motor/UI/tests.
4. **Sacrificios y muerte simultánea:** sacrificar una criatura no cuenta como eliminación de enemigo; decidir si una épica que muere en el mismo intercambio que mata a otro enemigo obtiene alguna mejora antes de perderse (no impacta si muere y se elimina, pero sí notificaciones de combate).

La definición de estos casos es importante para evitar resultados contradictorios entre jugabilidad, estadísticas persistentes y pruebas.


## 7. Catálogo enemigo — 14 tipos [B]

Las cartas enemigas pueden reutilizar tipos entre encuentros; la regla rígida de **una copia por tipo** se refiere a la **colección del jugador**, no obliga a impedir que distintos grupos de enemigos usen ratas del mismo tipo.


| ID | Enemigo | ATQ | VIDA | Maná | Sac. | Familia |
|---|---|---|---|---|---|---|
| E01 | Rata | 1 | 1 | 0 | 0 | Ratas |
| E02 | Rata torpe | 1 | 2 | 0 | 0 | Ratas |
| E03 | Rata grande | 2 | 3 | 0 | 0 | Ratas |
| E04 | Rata mordedora | 2 | 1 | 0 | 0 | Ratas |
| E05 | Alfa de la madriguera | 3 | 2 | 0 | 0 | Ratas |
| E06 | Esqueleto novato | 2 | 2 | 0 | 0 | Cripta |
| E07 | Vigía exánime | 2 | 3 | 0 | 0 | Cripta |
| E08 | Murmurante | 3 | 2 | 1 | 0 | Cripta |
| E09 | Acólito de fosa | 2 | 4 | 1 | 0 | Cripta |
| E10 | Guardián sepulcral | 3 | 5 | 0 | 0 | Cripta |
| E11 | Gólem agrietado | 4 | 5 | 1 | 0 | Cripta |
| E12 | Bruja del umbral | 3 | 4 | 0 | 1 | Cripta |
| E13 | Caballero hueco | 4 | 6 | 1 | 0 | Cripta |
| E14 | Verdugo de cripta | 5 | 5 | 0 | 1 | Cripta |



**Alcance enemigo:** las estadísticas y costes de esta tabla son la línea base. No introducir por defecto habilidades como vuelo, veneno, armadura o iniciativa por el nombre/arte. La IA básica actual sigue siendo una referencia provisional, con modificaciones únicamente donde el nuevo formato de encuentros lo exija.


## 8. Encuentros — distribución exacta y recompensas [B]

IDs `R1–R4` para ala de las ratas; `B1–B3` para progresión principal. **La siguiente tabla es la especificación de contenido de referencia del modelo v0.1.** La baraja del enemigo está en orden explícito, sin barajado; `campo_inicial` significa criaturas presentes antes del primer turno.


| ID | Zona / encuentro | Tipo | Vida rival | Campo inicial | Baraja (orden de robo) | Primera victoria | Repeticiones |
|---|---|---|---|---|---|---|---|
| R1 | Ala de ratas / Ratas · 1 | Escaramuza | Sin invocador | E01 | Ninguna | Vida máxima +1 | Vida máxima +1 |
| R2 | Ala de ratas / Ratas · 2 | Escaramuza | Sin invocador | E01;E03 | Ninguna | Vida máxima +1 | Vida máxima +1 |
| R3 | Ala de ratas / Ratas · 3 | Escaramuza | Sin invocador | E01;E02;E04 | Ninguna | Vida máxima +1 | Vida máxima +1 |
| R4 | Ala de ratas / Señora de las ratas | Duelo miniboss | 12 | Vacío | E01;E05 | Restauración a 20; fatiga −1; cofre P08, P12 (una vez) | Restauración a 20; fatiga −1 |
| B1 | Sector 1 / Centinela del umbral | Duelo principal | 17 | Vacío | E08;E07;E09 | Vida máxima +4; desbloquea P13, P16 | No repetible |
| B2 | Sector 2 / Custodia de catacumbas | Duelo principal | 22 | Vacío | E08;E09;E07;E11;E10 | Vida máxima +4; desbloquea P15, P17 | No repetible |
| B3 | Sector 3 / Guardián de la cripta | Duelo principal | 30 | E06 | E11;E13;E08;E09;E14;E12 | Restaura vida máxima a 20; final de demo | No repetible |



### 8.1. Ala opcional de las ratas — cuatro encuentros secuenciales

1. **R1, una Rata E01 (1/1)**, combate de escaramuza; victoria: +1 vida máxima.
2. **R2, E01 + Rata grande E03 (2/3)**, ambas en campo simultáneamente; victoria: +1 vida máxima.
3. **R3, E01 + Rata torpe E02 (1/2) + Rata mordedora E04 (2/1)**, todas en campo; victoria: +1 vida máxima.
4. **R4, Señora de las ratas, invocadora de 12 de vida**, baraja fija E01 → E05, sin campo inicial en el CSV; victoria: restaurar vida máxima a 20, quitar 1 fatiga. Primer triunfo además da acceso al cofre P08/P12 una sola vez.

**Regla de repetición [F]:** se inicia desde R1 al entrar de nuevo al ala, independientemente de cuán lejos llegó el jugador en la visita anterior. Puede salir tras R1, volver a entrar y farmear otra vez R1. **No** necesita completar los cuatro enfrentamientos para recibir la recompensa de R1, R2 o R3.

**No se reinician:** tipos descubiertos, copias, heridas y mejoras, cambios de vida máxima, fatiga, cofres reclamados ni santuarios gastados. Solo el estado de **encuentros de esa visita** y enemigos asociados reaparece.

**Presentación y ritmo [F]:** no encuentros aleatorios ni «spawns» inesperados durante el movimiento. Los adversarios son visibles/interactuables en una mini-sala o secuencia de salas. La idea es un «gimnasio Pokémon repetible», no una cueva que interrumpe con enemigos continuamente.

### 8.2. Modo nuevo: escaramuza sin invocador

**Necesidad funcional [F]:** R1-R3 no son un duelo habitual con un contrincante que roba o invoca. Los enemigos empiezan **en el tablero simultáneamente**, con una composición fija; **no** tienen mano, pila, fase de invocación ni invocador de 5/6 puntos. Se gana **al eliminar todas las criaturas enemigas**.

- El jugador conserva sus cartas, maná, fases y selección de atacantes/bloqueos **en cuanto tenga sentido**. Si la escaramuza debe terminar al desaparecer el último enemigo, Codex debe diseñar una transición clara sin depender de «vida de invocador rival ≤0».
- Los enemigos del campo **pueden atacar al invocador del jugador** o bloquear durante sus respectivos turnos según reglas simplificadas, pero el tratamiento exacto de su turno en este formato requiere una decisión de diseño [D]. El objetivo de la primera sala es ser vencible con semillas y fatiga; no crear una segunda IA compleja innecesariamente.
- La vida máxima 1, maná 0 y solamente P01–P04 constituyen un caso de recuperación crítico. Validarlo en el motor, no dar por hecho que el balance heurístico demuestra que funciona.
- Si la última criatura enemiga y la última propia mueren simultáneamente, precisar resultado, recompensas y liquidación sin otorgar premios dobles [D].

### 8.3. Jefes principales y progresión

**B1, Centinela del umbral:** 17 de vida, mazo E08 → E07 → E09, sin campo inicial; victoria +4 máximo y desbloqueo P13/P16. Permite acceder al sector 2.\
**B2, Custodia de catacumbas:** 22 de vida, mazo E08 → E09 → E07 → E11 → E10, sin campo inicial; victoria +4 máximo y desbloqueo P15/P17. Permite acceder al sector 3.\
**B3, Guardián de la cripta:** 30 de vida; E06 comienza **ya en campo**; mazo E11 → E13 → E08 → E09 → E14 → E12; victoria restaura máximo a 20 y completa la demo.

Los tres son combates principales no repetibles tras vencerlos; tras perder, se puede reintentar ese jefe conservando pérdidas y fatiga. Los enemigos reaparecen frescos cuando se reintenta y el jugador conserva sus consecuencias persistentes. Se mantienen como desafíos de dificultad creciente, pero su balance real debe validarse considerando el farmeo y la progresión individual.


## 9. Exploración 3D controlable [F]

### 9.1. Sustituir el diorama estático de portales por espacios recorribles

El usuario quiere **controlar un personaje 3D** con representación propia, desplazamiento en diferentes direcciones y **orientación de su rostro/cuerpo coherente con la dirección de movimiento**. Debe poder caminar de manera natural por salas conectadas, acercarse a enemigos/NPCs, interactuar, entrar al combate y volver a explorar al concluir. Las salas contienen obstáculos, rutas y descubrimientos; la escena no es solo una representación de la posición entre tres nodos.

**Comportamiento esperado:**

1. Iniciar en el primer sector de la mazmorra con el avatar visible.
2. Moverse libremente por su espacio autorizado; no atravesar paredes/barreras ni alcanzar salas bloqueadas.
3. Acercarse a un enemigo/personaje visible y activar una interacción inequívoca (con botón/tecla/puntero a definir por Codex con criterios de accesibilidad).
4. Abrir la vista de duelo correspondiente, aislando sus controles y foco del movimiento del personaje.
5. Terminar combate; volver a la **misma zona**, conservar avance, colección y consecuencias; eliminar o desplazar al NPC vencido en encuentros no repetibles para abrir el camino.
6. Disponer de bifurcación voluntaria hacia el ala de las ratas desde el primer sector; entrar, combatir lo deseado y salir; volver a entrar reinicia sus encuentros.
7. Explorar sectores 2 y 3 después de vencer a B1/B2, encontrando cofres y santuarios. Al vencer B3, comunicar el final de la demo sin borrar estado.

### 9.2. Mapa de navegación lógico (topología, no plano técnico)

```text
Entrada / Sector 1
 ├── Cofre opcional P09
 ├── Santuario de sanación de criaturas 1
 ├── Ala de las ratas (opcional, repetible)
 │    ├── R1 → R2 → R3 → R4
 │    └── Salida a Sector 1; nueva entrada reinicia R1–R4
 └── B1: Centinela del umbral (bloquea paso)
      └── Sector 2 (tras ganar B1)
           ├── Cofre opcional P10
           ├── Santuario de sanación de criaturas 2
           └── B2: Custodia de catacumbas
                └── Sector 3 (tras ganar B2)
                     ├── Cofre opcional P14 y P18
                     ├── Santuario de sanación de criaturas 3
                     └── B3: Guardián de la cripta → final de demo
```

**Esta topología es una propuesta funcional [B/P]**, no un plano artístico aprobado. Codex puede planificar geometría, tamaño de salas, cámara, animaciones básicas, colisiones, HUD, activadores y transiciones usando soluciones proporcionadas al prototipo, sin crear herramientas de mundo abierto.

### 9.3. Reglas espaciales y persistencia de objetos

- Enemigos principales **vencidos** dejan de bloquear el paso. No deben reaparecer al cambiar de sector ni al volver a explorarlos en la misma sesión.
- Enemigos del ala de las ratas reinician por **nueva entrada al ala**, nunca por mero cierre de la UI de colección, apertura del menú o alternancia entre juego/duelo. Codex debe explicitar qué evento cuenta como salida/entrada.
- Cofres reclamados permanecen abiertos/vacíos o en estado equivalente al regresar; interacción no duplica recompensas.
- Los santuarios gastados conservan indicador de uso.
- La interacción de movimiento debe quedar deshabilitada mientras la UI de duelo o menús exclusivos tenga el foco.
- Mantener navegación accesible y legible; la escena 3D debe ser funcional aun usando geometrías sencillas y arte provisional.
- Se busca un **modelo 3D propio distinguible para el jugador**, no necesariamente un recurso 3D final de producción. Codex debe proponer un avatar con orientación y animación suficiente, sin depender de recursos externos no aprobados.

### 9.4. Aspectos abiertos [D/P]

Sistema de cámara (fija, seguimiento o isométrica), teclas, velocidad de desplazamiento, interacción cercana vs clic, colisiones, dimensiones y geometría, retorno tras perder, señalización de enemigos/salidas y comportamiento móvil concreto. Estos detalles de implementación convencional pueden ser propuestos por Codex; solo deben volver a aprobación si alteran sustancialmente experiencia/alcance. La interfaz móvil exhaustiva no fue solicitada como requisito nuevo.


## 10. Cofres, recompensa y santuarios [F + B/P]

### 10.1. Cofres de exploración

Se requieren cofres opcionales que el jugador pueda encontrar **sin necesidad de derrotar un enemigo** y que recompensen la exploración con tipos/copias adicionales, normalmente modestos. Usar la distribución de P09, P10, P14 y P18 como punto de partida [B]. Cofre final del ala R4 es una recompensa de **primera victoria** y no de cada repetición.

Evitar copias duplicadas: un cofre reclamado una vez no vuelve a crear un tipo que el jugador ya posee; debe registrar su estado reclamado. Separar contenido fijo de premio, interacción, propiedad de copia y desbloqueo en el estado de aventura.

### 10.2. Santuarios / puntos de sanación de criaturas

**Concepto fijo:** un punto por sector principal (tres en la demo). Al usarse, restablece **al máximo individual actual** la vida de **todas las copias poseídas**, incluidas las que están en reserva y no en la baraja activa. Si una copia épica ganó +vida máxima, usar su máximo mejorado. Las cartas que ya murieron **no** regresan; hay que reinvocarlas por el sistema de vida máxima.

**Límite recomendado [P]:** un uso por sector y por expedición/sesión. El diseñador aprobó el concepto y cantidad de puntos, pero no zanjó explícitamente la repetición de usos; incluir esta decisión en el plan y solicitar ratificación si se considera indispensable antes de codificar.

**Distinguir barras:** la sanación de criaturas no restaura vida máxima del invocador; eso ocurre al vencer escaramuzas/jefes. La vida máxima del invocador no cura copias heridas.

### 10.3. Recompensas, estado y mensajes

- Recompensas por encuentros repetibles se entregan **cada victoria**, sujetas a techo y sin duplicar la liquidación del mismo encuentro.
- Recompensas de primera victoria y cofres se conceden **una vez**.
- B1/B2 desbloquean sector siguiente y cartas; B3 finaliza el recorrido. Las salidas del ala son voluntarias.
- Los mensajes de resultados deben informar explícitamente **cambios de vida máxima**, **fatiga**, **copias heridas/perdidas**, **mejoras épicas** y **desbloqueos** cuando existan; no atribuir curación de copias a recuperación de vida máxima.


## 11. UI/UX y presentación asociada a las nuevas mecánicas

La interfaz actual está aprobada como base; debe adaptarse funcionalmente a los nuevos flujos, no copiar literalmente el diseño viejo de portales. Evitar introducir menús y confirmaciones innecesarias.

**Explorar [F]:** vista de avatar 3D recorrible, señales claras de ruta principal y ala opcional, NPC enemigos visibles, interacción contextual, cofres, santuarios, salidas y estados de paso. HUD compacto con vida actual/máxima, fatiga, proximidad a un objetivo y acceso a colección/preparación.

**Colección / catálogo [F]:** mostrar cada tipo desbloqueado aunque falte su copia, rareza y coste de reinvocación; indicar claramente «poseída», «herida», «perdida», «en baraja», «en reserva», estadísticas básicas y mejoras de esa instancia. Acción de reinvocación solamente fuera de combate y solamente cuando el coste es legal; comunicar pérdida de vida máxima antes de confirmar. Nunca permitir duplicados.

**Preparación [F]:** mantener selección explícita y orden de robo determinista, con una copia por tipo. Reflejar en cartas disponibilidad por maná, sacrificios y heridas. Mejora de ergonomía para reordenar se puede proponer [P], pero no se requiere imponer drag-and-drop.

**Duelo [F]:** representar cartas, criaturas propias/enemigas, turnos, vida invocador rival si existe, vida/máximo propios, fatiga y progresión épica. Para escaramuzas **sin invocador**, la UI no debe mostrar falsamente uno ni pedir reducirle la vida: presentar objetivo «elimina a todas las criaturas enemigas». Bloqueos, sacrificios y resultado han de seguir siendo comprensibles.

**Interfaz visual de rareza [B]:** gris/neutro para común, azul para rara, violeta para épica, con texto e iconografía. Diferenciar semanticamente el **coste de reinvocar** (vida máxima, en colección) del **coste de jugar** (maná/sacrificios, en duelo).

**Feedback crítico:** animación o texto por entrada en combate, muerte permanente, pérdida de progreso, mejora epic +1, sanación global, apertura de cofre único y reducción de fatiga. Mantener controles operables sin depender solo de color y prioridad a claridad sobre efectos especiales.

**Resultado tras combate:** regresar al entorno de exploración coherente con la posición/ala y mostrar recompensa concreta. El jugador debe poder continuar caminando o salir del ala sin caer accidentalmente en el próximo combate.


## 12. Justificación cuantitativa y límites del balance

### 12.1. Indicador heurístico de valor de criatura

Para una primera comparación de estadísticas se utilizó:

```text
V = ATAQUE + 0,5 × VIDA_MÁXIMA
```

El coeficiente 0,5 es un supuesto, no una verdad física ni simulación exacta: el ataque presiona vida del rival y puede producir intercambios letales; la vida ayuda a sobrevivir. **V no predice victorias** porque ignora barreras de daño letal, ataques inmediatos, orden de robo, multibloqueo, sacrificios, tempo, heridas previas y elección estratégica.

Ejemplos: Quimera menor 5/5 → V=7,5; Rata amaestrada 1/2 → V=2; Espadachina espectral 4/4 → V=6. Si Quimera sacrifica a la Rata, un indicador **simplificado** de valor neto de mesa sería 7,5−2=5,5; no incorpora que Quimera no gasta maná y que la semilla puede recuperarse gratis, por lo cual el sacrificio podría ser demasiado eficiente. En caso de sacrificar una épica mejorada, el coste es mucho mayor que ese 2 ilustrativo.

**Principio de ajuste:** las cartas con sacrificios generalmente reciben mejores estadísticas, pero un coste de maná 1 pesa poco cuando mana=1 se renueva por turno; un sacrificio de carta semilla gratis no tiene coste de vida máxima, solo coste de mesa/tempo. Revisar emparejamientos específicos, no balancear por rareza sola.

### 12.2. Presión de contenido de jefes (no dificultad real)

Suma de V de sus enemigos disponibles (incluido campo inicial):

| Jefe | Vida de invocador | Presión V combinada | Relación |
|---|---:|---:|---|
| B1 | 17 | 11,5 | base |
| B2 | 22 | 23,5 | aprox. ×2,04 respecto B1 |
| B3 | 30 | 37,0 | aprox. ×1,57 respecto B2 |

Estos valores comparan **total de contenido**, no poder desplegado por turno. B3 tiene un enemigo inicial en mesa; la mano y pila de rivales de B1/B2 se juegan en orden y con coste. Los máximos de 17/22/30 son **hipótesis de balance**, no metas demostradas de dificultad creciente.

### 12.3. Coste económico de recuperar colección

```text
Coste_total_reconstrucción = 1 × comunes_estándar
                           + 2 × raras
                           + 3 × épicas
                           + 0 × semillas
```

| Copias recuperadas | HP máximo gastado | R1 victorias para reponer HP máximo desde 20 |
|---|---:|---:|
| Una común estándar | 1 | 1 |
| Una rara | 2 | 2 |
| Una épica | 3 | 3 |
| Dos raras + una épica | 7 | 7 |
| Una común + dos raras + una épica | 8 | 8 |

Si se está por debajo de 20 desde antes, el número de R1 a 20 es `20 − H_max_actual` después de pagar (en ausencia de otras pérdidas y si cada R1 siempre se gana). Una victoria R4 permite alcanzar 20 de una vez. Los números describen **recompensas**, no coste real de tiempo, daño, heridas o nuevas muertes ocasionadas por farmear.

### 12.4. Modelado exploratorio anterior (NO conclusión validada)

Se ejecutó antes un **simulador heurístico externo** con mazos únicos, coste, robo, invocación y una IA de defensa muy simplificada. Los cuatro resultados que lo acompañan en el Excel fueron:

| Escenario aislado | Resultado del modelo | Turnos propios | Copias perdidas |
|---|---|---:|---:|
| Cuatro semillas, fatiga 1 → R4 | Victoria | 5 | 1 |
| Ocho iniciales → B1 | Victoria | 5 | 3 |
| Baraja preparada de 13 tipos → B2 | Victoria | 8 | 7 |
| Baraja avanzada de 18 tipos, épicas +2 → B3 | Victoria | 8 | 6 |

**Advertencias obligatorias:**

- Esto **no** reproduce el motor TypeScript real y no demuestra que el encuentro sea ganable en la aplicación.
- **No** ejecuta R1-R3 como escaramuzas y no valida la salida desde `H_max=1`.
- **No** modela expedición completa, recuperación y heridas que pasan de un duelo al siguiente; en escenarios independientes reinicia estados.
- Otorga a épicas bonos fijos al comenzar algunos ensayos, **no** los gana por eliminaciones en una sesión real.
- La IA del jugador elige invocaciones y bloqueos por una regla simplificada, no por decisiones humanas representativas.
- El resultado B2 con **7 bajas** y B3 con **6** puede ser una señal de desgaste excesivo, no una garantía de que «está equilibrado».
- La distribución de recompensas, turnos objetivos y cartas debe reajustarse sobre una partida completa si la experiencia falla.

El Excel adjunto es útil para inspeccionar fórmulas e hipótesis; **no debe convertirse en test de aceptación numérica literal** sin reconstruir primero escenarios correctos en el motor y revisar supuestos.

### 12.5. Indicadores que realmente interesa medir

- Probabilidad/viabilidad de victoria de B1/B2/B3 con barajas permitidas de una copia por tipo.
- Bajas y heridas por encuentro, sobre todo en victorias.
- Número de reinvocaciones por tramo y coste neto de vida máxima.
- Número de escaramuzas necesarias tras una derrota severa y tiempo real de recuperación.
- Fatiga antes/después de recuperarse en ala de ratas.
- Crecimiento de épicas tras 0/1/2/3 eliminaciones atribuidas, y ritmo necesario para llegar al cap.
- Experiencia cualitativa: tensión por conservar épicas, poca frustración por falta de cartas, preparación significativa y escaramuzas no tediosas.


## 13. Plan de verificación: criterios observables y escenarios

**Codex debe derivar pruebas automáticas del motor cuando sea posible y playtesting de exploración/interfaz donde haga falta.** Las siguientes son pruebas **a realizar**, no pruebas ya aprobadas.

### 13.1. Motor / sesión / economía (críticas)

| ID | Escenario | Criterio de aceptación |
|---|---|---|
| E01 | Reinvocar con copia ya poseída | No crea duplicado; no cobra vida máxima; se informa motivo. |
| E02 | Reinvocar tipo no descubierto | Acción imposible; catálogo no se altera. |
| E03 | Reinvocar común/rara/épica | Consume exactamente 1/2/3 de vida máxima; copia creada sana, sin progreso. |
| E04 | Reinvocar desde `H_max=1` | Coste positivo bloqueado; jamás queda 0 ni negativo. |
| E05 | Cuatro semillas desde colección vacía | Cada una puede recrearse gratis y jugarse con 0 maná y 0 sacrificios; no duplicables. |
| E06 | Carta retirada de baraja, pero poseída | No es «perdida» y no puede reinvocarse; conserva identidad/heridas/mejoras. |
| E07 | Crear copia de épica antes mejorada y muerta | ID nuevo, 0 bonos, vida actual = base; desbloqueo se conserva. |
| E08 | Sacrificar criatura propia | Se pierde la copia, aunque se gane duelo; permitir posterior recuperación pagando coste. |
| E09 | Victoria R1/R2/R3 | Máximo +1, cap 20, sin bajar fatiga en propuesta; reward solo una vez por victoria liquidada. |
| E10 | R4 ya reclamado | Siempre restaura máximo a 20 y −1 fatiga; **no** da nuevamente P08/P12. |
| E11 | Derrota con fatiga acumulada | Fatiga +1; máximo no se regenera por derrota; semillas siguen utilizables. |
| E12 | Victoria B1/B2/B3 | Aplica recompensa y desbloqueo solo al completar por primera vez; B3 finaliza demo. |
| E13 | Doble notificación/liquidación del mismo duelo | No duplica recompensas, crecimiento, copias ni avance. |
| E14 | Vida actual y máxima divergentes | Siguiente duelo comienza con vida actual igual a su máximo persistente, nunca 20 si Hmax<20. |
| E15 | Guardado en memoria de sesión | Cambiar de sala/menú/combate conserva progreso; recarga puede resetear según alcance vigente. |

### 13.2. Combate, IA y mejora individual

| ID | Escenario | Criterio de aceptación |
|---|---|---|
| C01 | Escaramuza R1 | Enemigo directamente en campo, sin baraja ni invocador enemigo; victoria al derrotar la única criatura. |
| C02 | Escaramuza R2/R3 | Las dos/tres criaturas aparecen simultáneamente; el encuentro concluye solo cuando mueren todas. |
| C03 | Rescate desde `H_max=1`, fatiga≥1, solo semillas | Existe una secuencia jugable legítima para vencer R1 y recuperar 1 máximo sin depender de maná. |
| C04 | R4 sin prepararse | Con semillas hay camino realista para ganar, aunque con dificultad; no convertirlo en tutorial gratis. |
| C05 | Coste combinado épico | P16/P17 exigen exactamente 1 maná y 1 sacrificio; a maná 0 no son jugables aunque haya sacrificios. |
| C06 | Cartas raras con sacrificio a maná 0 | P13/P14 pueden jugarse si existe la criatura para pagar el sacrificio. |
| C07 | Orden fijo y máximo una copia | Robos y reordenación producen orden esperado; ningún tipo aparece dos veces en mano+mesa+mazo propios. |
| C08 | Mejora épica ofensiva | Eliminación atribuida incrementa ataque de la copia en +1 hasta +3; persiste siguiente duelo. |
| C09 | Mejora Coloso | Incrementa máximo de vida en +1 hasta +3 con regla de salud actual acordada; santuario respeta nuevo máximo. |
| C10 | Varias criaturas bloqueando | Atribución de eliminación consistente sin incremento múltiple por la misma baja. |
| C11 | Muertes simultáneas / escaramuza | Resultado inequívoco, sin recompensa doble, bajas persistentes liquidadas una vez. |
| C12 | Jefes B1/B2/B3 | Campo inicial y mazos estrictamente iguales al CSV, IA juega cartas por costes legales. |

### 13.3. Exploración 3D, encuentros, objetos y UI

| ID | Escenario | Criterio de aceptación |
|---|---|---|
| M01 | Movimiento libre en sector 1 | Avatar visible, se desplaza en diversas direcciones y se orienta al moverse. |
| M02 | Colisiones / puertas | No atraviesa límites; B1 bloquea acceso a sector 2 hasta victoria. |
| M03 | Interacción con enemigo | Al acercarse e interactuar inicia encuentro correcto una vez, sin entradas accidentales. |
| M04 | Resultado del combate | Regresa a la zona correspondiente; enemigo principal vencido desaparece/se aparta y deja pasar. |
| M05 | Ala de ratas, salida después de R1 | Recibe +1; salir funciona; reentrar reinicia R1 y permite repetirlo. |
| M06 | Reinicio ala después de R4 | R1-R4 reaparecen, pero cofre único permanece reclamado. |
| M07 | Cofres libres en sectores | P09/P10/P14/P18 obtenibles mediante exploración sin combate adicional obligatorio; una sola vez. |
| M08 | Santuarios | Curan todas las copias poseídas, en y fuera de baraja, no reviven; estado de uso coherente. |
| M09 | Menús y estado | Abrir colección/duelo no mueve avatar ni reinicia ala; reinvocación no disponible en combate. |
| M10 | Rareza / coste / progreso visibles | UI distingue salud máxima del invocador, costo de recuperación, mana/sacrificios, rareza y mejora. |
| M11 | Final de B3 | Final de demo visible, sin bloquear inspección de la colección ni producir encuentros principales inexistentes. |
| M12 | Resoluciones, foco y controles | Interacciones básicas de teclado/puntero, textos accesibles, layout usable sin roturas mayores. |

### 13.4. Playtesting y criterios de experiencia

Al menos tres recorridos manuales con registro de secuencia y estadísticas:

1. **Ruta de progreso:** sin abusar del ala, vencer B1→B2→B3; registrar estrategia, vida máxima, pérdidas, entrenamientos y cuántas copias hubo que reponer.
2. **Ruta de recuperación severa:** perder varias criaturas y acumular fatiga, llegar a Hmax mínimo viable, recrear semillas, farmear R1/R2 y vencer R4 para volver a 20 y reducir fatiga. Repetir R4 si fatiga permanece >0. Verificar que no exista bloqueo insalvable por reglas de combate.
3. **Ruta optimizada de épicas:** farmear 0/1/2/3 mejoras de cada épica; combatir jefes con barajas preparadas y valorar si se trivializa B2/B3.

**Rangos exploratorios, no condiciones rígidas:** B1 aprox. 3–6 turnos propios; B2 4–9; B3 5–10 en partidas de referencia razonables. Ajustar si jugar resulta demasiado monótono o si la mortalidad es desproporcionada. Medir especialmente tiempo por repetición de R1 y de R1→R4, ratio de pérdidas en victorias y frecuencia con que el jugador siente que «no tiene cartas» o que «debe farmear».

### 13.5. Matriz de balance acumulado

Codex debe diseñar pruebas/simulaciones **con estado persistente de expedición**, no solo duelos aislados: empezando con las ocho copias únicas, recolectando cofres, entrenando, sufriendo heridas/muertes, reinvocando sin exceder una copia por tipo, gastando Hmax y recibiendo sus recompensas. Registrar diferentes órdenes de robo y políticas de defensa del jugador. Si una victoria requiere muchas pérdidas, no declararla automáticamente aceptable por el solo hecho de que la IA de prueba logró ganar.


## 14. Dependencias y orden sugerido de planificación [P]

Esto es una **secuencia sugerida** para que Codex prepare hitos; no imponerla sin revisar el repositorio:

1. **Modelo de dominio, reglas y pruebas:** vida máxima persistente, raro/subtipo, copia y progreso, coste de reinvocación y unicidad por tipo; mantener compatibilidad con motor existente.
2. **Contenido y configuración:** reemplazar catálogo y encuentros por fuentes claras; estados de premio único, sector, visita al ala, cofres y puntos de sanación.
3. **Modos de combate:** escaramuza sin invocador y criaturas predesplegadas; nuevas condiciones de victoria; recompensas y fatiga diferenciadas; mejora de épicas.
4. **Ciclo de recuperación y menú de colección:** acciones de reinvocar, visualización de costes, validaciones de Hmax, semillas, barras, recompensas y mensajes.
5. **Exploración 3D jugable:** avatar, movimiento, orientación, cámara, colisiones, interacciones, entrada/salida de alas, sectores y gates de jefes; transición combate/exploración.
6. **Objetos de mundo:** cofres, santuarios, persistencia de reclamación/uso y estados visibles.
7. **Verificación y balance:** tests del motor, revisión independiente, recorrido manual, análisis de expedición completa, ajustes de cartas/dificultad con aprobación.

**Riesgos a priorizar en el plan:** refactor de estados para múltiples escenas; transición/reactividad entre UI y 3D; lógica de recompensas única vs repetible; reinvocación y bonificaciones en copia sin duplicados; emergencia a Hmax=1; versión sin invocador de los combates; conteo correcto de bajas para progresión épica; costos altos de render en navegador sin exigir producción artística.

**No decidir tecnológicamente en la especificación:** librería de controles, arquitectura ECS, sistema de eventos, persistencia/serialización avanzada, assets externos y automatizaciones de la Factory. Proponer opciones convencionales y justificar si una dependencia nueva es realmente necesaria.


## 15. Decisiones abiertas — qué necesita ratificación y qué puede resolver Codex

Estas cuestiones no invalidan el plan general. Codex debe identificarlas y proponer una recomendación por defecto cuando corresponda, **pero no dar por aprobada una nueva mecánica creativa**:

| ID | Nivel | Pregunta / decisión |
|---|---|---|
| D01 | Diseño importante | Cómo se adjudica «eliminar carta» a una épica en bloqueo múltiple y muertes simultáneas. |
| D02 | Diseño importante | Al subir +1 vida máxima de Coloso, si vida actual sube también o no. |
| D03 | Diseño importante | Política exacta de ataque/defensa de enemigos en escaramuzas sin invocador y empate sin unidades. |
| D04 | Diseño moderado | Ratificar +3 como tope de crecimiento, especialmente porque el farmeo de R1-R3 podría maxear una épica muy rápido. |
| D05 | Diseño moderado | Ratificar límite de **un uso** de santuario por sector. |
| D06 | Balance experimental | Ratificar/ajustar +4 de B1/B2, estadísticas, orden de robar y asignación de cofres. |
| D07 | Flujo / UX | Cómo manejar retroceso o derrota dentro del ala: permanecer ante el enemigo actual, reentrar o reiniciar visita; salida voluntaria siempre disponible. |
| D08 | Flujo / UX | Al desbloquear un tipo, si se otorga una copia saludable de inmediato o solo conocimiento; propuesta actual: una copia la primera vez. |
| D09 | Convención técnica | Si el máximo restaurado también completa vida actual al cerrar duelo; propuesta: sí, como regla de recuperación actual. |
| D10 | Convención técnica/UX | Controles, cámara, interacción y mapa exacto de las salas; escoger diseño accesible, simple y coherente. |
| D11 | Balance / pruebas | Tamaño y orden inicial de baraja; estadísticas definitivas solo después de recorrido persistente. |
| D12 | Diseño moderado | Si los jefes B1/B2 además de +4 reducen fatiga −1; propuesta actual: conservar regla de victorias de jefes. |

**No preguntar por cuestiones ya resueltas:** una copia por tipo, recuperar únicamente versión básica, vida máxima nunca inferior a 1, semillas gratuitas, minijefe repetible que llena Hmax y −1 fatiga, cofre único, escaramuzas voluntarias y exploración 3D libre. Tampoco reabrir problemas históricos del rediseño ya cerrado salvo impacto reproducible de la nueva implementación.


## 16. Fuera de alcance o aplazado expresamente

- Ritual de revivir **durante combate**, demora de varios turnos, pagar vida actual en lugar de máxima, coste de vida creciente por cada ritual: ideas discutidas pero **sustituidas para este experimento** por la reinvocación fuera de combate a cambio de máximo.
- Revivir una versión mejorada de una criatura, conservar experiencia de la antigua o restaurar automáticamente heridas mediante reinvocación: **no**.
- Barajas con copias duplicadas del mismo tipo: **no**, contradice regla fija del diseñador.
- Encuentros aleatorios que interrumpan la exploración en bucle: **no**.
- Monedas, tiendas, creación de cartas por ingredientes, narrativa completa, guardado permanente, niveles de invocador ganados, cuarta rareza «mítica», árboles de habilidades, música, doblaje y arte definitivo: fuera de este alcance salvo aprobación posterior.
- Reescritura general de Game Factory o cambios a su flujo de trabajo: fuera de alcance salvo dependencia concreta detectada que requiera consulta.

**Nota sobre iteraciones anteriores:** La mejora visual del 26-10-2026 se cerró, así como sus problemas de herramientas de inspección; esta nueva propuesta no reabre ese cierre. La necesidad actual es implementar nuevas funcionalidades y validarlas.


## 17. Entregable solicitado a Codex (plan de implementación, no código)

Codex debe responder con un documento de planificación que contenga, como mínimo:

1. **Auditoría de punto de partida:** HEAD real; mapa de archivos afectados; qué funciones existentes se reutilizan y qué restricciones cambian.
2. **Desglose por hitos verticales** que produzcan partes jugables, no una única modificación monolítica.
3. **Dependencias explícitas**, riesgos y cómo evitar regresiones de reglas ya aprobadas.
4. **Modelo de datos** que necesita ampliarse (vida máxima, rareza, copias, mejoras, premios, salas y estados de visita) sin imponer una solución arquitectónica compleja.
5. **Contratos de comportamiento** de recuperación, escaramuzas, evolución, recompensas y exploración, indicando qué está cerrado y qué necesita decisión creativa.
6. **Plan de interacción/UI/3D**, con controles y cámara propuestos, geometría/arte provisional, puntos de retorno y navegación.
7. **Plan de migración de contenido** para retirar las cartas/encuentros anteriores y cargar los CSV completos, incluido orden exacto.
8. **Pruebas automatizadas y pruebas humanas** por hito, con referencias a los IDs E/C/M de la sección 13 y criterios observables.
9. **Estrategia de balance real:** al menos expedición completa con persistencia, rescate con Hmax 1 y fatiga, varias barajas/órdenes válidos, entrenamiento épico y tiempo de farmeo; indicar qué parte no se puede certificar automáticamente.
10. **Decisiones pendientes ordenadas por impacto**, con recomendación y alternativas para que el diseñador apruebe antes de implementar los subsistemas afectados.
11. **Estimación cualitativa y riesgos**, sin prometer que el balance quede perfecto antes del playtesting.
12. **Confirmación de que todavía NO realizará cambios de código, tests, commits ni instalación de dependencias** hasta que el plan sea revisado y autorizado.

### Orden de autoridad para las futuras fases

**Prioridad 1:** decisiones explícitas del diseñador, en particular una copia por tipo, experiencia objetivo, reinvocación base y reglas de recuperación.\
**Prioridad 2:** catálogo y encuentros v0.1, como baseline de pruebas.\
**Prioridad 3:** reglas implementadas vigentes no contradichas.\
**Prioridad 4:** recomendaciones y supuestos operativos que Codex puede proponer pero no fijar creativamente sin autorización.

---

**Resultado esperado de este encargo:** un plan coherente, con tareas agrupadas y pruebas mensurables, que permita al diseñador revisar y aprobar la próxima iteración. **No implementar todavía.**
