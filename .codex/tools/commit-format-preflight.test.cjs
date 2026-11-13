'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { parseArguments, validatePath, trimReviewedEof, preflight, sha256 } = require('./commit-format-preflight.cjs');

function fixture(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gf-preflight-test-'));
  const calls = [];
  const baselines = new Map();
  let staged = '';
  function write(file, content) {
    const absolute = path.join(root, file);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, content);
    return absolute;
  }
  function track(file, content) { baselines.set(file, write(`base-${baselines.size}`, content)); }
  function git(args, accepted = [0]) {
    calls.push(args);
    let result;
    if (args[0] === 'rev-parse') result = { status: 0, stdout: root, stderr: '' };
    else if (args[0] === 'diff' && args[1] === '--cached') result = { status: 0, stdout: staged, stderr: '' };
    else if (args[1] === 'ls-files') {
      const tracked = baselines.has(args.at(-1));
      result = args.includes('--stage')
        ? { status: 0, stdout: tracked ? '100644 ' + 'a'.repeat(40) + ' 0\t' + args.at(-1) + '\0' : '', stderr: '' }
        : { status: tracked ? 0 : 1, stdout: '', stderr: '' };
    } else if (args[1] === 'ls-tree') {
      const tracked = baselines.has(args.at(-1));
      result = { status: 0, stdout: tracked ? '100644 blob ' + 'a'.repeat(40) + '\t' + args.at(-1) + '\0' : '', stderr: '' };
    } else if (args.includes('--check') && baselines.has(args.at(-1)) && !fs.existsSync(path.join(root, args.at(-1)))) {
      result = { status: 0, stdout: '', stderr: '' };
    }
    else {
      const diffArgs = args[0] === '--literal-pathspecs'
        ? ['diff', '--no-index', '--check', '--', baselines.get(args.at(-1)), path.join(root, args.at(-1))]
        : args;
      assert.equal(diffArgs[0], 'diff');
      assert.equal(diffArgs[1], '--no-index');
      result = spawnSync('git', diffArgs, { cwd: root, windowsHide: true, encoding: 'utf8' });
      if (result.error) throw result.error;
      if (args[0] === '--literal-pathspecs') result.status &= 2;
    }
    assert.ok(accepted.includes(result.status), `Unexpected Git result ${result.status}: ${result.stderr}`);
    return result;
  }
  try { run({ root, write, track, git, calls, setStaged: (value) => { staged = value; } }); }
  finally {
    // The only recursive cleanup is the verified mkdtemp directory for this test.
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('gf-preflight-test-'));
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('argument parser accepts explicit files and exact-content EOF attestations', () => {
  const hash = 'a'.repeat(64);
  const result = parseArguments(['--path', 'tests/example.fixture', '--safe-eof', 'tests/example.fixture', hash]);
  assert.deepEqual(result.paths, ['tests/example.fixture']);
  assert.equal(result.safeEof.get('tests/example.fixture'), hash);
});

test('rejects traversal, patterns, absolute paths, metadata and invalid arguments', () => {
  for (const value of ['../x', 'a/../x', '/x', 'C:/x', 'a\\b', '.git/index', '.GIT/config', '.git./config', 'nested/.git/config', 'nul.txt', '*.ts', 'a?[x]', 'a//b', '-x', 'a\nb']) {
    assert.throws(() => validatePath(value), /file path/u);
  }
  for (const args of [[], ['--path'], ['--wat'], ['--path', 'x', '--path', 'X'], ['--path', 'x', '--safe-eof', 'y', 'a'.repeat(64)], ['--path', 'x', '--safe-eof', 'x', 'bad']]) {
    assert.throws(() => parseArguments(args));
  }
});

test('removes only reviewed EOF blank lines while preserving BOM, CRLF and other spaces', () => {
  const input = Buffer.from('\uFEFFconst fixture = `inside  \r\n\r\n`;  \r\n \t\r\n\r\n');
  const output = trimReviewedEof(input);
  assert.deepEqual(output, Buffer.from('\uFEFFconst fixture = `inside  \r\n\r\n`;  \r\n'));
  assert.deepEqual(trimReviewedEof(output), output);
  assert.deepEqual(trimReviewedEof(Buffer.from('\n\n')), Buffer.from('\n\n'));
});

test('does not add a newline or change a file with no extra blank suffix', () => {
  for (const value of ['const x = 1;', 'const x = 1;\n', 'const x = 1;  \n']) {
    assert.deepEqual(trimReviewedEof(Buffer.from(value)), Buffer.from(value));
  }
  assert.throws(() => trimReviewedEof(Buffer.from([0xff, 0xfe])), /encoded data/u);
  assert.throws(() => trimReviewedEof(Buffer.from([0, 10, 10])), /binary/u);
});

test('detects new test files before staging, including extra EOF and non-EOF whitespace', () => fixture(({ root, write, git, calls }) => {
  write('tests/new.test.cjs', 'const x = 1;\n\n');
  write('tests/new-fixture.txt', 'line with trailing space \nnext\n');
  const result = preflight(root, { paths: ['tests/new.test.cjs', 'tests/new-fixture.txt'] }, git);
  assert.equal(result.ok, false);
  assert.equal(result.checks[0].ok, false);
  assert.match(result.checks[0].detail, /blank line at EOF/u);
  assert.match(result.checks[1].detail, /trailing whitespace/u);
  assert.ok(calls.some((args) => args.includes('--no-index')));
  assert.ok(calls.every((args) => !args.includes('add') && !args.includes('commit')));
}));

test('tracked file check uses HEAD, and detects changed whitespace', () => fixture(({ root, write, track, git, calls }) => {
  track('source.ts', 'const x = 1;\n');
  write('source.ts', 'const x = 2;\n\n');
  const result = preflight(root, { paths: ['source.ts'] }, git);
  assert.equal(result.ok, false);
  assert.ok(calls.some((args) => args.includes('HEAD') && args.at(-1) === 'source.ts'));
}));

test('safe correction is explicit, exact, includes tests, preserves unrelated files and passes recheck', () => fixture(({ root, write, git }) => {
  const target = write('tests/new.test.cjs', 'module.exports = `literal\n\n`;\n\n\n');
  const unrelated = write('unrelated.txt', 'leave me  \n\n');
  const before = fs.readFileSync(target);
  const unrelatedBefore = fs.readFileSync(unrelated);
  const result = preflight(root, { paths: ['tests/new.test.cjs'], safeEof: new Map([['tests/new.test.cjs', sha256(before)]]) }, git);
  assert.equal(result.ok, true);
  assert.deepEqual(result.fixed, ['tests/new.test.cjs']);
  assert.deepEqual(fs.readFileSync(target), Buffer.from('module.exports = `literal\n\n`;\n'));
  assert.deepEqual(fs.readFileSync(unrelated), unrelatedBefore);
  assert.equal(preflight(root, { paths: ['tests/new.test.cjs'] }, git).ok, true);
}));

test('filename never grants correction: fixture, snapshot and unfinished literal remain untouched', () => fixture(({ root, write, git }) => {
  const paths = ['tests/input.fixture', 'tests/output.snap', 'tests/literal.test.cjs'];
  const content = ['significant final empty records\n\n', 'snapshot literal\n\n', 'const input = `literal ends here\n\n'];
  paths.forEach((file, i) => write(file, content[i]));
  assert.equal(preflight(root, { paths }, git).ok, false);
  paths.forEach((file, i) => assert.deepEqual(fs.readFileSync(path.join(root, file)), Buffer.from(content[i])));
}));

test('stale safety attestation stops before any writes', () => fixture(({ root, write, git }) => {
  const first = write('first.cjs', 'valid();\n\n');
  const second = write('second.cjs', 'newer();\n\n');
  assert.throws(() => preflight(root, {
    paths: ['first.cjs', 'second.cjs'],
    safeEof: new Map([['first.cjs', sha256(fs.readFileSync(first))], ['second.cjs', sha256(Buffer.from('old();\n\n'))]]),
  }, git), /SHA-256 no longer matches/u);
  assert.equal(fs.readFileSync(first, 'utf8'), 'valid();\n\n');
  assert.equal(fs.readFileSync(second, 'utf8'), 'newer();\n\n');
}));

test('a preexisting staged index is rejected before correction', () => fixture(({ root, write, git, setStaged }) => {
  const target = write('source.ts', 'content\n\n');
  setStaged('unrelated.txt\0');
  assert.throws(() => preflight(root, { paths: ['source.ts'], safeEof: new Map([['source.ts', sha256(fs.readFileSync(target))]]) }, git), /index already contains/u);
  assert.equal(fs.readFileSync(target, 'utf8'), 'content\n\n');
}));

test('noncorrectible trailing whitespace is reported without general formatting', () => fixture(({ root, write, git }) => {
  const target = write('source.ts', 'const x = 1;  \n\n');
  const result = preflight(root, { paths: ['source.ts'], safeEof: new Map([['source.ts', sha256(fs.readFileSync(target))]]) }, git);
  assert.equal(result.ok, false);
  assert.match(result.checks[0].detail, /trailing whitespace/u);
  assert.equal(fs.readFileSync(target, 'utf8'), 'const x = 1;  \n');
}));

test('rejects unauthorized corrections, directories, links and multiply linked writes', () => fixture(({ root, write, git }) => {
  const target = write('dir/source.ts', 'valid();\n\n');
  assert.throws(() => preflight(root, { paths: ['dir/source.ts'], safeEof: new Map([['elsewhere.ts', 'a'.repeat(64)]]) }, git), /not authorized/u);
  assert.throws(() => preflight(root, { paths: ['dir'] }, git), /regular files/u);
  fs.symlinkSync(path.join(root, 'dir'), path.join(root, 'linked-dir'), 'junction');
  assert.throws(() => preflight(root, { paths: ['linked-dir/source.ts'] }, git), /symbolic links/u);
  fs.linkSync(target, path.join(root, 'hardlink.ts'));
  assert.throws(() => preflight(root, { paths: ['dir/source.ts'], safeEof: new Map([['dir/source.ts', sha256(fs.readFileSync(target))]]) }, git), /multiply linked/u);
}));

test('preflight Git errors do not get treated as whitespace or bypassed', () => fixture(({ root, write, git }) => {
  write('source.ts', 'valid();\n');
  const failingGit = (args, accepted) => {
    if (args.includes('--check')) throw new Error('Git permission denied');
    return git(args, accepted);
  };
  assert.throws(() => preflight(root, { paths: ['source.ts'] }, failingGit), /permission denied/u);
}));

test('safe executor matches its reviewed hash and retains security/format gates', () => {
  const executor = fs.readFileSync(path.join(__dirname, 'local-commit-executor.cjs'));
  assert.equal(sha256(executor), '573e8e185e7bb5561da5c786569e06eb1b1a152267248685d83e2ac262d0e5bf');
  for (const gate of ["runGit(['diff', '--cached', '--check'])", 'refuseConfiguredCommitHooks(root, runGit)', "runGit(['--literal-pathspecs', 'add'", 'initiallyStaged.length > 0']) {
    assert.ok(executor.toString('utf8').includes(gate));
  }
});

test('checks verified deletions including absent parents alongside new files without staging', () => fixture(({ root, write, track, git, calls }) => {
  track('old/nested/gone.md', 'old\n');
  write('new.md', 'new\n');
  const result = preflight(root, { paths: ['old/nested/gone.md', 'new.md'] }, git);
  assert.equal(result.ok, true);
  assert.equal(result.checks.length, 2);
  assert.ok(calls.some((args) => args.includes('ls-tree') && args.includes('HEAD')));
  assert.ok(calls.every((args) => !args.includes('add') && !args.includes('commit')));
}));

test('rejects an unknown missing path before any otherwise safe EOF correction', () => fixture(({ root, write, git }) => {
  const target = write('first.md', 'content\n\n');
  const original = fs.readFileSync(target);
  assert.throws(() => preflight(root, { paths: ['first.md', 'unknown.md'], safeEof: new Map([['first.md', sha256(original)]]) }, git), /exact unchanged regular/u);
  assert.deepEqual(fs.readFileSync(target), original);
}));

test('rejects EOF attestation for a verified deletion before correcting another file', () => fixture(({ root, write, track, git }) => {
  track('gone.md', 'old\n');
  const target = write('first.md', 'content\n\n');
  const original = fs.readFileSync(target);
  assert.throws(() => preflight(root, {
    paths: ['first.md', 'gone.md'],
    safeEof: new Map([['first.md', sha256(original)], ['gone.md', sha256(Buffer.from('old\n'))]]),
  }, git), /not allowed for a versioned deletion/u);
  assert.deepEqual(fs.readFileSync(target), original);
}));

test('rejects a deletion that reappears during the read-only checks', () => fixture(({ root, write, track, git }) => {
  track('gone.md', 'old\n');
  let changed = false;
  const racingGit = (args, accepted) => {
    const result = git(args, accepted);
    if (!changed && args.includes('--check') && args.at(-1) === 'gone.md') { changed = true; write('gone.md', 'reappeared\n'); }
    return result;
  };
  assert.throws(() => preflight(root, { paths: ['gone.md'] }, racingGit), /classification changed/u);
}));

test('classifies filesystem permission errors as errors, never as deletions', () => fixture(({ root, git }) => {
  const { classifyPath } = require('./commit-format-preflight.cjs');
  const filesystem = { lstatSync() { const error = new Error('denied'); error.code = 'EACCES'; throw error; }, readdirSync: fs.readdirSync };
  assert.throws(() => classifyPath(root, 'gone.md', git, filesystem), /denied/u);
}));

// --- --repo (SEP-1) ---------------------------------------------------------
const { validateRepoArgument, resolveRepoRoot } = require('./commit-format-preflight.cjs');
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
  assert.throws(() => parseArguments(['--repo', 'projects/a', '--repo', 'projects/b'].concat(['--path', 'a.md'])), /at most once/u);
  assert.throws(() => parseArguments(['--repo'].concat([])), /./u);
  assert.equal(parseArguments(['--repo', 'projects/a'].concat(['--path', 'a.md'])).repo, 'projects/a');
  assert.equal(parseArguments(['--path', 'a.md']).repo, undefined);
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

test('preflight through --repo checks the nested repository and refuses a non-toplevel factory', () => repoFixture(({ factory, nested }) => {
  const { resolveRoot } = require('./commit-format-preflight.cjs');
  fs.writeFileSync(path.join(nested, 'a.md'), 'two\n');
  const root = resolveRoot('projects/game-one', factory);
  assert.equal(root.toLowerCase(), nested.toLowerCase());
  const result = preflight(root, { paths: ['a.md'] });
  assert.equal(result.ok, true);
  assert.equal(gitIn(nested, ['diff', '--cached', '--name-only']), '');
  const notFactory = fs.mkdtempSync(path.join(os.tmpdir(), 'gf-repoarg-test-'));
  try { assert.throws(() => resolveRoot('projects/x', notFactory), /unexpected factory|Git|not a git/iu); }
  finally { fs.rmSync(notFactory, { recursive: true, force: true }); }
}));
