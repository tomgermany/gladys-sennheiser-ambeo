// -----------------------------------------------------------------------------
// Load the AMBEO soundbar: identified device, state, published features.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';

const logger = createLogger({ name: 'load' });

/**
 * Connect a client, identify the device, read its state and publish features.
 *
 * Returns `null` when the soundbar cannot be reached — the caller decides what
 * to tell the user, so one failure path serves both the scan and the
 * configuration changes.
 */
export async function loadSoundbar({ gladys, AmbeoClient, config, buildDevice, publishAll }) {
  if (!config.host) {
    await gladys.setConnectionStatus(false, {
      en: 'Enter the soundbar IP address in the configuration.',
      fr: "Indiquez l'adresse IP de la barre de son dans la configuration.",
    });
    return null;
  }

  try {
    const client = new AmbeoClient(config.host);
    await client.connect(); // identifies the model, loads sources, presets, ranges
    const state = await client.fetchState();
    const device = buildDevice(gladys, client, state);

    logger.info(`Soundbar identified: ${client.info.model} (${config.host})`);
    await gladys.publishDiscoveredDevices([device]);
    await publishAll(gladys, client, state);
    await gladys.setConnectionStatus(true);

    return { client, state, device };
  } catch (err) {
    logger.error(`Soundbar not reachable (${config.host})`, err);
    await gladys
      .setConnectionStatus(false, {
        en: `Soundbar not reachable: ${err.message}`.slice(0, 200),
        fr: `Barre de son injoignable : ${err.message}`.slice(0, 200),
      })
      .catch(() => {});
    return null;
  }
}
