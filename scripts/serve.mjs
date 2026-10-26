// SPDX-License-Identifier: GPL-3.0-or-later
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { root } from './build.mjs';

const port = Number(process.env.PORT ?? 8787);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT must be an integer from 0 to 65535.');
const routes = new Map([
  ['/', ['docs/diagnostics.html', 'text/html; charset=utf-8']],
  ['/dist/BROWSER-PRIVACY-CORE.stable.user.js', ['dist/BROWSER-PRIVACY-CORE.stable.user.js', 'text/javascript; charset=utf-8']],
  ['/dist/BROWSER-PRIVACY-CORE.hardened.user.js', ['dist/BROWSER-PRIVACY-CORE.hardened.user.js', 'text/javascript; charset=utf-8']],
]);
const server = createServer(async (request, response) => {
  const route = routes.get(request.url?.split('?')[0]);
  if (!route || !['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found'); return;
  }
  try {
    const body = await readFile(join(root, route[0]));
    response.writeHead(200, { 'Content-Type': route[1], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('File unavailable. Run npm run build first.');
  }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => {
  console.log(`Diagnostics: http://127.0.0.1:${server.address().port}/`);
  console.log('Install one profile, then reload this page. Press Ctrl+C to stop.');
});
