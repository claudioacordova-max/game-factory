# Duelo en la cripta

Prototipo jugable del RPG de cartas con presentación de demo. La expedición tiene un avatar controlable y siete salas 3D con Three.js y React Three Fiber: tres sectores y un ala opcional de cuatro encuentros. Los duelos y escaramuzas tienen mesa 2D, mano de cartas y acciones de fase contextuales. React presenta el estado y comunica acciones al motor TypeScript en `src/engine/`, que conserva las reglas, la colección y el progreso.

## Requisitos y arranque

- Node.js 20.19+ o 22.12+
- npm

Desde esta carpeta:

```sh
npm install
npm run dev
```

Abre la dirección local que indique Vite (normalmente `http://localhost:5173`).

## Cómo jugar

1. Desde **Explorar**, enfoca la escena y camina con **WASD o flechas**, o mantén pulsados los controles de dirección HTML. Acércate a un objeto y pulsa **E** o su botón cercano para interactuar. Tab sale del control de la escena. Los encuentros empiezan por una interacción voluntaria; las puertas también requieren cercanía. Abrir Colección o entrar al combate detiene el movimiento y conserva tu posición.
2. **Colección** permite preparar la baraja entre encuentros: añadir coloca la copia al final; retirar la deja en reserva. Usa ↑ y ↓ para decidir el orden fijo de robo. Empiezas con ocho copias, tres en mano; cada turno propio roba una más si quedan cartas.
3. En tu fase principal, selecciona una carta de la mano y pulsa **Invocar criatura**. Su vida muestra las heridas conservadas. Los costes de maná y sacrificio se pagan juntos. Si exige sacrificio, selecciona criaturas propias: sus copias se perderán permanentemente. Las recién invocadas pueden atacar ese turno.
4. Pulsa **Declarar atacantes** y elige criaturas de tu mesa. En duelos, el enemigo decide sus bloqueos automáticamente. En las escaramuzas R1–R3 no existe invocador rival: cada atacante necesita un objetivo enemigo explícito. Varios atacantes pueden atacar el mismo objetivo; este contraataca una vez, repartiendo el daño en el orden numerado de tu mesa. Confirma **Declarar ataques**, o **Pasar sin atacar** si no elegiste criaturas.
5. Pulsa **Terminar turno**. El enemigo invoca si es un duelo; los grupos R1–R3 solo atacan con sus supervivientes. Elige tus bloqueadores para cada atacante. El orden de selección determina la asignación de daño; puedes dejar ataques sin bloquear. Confirma para resolver el daño simultáneo. Agotar la baraja no provoca derrota.
6. Tras victoria o derrota regresas a la misma sala y un punto seguro. El resultado muestra máximo y fatiga antes/después, heridas, bajas, sacrificios, mejoras y descubrimientos. Puedes ajustar la baraja y reintentar una derrota. Vencer B1/B2 abre el siguiente sector y permite retroceder; B3 completa la demo y conserva la colección y la exploración disponibles.

Los cofres de los sectores entregan P09, P10 y P14/P18 sin combate adicional en su sala. Cada sector tiene un santuario de un uso: sana todas las copias poseídas, incluida la reserva, a su máximo individual vigente. No revive ni restaura el máximo del invocador; sin heridas conserva su uso.

El ala de ratas se entra por una puerta del sector 1 y se recorre en orden R1 → R2 → R3 → R4. Cada sala tiene salida voluntaria al sector 1. Una derrota conserva los encuentros anteriores; menús y cambios entre salas tampoco reinician la visita. Solo salir realmente y volver a entrar reinicia R1–R4, conservando heridas, colección, mejoras, fatiga, cofres y santuarios. La primera victoria R4 habilita un cofre único P08/P12: debes acercarte y reclamarlo.

## Recuperación y progreso

- Hay una sola copia por tipo entre baraja y reserva. Un descubrimiento entrega una copia básica sana en reserva. Repetir premios no duplica ni repone pérdidas.
- Reinvocar un tipo descubierto sin copia crea otra identidad con salud base y mejoras cero. Cuesta 0 de vida máxima para las cuatro semillas P01–P04, 1 para comunes, 2 para raras y 3 para épicas. El máximo resultante debe ser al menos 1; la vida actual se ajusta a ese máximo. La colección muestra costes también en copias poseídas para planificar pérdidas.
- Nivel fijo 1; maná utilizable `max(0, 1 − fatiga)`. Una derrota suma 1 fatiga. Solo las victorias R4/B1/B2/B3 restan 1, mínimo cero; R1–R3 no la reducen.
- R1–R3 dan +1 máximo hasta 20; B1/B2 dan +4 hasta 20; R4/B3 restauran máximo a 20. Tras liquidar cualquiera de los resultados, la vida actual del invocador vuelve a su máximo vigente. Las criaturas conservan sus heridas.
- P16/P18 ganan +1 ATQ y P17 +1 vida máxima y actual por victoria en la que fueron invocadas y sobrevivieron, máximo +3 por copia. No necesitan atacar ni causar bajas. Mano, pila, reserva, muertas y sacrificadas no progresan; la derrota tampoco. La colección diferencia cifras base y bonos individuales.

Los mazos de los enemigos y su orden son fijos para que las partidas sean repetibles. La colección, las heridas, las bajas, la fatiga y el avance de la mazmorra se conservan entre duelos durante la sesión actual del navegador. No se guarda ni restaura la partida después de recargar o cerrar la página.

La dirección visual combina piedra oscura, bronce y luz turquesa, con emblemas SVG propios y fuentes locales. El [diseño estructural y propuesta gráfica](../../docs/rpg-cartas-visual-design-v0.1.md) incluye la referencia generada con imagegen. Los nombres, valores y reglas de las cartas proceden siempre del motor, no de la ilustración de referencia. No se incorporaron dependencias ni servicios nuevos.

El layout contempla 1440×900 y 1024×768; las listas y filas sin límite disponen de desplazamiento. La observación renderizada y el playtesting del diseñador se registran por separado en la [iteración del plan](../../docs/rpg-cartas-implementation-plan-v0.1.md). La compilación no sustituye esas verificaciones.

La [guía de playtesting de la expedición](../../docs/rpg-cartas-iteration-v1-playtesting.md) conserva el protocolo experimental como referencia y registra la aceptación final del diseñador: expedición completa e interacciones satisfactorias, con los extremos cubiertos por automatización real. Los tres protocolos manuales exhaustivos no son pendientes de cierre. El [informe de balance](../../docs/rpg-cartas-iteration-v1-balance.md) conserva las mediciones experimentales; la aceptación de H6 e iteración y el cierre autorizado constan en el [registro vigente](../../docs/rpg-cartas-iteration-v1.md).

## Verificación

```sh
npm run test
npm run build
```
