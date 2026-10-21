#!/usr/bin/env node

import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryDirectory = path.resolve(scriptDirectory, '..');
const templateDirectory = path.join(repositoryDirectory, 'template');
const projectsDirectory = path.join(repositoryDirectory, 'projects');

const excludedDirectories = new Set([
  '.git',
  '.vite',
  '.cache',
  '.next',
  '.parcel-cache',
  '.turbo',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'out',
]);

function shouldCopy(sourcePath) {
  const entryName = path.basename(sourcePath);
  const lowerCaseName = entryName.toLowerCase();

  if (excludedDirectories.has(lowerCaseName)) {
    return false;
  }

  if (
    lowerCaseName === '.ds_store' ||
    lowerCaseName === 'thumbs.db' ||
    lowerCaseName === 'desktop.ini' ||
    lowerCaseName.endsWith('.tsbuildinfo') ||
    lowerCaseName.endsWith('.log') ||
    lowerCaseName.endsWith('.tmp') ||
    lowerCaseName.endsWith('.temp') ||
    lowerCaseName.endsWith('.bak') ||
    lowerCaseName.endsWith('.swp') ||
    lowerCaseName.endsWith('.swo') ||
    lowerCaseName.endsWith('~')
  ) {
    return false;
  }

  return true;
}

function validateProjectName(name) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || name.length > 214) {
    throw new Error(
      'El nombre debe usar solo letras minúsculas, números y guiones, y no puede comenzar ni terminar con un guion.',
    );
  }

  const reservedWindowsName = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
  if (reservedWindowsName.test(name)) {
    throw new Error(`"${name}" es un nombre reservado en Windows.`);
  }
}

function displayNameFromSlug(name) {
  return name
    .split('-')
    .map((part) => part[0].toLocaleUpperCase('es') + part.slice(1))
    .join(' ');
}

async function updateProjectMetadata(projectDirectory, projectName) {
  const packagePath = path.join(projectDirectory, 'package.json');
  const packageLockPath = path.join(projectDirectory, 'package-lock.json');
  const htmlPath = path.join(projectDirectory, 'index.html');
  const readmePath = path.join(projectDirectory, 'README.md');
  const displayName = displayNameFromSlug(projectName);

  const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
  packageJson.name = projectName;
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');

  const packageLock = JSON.parse(await readFile(packageLockPath, 'utf8'));
  packageLock.name = projectName;
  if (packageLock.packages?.['']) {
    packageLock.packages[''].name = projectName;
  }
  await writeFile(packageLockPath, `${JSON.stringify(packageLock, null, 2)}\n`, 'utf8');

  const html = await readFile(htmlPath, 'utf8');
  const updatedHtml = html.replace(
    /<title>[^<]*<\/title>/i,
    `<title>${displayName}</title>`,
  );
  if (updatedHtml === html) {
    throw new Error('No se encontró el elemento <title> en index.html.');
  }
  await writeFile(htmlPath, updatedHtml, 'utf8');

  const readme = await readFile(readmePath, 'utf8');
  const updatedReadme = readme
    .replace(/^# .*$/m, `# ${displayName}`)
    .replace(
      /^Base técnica reutilizable.*$/m,
      'Prototipo web 3D basado en Vite, React, TypeScript, Three.js y React Three Fiber. Incluye una escena estática de prueba; no incluye mecánicas ni sistemas de juego.',
    )
    .replace(
      /^Al iniciar un juego nuevo, copia.*$/m,
      'Modifica la escena según la especificación aprobada para este juego.',
    );
  if (updatedReadme === readme) {
    throw new Error('No se encontraron los metadatos esperados en README.md.');
  }
  await writeFile(readmePath, updatedReadme, 'utf8');
}

async function main() {
  const [projectName, ...extraArguments] = process.argv.slice(2);
  if (!projectName || extraArguments.length > 0) {
    throw new Error('Uso: node scripts/create-project.mjs <nombre-del-proyecto>');
  }

  validateProjectName(projectName);

  const projectDirectory = path.resolve(projectsDirectory, projectName);
  const relativeDestination = path.relative(projectsDirectory, projectDirectory);
  if (
    relativeDestination === '' ||
    relativeDestination.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeDestination)
  ) {
    throw new Error('El destino debe estar dentro de la carpeta projects/.');
  }

  await mkdir(projectsDirectory, { recursive: true });

  // mkdir without recursive is an exclusive reservation: it fails if the
  // destination already exists, including when it is an empty directory.
  await mkdir(projectDirectory);

  try {
    await cp(templateDirectory, projectDirectory, {
      recursive: true,
      filter: (sourcePath) => shouldCopy(sourcePath),
    });
    await updateProjectMetadata(projectDirectory, projectName);
  } catch (error) {
    await rm(projectDirectory, { recursive: true, force: true });
    throw error;
  }

  console.log(`Proyecto creado en: ${path.relative(repositoryDirectory, projectDirectory)}`);
  console.log('Para instalar sus dependencias:');
  console.log(`  cd projects/${projectName}`);
  console.log('  npm install');
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
