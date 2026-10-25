# Sennheiser AMBEO Soundbar

A [Gladys Assistant](https://gladysassistant.com/) external integration that controls and
monitors a Sennheiser AMBEO Soundbar **Max, Plus or Mini** over your local network. No
cloud, no account.

The **Plus is the reference model**: the code paths for it are the ones used and tested
most. The Mini and the Max are supported the same way, minus or plus what their firmware
answers.

## Requirements

- Gladys Assistant **5.1.0 or later**.
- The soundbar and the Gladys host on the same network.

## Installation

1. In Gladys, open **Integrations** and install **Sennheiser AMBEO Soundbar**.
2. Open its **Configuration** screen.
3. Enter the soundbar's IP address (find it in the Smart Control app or in your router),
   or use the name the bar answers to on some networks.
4. Run a device scan. One device is created, with every setting your model answers.

The refresh interval, the volume step of the widget and the two volume limits are set on
the same screen.

## Device features

**Writable:** power, volume, mute, input, sound profile, night mode, AMBEO mode, voice
enhancement, sound feedback, subwoofer, LED, logo and display brightness, Bluetooth
pairing (Plus/Mini), center volume (Plus/Mini), AMBEO level and center/side/up-firing
levels (Max).

**Read-only:** eco mode, audio codec and now playing.

Power depends on the model: the Max can be woken from standby and put back over the API,
the button of the widget is therefore hidden on the other models. This is a limitation of
the soundbar firmware, not of the integration.

## Dashboard widget "Soundbar remote"

Power on/off, volume down and up (the step is configurable), mute, and one button per
selectable input. The active input is highlighted, and the volume is shown as a live tile
that follows the device.

## Scenes

### Action "Play a sound on the soundbar"

Makes the soundbar play an MP3 or WAV. Two sources:

- **File of the "sounds" folder** — the integration serves the file itself on its own
  port and the soundbar fetches it. The folder is published through the integration's
  **sounds** port: open it from the Apps screen, drop your MP3 or WAV files there, then
  reload the configuration screen. A three second sample tone (`tone.wav`) is installed
  on first start.
- **http(s) URL** — a direct link to the file. The soundbar fetches it itself, so it must
  be reachable from the soundbar and stay online while it plays.

The optional **volume** field sets the volume before playing.

### Action "Read the soundbar state"

Reads the soundbar now and returns volume, mute, input, sound profile and codec, which the
following steps of the scene read as `{{outputs.<key>}}`.

### Action "Set the soundbar volume"

Sets an absolute volume.

### Trigger "Volume crossed a limit"

Fires when the volume goes above the **too loud** limit or below the **too quiet** limit
set in the configuration. The event carries the direction, the limit and the new volume,
readable as `{{triggerEvent.data.direction}}`, `{{triggerEvent.data.limit}}` and
`{{triggerEvent.data.volume}}`. Set a limit to `0` to disable that side.

The trigger fires **once per crossing**, not on every read: a volume that stays above the
limit does not fire again until it has come back below by a few units. A scene trigger of
an integration can only match equality on its fields, so the comparison has to live in
the integration. For a plain "volume above X" condition, use Gladys' own **device state
changed** trigger on the volume feature instead.

## How it works

The soundbar exposes an unauthenticated JSON API on its port 80. The paths and value types
used here follow the open-source [pyambeo](https://github.com/faizpuru/pyambeo) library,
which also powers the Home Assistant integration for these soundbars. The Max runs a
different firmware family than the Plus and the Mini, so the two are handled by separate
path sets, chosen at runtime from the model name the soundbar reports.

The API is not officially documented or supported by Sennheiser. Playback of a file is
the part that is verified least: test it with the URL source first.

## Development

```bash
npm install
npm test
npm run lint
node index.js
```

- `index.js` wires the SDK only: every handler is registered before the connection.
- `src/ambeo/client.js` is the soundbar API client. It has no dependency on the Gladys SDK,
  which is why it is unit-tested offline.
- `src/devices/soundbar.js` turns the state the soundbar returns into Gladys features.
- `src/widgets.js` builds the dashboard content and runs its buttons.
- `src/scenes.js` holds the scene trigger and the scene actions.
- `src/sounds.js` serves the shared sound folder.

## Legal notice

This is an **independent, unofficial project**. It is **not affiliated with, authorised,
endorsed or sponsored by Sennheiser electronic SE & Co. KG** or any of its subsidiaries,
and it is not an official Sennheiser product or a Sennheiser service.

**Sennheiser** and **AMBEO** are trademarks or registered trademarks of
[Sennheiser electronic SE & Co. KG](https://www.sennheiser.com/) and are used here only to
describe the hardware this integration works with. All other trademarks, product names and
company names mentioned in this repository are the property of their respective owners.

All product names, logos and brands are used for identification purposes only and remain
the property of their respective owners.

## Licence

Apache-2.0. The soundbar API paths follow the pyambeo library, which is MIT licensed.
