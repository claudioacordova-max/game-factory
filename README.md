# AI Game Factory

Entorno de desarrollo de prototipos y demos de videojuegos web 3D mediante Codex o Claude Code, agentes especializados, skills y herramientas de apoyo. El diseñador aprueba reglas y alcance; la Factory implementa, comprueba y registra el trabajo autorizado.

Revisión documental: 2026-10-28. Ámbito: Factory y proyectos existentes.

## Orientación

- [Descripción general](docs/factory/overview.md), [capacidades y límites](docs/factory/status.md) y [procedimiento operativo](docs/factory/workflow-v1.md).
- [Instrucciones para agentes](AGENTS.md).
- [Informe histórico de evolución arquitectónica — octubre de 2026](docs/factory/history/architecture-evolution-2026-10.md): contenido aprobado; referencia retrospectiva sin autoridad operativa.
- [Duelo en la cripta / juego-cartas](projects/juego-cartas/README.md): [estado](projects/juego-cartas/docs/status.md), [decisiones vigentes](projects/juego-cartas/docs/decisions.md) y [continuidad](projects/juego-cartas/docs/implementation-plan.md).
- [Comerciante Medieval](projects/comerciante-medieval/README.md): [estado](projects/comerciante-medieval/docs/status.md), [especificación](projects/comerciante-medieval/docs/spec-v1.md) y [continuidad](projects/comerciante-medieval/docs/implementation-plan.md).

La documentación de Factory está en `docs/factory/`; la de cada juego, en `projects/<juego>/docs/`. Los antecedentes sustituidos permanecen en el `history/` de su ámbito.

## Ejecutar un juego existente

Consulta su README para requisitos, comandos y controles. Ejecuta `npm install` y `npm run dev` desde la carpeta del proyecto y usa la URL que muestre Vite. Los comandos de pruebas y build pertenecen a cada proyecto; no hay un comando npm global de Factory.

## Crear un proyecto

Primero define y aprueba la especificación y el plan conforme al workflow. La [plantilla técnica](template/README.md) contiene una escena de prueba sin mecánicas; el [generador](scripts/create-project.mjs) la copia y adapta metadatos. Desde la raíz, usa un nombre nuevo:

```sh
node scripts/create-project.mjs nuevo-juego
```

El nombre debe contener letras minúsculas, números y guiones. El proyecto se crea en `projects/nuevo-juego`. El generador no instala dependencias; para comenzar, instala las dependencias dentro del proyecto:

```sh
cd projects/nuevo-juego
npm install
npm run dev
```

El generador conserva intacta la plantilla y no reemplaza proyectos existentes. La documentación específica del juego se mantiene según el workflow; el generador actual no la crea automáticamente.
