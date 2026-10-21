// Defaults MUST stay consistent with the `default` values of the manifest
// `config_schema` (checked by test/manifest.test.js).
export const DEFAULT_CONFIG = {
  host: '',
  poll_frequency: 60, // seconds between two state reads
  volume_step: 5, // widget volume buttons, in volume units
};

export function normalizeConfig(raw = {}) {
  return {
    ...DEFAULT_CONFIG,
    ...raw,
    host: String(raw.host ?? DEFAULT_CONFIG.host).trim(),
    poll_frequency: Number(raw.poll_frequency ?? DEFAULT_CONFIG.poll_frequency),
    volume_step: Number(raw.volume_step ?? DEFAULT_CONFIG.volume_step),
  };
}
