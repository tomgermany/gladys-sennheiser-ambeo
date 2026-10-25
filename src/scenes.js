// -----------------------------------------------------------------------------
// Scene triggers and scene actions (SDK v0.14+/0.15, Gladys 5.1+).
//  
// Triggers are EVENTS the integration fires; actions are OPERATIONS a scene
// author places in a scene. Keys are forever: scenes store them.
//
// Note on thresholds: an integration trigger matches EQUALITY on its declared
// fields only — no operator, no threshold. So "too loud" here means: the
// integration compares the volume against a limit the user configured and
// fires `volume_threshold_crossed` on the crossing EDGE (once per crossing,
// with a hysteresis band so a volume sitting on the limit does not flap).
// For a plain "volume above X" condition, the scene author uses Gladys' own
// "device state changed" trigger on the volume feature — the device doc says so.
// -----------------------------------------------------------------------------

import { KEY } from './ambeo/client.js';

export const TRIGGER = {
  VOLUME_CROSSED: 'volume_threshold_crossed',
};

// Hysteresis: the volume must come back beyond the limit by this many units
// before a new event on that side can fire.
const HYSTERESIS = 5;

/**
 * Compare the current volume with the configured limits.
 * Returns the events to fire, plus an internal `__side` marker the caller
 * stores and hands back in `previous` on the next call.
 */
export function evaluateVolume({ volume, maxVolume, minVolume, previous }) {
  if (volume === undefined || volume === null) return [];
  const prev = previous.SIDE ?? 'normal';
  let side = 'normal';
  if (Number.isFinite(maxVolume) && volume > maxVolume) side = 'over';
  else if (Number.isFinite(minVolume) && volume < minVolume) side = 'under';
  else if (Number.isFinite(maxVolume) && volume > maxVolume - HYSTERESIS) side = 'over-hold';
  else if (Number.isFinite(minVolume) && volume < minVolume + HYSTERESIS) side = 'under-hold';

  // A volume inside the hysteresis band keeps the previous side, so the event
  // does not repeat while the volume stays near the limit.
  const was = prev === 'over-hold' ? 'over' : prev === 'under-hold' ? 'under' : prev;
  const now = side === 'over' ? 'over' : side === 'under' ? 'under' : was;

  const events = [];
  if (now === 'over' && was !== 'over') {
    events.push({ direction: 'over', limit: maxVolume, volume });
  }
  if (now === 'under' && was !== 'under') {
    events.push({ direction: 'under', limit: minVolume, volume });
  }
  events.push({ __side: side });
  return events;
}

/** Read the side marker back out of an evaluateVolume() result. */
export function nextSide(events, previous) {
  const marker = events.find((e) => e.__side);
  return marker?.__side ?? previous;
}

/** One entry per declared scene action, registered in index.js. */
export const SCENE_ACTIONS = {
  /** Read the soundbar now and hand the values to the following actions. */
  async read_state({ client }) {
    if (!client) throw new Error('Soundbar not connected');
    const state = await client.fetchState();
    return {
      volume: Number(state[KEY.VOLUME] ?? 0),
      muted: Boolean(state[KEY.MUTED]),
      input: client.sourceTitle(state) ?? '',
      preset: client.presetTitle(state) ?? '',
      codec: client.codec(state) ?? '',
    };
  },

  /** Set the volume to an absolute value. */
  async set_volume({ client, fields }) {
    if (!client) throw new Error('Soundbar not connected');
    const value = Math.round(Number(fields.volume));
    if (!Number.isFinite(value)) throw new Error('Volume must be a number');
    await client.set(KEY.VOLUME, value);
    return { volume: value };
  },
};
