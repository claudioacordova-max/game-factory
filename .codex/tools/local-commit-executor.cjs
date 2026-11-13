'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPOSITORY_ROOT = 'C:\\Users\\klaud\\Projects\\game-factory';
const GIT_EXECUTABLE = 'C:\\Program Files\\Git\\cmd\\git.exe';
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/u;
const COMMIT_HOOKS = ['pre-commit', 'prepare-commit-msg', 'commit-msg', 'post-commit', 'reference-transaction'];

function fail(message) { throw new Error(message); }

function validatePathSyntax(value) {
  if (typeof value !== 'string' || !value || CONTROL_CHARS.test(value)
    || /[:*?\[\]\\]/u.test(value) || value.startsWith('-') || value.startsWith('/')) {
    fail('expected an individual repository-relative file path using forward slashes');
  }
  const segments = value.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..'
    || /[. ]$/u.test(segment) || segment.toLowerCase() === '.git'
    || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(segment))
    || path.posix.normalize(value) !== value) fail('ambiguous or traversing file path: ' + value);
  return value;
}

const REPO_ARGUMENT = /^projects\/[a-z0-9][a-z0-9-]*$/u;

function validateRepoArgument(value) {
  if (typeof value !== 'string' || !REPO_ARGUMENT.test(value)) {
    fail('--repo must be exactly projects/<name> with <name> matching [a-z0-9][a-z0-9-]*');
  }
  return value;
}

// Resolves --repo to a nested repository root under factoryRoot. The target
// must be a real directory (no link or junction) with its own .git directory
// (not a file, so worktrees and gitlinks are refused) and be its own toplevel.
function resolveRepoRoot(value, factoryRoot, makeGitFor = makeGit) {
  validateRepoArgument(value);
  const root = path.resolve(factoryRoot, ...value.split('/'));
  let stat;
  try { stat = fs.lstatSync(root); }
  catch (error) { if (error.code === 'ENOENT') fail('--repo directory does not exist: ' + value); throw error; }
  if (!stat.isDirectory()) fail('--repo is not a directory: ' + value);
  if (fs.realpathSync(root).toLowerCase() !== root.toLowerCase()) fail('--repo resolves through a link');
  let dotGit;
  try { dotGit = fs.lstatSync(path.join(root, '.git')); }
  catch (error) { if (error.code === 'ENOENT') fail('--repo has no .git directory: ' + value); throw error; }
  if (!dotGit.isDirectory()) fail('--repo .git must be a real directory (worktrees and gitlinks are refused)');
  const top = makeGitFor(root)(['rev-parse', '--show-toplevel']).stdout.trim();
  if (path.resolve(top).toLowerCase() !== root.toLowerCase()) fail('--repo is not the toplevel of its own repository');
  return root;
}

function parseArguments(argv) {
  let message;
  let repo;
  const paths = [];
  for (let i = 0; i < argv.length; i += 1) {
    const option = argv[i];
    if (option === '--message') {
      if (message !== undefined || i + 1 >= argv.length) fail('--message must be provided exactly once with a value');
      message = argv[++i];
    } else if (option === '--path') {
      if (i + 1 >= argv.length) fail('--path requires one file path');
      paths.push(validatePathSyntax(argv[++i]));
    } else if (option === '--repo') {
      if (repo !== undefined || i + 1 >= argv.length) fail('--repo may be provided at most once, with a value');
      repo = validateRepoArgument(argv[++i]);
    } else fail('unknown argument: ' + option);
  }
  if (typeof message !== 'string' || !message.trim() || CONTROL_CHARS.test(message) || message.length > 300) {
    fail('--message must be a non-empty single-line message of at most 300 characters');
  }
  if (!paths.length || new Set(paths.map((file) => file.toLowerCase())).size !== paths.length) {
    fail('provide unique individual --path entries');
  }
  return { message, paths, repo };
}

function makeGit(root, executable = GIT_EXECUTABLE) {
  return (args) => {
    const result = spawnSync(executable, args, {
      cwd: root, windowsHide: true, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
      env: Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/iu.test(key))),
    });
    if (result.error) throw result.error;
    if (result.status !== 0) fail((result.stderr || result.stdout).trim() || 'Git exited ' + result.status);
    return result;
  };
}

function verifyRepository(root, git) {
  const resolved = path.resolve(root);
  if (fs.realpathSync(resolved).toLowerCase() !== resolved.toLowerCase()) fail('repository root resolves through a link');
  if (path.resolve(git(['rev-parse', '--show-toplevel']).stdout.trim()).toLowerCase() !== resolved.toLowerCase()) {
    fail('unexpected repository root');
  }
}

// Only ENOENT denotes absence. A broken link, non-directory parent or
// permission error must not be mistaken for a versioned deletion.
function inspectPath(root, file, filesystem = fs) {
  validatePathSyntax(file);
  const absolute = path.resolve(root, ...file.split('/'));
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) fail('path is outside the repository');
  let current = path.resolve(root);
  const parts = file.split('/');
  for (let i = 0; i < parts.length; i += 1) {
    const parent = current;
    current = path.join(current, parts[i]);
    let stat;
    try { stat = filesystem.lstatSync(current); }
    catch (error) { if (error.code === 'ENOENT') return { file, absolute, kind: 'delete' }; throw error; }
    if (!filesystem.readdirSync(parent).includes(parts[i])) fail('path spelling or case is ambiguous: ' + file);
    if (stat.isSymbolicLink()) fail('symbolic links are not allowed: ' + file);
    if (i < parts.length - 1 ? !stat.isDirectory() : !stat.isFile()) fail('only regular files through directories are allowed: ' + file);
  }
  return { file, absolute, kind: 'file' };
}

function deletionEntry(git, file) {
  const index = git(['--literal-pathspecs', 'ls-files', '--stage', '-z', '--', file]).stdout.split('\0').filter(Boolean);
  const head = git(['--literal-pathspecs', 'ls-tree', '-r', '-z', 'HEAD', '--', file]).stdout.split('\0').filter(Boolean);
  const entry = /^(100644|100755) ([a-f0-9]+) 0\t(.+)$/u.exec(index[0] || '');
  const original = /^(100644|100755) blob ([a-f0-9]+)\t(.+)$/u.exec(head[0] || '');
  if (index.length !== 1 || head.length !== 1 || !entry || !original
    || entry[3] !== file || original[3] !== file || entry[1] !== original[1] || entry[2] !== original[2]) {
    fail('missing path is not an exact unchanged regular file in HEAD and index: ' + file);
  }
  return { mode: entry[1], oid: entry[2] };
}

function classifyPath(root, file, git, filesystem = fs) {
  const candidate = inspectPath(root, file, filesystem);
  return candidate.kind === 'delete' ? { ...candidate, entry: deletionEntry(git, file) } : candidate;
}

function readStagedPaths(git) {
  return git(['diff', '--cached', '--name-only', '--ita-visible-in-index', '--no-renames', '-z']).stdout.split('\0').filter(Boolean);
}

function refuseConfiguredCommitHooks(root, git) {
  const hooks = git(['rev-parse', '--git-path', 'hooks']).stdout.trim();
  const directory = path.isAbsolute(hooks) ? hooks : path.resolve(root, hooks);
  for (const name of COMMIT_HOOKS) {
    try {
      const stat = fs.lstatSync(path.join(directory, name));
      if (stat.isFile() || stat.isSymbolicLink()) fail('commit hook is configured (' + name + '); refusing to stage or commit');
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}

function assertExactPaths(actual, authorized, stage) {
  const a = [...actual].sort(), b = [...authorized].sort();
  if (a.length !== b.length || a.some((entry, i) => entry !== b[i])) fail(stage + ' paths do not exactly match the authorized files');
}

function assertChangeTypes(output, candidates, stage) {
  const tokens = output.split('\0');
  if (tokens.pop() !== '' || tokens.length % 2) fail('invalid ' + stage + ' change records');
  const entries = [];
  for (let i = 0; i < tokens.length; i += 2) entries.push({ status: tokens[i], file: tokens[i + 1] });
  assertExactPaths(entries.map((entry) => entry.file), candidates.map((entry) => entry.file), stage);
  for (const entry of entries) {
    const candidate = candidates.find((item) => item.file === entry.file);
    if (candidate.kind === 'delete' ? entry.status !== 'D' : !/^[AMT]$/u.test(entry.status)) {
      fail('unexpected ' + stage + ' change type for ' + entry.file + ': ' + entry.status);
    }
  }
}

// Internal injection is for isolated repository tests. The CLI always uses
// the fixed production root/executable; no CLI or environment override exists.
function commitAuthorizedFiles(root, runGit, { message, paths }) {
  parseArguments(['--message', message, ...paths.flatMap((file) => ['--path', file])]);
  verifyRepository(root, runGit);
  refuseConfiguredCommitHooks(root, runGit);
  const initiallyStaged = readStagedPaths(runGit);
  if (initiallyStaged.length > 0) fail('the index already contains staged paths; refusing to include them');
  const head = runGit(['rev-parse', 'HEAD']).stdout.trim();
  const candidates = paths.map((file) => classifyPath(root, file, runGit));
  const rechecked = paths.map((file) => classifyPath(root, file, runGit));
  if (JSON.stringify(candidates) !== JSON.stringify(rechecked)) fail('authorized path classification changed before staging');
  refuseConfiguredCommitHooks(root, runGit);
  if (readStagedPaths(runGit).length || runGit(['rev-parse', 'HEAD']).stdout.trim() !== head) fail('Git state changed before staging');

  runGit(['--literal-pathspecs', 'add', '--', ...paths]);
  assertExactPaths(readStagedPaths(runGit), paths, 'staged');
  assertChangeTypes(runGit(['diff', '--cached', '--name-status', '--no-renames', '-z']).stdout, candidates, 'staged');
  runGit(['diff', '--cached', '--check']);
  for (const candidate of candidates) {
    if (inspectPath(root, candidate.file).kind !== candidate.kind) fail('authorized path classification changed after staging');
  }
  refuseConfiguredCommitHooks(root, runGit);
  if (runGit(['rev-parse', 'HEAD']).stdout.trim() !== head) fail('HEAD changed before commit');
  runGit(['commit', '-m', message]);
  const committed = runGit(['diff-tree', '--no-commit-id', '--name-status', '--no-renames', '-r', '-z', 'HEAD']);
  assertChangeTypes(committed.stdout, candidates, 'committed');
  return runGit(['rev-parse', 'HEAD']).stdout.trim();
}

function main(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  const root = options.repo ? resolveRepoRoot(options.repo, REPOSITORY_ROOT) : REPOSITORY_ROOT;
  const result = commitAuthorizedFiles(root, makeGit(root), options);
  process.stdout.write(result + '\n');
}

module.exports = { validateRepoArgument, resolveRepoRoot, validatePathSyntax, parseArguments, makeGit, verifyRepository, inspectPath, deletionEntry, classifyPath,
  readStagedPaths, refuseConfiguredCommitHooks, assertExactPaths, assertChangeTypes, commitAuthorizedFiles, main };
if (require.main === module) {
  try { main(); }
  catch (error) { process.stderr.write('local-commit-executor: ' + error.message + '\n'); process.exitCode = 1; }
}
