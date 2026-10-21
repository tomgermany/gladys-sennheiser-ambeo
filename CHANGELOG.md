# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

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
  configuration (too loud above / too quiet below, 0 disables a side).
- Scene actions `read_state` (volume, mute, input, sound profile, codec) and
  `set_volume`.

## [1.0.0]

First release: Sennheiser AMBEO Soundbar Max, Plus and Mini.

[Unreleased]: https://github.com/tomgermany/gladys-sennheiser-ambeo/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/tomgermany/gladys-sennheiser-ambeo/releases/tag/v1.0.0
