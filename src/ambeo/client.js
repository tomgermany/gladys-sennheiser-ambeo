// -----------------------------------------------------------------------------
// Local HTTP client for Sennheiser AMBEO soundbars (Max, Plus, Mini).
//
// The soundbar exposes an unauthenticated JSON API on port 80:
//   GET /api/getData?path=<path>&roles=@all
//   GET /api/setData?path=<path>&roles=value&value={"type":"i32_","i32_":42}
//   GET /api/setData?path=<path>&roles=activate&value={...}
//   GET /api/getRows?path=<path>&roles=@all&from=0&to=20
// Paths and value types are ported from the open-source `pyambeo` library
// (faizpuru/pyambeo). Max = "espresso" firmware, Plus/Mini = "popcorn".
// This file has NO dependency on the Gladys SDK, so it is unit-tested offline.
// -----------------------------------------------------------------------------

export const MODEL_MAX = 'AMBEO Soundbar Max';
export const MODEL_PLUS = 'AMBEO Soundbar Plus';
export const MODEL_MINI = 'AMBEO Soundbar Mini';

// Keys of the state object returned by fetchState().
export const KEY = {
  VOLUME: 'volume',
  MUTED: 'muted',
  POWER: 'power', // raw powerTarget: 'online' | 'networkStandby' | ...
  SOURCE: 'source',
  PRESET: 'preset',
  PLAYER: 'player_data',
  NIGHT: 'night_mode',
  AMBEO: 'ambeo_mode',
  AMBEO_LEVEL: 'ambeo_mode_level',
  SOUND_FEEDBACK: 'sound_feedback',
  VOICE: 'voice_enhancement',
  VOICE_LEVEL: 'voice_enhancement_level',
  BLUETOOTH: 'bluetooth_pairing',
  SUB_STATUS: 'subwoofer_status',
  SUB_VOLUME: 'subwoofer_volume',
  CENTER_VOLUME: 'center_volume',
  CENTER_LEVEL: 'center_speaker_level',
  SIDE_LEVEL: 'side_firing_level',
  UP_LEVEL: 'up_firing_level',
  LED_BAR: 'led_bar_brightness',
  CODEC_LED: 'codec_led_brightness',
  LOGO_BRIGHTNESS: 'logo_brightness',
  LOGO_STATE: 'logo_state',
  DISPLAY_BRIGHTNESS: 'display_brightness',
  ECO: 'eco_mode',
  DECODER: 'decoder_status',
};

const s = (path, key, type, subKey) => ({ path, key, type, subKey });

const BASE = [
  s('player:volume', KEY.VOLUME, 'i32_'),
  s('settings:/mediaPlayer/mute', KEY.MUTED, 'bool_'),
  s('player:player/data/value', KEY.PLAYER, 'playLogicData'),
  s('powermanager:target', KEY.POWER, 'powerTarget', 'target'),
];

const MAX_SETTINGS = [
  s('espresso:nightModeUi', KEY.NIGHT, 'bool_'),
  s('espresso:ambeoModeUi', KEY.AMBEO, 'bool_'),
  s('settings:/espresso/soundFeedback', KEY.SOUND_FEEDBACK, 'bool_'),
  s('espresso:audioInputID', KEY.SOURCE, 'i32_'),
  s('settings:/espresso/equalizerPreset', KEY.PRESET, 'i32_'),
  s('ui:/mydevice/voiceEnhanceLevel', KEY.VOICE_LEVEL, 'i16_'),
  s('ui:/settings/audio/centerSettings', KEY.CENTER_LEVEL, 'i16_'),
  s('ui:/settings/audio/widthSettings', KEY.SIDE_LEVEL, 'i16_'),
  s('ui:/settings/audio/heightSettings', KEY.UP_LEVEL, 'i16_'),
  s('settings:/espresso/ambeoMode', KEY.AMBEO_LEVEL, 'i32_'),
  s('ui:/settings/subwoofer/enabled', KEY.SUB_STATUS, 'bool_'),
  s('ui:/settings/subwoofer/volume', KEY.SUB_VOLUME, 'i16_'),
  s('settings:/espresso/decoderStatus', KEY.DECODER, 'espressoDecoderStatus'),
];

const POPCORN_SETTINGS = [
  s('settings:/popcorn/audio/nightModeStatus', KEY.NIGHT, 'bool_'),
  s('settings:/popcorn/audio/ambeoModeStatus', KEY.AMBEO, 'bool_'),
  s('settings:/popcorn/ux/soundFeedbackStatus', KEY.SOUND_FEEDBACK, 'bool_'),
  s('popcorn:inputChange/selected', KEY.SOURCE, 'popcornInputId'),
  s('settings:/popcorn/audio/audioPresets/audioPreset', KEY.PRESET, 'popcornAudioPreset'),
  s('ui:/settings/interface/codecLedBrightness', KEY.CODEC_LED, 'i32_'),
  s('ui:/settings/interface/ambeoSection/brightness', KEY.LOGO_BRIGHTNESS, 'i32_'),
  s('settings:/popcorn/ui/ledStatus', KEY.LOGO_STATE, 'bool_'),
  s('ui:/settings/interface/ledBrightness', KEY.LED_BAR, 'i32_'),
  s('ui:/settings/subwoofer/enabled', KEY.SUB_STATUS, 'bool_'),
  s('ui:/settings/subwoofer/volume', KEY.SUB_VOLUME, 'double_'),
  s('uipopcorn:ecoModeState', KEY.ECO, 'bool_'),
  s('imx8af:decoderAudioFormat', KEY.DECODER, 'imx8AfAudioFormat'),
  s('settings:/popcorn/audio/voiceEnhancement', KEY.VOICE, 'bool_'),
  s('bluetooth:state', KEY.BLUETOOTH, 'bluetoothState', 'pairable'),
  s('settings:/popcorn/audio/centerVolume', KEY.CENTER_VOLUME, 'double_'),
];

const BRIGHTNESS_PATH = 'settings:/espresso/brightnessSensor';

// Fallback bounds when the device does not report them.
const DEFAULT_RANGES = {
  [KEY.VOLUME]: { min: 0, max: 100, step: 1 },
  [KEY.SUB_VOLUME]: { min: -10, max: 10, step: 1 },
  [KEY.CENTER_VOLUME]: { min: -3, max: 6, step: 1 },
  [KEY.LED_BAR]: { min: 0, max: 100, step: 1 },
  [KEY.CODEC_LED]: { min: 0, max: 100, step: 1 },
  [KEY.LOGO_BRIGHTNESS]: { min: 0, max: 100, step: 1 },
  [KEY.DISPLAY_BRIGHTNESS]: { min: 0, max: 100, step: 1 },
  [KEY.VOICE_LEVEL]: { min: 0, max: 3, step: 1 },
  [KEY.CENTER_LEVEL]: { min: -12, max: 12, step: 1 },
  [KEY.SIDE_LEVEL]: { min: -12, max: 12, step: 1 },
  [KEY.UP_LEVEL]: { min: -12, max: 12, step: 1 },
};

// Max input ids as used by the soundbar web app (audioInputID).
const MAX_INPUT_IDS = {
  hdmi1: 0, hdmi2: 1, hdmi3: 2, hdmiarc: 3, bluetooth: 4, googlecast: 5,
  upnp: 6, optical: 7, aux: 8, spotify: 9, tidal: 14,
};
const MAX_PRESETS = [
  { id: 0, title: 'Neutral' },
  { id: 1, title: 'Movies' },
  { id: 2, title: 'Sport' },
  { id: 3, title: 'News' },
  { id: 4, title: 'Music' },
];
const MAX_DECODER_CODECS = {
  1: 'PCM', 2: 'AAC', 3: 'WMA', 4: 'Dolby Digital', 5: 'Dolby Digital Plus', 6: 'Dolby Atmos',
  7: 'Dolby TrueHD', 8: 'Dolby TrueHD Atmos', 9: 'MPEG-H', 10: 'DTS', 18: 'DTS:X', 20: 'SBC',
  21: 'MP3', 22: 'FLAC',
};

export class AmbeoError extends Error {}

export class AmbeoClient {
  /**
   * @param {string} host IP or hostname of the soundbar
   * @param {{ fetch?: typeof fetch, port?: number, timeoutMs?: number }} [options]
   */
  constructor(host, { fetch: fetchImpl = globalThis.fetch, port = 80, timeoutMs = 5000 } = {}) {
    this.host = host;
    this.endpoint = `http://${host}:${port}/api`;
    this.fetch = fetchImpl;
    this.timeoutMs = timeoutMs;
    this.info = null;
    this.isMax = false;
    this.settings = [];
    this.sources = []; // [{ id, title, path?, selectable }]
    this.presets = []; // [{ id, title }]
    this.ranges = {};
  }

  async _get(fn, path, params = {}) {
    const query = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${k}=${k === 'value' ? encodeURIComponent(v) : v}`)
      .join('&');
    const url = `${this.endpoint}/${fn}?path=${path}${query ? `&${query}` : ''}&_nocache=${Date.now()}`;
    let res;
    try {
      res = await this.fetch(url, { signal: AbortSignal.timeout(this.timeoutMs) });
    } catch (err) {
      throw new AmbeoError(`Soundbar unreachable (${this.host}): ${err.message}`);
    }
    if (!res.ok) throw new AmbeoError(`HTTP ${res.status} for ${path}`);
    try {
      return await res.json();
    } catch {
      throw new AmbeoError(`Invalid JSON for ${path}`);
    }
  }

  getData(path) {
    return this._get('getData', path, { roles: '@all' });
  }

  async getValue(path, type) {
    const data = await this.getData(path);
    const value = data?.value?.[type];
    if (value === undefined) throw new AmbeoError(`Missing ${type} for ${path}`);
    return value;
  }

  async setValue(path, type, value) {
    await this._get('setData', path, {
      roles: 'value',
      value: JSON.stringify({ type, [type]: value }),
    });
  }

  async activate(path, payload) {
    await this._get('setData', path, { roles: 'activate', value: JSON.stringify(payload) });
  }

  async getRows(path, from, to) {
    const data = await this._get('getRows', path, { roles: '@all', from, to });
    if (!Array.isArray(data?.rows)) throw new AmbeoError(`Missing rows for ${path}`);
    return data.rows;
  }

  /** Identify the model, then load sources, presets and numeric ranges. */
  async connect() {
    const model = await this.getValue('settings:/system/productName', 'string_');
    if (![MODEL_MAX, MODEL_PLUS, MODEL_MINI].includes(model)) {
      throw new AmbeoError(`Unsupported model: ${model}`);
    }
    this.isMax = model === MODEL_MAX;
    this.settings = [...BASE, ...(this.isMax ? MAX_SETTINGS : POPCORN_SETTINGS)];
    const opt = (p) => this.getValue(p, 'string_').catch(() => null);
    const [name, serial, version] = await Promise.all([
      opt('systemmanager:/deviceName'),
      opt('settings:/system/serialNumber'),
      opt('ui:settings/firmwareUpdate/currentVersion'),
    ]);
    this.info = { model, name, serial, version };
    this.sources = await this.fetchSources().catch(() => []);
    this.presets = await this.fetchPresets().catch(() => []);
    await this.fetchRanges();
    return this.info;
  }

  async fetchSources() {
    if (this.isMax) {
      const [names, inputs] = await Promise.all([
        this.getRows('settings:/espresso/inputNames', 0, 20),
        this.getRows('espresso:', 0, 20),
      ]);
      const available = new Set(inputs.map((r) => String(r.title ?? '').toLowerCase()));
      const out = [];
      for (const row of names) {
        const key = String(row.title ?? '').toLowerCase();
        const label = row.value?.string_;
        if (label && key in MAX_INPUT_IDS && available.has(key)) {
          out.push({ id: MAX_INPUT_IDS[key], title: label, selectable: true });
        }
      }
      return out;
    }
    const rows = await this.getRows('ui:/inputs', 0, 10);
    const custom = await this.getValue('settings:/popcorn/ui/input/inputList', 'popcornInputList').catch(
      () => [],
    );
    const names = Object.fromEntries(
      (custom || []).filter((i) => i?.id && i.customName).map((i) => [i.id, i.customName]),
    );
    const out = rows
      .filter((r) => r.id && r.title)
      .map((r) => ({ id: r.id, title: names[r.id] ?? r.title, path: r.path, selectable: true }));
    // Cast targets: shown by the soundbar when casting, not selectable.
    out.push({ id: 'airplay', title: 'AirPlay', selectable: false });
    out.push({ id: 'googlecast', title: 'Google Cast', selectable: false });
    return out;
  }

  async fetchPresets() {
    if (this.isMax) return MAX_PRESETS;
    const rows = await this.getRows('settings:/popcorn/audio/audioPresetValues', 0, 10);
    return rows
      .filter((r) => r.title && r.value?.popcornAudioPreset !== undefined)
      .map((r) => ({ id: r.value.popcornAudioPreset, title: r.title }));
  }

  async fetchRanges() {
    const targets = this.settings.filter((st) => DEFAULT_RANGES[st.key]);
    const results = await Promise.all(
      targets.map((st) => this.getData(st.path).catch(() => null)),
    );
    targets.forEach((st, i) => {
      const edit = results[i]?.edit;
      const min = Number(edit?.min);
      const max = Number(edit?.max);
      if (edit && Number.isFinite(min) && Number.isFinite(max) && min < max) {
        this.ranges[st.key] = { min, max, step: Number(edit.step) || 1 };
      }
    });
  }

  getRange(key) {
    return this.ranges[key] ?? DEFAULT_RANGES[key];
  }

  /** Full state: only keys the device answered are present. */
  async fetchState() {
    const unwrap = (st, v) => (st.subKey ? (v && typeof v === 'object' ? v[st.subKey] : null) : v);
    const reads = await Promise.all(
      this.settings.map((st) =>
        this.getValue(st.path, st.type)
          .then((v) => unwrap(st, v))
          .catch(() => null),
      ),
    );
    const state = {};
    this.settings.forEach((st, i) => {
      if (reads[i] !== null && reads[i] !== undefined) state[st.key] = reads[i];
    });
    if (this.isMax) {
      const b = await this.getValue(BRIGHTNESS_PATH, 'espressoBrightness').catch(() => null);
      if (b?.ambeologo !== undefined) state[KEY.LOGO_BRIGHTNESS] = b.ambeologo;
      if (b?.display !== undefined) state[KEY.DISPLAY_BRIGHTNESS] = b.display;
    }
    return state;
  }

  // --- derived values ------------------------------------------------------
  isOn(state) {
    return state[KEY.POWER] !== undefined && state[KEY.POWER] !== 'networkStandby';
  }

  /** True when the model can be woken/put to standby over the API. */
  canPower() {
    return this.isMax;
  }

  sourceTitle(state) {
    const id = state[KEY.SOURCE];
    return this.sources.find((x) => String(x.id) === String(id))?.title ?? null;
  }

  presetTitle(state) {
    return this.presets.find((x) => String(x.id) === String(state[KEY.PRESET]))?.title ?? null;
  }

  codec(state) {
    const d = state[KEY.DECODER];
    if (!d || typeof d !== 'object') return null;
    if (this.isMax) {
      const code = d.decoder_status;
      return Number.isInteger(code) && code > 0 ? (MAX_DECODER_CODECS[code] ?? `Codec ${code}`) : null;
    }
    return typeof d.codec === 'string' && d.codec ? d.codec : null;
  }

  nowPlaying(state) {
    const p = state[KEY.PLAYER] ?? {};
    const title = p.trackRoles?.title || p.trackRoles?.description || p.mediaRoles?.title;
    const meta = p.trackRoles?.mediaData?.metaData ?? p.mediaRoles?.mediaData?.metaData ?? {};
    return [meta.artist, title].filter(Boolean).join(' – ') || null;
  }

  // --- commands ------------------------------------------------------------
  _setting(key) {
    const st = this.settings.find((x) => x.key === key);
    if (!st) throw new AmbeoError(`${key} is not supported by ${this.info?.model}`);
    return st;
  }

  async setPower(on) {
    if (!this.isMax) throw new AmbeoError('Power control is not available on this model');
    await this.setValue(on ? 'espresso:appRequestedOnline' : 'espresso:appRequestedStandby', 'bool_', true);
  }

  async setSource(id) {
    const source = this.sources.find((x) => String(x.id) === String(id));
    if (!source) throw new AmbeoError(`Unknown source ${id}`);
    if (!source.selectable) throw new AmbeoError(`${source.title} cannot be selected`);
    if (this.isMax) {
      await this.setValue('espresso:audioInputID', 'i32_', source.id);
    } else {
      await this.activate(source.path || `ui:/inputs/${source.id}`, { type: 'bool_', bool_: true });
    }
  }

  async setBrightnessMax(field, value) {
    const cur = await this.getValue(BRIGHTNESS_PATH, 'espressoBrightness');
    const next = { ambeologo: cur.ambeologo, display: cur.display, [field]: value };
    if (next.ambeologo === undefined || next.display === undefined) {
      throw new AmbeoError('Brightness not available');
    }
    await this.setValue(BRIGHTNESS_PATH, 'espressoBrightness', next);
  }

  /** Generic setter for every writable key. */
  async set(key, value) {
    switch (key) {
      case KEY.POWER:
        return this.setPower(Boolean(value));
      case KEY.SOURCE:
        return this.setSource(value);
      case KEY.BLUETOOTH:
        return this.activate('bluetooth:deviceList/discoverable', { type: 'bool_', bool_: Boolean(value) });
      case KEY.LOGO_BRIGHTNESS:
        if (this.isMax) return this.setBrightnessMax('ambeologo', Math.round(value));
        break;
      case KEY.DISPLAY_BRIGHTNESS:
        return this.setBrightnessMax('display', Math.round(value));
      case KEY.PRESET: {
        const preset = this.presets.find((x) => String(x.id) === String(value));
        value = preset ? preset.id : value;
        break;
      }
      default:
    }
    const st = this._setting(key);
    let v = value;
    if (st.type === 'i32_' || st.type === 'i16_') v = Math.round(Number(value));
    else if (st.type === 'double_') v = Number(value);
    await this.setValue(st.path, st.type, v);
  }

  async volumeStep(delta, current) {
    const { min, max } = this.getRange(KEY.VOLUME);
    const next = Math.max(min, Math.min(max, (current ?? 0) + delta));
    await this.set(KEY.VOLUME, next);
    return next;
  }
}
