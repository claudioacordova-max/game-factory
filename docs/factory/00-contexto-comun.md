# AI Game Factory — Contexto común para chats nuevos

> **Documento histórico (referencia: 22 de octubre de 2026).** Se conserva su contenido original como antecedente; las afirmaciones de estado y propuestas describen esa revisión, no el estado actual de la factory. Para el estado vigente, consulta [`status.md`](status.md), [`AGENTS.md`](../../AGENTS.md) y [`workflow-v1.md`](workflow-v1.md).

**Fecha de referencia:** 22 de octubre de 2026
**Estado del documento:** validado para los hechos comprobables en el repositorio; las afirmaciones históricas y propuestas se identifican abajo.

## Propósito

Crear una **Game Factory de prototipos de videojuegos web**: pasar de ideas diseñadas por el usuario a prototipos jugables mediante especificaciones exhaustivas, implementación incremental con Codex, pruebas automáticas y playtesting humano. Esta fase se refiere al **prototipado**, no al desarrollo completo ni a la comercialización de un videojuego.

**Principio rector:** el usuario es el diseñador y aprueba las reglas, el alcance y las decisiones creativas. La IA identifica vacíos, presenta alternativas, documenta y ejecuta lo aprobado; no inventa mecánicas ni cambia el diseño por iniciativa propia.

## Organización y tecnología existentes

- Repositorio local: `game-factory/`, con Git en Windows/PowerShell.
- Stack establecido para prototipos 3D web: React, TypeScript, Vite, Three.js y React Three Fiber.
- `AGENTS.md`: instrucciones de trabajo vigentes para Codex.
- `template/`: plantilla base de proyecto 3D, con una escena de prueba; no incluye mecánicas de juego.
- `scripts/create-project.mjs`: copia la plantilla a `projects/<nombre>/`, ajusta metadatos, excluye directorios y archivos generados concretos y falla si el destino ya existe.
- `docs/`: especificaciones, planes y reportes.
- El stack indicado por `AGENTS.md` y los manifiestos de la plantilla es TypeScript, React, Vite, Three.js y React Three Fiber.
- El historial conversacional registró uso de Codex CLI con ChatGPT Plus y la versión v0.163.0. Son datos históricos no comprobables desde este repositorio; verificar la instalación y autenticación si afectan una decisión.

## Primer caso de referencia: RPG de cartas

- Código: `projects/juego-cartas/`.
- Especificación aprobada: `docs/rpg-cartas-prototype-spec-v0.2.md`.
- Plan de siete hitos: `docs/rpg-cartas-implementation-plan-v0.1.md`.
- Informe de cierre: `docs/rpg-cartas-validation-report-v0.1.md`.
- Resultado registrado en el plan y el informe: **7/7 hitos** completados; el informe concluye que se cumplen **12/12 criterios** y consigna **32/32 pruebas** y build correcto en verificaciones anteriores. Son resultados documentados, no reejecutados en esta validación.
- Commit de cierre: `caf6309` (`docs: complete card RPG prototype validation`). En la revisión del 22 de octubre de 2026, este commit también era el `HEAD` (`caf6309770148eeab65dbc988b5f592e36fc7a22`). El árbol actual tenía `docs/factory/` sin seguimiento; el estado limpio citado en el historial no describe el estado actual.
- Contenido jugable: motor de duelos, oponente automatizado, daños/heridas y pérdidas permanentes entre duelos, catálogo, colección, baraja editable, fatiga, tres encuentros lineales, desbloqueo de «Brote de musgo». Combates en interfaz 2D provisional y mapa sencillo en 3D.
- Hallazgos de playtesting: las cartas se pierden más rápido de lo que se obtienen; una recompensa no compensa necesariamente el desgaste; completar la mazmorra exigió varios intentos; el mapa 3D cumple técnicamente, pero no representa la estética final. **Observaciones, no autorizaciones de rediseño**.
- Limitaciones deliberadas: persistencia entre duelos durante la sesión, sin guardar tras recarga; nivel inicial sin progresión definida; la fatiga puede dejar cero maná al nivel 1. El prototipo no equivale a un juego terminado.

## Decisiones de proceso registradas en el contexto conversacional

Estas decisiones provienen del historial de trabajo y no se pueden confirmar solo con el repositorio:

1. Separar **asistencia de diseño en ChatGPT** de **coordinación de implementación en Codex**.
2. Especificar el juego en profundidad; el usuario revisa y aprueba el documento y el alcance antes de implementar.
3. Codex presenta un plan técnico por hitos para aprobación inicial. Después debe poder avanzar con autonomía dentro de lo autorizado.
4. Los tests, el build, el seguimiento técnico y los commits locales deberían ser automáticos, con límites de seguridad y revisión del alcance.
5. El usuario interviene cuando hay una decisión creativa no resuelta, una entrega jugable que evaluar o un bloqueo técnico importante; no para copiar comandos rutinarios.
6. Los prototipos necesitan **facilidades de testeo** (escenarios, acceso a encuentros, condiciones controladas) independientes del equilibrio de juego normal.
7. Mantener separados el **prototipado** y la futura fase de **desarrollo completo** del videojuego.
8. El estado y las decisiones deben persistir en archivos versionados, no depender de conversaciones larguísimas.

## Arquitectura en estudio — NO implementada ni aprobada técnicamente todavía

Se propuso investigar un **coordinador principal de Codex** más dos contextos/agentes diferenciados:

- **Implementador:** implementa y escribe pruebas.
- **Revisor independiente:** compara código y pruebas con especificación y criterios, sin editar código.
- **Coordinador:** asigna tareas, gestiona correcciones, decide detenciones, registra progreso y commits locales.

La separación de contextos, los permisos de lectura del revisor, la configuración de subagentes, el costo/cuota y las opciones concretas de Codex **deben comprobarse en la instalación real** antes de elegir la implementación. Una intención de automatizar hitos y commits no significa que el sistema esté configurado.

## Estado de las afirmaciones

- **Verificado en el repositorio:** existen la plantilla, el generador, el proyecto `projects/juego-cartas/` y los tres documentos de especificación, plan e informe citados. La plantilla es una escena de prueba, no un juego completo. El RPG separa el motor TypeScript de la interfaz; la exploración usa 3D y el combate una interfaz 2D provisional.
- **Histórico, respaldado por documentos:** finalización de siete hitos, resultados de 32 pruebas y build, y confirmaciones del usuario sobre playtesting. Esta revisión no repitió pruebas ni playtesting.
- **Propuesta pendiente:** arquitectura coordinador/implementador/revisor, automatización permanente, permisos, cuota y configuración de agentes. No se encontró configuración de esa arquitectura en los archivos revisados.
- **Incorrecto:** no se detectaron errores factuales importantes en las referencias al repositorio. El estado limpio citado como anterior es histórico y no describe el estado observado en esta revisión.
- **No verificable desde el repositorio:** decisiones conversacionales, planes futuros, autenticación, suscripción y versión instalada de Codex CLI. Trátalos como antecedentes o pendientes, y vuelve a comprobarlos cuando sean relevantes.

## Fuentes de verdad y continuidad

- **Diseño de cada juego:** especificación funcional aprobada de ese juego.
- **Trabajo técnico:** archivos del repositorio, `AGENTS.md`, plan de hitos y pruebas ejecutadas.
- **Factory como producto:** documentos del procedimiento y decisiones aprobadas.
- **Esta nota:** resumen histórico para orientar, **no sustituye** esos documentos originales.

Si la conversación o los resúmenes difieren de los archivos aprobados, verificar la discrepancia antes de actuar. Etiquetar siempre: **aprobado / propuesto / observado / pendiente**. Mantener actualizaciones de contexto cortas y fechadas.

## Nota de validación

Validado el **22 de octubre de 2026**, usando como referencia `caf6309770148eeab65dbc988b5f592e36fc7a22` (`HEAD` en esta revisión). Se inspeccionaron `AGENTS.md`, la plantilla, el generador, el proyecto RPG, sus documentos y el historial de Git. La comprobación fue documental: no se ejecutaron tests/build, no se hizo playtesting ni se verificaron la instalación de Codex, conversaciones anteriores o planes futuros. El estado de trabajo observado incluía `docs/factory/` sin seguimiento.
