// SPDX-License-Identifier: GPL-3.0-or-later
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { outputs, root } from '../scripts/build.mjs';

test('distributables are deterministic, standalone, licensed and synchronized', async () => {
  const first = await outputs();
  assert.deepEqual(first, await outputs());
  for (const [filename, body] of first) {
    assert.equal(await readFile(join(root, 'dist', filename), 'utf8'), body);
    if (!filename.endsWith('.user.js')) continue;
    assert.ok(body.startsWith('// ==UserScript==\n'));
    assert.match(body, /@license\s+GPL-3\.0-or-later/);
    assert.match(body, /@inject-into\s+page/);
    assert.ok(body.includes(`@downloadURL  https://raw.githubusercontent.com/NeonTideX/browser-privacy-core/main/dist/${filename}`));
    assert.doesNotMatch(body, /^\s*(import|export)\s/m);
    assert.doesNotMatch(body, /@require|eval\(|new Function\(/);
    const hash = createHash('sha256').update(body).digest('hex');
    assert.ok(first.get('SHA256SUMS').includes(`${hash}  ${filename}`));
  }
});
