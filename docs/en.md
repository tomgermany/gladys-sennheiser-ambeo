# Sennheiser AMBEO Soundbar

Controls an AMBEO Soundbar **Max, Plus or Mini** over your local network (no cloud).
The Plus is the reference model; the Mini is fully supported, the Max is supported too.

## Setup

1. Find the soundbar's IP address (Smart Control app or your router).
2. Enter it in the integration's **Configuration** screen.
3. Run a device scan: one device with all settings your model supports is created.

## Device features

Power, volume, mute, input, sound profile, night mode, AMBEO mode, voice enhancement,
sound feedback, subwoofer, LED/logo/display brightness, Bluetooth pairing, eco mode,
audio codec and now playing (read-only). Plus/Mini also expose the center volume; the Max
exposes the AMBEO level and the center/side/up-firing levels instead.

Power follows the model: the Max can be woken from standby and put back, the buttons of
the widget are hidden on the other models.

## Widget "Soundbar remote"

Power on/off, volume down/up (step configurable), mute, and one button per selectable input.

## Notes

The soundbar API is not officially documented; paths follow the open-source pyambeo library.
