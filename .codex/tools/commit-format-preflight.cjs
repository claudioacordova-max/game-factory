'use strict';

// Preventive check only. This helper never stages files or invokes a commit.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function validatePath(value) {
  if (typeof value !== 'string' || !value || /[\u0000-\u001f\u007f:*?\[\]\\]/u.test(value)
    || value.startsWith('-') || value.startsWith('/')
    || value.split('/').some((part) => !part || part === '.' || part === '..'
      || /[. ]$/u.test(part) || part.toLowerCase() === '.git'
      || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(part))) {
    throw new Error(`expected an individual repository-relative file path: ${value}`);
  }
  return value;
}

function parseArguments(argv) {
  const paths = [];
  const safeEof = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--path' && i + 1 < argv.length) paths.push(validatePath(argv[++i]));
    else if (argv[i] === '--safe-eof' && i + 2 < argv.length) {
      const file = validatePath(argv[++i]);
      const digest = argv[++i].toLowerCase();
      if (!/^[a-f0-9]{64}$/u.test(digest) || safeEof.has(file)) throw new Error('each --safe-eof needs a unique path and SHA-256');
      safeEof.set(file, digest);
    } else throw new Error(`unknown or incomplete argument: ${argv[i]}`);
  }
  if (!paths.length || new Set(paths.map((file) => file.toLowerCase())).size !== paths.length) {
    throw new Error('provide unique --path entries; directories and patterns are not supported');
  }
  for (const file of safeEof.keys()) if (!paths.includes(file)) throw new Error(`--safe-eof is outside authorized --path entries: ${file}`);
  return { paths, safeEof };
}

function fail(message) { throw new Error(message); }

function inspectPath(root, file, filesystem = fs) {
  validatePath(file);
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


function regularFile(root, file) {
  const result = inspectPath(root, file);
  if (result.kind !== "file") throw new Error("EOF correction requires an existing regular file");
  return result.absolute;
}

function trimReviewedEof(bytes) {
  // The coordinator, not a filename heuristic, establishes semantic safety.
  // Decode strictly; do not rewrite binary data, encoding, BOM or other lines.
  if (bytes.includes(0)) throw new Error('binary/NUL content cannot receive an EOF correction');
  new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const text = bytes.toString('utf8');
  const match = /(\r?\n)(?:[\t ]*\r?\n)+[\t ]*$/u.exec(text);
  if (!match || !/\S/u.test(text.slice(0, match.index).replace(/^\uFEFF/u, ''))) return bytes;
  const suffixBytes = Buffer.byteLength(match[0], 'utf8');
  return Buffer.concat([bytes.subarray(0, bytes.length - suffixBytes), Buffer.from(match[1])]);
}

function makeGit(cwd) {
  return (args, accepted = [0]) => {
    const result = spawnSync('git', args, {
      cwd, windowsHide: true, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
      env: Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/iu.test(key))),
    });
    if (result.error) throw result.error;
    if (!accepted.includes(result.status)) throw new Error((result.stderr || result.stdout).trim() || `Git exited ${result.status}`);
    return result;
  };
}

function checkFile(git, file, absolute, emptyFile) {
  const tracked = git(['--literal-pathspecs', 'ls-files', '--error-unmatch', '--', file], [0, 1]).status === 0;
  const args = tracked
    ? ['--literal-pathspecs', 'diff', '--check', 'HEAD', '--', file]
    : ['diff', '--no-index', '--check', '--', emptyFile, absolute];
  // --no-index implies --exit-code: bit 1 means content differs, bit 2
  // means --check found whitespace. A new, clean file normally returns 1.
  const result = git(args, tracked ? [0, 2] : [0, 1, 2, 3]);
  if (/^(?:error|fatal):/mu.test(result.stderr || '')) throw new Error(result.stderr.trim());
  return { file, ok: (result.status & 2) === 0, detail: `${result.stdout || ''}${result.stderr || ''}`.trim() };
}

function preflight(root, { paths, safeEof = new Map() }, git = makeGit(root)) {
  root = path.resolve(root);
  if (fs.realpathSync(root).toLowerCase() !== root.toLowerCase()) throw new Error('repository root resolves through a link');
  const actualRoot = path.resolve(git(['rev-parse', '--show-toplevel']).stdout.trim());
  if (actualRoot.toLowerCase() !== root.toLowerCase()) throw new Error('unexpected repository root');
  if (git(['diff', '--cached', '--name-only', '--ita-visible-in-index', '-z']).stdout) throw new Error('index already contains staged paths; no files were corrected');
  const authorized = new Set(paths);
  if (!paths.length || new Set(paths.map((file) => file.toLowerCase())).size !== paths.length) throw new Error('authorized paths must be nonempty and unique');
  for (const file of safeEof.keys()) if (!authorized.has(file)) throw new Error(`EOF correction is not authorized: ${file}`);
  const files = paths.map((file) => classifyPath(root, file, git));
  const rechecked = paths.map((file) => classifyPath(root, file, git));
  if (JSON.stringify(files) !== JSON.stringify(rechecked)) throw new Error("authorized path classification changed during preflight");
  // Validate every attestation before performing any correction.
  const corrections = files.filter(({ file }) => safeEof.has(file)).map((entry) => {
    if (entry.kind === "delete") throw new Error("EOF correction is not allowed for a versioned deletion");
    const before = fs.readFileSync(entry.absolute);
    if (sha256(before) !== safeEof.get(entry.file)) throw new Error(`reviewed SHA-256 no longer matches: ${entry.file}`);
    if (fs.statSync(entry.absolute).nlink !== 1) throw new Error(`refusing to modify a multiply linked file: ${entry.file}`);
    return { ...entry, before, after: trimReviewedEof(before) };
  });
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'gf-format-'));
  const emptyFile = path.join(temporary, 'empty');
  fs.writeFileSync(emptyFile, '');
  try {
    const initial = files.map(({ file, absolute }) => checkFile(git, file, absolute, emptyFile));
    const fixed = [];
    for (const entry of corrections) {
      if (entry.before.equals(entry.after)) continue;
      regularFile(root, entry.file);
      if (!fs.readFileSync(entry.absolute).equals(entry.before)) throw new Error(`file changed during preflight: ${entry.file}`);
      fs.writeFileSync(entry.absolute, entry.after);
      fixed.push(entry.file);
    }
    const checks = fixed.length ? files.map(({ file, absolute }) => checkFile(git, file, absolute, emptyFile)) : initial;
    const finalFiles = paths.map((file) => classifyPath(root, file, git));
    if (JSON.stringify(files) !== JSON.stringify(finalFiles)) throw new Error("authorized path classification changed during preflight");
    return { ok: checks.every((check) => check.ok), fixed, checks };
  } finally {
    // Delete only the two exact temporary paths this invocation created.
    fs.unlinkSync(emptyFile);
    fs.rmdirSync(temporary);
  }
}

function main(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  const cwdGit = makeGit(process.cwd());
  const root = cwdGit(['rev-parse', '--show-toplevel']).stdout.trim();
  const result = preflight(root, options);
  for (const file of result.fixed) process.stdout.write(`commit-format-preflight: corrected reviewed EOF: ${file}\n`);
  for (const check of result.checks) if (!check.ok) {
    process.stderr.write(`commit-format-preflight: ${check.file}: ${check.detail || 'Git whitespace check failed'}\n`);
  }
  if (result.ok) process.stdout.write(`commit-format-preflight: ${options.paths.length} authorized file(s) passed; index untouched\n`);
  else process.stderr.write('commit-format-preflight: unresolved formatting; do not invoke the commit executor. No general formatting was applied.\n');
  return result.ok ? 0 : 1;
}

module.exports = { parseArguments, validatePath, inspectPath, deletionEntry, classifyPath, trimReviewedEof, preflight, sha256, main };
if (require.main === module) {
  try { process.exitCode = main(); }
  catch (error) { process.stderr.write(`commit-format-preflight: ${error.message}\n`); process.exitCode = 1; }
}
