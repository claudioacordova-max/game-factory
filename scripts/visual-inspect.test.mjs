import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyPatch, assertOutsideRepo, buildWrapper, isInside, parseArgs, parseViewports, run } from './visual-inspect.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = process.env.GF_PLAYWRIGHT_CLI || path.join(os.homedir(), '.game-factory', 'tools', 'playwright-cli-0.1.22', 'node_modules', '@playwright', 'cli', 'playwright-cli.js');

test('parseViewports', () => {
  assert.deepEqual(parseViewports('1440x900, 1024x768'), [[1440, 900], [1024, 768]]);
  assert.throws(() => parseViewports('1440'));
});

test('parseArgs', () => {
  const o = parseArgs(['--project', 'p', '--scenario', 's.js', '--viewports', '800x600', '--headed', '--timeout', '5000']);
  assert.equal(o.project, 'p');
  assert.deepEqual(o.viewports, [[800, 600]]);
  assert.equal(o.headed, true);
  assert.equal(o.timeout, 5000);
  assert.throws(() => parseArgs(['--scenario', 's.js']), /--project/);
  assert.throws(() => parseArgs(['--project', 'p', '--scenario', 's', '--bogus']), /Unknown/);
});

test('applyPatch replaces exactly once', () => {
  const patch = { source: 'src/App.tsx', replace: [['a', 'b']], prepend: '// x\n' };
  assert.equal(applyPatch(patch, 'one a here'), '// x\none b here');
});

test('applyPatch fails on 0 and 2 matches', () => {
  const patch = { source: 'src/App.tsx', replace: [['a', 'b']] };
  assert.throws(() => applyPatch(patch, 'zzz'), /src\/App\.tsx.*found 0/);
  assert.throws(() => applyPatch(patch, 'a a'), /found 2/);
});

test('buildWrapper embeds scenario and defines gf', () => {
  const w = buildWrapper('async (page, gf) => { return 1 };\n', { baseUrl: 'http://127.0.0.1:1', outDir: 'C:\\x\\y', viewports: [[10, 20]], settle: 5 });
  assert.match(w, /async \(page, gf\) => \{ return 1 \}/);
  assert.match(w, /const gf = \{/);
  assert.match(w, /C:\/x\/y/);
  assert.doesNotThrow(() => new Function('return ' + w));
});

test('rejects in-repo outDir and fixture', async () => {
  assert.equal(isInside(path.join(repo, 'template'), repo), true);
  assert.equal(isInside(os.tmpdir(), repo), false);
  assert.throws(() => assertOutsideRepo(path.join(repo, 'out'), 'Output directory'), /outside the repository/);
  assert.doesNotThrow(() => assertOutsideRepo(os.tmpdir(), 'Output directory'));
  if (!existsSync(cli)) return;
  const opts = parseArgs(['--project', path.join(repo, 'template'), '--scenario', 's.js', '--fixture', path.join(repo, 'template', 'src')]);
  await assert.rejects(run(opts), /Fixture directory must be outside/);
});

test('integration: template canvas', { skip: !existsSync(cli) || !existsSync(path.join(repo, 'template', 'node_modules')), timeout: 120000 }, async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'gf-vi-test-'));
  const scenario = path.join(dir, 'scenario.js');
  await writeFile(scenario, `async (page, gf) => {
    await gf.goto('/');
    await page.locator('canvas').first().waitFor();
    await gf.forEachViewport(async () => { await gf.snap('home'); });
    return { canvases: await page.locator('canvas').count() };
  }`);
  const { summary } = await run(parseArgs(['--project', path.join(repo, 'template'), '--scenario', scenario, '--out', path.join(dir, 'out')]));
  assert.equal(summary.failed, undefined);
  assert.equal(summary.screenshots.length, 2);
  assert.ok(summary.result.canvases >= 1);
});
