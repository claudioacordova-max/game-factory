'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPOSITORY_ROOT = String.raw`C:\Users\klaud\Projects\game-factory`;
const GIT_EXECUTABLE = String.raw`C:\Program Files\Git\cmd\git.exe`;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/u;
const PATHSPEC_CHARS = /[*?\[\]]/u;
const COMMIT_HOOKS = ['pre-commit', 'prepare-commit-msg', 'commit-msg', 'post-commit', 'reference-transaction'];

function fail(message, code = 2) {
  process.stderr.write(`local-commit-executor: ${message}\n`);
  process.exit(code);
}

function parseArguments(argv) {
  let message;
  const paths = [];

  for (let i = 0; i < argv.length; i += 1) {
    const option = argv[i];
    if (option === '--message') {
      if (message !== undefined || i + 1 >= argv.length) {
        fail('--message must be provided exactly once with a value.');
      }
      message = argv[++i];
      continue;
    }
    if (option === '--path') {
      if (i + 1 >= argv.length) fail('--path requires one file path.');
      paths.push(argv[++i]);
      continue;
    }
    fail(`unknown argument: ${option}`);
  }

  if (typeof message !== 'string' || message.trim() === '' || CONTROL_CHARS.test(message)) {
    fail('--message must be a non-empty single-line commit message.');
  }
  if (message.length > 300) fail('--message must be 300 characters or fewer.');
  if (paths.length === 0) fail('provide at least one --path.');

  const normalizedPaths = paths.map(validatePathSyntax);
  if (new Set(normalizedPaths.map((entry) => entry.toLowerCase())).size !== normalizedPaths.length) {
    fail('duplicate paths are not allowed.');
  }
  return { message, paths: normalizedPaths };
}

function validatePathSyntax(value) {
  if (typeof value !== 'string' || value === '' || CONTROL_CHARS.test(value)) {
    fail('each --path must be a non-empty relative file path.');
  }
  if (value.startsWith('-') || value.startsWith('/') || value.includes('\\') || value.includes(':')) {
    fail(`path must be repository-relative and use forward slashes: ${value}`);
  }
  if (PATHSPEC_CHARS.test(value)) fail(`pathspec patterns are not allowed: ${value}`);

  const segments = value.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    fail(`global or traversing paths are not allowed: ${value}`);
  }
  if (segments[0].toLowerCase() === '.git') fail('Git metadata paths cannot be staged.');
  if (path.posix.normalize(value) !== value) fail(`path must be normalized: ${value}`);
  return value;
}

function runGit(args) {
  const result = spawnSync(GIT_EXECUTABLE, args, {
    cwd: REPOSITORY_ROOT,
    env: Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/iu.test(key))),
    windowsHide: true,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  });

  if (result.error) fail(`could not run Git: ${result.error.message}`, 1);
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim();
    fail(detail || `Git exited with status ${result.status}.`, result.status || 1);
  }
  return result;
}

function verifyRepositoryAndFiles(paths) {
  for (const relativePath of paths) {
    const absolutePath = path.resolve(REPOSITORY_ROOT, ...relativePath.split('/'));
    const relativeCheck = path.relative(REPOSITORY_ROOT, absolutePath);
    if (relativeCheck === '' || relativeCheck.startsWith(`..${path.sep}`) || path.isAbsolute(relativeCheck)) {
      fail(`path is outside the repository: ${relativePath}`);
    }

    let current = path.resolve(REPOSITORY_ROOT);
    const segments = relativeCheck.split(path.sep);
    for (let index = 0; index < segments.length; index += 1) {
      current = path.join(current, segments[index]);
      try {
        const stat = fs.lstatSync(current);
        if (stat.isSymbolicLink()) fail(`symbolic links are not allowed: ${relativePath}`);
        if (index < segments.length - 1 && !stat.isDirectory()) {
          fail(`parent path is not a directory: ${relativePath}`);
        }
        if (index === segments.length - 1 && !stat.isFile()) {
          fail(`only individual regular files are allowed: ${relativePath}`);
        }
      } catch (error) {
        if (error.code === 'ENOENT') fail(`path must identify an existing file: ${relativePath}`);
        throw error;
      }
    }
  }

  const rootResult = runGit(['rev-parse', '--show-toplevel']);
  const actualRoot = path.resolve(rootResult.stdout.trim());
  const expectedRoot = path.resolve(REPOSITORY_ROOT);
  if (actualRoot.toLowerCase() !== expectedRoot.toLowerCase()) {
    fail(`unexpected repository root: ${actualRoot}`);
  }
  if (fs.realpathSync(expectedRoot).toLowerCase() !== expectedRoot.toLowerCase()) {
    fail('the configured repository root resolves through a link.');
  }

}

function readStagedPaths() {
  const result = runGit(['diff', '--cached', '--name-only', '--no-renames', '-z']);
  return result.stdout.split('\0').filter(Boolean);
}

function refuseConfiguredCommitHooks() {
  const hooksDirectory = runGit(['rev-parse', '--git-path', 'hooks']).stdout.trim();
  const absoluteHooksDirectory = path.isAbsolute(hooksDirectory)
    ? hooksDirectory
    : path.resolve(REPOSITORY_ROOT, hooksDirectory);

  for (const hookName of COMMIT_HOOKS) {
    const hookPath = path.join(absoluteHooksDirectory, hookName);
    try {
      const stat = fs.lstatSync(hookPath);
      if (stat.isFile() || stat.isSymbolicLink()) {
        fail(`commit hook is configured (${hookName}); refusing to stage or commit.`);
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

function assertExactPaths(actualPaths, authorizedPaths, stage) {
  const actual = [...actualPaths].sort();
  const authorized = [...authorizedPaths].sort();
  if (actual.length !== authorized.length || actual.some((entry, index) => entry !== authorized[index])) {
    fail(`${stage} paths do not exactly match the authorized files. Expected: ${JSON.stringify(authorized)}; found: ${JSON.stringify(actual)}.`);
  }
}

function main() {
  const { message, paths } = parseArguments(process.argv.slice(2));
  verifyRepositoryAndFiles(paths);
  refuseConfiguredCommitHooks();

  const initiallyStaged = readStagedPaths();
  if (initiallyStaged.length > 0) {
    fail(`the index already contains staged paths; refusing to include them: ${JSON.stringify(initiallyStaged)}`);
  }

  runGit(['--literal-pathspecs', 'add', '--', ...paths]);
  assertExactPaths(readStagedPaths(), paths, 'staged');
  runGit(['diff', '--cached', '--check']);
  runGit(['commit', '-m', message]);

  const committed = runGit(['diff-tree', '--no-commit-id', '--name-only', '--no-renames', '-r', '-z', 'HEAD']);
  assertExactPaths(committed.stdout.split('\0').filter(Boolean), paths, 'committed');
  process.stdout.write(`${runGit(['rev-parse', 'HEAD']).stdout.trim()}\n`);
}

try {
  main();
} catch (error) {
  fail(error.message || String(error), 1);
}
