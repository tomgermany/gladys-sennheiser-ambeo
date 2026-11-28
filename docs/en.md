# Sennheiser AMBEO Soundbar

Controls an AMBEO Soundbar **Max, Plus or Mini** over your local network (no cloud).
The Plus is the reference model; Mini and Max are supported the same way.

## Setup

1. Find the soundbar's IP address (Smart Control app or your router).
2. Enter it in the integration's **Configuration** screen.
3. Press **Test the connection**: it reads the soundbar now and says what it
   answered (model, firmware, number of inputs, volume). If it reports an error,
   the address is wrong or the soundbar is not reachable on its port 80.
4. Run a device scan: one device with all settings your model supports is created.

## Device features

Power, volume, mute, input, sound profile, night mode, AMBEO mode, voice enhancement,
sound feedback, subwoofer, LED/logo/display brightness, Bluetooth pairing, eco mode,
audio codec and now playing (read-only). Plus and Mini also expose the center volume;
the Max exposes the AMBEO level and the center/side/up-firing levels instead.

Power follows the model: the Max can be woken from standby and put back, the button
of the widget is hidden on the other models.

A model that does not answer a whole group of settings (some firmware versions do not)
still appears: what it does not answer is logged and skipped.

## Widget "Soundbar remote"

The widget shows the current volume and selected input in two value tiles. Its buttons
let you turn the Max on/off, decrease volume (−), increase volume (+), toggle mute
(Mute/Unmute), and switch to the next selectable input (Next: *input name*).
The volume step can be configured, and the volume buttons can be hidden in the widget
settings. Gladys displays at most four buttons: on the Max, the power, volume −/+, and
mute buttons fill all four slots, so the next-input button is not shown while the volume
buttons are enabled. Hiding the volume buttons frees a slot.

## Scenes

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
pyambeo library.

## Legal notice

This is an independent, unofficial project. It is **not affiliated with, authorised,
endorsed or sponsored by Sennheiser electronic SE & Co. KG** or any of its subsidiaries,
and it is not an official Sennheiser product or service.

**Sennheiser** and **AMBEO** are trademarks or registered trademarks of
[Sennheiser electronic SE & Co. KG](https://www.sennheiser.com/), used here only to
describe the hardware this integration works with. All other trademarks, product names
and company names are the property of their respective owners.
