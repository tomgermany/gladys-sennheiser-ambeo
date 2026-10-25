// -----------------------------------------------------------------------------
// Entry point ("wiring"): this file connects the pieces, it holds no logic.
//
// WHAT THIS FILE DOES
// It creates the SDK connection to Gladys, registers the handlers that Gladys
// will call, and starts the container. Everything else lives in src/:
//   src/ambeo/client.js      talking to the soundbar over HTTP
//   src/devices/soundbar.js  turning the soundbar state into Gladys features
//   src/widgets.js           the dashboard remote
//   src/scenes.js            the scene trigger and the scene actions
//   src/sounds.js            the shared sound folder and its little web server
//   src/config.js            defaults and normalisation of the user settings
//
// THE ONE ORDERING RULE
// Every handler is registered BEFORE `gladys.connect()`. Gladys may send a
// message the moment the connection opens — a scan, a command, a config read —
// and a handler registered after that point would simply miss it.
//
// THE SDK CONTRACT, IN ONE PARAGRAPH
// Gladys never runs our code on its own. It sends us messages over the
// connection: "scan for devices", "the user set this value", "poll now",
// "the configuration changed", "a scene reached your action". We answer each
// one. For devices we only ever PUBLISH what we found; the user decides in
// the Discovery tab which ones to actually create.
//
// SDK: @gladysassistant/integration-sdk ^0.15 (Gladys >= 5.1.0).
// -----------------------------------------------------------------------------

import { GladysIntegration, logger } from '@gladysassistant/integration-sdk';
import { AmbeoClient } from './src/ambeo/client.js';
import { normalizeConfig } from './src/config.js';
import { buildDevice, deviceExternalId, onSetValue, publishAll } from './src/devices/soundbar.js';
import { SCENE_ACTIONS, TRIGGER, evaluateVolume, nextSide } from './src/scenes.js';
import { seedSounds } from './src/sounds.js';
import { REMOTE_WIDGET, buildRemoteContent, runRemoteAction } from './src/widgets.js';

const gladys = new GladysIntegration();

// --- State of the running integration ----------------------------------------
// Kept in module scope on purpose: the handlers below are shortcuts, and this
// is the smallest thing that lets them share what they know.
let config = normalizeConfig(); // the user settings, re-read on every change
let client = null; // the soundbar connection, null while we have none
let state = null; // last state read from the soundbar
let lastRead = 0; // when that read happened, used to honour poll_frequency
let volumeSide = 'normal'; // 'normal' | 'over' | 'under', see fireVolumeEvents()

const NO_HOST = {
  en: 'Enter the soundbar IP address in the configuration.',
  fr: "Indiquez l'adresse IP de la barre de son dans la configuration.",
};

// Audio files live in a volume shared with the Gladys-managed audio sub-container.
// For this test, use the test NAS LAN IP; Gladys chooses and persists the host port.
const TEST_AUDIO_HOST = '192.168.0.230';
seedSounds();
const servedBaseUrl = async () => {
  const containers = await gladys.getContainers();
  const audio = containers.find((container) => container.name === 'ambeo-audio');
  const port = audio?.ports?.find((item) => item.name === 'ambeo_audio')?.host_port;
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('Gladys has not assigned a host port to the ambeo-audio container yet');
  }
  const baseUrl = `http://${TEST_AUDIO_HOST}:${port}`;
  logger.info(`Audio URL base: ${baseUrl} (port assigned by Gladys)`);
  return baseUrl;
};

/** Read the current configuration from Gladys into `config`. */
async function readConfig() {
  config = normalizeConfig(await gladys.getConfig());
  return config;
}

/**
 * Connect to the soundbar, then publish its device and its state.
 *
 * Resolves true on success. On failure the connection status carries the reason
 * (that is the text shown in the Configuration screen), and the log line names
 * the path that answered badly, so an unreachable or half-answering soundbar is
 * diagnosable without a second attempt.
 */
async function connectSoundbar() {
  // Start from a clean slate: a failed connect must never leave the previous
  // client behind, or the next command would talk to a stale one.
  client = null;
  state = null;
  volumeSide = 'normal';

  if (!config.host) {
    await gladys.setConnectionStatus(false, NO_HOST);
    return false;
  }

  try {
    const next = new AmbeoClient(config.host);
    // Tolerated problems are logged, never thrown: a group of settings the
    // soundbar does not answer must not take the whole device down.
    next.warn = (what, err) => logger.warn(`Tolerated (${what}): ${err.message}`);
    await next.connect();
    client = next;
    state = await client.fetchState();
    logger.info(
      `Soundbar ready: ${client.info.model} (${client.info.serial ?? 'no serial'}), ` +
        `${client.sources.filter((s) => s.selectable).length} selectable inputs`,
    );
    await gladys.setConnectionStatus(true);
    return true;
  } catch (err) {
    logger.error(`Soundbar connection failed (${config.host}): ${err.message}`);
    // setConnectionStatus is what the user sees in the Configuration screen,
    // so it gets the same message, trimmed to what the field accepts.
    await gladys
      .setConnectionStatus(false, {
        en: `Soundbar not reachable: ${err.message}`.slice(0, 200),
        fr: `Barre de son injoignable : ${err.message}`.slice(0, 200),
      })
      .catch(() => {});
    return false;
  }
}

/**
 * Publish the device, so it shows up in the Discovery tab where the user
 * creates it. Publishing is an offer, not a creation: Gladys keeps the user in
 * control, and re-publishing the same device later only refreshes its data.
 */
async function publishDevice() {
  if (!client || !state) return;
  const device = buildDevice(gladys, client, state);
  // The input list is printed once per connection: it is what both the device
  // features and the widget's cycling button are built from, so seeing it is
  // the quickest way to explain an input that does not appear where expected.
  logger.info(
    `publishDiscoveredDevices -> "${device.name}" with ${device.features.length} features; ` +
      `inputs: ${client.sources.filter((s) => s.selectable).map((s) => `${s.title}(${s.id})`).join(', ') || 'none'}`,
  );
  await gladys.publishDiscoveredDevices([device]);
  await publishAll(gladys, client, state);
}

/** Read the state again, publish every value, and check the volume limits. */
async function refresh() {
  if (!client) return;
  state = await client.fetchState();
  lastRead = Date.now();
  await publishAll(gladys, client, state);
  await fireVolumeEvents();
}

/**
 * The "too loud / too quiet" scene trigger.
 *
 * Why this lives here and not in the scene: a scene trigger declared by an
 * integration can only match EQUALITY on its fields — no operator, no
 * threshold. So the comparison has to happen in the integration, and the scene
 * is only told that a crossing happened.
 *
 * Limits come from the configuration, where 0 means "this side is off".
 */
async function fireVolumeEvents() {
  const events = evaluateVolume({
    volume: state?.volume,
    maxVolume: config.volume_max > 0 ? config.volume_max : undefined,
    minVolume: config.volume_min > 0 ? config.volume_min : undefined,
    previous: { SIDE: volumeSide },
  });
  // nextSide remembers where we are now (normal, over, under) for the next read.
  volumeSide = nextSide(events, volumeSide);
  for (const event of events.filter((e) => !e.__side)) {
    await gladys
      .publishSceneEvent(TRIGGER.VOLUME_CROSSED, event)
      .catch((err) => logger.error('publishSceneEvent failed', err));
  }
}

// --- Discovery ---------------------------------------------------------------
// Gladys calls this when the user asks for a scan in the Discovery tab.
// We answer with the full list of devices we can offer — one soundbar here.
//
// The first log line is deliberate: it proves the request arrived. If a scan
// ends with no device AND no line in the log, the request never reached the
// integration, and the search belongs in the manifest, not in the soundbar.
gladys.onScanRequest(async () => {
  logger.info('onScanRequest -> called by Gladys');
  if (!client && !(await connectSoundbar())) {
    logger.warn('onScanRequest -> no soundbar, nothing published');
    return;
  }
  await publishDevice();
});

// --- Commands ----------------------------------------------------------------
// The user acted on a feature in Gladys (a slider moved, a button pressed).
// Do the work on the soundbar, then confirm the value back so the interface
// reflects what really happened. Throwing fails the command visibly.
gladys.onSetValue(async (device, feature, value) => {
  if (!client) throw new Error('Soundbar not connected');
  await onSetValue(gladys, client, { device, feature, value });
  gladys.requestWidgetRefresh(REMOTE_WIDGET);
});

// --- Polling -----------------------------------------------------------------
// Gladys ticks a polled device once a minute at most; the interval the user
// chose is applied by skipping ticks, so a 5-minute setting simply ignores
// four of five ticks instead of asking Gladys to change its pace.
gladys.onPoll(async (device) => {
  if (!client || device.external_id !== deviceExternalId(gladys, client)) return;
  if (Date.now() - lastRead < config.poll_frequency * 1000 - 30000) return;
  await refresh();
});

/**
 * Manifest action "Test the connection": the button in the Configuration
 * screen. It tests the SAVED configuration and answers in words rather than
 * only in the log — the log is the second place to look, not the first.
 */
gladys.onAction('test_connection', async () => {
  const before = config.host;
  // The action runs after saving, but re-read the configuration anyway so the
  // test always runs against what the screen currently holds.
  await readConfig().catch(() => {});

  const probe = new AmbeoClient(config.host || before);
  try {
    await probe.connect();
    const probeState = await probe.fetchState();
    const inputs = probe.sources.filter((s) => s.selectable).length;
    logger.info(`Connection test: ${probe.info.model} at ${probe.host}`);
    return {
      en: `Answered: ${probe.info.model} (firmware ${probe.info.version ?? 'unknown'}). ${inputs} inputs, volume ${probeState.volume ?? '?'}.`,
      fr: `Réponse : ${probe.info.model} (firmware ${probe.info.version ?? 'inconnu'}). ${inputs} entrées, volume ${probeState.volume ?? '?'}.`,
    };
  } catch (err) {
    logger.error(`Connection test failed (${probe.host}): ${err.message}`);
    return {
      en: `No usable answer from ${probe.host}: ${err.message} — is the address the soundbar's, on port 80?`,
      fr: `Aucune réponse exploitable de ${probe.host} : ${err.message} — l'adresse est-elle celle de la barre, sur le port 80 ?`,
    };
  }
});

// --- Scene actions -----------------------------------------------------------
// One handler per action declared in the manifest `scene_actions`. Field values
// arrive already resolved by Gladys (variables substituted, defaults applied).
for (const [key, handler] of Object.entries(SCENE_ACTIONS)) {
  gladys.onSceneAction(key, (fields) => handler({ client, fields, config, servedBaseUrl }));
}

// --- Dashboard widget --------------------------------------------------------
// onWidgetGet builds the content the dashboard renders; onWidgetAction runs a
// tap on one of its buttons. The content is declarative — labels, rows and
// buttons — and carries its own fixed parameters, never user input.
gladys.onWidgetGet(REMOTE_WIDGET, async ({ settings }) => {
  // Read the soundbar first so the widget shows the truth, but keep the last
  // known state if that read fails: a stale value beats an empty widget.
  if (client) state = await client.fetchState().catch(() => state);
  const volumeFeatureId = client
    ? gladys.externalIds('soundbar', client.info.serial || client.host).feature('volume')
    : null;
  return buildRemoteContent({ client, state, volumeFeatureId, settings });
});
gladys.onWidgetAction(REMOTE_WIDGET, async (actionKey, params, { settings }) => {
  const toast = await runRemoteAction({ client, state, actionKey, params, settings, config });
  await refresh().catch(() => {});
  return toast;
});

// --- Configuration -----------------------------------------------------------
// The user saved the Configuration screen. Reconnect from scratch and tell the
// widget, because a changed host or a changed step can alter what it shows.
gladys.onConfigUpdated(async (newConfig) => {
  config = normalizeConfig(newConfig);
  volumeSide = 'normal';
  if (await connectSoundbar()) await publishDevice();
  gladys.requestWidgetRefresh(REMOTE_WIDGET);
});

// --- Connection lifecycle ----------------------------------------------------
// Everything below runs once per (re)connection, including the very first one.
// `connected` fires after the SDK has authenticated, so getConfig() is safe.
gladys.on('connected', async () => {
  try {
    await readConfig();
    if (await connectSoundbar()) await publishDevice();
    gladys.requestWidgetRefresh(REMOTE_WIDGET);
  } catch (err) {
    logger.error('Post-connection initialization failed', err.message);
  }
});

// --- Shutdown ----------------------------------------------------------------
// The container is stopped on every restart and update: close what we opened,
// so the port is released and the process exits cleanly.
gladys.handleShutdown((signal) => {
  logger.info(`Received ${signal} -> graceful shutdown`);
  // The audio server is a separate sub-container managed by Gladys.
});

// --- Startup -----------------------------------------------------------------
logger.info(`Starting the AMBEO soundbar integration... (sounds: ${sounds.dir})`);
gladys.connect().catch((err) => {
  logger.error('Initial connection failed', err.message);
  process.exit(1);
});
