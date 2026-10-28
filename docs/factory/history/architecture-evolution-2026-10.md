# Game Factory — Evolución arquitectónica, experiencias de implementación y aprendizajes operativos

**Período documentado:** octubre de 2026

**Fecha de corte:** 28 de octubre de 2026

**Estado:** Informe histórico; contenido aprobado por el usuario.

**Ubicación:** `docs/factory/history/architecture-evolution-2026-10.md`

**Naturaleza:** Informe retrospectivo; no constituye documentación operativa vigente ni nuevas instrucciones para los agentes.

---

## 1. Propósito y alcance

Este informe conserva el conocimiento acumulado durante una etapa de diseño, implementación, evaluación y consolidación de Game Factory.

Su propósito es documentar cómo evolucionó la arquitectura del proyecto, qué decisiones se adoptaron, qué experiencias permitieron evaluarlas, qué dificultades surgieron y qué resultados se obtuvieron.

El informe busca preservar información que podría perderse al finalizar una conversación extensa que actuó como asistente de arquitectura, planificación y evaluación de Game Factory.

No pretende sustituir las referencias vigentes del repositorio.

Al cierre del período documentado, dichas referencias se encontraban principalmente en:

- [`docs/factory/overview.md`](../overview.md): descripción conceptual de Game Factory.
- [`docs/factory/status.md`](../status.md): estado vigente de sus capacidades y limitaciones.
- [`docs/factory/workflow-v1.md`](../workflow-v1.md): procedimiento operativo.
- [`AGENTS.md`](../../../AGENTS.md): instrucciones generales del repositorio.
- `projects/<juego>/docs/`: documentación vigente y histórica de cada videojuego.

Este documento describe acontecimientos y decisiones correspondientes a una etapa determinada. Sus afirmaciones sobre el funcionamiento del sistema deben interpretarse en el contexto temporal indicado.

### 1.1. Procedencia y límites de la información

La reconstrucción utiliza los antecedentes conservados de las conversaciones de trabajo, las especificaciones discutidas, las respuestas de Codex compartidas por el usuario y el informe de reorganización documental fechado el 28 de octubre de 2026.

Las fuentes presentan distintos niveles de evidencia:

**Observación directa del usuario:** resultados de playtesting, percepción de calidad visual, rendimiento, comodidad de controles y decisiones de aceptación.

**Resultado reportado por Codex:** pruebas ejecutadas, commits, archivos modificados, diagnósticos técnicos y revisiones independientes.

**Decisión documentada:** autorización, rechazo o modificación de una propuesta durante la coordinación de los trabajos.

**Interpretación retrospectiva:** conclusión derivada de varias experiencias, sin que necesariamente exista un experimento controlado que permita demostrarla.

No se realizó una nueva auditoría independiente del repositorio para elaborar este informe.

Los resultados técnicos que se mencionan proceden de los informes históricos correspondientes, salvo que se indique expresamente otra cosa.

Cuando no se dispone de evidencia suficiente para reconstruir un episodio con precisión, se identifica esa limitación en lugar de inventar datos.

---

## 2. Resumen de la evolución

Durante octubre de 2026, Game Factory pasó de una etapa centrada en definir y probar una arquitectura de desarrollo asistida por IA a otra orientada principalmente a utilizarla para construir videojuegos.

El proceso no consistió en un único rediseño arquitectónico. Se desarrolló mediante varias decisiones incrementales, evaluadas a través de implementaciones reales.

La arquitectura terminó reuniendo un conjunto de capacidades prácticas:

- Creación de proyectos a partir de una plantilla.
- Instrucciones comunes para Codex.
- Ejecución de implementaciones organizadas en hitos.
- Coordinación de agentes especializados.
- Revisión técnica independiente.
- Pruebas automatizadas y verificaciones del proyecto.
- Continuidad del trabajo entre sesiones e interrupciones.
- Integración de actividades de diseño visual.
- Procedimientos de autorización y cierre.
- Commits locales con controles de seguridad.
- Documentación de estado, especificaciones y planes de continuidad.

Estas capacidades se utilizaron en proyectos reales, principalmente el RPG de cartas y Comerciante Medieval.

Las experiencias incluyeron implementaciones de gameplay, rediseños de interfaz, exploración tridimensional, producción de escenarios estilizados y resolución de problemas de rendimiento.

El resultado general fue satisfactorio para el usuario.

**Decisión estratégica al cierre del período:** considerar validada la arquitectura principal para las necesidades actuales, dejar de priorizar su rediseño y concentrar los esfuerzos en desarrollar videojuegos.

Esta validación es práctica y contextual. No demuestra que la arquitectura sea óptima, universalmente aplicable ni que todos sus componentes contribuyan de manera igualmente importante.

---

## 3. Origen del enfoque de desarrollo

### 3.1. Problema de coordinación manual

Una dificultad importante en las primeras etapas era la dependencia de un chat principal que centralizaba gran parte de la coordinación.

El procedimiento habitual consistía en discutir el diseño de un videojuego, preparar instrucciones para Codex, ejecutar la implementación y trasladar sus resultados nuevamente al chat.

Posteriormente, el chat solicitaba comprobaciones, interpretaba los informes o proponía correcciones, y el usuario volvía a actuar como intermediario.

Este esquema permitía avanzar, pero presentaba un coste de coordinación considerable.

Muchas tareas eran repetitivas o técnicas y no requerían una decisión creativa del usuario.

Entre ellas estaban la organización interna de implementaciones, la ejecución de pruebas, la interpretación inicial de errores y la continuación de trabajos previamente autorizados.

### 3.2. Objetivo de aumentar la autonomía

Se buscó que Codex pudiera asumir una parte mayor de ese ciclo.

La intención no era eliminar la intervención humana, sino concentrarla donde aportaba más valor:

- Definir qué videojuego se quiere desarrollar.
- Decidir sus características relevantes.
- Aprobar cambios de alcance y diseño.
- Evaluar resultados visuales y jugables.
- Resolver compromisos importantes.
- Autorizar los cierres.

Codex debía encargarse, dentro del alcance concedido, de la ejecución técnica y de las comprobaciones que no necesitaran nuevas decisiones del usuario.

Esto condujo a una separación de responsabilidades que se mantuvo durante las implementaciones posteriores.

### 3.3. Distribución de responsabilidades

**Usuario:** dirección del producto, objetivos creativos, aprobación de decisiones importantes y aceptación final.

**ChatGPT:** asistencia para explorar ideas, construir especificaciones, analizar informes, interpretar problemas y preparar encargos.

**Codex:** inspección del repositorio, planificación técnica, ejecución, coordinación de agentes, pruebas, revisión y preparación de cierres.

**Game Factory:** instrucciones, estructura y herramientas que permiten realizar ese procedimiento de forma consistente.

Esta distribución permitió reducir la necesidad de que el usuario trasladara manualmente cada comprobación entre sistemas.

No todas las actividades se volvieron completamente autónomas. Algunas herramientas continuaron requiriendo autorizaciones y ciertas evaluaciones visuales dependieron del playtesting humano.

---

## 4. Primer estado comprobado de Game Factory

Entre los primeros hitos documentados se encontraba una Factory con plantilla, generador, instrucciones y un proyecto RPG funcional.

Una revisión de ese estado confirmó la existencia de:

- `AGENTS.md`.
- La plantilla de proyecto.
- El generador de proyectos.
- El RPG con especificación, plan e informe.
- Documentación preparada para nuevos chats y trabajos de continuidad.

El generador copiaba una plantilla, ajustaba metadatos, excluía determinados artefactos y evitaba sobrescribir un destino existente.

La plantilla contenía una escena de prueba.

El plan inicial registraba siete hitos completados sobre siete, y el informe correspondiente declaraba satisfechos doce criterios sobre doce.

También se conservaban resultados históricos de 32 pruebas aprobadas y build correcto. Esas verificaciones no fueron reejecutadas durante la revisión documental.

El commit de cierre identificado fue:

`caf6309770148eeab65dbc988b5f592e36fc7a22`

Este punto resulta útil como referencia de una etapa anterior a las transformaciones posteriores.

La existencia de una Factory funcional en ese momento no significaba que la organización documental y los mecanismos de continuidad estuvieran definitivamente resueltos.

Parte importante del trabajo siguiente consistió precisamente en comprobar esas capacidades en proyectos de mayor complejidad.

---

## 5. Evolución de la autonomía y del procedimiento

### 5.1. Implementaciones por hitos

Las implementaciones comenzaron a organizarse mediante alcances aprobados y hitos técnicos.

El propósito era que Codex pudiera avanzar por varias etapas sin solicitar autorización para cada operación convencional.

La planificación permitía identificar dependencias, ejecutar comprobaciones parciales y continuar con el trabajo autorizado.

Esta organización resultó especialmente útil durante las ampliaciones importantes del RPG.

### 5.2. Coordinación de agentes

La Factory utilizó mecanismos de coordinación y perfiles especializados, entre ellos `implementer` y `reviewer`.

Su utilización permitió separar parte de la ejecución y la revisión técnica.

No obstante, la existencia de agentes especializados no debe interpretarse como evidencia de que toda mejora requiere crear más agentes.

A lo largo del trabajo se consolidó una preferencia por aprovechar los componentes existentes antes de ampliar la arquitectura.

### 5.3. Skills de desarrollo y diseño visual

Entre las capacidades utilizadas se encontraban las skills `game-iteration` y `game-ui-ux`.

La experiencia con el RPG mostró que las implementaciones visuales requieren considerar aspectos diferentes de los cambios puramente técnicos.

No basta con que una interfaz funcione: también debe presentar correctamente sus elementos, apoyar las decisiones del jugador y resultar cómoda durante el uso real.

Sin embargo, esta observación no condujo a exigir universalmente una inspección visual extensa para cualquier implementación técnica.

El usuario rechazó convertir una experiencia particular en una regla indiscriminada que pudiera penalizar trabajos realizados con modelos o herramientas de capacidades diferentes.

La orientación adoptada fue mantener procedimientos proporcionales al tipo de cambio.

### 5.4. Continuidad entre interrupciones

Una necesidad recurrente fue preservar el estado de implementaciones que no podían completarse durante una sola sesión.

Se utilizaron planes y registros de continuidad para recuperar:

- Hitos terminados.
- Trabajo pendiente.
- Resultados de pruebas.
- Problemas conocidos.
- Decisiones ya autorizadas.
- Siguiente acción concreta.

Las experiencias posteriores confirmaron que era posible interrumpir y reanudar trabajos extensos sin reconstruir toda su planificación.

El valor principal de estos registros era evitar pérdida de trabajo y duplicación de tareas.

No debe confundirse esta capacidad de reanudación con ejecución automática en segundo plano: en varios episodios fue necesario que el usuario retomara la sesión.

### 5.5. Autonomía dentro de límites explícitos

Se mantuvo la distinción entre decisiones técnicas convencionales y decisiones que modifican el producto.

Codex podía reorganizar componentes, resolver errores y elegir soluciones técnicas dentro de un encargo aprobado.

No recibía autorización implícita para cambiar mecánicas, introducir nuevas características, modificar decisiones artísticas fundamentales o realizar commits y pushes fuera de los procedimientos establecidos.

La práctica mostró que una autonomía bien delimitada podía resultar más útil que exigir numerosas aprobaciones intermedias.

---

## 6. Casos de implementación que sirvieron para evaluar Game Factory

Los siguientes casos son relevantes porque muestran cómo se comportó la arquitectura durante trabajos reales.

No constituyen una historia exhaustiva de las mecánicas de cada videojuego. Su enfoque es la experiencia de implementación y su relación con Game Factory.

### 6.1. Primera transformación visual del RPG de cartas

**Referencia de cierre:** `2d477ff9ef793a8754f24826f763ade53b10b29f`

El RPG había alcanzado una base funcional, pero su presentación todavía se percibía como una interfaz técnica provisional.

Se buscó mejorar considerablemente la organización visual de sus diferentes actividades.

La intervención incluyó una nueva presentación para exploración, colección y combate, conservando las reglas existentes.

Según los informes compartidos, Codex utilizó el procedimiento de diseño e implementación disponible y completó las verificaciones técnicas correspondientes.

El cierre registró 32 pruebas aprobadas.

El usuario probó el juego y consideró que la interfaz había mejorado de manera sustancial.

La nueva presentación no resolvía todas las aspiraciones visuales del producto, particularmente las invocaciones tridimensionales previstas para etapas futuras.

Sin embargo, cumplía el objetivo de transformar una base técnica poco atractiva en una experiencia visualmente más organizada.

**Resultado relevante para Factory:** un encargo de transformación visual relativamente abierto podía producir una mejora importante utilizando el procedimiento existente y un modelo con capacidad suficiente para interpretar la dirección artística.

**Limitación:** este resultado no demostraba que todas las decisiones visuales fueran correctas ni que la aplicación estuviera terminada. Persistían posibilidades de mejorar la coherencia global de las interfaces.

### 6.2. Ampliación del gameplay y de la expedición del RPG

**Referencia de cierre:** `f401a0ed719d7b61cc41d95b789389e3df8813eb`

Una implementación posterior amplió considerablemente el contenido y los sistemas del RPG.

El alcance incluía la estructura de encuentros de la cripta y del ala opcional de las ratas, nuevas reglas de cartas, consecuencias persistentes y mecanismos de recuperación.

Entre los elementos de diseño relevantes figuraban:

- Siete encuentros distribuidos entre tres sectores principales y cuatro salas del ala de las ratas.
- Dieciocho tipos de cartas propias y catorce tipos enemigos.
- Persistencia de heridas y pérdidas.
- Restricciones sobre copias poseídas.
- Recuperación de tipos perdidos con un coste sobre la vida máxima.
- Mecanismos de recuperación para evitar estados sin posibilidad práctica de continuación.
- Progresión experimental de criaturas épicas.

Algunas decisiones importantes fueron precisadas durante el diseño.

Por ejemplo, el crecimiento épico quedó vinculado a ganar un encuentro habiendo invocado la copia y conservándola con vida, no a conseguir eliminaciones.

También se distinguieron las escaramuzas contra grupos de criaturas de los combates contra jefes con vida de invocador.

Estas decisiones pertenecen al diseño del juego y están recogidas con mayor autoridad en su documentación específica.

La implementación se organizó en hitos y sufrió una interrupción por límite de uso.

Posteriormente se retomó el trabajo autorizado, sin necesidad de comenzar nuevamente desde cero.

El cierre técnico reportó:

- 102 pruebas aprobadas.
- 26 resultados satisfactorios sobre 27 expediciones experimentales comprobadas.
- Cuatro pruebas de recuperación extrema.
- Build satisfactorio.

El usuario recorrió la campaña y el ala de las ratas, probó las mecánicas relevantes y aceptó la versión funcional.

No se exigió que realizara manualmente todas las combinaciones extremas del sistema que ya habían sido exploradas mediante comprobaciones automatizadas.

**Resultado relevante para Factory:** el procedimiento pudo sostener una implementación extensa, con múltiples dependencias, continuidad después de una interrupción y aceptación humana final.

**Limitación:** las pruebas experimentales de balance y recuperación no constituían evidencia de equilibrio definitivo del juego.

### 6.3. Iteración de comodidad de combate y experiencia con Luna

**Referencias:**

- Implementación: `3c4f0d4229488169ac4dec22197574fbfa4036b8`
- Documentación: `dabc129c6958c8b2115e170102dba02d77ac3743`

Se realizó una iteración orientada a mejorar las interacciones del combate.

Entre sus objetivos se encontraban el robo aleatorio del mazo del jugador, la invocación por arrastre, nuevas interacciones de sacrificio y ataques, y una reducción de pasos manuales.

Esta intervención es importante también porque fue la experiencia específica en la que el usuario empleó Luna, a diferencia del resto de las implementaciones recientes realizadas principalmente con GPT-6.1 Sol.

La implementación cumplió los requisitos técnicos solicitados.

El cierre reportó 110 pruebas aprobadas y el usuario aceptó sus funcionalidades.

Sin embargo, durante la evaluación de la experiencia aparecieron limitaciones de coherencia global.

Persistían controles antiguos que ya no resultaban apropiados y algunas interacciones continuaban siendo poco cómodas.

Un ejemplo fue la permanencia de controles de ordenación manual de la baraja, cuya eliminación no había quedado suficientemente solicitada.

Esto no se interpretó como un fallo del modelo por desobedecer el encargo.

El usuario señaló que la implementación había satisfecho las tareas explícitas y que no correspondía exigirle decisiones globales de rediseño que no formaban parte de sus instrucciones.

**Resultado relevante para Factory:** una intervención puede cumplir sus verificaciones funcionales y, aun así, no conseguir una experiencia visual y de interacción completamente coherente.

**Interpretación histórica:** esta experiencia influyó en la preferencia del usuario por Sol para encargos amplios de diseño visual. No demuestra una superioridad universal de Sol sobre Luna.

También reforzó la conveniencia de distinguir encargos técnicos bien delimitados de encargos que requieren interpretar el diseño global del producto.

### 6.4. Rediseño integral de exploración y combate

**Referencia de cierre:** `a16c9c560335be109f11ffe58a258f27b82d9f13`

En una intervención posterior se abordó de manera más integral la presentación de la exploración y el combate.

El objetivo principal era reducir la sensación de estar utilizando una aplicación web compuesta por paneles.

Se buscó una presentación más propia de un videojuego.

La exploración pasó a ocupar el espacio visual principal, con controles e información contextual.

La colección se presentó como una interfaz superpuesta que podía abrirse y cerrarse sin abandonar la exploración.

El combate adoptó una composición de tablero más amplia, con adversarios y criaturas mejor distribuidos.

También se revisaron interacciones como:

- Invocación por arrastre.
- Selección de sacrificios y cancelación previa al paso irreversible.
- Selección de atacantes y objetivos.
- Bloqueos mediante arrastre.
- Representación de conexiones entre criaturas.
- Avance automático de fases cuando correspondía.
- Eliminación de controles anteriores innecesarios.

Codex organizó la intervención en los hitos A1–A6.

El resultado técnico reportado incluyó 160 pruebas aprobadas, comprobaciones espaciales, build y revisión independiente.

En esta ocasión la inspección automatizada completa de la interfaz renderizada no pudo realizarse debido a una restricción de confianza de Computer Use sobre la URL del navegador.

Codex informó esa limitación sin presentarla como una inspección visual completada.

El usuario realizó personalmente el playtesting previsto y comprobó las interacciones relevantes.

La evaluación fue satisfactoria y se aprobó definitivamente el rediseño.

Las pruebas humanas se realizaron principalmente en escritorio. La presentación móvil recibió una revisión orientativa mediante herramientas del navegador, sin constituir una validación completa en dispositivos móviles.

**Resultado relevante para Factory:** el procedimiento permitió realizar una transformación integral de interfaz, con pruebas técnicas y aceptación humana, incluso cuando no estuvo disponible una de las herramientas de inspección visual automática.

**Aprendizaje:** una revisión automatizada incompleta no obliga a cancelar una intervención si existen otras verificaciones apropiadas y la aceptación humana satisface los requisitos del alcance.

### 6.5. Primera transformación artística de la exploración 3D

**Referencia de cierre:** `54955677ec9430695b233c99a8fb4067b103a86d`

Una intervención posterior abordó directamente la presentación tridimensional de la mazmorra.

El RPG ya contaba con siete salas funcionales, pero sus escenarios y personajes tenían una apariencia muy geométrica y provisional.

Se buscó que las habitaciones presentaran identidades reconocibles y una atmósfera compartida de cripta gótica estilizada.

La transformación incluyó:

**Campaña principal**

- Umbral con portal gótico y accesos diferenciados.
- Catacumbas con sepulcros, nichos y luz fría.
- Cámara final con elementos funerarios y composición ceremonial.

**Ala de las ratas**

- Primera sala con señales de deterioro e invasión.
- Segunda sala con madrigueras y estructuras de madera.
- Tercera sala con nidos, acumulaciones y una identidad ambiental más ocupada.
- Cámara final con madriguera dominante y elementos propios de la Señora de las Ratas.

También se realizaron nuevas representaciones tridimensionales del protagonista y los adversarios.

Las figuras emplearon geometrías estilizadas y detalles proporcionales a la escala de la cámara.

No se incorporó un pipeline externo de modelado ni nuevas dependencias para resolver el encargo.

El informe técnico inicial registró 163 pruebas aprobadas y revisión independiente satisfactoria.

Codex consiguió inspeccionar las salas renderizadas y corregir algunos problemas visuales durante el desarrollo.

El usuario recorrió todos los niveles y evaluó positivamente el resultado artístico.

Observó que las zonas eran reconocibles, los enemigos suficientemente diferentes y el estilo gráfico apropiado para el objetivo del prototipo.

**Resultado artístico:** aprobado.

Sin embargo, durante el mismo playtesting aparecieron dos problemas que impedían cerrar la intervención completa.

### 6.6. Regresión de rendimiento y defecto visual en la exploración

Tras la transformación tridimensional, el usuario observó que el juego había perdido fluidez de manera considerable.

También identificó un pequeño bloque flotante que aparecía después de abandonar una sala y regresar.

El defecto no se presentaba normalmente en la primera entrada.

Esto resultó especialmente relevante porque el proyecto contemplaba incorporar en el futuro criaturas tridimensionales asociadas a las cartas durante el combate.

El rendimiento de la exploración actual era, por tanto, una preocupación práctica antes de continuar aumentando la complejidad gráfica.

Se decidió conservar la aprobación artística y solicitar una estabilización técnica limitada, sin reabrir el diseño visual ni modificar las mecánicas.

#### Diagnóstico reportado por Codex

La escena generaba un coste elevado debido a numerosas piezas arquitectónicas con envíos de dibujo y sombras independientes.

También se identificó un coste relevante del supersampling en el navegador observado, que utilizaba Microsoft Basic Render Driver por software.

El defecto del bloque flotante procedía de la inicialización de instancias del suelo.

Cuando cambiaba la paleta visual, el lote se reconstruía sin reinicializar correctamente las transformaciones.

Como consecuencia, 168 baldosas terminaban superpuestas, produciendo la geometría visible inesperada.

#### Correcciones realizadas

Codex agrupó piezas estáticas compatibles, reduciendo la cantidad de llamadas de dibujo.

También ajustó el DPR a 1, manteniendo antialiasing y el encuadre.

Se corrigió la inicialización de las transformaciones del suelo.

La revisión detectó adicionalmente un caso en el que determinadas piedras debían conservarse como objetos individuales para mantener correctamente sus normales de sombra.

Ese ajuste también fue aplicado.

#### Mediciones reportadas

Las mediciones principales se realizaron con la misma cámara y un área CSS de 1024 × 768.

| Sala | Draw calls antes | Draw calls después | FPS antes | FPS después |
|---|---:|---:|---:|---:|
| Umbral | 329 | 197 | 20–22 | 33,2 |
| Catacumbas | 502 | 178 | 20,9 | 33,3 |
| R4 | 576 | 238 | 19,1 | 33,8 |

El framebuffer pasó de 1280 × 960 a 1024 × 768.

Como referencia histórica, la versión anterior a la transformación artística había registrado aproximadamente 30,6 FPS en el umbral, dentro del entorno observado.

Estas cifras no deben interpretarse como garantías de rendimiento en otras máquinas.

Tampoco corresponden al código posterior al último ajuste de normales de sombra, que no pudo volver a medirse mediante Computer Use.

#### Verificaciones y aceptación

El cierre técnico posterior registró:

- 167 pruebas aprobadas.
- Comprobaciones espaciales de las siete salas.
- Build y preflight satisfactorios.
- Revisión independiente sin hallazgos pendientes.
- Comprobaciones de retorno entre habitaciones y ausencia del bloque flotante.

El usuario realizó un nuevo playtesting.

Confirmó que el bloque ya no aparecía y que la exploración se sentía nuevamente estable, sin la ralentización considerable que había observado inicialmente.

La aprobación del rendimiento fue cualitativa y humana, no una medición instrumental adicional.

La transformación artística y su estabilización se cerraron conjuntamente.

**Resultado relevante para Factory:** Codex consiguió producir escenarios 3D estilizados, identificar posteriormente costes de renderizado y corregir problemas específicos conservando la identidad artística aprobada.

**Límite de la conclusión:** esta experiencia no demuestra que el sistema pueda soportar cualquier incremento futuro de detalle o todas las invocaciones tridimensionales previstas para las cartas.

La incorporación de esos modelos continúa siendo un desafío de implementación independiente.

### 6.7. Comerciante Medieval como segundo proyecto

**Referencia del último cierre anterior a la reorganización:** `737fea910ae0461eabf2520d365cbb49035b1cd5`

Comerciante Medieval constituye un segundo caso relevante para evaluar Game Factory fuera del RPG.

Su documentación de cierre describe una demo sandbox comercial medieval, con pueblos, familias, negocios, mercancías, producción, consumo, inventarios, comercio y simulación económica.

El desarrollo acumuló iteraciones identificadas hasta ITER-10.

El cierre de juego registró 51 pruebas, build y aceptación humana.

La reorganización documental posterior detectó que algunas referencias originales habían quedado desactualizadas.

Por ejemplo, el README todavía describía una modalidad anterior de interacción comercial, mientras el juego ya había incorporado comercio directo por clic.

La especificación vigente también debía interpretar las decisiones posteriores junto a los requisitos iniciales.

**Resultado relevante para Factory:** el uso de la misma estructura de desarrollo en un segundo juego contribuyó a comprobar su aplicabilidad en un dominio diferente.

**Limitación de esta reconstrucción:** este informe no dispone del detalle completo de cada intervención de Comerciante Medieval. Las observaciones citadas proceden principalmente de la documentación y del informe de reorganización compartido posteriormente.

No deben inventarse conclusiones específicas sobre su balance económico o sobre cada iteración.

---

## 7. Experiencias con modelos

### 7.1. Uso predominante de GPT-6.1 Sol

El usuario aclaró expresamente que, durante las implementaciones recientes consideradas en esta etapa, utilizó GPT-6.1 Sol de forma predominante.

La excepción identificada fue una intervención de controles e interacciones del RPG ejecutada con Luna.

Esta precisión es importante porque en algunas conversaciones se recomendaron diferentes configuraciones, pero una recomendación no constituye evidencia de uso efectivo.

Los resultados favorables de las principales transformaciones visuales, de la implementación extensa de gameplay y de la estabilización 3D pertenecen a experiencias realizadas principalmente con Sol.

### 7.2. Observaciones comparativas

El usuario percibió que Sol ofrecía buenos resultados cuando debía interpretar objetivos amplios y tomar decisiones de implementación relativamente autónomas.

En la experiencia puntual con Luna, se consiguió cumplir el alcance técnico, pero posteriormente se detectó que la interfaz necesitaba una reorganización más integral.

Estas observaciones influyeron en las preferencias de selección de modelo.

No constituyen un ensayo controlado.

Las tareas, instrucciones, condiciones y criterios de evaluación no fueron idénticos.

Por tanto, no permiten determinar una superioridad general de un modelo sobre otro.

### 7.3. Importancia atribuida a la capacidad del modelo

Una conclusión estratégica del usuario fue que, una vez alcanzada una arquitectura funcional suficientemente buena, mejorar la capacidad del modelo empleado podía aportar más valor práctico que seguir incorporando complejidad arquitectónica.

Esta valoración surgió de experiencias reales satisfactorias con una estructura que no había sido rediseñada constantemente.

Se decidió no perseguir nuevas capas de agentes o procedimientos solamente porque fueran técnicamente posibles.

**Clasificación:** interpretación estratégica del usuario respaldada por la experiencia, no medición cuantitativa de la contribución relativa entre modelo y arquitectura.

---

## 8. Incidentes operativos y soluciones

### 8.1. Restricciones de confianza de Git

En una etapa del desarrollo se produjo un bloqueo relacionado con la propiedad y confianza del repositorio.

El proceso que ejecutaba determinadas operaciones Git no coincidía con el propietario registrado de la carpeta del repositorio.

Git aplicó sus protecciones de confianza y rechazó algunas operaciones.

La solución consistió en autorizar específicamente la ruta de ese repositorio mediante `safe.directory`.

No se adoptó una autorización global indiscriminada de todos los repositorios.

**Estado histórico:** problema resuelto para el entorno afectado.

**Aprendizaje:** las restricciones del entorno de ejecución pueden afectar el cierre de una implementación aunque el código del videojuego y sus pruebas funcionen correctamente.

### 8.2. Problemas de formato durante commits

Durante cierres anteriores aparecieron problemas triviales de formato, particularmente líneas vacías sobrantes al final de archivos nuevos.

Las comprobaciones tradicionales sobre diferencias de archivos versionados no siempre cubrían adecuadamente los archivos nuevos todavía sin seguimiento.

Esto obligó a realizar correcciones y repetir pasos del procedimiento seguro.

El problema motivó una mejora específica.

### 8.3. Incorporación del preflight de formato

**Commit:** `eb6a165be40197937096435204df76c45763bbfe`

Se implementó un preflight preventivo ejecutado antes del procedimiento seguro de commit.

Su objetivo era detectar problemas de formato en las rutas explícitamente autorizadas, incluidas altas nuevas.

La corrección automática debía limitarse a situaciones inequívocas, evitando alterar cadenas, fixtures o contenidos cuya modificación pudiera afectar su significado.

El cierre técnico reportó 14 pruebas aprobadas.

La herramienta fue utilizada satisfactoriamente en cierres posteriores.

**Resultado:** se incorporó una capacidad preventiva concreta sin sustituir el ejecutor seguro.

**Limitación:** las primeras experiencias positivas no demuestran que todos los problemas futuros de formato estén cubiertos.

### 8.4. Interrupciones por cuota

Varios trabajos extensos sufrieron interrupciones por límites de uso.

Esto ocurrió durante implementaciones complejas y durante actividades de inspección visual.

En algunas ocasiones, los agentes habían completado tareas parciales, pero no se disponía todavía de evidencia suficiente para afirmar que todos los hitos estaban integrados.

La estrategia de continuación consistió en recuperar el estado real del repositorio, los informes disponibles y los registros de continuidad antes de iniciar trabajos nuevos.

Se procuró evitar:

- Duplicar agentes.
- Repetir planificación aprobada.
- Sobrescribir modificaciones parciales.
- Confundir una tarea iniciada con una tarea terminada.
- Reejecutar verificaciones innecesariamente.

Las implementaciones lograron reanudarse y completarse.

**Resultado:** se obtuvo evidencia favorable de continuidad operativa tras interrupciones.

**Limitación:** no existió una garantía de reanudación automática; la intervención del usuario siguió siendo necesaria para iniciar algunas sesiones.

### 8.5. Limitaciones de inspección visual automatizada

Durante distintas iteraciones aparecieron obstáculos relacionados con herramientas de navegador.

Entre ellos figuraron dificultades de disponibilidad o configuración de herramientas de Playwright y detenciones de Computer Use por no poder verificar con confianza la URL de Chrome.

En otras sesiones, Computer Use consiguió interactuar con la demo, capturar imágenes e inspeccionar habitaciones renderizadas.

No existió, por tanto, una disponibilidad uniforme de inspección visual durante todas las intervenciones.

Se mantuvo el criterio de no presentar como inspección real aquello que solo había sido comprobado mediante código, SSR, CSS o pruebas automatizadas.

Cuando la inspección automática no estaba disponible, se utilizaban las verificaciones técnicas posibles y posteriormente el playtesting humano.

**Aprendizaje:** la disponibilidad de una herramienta de inspección no debe confundirse con la validez de sus resultados ni con la calidad visual del producto.

### 8.6. El ejecutor seguro no admitía eliminaciones versionadas

Durante la reorganización documental de octubre de 2026 apareció una limitación diferente del ejecutor seguro.

La migración requería registrar la eliminación de 21 rutas previamente versionadas.

El ejecutor validaba las rutas suponiendo que todas debían existir como archivos regulares en el árbol de trabajo.

Por ello, rechazaba eliminaciones legítimas.

El preflight tenía una limitación semejante.

No era adecuado resolverlo preparando manualmente el índice antes de invocar el ejecutor, porque el propio mecanismo rechazaba un índice que ya contuviera modificaciones preparadas.

Tampoco se quería eludir los controles mediante un procedimiento paralelo.

#### Solución aprobada

Se amplió de manera acotada la validación para distinguir entre:

1. Archivos existentes, correspondientes a altas o modificaciones.
2. Rutas ausentes que Git confirma exactamente como archivos regulares previamente versionados.
3. Rutas ausentes sin respaldo verificable, que continúan siendo inválidas.

La solución incorporó comprobaciones de rutas, ausencia de enlaces simbólicos, modos de archivo, coincidencia entre HEAD e índice, y revalidación antes y después del staging.

Se conservaron las protecciones principales del ejecutor, incluidas la necesidad de rutas explícitas, el rechazo de staging previo y la comprobación exacta de los cambios confirmados.

No se creó una herramienta alternativa de commit.

**Commit técnico:** `a773dff6f5314bb1c28eda7fef401e4a256fbbd2`

El cierre reportó 38 pruebas aprobadas e integración con Git real mediante repositorios temporales.

También se actualizó y comprobó la copia instalada del ejecutor y su referencia de integridad.

La herramienta corregida permitió completar la migración documental.

**Resultado relevante:** una limitación operativa real motivó una ampliación mínima, verificable y compatible con el modelo de seguridad existente.

---

## 9. Decisiones arquitectónicas y criterios adoptados

Esta sección distingue decisiones expresas de interpretaciones obtenidas durante las implementaciones.

### 9.1. Mantener al usuario como autoridad de producto

El usuario conserva la decisión sobre identidad, mecánicas, dirección artística, alcance y aceptación.

Codex puede elegir soluciones convencionales de implementación dentro de los requisitos autorizados.

No debe convertir una decisión técnica en una modificación implícita del diseño aprobado.

Este criterio se aplicó tanto a los videojuegos como a los cambios internos de Factory.

### 9.2. Permitir ejecución autónoma de trabajos aprobados

Se favoreció que Codex ejecutara secuencias completas de tareas sin solicitar aprobación rutinaria por cada hito.

Las consultas se reservan para decisiones que alteren materialmente el alcance, compromisos relevantes o impedimentos reales.

La experiencia mostró que este enfoque podía reducir la coordinación manual sin eliminar el control humano.

### 9.3. No convertir cada problema en una nueva regla general

En varias ocasiones se consideró si un problema observado justificaba modificar el workflow de manera permanente.

El usuario rechazó generalizaciones que podían introducir complejidad o afectar tareas de otra naturaleza.

Por ejemplo, una limitación de criterio visual durante una implementación técnica no justificaba exigir una inspección visual completa en todos los cambios futuros.

La orientación final fue resolver problemas específicos y modificar las reglas generales solamente cuando existiera una justificación suficientemente amplia.

### 9.4. No imponer una política general de respuestas breves o ahorro de contexto

Durante la preparación de asistentes especializados surgió la posibilidad de introducir reglas para conservar contexto.

El usuario decidió no establecer una instrucción general que pudiera empujar al asistente a responder con menos profundidad o evitar investigaciones necesarias.

Se prefirió reducir trabajo innecesario mediante una práctica más concreta: comprender primero el problema y evaluar las opciones antes de proponer una solución.

La calidad y veracidad de la respuesta tenían prioridad sobre una reducción indiscriminada de contexto.

### 9.5. Evitar complejidad arquitectónica anticipada

No se consideró necesario crear nuevos agentes, skills o capas de coordinación para cada dificultad encontrada.

Se favoreció reutilizar los componentes existentes y resolver problemas dentro de la escala real de Factory.

Esta decisión no equivale a rechazar toda ampliación futura.

Implica exigir una necesidad observable y una mejora proporcional.

### 9.6. Separar validación técnica y aceptación humana

Las pruebas automatizadas permiten verificar comportamientos específicos.

La revisión independiente puede detectar problemas técnicos o inconsistencias de implementación.

El playtesting humano permite valorar comodidad, claridad, presentación y experiencia real.

Ninguna de estas formas de validación sustituye automáticamente a las demás.

Las intervenciones del RPG mostraron casos donde las pruebas técnicas resultaron satisfactorias, pero el usuario identificó problemas visuales o de rendimiento.

### 9.7. Mantener procedimientos de cierre seguros

Los commits deben realizarse mediante mecanismos autorizados, con rutas explícitas y preservación de archivos ajenos.

No se debe utilizar un workaround de staging o permisos que eluda los controles de seguridad.

La experiencia de los cierres confirmó la importancia de distinguir los archivos autorizados de los materiales preexistentes sin seguimiento.

### 9.8. No iniciar rediseños estructurales sin evidencia

Tras varias implementaciones exitosas, el usuario consideró que la arquitectura principal ya satisfacía sus necesidades.

Se decidió priorizar su utilización.

Los cambios futuros deberían enfocarse preferentemente en necesidades observadas, como ocurrió con el preflight y el soporte para eliminaciones versionadas.

Esta decisión fue uno de los principales resultados estratégicos del período.

---

## 10. Experimentos y antecedentes cuya evidencia es limitada

No todas las actividades tempranas quedaron documentadas con el mismo nivel de detalle que las implementaciones posteriores.

### 10.1. Piloto multiagente TypeScript

Durante una etapa anterior existió un piloto experimental identificado como:

`experiments/multiagent-ts-pilot/`

El material conocido incluía archivos TypeScript, configuración y una prueba asociada a una función `clamp`.

Durante varios cierres se conservó expresamente como material preexistente sin seguimiento.

Posteriormente, durante la reorganización documental, se comprobó que no tenía consumidores operativos y se autorizó eliminar el directorio.

El piloto no fue incorporado al historial Git durante esa limpieza.

Los antecedentes disponibles permiten afirmar que existió como experimento y que no se consideró necesario mantenerlo operativo.

Sin embargo, no son suficientes para reconstruir con certeza todos sus objetivos originales, procedimientos, resultados o conclusiones.

No corresponde atribuirle resultados experimentales no conservados.

Si posteriormente se recuperan registros de su ejecución, podrán incorporarse como antecedentes históricos complementarios.

### 10.2. Propuestas de arquitectura anteriores

Los documentos históricos de contexto y configuración de Factory conservan parte de las propuestas y decisiones tempranas.

Su existencia permite rastrear etapas de planificación anteriores al workflow consolidado.

Este informe no reproduce ni atribuye aprobación a todas esas propuestas.

Cuando sea necesario comprender por qué se eligió un componente concreto, deben consultarse los documentos históricos originales y los commits relacionados.

### 10.3. Referencias visuales conceptuales

Durante el diseño del RPG se utilizaron imágenes conceptuales de ambientes, personajes y mapas.

Estas referencias permitieron comunicar ideas y reconocer elementos deseados, pero no constituían una identidad visual definitiva.

Se observó que algunas imágenes tenían una apariencia genérica de arte digital generado por IA y no presentaban todavía un lenguaje artístico unificado.

Por ello, su valor principal era orientativo.

No deben confundirse con diseños finales aprobados, modelos existentes en el juego ni contratos exactos de implementación.

---

## 11. Reorganización documental de octubre de 2026

### 11.1. Problema identificado

A medida que crecieron Game Factory y sus videojuegos, la documentación acumuló materiales de distintos proyectos y etapas.

En la raíz de `docs/` convivían referencias de Factory, especificaciones de juegos, informes, diseños y documentación histórica.

Los nombres seguían convenciones diferentes.

Además, algunas especificaciones originales habían sido modificadas por decisiones posteriores, dificultando identificar cuál era la referencia correcta para continuar el desarrollo.

El problema principal no era solamente la cantidad de documentos.

Era la ausencia de una separación suficientemente clara entre:

- Información vigente.
- Información histórica.
- Instrucciones operativas.
- Continuidad de trabajo.
- Documentación específica de cada videojuego.

### 11.2. Auditoría previa

Se solicitó a Codex una auditoría documental de solo lectura.

La auditoría inicial reportó 24 archivos Markdown, de los cuales 23 estaban versionados y uno permanecía sin seguimiento.

También identificó recursos documentales adicionales: tres PNG, tres CSV y un XLSX.

Se revisaron 129 enlaces Markdown locales sin encontrar destinos inexistentes.

Se identificaron dependencias entre documentos y archivos operativos, incluidos `AGENTS.md`, skills, workflow y herramientas.

También se comprobó que el generador de proyectos dependía de patrones textuales del README de la plantilla.

Esto hacía inadecuado mover o editar documentos indiscriminadamente.

### 11.3. Decisión organizativa

Se aprobó organizar la documentación por ámbito.

La documentación transversal permanecería en `docs/factory/`.

La documentación de cada videojuego quedaría dentro de su propio proyecto.

Las referencias vigentes tendrían nombres estandarizados.

Los materiales anteriores quedarían en directorios históricos cuando hubieran sido sustituidos.

No se crearían agentes ni workflows adicionales para administrar esta organización.

### 11.4. Documentos vigentes de los videojuegos

Se establecieron tres referencias principales:

**`status.md`**

Describe el estado efectivamente implementado del videojuego.

Su función es permitir comprender el juego, sus sistemas, contenido, desarrollo y limitaciones sin reconstruir todas las iteraciones anteriores.

**`spec-v1.md`**

Consolida requisitos y decisiones aprobadas que siguen siendo aplicables.

No debe confundir el comportamiento encontrado en el código con una nueva aprobación de diseño.

**`implementation-plan.md`**

Funciona como punto de continuidad del desarrollo.

Conserva las decisiones aplicables, el estado actual de las implementaciones y las referencias a los cierres anteriores.

Los planes originales se archivaron para preservar el historial.

El README de cada juego quedó como entrada práctica para ejecutar el proyecto, conocer sus controles y localizar la documentación.

### 11.5. Documentación vigente de Factory

Se estableció una separación entre:

**`overview.md`**

Explica qué es Game Factory, qué permite hacer, cómo se organiza y cuáles son sus componentes principales.

**`status.md`**

Describe sus capacidades y limitaciones vigentes.

**`workflow-v1.md`**

Mantiene la autoridad operativa y las reglas de ejecución.

La reorganización no convirtió el historial en nuevas instrucciones para Codex.

### 11.6. Actualización de referencias

Se modificaron los enlaces y rutas necesarios para que los documentos y herramientas siguieran utilizando las ubicaciones correctas.

También se actualizó `AGENTS.md` para evitar que el RPG apareciera como proyecto activo permanente.

El proyecto de trabajo debe determinarse según la tarea autorizada.

Se incorporaron convenciones documentales mínimas al workflow existente.

No se creó una nueva arquitectura de gestión documental.

### 11.7. Limpieza de materiales residuales

Después de revisar la estructura resultante, el usuario identificó carpetas y archivos que ya no tenían utilidad operativa.

Se autorizó eliminar el antiguo piloto experimental sin seguimiento, directorios vacíos residuales de `docs/design/` y un documento temporal de traspaso del RPG.

El documento temporal había sido preparado para una conversación anterior y correspondía a un estado del juego que ya había sido superado.

Codex informó que su contenido histórico relevante estaba respaldado por materiales conservados y por Git.

Es importante distinguir esta limpieza de la preservación realizada en cierres anteriores.

Durante las primeras intervenciones, esos archivos sin seguimiento se mantuvieron intactos porque no pertenecían al alcance autorizado.

Su eliminación posterior se realizó mediante una autorización nueva y específica.

### 11.8. Cierre documental

La reorganización concluyó mediante el commit:

`de96b203fc2165580e8a14053c821e4300ed93ff`

El informe final reportó:

- Referencias documentales reorganizadas.
- Estados y especificaciones consolidados.
- Historial preservado.
- Instrucciones operativas actualizadas.
- 215 enlaces locales válidos en la última comprobación.
- Revisión independiente aprobada.
- Árbol Git limpio.
- Ausencia de push.

Estas verificaciones corresponden al trabajo documental.

No implican que se hayan realizado nuevos playtests completos de los videojuegos.

---

## 12. Estado de referencia al 28 de octubre de 2026

Esta sección constituye una fotografía histórica.

No debe utilizarse automáticamente como descripción vigente en fechas posteriores.

### 12.1. Arquitectura

Game Factory mantiene una arquitectura principal basada en Codex, instrucciones del repositorio, agentes especializados, skills y herramientas de apoyo.

El usuario la considera satisfactoria para las necesidades actuales.

No se encuentra autorizado un nuevo rediseño general de la arquitectura multiagente.

### 12.2. Procedimiento de implementación

El procedimiento contempla planificación por hitos, ejecución dentro de un alcance autorizado, pruebas, revisión, continuidad y cierre.

Las decisiones de producto y la aceptación final siguen correspondiendo al usuario.

### 12.3. Organización documental

La documentación general se encuentra en `docs/factory/`.

Los videojuegos mantienen sus referencias vigentes e históricas dentro de sus propios directorios.

Los documentos históricos de Factory se conservan en `docs/factory/history/`.

### 12.4. Herramientas Git

El preflight permite detectar determinados problemas de formato antes del cierre.

El ejecutor seguro admite altas, modificaciones y bajas versionadas verificadas mediante rutas explícitas.

Sus controles de seguridad continúan siendo parte del procedimiento.

### 12.5. Videojuegos

Los dos proyectos documentados son:

- Duelo en la cripta (`projects/juego-cartas/`).
- Comerciante Medieval (`projects/comerciante-medieval/`).

Ambos cuentan con documentos de estado, especificaciones consolidadas y planes de continuidad.

### 12.6. Repositorio

El último cierre reportado fue:

`de96b203fc2165580e8a14053c821e4300ed93ff`

Codex informó que el árbol de trabajo estaba limpio, el índice vacío y que no se había realizado push.

Este dato corresponde únicamente al cierre documentado.

### 12.7. Orientación futura

El usuario desea continuar utilizando Game Factory principalmente para desarrollar videojuegos.

Las mejoras arquitectónicas deberán justificarse por necesidades concretas.

No se encuentra autorizado automáticamente ningún nuevo hito de implementación por el hecho de mencionarse como posibilidad en este informe.

---

## 13. Hallazgos transversales

Los casos anteriores permiten formular conclusiones acotadas.

### 13.1. La autonomía se evaluó mediante implementaciones reales

El principal respaldo de la arquitectura no provino de una comparación teórica de configuraciones multiagente.

Provino de haber desarrollado funcionalidades, corregido errores, producido interfaces y completado iteraciones extensas.

Estas experiencias fueron suficientes para que el usuario considerara satisfactorio el procedimiento.

### 13.2. La calidad del modelo influye de forma importante

Las implementaciones recientes realizadas principalmente con Sol produjeron resultados favorables.

Esto respaldó la preferencia práctica del usuario por utilizar modelos capaces antes que continuar ampliando la arquitectura sin una necesidad concreta.

Sin embargo, no existe evidencia experimental suficiente para cuantificar el peso relativo de cada factor.

### 13.3. Los requisitos claros y la autonomía no son incompatibles

Las intervenciones más satisfactorias combinaron objetivos explícitos, restricciones relevantes y libertad para tomar decisiones técnicas dentro del alcance.

La experiencia no demuestra que todos los encargos deban tener el mismo nivel de especificación.

Sí muestra que es útil distinguir aquello que debe decidir el usuario de aquello que puede resolver Codex.

### 13.4. La validación técnica no sustituye la evaluación del producto

Se observaron problemas que no quedaron resueltos por pruebas automatizadas satisfactorias.

Entre ellos, la coherencia global de determinadas interfaces y el rendimiento perceptible de la exploración 3D.

El playtesting humano permitió detectar y evaluar estas dificultades.

### 13.5. Una corrección puntual puede ser preferible a un rediseño

El preflight, la ampliación del ejecutor para bajas versionadas y la estabilización de las escenas 3D fueron respuestas a problemas concretos.

En ninguno de estos casos fue necesario sustituir toda la arquitectura existente.

La experiencia favorece una estrategia de mantenimiento incremental.

### 13.6. La continuidad importa durante trabajos extensos

Las interrupciones por cuota no impidieron completar implementaciones importantes cuando existían estados recuperables y una organización adecuada de los hitos.

La capacidad de continuar desde trabajo ya realizado redujo la necesidad de reconstruir decisiones anteriores.

### 13.7. La documentación debe distinguir autoridad y vigencia

Una especificación antigua puede conservar un valor histórico importante sin representar las reglas actuales de un juego.

Un informe técnico puede ser una evidencia válida de una ejecución pasada sin demostrar el estado presente.

La reorganización documental buscó hacer explícitas esas diferencias.

### 13.8. La Factory debe servir a los videojuegos

Esta es la conclusión estratégica principal del período.

La infraestructura, los procedimientos y la documentación son medios para facilitar el desarrollo de juegos.

Una vez que funcionan satisfactoriamente, seguir incrementando su complejidad puede dejar de ser prioritario.

La decisión fue continuar desarrollando productos y mejorar la infraestructura cuando aparezcan razones concretas.

---

## 14. Limitaciones conocidas y asuntos no demostrados

Este informe no debe interpretarse como certificación completa del sistema.

Quedan limitaciones importantes de la evidencia.

**Capacidad gráfica futura**

La transformación 3D y su estabilización fueron satisfactorias, pero todavía no se ha demostrado que el juego pueda incorporar todas las criaturas tridimensionales proyectadas para los combates manteniendo el mismo nivel de fluidez.

**Rendimiento en distintos equipos**

Las mediciones históricas proceden de un entorno específico.

La percepción humana posterior de estabilidad fue satisfactoria, pero no reemplaza una evaluación sistemática en hardware diferente.

**Comparación de modelos**

Las experiencias con Sol y Luna no fueron controladas ni equivalentes.

No permiten clasificar universalmente sus capacidades.

**Balance de videojuegos**

Los sistemas de progresión, recuperación y economía incluyen parámetros experimentales.

Las verificaciones funcionales no demuestran equilibrio definitivo.

**Experimentos tempranos**

El historial disponible no permite reconstruir con certeza todos los resultados del piloto multiagente y de otras evaluaciones iniciales.

**Estado futuro de Factory**

El hecho de que la arquitectura estuviera aprobada el 28 de octubre de 2026 no implica que deba permanecer sin cambios indefinidamente.

**Disponibilidad de evidencias**

Algunos archivos temporales, capturas y materiales externos mencionados durante el desarrollo no están conservados directamente en este informe.

No se reconstruyen artificialmente.

---

## 15. Referencias principales y trazabilidad

Los siguientes commits permiten localizar hitos importantes de la evolución documentada.

| Commit | Referencia histórica |
|---|---|
| `caf6309770148eeab65dbc988b5f592e36fc7a22` | Etapa inicial de Factory, plantilla, generador y prototipo RPG |
| `2d477ff9ef793a8754f24826f763ade53b10b29f` | Primera transformación visual de interfaz del RPG |
| `f401a0ed719d7b61cc41d95b789389e3df8813eb` | Ampliación de gameplay y expedición del RPG |
| `3c4f0d4229488169ac4dec22197574fbfa4036b8` | Iteración funcional de controles de combate |
| `dabc129c6958c8b2115e170102dba02d77ac3743` | Cierre documental asociado a dicha iteración |
| `eb6a165be40197937096435204df76c45763bbfe` | Incorporación del preflight preventivo de formato |
| `a16c9c560335be109f11ffe58a258f27b82d9f13` | Rediseño integral de exploración y combate |
| `54955677ec9430695b233c99a8fb4067b103a86d` | Transformación artística 3D y estabilización |
| `737fea910ae0461eabf2520d365cbb49035b1cd5` | Último cierre conocido de Comerciante Medieval anterior a la migración |
| `a773dff6f5314bb1c28eda7fef401e4a256fbbd2` | Soporte seguro para eliminaciones versionadas |
| `de96b203fc2165580e8a14053c821e4300ed93ff` | Reorganización y consolidación documental |

Los identificadores abreviados deben comprobarse contra el historial Git antes de utilizarse como referencias técnicas exactas.

### 15.1. Documentos históricos relacionados

En el estado reportado al 28 de octubre de 2026, la ubicación `docs/factory/history/` incluía:

- [`00-contexto-comun.md`](00-contexto-comun.md)
- [`01-chat-configuracion-factory.md`](01-chat-configuracion-factory.md)
- [`status-2026-10-27.md`](status-2026-10-27.md)

Estos archivos conservan antecedentes de etapas anteriores.

Su contenido no debe interpretarse automáticamente como instrucción vigente.

### 15.2. Documentación de juegos

Las referencias vigentes se encuentran en:

- [`projects/juego-cartas/docs/status.md`](../../../projects/juego-cartas/docs/status.md)
- [`projects/juego-cartas/docs/spec-v1.md`](../../../projects/juego-cartas/docs/spec-v1.md)
- [`projects/juego-cartas/docs/implementation-plan.md`](../../../projects/juego-cartas/docs/implementation-plan.md)
- [`projects/comerciante-medieval/docs/status.md`](../../../projects/comerciante-medieval/docs/status.md)
- [`projects/comerciante-medieval/docs/spec-v1.md`](../../../projects/comerciante-medieval/docs/spec-v1.md)
- [`projects/comerciante-medieval/docs/implementation-plan.md`](../../../projects/comerciante-medieval/docs/implementation-plan.md)

Los directorios `history/` de cada proyecto conservan especificaciones, planes y otros documentos anteriores.

Este informe transversal no reemplaza esas fuentes.

### 15.3. Verificación al incorporar el informe

Antes de incorporar este archivo al repositorio, conviene que Codex compruebe la existencia de los commits y documentos citados.

Si encuentra errores de referencia, puede identificarlos para su corrección sin modificar retroactivamente los hechos documentados.

La integración no requiere reabrir los trabajos ya aceptados ni modificar las capacidades de Game Factory.

**Nota de incorporación — 28 de octubre de 2026.** Las comprobaciones siguientes corresponden exclusivamente a esta incorporación documental y se distinguen de los resultados históricos narrados:

- El punto de partida fue `HEAD de96b203fc2165580e8a14053c821e4300ed93ff`, con árbol de trabajo e índice limpios y sin archivos sin seguimiento. No se encontró un informe equivalente en el archivo histórico de Factory.
- Se verificaron los once commits de la tabla: existen como commits y son antecesores de `HEAD` o el propio `HEAD`. Sus fechas y asuntos son coherentes con los hitos citados: prototipo inicial el 22 de octubre; ITER-10 de Comerciante Medieval el 24; primera transformación visual del RPG el 26; gameplay, controles, preflight, rediseño integral y cierre 3D el 27; corrección del ejecutor y reorganización documental el 28. La corrección técnica precede al cierre documental. Se expandió `eb6a165` a su identificador completo verificado.
- Se comprobaron las rutas de los documentos vigentes e históricos citados y la presencia del generador, los perfiles, las dos skills y las herramientas Git existentes. Los registros de continuidad del RPG, su plan histórico, los informes de expedición y el plan de Comerciante Medieval respaldan los cierres y las cifras históricas principales. Esa consulta no equivale a reejecutar sus verificaciones ni a acreditar de nuevo cada paso de las revisiones o aceptaciones originales.
- El recuento de enlaces Markdown locales en los archivos versionados del corte inicial fue 215; coincide con la cifra del informe final citado. El registro de Factory distingue 208 en la migración principal. Son referencias a momentos distintos; este recuento no constituye una nueva validación de todos aquellos destinos. En esta incorporación se comprobaron los 28 enlaces locales del informe y del README modificado, todos con destinos existentes. El preflight de formato pasó sobre ambos archivos explícitos, sin tocar el índice.
- No se detectaron errores factuales evidentes ni discrepancias relevantes en las referencias contrastadas. El uso efectivo de modelos, las interrupciones de cuota y otros antecedentes conversacionales conservan la procedencia declarada en la sección 1.1; Git no permite corroborarlos por sí solo. Las rutas eliminadas del piloto y de `docs/design/` permanecen como menciones históricas, no como enlaces a archivos actuales.
- Los ajustes editoriales se limitan a formato Markdown, enlaces locales, el identificador completo del preflight y las marcas de estado, ubicación y final del documento para reflejar la aprobación del contenido. Esta nota registra las comprobaciones de incorporación sin cambiar las interpretaciones ni las decisiones atribuidas al usuario.
- No se repitieron pruebas de videojuegos, builds, mediciones de rendimiento ni playtesting. No se modificaron instrucciones operativas, especificaciones, planes, código ni herramientas. La entrega queda sin staging, commit ni push, preparada para la revisión final del usuario.

---

## 16. Balance final de la etapa

La evolución de Game Factory durante octubre de 2026 permitió pasar de un procedimiento que requería una coordinación manual importante a un entorno de trabajo con mayor autonomía práctica.

El sistema pudo utilizarse para implementaciones de gameplay, transformaciones visuales, desarrollo tridimensional, correcciones de rendimiento y tareas documentales.

Durante ese proceso aparecieron limitaciones técnicas y operativas.

Algunas exigieron intervenciones específicas, como el preflight, la corrección del ejecutor seguro y las optimizaciones de renderizado.

Otras fueron limitaciones de herramientas externas o de las condiciones de ejecución, como los topes de uso y la disponibilidad irregular de inspección visual automatizada.

Los resultados fueron suficientemente satisfactorios para que el usuario considerara validada la arquitectura principal.

Esta evaluación no significa que todos los componentes sean óptimos ni que se hayan eliminado todos los riesgos.

Significa que **Game Factory alcanzó un nivel de utilidad real que permite priorizar el desarrollo de videojuegos sobre la investigación continua de nuevas arquitecturas**.

La reorganización documental posterior respondió a una necesidad surgida de ese mismo crecimiento: preservar decisiones, mantener referencias vigentes y separar el historial de las instrucciones operativas.

Al cierre del 28 de octubre de 2026, el proyecto disponía de una organización documental renovada, herramientas de commit actualizadas y dos videojuegos con referencias consolidadas.

El siguiente desafío de Game Factory no consiste necesariamente en incorporar más agentes, reglas o procedimientos.

Consiste en continuar desarrollando videojuegos, observar los problemas reales que aparezcan y realizar mejoras proporcionadas cuando estén justificadas.

**La principal conclusión histórica es que una arquitectura relativamente estable, combinada con modelos capaces, encargos bien delimitados, autonomía técnica y aceptación humana, permitió obtener resultados prácticos satisfactorios.**

Este informe conserva la evidencia y los antecedentes de esa etapa para que puedan consultarse en el futuro sin depender de la conversación que los originó.

---

**Fin del informe histórico aprobado — Corte: 28 de octubre de 2026.**
