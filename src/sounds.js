// -----------------------------------------------------------------------------
// Shared sound-file store for the AMBEO scene action.
//
// Gladys mounts the audio sub-container's /sounds volume into the main
// integration at /data/containers/ambeo-audio/sounds. Both containers therefore
// see the same files, while only the sub-container exposes an HTTP port.
// -----------------------------------------------------------------------------

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLogger } from '@gladysassistant/integration-sdk';

const logger = createLogger({ name: 'sounds' });
export const SOUNDS_DIR = '/data/containers/ambeo-audio/sounds';

export const SAMPLE_FILES = [{ name: 'test.mp3' }, { name: 'tone.wav' }];
const ALLOWED = new Set(['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac']);

/** Copy the bundled sample files into the persistent shared volume if absent. */
export function seedSounds() {
  mkdirSync(SOUNDS_DIR, { recursive: true });
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

/** Return supported audio filenames present in the shared volume. */
export function listSounds() {
  try {
    return readdirSync(SOUNDS_DIR)
      .filter((f) => ALLOWED.has(f.slice(f.lastIndexOf('.')).toLowerCase()))
      .sort();
  } catch {
    return [];
  }
}
