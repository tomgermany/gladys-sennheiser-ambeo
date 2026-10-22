// -----------------------------------------------------------------------------
// The dashboard widget "Soundbar remote".
//
// WHAT A WIDGET IS HERE
// A widget is a small card on the dashboard. This file builds its CONTENT; the
// Gladys core renders it. There is no HTML, no CSS and no script: the content
// is a declarative tree of components in a small vocabulary, and the core
// normalises, bounds and translates it. That is why a widget looks right in
// dark mode, on a phone and on a wall tablet, without us doing anything.
//
// THE BUDGET — the reason this file filters at all
// A card accepts at most 8 components, and among them at most 4 BUTTONS, 6
// value tiles, 2 texts and 1 status list. Anything beyond a cap is DROPPED, in
// content order, silently. So the order below is a decision, not a detail: the
// everyday controls come first, and a fifth button would simply never appear.
// That is why the remote shows four buttons and the input is CYCLED rather
// than listed, one button per input.
//
// WHY THE INPUT LIST COMES FROM THE DEVICE, NOT FROM THE SETTINGS
// Which inputs exist depends on the model and on what the user set up in the
// app: Spotify Connect, Tidal, AirPlay, or a renamed HDMI are all possible.
// A fixed list in the manifest cannot know them, so the cycling button walks
// the list the soundbar itself reports — the same list the Input feature in
// the Devices tab offers. Rename an input in the app, and the button follows.
//
// SDK v0.14+/0.15, Gladys 5.1+.
// -----------------------------------------------------------------------------

import { KEY } from './ambeo/client.js';

/** Widget key, as declared in the manifest `widgets` field. */
export const REMOTE_WIDGET = 'remote';

/**
 * Action keys carried by the buttons. They are part of the widget contract:
 * a dashboard stores the content the integration sends, so renaming one leaves
 * an existing dashboard button doing nothing.
 */
export const ACTION = {
  POWER_ON: 'power_on',
  POWER_OFF: 'power_off',
  VOLUME_DOWN: 'volume_down',
  VOLUME_UP: 'volume_up',
  MUTE: 'mute_toggle',
  SOURCE_NEXT: 'source_next',
};

/**
 * The inputs the Source button walks through.
 *
 * Taken from the soundbar, in the order the device reports them: a model that
 * also offers Spotify, Tidal or a renamed HDMI is covered without any change
 * here. What the soundbar marks as not selectable (AirPlay, Google Cast, which
 * only the casting app can switch to) is left out, because a button that
 * always fails is worse than no button.
 */
export function cycleSources(client) {
  if (!client) return [];
  return client.sources.filter((s) => s.selectable);
}

/**
 * @param {object} ctx
 * @param {import('./ambeo/client.js').AmbeoClient | null} ctx.client
 * @param {object | null} ctx.state last known state
 * @param {string | null} ctx.volumeFeatureId external_id of the volume feature
 * @param {object} [ctx.settings] the widget instance settings
 */
export function buildRemoteContent({ client, state, volumeFeatureId, settings = {} }) {
  if (!client || !state) {
    return {
      ttl_seconds: 30,
      components: [
        {
          type: 'text',
          body: {
            en: 'Soundbar not connected. Set its IP address in the integration settings.',
            fr: "Barre de son non connectée. Indiquez son adresse IP dans la configuration.",
          },
        },
      ],
    };
  }

  const on = client.isOn(state);
  const inputs = cycleSources(client);
  const current = String(state[KEY.SOURCE] ?? '');
  const components = [];

  // 1. A live tile: it follows the published states, nothing to refresh here.
  if (volumeFeatureId) {
    components.push({
      type: 'value',
      label: { en: 'Volume', fr: 'Volume' },
      icon: 'volume-2',
      device_feature: volumeFeatureId,
    });
  }

  // 2. Where the sound comes from right now. Reads the same state as the
  //    Devices tab, so the two never disagree.
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

  // 3. Power, only on a model that can be switched over its API. Skipped
  //    rather than shown dead: a button that always fails is worse than none.
  if (client.canPower()) {
    components.push({
      type: 'button',
      label: on ? { en: 'Turn off', fr: 'Éteindre' } : { en: 'Turn on', fr: 'Allumer' },
      icon: 'power',
      style: on ? 'secondary' : 'primary',
      action: { key: on ? ACTION.POWER_OFF : ACTION.POWER_ON },
    });
  }

  // 4. Volume buttons: switched on or off per widget instance, so a tile that
  //    does not need them can give the room to something else.
  if (settings.show_volume_buttons !== false) {
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
    );
  }

  // 5. Mute stays whatever the source is: on an HDMI input there is nothing
  //    else to silence.
  components.push({
    type: 'button',
    label: state[KEY.MUTED]
      ? { en: 'Unmute', fr: 'Réactiver le son' }
      : { en: 'Mute', fr: 'Couper le son' },
    icon: 'volume-x',
    style: state[KEY.MUTED] ? 'primary' : 'secondary',
    action: { key: ACTION.MUTE },
  });

  // 6. The Source button: walks the inputs the SOUNDBAR reports, in its own
  //    order, so a model with Spotify or a renamed HDMI needs no change here.
  //    Left out when there is nothing to cycle through.
  if (inputs.length > 1) {
    const index = inputs.findIndex((s) => String(s.id) === current);
    // `index` is -1 when the current input is one the device did not list as
    // selectable (a cast target, or one that just changed). Starting at -1
    // makes `+1` land on the first entry, which is the sane behaviour.
    const next = inputs[(index + 1 + inputs.length) % inputs.length];
    components.push({
      type: 'button',
      // Shows where the button will go; the current input is already in the
      // status row above, so repeating it here would waste the space.
      label: { en: `Input: ${next.title}`, fr: `Entrée : ${next.title}` },
      icon: 'log-in',
      style: 'secondary',
      action: { key: ACTION.SOURCE_NEXT, params: { next: String(next.id) } },
    });
  }

  return { ttl_seconds: 60, components };
}

/**
 * Run a tapped button. Returns the toast text, or throws so the user sees the
 * failure. `settings` come from the dashboard, never from free input: a widget
 * can sit on a shared screen, so nothing here trusts a typed value.
 */
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
      // Read the real volume before stepping: the last known state can be a
      // minute old, and a step from a stale value would jump.
      const live = await client
        .getValue('player:volume', 'i32_')
        .catch(() => state?.[KEY.VOLUME]);
      const next = await client.volumeStep(delta, live);
      return { en: `Volume ${next}`, fr: `Volume ${next}` };
    }

    case ACTION.MUTE: {
      const muted = await client
        .getValue('settings:/mediaPlayer/mute', 'bool_')
        .catch(() => Boolean(state?.[KEY.MUTED]));
      await client.set(KEY.MUTED, !muted);
      return muted ? { en: 'Sound on', fr: 'Son activé' } : { en: 'Muted', fr: 'Son coupé' };
    }

    case ACTION.SOURCE_NEXT: {
      const id = params?.next;
      const src = client.sources.find((x) => String(x.id) === String(id));
      if (!src) throw new Error(`Unknown input: ${id}`);
      await client.setSource(src.id);
      return { en: `Input: ${src.title}`, fr: `Entrée : ${src.title}` };
    }

    default:
      throw new Error(`Unknown widget action: ${actionKey}`);
  }
}
