// Defaults MUST stay consistent with the `default` values of the manifest
// `config_schema` (checked by test/manifest.test.js).
export const DEFAULT_CONFIG = {
  host: '',
  poll_frequency: 60, // seconds between two state reads
  volume_step: 5, // widget volume buttons, in volume units
  default_sound: 'tone.wav', // file of the sounds folder used when a scene names none
  volume_max: 70, // fire "too loud" above this; 0 disables this side
  volume_min: 10, // fire "too quiet" below this; 0 disables this side
};

export function normalizeConfig(raw = {}) {
  return {
    ...DEFAULT_CONFIG,
    ...raw,
    host: String(raw.host ?? DEFAULT_CONFIG.host).trim(),
    poll_frequency: Number(raw.poll_frequency ?? DEFAULT_CONFIG.poll_frequency),
    volume_step: Number(raw.volume_step ?? DEFAULT_CONFIG.volume_step),
    default_sound: String(raw.default_sound ?? DEFAULT_CONFIG.default_sound),
    volume_max: Number(raw.volume_max ?? DEFAULT_CONFIG.volume_max),
    volume_min: Number(raw.volume_min ?? DEFAULT_CONFIG.volume_min),
  };
}
