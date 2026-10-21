# AI Game Factory

Generador de prototipos web 3D a partir de la plantilla técnica del repositorio.

## Crear un proyecto

Desde la raíz del repositorio, ejecuta:

```sh
node scripts/create-project.mjs juego-cartas
```

El nombre debe contener letras minúsculas, números y guiones. El proyecto se crea en `projects/juego-cartas`. El generador no instala dependencias; para comenzar, instala las dependencias dentro del proyecto:

```sh
cd projects/juego-cartas
npm install
npm run dev
```

El generador conserva intacta la plantilla y no reemplaza proyectos existentes.
