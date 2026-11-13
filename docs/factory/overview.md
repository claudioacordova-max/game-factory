# Game Factory — descripción general

Propósito: comprender el sistema. Ámbito: Factory y proyectos. Revisión: 2026-10-28, sobre el corte `54955677ec9430695b233c99a8fb4067b103a86d` y la reorganización documental aceptada por el usuario el 2026-10-28.

## Finalidad

Game Factory convierte diseños aprobados por el usuario en prototipos y demos jugables de videojuegos web. Prioriza experimentar con mecánicas, evaluar la experiencia y conservar decisiones verificables. No presupone un producto terminado ni una única estructura de gameplay para todos los juegos.

La base técnica existente es TypeScript, React, Vite, Three.js y React Three Fiber. Una plantilla y un generador permiten iniciar proyectos separados. Cada juego conserva reglas, interfaz, pruebas y documentación dentro de su directorio.

## Organización y responsabilidades

El diseñador aprueba reglas, alcance y decisiones creativas materiales. La sesión principal (Codex o Claude Code) coordina: interpreta el encargo autorizado, delimita tareas, comprueba resultados y mantiene la continuidad. El agente `implementer` implementa lo autorizado y las pruebas necesarias; el `reviewer` inspecciona después el resultado en un contexto independiente y reporta hallazgos sin editar.

Las skills existentes ayudan a preparar briefs (`game-iteration`) y a diseñar, implementar y evaluar interfaces (`game-ui-ux`). No son agentes adicionales ni sustituyen autorizaciones. El [workflow](workflow-v1.md) reúne el procedimiento obligatorio; [AGENTS.md](../../AGENTS.md) fija las instrucciones del repositorio.

Las herramientas complementan ese proceso: el generador copia la plantilla, el preflight detecta problemas de whitespace, el ejecutor local controlado realiza commits elegibles y las herramientas de navegador permiten inspeccionar el resultado cuando están disponibles. Su existencia no demuestra que se hayan ejecutado en una entrega concreta.

## Implementaciones e iteraciones

Un proyecto comienza con especificación y plan técnico aprobados. El generador prepara la base técnica cuando está autorizado; la documentación se establece dentro del juego. Cada hito identifica requisitos, criterios y estado Git inicial, pasa por implementación, checks del coordinador y revisión independiente, y registra sus resultados. Los cambios de experiencia que lo requieren reciben playtesting humano antes del cierre.

Después del prototipo, las solicitudes se tramitan como iteraciones proporcionales a su tamaño. Una corrección pequeña no necesita un plan completo nuevo. Una transformación integral de UI puede reconsiderar composición y controles dentro del alcance delegado, preservando las reglas y el balance aprobados.

La autonomía cubre operaciones rutinarias de trabajo ya aprobado. Se consulta cuando falta una decisión creativa material, cambia el alcance, se requiere una dependencia no autorizada o persiste un bloqueo. Los tests no sustituyen la aceptación humana necesaria. Una instrucción expresa de entregar cambios sin commit prevalece sobre el cierre Git automático habitual.

## Documentación y proyectos

La Factory mantiene aquí su [estado](status.md) y procedimiento. Cada juego dispone de README práctico, estado implementado, especificación de alcance y plan de continuidad. `history/` conserva procedencia sin convertir requisitos sustituidos en tareas nuevas.

Los juegos son repositorios Git independientes que se crean o clonan en `projects/<juego>/`; la Factory no los versiona ni depende de ellos, y cada juego se publica como sitio estático sin la Factory.

## Límites

La revisión es independiente por contexto, pero los agentes comparten workspace y sandbox: el reviewer no tiene una barrera técnica de escritura. Las herramientas y permisos dependen de la sesión e instalación local. La inspección visual puede quedar limitada por navegador, políticas o disponibilidad de CLI; se registra su alcance real.

La evidencia de reutilización corresponde a los dos juegos desarrollados antes de la separación de repositorios (2026-11-13), cuyo historial previo sigue en el de la Factory. Los resultados históricos de pruebas y aceptaciones no acreditan automáticamente cambios posteriores. Algunas capturas y diagnósticos están fuera del repositorio. El [estado de capacidades](status.md) enlaza evidencias y distingue configuración presente de verificaciones realizadas.
