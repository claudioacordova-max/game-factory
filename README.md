# AI Game Factory

Entorno de desarrollo de prototipos y demos de videojuegos web 3D mediante Codex o Claude Code, agentes especializados, skills y herramientas de apoyo. El diseñador aprueba reglas y alcance; la Factory implementa, comprueba y registra el trabajo autorizado.

Revisión documental: 2026-11-13. Ámbito: Factory.

## Orientación

- [Descripción general](docs/factory/overview.md), [capacidades y límites](docs/factory/status.md) y [procedimiento operativo](docs/factory/workflow-v1.md).
- [Instrucciones para agentes](AGENTS.md).
- [Informe histórico de evolución arquitectónica — octubre de 2026](docs/factory/history/architecture-evolution-2026-10.md): contenido aprobado; referencia retrospectiva sin autoridad operativa.

La documentación de Factory está en `docs/factory/`. Los juegos no forman parte de este repositorio: cada uno es un repo Git propio que se crea o clona en `projects/<juego>/` (carpeta ignorada por la Factory) y guarda su documentación en `projects/<juego>/docs/`. Los antecedentes sustituidos permanecen en el `history/` de su ámbito; el historial de Git anterior al 2026-11-13 conserva los juegos desarrollados hasta entonces.

## Trabajar con un juego existente

Clona su repositorio dentro de `projects/` (por ejemplo `git clone <url> projects/mi-juego`) y abre la sesión de Codex o Claude Code en la raíz de la Factory. Consulta su README para requisitos, comandos y controles. Ejecuta `npm install` y `npm run dev` desde la carpeta del proyecto y usa la URL que muestre Vite. Los comandos de pruebas y build pertenecen a cada proyecto; no hay un comando npm global de Factory.

## Crear un proyecto

Primero define y aprueba la especificación y el plan conforme al workflow. La [plantilla técnica](template/README.md) contiene una escena de prueba sin mecánicas; el [generador](scripts/create-project.mjs) la copia y adapta metadatos. Desde la raíz, usa un nombre nuevo:

```sh
node scripts/create-project.mjs nuevo-juego
```

El nombre debe contener letras minúsculas, números y guiones. El proyecto se crea en `projects/nuevo-juego`. El generador crea además el repositorio Git propio del juego con un commit inicial (usa `--no-git` para omitirlo) y no instala dependencias; para comenzar, instala las dependencias dentro del proyecto:

```sh
cd projects/nuevo-juego
npm install
npm run dev
```

El generador conserva intacta la plantilla y no reemplaza proyectos existentes. La documentación específica del juego se mantiene según el workflow; el generador actual no la crea automáticamente.
