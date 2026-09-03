import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = process.cwd();
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
const server = createServer(async (request, response) => {
  try {
    const requested = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relative = requested === '/' ? 'index.html' : requested.replace(/^\//, '');
    let path = normalize(join(root, relative));
    if (!path.startsWith(root)) throw new Error('Invalid path');
    try { if ((await stat(path)).isDirectory()) path = join(path, 'index.html'); } catch { path = join(root, 'index.html'); }
    const body = await readFile(path);
    response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404); response.end('Not found');
  }
});
server.listen(4173, () => console.log('Preview: http://localhost:4173'));
