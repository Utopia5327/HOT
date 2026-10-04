import http from 'node:http';
import {createReadStream} from 'node:fs';
import {writeFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.hdr': 'application/octet-stream', '.bin': 'application/octet-stream',
  '.woff2': 'font/woff2', '.mp4': 'video/mp4'
};

// Serves the repo for the recorder and accepts the finished file back. The POST
// sink exists so the encoded video never has to cross the automation bridge as
// JSON — it is written straight to disk from the request body.
export function startServer({port = 8791, outFile}) {
  const server = http.createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/film/output') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const bytes = Buffer.concat(chunks);
      await writeFile(outFile, bytes);
      res.writeHead(200, {'content-type': 'text/plain'});
      res.end('ok ' + bytes.length);
      server.emit('film:written', bytes.length);
      return;
    }
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    // The scene loads its textures with document-relative paths ('./assets/…'),
    // and several data modules bake those strings in. So the recorder page is
    // served from inside the scene's own URL space even though it lives in
    // tools/film — that way './assets/…' resolves exactly as it does for the
    // real gallery, and no shipped path has to be rewritten for a dev tool.
    const filePath = urlPath === '/explore/scene/film.html'
      ? path.join(ROOT, 'tools/film/film.html')
      : urlPath.startsWith('/explore/scene/__film/')
        ? path.join(ROOT, 'tools/film', urlPath.slice('/explore/scene/__film/'.length))
        : path.join(ROOT, urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
    try {
      const info = await stat(filePath);
      if (info.isDirectory()) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, {
        'content-type': TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
        'content-length': info.size,
        'cache-control': 'no-store'
      });
      createReadStream(filePath).pipe(res);
    } catch {
      res.writeHead(404); res.end('not found');
    }
  });
  return new Promise(resolve => server.listen(port, () => resolve(server)));
}
