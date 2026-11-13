# Juegos

Esta carpeta aloja los juegos con los que trabaja la Factory, pero la Factory no los versiona: `.gitignore` excluye todo `projects/*/`.

Cada juego es un repositorio Git independiente, con su código, pruebas, documentación (`docs/`) y pendientes propios. Se publica como sitio estático (`npm run build` genera `dist/`) sin depender de la Factory.

- **Crear un juego:** desde la raíz, `node scripts/create-project.mjs <nombre>` copia la plantilla en `projects/<nombre>/` y crea su repositorio con un commit inicial.
- **Usar un juego existente:** `git clone <url-del-juego> projects/<nombre>`.

Abre la sesión de Codex o Claude Code en la raíz de la Factory para que se apliquen sus reglas. Los commits de un juego van a su propio repositorio (`--repo projects/<nombre>` en el preflight y el ejecutor; ver `docs/factory/workflow-v1.md`).
