# Duelo en la cripta — estado vigente

Propósito: describir el prototipo implementado de `projects/juego-cartas/`. Revisión documental: 2026-10-28. Corte de código y registros: `54955677ec9430695b233c99a8fb4067b103a86d`. Esta consolidación no modifica el diseño ni constituye una nueva validación integral; distingue los cierres históricos de la regresión técnica reejecutada durante la migración.

## Propuesta y experiencia

RPG de invocaciones que combina exploración de una cripta 3D, colección y preparación de criaturas con combates por cartas. Las decisiones conservan consecuencias: las supervivientes mantienen heridas, morir o sacrificarse elimina su copia y recuperar una criatura puede reducir la vida máxima del invocador. El ala opcional permite reconstruirse y entrenar antes de continuar.

Es una demo jugable, con tres sectores principales y cuatro salas del ala de las ratas. El jugador controla un avatar con cámara elevada y activa voluntariamente encuentros, puertas, cofres y santuarios al acercarse. Los combates usan una mesa 2D; la colección se consulta superpuesta al mundo. El [README](../README.md) explica arranque y controles.

## Sistemas implementados

- **Combate:** turnos alternos, mano inicial de tres cartas, robo de una al mantenimiento posterior, maná y sacrificios combinables. El mazo propio se mezcla al inicio de cada combate; el enemigo conserva mazos y política deterministas. Las criaturas recién invocadas pueden atacar.
- **Duelos y escaramuzas:** R4 y B1–B3 enfrentan invocadores con vida. R1–R3 son grupos desplegados sin invocador enemigo y exigen un objetivo concreto por atacante. Se admiten bloqueadores múltiples ordenados, daño simultáneo y ausencia de daño sobrante al invocador en ataques bloqueados.
- **Colección:** catálogo de tipos descubiertos separado de las copias y de la baraja. Hay como máximo una copia por tipo, incluida la reserva; puede editarse la baraja fuera de combate y dejarla vacía. Heridas, sacrificios y bajas se conservan durante la sesión.
- **Recuperación:** reinvocación fuera de combate de tipos conocidos sin copia; crea una identidad básica sana y sin mejoras. Cuesta vida máxima: semillas 0, comunes 1, raras 2 y épicas 3; nunca puede dejar el máximo por debajo de 1. Un premio repetido no repone una copia perdida.
- **Progreso:** P16/P18 ganan ataque y P17 salud por cada victoria en que fueron invocadas y sobrevivieron, con tope experimental +3 por copia. No se exige causar eliminaciones. Tres santuarios curan todas las copias poseídas heridas, una vez por sector y sesión, sin revivirlas.

## Recursos y recorrido

Se empieza con vida máxima 20, fatiga 0, nivel fijo 1 y ocho copias sanas seleccionadas. El maná utilizable es `max(0, 1 − fatiga)`. Perder añade 1 fatiga; R4/B1/B2/B3 ganados restan 1, hasta cero, mientras que R1–R3 no la reducen. R1–R3 dan +1 de máximo hasta 20; B1/B2 dan +4 hasta 20; R4/B3 restauran máximo a 20. Tras liquidar el resultado, la vida actual del invocador vuelve a su máximo vigente, sin curación automática de criaturas.

B1 y B2 habilitan el sector siguiente y B3 completa la demo manteniendo la exploración. El ala R1→R2→R3→R4 es voluntaria y repetible: salir físicamente al sector 1 y volver a entrar reinicia esos encuentros; una derrota o abrir menús no reinicia la visita. No se reinician colección, heridas, mejoras, fatiga, máximo ni servicios. La primera victoria R4 habilita su cofre único, que debe reclamarse mediante interacción.

## Contenido disponible

| Contenido | Implementación |
|---|---|
| Criaturas propias | 18 tipos: diez comunes (cuatro semillas), cinco raras y tres épicas. Ocho iniciales: P01/P02/P11/P03/P04/P05/P06/P07. |
| Enemigos y encuentros | 14 tipos enemigos, tres jefes principales, tres escaramuzas y un minijefe de ratas. |
| Descubrimientos | Cofre sector 1: P09; B1: P13/P16; cofre sector 2: P10; B2: P15/P17; cofre sector 3: P14/P18; cofre del ala: P08/P12. |
| Exploración | Siete salas, colisiones, puertas y retorno seguro, tres santuarios y cuatro cofres. |
| Presentación | Cripta de piedra, bronce y luz turquesa; arquitectura y personajes programáticos, iconos SVG propios, HUD contextual, colección modal y conexiones de combate. |

El contenido y sus cifras están detallados en la [especificación consolidada](spec-v1.md). Los [CSV originales](history/iteration-v1/) conservan la procedencia del baseline, implementado en [content.ts](../src/engine/content.ts).

## Desarrollo y límites conocidos

Los siete hitos originales y las iteraciones de expedición, combate, interfaz A1–A6 y transformación/estabilización 3D constan cerrados y aceptados en sus registros. No hay una implementación activa ni un nuevo roadmap autorizado. El [plan de continuidad](implementation-plan.md) identifica los cierres y sus fuentes.

- El progreso dura únicamente mientras permanece cargada la página: no hay guardado durable, migración de partidas ni restauración tras recarga.
- No se gana nivel. No hay monedas, tiendas, habilidades adicionales, hechizos, fichas, multijugador, generación procedural ni representación 3D de invocaciones. Las posibilidades futuras no constituyen requisitos pendientes.
- Las cifras y el tope de mejoras son baseline experimental; la aceptación de la demo no demuestra equilibrio definitivo. El informe histórico de 26/27 recorridos completos corresponde a políticas y órdenes deterministas de aquella revisión, no a probabilidad de victoria humana ni a la mezcla actual en una partida normal.
- El diseño principal es de escritorio (1440×900 y 1024×768). La emulación móvil fue valorada manualmente, sin validación móvil dedicada ni requisito adicional.
- El cierre histórico de estabilización registra 167/167 pruebas más comprobaciones espaciales, build y revisión independiente satisfactorios. El aviso de bundle >500 kB procede de aquel build, no de una compilación nueva de la migración.
- La aceptación final de fluidez y ausencia del bloque de baldosas fue humana y cualitativa. Las cifras instrumentales del plan preceden al último ajuste de normales; no son una medición del build final. Algunas capturas y diagnósticos están fuera del repositorio.

Durante la migración documental principal del 2026-10-28, el coordinador sí reejecutó `npm.cmd test`: 167/167 pruebas y comprobaciones espaciales satisfactorias. No se repitieron builds, inspecciones visuales, mediciones de rendimiento ni playtesting. La revisión independiente de la migración fue documental y técnica. La limpieza final posterior no vuelve a ejecutar la suite ni amplía esa evidencia; el detalle queda en el [plan de continuidad](implementation-plan.md).

## Referencias

- [Reglas y trazabilidad](spec-v1.md), [continuidad y decisiones](implementation-plan.md).
- [Diseño vigente de interfaz](design/interface-v1.md) y [exploración 3D](design/exploration-3d-v1.md).
- [Plan histórico](history/implementation-plan-v0.1.md), [anexo D01–D12](history/iteration-v1.md), [balance H6](history/iteration-v1-balance.md) y [protocolo/aceptación H6](history/iteration-v1-playtesting.md).
- [Validación original y ampliación A1–A6](history/validation-report-v0.1.md). Cada informe mantiene su alcance temporal; no es una validación completa nueva del estado actual.
