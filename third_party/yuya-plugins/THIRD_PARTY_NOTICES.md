# Third-party notices

YES's MIT license covers its original code and instructions, not external engines,
voices, character assets, or generated speech rights.

## VOICEVOX

- Engine: https://github.com/VOICEVOX/voicevox_engine
- Official image: https://hub.docker.com/r/voicevox/voicevox_engine
- Engine 0.25.2 terms and voice-specific links: https://github.com/VOICEVOX/voicevox_resource/blob/0.25.2/engine/README.md
- Voice model 0.16.4 terms: https://github.com/VOICEVOX/voicevox_vvm/blob/0.16.4/README.md
- General VOICEVOX software terms: https://voicevox.hiroshiba.jp/term/
- Default Zundamon / Metan voice terms: https://zunko.jp/con_ongen_kiyaku.html

The engine image is downloaded from its publisher by Docker; it is not bundled
in this repository. YES supports only **ずんだもん** and **四国めたん**,
including their talk styles. Other engine voices are neither listed nor accepted
by name or style ID. The official image contains additional voices, but YES does
not expose them.

Display `VOICEVOX:ずんだもん` and/or `VOICEVOX:四国めたん` for the voices
actually used. Both voices share the SSS voice-library terms linked above; check
their current conditions for the intended use. Character and artwork rights are
separate from voice rights. The engine source, core, models, and container
dependencies also have separate licenses; the image as a whole is not MIT.

If you authorize someone else to use generated audio, require them to comply with
the voice-library terms and to impose the same obligations when authorizing
further users, as required by engine/model permission clauses 3 and 4. Ordinary
viewing is distinct from licensing the audio for reuse. Generated HTML carries
this notice and terms links in each video's description, including videos within
courses and asset bundles. Standalone WAV output has a `.license.txt` companion;
keep it with the file and provide a credit listeners can find. For audio-only
delivery, see the [VOICEVOX credit FAQ](https://voicevox.hiroshiba.jp/qa/).

## Character art

The bundled character definitions describe layer selections for 坂本アヒル's
ずんだもん and 四国めたん artwork. Source URLs are recorded in
`skills/video/characters/*.json` within the YES plugin. No PSD, individual PNG
layers, or generated HTML containing that art is distributed by this repository.
The repository's `docs/previews/yes-intro.png` and `yes-intro.mp4` are composed
demonstration works containing the characters, with credits and their own media
notice. Their embedded voice and artwork are not licensed under YES's MIT license.

The zundamon-video example uses standing artwork by default. String cast members
enable automatic download into the user's cache. Before using the artwork,
read the artist's current terms at the source download page, including whether
your intended HTML distribution is permitted. An attribution is not a substitute
for permission. If those terms do not cover the intended use, resolve the artwork
choice with the user; do not silently downgrade a requested character video to
voices alone. The repository does not claim a license for those materials.

The pinned [Zundamon V3.2](https://uu.getuploader.com/s_ahiru/download/59) and
[Metan 2.1](https://uu.getuploader.com/s_ahiru/download/35) ZIP readmes allow
video/icon use and modification under the
[official character guidelines](https://zunko.jp/guideline.html), with optional
artist attribution and the （ず・ω・きょ） marker. The readmes were checked on
2026-10-07; check the author's current distribution-page terms as well.
Exported HTML and bundles contain extractable PNG layers. Permission to provide
a finished explanation does not establish permission to sell or redistribute a
general-purpose asset pack. Do not apply YES's MIT license to these assets.

## Dependencies and provenance

Python build dependencies: BudouX, imageio-ffmpeg, Playwright, fontTools, Brotli;
optional art tooling: psd-tools and Pillow. JavaScript development dependencies:
Vitest and happy-dom. They are installed separately and retain their own licenses.

## Caption font

Dialogue videos embed a subset of **M PLUS Rounded 1c ExtraBold**
(Copyright 2016 The M+ Project Authors), licensed under the
[SIL Open Font License 1.1](https://openfontlicense.org/). The build downloads
it from the [Google Fonts repository](https://github.com/google/fonts/tree/7d1c962b6fbc8987b59ed229bbe5c12764d3a624/ofl/mplusrounded1c)
at a pinned commit, verifies its SHA-256, and embeds only the glyphs the
captions use. The font is not stored in this repository. The OFL permits
embedding the subset in documents; the subset keeps the font's name and
license. Other text uses system fonts.
