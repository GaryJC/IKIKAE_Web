import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const three = path.resolve(root, '../../node_modules/three');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg' };
http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const vendor = pathname.startsWith('/vendor/');
  const base = vendor ? three : root;
  const file = path.resolve(base, vendor ? pathname.slice(8) : `.${pathname === '/' ? '/index.html' : pathname}`);
  if (!file.startsWith(base + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile() || !types[path.extname(file)]) {
    res.writeHead(404); res.end('Not found'); return;
  }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(3001, '127.0.0.1', () => console.log('Statue study: http://127.0.0.1:3001'));
