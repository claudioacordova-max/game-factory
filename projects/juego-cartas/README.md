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

El rediseño A1–A6 fue aceptado definitivamente por el diseñador tras playtesting visual, funcional y de UX; el cierre formal y el commit local están autorizados conforme al workflow. Durante esta entrega el servidor existente está en **http://127.0.0.1:5180/**. La partida permanece en la página cargada: recargar inicia otra sesión.

## Cómo jugar

1. Camina con **WASD o flechas** dentro de la escena. Acércate a un objeto disponible y pulsa **E** o su botón contextual. El botón **?** permite consultar ayuda y controles de movimiento por puntero. Tab navega los controles. Los encuentros y puertas requieren interacción voluntaria y cercana.
2. Abre **Colección** con el botón inferior o **I**; cierra con **I**, **Esc** o su cierre visible. La escena conserva tu posición y detiene movimiento/interacciones mientras está abierta. Consulta tipos descubiertos, copias, heridas, mejoras y costes; añade o retira criaturas de la baraja. El **robo es aleatorio**, sin ordenación manual. Empiezas con ocho copias, tres en mano; cada turno propio roba una más si quedan cartas.
3. En fase principal, **arrastra una carta al campo propio o actívala con clic/teclado**. Una invocación inválida comunica el motivo sin cobrar recursos. Si requiere sacrificios, el tablero muestra la carta y el progreso: elige criaturas propias mediante clic, desmarca mientras falten o cancela con **Esc**/Cancelar. **Al elegir la última criatura se ejecuta la invocación y los sacrificios se pierden permanentemente**, sin otra confirmación. Maná y sacrificios se pagan juntos. Las recién invocadas pueden atacar ese turno.
4. Pulsa **Ir al ataque** cuando hayas terminado de invocar; se avanza automáticamente si ya no hay invocaciones legales y no queda una selección pendiente. Clic sobre criaturas propias selecciona atacantes; otro clic deselecciona. En R1–R3 cada atacante requiere un objetivo enemigo: elígelo en el campo o mediante el selector de su carta. El pequeño botón de objetivo vuelve a enfocar un atacante elegido. Varios pueden compartir objetivo y conservan el orden numerado de represalia. Estos grupos no tienen invocador ni vida ficticia; los duelos sí muestran la vida de ambos invocadores.
5. **Confirma ataques** o **Pasa sin atacar**. Se resuelve y continúa automáticamente el turno enemigo si sigue el combate; no hay paso «Terminar turno». En defensa, **arrastra una criatura propia sobre un atacante enemigo**. Puedes asignar varias, reasignarlas a otro atacante y consultar las conexiones/números. Los controles junto a cada carta permiten retirar el bloqueo y cambiar su orden de recepción del daño. Alternativa accesible: activa el atacante enemigo y luego tus criaturas. Puedes dejar ataques sin bloquear; **Resolver bloqueos** confirma la decisión y continúa el siguiente turno. Un enemigo sin atacantes no exige una confirmación vacía.
6. Tras victoria o derrota consulta el resultado superpuesto y sus consecuencias, y pulsa **Continuar explorando**. Regresas a la misma sala y un punto seguro. Heridas, bajas, sacrificios, mejoras, descubrimientos, máximo y fatiga se conservan según las reglas. Puedes preparar la baraja y reintentar. B1/B2 abren el siguiente sector; B3 completa la demo manteniendo disponible la exploración.

Los cofres de los sectores entregan P09, P10 y P14/P18 sin combate adicional en su sala. Cada sector tiene un santuario de un uso: sana todas las copias poseídas, incluida la reserva, a su máximo individual vigente. No revive ni restaura el máximo del invocador; sin heridas conserva su uso.

El ala de ratas se entra por una puerta del sector 1 y se recorre en orden R1 → R2 → R3 → R4. Cada sala tiene salida voluntaria al sector 1. Una derrota conserva los encuentros anteriores; menús y cambios entre salas tampoco reinician la visita. Solo salir realmente y volver a entrar reinicia R1–R4, conservando heridas, colección, mejoras, fatiga, cofres y santuarios. La primera victoria R4 habilita un cofre único P08/P12: debes acercarte y reclamarlo.

## Recuperación y progreso

- Hay una sola copia por tipo entre baraja y reserva. Un descubrimiento entrega una copia básica sana en reserva. Repetir premios no duplica ni repone pérdidas.
- Reinvocar un tipo descubierto sin copia crea otra identidad con salud base y mejoras cero. Cuesta 0 de vida máxima para las cuatro semillas P01–P04, 1 para comunes, 2 para raras y 3 para épicas. El máximo resultante debe ser al menos 1; la vida actual se ajusta a ese máximo. La colección muestra costes también en copias poseídas para planificar pérdidas.
- Nivel fijo 1; maná utilizable `max(0, 1 − fatiga)`. Una derrota suma 1 fatiga. Solo las victorias R4/B1/B2/B3 restan 1, mínimo cero; R1–R3 no la reducen.
- R1–R3 dan +1 máximo hasta 20; B1/B2 dan +4 hasta 20; R4/B3 restauran máximo a 20. Tras liquidar cualquiera de los resultados, la vida actual del invocador vuelve a su máximo vigente. Las criaturas conservan sus heridas.
- P16/P18 ganan +1 ATQ y P17 +1 vida máxima y actual por victoria en la que fueron invocadas y sobrevivieron, máximo +3 por copia. No necesitan atacar ni causar bajas. Mano, pila, reserva, muertas y sacrificadas no progresan; la derrota tampoco. La colección diferencia cifras base y bonos individuales.

Los mazos de los enemigos y su orden son fijos para que las partidas sean repetibles. La colección, las heridas, las bajas, la fatiga y el avance de la mazmorra se conservan entre duelos durante la sesión actual del navegador. No se guarda ni restaura la partida después de recargar o cerrar la página.

La dirección visual combina piedra oscura, bronce y luz turquesa, con emblemas SVG propios y fuentes locales. El [rediseño integrado v1](../../docs/design/rpg-cartas/ui-redesign-v1.md) contiene la estructura y referencia generada con imagegen. Los nombres, valores y reglas de las cartas proceden siempre del motor, no de esa ilustración. No se incorporaron dependencias ni servicios nuevos.

El layout contempla 1440×900 y 1024×768; las listas y filas sin límite disponen de desplazamiento. La observación renderizada y el playtesting del diseñador se registran por separado en la [iteración del plan](../../docs/rpg-cartas-implementation-plan-v0.1.md). La compilación no sustituye esas verificaciones.

## Playtesting breve del rediseño — aceptado

Esta guía se conserva como referencia del playtesting completado: el diseñador declaró satisfactorios los flujos, presentación e integración y aceptó definitivamente el resultado. La evaluación principal fue en escritorio; la emulación móvil orientativa en herramientas del navegador también fue aceptable, sin validación móvil dedicada ni requisitos adicionales. Los tamaños previstos del diseño son 1440×900 y 1024×768; no se facilitaron navegador, resolución o dispositivo exactos de las pruebas humanas. La inspección automática del juego no se completó porque Computer Use no pudo verificar con confianza la URL actual en Windows; esa limitación histórica se conserva separada de la aceptación humana ya satisfecha.

1. Camina, abre Colección con I y comprueba que el personaje se detiene. Añade/retira una copia, consulta heridas/bonos y cierra con I/Esc; verifica posición, foco y ausencia de movimiento retenido. Revisa que no haya flechas de ordenación de baraja.
2. Acércate y aléjate de cofre, santuario, puerta o enemigo: el prompt E debe aparecer solo mientras la acción esté disponible. Interactúa y comprueba que avisos y resultados permanecen dentro del juego.
3. Durante una fase principal con otra invocación todavía legal, intenta una carta de coste insuficiente por arrastre y clic: mensaje claro, mismos recursos y criaturas. Comprueba también invocación legal por ambos medios.
4. Inicia una invocación con sacrificio y cancela antes de completarlo: ninguna baja ni pago. Reintenta y elige la última criatura: aviso comprensible, invocación única y pérdida definitiva correcta. Valora si el punto definitivo queda suficientemente claro.
5. Selecciona/deselecciona atacantes y pasa una vez con cero. En R1–R3 elige y cambia objetivos, incluyendo varios contra uno; comprueba conexiones y ausencia de vida rival ficticia. En un duelo verifica vida actual/máxima de ambos invocadores y maná/fatiga propios.
6. Con varias criaturas disponibles, arrastra dos bloqueadores contra un mismo atacante; reasigna uno, cambia su orden y retira un bloqueo. Comprueba líneas, números y resultado del daño. Prueba la alternativa de clic/teclado y dejar un ataque sin bloquear.
7. Comprueba que ataques y defensa llevan al siguiente paso sin «Terminar turno» ni confirmaciones vacías. Un doble clic sobre una carta de mano o acción de fase no debe activar la decisión siguiente; el segundo clic normal sobre una criatura atacante sí la deselecciona.
8. Completa una victoria y una derrota, revisa sus consecuencias y vuelve a explorar/abrir Colección. Comprueba heridas, bajas, mejoras, fatiga, premios y posición; revisa recortes, lectura y acceso a todas las cartas en ambas resoluciones.

El diseñador confirmó todos estos flujos como satisfactorios y autorizó el cierre; esta guía no representa tareas pendientes. No se solicitaron cambios adicionales de gameplay, UI, balance o arquitectura. Los controles o comparaciones históricas de balance no se convierten en requisitos nuevos.

La [guía de playtesting de la expedición](../../docs/rpg-cartas-iteration-v1-playtesting.md) conserva el protocolo experimental como referencia y registra la aceptación final del diseñador: expedición completa e interacciones satisfactorias, con los extremos cubiertos por automatización real. Los tres protocolos manuales exhaustivos no son pendientes de cierre. El [informe de balance](../../docs/rpg-cartas-iteration-v1-balance.md) conserva las mediciones experimentales; la aceptación de H6 e iteración y el cierre autorizado constan en el [registro vigente](../../docs/rpg-cartas-iteration-v1.md).

## Verificación

```sh
npm run test
npm run build
```

## Primera transformación visual de exploración 3D — aprobada

La exploración usa ahora arquitectura funeraria y personajes de geometría programática compartida. El umbral tiene portal/pilares; catacumbas, nichos mortuorios apilados; cámara final, columnas y monumento ceremonial. El ala conserva la cripta deteriorada: R1 introduce madrigueras y tierra, R2 grandes aberturas con madera, R3 nidos y acumulaciones, R4 una madriguera coronada. El protagonista lleva abrigo negro largo y sombrero ancho. Centinela, Custodia, Guardián, grupos roedores y Señora tienen siluetas propias. Combate, colección, controles, colisiones, objetos y reglas permanecen en sus módulos originales.

El diseñador recorrió personalmente los siete niveles y aprobó su identidad visual, personajes y funcionamiento general. Esta transformación queda cerrada junto con su estabilización, registrada en la [iteración del plan](../../docs/rpg-cartas-implementation-plan-v0.1.md). Solo los tres sectores tienen santuario; R4 contiene el cofre de recompensa.

La [referencia conceptual](../../docs/design/rpg-cartas/exploration-3d-v1/reference-prompt.md) y el [registro de implementación](../../docs/rpg-cartas-implementation-plan-v0.1.md) distinguen automatización, inspección renderizada y playtesting humano.

## Estabilización gráfica — aprobada y cerrada

El arte de las siete salas y personajes fue aprobado tras el recorrido humano completo. La corrección posterior agrupa la arquitectura estática conservando piezas, transformaciones, materiales y sombras. La escena usa resolución nativa (`dpr=1`) para evitar el coste del supersampling, manteniendo antialiasing y encuadre. También se corrige la inicialización del lote de suelo al cambiar de paleta, que producía baldosas superpuestas como un bloque al regresar a salas.

El diseñador probó las salas después de la optimización: no volvió a observar el bloque y valoró el movimiento como estable, con una mejora perceptible. Esta evaluación es manual y cualitativa. Las mediciones comparativas, su alcance temporal —anteriores al ajuste final de normales— y los resultados de pruebas, build y revisión están en el registro de estabilización del plan. Combate y colección mantienen su implementación previa. No quedan acciones pendientes en esta iteración; las invocaciones 3D pertenecen a una iteración futura independiente.
