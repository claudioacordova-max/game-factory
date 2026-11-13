import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createProject } from './create-project.mjs';

const identity = {
  GIT_AUTHOR_NAME: 'Fixture',
  GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
  GIT_COMMITTER_NAME: 'Fixture',
  GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
};

function git(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

async function withTemporaryProjects(run) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'gf-create-project-'));
  const previous = Object.fromEntries(Object.keys(identity).map((key) => [key, process.env[key]]));
  Object.assign(process.env, identity);
  try {
    await run(path.join(directory, 'projects'));
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await rm(directory, { recursive: true, force: true });
  }
}

test('creates the game with its own repo and one initial commit of exactly the copied files', () =>
  withTemporaryProjects(async (projectsDirectory) => {
    const result = await createProject('juego-prueba', { projectsDirectory });
    assert.equal(result.git, 'created');
    const root = result.projectDirectory;
    assert.equal(path.resolve(git(root, ['rev-parse', '--show-toplevel'])).toLowerCase(), root.toLowerCase());
    assert.equal(git(root, ['rev-parse', '--abbrev-ref', 'HEAD']), 'main');
    assert.equal(git(root, ['rev-list', '--count', 'HEAD']), '1');
    assert.equal(git(root, ['log', '-1', '--format=%s']), 'juego-prueba: proyecto inicial desde la plantilla');
    assert.equal(git(root, ['status', '--porcelain']), '');
    const tracked = git(root, ['ls-files']).split('\n');
    assert.ok(tracked.includes('package.json') && tracked.includes('.gitignore'));
    assert.ok(tracked.every((file) => !file.startsWith('node_modules/') && !file.startsWith('.git/')));
  }));

test('--no-git leaves a plain project without a repository', () =>
  withTemporaryProjects(async (projectsDirectory) => {
    const result = await createProject('sin-git', { projectsDirectory, git: false });
    assert.equal(result.git, 'skipped');
    assert.equal(existsSync(path.join(result.projectDirectory, '.git')), false);
    assert.ok((await readdir(result.projectDirectory)).includes('package.json'));
  }));

test('a Git failure keeps the project and reports it without a leftover .git', () =>
  withTemporaryProjects(async (projectsDirectory) => {
    const previousPath = process.env.PATH;
    const previousPathMixed = process.env.Path;
    process.env.PATH = process.env.Path = path.join(projectsDirectory, 'no-git-here');
    try {
      const result = await createProject('falla-git', { projectsDirectory });
      assert.equal(result.git, 'failed');
      assert.ok(result.gitError);
      assert.ok((await readdir(result.projectDirectory)).includes('package.json'));
      assert.equal(existsSync(path.join(result.projectDirectory, '.git')), false);
    } finally {
      process.env.PATH = previousPath;
      if (previousPathMixed !== undefined) process.env.Path = previousPathMixed;
    }
  }));

test('rejects invalid names before creating anything', () =>
  withTemporaryProjects(async (projectsDirectory) => {
    await assert.rejects(() => createProject('Bad_Name', { projectsDirectory }));
    assert.equal(existsSync(projectsDirectory), false);
  }));
