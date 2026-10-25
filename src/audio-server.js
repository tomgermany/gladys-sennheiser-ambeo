// HTTP server for audio files, running in the Gladys-managed sub-container.
import { createServer } from 'node:http';
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOUNDS_DIR = '/sounds';
const BUNDLED_SOUNDS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');
const ALLOWED = new Set(['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac']);
const MIME = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
};

function listAudioFiles(directory) {
  try {
    return readdirSync(directory).filter((name) =>
      ALLOWED.has(name.slice(name.lastIndexOf('.')).toLowerCase()),
    );
  } catch {
    return [];
  }
}

const server = createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end('Bad request');
    return;
  }

  if (pathname === '/sounds' || pathname === '/sounds/' || pathname === '/') {
    // Always expose bundled samples as a fallback if the shared volume is empty.
    const files = [...new Set([
      ...listAudioFiles(BUNDLED_SOUNDS_DIR),
      ...listAudioFiles(SOUNDS_DIR),
    ])].sort();
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(files));
    return;
  }

  const name = basename(pathname.replace(/^\/sounds\//, ''));
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
  if (!name || !ALLOWED.has(ext)) {
    res.writeHead(404).end('Not found');
    return;
  }

  // User-provided files in the shared volume take precedence over bundled samples.
  const sharedFile = join(SOUNDS_DIR, name);
  const bundledFile = join(BUNDLED_SOUNDS_DIR, name);
  const file = existsSync(sharedFile) && statSync(sharedFile).isFile()
    ? sharedFile
    : bundledFile;

  if (!existsSync(file) || !statSync(file).isFile()) {
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
