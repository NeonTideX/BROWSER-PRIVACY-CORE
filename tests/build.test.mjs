// SPDX-License-Identifier: GPL-3.0-or-later
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { outputs, root } from '../scripts/build.mjs';

test('distributables are deterministic, standalone, licensed and synchronized', async () => {
  const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const first = await outputs();
  assert.deepEqual(first, await outputs());
  for (const [filename, body] of first) {
    assert.equal(await readFile(join(root, 'dist', filename), 'utf8'), body);
    if (!filename.endsWith('.user.js')) continue;
    assert.ok(body.startsWith('// ==UserScript==\n'));
    assert.match(body, /@license\s+GPL-3\.0-or-later/);
    assert.match(body, /@inject-into\s+page/);
    assert.ok(body.includes(`@version      ${version}\n`));
    assert.ok(body.includes(`@name         BROWSER PRIVACY CORE - `));
    assert.match(body, /@namespace\s+urn:browser-privacy-core:v1/);
    assert.ok(body.includes(`@downloadURL  https://raw.githubusercontent.com/NeonTideX/BROWSER-PRIVACY-CORE/main/dist/${filename}`));
    assert.doesNotMatch(body, /^\s*(import|export)\s/m);
    assert.doesNotMatch(body, /@require|eval\(|new Function\(/);
    const hash = createHash('sha256').update(body).digest('hex');
    assert.ok(first.get('SHA256SUMS').includes(`${hash}  ${filename}`));
  }
});

test('browser and release containers match the pinned Playwright dependency', async () => {
  const { devDependencies } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const image = `mcr.microsoft.com/playwright:v${devDependencies.playwright}-noble`;
  for (const name of ['ci.yml', 'release.yml']) {
    const workflow = await readFile(join(root, '.github/workflows', name), 'utf8');
    assert.ok(workflow.includes(`image: ${image}`), `${name} must use matching browser binaries`);
    assert.ok(workflow.includes('options: --user 1001 --ipc=host'), 'Browser user must own the GitHub container home');
    assert.ok(!workflow.includes('playwright install --with-deps'), 'Container supplies system dependencies');
  }
});

test('public branding stays uppercase and separate from release numbering', async () => {
  const readme = await readFile(join(root, 'README.md'), 'utf8');
  assert.ok(readme.startsWith('# BROWSER PRIVACY CORE\n'));
  assert.doesNotMatch(readme, /\b[Vv]1\b|6\.0\.0|shields\.io\/github\/v\/release/);
  assert.doesNotMatch(readme, /NeonTideX\/browser-privacy-core/);
  assert.ok(readme.includes('NeonTideX/BROWSER-PRIVACY-CORE'));
});
