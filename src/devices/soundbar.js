// -----------------------------------------------------------------------------
// The soundbar as ONE Gladys device exposing every setting/readout the model
// answers. Features are generated from what the soundbar actually returned, so
// a Mini does not get the Max-only features.
//
// Mapping Gladys <-> soundbar:
//   binary  : Gladys 1/0  <-> boolean
//   number  : plain number (dimmer type), bounds from the device
//   select  : string value from supported_options
//   text    : read-only string
// -----------------------------------------------------------------------------

import {
  DEVICE_FEATURE_CATEGORIES as CAT,
  DEVICE_FEATURE_TYPES as TYPE,
  createLogger,
} from '@gladysassistant/integration-sdk';
import { KEY } from '../ambeo/client.js';

const logger = createLogger({ name: 'soundbar' });

// Type names the SDK exports are used where seen in the official docs; the two
// others fall back to the core's literal values.
const BINARY = TYPE.SWITCH.BINARY;
const NUMBER = TYPE.SWITCH.DIMMER ?? 'dimmer';
const SELECT = TYPE.TEXT.SELECT;
const TEXT = TYPE.TEXT.TEXT ?? 'text';

const sel = (options) =>
  options.map(([value, en], i) => ({ value: String(value), label: { en }, sort_order: i + 1 }));

// One row per feature. `key` doubles as the feature id suffix: NEVER rename.
export const FEATURES = [
  { key: 'power', state: KEY.POWER, name: 'Power', kind: 'binary', write: (c) => c.canPower() },
  { key: 'volume', state: KEY.VOLUME, name: 'Volume', kind: 'number', write: true },
  { key: 'mute', state: KEY.MUTED, name: 'Mute', kind: 'binary', write: true },
  { key: 'source', state: KEY.SOURCE, name: 'Input', kind: 'select', write: true },
  { key: 'preset', state: KEY.PRESET, name: 'Sound profile', kind: 'select', write: true },
  { key: 'night', state: KEY.NIGHT, name: 'Night mode', kind: 'binary', write: true },
  { key: 'ambeo', state: KEY.AMBEO, name: 'AMBEO mode', kind: 'binary', write: true },
  {
    key: 'ambeo_level',
    state: KEY.AMBEO_LEVEL,
    name: 'AMBEO level',
    kind: 'select',
    options: sel([[1, 'Light'], [2, 'Regular'], [3, 'Boost']]),
    write: true,
  },
  { key: 'voice', state: KEY.VOICE, name: 'Voice enhancement', kind: 'binary', write: true },
  { key: 'voice_level', state: KEY.VOICE_LEVEL, name: 'Voice enhancement level', kind: 'number', write: true },
  { key: 'sound_feedback', state: KEY.SOUND_FEEDBACK, name: 'Sound feedback', kind: 'binary', write: true },
  { key: 'sub_status', state: KEY.SUB_STATUS, name: 'Subwoofer', kind: 'binary', write: true },
  { key: 'sub_volume', state: KEY.SUB_VOLUME, name: 'Subwoofer volume', kind: 'number', write: true },
  { key: 'center_volume', state: KEY.CENTER_VOLUME, name: 'Center volume', kind: 'number', write: true },
  { key: 'center_level', state: KEY.CENTER_LEVEL, name: 'Center speaker level', kind: 'number', write: true },
  { key: 'side_level', state: KEY.SIDE_LEVEL, name: 'Side firing level', kind: 'number', write: true },
  { key: 'up_level', state: KEY.UP_LEVEL, name: 'Up firing level', kind: 'number', write: true },
  { key: 'led_bar', state: KEY.LED_BAR, name: 'LED bar brightness', kind: 'number', write: true },
  { key: 'codec_led', state: KEY.CODEC_LED, name: 'Codec LED brightness', kind: 'number', write: true },
  { key: 'logo_state', state: KEY.LOGO_STATE, name: 'AMBEO logo', kind: 'binary', write: true },
  { key: 'logo_brightness', state: KEY.LOGO_BRIGHTNESS, name: 'Logo brightness', kind: 'number', write: true },
  { key: 'display_brightness', state: KEY.DISPLAY_BRIGHTNESS, name: 'Display brightness', kind: 'number', write: true },
  { key: 'bluetooth', state: KEY.BLUETOOTH, name: 'Bluetooth pairing', kind: 'binary', write: true },
  { key: 'eco', state: KEY.ECO, name: 'Eco mode', kind: 'binary', write: false },
  { key: 'codec', virtual: 'codec', name: 'Audio codec', kind: 'text', write: false },
  { key: 'now_playing', virtual: 'nowPlaying', name: 'Now playing', kind: 'text', write: false },
];

const isWritable = (f, client) => (typeof f.write === 'function' ? f.write(client) : f.write);

/** Raw state -> value to publish for a feature (null = nothing to publish). */
export function featureValue(client, feature, state) {
  if (feature.virtual) return client[feature.virtual](state);
  if (feature.state === KEY.POWER) return client.isOn(state) ? 1 : 0;
  const raw = state[feature.state];
  if (raw === undefined || raw === null) return null;
  if (feature.kind === 'binary') return raw ? 1 : 0;
  if (feature.kind === 'select') return String(raw);
  return raw;
}

/** The device is addressed by serial number (stable), else by host. */
export const platformId = (client) => client.info.serial || client.host;

export function deviceExternalId(gladys, client) {
  return gladys.externalIds('soundbar', platformId(client)).device;
}

export function buildDevice(gladys, client, state) {
  const ids = gladys.externalIds('soundbar', platformId(client));
  const features = [];
  for (const f of FEATURES) {
    const available = f.virtual ? f.virtual !== 'codec' || client.isMax || state[KEY.DECODER] : f.state in state;
    if (!available && f.key !== 'power') continue;
    const feature = {
      name: f.name,
      external_id: ids.feature(f.key),
      read_only: !isWritable(f, client),
      has_feedback: true,
      keep_history: f.kind !== 'text',
    };
    if (f.kind === 'binary') {
      Object.assign(feature, { category: CAT.SWITCH, type: BINARY, min: 0, max: 1 });
    } else if (f.kind === 'number') {
      const r = client.getRange(f.state);
      Object.assign(feature, { category: CAT.SWITCH, type: NUMBER, min: r.min, max: r.max });
    } else if (f.kind === 'select') {
      const options =
        f.options ??
        (f.key === 'source' ? client.sources.filter((x) => x.selectable) : client.presets).map((x, i) => ({
          value: String(x.id),
          label: { en: x.title },
          sort_order: i + 1,
        }));
      Object.assign(feature, { category: CAT.TEXT, type: SELECT, min: 0, max: 0, supported_options: options });
    } else {
      Object.assign(feature, { category: CAT.TEXT, type: TEXT, min: 0, max: 0, keep_history: false });
    }
    features.push(feature);
  }
  return {
    name: client.info.name || client.info.model,
    external_id: ids.device,
    model: client.info.model,
    should_poll: true,
    features,
  };
}

/** Publish every feature value from a state snapshot. */
export async function publishAll(gladys, client, state) {
  const ids = gladys.externalIds('soundbar', platformId(client));
  for (const f of FEATURES) {
    const value = featureValue(client, f, state);
    if (value === null || value === undefined) continue;
    await gladys.publishState(ids.feature(f.key), value);
  }
}

/** A Gladys command: translate the value, send it, confirm the new state. */
export async function onSetValue(gladys, client, { feature, value }) {
  const ids = gladys.externalIds('soundbar', platformId(client));
  const f = FEATURES.find((x) => ids.feature(x.key) === feature.external_id);
  if (!f || !isWritable(f, client)) throw new Error(`Not writable: ${feature.external_id}`);
  let sent = value;
  if (f.kind === 'binary') sent = value === 1 || value === true;
  logger.info(`set ${f.key} = ${sent}`);
  await client.set(f.state, sent);
  await gladys.publishState(feature.external_id, value);
}
