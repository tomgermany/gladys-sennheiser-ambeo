// -----------------------------------------------------------------------------
// The soundbar as ONE Gladys device, exposing every setting the model answers.
//
// WHAT THIS FILE DOES
// It turns the flat state object that src/ambeo/client.js produces into the
// "device" payload Gladys understands: a name, an external id, and a list of
// features. Gladys then shows that device in the Discovery tab, where the user
// creates it and gets the controls.
//
// THE THREE PARTS OF A FEATURE
//   name         : what the user reads in the interface
//   external_id  : the stable key, built by gladys.externalIds() — never invent
//                  it by hand, and never change it: scenes, dashboards and the
//                  history are all stored against it
//   category/type: how Gladys renders and stores it, see below
//
// THE MAPPING, IN FOUR LINES
//   binary  : Gladys 1/0        <-> a boolean on the soundbar
//   number  : a plain number    <-> a slider, with the bounds the device reports
//   select  : a string value    <-> a drop-down, from `supported_options`
//   text    : a read-only text  <-> no slider, no history
//
// WHICH FEATURES EXIST IS DECIDED BY THE SOUNDBAR, not by this file: the loop
// below only builds a feature for a state key the device actually answered. A
// Mini therefore gets what a Mini has, and a path I got wrong simply disappears
// instead of breaking the device.
//
// IT IS UNIT-TESTED WITHOUT A DEVICE: buildDevice() takes a plain state object,
// so test/client.test.js feeds it hand-written answers. See also
// test/manifest.test.js, which checks the feature keys against the manifest.
// -----------------------------------------------------------------------------

import {
  DEVICE_FEATURE_CATEGORIES as CAT,
  DEVICE_FEATURE_TYPES as TYPE,
  createLogger,
} from '@gladysassistant/integration-sdk';
import { KEY } from '../ambeo/client.js';

const logger = createLogger({ name: 'soundbar' });

// The SDK exports the names used below where they are documented; the two
// fallbacks are the literal values the Gladys core uses.
const BINARY = TYPE.SWITCH.BINARY;
const NUMBER = TYPE.SWITCH.DIMMER ?? 'dimmer';
const SELECT = TYPE.TEXT.SELECT;
const TEXT = TYPE.TEXT.TEXT ?? 'text';

// `supported_options` is the ONE place where a label is a PLAIN string, not the
// multi-language object used everywhere else in the manifest. Getting this
// wrong makes Gladys refuse the whole device with
// `supported_options: "[0].label" must be a string`.
const sel = (options) =>
  options.map(([value, en], i) => ({ value: String(value), label: en, sort_order: i + 1 }));

// One row per feature.
//   key     : short name, and the suffix of the feature external_id. Treat it
//             as permanent — renaming it orphans the user's history and scenes.
//   state   : which key of the state this feature reads (see KEY in client.js)
//   virtual : for a value computed from the state instead of a stored one
//   write   : true, or a function for "only on some models"
//   options : fixed choices; otherwise the list comes from the device
//
// The order here is the order in the interface, so it runs from the everyday
// controls (volume, input) to the rarely touched settings (brightness).
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

/** A feature can be written when its `write` says so; a function is per-model. */
const isWritable = (f, client) => (typeof f.write === 'function' ? f.write(client) : f.write);

/**
 * Raw state -> the value to publish for one feature.
 *
 * Returns null when the device did not answer this key: publishing nothing is
 * better than publishing a zero, which would show a wrong value in the
 * interface and record it in the history.
 */
export function featureValue(client, feature, state) {
  if (feature.virtual) return client[feature.virtual](state);
  // Power is stored as a word ('online', 'networkStandby'), but Gladys wants 1/0.
  if (feature.state === KEY.POWER) return client.isOn(state) ? 1 : 0;
  const raw = state[feature.state];
  if (raw === undefined || raw === null) return null;
  if (feature.kind === 'binary') return raw ? 1 : 0;
  if (feature.kind === 'select') return String(raw);
  return raw;
}

/**
 * The stable identity of the device in Gladys.
 *
 * The serial number is preferred over the IP address: a soundbar that gets a
 * new address from the router keeps its device, its history and its scenes.
 * The IP is only a fallback for a device that reports no serial.
 */
export const platformId = (client) => client.info.serial || client.host;

export function deviceExternalId(gladys, client) {
  return gladys.externalIds('soundbar', platformId(client)).device;
}

/**
 * Build the whole discovery payload: "here is a device, with these features".
 *
 * Gladys never creates anything from this — it is an offer shown in the
 * Discovery tab, where the user clicks to create it.
 */
export function buildDevice(gladys, client, state) {
  const ids = gladys.externalIds('soundbar', platformId(client));
  const features = [];
  for (const f of FEATURES) {
    // Present only when the soundbar answered it. `power` is the exception:
    // it is always offered, read-only, because whether the device is on is
    // worth knowing even on a model we cannot switch.
    const available = f.virtual
      ? f.virtual !== 'codec' || client.isMax || state[KEY.DECODER]
      : f.state in state;
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
      // Bounds come from the soundbar itself when it reports them, otherwise
      // from the fallbacks in client.js. A slider without min/max is refused.
      const r = client.getRange(f.state);
      Object.assign(feature, { category: CAT.SWITCH, type: NUMBER, min: r.min, max: r.max });
    } else if (f.kind === 'select') {
      // Two sources: a fixed list written here (AMBEO level), or the list the
      // device itself gave us (inputs, sound profiles).
      const options =
        f.options ??
        (f.key === 'source' ? client.sources.filter((x) => x.selectable) : client.presets).map(
          (x, i) => ({
            value: String(x.id),
            // Plain string, see the note on `sel` above.
            label: x.title,
            sort_order: i + 1,
          }),
        );
      Object.assign(feature, {
        category: CAT.TEXT,
        type: SELECT,
        min: 0,
        max: 0,
        supported_options: options,
      });
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

/**
 * Publish the value of every feature from one state snapshot.
 *
 * A silent skip is deliberate: a key the device did not answer has no value to
 * publish, and its feature does not exist in Gladys either.
 */
export async function publishAll(gladys, client, state) {
  const ids = gladys.externalIds('soundbar', platformId(client));
  for (const f of FEATURES) {
    const value = featureValue(client, f, state);
    if (value === null || value === undefined) continue;
    await gladys.publishState(ids.feature(f.key), value);
  }
}

/**
 * A command from the user: translate the value, send it to the soundbar, then
 * confirm the value back so the interface shows what really happened.
 * Throwing here fails the command visibly in Gladys, which is what we want
 * when the soundbar refuses or the feature is read-only.
 */
export async function onSetValue(gladys, client, { feature, value }) {
  const ids = gladys.externalIds('soundbar', platformId(client));
  const f = FEATURES.find((x) => ids.feature(x.key) === feature.external_id);
  if (!f || !isWritable(f, client)) throw new Error(`Not writable: ${feature.external_id}`);
  // Gladys sends 1/0 for a switch; the soundbar wants a real boolean.
  let sent = value;
  if (f.kind === 'binary') sent = value === 1 || value === true;
  logger.info(`set ${f.key} = ${sent}`);
  await client.set(f.state, sent);
  await gladys.publishState(feature.external_id, value);
}
