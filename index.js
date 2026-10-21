// Entry point: SDK wiring only. Handlers are registered BEFORE connect().
// SDK: @gladysassistant/integration-sdk ^0.15 (Gladys >= 5.1.0).
import { GladysIntegration, logger } from '@gladysassistant/integration-sdk';
import { AmbeoClient } from './src/ambeo/client.js';
import { normalizeConfig } from './src/config.js';
import { buildDevice, deviceExternalId, onSetValue, publishAll } from './src/devices/soundbar.js';
import { SCENE_ACTIONS, TRIGGER, evaluateVolume, nextSide } from './src/scenes.js';
import { startSoundServer } from './src/sounds.js';
import { REMOTE_WIDGET, buildRemoteContent, runRemoteAction } from './src/widgets.js';

const gladys = new GladysIntegration();

let config = normalizeConfig();
let client = null; // AmbeoClient once connected to a soundbar
let state = null; // last known state
let lastRead = 0;
let volumeSide = 'normal'; // 'normal' | 'over' | 'under'

const NO_HOST = {
  en: 'Enter the soundbar IP address in the configuration.',
  fr: "Indiquez l'adresse IP de la barre de son dans la configuration.",
};

// Local file store: the soundbar must be able to reach this URL itself.
const sounds = startSoundServer();
const servedBaseUrl = async () => {
  if (!sounds.baseUrl) {
    throw new Error('No LAN address found to serve the file from');
  }
  return sounds.baseUrl;
};

async function connectSoundbar() {
  client = null;
  state = null;
  volumeSide = 'normal';
  if (!config.host) {
    await gladys.setConnectionStatus(false, NO_HOST);
    return false;
  }
  try {
    const next = new AmbeoClient(config.host);
    await next.connect();
    client = next;
    state = await client.fetchState();
    await gladys.setConnectionStatus(true);
    return true;
  } catch (err) {
    logger.error('Soundbar connection failed', err);
    await gladys
      .setConnectionStatus(false, {
        en: `Soundbar not reachable: ${err.message}`.slice(0, 200),
        fr: `Barre de son injoignable : ${err.message}`.slice(0, 200),
      })
      .catch(() => {});
    return false;
  }
}

async function refresh() {
  if (!client) return;
  state = await client.fetchState();
  lastRead = Date.now();
  await publishAll(gladys, client, state);
  await fireVolumeEvents();
}

/**
 * Threshold events. A scene trigger of an integration matches EQUALITY on its
 * fields only, so the comparison lives here and only the CROSSING is fired.
 * A limit of 0 disables that side.
 */
async function fireVolumeEvents() {
  const events = evaluateVolume({
    volume: state?.volume,
    maxVolume: config.volume_max > 0 ? config.volume_max : undefined,
    minVolume: config.volume_min > 0 ? config.volume_min : undefined,
    previous: { SIDE: volumeSide },
  });
  volumeSide = nextSide(events, volumeSide);
  for (const event of events.filter((e) => !e.__side)) {
    await gladys
      .publishSceneEvent(TRIGGER.VOLUME_CROSSED, event)
      .catch((err) => logger.error('publishSceneEvent failed', err));
  }
}

// --- Discovery: one device, features follow what this model answers ----------
gladys.onScanRequest(async () => {
  if (!client && !(await connectSoundbar())) return;
  await gladys.publishDiscoveredDevices([buildDevice(gladys, client, state)]);
});

// --- Commands ---------------------------------------------------------------
gladys.onSetValue(async (device, feature, value) => {
  if (!client) throw new Error('Soundbar not connected');
  await onSetValue(gladys, client, { device, feature, value });
  gladys.requestWidgetRefresh(REMOTE_WIDGET);
});

// --- Polling (Gladys ticks once a minute; slower intervals skip ticks) ------
gladys.onPoll(async (device) => {
  if (!client || device.external_id !== deviceExternalId(gladys, client)) return;
  if (Date.now() - lastRead < config.poll_frequency * 1000 - 30000) return;
  await refresh();
});

// --- Scene actions ----------------------------------------------------------
for (const [key, handler] of Object.entries(SCENE_ACTIONS)) {
  gladys.onSceneAction(key, (fields) => handler({ client, fields, config, servedBaseUrl }));
}

// --- Widget -----------------------------------------------------------------
gladys.onWidgetGet(REMOTE_WIDGET, async () => {
  if (client) state = await client.fetchState().catch(() => state);
  const volumeFeatureId = client
    ? gladys.externalIds('soundbar', client.info.serial || client.host).feature('volume')
    : null;
  return buildRemoteContent({ client, state, volumeFeatureId });
});
gladys.onWidgetAction(REMOTE_WIDGET, async (actionKey, params) => {
  const toast = await runRemoteAction({ client, state, actionKey, params, config });
  await refresh().catch(() => {});
  return toast;
});

// --- Configuration ----------------------------------------------------------
gladys.onConfigUpdated(async (newConfig) => {
  config = normalizeConfig(newConfig);
  volumeSide = 'normal';
  if (await connectSoundbar()) {
    await gladys.publishDiscoveredDevices([buildDevice(gladys, client, state)]);
    await publishAll(gladys, client, state);
  }
  gladys.requestWidgetRefresh(REMOTE_WIDGET);
});

gladys.on('connected', async () => {
  try {
    config = normalizeConfig(await gladys.getConfig());
    if (await connectSoundbar()) {
      await gladys.publishDiscoveredDevices([buildDevice(gladys, client, state)]);
      await publishAll(gladys, client, state);
    }
    gladys.requestWidgetRefresh(REMOTE_WIDGET);
  } catch (err) {
    logger.error('Post-connection initialization failed', err);
  }
});

gladys.handleShutdown((signal) => {
  logger.info(`Received ${signal} -> graceful shutdown`);
  sounds.server.close();
});

logger.info(`Starting the AMBEO soundbar integration... (sounds: ${sounds.dir})`);
gladys.connect().catch((err) => {
  logger.error('Initial connection failed', err);
  process.exit(1);
});
