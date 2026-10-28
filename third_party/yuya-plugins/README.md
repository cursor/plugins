# Yuya’s Explainer Skills (YES)

Cursor plugin by [Yuya Takeyama](https://yuyat.jp) that gives agents skills for portable HTML explanations, slides, quizzes, narrated videos, and courses.

Source: [yuya-takeyama/agent-plugins](https://github.com/yuya-takeyama/agent-plugins) (`plugins/yes`, version 0.8.0).

| Skill | Output |
| --- | --- |
| design | Learning brief (objectives, misconceptions, sequence, aligned checks) or a rubric review of a draft |
| explain | Scrollable explanation with examples and sources |
| slides | Responsive slide deck with progressive reveals |
| quiz | Multiple-choice comprehension checks with feedback |
| video | Narrated HTML player with synchronized captions |
| zundamon-video | Japanese dialogue with Zundamon and Metan |
| course | Lessons combining video, slides, and quizzes |

The default output is one self-contained HTML file. Builders can optionally separate embedded media into an HTML + assets bundle. Publication is always a separate task.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Yuya’s Explainer Skills**.
3. Click **Install**.

Or run `/add-plugin yes` in chat.

To try it locally, copy this directory to `~/.cursor/plugins/local/yes`, run `Developer: Reload Window`, and confirm the skills `design`, `explain`, `slides`, `quiz`, `video`, `zundamon-video`, and `course` appear in Customize.

## MCP

This plugin bundles no MCP server. It ships skills, helper scripts, and the `bin/yes-speak` speech wrapper only.

## Requirements

- Python 3.11+ and uv for builders; Node 22+ for development tests.
- Docker installed and running for speech synthesis. CPU mode works on Linux
  amd64 and arm64; macOS uses a Linux Docker VM (e.g. Docker Desktop).
- Google Chrome for screenshots, or Playwright Chromium with
  `YES_BROWSER_CHANNEL=''` after installing its browser runtime.
- First-time package/image downloads require network access. Generated single
  HTML files use system fonts and embedded media and work offline; dialogue
  captions embed a subset of M PLUS Rounded 1c (OFL), fetched once per machine.

## Recommended places to share

We recommend **Claude Artifacts** when working in Claude, or **ChatGPT Sites**
when working in ChatGPT/Codex with Sites available. Give the agent the generated
HTML and ask it to prepare a shareable page, preserve the media and credits,
and preview it before sharing. YES creates the files; hosting is a separate step
and may need adaptation for the destination.

- **Claude Artifacts:** ask Claude to publish the single HTML as an artifact,
  then select its audience in **Share**. In Claude Code, artifacts are single
  pages with a **16 MiB rendered-page limit**; adjacent assets and relative file
  links do not work, so use YES's single-file output rather than its bundle.
  Availability and external sharing depend on your account and organization.
  See [Claude Code artifacts](https://code.claude.com/docs/en/artifacts) and
  [sharing options](https://support.claude.com/en/articles/9547008-share-artifacts).
- **ChatGPT Sites:** in Work on ChatGPT web, or Work/Codex in the desktop app,
  ask to build a website from the HTML (or mention `@Sites`). Review the preview,
  then choose the audience and publish. Public access requires **Anyone on the
  internet** to be available and selected. Sites is in public beta; availability
  and publishing permissions depend on the plan, rollout, and workspace settings.
  See [Creating and using ChatGPT Sites](https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites).

Checked against official documentation on **2026-10-07**. Test playback,
interactions, and access as an intended viewer after publishing. Do not assume
a sharing link is anonymous access: Anthropic's general sharing guide and Claude
Code documentation currently differ on sign-in requirements. Hosting these
examples on either service is not part of the repository's automated tests.

## Local speech command

From the installed plugin directory:

```sh
bin/yes-speak 'こんにちはなのだ。' -o narration.wav
bin/yes-speak --list-speakers
bin/yes-speak --list-speakers --json
bin/yes-speak --text '説明するわ。' --speaker 四国めたん/ノーマル -o metan.wav
bin/yes-speak --start
bin/yes-speak --stop
```

The wrapper starts `voicevox/voicevox_engine:cpu-ubuntu24.04-0.25.2` using
`docker run`, bound only to a dynamically assigned localhost port. It reuses the
named `yes-voicevox-0-25-2` container across sentences and restarts it after a stop.
The container is left running for subsequent builds; `--stop` stops only this
managed container. No host directories or Docker socket are mounted into it.
The first download is large. An occupied name belonging to another container is
an error, not permission to remove that container. Existing output files require
`--force` to replace. Docker initialization can take time; `--startup-timeout`
controls the engine readiness wait after Docker starts.

`--stdin` accepts piped text. `--speed` accepts 0.5–2.0. Output is validated
24000 Hz mono 16-bit WAV. Preserve the printed VOICEVOX credit when distributing
audio and follow the selected character's terms. Each WAV is accompanied by
`<filename>.license.txt` containing its credit, terms links, and reuse conditions.
`--force` applies to both files. Keep the companion with the WAV and display the
credit in the listening context; audio-only delivery may need a spoken credit.
The command saves files and
does not automatically launch an audio player.

YES supports only **ずんだもん** and **四国めたん**, including their talk styles.
`--list-speakers` lists only these two voices with their credits and terms URL.
Other voices are rejected by name and style ID. Both supported voices share the
[SSS voice terms](https://zunko.jp/con_ongen_kiyaku.html); character and artwork
rights remain separate. See [voice and artwork conditions](THIRD_PARTY_NOTICES.md).

## Other speech sources

The bundled Docker engine is the default. To synthesize elsewhere (a faster
machine, a hosted engine, an agent's speech tool), set:

| Variable | Meaning |
| --- | --- |
| `YES_TTS_CMD` | A command with the `yes-speak` flags and WAV contract (`EV_TTS_CMD` is an alias). |
| `YES_TTS_FILES=1` | No command. `build.py tts-plan <project>` lists each sentence and the WAV to write; `build` reads them. |
| `YES_TTS_ENGINE` | `voicevox` or `other`: what the command or files produce. A command defaults to `voicevox`; files must say. |
| `YES_TTS_SPEAKERS` | The engine's speaker list as JSON; needed with `YES_TTS_FILES` for VOICEVOX or a dialogue cast. |

With `YES_TTS_ENGINE=voicevox`, YES enforces the same rules as with the bundled
engine: only ずんだもん and 四国めたん, the narrator selected by style ID, and
the voice credits and terms in the page. Use `other` only for engines that are
not VOICEVOX; their credit and terms come from your script. Details:
`skills/video/references/authoring.md`.

## Embedding in a host page

A page that hosts YES output can extend it through an optional global,
`window.YESHost`, defined before the runtimes run:

- `storage` — `list()`, `get(key)`, `set(key, value)` returning promises. A
  course keeps progress there as well as in `localStorage`. Build with
  `course/build.py build <course> --host-script host.js`.
- `resolveLink(ref, hash, {framed})` — resolves a slide's `data-page` link;
  return `{href, target}` or `null` for the default rules. Add the defining
  `<script>` before the deck's runtime block.

YES never requires a host; without `YESHost` the files behave as above.

## Checks for any page

`uv run scripts/check_mobile.py page.html` opens a page at phone
width (light and dark) and lists every element that makes it scroll sideways.
Japanese pages give each term of art one form; see `references/terms-ja.md`.

## Examples

```sh
uv run skills/quiz/build.py build skills/quiz/example/quiz.json
uv run skills/video/build.py build skills/video/example
uv run skills/video/build.py build skills/zundamon-video/example --format bundle
uv run skills/video/build.py shoot skills/video/example
```

Single output: `out/video.html` or `out/quiz.html`. Bundle output:
`out/video-bundle/index.html` with relative `assets/`. Serve bundles using any
static HTTP server. Do not upload just index.html without its assets.
Build intermediates, transcript, and captions remain beside the delivered file.
`--max-bytes 16777216` enforces a 16 MiB HTML limit when a destination needs it.

The video format is an HTML player, not an MP4. Progress storage is best-effort
localStorage with in-memory fallback. No hosting service, API key, or cloud
speech account is required. `zundamon-video` uses both standing characters,
expressions, and lip sync by default; voice-only dialogue is an explicit option.
The first dialogue build downloads the character sources into a local cache.
For character artwork terms see
[third-party notices](THIRD_PARTY_NOTICES.md).

## License

MIT. Voice and artwork used by the video skills keep their own terms; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
