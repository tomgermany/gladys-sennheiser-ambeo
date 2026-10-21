# Sennheiser AMBEO Soundbar

Controls an AMBEO Soundbar **Max, Plus or Mini** over your local network (no cloud).
The Plus is the reference model; Mini and Max are supported the same way.

## Setup

1. Find the soundbar's IP address (Smart Control app or your router).
2. Enter it in the integration's **Configuration** screen.
3. Run a device scan: one device with all settings your model supports is created.

## Device features

Power, volume, mute, input, sound profile, night mode, AMBEO mode, voice enhancement,
sound feedback, subwoofer, LED/logo/display brightness, Bluetooth pairing, eco mode,
audio codec and now playing (read-only). Plus and Mini also expose the center volume;
the Max exposes the AMBEO level and the center/side/up-firing levels instead.

Power follows the model: the Max can be woken from standby and put back, the button
of the widget is hidden on the other models.

## Widget "Soundbar remote"

Power on/off, volume down/up (step configurable), mute, and one button per selectable
input.

## Scenes

**Action "Play a sound on the soundbar"** plays an MP3 or WAV:

- **File of the "sounds" folder**: the integration serves the file itself and the
  soundbar fetches it. Open the integration's "sounds" port from the Apps screen,
  drop your MP3 or WAV there, then pick it in the action (leave the name empty to
  use the default sound of the configuration). A three second sample tone
  (`tone.wav`) ships with the integration.
- **http(s) URL**: a direct link to the file, reachable by the soundbar.

The optional **volume** field sets the volume before playing.

**Action "Read the soundbar state"** returns volume, mute, input, sound profile and
codec, readable by the following steps as `{{outputs.<key>}}`.

**Action "Set the soundbar volume"** sets an absolute volume.

**Trigger "Volume crossed a limit"** fires when the volume goes above the "too loud"
limit or below the "too quiet" limit set in the configuration. The trigger carries
the direction, the limit and the new volume. It fires once per crossing: for a plain
"volume above X" condition, use Gladys' own "device state changed" trigger on the
volume feature.

## Notes

The soundbar API is not officially documented; the paths follow the open-source
pyambeo library. Playback of a file is not verified against a device yet.
