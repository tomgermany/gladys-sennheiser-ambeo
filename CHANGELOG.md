# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

## [1.1.0] - 2026-10-22

### Added

- The soundbar as one Gladys device: power, volume, mute, input, sound profile,
  night mode, AMBEO mode and level, voice enhancement, sound feedback,
  subwoofer, center/side/up-firing levels, center volume, LED, logo and display
  brightness, Bluetooth pairing, eco mode, audio codec and now playing. The
  features follow the model: a Mini gets what it answers, the Max gets the
  AMBEO level and the firing levels.
- Dashboard widget "Soundbar remote": power, volume down/up, mute and one
  button per selectable input.
- Scene action `play_sound`: play an MP3 or WAV, from a http(s) URL that the
  soundbar fetches itself, or from a file of the integration's "sounds" folder,
  served by the integration on its own port.
- A sample three second alarm tone (`assets/sounds/tone.wav`), installed in the
  "sounds" folder on first start.
- Scene trigger `volume_threshold_crossed`, with the limits set in the
  configuration (too loud above / too quiet below, 0 disables a side). Fires on
  the crossing only, with a hysteresis band so a volume near the limit does not
  flap.
- Scene actions `read_state` (volume, mute, input, sound profile, codec) and
  `set_volume`.
- Configuration button **"Test the connection"**: reads the soundbar now and
  answers in words (model, firmware, number of inputs, volume). Use it when a
  device scan ends without a device.
- A legal notice in the README and both user-documentation pages: independent
  unofficial project, no affiliation with Sennheiser electronic SE & Co. KG,
  the Sennheiser and AMBEO marks acknowledged.

### Changed

- Answers from the soundbar are read as text first: an empty or non-JSON answer
  now names its path and the beginning of the raw answer instead of failing as a
  bare "Invalid JSON".
- The optional groups (sources, presets, numeric ranges, custom input names) no
  longer take the whole connection down: what a model does not answer is logged
  and skipped, so a partial soundbar still appears in Gladys.
- The default sound of the scenes is a text field holding the file name, because
  Gladys refuses `sort_order` on `config_schema` options.
- Formatting and indentation are not checked any more: Prettier is deliberately
  not used in this project.
- The device is addressed by serial number when the soundbar reports one, so a
  changed IP address does not create a second device.

### Removed

- The Transitous integration this repository started from.

## [1.0.0]

First release: Sennheiser AMBEO Soundbar Max, Plus and Mini.

[Unreleased]: https://github.com/tomgermany/gladys-sennheiser-ambeo/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/tomgermany/gladys-sennheiser-ambeo/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/tomgermany/gladys-sennheiser-ambeo/releases/tag/v1.0.0
