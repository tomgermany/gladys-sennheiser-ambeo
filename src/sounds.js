// -----------------------------------------------------------------------------
// File store + tiny HTTP server for the "play a local file" scene action.
//
// The integration cannot reach Gladys' filesystem: it runs in its own sandbox.
// So the user drops MP3/WAV files into the shared folder below (mounted volume,
// also browsable through the integration's "Sounds" port), and the integration
// serves them over its own network. The soundbar fetches the URL itself.
//
// Writable locations: /data is the only writable volume of the sandbox. If a
// `sounds` volume is mounted, its mount point is used instead.
// -----------------------------------------------------------------------------

import { createServer } from 'node:http';
import {
  copyFileSync,
  createReadStream,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
import { createLogger } from '@gladysassistant/integration-sdk';

const logger = createLogger({ name: 'sounds' });

// Sample files shipped with the integration (see assets/sounds). A `select`
// field of the manifest never offers an empty list, so the folder holds at
// least one file: these are copied into it on first start.
export const SAMPLE_FILES = [{ name: 'tone.wav' }, { name: 'tone.mp3' }];

const ALLOWED = new Set(['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac']);
const MIME = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
};

export const SOUNDS_DIR = existsSync('/sounds') ? '/sounds' : '/data/sounds';

/** Address the soundbar can reach: the container's IP on the LAN. */
export function firstLanAddress() {
  for (const list of Object.values(networkInterfaces())) {
    for (const ni of list ?? []) {
      if (ni.family === 'IPv4' && !ni.internal) return ni.address;
    }
  }
  return null;
}

/** Ship the sample tone into the writable folder on first start. */
export function seedSounds() {
  const sourceDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');
  for (const { name } of SAMPLE_FILES) {
    const target = join(SOUNDS_DIR, name);
    if (existsSync(target)) continue;
    const source = join(sourceDir, name);
    if (!existsSync(source)) continue;
    try {
      copyFileSync(source, target);
      logger.info(`Sample sound installed: ${target}`);
    } catch (err) {
      logger.warn(`Could not install ${name}: ${err.message}`);
    }
  }
}

/** Every file the user can pick. */
export function listSounds() {
  try {
    return readdirSync(SOUNDS_DIR)
      .filter((f) => ALLOWED.has(f.slice(f.lastIndexOf('.')).toLowerCase()))
      .sort();
  } catch {
    return [];
  }
}

/**
 * `config_schema` entry of the sound picker: a `select` whose options are the
 * files present in the folder, the sample tone first.
 */
export function soundFileField() {
  const files = listSounds();
  const names = files.length > 0 ? files : SAMPLE_FILES.map((f) => f.name);
  return {
    key: 'default_sound',
    type: 'select',
    label: { en: 'Default sound', fr: 'Son par défaut' },
    description: {
      en: 'File played by the "Play a sound" scene action when the scene names none. Drop your own MP3 or WAV files in the "sounds" folder, published on the integration\'s "sounds" port.',
      fr: 'Fichier joué par l\'action « Jouer un son » quand la scène n\'en nomme pas. Déposez vos MP3 ou WAV dans le dossier « sounds », publié sur le port « sounds » de l\'intégration.',
    },
    required: false,
    options: names.map((name, i) => ({ value: name, label: { en: name }, sort_order: i + 1 })),
  };
}

/**
 * Start the file server. Returns `{ server, port, baseUrl, dir }`; `baseUrl`
 * is only reachable from the same network as the container.
 */
export function startSoundServer(port = 8080) {
  mkdirSync(SOUNDS_DIR, { recursive: true });
  seedSounds();
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/sounds') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(listSounds()));
      return;
    }
    const name = basename(decodeURIComponent(url.pathname.replace(/^\/sounds\//, '')));
    const file = join(SOUNDS_DIR, name);
    const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
    if (
      name !== basename(file) ||
      !ALLOWED.has(ext) ||
      !existsSync(file) ||
      !statSync(file).isFile()
    ) {
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
  server.listen(port, () => logger.info(`Sound files served from ${SOUNDS_DIR} on port ${port}`));
  const host = firstLanAddress();
  return { server, port, baseUrl: host ? `http://${host}:${port}` : null, dir: SOUNDS_DIR };
}
