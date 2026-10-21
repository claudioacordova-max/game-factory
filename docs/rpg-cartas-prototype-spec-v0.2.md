# RPG de invocaciones y duelos de cartas
## Especificación funcional del primer prototipo

**Versión:** 0.2 — Aprobada para planificación técnica  
**Fecha:** 21 de octubre de 2026  
**Proyecto:** AI Game Factory  
**Estado:** Aprobada por el diseñador; pendiente de planificación técnica

---

## 1. Visión del juego

RPG centrado en la exploración de mazmorras, colección de invocaciones, construcción de barajas y duelos de cartas.

El jugador controla a un invocador que descubre criaturas durante la aventura y las utiliza para enfrentarse a enemigos.

**Principio central:** lo que ocurre durante los duelos tiene consecuencias persistentes en el resto del juego.

Las criaturas pueden sufrir heridas duraderas, perderse permanentemente y, en futuras versiones, adquirir mejoras persistentes.

El jugador debe adaptar su estrategia y gestionar su colección según las consecuencias de los enfrentamientos.

## 2. Objetivo del prototipo

Evaluar si las mecánicas persistentes hacen más interesantes los duelos y la gestión de barajas a lo largo de varios enfrentamientos.

El prototipo debe proporcionar un ciclo jugable sencillo:

1. Avanzar por una pequeña representación de una mazmorra.
2. Conseguir nuevas cartas mediante descubrimientos.
3. Preparar la baraja.
4. Participar en duelos.
5. Conservar heridas, pérdidas y demás consecuencias.
6. Reorganizar la baraja y continuar.

Se priorizará el funcionamiento del sistema por encima del acabado gráfico.

## 3. Sistema básico de combate

### 3.1. Parámetros iniciales

- Nivel inicial del jugador: **1**.
- Maná máximo base inicial: **1**.
- Vida inicial del invocador: **20 puntos**.
- Mano inicial: **3 cartas**.
- Robo de cartas: **1 por turno**.
- No se establece inicialmente un límite máximo de mano.

El nivel del invocador determina su maná máximo base. Cada nivel adicional proporciona un punto adicional de maná máximo base.

El comportamiento de la progresión de nivel durante el prototipo podrá simplificarse según las necesidades de implementación.

### 3.2. Fases del turno

**Fase 1 — Mantenimiento**

- Se recupera el maná utilizable.
- Se roba una carta si quedan cartas disponibles.

**Fase 2 — Principal**

- El jugador puede utilizar sus recursos para invocar criaturas.
- Se aplican los costes correspondientes a cada invocación.

**Fase 3 — Combate**

1. Declaración de atacantes.
2. Declaración de bloqueadores.
3. Asignación y resolución del daño.

El jugador activo y su oponente alternan sus turnos.

### 3.3. Reglas del combate

El sistema toma como referencia el combate de Magic: The Gathering.

- El atacante declara qué criaturas participan en el ataque.
- El defensor decide qué criaturas bloquean.
- Se permite bloquear una criatura atacante con varios bloqueadores.
- Las criaturas se infligen daño de acuerdo con sus estadísticas de ataque y resistencia.
- Una criatura bloqueada no inflige daño sobrante al invocador defensor.
- Las criaturas recién invocadas pueden atacar ese mismo turno.
- Los ataques sin bloquear pueden reducir la vida del invocador.

Codex podrá resolver detalles operativos no definidos, como el reparto exacto del daño entre varios bloqueadores, manteniendo estas reglas.

### 3.4. Victoria y derrota

- Un invocador pierde automáticamente cuando sus puntos de vida llegan a cero.
- Agotar la baraja no provoca derrota.
- Cuando no quedan cartas para robar, simplemente no se roba.
- La rendición voluntaria no se implementará inicialmente.

## 4. Recursos e invocaciones

### 4.1. Maná

El maná se recupera al comienzo de cada turno hasta el máximo utilizable del invocador.

El máximo utilizable depende de su maná base y de los posibles bloqueos producidos por fatiga.

### 4.2. Costes de invocación

El juego contempla invocaciones mediante:

- Costes de maná.
- Sacrificio de otras criaturas.
- Posibles combinaciones de recursos.

Las criaturas sacrificadas se pierden permanentemente.

Codex definirá un conjunto pequeño de costes y cartas que permita experimentar con las mecánicas aprobadas.

## 5. Estado persistente de las criaturas

### 5.1. Salud

Cada criatura dispone de:

- Vida máxima.
- Vida actual.
- Ataque.

El daño recibido se conserva durante el turno, entre turnos y entre duelos.

Una criatura con 5 puntos de vida máxima que sobreviva con 2 puntos comenzará su siguiente enfrentamiento con 2/5 de vida.

Su vida máxima permanece intacta.

### 5.2. Curación

Las criaturas pueden recuperar salud mediante efectos específicos.

Codex podrá implementar mecanismos mínimos de curación cuando sean necesarios para evaluar el sistema persistente, sin introducir sistemas de progresión adicionales.

### 5.3. Muerte permanente

Las criaturas que mueren en combate se eliminan definitivamente de la colección actual.

Esto incluye las criaturas utilizadas como sacrificio.

El tipo de carta permanece desbloqueado en el catálogo, aunque su copia haya muerto.

## 6. Catálogo, colección y baraja

### 6.1. Catálogo

Registra los tipos de invocaciones desbloqueados permanentemente.

### 6.2. Colección

Contiene las copias que el jugador posee actualmente.

Cada copia conserva su estado individual, como vida actual y posibles efectos persistentes.

### 6.3. Baraja activa

Es el conjunto de cartas de la colección seleccionado para utilizar en los duelos.

- Puede modificarse libremente fuera de combate.
- No tiene tamaño mínimo.
- No tiene tamaño máximo.
- Puede contener cero cartas.
- Las criaturas eliminadas permanentemente dejan de estar disponibles.

### 6.4. Límite provisional de copias

Para el primer prototipo se utilizará un máximo de una copia por tipo de carta en toda la colección.

Esta restricción podrá revisarse mediante playtesting.

## 7. Obtención de cartas

Cada tipo de carta tiene una única fuente o condición específica para desbloquearse por primera vez.

Al cumplir dicha condición:

1. La carta se desbloquea permanentemente en el catálogo.
2. Se entrega su primera copia a la colección.
3. El jugador puede incorporarla a su baraja.

Si posteriormente pierde esa copia, mantiene el desbloqueo.

El prototipo debe permitir obtener al menos una carta nueva durante la progresión.

Codex podrá decidir el contenido concreto y la presentación de esa obtención, respetando el funcionamiento anterior.

## 8. Fatiga

Se implementará un sistema simplificado:

- Perder un duelo: +1 de fatiga.
- Ganar un duelo: −1 de fatiga, con mínimo de cero.
- Cada punto de fatiga bloquea un punto del maná máximo base.
- La fatiga no modifica el nivel del invocador.

No se implementarán inicialmente objetos, habilidades o lugares para eliminar fatiga.

Se aceptará reiniciar la sesión cuando la acumulación de fatiga haga inviable seguir combatiendo.

## 9. Recuperación y continuidad

### 9.1. Vida del invocador

Al ganar o perder un duelo, el invocador recupera completamente sus puntos de vida.

Las criaturas supervivientes no reciben curación automática al terminar el duelo.

### 9.2. Derrota

Cuando el jugador pierde:

1. Termina el enfrentamiento.
2. Se mantienen las pérdidas y heridas de las criaturas.
3. Se añade un punto de fatiga.
4. Se recupera completamente la vida del invocador.
5. El jugador regresa al entorno de exploración, frente al enemigo derrotante.

Puede reorganizar su baraja y volver a interactuar con ese enemigo para reintentar el duelo.

## 10. Exploración y progresión

El prototipo incluirá una representación sencilla de una mazmorra que conecte varios encuentros.

Debe permitir:

- Acceder a distintos enfrentamientos.
- Obtener al menos una nueva carta.
- Gestionar la baraja entre combates.
- Continuar después de victorias y derrotas.

La exploración avanzada no es prioritaria.

Codex podrá elegir una representación sencilla que resulte funcional y mantenga el alcance controlado.

## 11. Funcionalidades reservadas para el futuro

Las siguientes ideas no forman parte de los requisitos iniciales:

- Creación y reinvocación de cartas mediante habilidades del invocador.
- Sistema de fichas.
- Buffs persistentes.
- Zonas de descanso y curación avanzada.
- Rendición voluntaria.
- Habilidades adicionales del invocador.
- Sistema de arquetipos de personaje.
- Torneos.
- Mazmorras complejas.
- Puzles y sistemas avanzados de recompensas.

Estas posibilidades deberán conservarse como ideas de diseño, pero no desarrollarse sin una decisión posterior.

## 12. Autonomía del agente de desarrollo

Codex podrá decidir los detalles técnicos y funcionales menores que no estén definidos explícitamente.

Entre ellos:

- Cantidad y estadísticas de las cartas de prueba.
- Costes de invocación concretos.
- Tamaño y contenido de los encuentros iniciales.
- Comportamiento de los enemigos.
- Resolución de reglas secundarias.
- Arquitectura técnica.
- Interfaz provisional.
- Diseño e implementación de tests.

### Restricciones

Codex no debe:

- Contradecir las mecánicas centrales aprobadas.
- Introducir funcionalidades marcadas como futuras.
- Ampliar significativamente el alcance sin autorización.
- Modificar silenciosamente las reglas principales.

### Documentación

Las decisiones tomadas por Codex para completar aspectos no especificados deberán registrarse como decisiones provisionales de implementación.

También deberá identificar cualquier conflicto importante de diseño que no pueda resolver respetando esta especificación.

## 13. Criterios mínimos de aceptación

El prototipo debe permitir:

1. Iniciar un duelo y completarlo.
2. Robar cartas e invocar criaturas.
3. Declarar ataques y bloqueos.
4. Resolver daño entre criaturas e invocadores.
5. Mantener el daño recibido entre enfrentamientos.
6. Eliminar permanentemente las criaturas que mueran.
7. Editar la baraja fuera de combate.
8. Obtener una carta mediante un desbloqueo.
9. Participar en varios duelos consecutivos.
10. Aplicar y recuperar fatiga.
11. Recuperar completamente la vida del invocador después de ganar o perder.
12. Continuar el ciclo de juego después de una derrota.

El agente deberá comprobar técnicamente el funcionamiento del prototipo y entregar un informe con las pruebas realizadas, decisiones provisionales y limitaciones conocidas.

## 14. Objetivos del playtesting

Queremos evaluar:

- Si las heridas persistentes generan decisiones interesantes.
- Si la muerte permanente aporta tensión estratégica.
- Si la gestión de la baraja entre duelos es entretenida.
- Si la fatiga ofrece una penalización comprensible.
- Si descubrir nuevas cartas resulta motivador.
- Si el ciclo completo de exploración, combate y preparación tiene potencial para desarrollarse.

**Estado: especificación funcional aprobada, lista para planificación técnica; no es una autorización para implementar mecánicas fuera de alcance.**
