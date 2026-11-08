#!/usr/bin/env node
/**
 * Headless visual-inspection harness (Codex + Claude Code). Evidence stays outside the repo.
 *
 *   node scripts/visual-inspect.mjs --project <gameDir> --scenario <file.js>
 *     [--fixture <dir>] [--out <dir>] [--viewports 1440x900,1024x768] [--settle <ms>] [--headed] [--timeout <ms>]
 *
 * Starts the project's own Vite (its config, 127.0.0.1, free port) and drives the pinned playwright-cli
 * (override with env GF_PLAYWRIGHT_CLI) as a child process in its own session. Never touches Git or the network.
 *
 * Scenario file: one expression `async (page, gf) => { ... }` (a Playwright `page`). `gf` provides:
 *   gf.baseUrl, gf.outDir, gf.viewports [[w,h],...], gf.goto(path), gf.snap(name) -> <outDir>/<name>-<w>x<h>.png,
 *   gf.forEachViewport(async ([w,h]) => ...). The returned value ends up in summary.json as `result`;
 *   a thrown error is recorded as `failed`. Page errors, console errors and warnings are collected.
 *
 * Fixture dir (optional, outside the repo): `entry.tsx` is served at /__inspect (use gf.goto('/__inspect'));
 *   `@gf-fixture/x` imports fixture files; optional `patches.mjs` exports
 *   [{ source: 'src/App.tsx', replace: [[from, to], ...], prepend?: string }] -> virtual module
 *   /src/__gf_<basename> (next to the source), exact-once replacement; the entry imports '/src/__gf_App.tsx'.
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_CLI = path.join(os.homedir(), '.game-factory', 'tools', 'playwright-cli-0.1.22', 'node_modules', '@playwright', 'cli', 'playwright-cli.js');

// ---------- pure helpers (exported for tests) ----------
export function parseViewports(text) {
  return text.split(',').map((part) => {
    const m = /^(\d{2,5})x(\d{2,5})$/.exec(part.trim());
    if (!m) throw new Error(`Invalid viewport "${part}" (expected WxH, e.g. 1440x900)`);
    return [Number(m[1]), Number(m[2])];
  });
}

export function parseArgs(argv) {
  const opts = { viewports: [[1440, 900], [1024, 768]], headed: false, timeout: 120000, settle: 400 };
  const valued = new Set(['project', 'scenario', 'fixture', 'out', 'viewports', 'timeout', 'settle']);
  for (let i = 0; i < argv.length; i++) {
    const m = /^--([a-z]+)$/.exec(argv[i]);
    if (!m) throw new Error(`Unexpected argument "${argv[i]}"`);
    const key = m[1];
    if (key === 'headed') opts.headed = true;
    else if (valued.has(key)) {
      const value = argv[++i];
      if (value === undefined || value.startsWith('--')) throw new Error(`--${key} needs a value`);
      opts[key] = key === 'viewports' ? parseViewports(value) : ['timeout', 'settle'].includes(key) ? Number(value) : value;
    } else throw new Error(`Unknown option --${key}`);
  }
  if (!opts.project) throw new Error('--project <gameDir> is required');
  if (!opts.scenario) throw new Error('--scenario <file.js> is required');
  for (const k of ['timeout', 'settle']) if (!Number.isFinite(opts[k]) || opts[k] < 0) throw new Error(`--${k} must be a non-negative number`);
  return opts;
}

export function isInside(child, parent) {
  const norm = (p) => (process.platform === 'win32' ? path.resolve(p).toLowerCase() : path.resolve(p));
  const rel = path.relative(norm(parent), norm(child));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

export function assertOutsideRepo(dir, label, repoRoot = REPO_ROOT) {
  if (isInside(dir, repoRoot)) throw new Error(`${label} must be outside the repository (${repoRoot}): ${dir}`);
}

export function applyPatch(patch, original) {
  let out = original;
  for (const [from, to] of patch.replace ?? []) {
    const count = out.split(from).length - 1;
    if (count !== 1) throw new Error(`Patch for ${patch.source}: expected exactly 1 match, found ${count} for text: ${JSON.stringify(from)}`);
    out = out.replace(from, () => to);
  }
  return (patch.prepend ?? '') + out;
}

export function buildWrapper(scenarioSource, { baseUrl, outDir, viewports, settle }) {
  const body = scenarioSource.trim().replace(/;+\s*$/, '');
  return `async (page) => {
  const errors = [], consoleErrors = [], warnings = [], screenshots = [];
  const cfg = ${JSON.stringify({ baseUrl, outDir: outDir.replace(/\\/g, '/'), viewports, settle })};
  page.on('pageerror', (e) => errors.push(String((e && e.message) || e)));
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
    else if (m.type() === 'warning') warnings.push(m.text());
  });
  let current = cfg.viewports[0];
  const gf = {
    baseUrl: cfg.baseUrl, outDir: cfg.outDir, viewports: cfg.viewports,
    goto: (p) => page.goto(cfg.baseUrl.replace(/\\/$/, '') + (p.startsWith('/') ? p : '/' + p)),
    forEachViewport: async (fn) => {
      for (const vp of cfg.viewports) {
        current = vp;
        await page.setViewportSize({ width: vp[0], height: vp[1] });
        await fn(vp);
      }
    },
    snap: async (name) => {
      await page.waitForTimeout(cfg.settle);
      const file = name + '-' + current[0] + 'x' + current[1] + '.png';
      await page.screenshot({ path: cfg.outDir + '/' + file });
      screenshots.push(file);
      return file;
    },
  };
  await page.setViewportSize({ width: current[0], height: current[1] });
  let result, failed;
  try { result = await (
${body}
  )(page, gf); } catch (e) { failed = String((e && e.message) || e); }
  return { result, failed, errors, consoleErrors, warnings, screenshots };
}
`;
}

export function summarize(summary, summaryPath) {
  const lines = [
    `status: ${summary.status}`,
    `url: ${summary.url}`,
    `viewports: ${summary.viewports.map((v) => v.join('x')).join(', ')}`,
    `screenshots: ${summary.screenshots.length}${summary.screenshots.length ? ' (' + summary.screenshots.slice(0, 20).join(', ') + ')' : ''}`,
    `page errors: ${summary.errors.length}, console errors: ${(summary.consoleErrors ?? []).length}, warnings: ${summary.warnings.length}`,
  ];
  if (summary.failed) lines.push(`failed: ${summary.failed}`);
  for (const e of summary.errors.slice(0, 5)) lines.push(`  page error: ${e.slice(0, 300)}`);
  for (const e of (summary.consoleErrors ?? []).slice(0, 5)) lines.push(`  console error: ${e.slice(0, 300)}`);
  for (const w of summary.warnings.slice(0, 5)) lines.push(`  warning: ${w.slice(0, 300)}`);
  lines.push(`summary: ${summaryPath}`);
  return lines.join('\n');
}

// ---------- Vite harness ----------
const toPosix = (p) => p.replace(/\\/g, '/');

async function loadPatches(fixture) {
  const file = path.join(fixture, 'patches.mjs');
  if (!existsSync(file)) return [];
  return (await import(pathToFileURL(file).href)).default ?? [];
}

function harnessPlugin({ root, fixture, patches }) {
  const virtual = new Map(); // absolute posix id -> async () => code
  if (fixture) {
    const entry = path.join(fixture, 'entry.tsx');
    virtual.set(toPosix(path.join(root, 'src', '__gf_entry.tsx')), () => readFile(entry, 'utf8'));
    for (const patch of patches) {
      const src = path.join(root, patch.source);
      const id = toPosix(path.join(path.dirname(src), '__gf_' + path.basename(src)));
      virtual.set(id, async () => applyPatch(patch, await readFile(src, 'utf8')));
    }
  }
  const plugin = {
    name: 'gf-visual-inspect',
    enforce: 'pre',
    config: () => (fixture ? {
      resolve: { alias: [{ find: /^@gf-fixture\//, replacement: toPosix(fixture) + '/' }] },
      server: { fs: { allow: [root, fixture] } },
    } : {}),
    async resolveId(id, importer) {
      const candidates = [toPosix(id), id.startsWith('/') ? toPosix(root) + id : null, importer && id.startsWith('.') ? toPosix(path.resolve(path.dirname(importer), id)) : null];
      for (const c of candidates) if (c && virtual.has(c)) return c;
      // bare imports from fixture files resolve against the project
      if (fixture && importer && isInside(importer.split('?')[0], fixture) && /^[@a-z]/i.test(id) && !id.startsWith('@gf-fixture/')) {
        return this.resolve(id, toPosix(path.join(root, 'index.html')), { skipSelf: true });
      }
    },
    async load(id) {
      const clean = id.split('?')[0];
      if (virtual.has(clean)) return virtual.get(clean)();
    },
    configureServer(server) {
      if (!fixture) return;
      server.middlewares.use(async (req, res, next) => {
        if (new URL(req.url, 'http://x').pathname !== '/__inspect') return next();
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(await server.transformIndexHtml(req.url, '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="data:,"><title>inspect</title></head><body><div id="root"></div><script type="module" src="/src/__gf_entry.tsx"></script></body></html>'));
      });
    },
  };
  return { plugin, virtual };
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => { const { port } = srv.address(); srv.close(() => resolve(port)); });
  });
}

function runCli(cli, args, { cwd, env, timeout }) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cli, ...args], { cwd, env, windowsHide: true });
    let stdout = '', stderr = '', timedOut = false;
    const timer = timeout ? setTimeout(() => { timedOut = true; child.kill(); }, timeout) : null;
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, stderr, timedOut }); });
    child.on('error', (e) => { clearTimeout(timer); resolve({ code: -1, stdout, stderr: String(e), timedOut }); });
  });
}

function parseCliJson(stdout) {
  const text = stdout.trim();
  try { return JSON.parse(text); } catch { /* fall through */ }
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a >= 0 && b > a) return JSON.parse(text.slice(a, b + 1));
  throw new Error('Could not parse CLI output: ' + text.slice(0, 500));
}

// ---------- main ----------
export async function run(opts) {
  const cli = process.env.GF_PLAYWRIGHT_CLI || DEFAULT_CLI;
  if (!existsSync(cli)) {
    throw new Error(`The pinned playwright-cli is not installed at ${cli}. Obtaining it requires the designer's authorization (no download or install is attempted).`);
  }
  const project = path.resolve(opts.project);
  const fixture = opts.fixture ? path.resolve(opts.fixture) : null;
  const outDir = path.resolve(opts.out ?? path.join(os.tmpdir(), `game-factory-visual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`));
  assertOutsideRepo(outDir, 'Output directory');
  if (fixture) assertOutsideRepo(fixture, 'Fixture directory');
  if (!existsSync(path.join(project, 'package.json'))) throw new Error(`Not a project directory: ${project}`);
  const scenarioSource = await readFile(path.resolve(opts.scenario), 'utf8');
  if (fixture && !existsSync(path.join(fixture, 'entry.tsx'))) throw new Error(`Fixture has no entry.tsx: ${fixture}`);
  const patches = fixture ? await loadPatches(fixture) : [];

  const { plugin, virtual } = harnessPlugin({ root: project, fixture, patches });
  for (const load of virtual.values()) await load(); // fail fast on bad patches

  await mkdir(outDir, { recursive: true });
  const vitePkg = createRequire(path.join(project, 'package.json')).resolve('vite/package.json');
  const { createServer } = await import(pathToFileURL(path.join(path.dirname(vitePkg), 'dist', 'node', 'index.js')).href);
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const session = `gfv-${Math.random().toString(36).slice(2, 8)}`;
  const env = { ...process.env, NO_UPDATE_NOTIFIER: '1', PWTEST_DAEMON_SESSION_DIR: path.join(outDir, 'daemon'), PLAYWRIGHT_BROWSERS_PATH: path.join(outDir, 'browsers') };
  const cliOpts = { cwd: outDir, env };
  let server, opened = false, closing = false;
  const cleanup = async () => {
    if (closing) return;
    closing = true;
    if (opened) await runCli(cli, [`-s=${session}`, 'close'], { ...cliOpts, timeout: 15000 });
    if (server) await server.close();
  };
  const onSigint = () => cleanup().finally(() => process.exit(130));
  process.once('SIGINT', onSigint);

  try {
    server = await createServer({ root: project, logLevel: 'error', plugins: [plugin], server: { host: '127.0.0.1', port, strictPort: true } });
    await server.listen();
    const wrapperFile = path.join(outDir, 'wrapper.js');
    await writeFile(wrapperFile, buildWrapper(scenarioSource, { baseUrl, outDir, viewports: opts.viewports, settle: opts.settle }));
    opened = true;
    const open = await runCli(cli, [`-s=${session}`, 'open', 'about:blank', '--browser=chrome', ...(opts.headed ? ['--headed'] : [])], { ...cliOpts, timeout: 60000 });
    if (open.code !== 0) throw new Error('Browser failed to open: ' + (open.stderr || open.stdout).slice(0, 500));
    const res = await runCli(cli, [`-s=${session}`, '--raw', 'run-code', `--filename=${wrapperFile}`], { ...cliOpts, timeout: opts.timeout });
    const base = { url: baseUrl, viewports: opts.viewports, outDir };
    let summary;
    if (res.timedOut) summary = { ...base, failed: `Timed out after ${opts.timeout} ms`, errors: [], warnings: [], screenshots: [] };
    else {
      let data;
      try { data = parseCliJson(res.stdout); } catch (e) { data = { failed: e.message + (res.stderr ? ' | ' + res.stderr.slice(0, 300) : ''), errors: [], warnings: [], screenshots: [] }; }
      summary = { ...base, result: data.result, failed: data.failed, errors: data.errors ?? [], consoleErrors: data.consoleErrors ?? [], warnings: data.warnings ?? [], screenshots: data.screenshots ?? [] };
    }
    summary.status = !summary.failed && summary.errors.length === 0 ? 'pass' : 'fail';
    const summaryPath = path.join(outDir, 'summary.json');
    await writeFile(summaryPath, JSON.stringify(summary, null, 2));
    return { summary, summaryPath };
  } finally {
    await cleanup();
    process.removeListener('SIGINT', onSigint);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { summary, summaryPath } = await run(parseArgs(process.argv.slice(2)));
    console.log(summarize(summary, summaryPath));
    process.exit(summary.status === 'pass' ? 0 : 1);
  } catch (e) {
    console.error('visual-inspect: ' + e.message);
    process.exit(2);
  }
}
