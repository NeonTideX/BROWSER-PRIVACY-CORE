// SPDX-License-Identifier: GPL-3.0-or-later
import { mkdir, cp, copyFile, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { build, root, outputs } from './build.mjs';

await build(true);
const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const directory = join(root, 'release', `v${version}`);
await mkdir(directory, { recursive: true });
for (const filename of (await outputs()).keys()) {
  await copyFile(join(root, 'dist', filename), join(directory, filename));
}
for (const filename of ['LICENSE', 'README.md', 'CHANGELOG.md']) {
  await copyFile(join(root, filename), join(directory, filename));
}
const source = join(directory, 'source');
await mkdir(source, { recursive: true });
for (const name of ['src', 'scripts', 'tests', 'docs', 'dist', '.github', '.editorconfig', '.gitattributes', '.gitignore',
  'package.json', 'package-lock.json', 'LICENSE', 'README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'SECURITY.md',
  'CODE_OF_CONDUCT.md', 'SUPPORT.md']) {
  await cp(join(root, name), join(source, name), { recursive: true });
}
await writeFile(join(directory, 'SOURCE.txt'),
  `BROWSER PRIVACY CORE ${version}\nLicense: GPL-3.0-or-later\nComplete corresponding source and build instructions are included in source/.\n`);
console.log(`Prepared release/v${version}/. Publish source together with the scripts.`);
