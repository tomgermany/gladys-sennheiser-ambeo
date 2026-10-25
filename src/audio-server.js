// HTTP server for audio files, running in the Gladys-managed sub-container.
import { createServer } from 'node:http';
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

const SOUNDS_DIR = '/sounds';
const ALLOWED = new Set(['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac']);
const MIME = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
};

const server = createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end('Bad request');
    return;
  }
  if (pathname === '/sounds' || pathname === '/') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(readdirSync(SOUNDS_DIR).filter((f) =>
      ALLOWED.has(f.slice(f.lastIndexOf('.')).toLowerCase()),
    ).sort()));
    return;
  }
  const name = basename(pathname.replace(/^\/sounds\//, ''));
  const file = join(SOUNDS_DIR, name);
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
  if (name !== basename(file) || !ALLOWED.has(ext) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404).end('Not found');
    return;
  }
  res.writeHead(200, {
    'content-type': MIME[ext],
    'content-length': statSync(file).size,
    'accept-ranges': 'bytes',
  });
  createReadStream(file).pipe(res);
});
server.listen(8080, '0.0.0.0', () => console.info('[audio-server] listening on 0.0.0.0:8080'));
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
