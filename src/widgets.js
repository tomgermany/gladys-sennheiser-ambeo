// -----------------------------------------------------------------------------
// Dashboard widget "Soundbar remote": power, volume down/up, input selection.
// Declarative content only (SDK v0.14+, Gladys 5.1+). `params` are fixed in the
// content and sent back as-is: handlers never trust user input.
// -----------------------------------------------------------------------------

import { KEY } from './ambeo/client.js';

export const REMOTE_WIDGET = 'remote';

export const ACTION = {
  POWER_ON: 'power_on',
  POWER_OFF: 'power_off',
  VOLUME_DOWN: 'volume_down',
  VOLUME_UP: 'volume_up',
  MUTE: 'mute_toggle',
  SOURCE: 'source',
};

/**
 * @param {object} ctx
 * @param {import('./ambeo/client.js').AmbeoClient | null} ctx.client
 * @param {object | null} ctx.state last known state
 * @param {string | null} ctx.volumeFeatureId external_id of the volume feature (live tile)
 */
export function buildRemoteContent({ client, state, volumeFeatureId }) {
  if (!client || !state) {
    return {
      ttl_seconds: 30,
      components: [
        {
          type: 'text',
          body: { en: 'Soundbar not connected. Set its IP address in the integration settings.', fr: "Barre de son non connectée. Indiquez son adresse IP dans la configuration." },
        },
      ],
    };
  }
  const on = client.isOn(state);
  const components = [];
  if (volumeFeatureId) {
    components.push({
      type: 'value',
      label: { en: 'Volume', fr: 'Volume' },
      icon: 'volume-2',
      device_feature: volumeFeatureId,
    });
  }
  components.push({
    type: 'status',
    items: [
      {
        label: { en: 'Input', fr: 'Entrée' },
        icon: 'log-in',
        value: client.sourceTitle(state) ?? '–',
        color: 'neutral',
      },
    ],
  });
  if (client.canPower()) {
    components.push({
      type: 'button',
      label: on ? { en: 'Turn off', fr: 'Éteindre' } : { en: 'Turn on', fr: 'Allumer' },
      icon: 'power',
      style: on ? 'secondary' : 'primary',
      action: { key: on ? ACTION.POWER_OFF : ACTION.POWER_ON },
    });
  }
  components.push(
    {
      type: 'button',
      label: { en: 'Quieter', fr: 'Moins fort' },
      icon: 'volume-1',
      style: 'secondary',
      action: { key: ACTION.VOLUME_DOWN },
    },
    {
      type: 'button',
      label: { en: 'Louder', fr: 'Plus fort' },
      icon: 'volume-2',
      style: 'secondary',
      action: { key: ACTION.VOLUME_UP },
    },
    {
      type: 'button',
      label: state[KEY.MUTED] ? { en: 'Unmute', fr: 'Réactiver le son' } : { en: 'Mute', fr: 'Couper le son' },
      icon: 'volume-x',
      style: 'secondary',
      action: { key: ACTION.MUTE },
    },
  );
  const current = String(state[KEY.SOURCE]);
  for (const src of client.sources.filter((x) => x.selectable)) {
    components.push({
      type: 'button',
      label: String(src.title).slice(0, 30),
      icon: 'log-in',
      style: String(src.id) === current ? 'primary' : 'secondary',
      // Index, not the raw id: ids can be paths/ints, the handler maps it back.
      action: { key: ACTION.SOURCE, params: { source: String(src.id) } },
    });
  }
  return { ttl_seconds: 60, components };
}

/** Run a tapped button. Returns the toast text (or throws: user sees it). */
export async function runRemoteAction({ client, state, actionKey, params, config }) {
  if (!client) throw new Error('Soundbar not connected');
  switch (actionKey) {
    case ACTION.POWER_ON:
      await client.setPower(true);
      return { en: 'Turning on…', fr: 'Allumage…' };
    case ACTION.POWER_OFF:
      await client.setPower(false);
      return { en: 'Turning off…', fr: 'Extinction…' };
    case ACTION.VOLUME_DOWN:
    case ACTION.VOLUME_UP: {
      const delta = (actionKey === ACTION.VOLUME_UP ? 1 : -1) * config.volume_step;
      const live = await client.getValue('player:volume', 'i32_').catch(() => state?.[KEY.VOLUME]);
      const next = await client.volumeStep(delta, live);
      return { en: `Volume ${next}`, fr: `Volume ${next}` };
    }
    case ACTION.MUTE: {
      const muted = await client.getValue('settings:/mediaPlayer/mute', 'bool_').catch(() => false);
      await client.set(KEY.MUTED, !muted);
      return muted ? { en: 'Sound on', fr: 'Son activé' } : { en: 'Muted', fr: 'Son coupé' };
    }
    case ACTION.SOURCE: {
      const src = client.sources.find((x) => String(x.id) === String(params?.source));
      if (!src) throw new Error('Unknown input');
      await client.setSource(src.id);
      return { en: `Input: ${src.title}`, fr: `Entrée : ${src.title}` };
    }
    default:
      throw new Error(`Unknown widget action: ${actionKey}`);
  }
}
