'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { parseArguments, validatePathSyntax, inspectPath, classifyPath, deletionEntry,
  assertChangeTypes, commitAuthorizedFiles } = require('./local-commit-executor.cjs');

function fixture(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gf-executor-test-'));
  const write = (file, content = 'changed\n') => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
  };
  const git = (args) => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    const result = spawnSync('git', args, {
      cwd: root, windowsHide: true, encoding: 'utf8',
      env: Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/iu.test(key))),
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error((result.stderr || result.stdout).trim() || 'Git failed');
    return result;
  };
  try {
    git(['init', '--quiet']);
    git(['config', 'user.name', 'Executor fixture']);
    git(['config', 'user.email', 'executor@example.invalid']);
    git(['config', 'core.autocrlf', 'false']);
    git(['config', 'commit.gpgsign', 'false']);
    git(['config', 'core.hooksPath', path.join(root, '.git', 'hooks')]);
    write('edit.md', 'original\n');
    write('old/nested/gone.md', 'move this\n');
    write('untouched.md', 'keep this\n');
    git(['add', '--', 'edit.md', 'old/nested/gone.md', 'untouched.md']);
    git(['commit', '--quiet', '-m', 'fixture baseline']);
    const head = git(['rev-parse', 'HEAD']).stdout.trim();
    const calls = [];
    const trackedGit = (args) => { calls.push(args); return git(args); };
    run({ root, write, git, trackedGit, calls, head });
  } finally {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('gf-executor-test-'));
    assert.equal(fs.realpathSync(root).toLowerCase(), path.resolve(root).toLowerCase());
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function removeOld(root) {
  fs.unlinkSync(path.join(root, 'old/nested/gone.md'));
  fs.rmdirSync(path.join(root, 'old/nested'));
  fs.rmdirSync(path.join(root, 'old'));
}
function options(paths) { return { message: 'fixture authorized change', paths }; }
function noWrites(calls) {
  assert.ok(calls.every((args) => !args.includes('add') && args[0] !== 'commit'));
}

test('CLI accepts only the existing explicit interface and rejects aliases or ambiguous paths', () => {
  assert.deepEqual(parseArguments(['--message', 'ok', '--path', 'file.md']), { message: 'ok', paths: ['file.md'], repo: undefined });
  for (const value of ['../a', 'a/../b', '/a', 'C:/a', 'a\\b', '*.md', 'a?[b]', 'a//b',
    '.git/config', 'nested/.git/config', '.git./config', 'NUL.txt', 'a./b', 'a /b', '-x', 'a\nb']) {
    assert.throws(() => validatePathSyntax(value));
  }
  for (const argv of [[], ['--message', 'x'], ['--message', 'x', '--path', 'a', '--path', 'A'],
    ['--message', 'a\nb', '--path', 'a'], ['--message', 'x', '--path', 'a', '--root', 'elsewhere'],
    ['--message', 'x', '--delete', 'a'], ['--message', 'x', '--path'], ['--wat']]) {
    assert.throws(() => parseArguments(argv));
  }
});

test('classifies a tracked deletion whose parent directories are also absent', () => fixture(({ root, git }) => {
  removeOld(root);
  const result = classifyPath(root, 'old/nested/gone.md', git);
  assert.equal(result.kind, 'delete');
  assert.equal(result.entry.mode, '100644');
}));

test('accepts a previously versioned executable regular file for deletion', () => fixture(({ root, git }) => {
  git(['update-index', '--chmod=+x', '--', 'edit.md']);
  git(['commit', '--quiet', '-m', 'fixture executable']);
  fs.unlinkSync(path.join(root, 'edit.md'));
  assert.equal(classifyPath(root, 'edit.md', git).entry.mode, '100755');
}));

test('rejects unknown missing files, tracked-directory prefixes and path case aliases', () => fixture(({ root, git }) => {
  removeOld(root);
  assert.throws(() => classifyPath(root, 'unknown.md', git), /exact unchanged regular file/u);
  assert.throws(() => classifyPath(root, 'old', git), /exact unchanged regular file/u);
  assert.throws(() => classifyPath(root, 'EDIT.md', git), /ambiguous|exact unchanged/u);
}));

test('rejects present directories, junction traversal and broken junctions', () => fixture(({ root, write, git }) => {
  write('target/file.md');
  assert.throws(() => classifyPath(root, 'target', git), /regular files/u);
  fs.symlinkSync(path.join(root, 'target'), path.join(root, 'alias'), 'junction');
  assert.throws(() => classifyPath(root, 'alias/file.md', git), /symbolic links/u);
  fs.symlinkSync(path.join(root, 'missing-target'), path.join(root, 'broken'), 'junction');
  assert.throws(() => classifyPath(root, 'broken/file.md', git), /symbolic links/u);
}));

test('propagates filesystem errors other than ENOENT rather than accepting a deletion', () => fixture(({ root, git }) => {
  const filesystem = { lstatSync() { const error = new Error('denied'); error.code = 'EACCES'; throw error; }, readdirSync: fs.readdirSync };
  assert.throws(() => classifyPath(root, 'edit.md', git, filesystem), /denied/u);
}));

test('requires one exact stage-zero regular entry matching HEAD mode and object', () => {
  const oid = 'a'.repeat(40), file = 'gone.md';
  const validIndex = '100644 ' + oid + ' 0\t' + file + '\0';
  const validHead = '100644 blob ' + oid + '\t' + file + '\0';
  const invalid = [
    ['120000 ' + oid + ' 0\t' + file + '\0', '120000 blob ' + oid + '\t' + file + '\0'],
    ['160000 ' + oid + ' 0\t' + file + '\0', '160000 commit ' + oid + '\t' + file + '\0'],
    [validIndex.replace(' 0\t', ' 1\t'), validHead],
    [validIndex, validHead.replace(oid, 'b'.repeat(40))],
    [validIndex, validHead.replace('100644', '100755')],
    [validIndex, ''], ['', validHead], [validIndex + validIndex, validHead],
    [validIndex.replace(file, 'GONE.md'), validHead], [validIndex.replace(file, file + '/child'), validHead],
  ];
  for (const [index, head] of invalid) {
    assert.throws(() => deletionEntry((args) => ({ stdout: args.includes('ls-files') ? index : head }), file), /exact unchanged/u);
  }
});

test('commits exactly mixed A/M/D and a move using real Git, leaving unrelated changes untouched', () => fixture(({ root, write, git, trackedGit, head }) => {
  removeOld(root);
  write('moved/gone.md', 'move this\n');
  write('edit.md');
  write('added.md');
  write('untouched.md', 'unrelated modification\n');
  write('unrelated-new.md');
  const paths = ['edit.md', 'old/nested/gone.md', 'moved/gone.md', 'added.md'];
  const hash = commitAuthorizedFiles(root, trackedGit, options(paths));
  assert.notEqual(hash, head);
  const entries = git(['diff-tree', '--no-commit-id', '--name-only', '--no-renames', '-r', '-z', 'HEAD']).stdout.split('\0').filter(Boolean);
  assert.deepEqual(entries.sort(), [...paths].sort());
  assert.equal(git(['diff', '--cached', '--name-only']).stdout, '');
  assert.match(git(['status', '--porcelain']).stdout, /untouched.md/u);
  assert.match(git(['status', '--porcelain']).stdout, /unrelated-new.md/u);
  assert.equal(git(['show', 'HEAD:untouched.md']).stdout, 'keep this\n');
}));

test('validates the whole batch before staging when a later missing path is invalid', () => fixture(({ root, write, trackedGit, calls, git, head }) => {
  write('edit.md');
  assert.throws(() => commitAuthorizedFiles(root, trackedGit, options(['edit.md', 'unknown.md'])), /exact unchanged/u);
  noWrites(calls);
  assert.equal(git(['diff', '--cached', '--name-only']).stdout, '');
  assert.equal(git(['rev-parse', 'HEAD']).stdout.trim(), head);
}));

test('rejects both a pre-staged change and intent-to-add without writing', () => fixture(({ root, write, git, trackedGit, calls }) => {
  write('edit.md');
  git(['add', '--', 'edit.md']);
  assert.throws(() => commitAuthorizedFiles(root, trackedGit, options(['edit.md'])), /index already contains/u);
  noWrites(calls);
  // This reset is isolated fixture setup, never the Game Factory index.
  git(['reset', '--quiet', 'HEAD', '--', 'edit.md']);
  write('intent.md');
  git(['add', '-N', '--', 'intent.md']);
  calls.length = 0;
  assert.throws(() => commitAuthorizedFiles(root, trackedGit, options(['edit.md'])), /index already contains/u);
  noWrites(calls);
}));

test('rejects a conflict reported by the index before staging', () => fixture(({ root, trackedGit, calls }) => {
  const git = (args) => args.includes('--ita-visible-in-index') ? { stdout: 'conflict.md\0' } : trackedGit(args);
  assert.throws(() => commitAuthorizedFiles(root, git, options(['edit.md'])), /index already contains/u);
  noWrites(calls);
}));

test('refuses every configured commit hook without staging', () => fixture(({ root, write, trackedGit, calls }) => {
  for (const hook of ['pre-commit', 'prepare-commit-msg', 'commit-msg', 'post-commit', 'reference-transaction']) {
    write('.git/hooks/' + hook, '# fixture\n');
    calls.length = 0;
    assert.throws(() => commitAuthorizedFiles(root, trackedGit, options(['edit.md'])), /commit hook is configured/u);
    noWrites(calls);
    fs.unlinkSync(path.join(root, '.git/hooks', hook));
  }
}));

test('stops before staging when a deleted file reappears during validation', () => fixture(({ root, write, git, calls, head }) => {
  removeOld(root);
  let checked = false;
  const racingGit = (args) => {
    calls.push(args);
    const result = git(args);
    if (!checked && args.includes('ls-files') && args.includes('--stage')) { checked = true; write('old/nested/gone.md', 'reappeared\n'); }
    return result;
  };
  assert.throws(() => commitAuthorizedFiles(root, racingGit, options(['old/nested/gone.md'])), /classification changed/u);
  noWrites(calls);
  assert.equal(git(['rev-parse', 'HEAD']).stdout.trim(), head);
}));

test('stops before staging when an existing file disappears during validation', () => fixture(({ root, write, git, trackedGit, calls }) => {
  write('edit.md');
  const original = fs.readdirSync;
  let checked = false;
  fs.readdirSync = function (directory, ...args) {
    const result = original.call(fs, directory, ...args);
    if (!checked && directory === root && result.includes('edit.md')) { checked = true; fs.unlinkSync(path.join(root, 'edit.md')); }
    return result;
  };
  try { assert.throws(() => commitAuthorizedFiles(root, trackedGit, options(['edit.md'])), /classification changed/u); }
  finally { fs.readdirSync = original; }
  noWrites(calls);
  assert.equal(git(['diff', '--cached', '--name-only']).stdout, '');
}));

test('rejects unexpected staged D/M type after a race before Git add', () => fixture(({ root, write, git, calls, head }) => {
  removeOld(root);
  const racingGit = (args) => {
    calls.push(args);
    if (args[0] === '--literal-pathspecs' && args[1] === 'add') write('old/nested/gone.md', 'reappeared\n');
    return git(args);
  };
  assert.throws(() => commitAuthorizedFiles(root, racingGit, options(['old/nested/gone.md'])), /unexpected staged change type/u);
  assert.equal(git(['rev-parse', 'HEAD']).stdout.trim(), head);
  assert.ok(calls.every((args) => args[0] !== 'commit'));
}));

test('rejects a deletion reappearing or an existing file disappearing after staging', () => {
  for (const kind of ['delete', 'file']) fixture(({ root, write, git, calls, head }) => {
    const file = kind === 'delete' ? 'old/nested/gone.md' : 'edit.md';
    if (kind === 'delete') removeOld(root); else write(file);
    const racingGit = (args) => {
      calls.push(args);
      const result = git(args);
      if (args[0] === '--literal-pathspecs' && args[1] === 'add') {
        if (kind === 'delete') write(file, 'reappeared\n'); else fs.unlinkSync(path.join(root, file));
      }
      return result;
    };
    assert.throws(() => commitAuthorizedFiles(root, racingGit, options([file])), /classification changed after staging/u);
    assert.equal(git(['rev-parse', 'HEAD']).stdout.trim(), head);
    assert.ok(calls.every((args) => args[0] !== 'commit'));
  });
});

test('stops before commit for whitespace errors, preserving the prepared explicit paths', () => fixture(({ root, write, trackedGit, calls, git, head }) => {
  write('edit.md', 'bad trailing space \n');
  assert.throws(() => commitAuthorizedFiles(root, trackedGit, options(['edit.md'])), /trailing whitespace/u);
  assert.equal(git(['rev-parse', 'HEAD']).stdout.trim(), head);
  assert.ok(calls.every((args) => args[0] !== 'commit'));
  assert.equal(git(['diff', '--cached', '--name-only']).stdout.trim(), 'edit.md');
}));

test('detects an external extra staged path and never commits it', () => fixture(({ root, write, git, calls, head }) => {
  write('edit.md'); write('unrelated.md');
  const racingGit = (args) => {
    calls.push(args);
    const result = git(args);
    if (args[0] === '--literal-pathspecs' && args[1] === 'add') git(['add', '--', 'unrelated.md']);
    return result;
  };
  assert.throws(() => commitAuthorizedFiles(root, racingGit, options(['edit.md'])), /staged paths do not exactly match/u);
  assert.equal(git(['rev-parse', 'HEAD']).stdout.trim(), head);
  assert.ok(calls.every((args) => args[0] !== 'commit'));
}));

test('propagates Git failure without staging and validates committed paths and types', () => fixture(({ root, trackedGit, calls }) => {
  const brokenGit = (args) => { if (args.includes('HEAD')) throw new Error('Git denied'); return trackedGit(args); };
  assert.throws(() => commitAuthorizedFiles(root, brokenGit, options(['edit.md'])), /Git denied/u);
  noWrites(calls);
  const candidates = [{ file: 'a.md', kind: 'file' }, { file: 'b.md', kind: 'delete' }];
  assert.doesNotThrow(() => assertChangeTypes('M\0a.md\0D\0b.md\0', candidates, 'committed'));
  for (const output of ['M\0a.md\0M\0b.md\0', 'M\0a.md\0', 'R100\0b.md\0a.md\0', 'M\0a.md']) {
    assert.throws(() => assertChangeTypes(output, candidates, 'committed'));
  }
}));

// --- --repo (SEP-1) ---------------------------------------------------------
const { validateRepoArgument, resolveRepoRoot } = require('./local-commit-executor.cjs');
const CLEAN_ENV = () => Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/iu.test(key)));
const gitIn = (cwd, args) => {
  const result = spawnSync('git', args, { cwd, windowsHide: true, encoding: 'utf8', env: CLEAN_ENV() });
  if (result.error || result.status !== 0) throw new Error((result.error && result.error.message) || result.stderr || 'Git failed');
  return result.stdout.trim();
};

// Temporary "factory" directory (itself a repo) holding projects/<name> repos.
function repoFixture(run) {
  const factory = fs.mkdtempSync(path.join(os.tmpdir(), 'gf-repoarg-test-'));
  const initRepo = (dir) => {
    fs.mkdirSync(dir, { recursive: true });
    gitIn(dir, ['init', '--quiet']);
    for (const [k, v] of [['user.name', 'Fixture'], ['user.email', 'fixture@example.invalid'], ['core.autocrlf', 'false'], ['commit.gpgsign', 'false']]) gitIn(dir, ['config', k, v]);
    fs.writeFileSync(path.join(dir, 'a.md'), 'one\n');
    gitIn(dir, ['add', 'a.md']);
    gitIn(dir, ['commit', '--quiet', '-m', 'baseline']);
  };
  try {
    initRepo(factory);
    initRepo(path.join(factory, 'projects', 'game-one'));
    run({ factory, initRepo, nested: path.join(factory, 'projects', 'game-one') });
  } finally {
    assert.ok(path.basename(factory).startsWith('gf-repoarg-test-'));
    fs.rmSync(factory, { recursive: true, force: true });
  }
}

test('--repo accepts only projects/<name> syntax and at most once', () => {
  assert.equal(validateRepoArgument('projects/juego-1'), 'projects/juego-1');
  for (const bad of ['../x', 'projects/../x', 'C:\\x', 'C:/x', '/projects/a', 'projects\\a', 'projects/A', 'projects/-a',
    'projects/a_b', 'projects/a/b', 'projects/', 'projects', 'other/a', 'projects/a ', './projects/a', '']) {
    assert.throws(() => validateRepoArgument(bad), /--repo/u, bad);
  }
  assert.throws(() => parseArguments(['--repo', 'projects/a', '--repo', 'projects/b'].concat(['--message', 'm', '--path', 'a.md'])), /at most once/u);
  assert.throws(() => parseArguments(['--repo'].concat([])), /./u);
  assert.equal(parseArguments(['--repo', 'projects/a'].concat(['--message', 'm', '--path', 'a.md'])).repo, 'projects/a');
  assert.equal(parseArguments(['--message', 'm', '--path', 'a.md']).repo, undefined);
});

test('resolveRepoRoot rejects missing dir, no .git, .git file, non-toplevel and links', () => repoFixture(({ factory, nested }) => {
  assert.equal(resolveRepoRoot('projects/game-one', factory).toLowerCase(), nested.toLowerCase());
  assert.throws(() => resolveRepoRoot('projects/missing', factory), /does not exist/u);
  fs.mkdirSync(path.join(factory, 'projects', 'plain'));
  assert.throws(() => resolveRepoRoot('projects/plain', factory), /no \.git/u);
  fs.mkdirSync(path.join(factory, 'projects', 'gitfile'));
  fs.writeFileSync(path.join(factory, 'projects', 'gitfile', '.git'), 'gitdir: ../game-one/.git\n');
  assert.throws(() => resolveRepoRoot('projects/gitfile', factory), /real directory/u);
  fs.mkdirSync(path.join(factory, 'projects', 'fakegit', '.git'), { recursive: true });
  assert.throws(() => resolveRepoRoot('projects/fakegit', factory), /not the toplevel|not a git|Git/iu);
  fs.writeFileSync(path.join(factory, 'projects', 'afile'), 'x');
  assert.throws(() => resolveRepoRoot('projects/afile', factory), /not a directory/u);
  let linked = false;
  try { fs.symlinkSync(nested, path.join(factory, 'projects', 'linked'), 'junction'); linked = true; } catch { /* OS cannot create it */ }
  if (linked) assert.throws(() => resolveRepoRoot('projects/linked', factory), /not a directory|link/u);
}));

test('commit through --repo root touches only the nested repository', () => repoFixture(({ factory, nested }) => {
  const { makeGit } = require('./local-commit-executor.cjs');
  const factoryHead = gitIn(factory, ['rev-parse', 'HEAD']);
  const factoryStatusBefore = gitIn(factory, ['status', '--porcelain']);
  fs.writeFileSync(path.join(nested, 'a.md'), 'two\n');
  const root = resolveRepoRoot('projects/game-one', factory);
  const nestedHead = gitIn(nested, ['rev-parse', 'HEAD']);
  const hash = commitAuthorizedFiles(root, makeGit(root), { message: 'nested change', paths: ['a.md'] });
  assert.notEqual(hash, nestedHead);
  assert.equal(gitIn(nested, ['rev-parse', 'HEAD']), hash);
  assert.equal(gitIn(nested, ['status', '--porcelain']), '');
  assert.equal(gitIn(factory, ['rev-parse', 'HEAD']), factoryHead);
  assert.equal(gitIn(factory, ['status', '--porcelain']), factoryStatusBefore);
}));
