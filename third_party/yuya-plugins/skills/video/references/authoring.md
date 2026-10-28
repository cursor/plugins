All commands and relative resource paths below are relative to the owning skill directory, one level above this reference. `<PLUGIN>` is the directory containing `plugin.json`.

# video

One video = a project dir with two files you write, built into one HTML
file by `build.py`. The page plays like a video (audio drives the clock) but
is HTML: no rendering step, fixes show up on the next build.

```
<project>/script.json   what is said, in chapters → scenes → lines
<project>/scenes.html   what is shown: one <section class="scene"> per scene
<project>/readings.json optional: {"表記": "よみ"} for this video
```

```sh
S='/absolute/path/to/plugin/skills/video'
uv run $S/build.py lint  <project>    # script checks, no audio (seconds)
uv run $S/build.py build <project>    # audio (cached per sentence) → out/video.html
uv run $S/build.py shoot <project>    # out/frames/<scene>.png, then LOOK at them
uv run $S/build.py check <project>    # e2e on out/video.html (maximize); every line must say ok
uv run $S/build.py tts-plan <project> # YES_TTS_FILES only: out/tts-plan.json, the WAVs still to write
uv run $S/build.py unit  <project> --id ai-video --out DIR   # unit bundle (course calls this)
```

A video can also be one unit of a course (lessons + 確認テスト + outline):
that is `course`, which calls `build.py unit` for each video. Write
the video the same way; in a course, prefix every chapter id, scene id and
custom CSS class with the lesson id (`ai-c1`, `ai-1`, `.ai-flow`) because
units share one page.

`example/` is a short single-narrator example;
read its `script.json` and `scenes.html` before a first video, or build it to
try the pipeline.

Needs Docker running, `uv`, and Google Chrome for `shoot`. The bundled speech wrapper is resolved automatically; it does not need to be on PATH. ffmpeg and BudouX come in through uv. Return `out/video.html` as a local artifact. Publishing is separate. Credit `VOICEVOX:ずんだもん` is
shown in the 概要欄 under the player (with the chapter list); keep `"credit"`
in the script.

## Why it is built this way

- **One clock.** Each sentence is synthesized separately, its real length is
  measured, pauses are added, and the result is `out/timeline.json`.
  Captions, scene builds, chapter bar and transcript all derive from it
  (`out/unit.json` holds it). Never estimate timing from character counts.
- **Display text ≠ spoken text.** `text` is what captions and the transcript
  show; `reading` (or the readings dictionaries) is what is spoken. Any ASCII
  word not covered is a lint warning: fix it, do not ignore it.
- **Channels have separate jobs** (Mayer's redundancy principle: diagram +
  voice + the same full text on screen hurts learning):
  - voice: the logic (なぜ・だから). Name things; never 「これ」「ここ」「この図」.
  - scene: the structure — what connects to what, what changes.
  - on-screen text: keywords and labels only. Never the narration sentence.
  - captions: the full narration, on a layer the viewer can switch off (C).
  Two tests every video must pass: audio alone carries the argument; muted
  scenes plus labels carry the structure.
- **Recall beats fluency.** Clear videos make people feel they understood.
  End chapters with a `quiz` — the question is narrated, a think pause runs
  with a visible bar, then the answer is narrated. It works for listeners
  who never look at the screen.

## script.json

```json
{
  "title": "…", "subtitle": "…", "credit": "VOICEVOX:ずんだもん", "speed": 1.0,
  "chapters": [{
    "id": "clock", "title": "時計はひとつ",
    "scenes": [{"id": "clock-1", "lines": [
      "1文ずつ音声を作ります。",
      {"text": "画面に k8s と書いても", "reading": "がめんにクバネティスとかいても", "pause": 0.8}
    ]}],
    "quiz": {"q": "字幕のタイミングは何で決まる？", "a": "実測した音声の長さの時間表です。", "think": 4}
  }]
}
```

- A line is a string or `{text, reading?, pause?, aside?}`. Default pauses:
  0.35 s between lines, 0.9 s after a scene, 1.4 s after a chapter.
  `"aside": true` marks a line meant to amuse.
- Every scene has a `"role"`: `hook`, `example`, `mechanism`, `transition`
  or `close`. Lint warns on a scene without one and on an aside in an
  `example` or `mechanism` scene or within three lines of a quiz.
- Scene ids match `data-scene` in scenes.html. Quiz scenes
  (`<chapter>-quiz`) are generated; do not write sections for them.
- Teach the substance: what the thing is and why it works that way, the
  problem it solves, use cases, trade-offs, when to pick it over the
  alternative. Never spend narration on meta — which lesson or category
  covers what, how or when something was announced (event names, changelog
  vs blog, release order), item counts. Beta/GA only in a few words where it
  decides production use.
- Writing rules (lint enforces the mechanical ones):
  - です・ます, conversational. 25–40 chars per line, never over 60.
  - Numbers in digits (`16回`, `3分から6分`) read fine; letters need readings.
  - Every 、 is a pause in speech, so a sentence with many reads haltingly.
    Join a list with と (`有料の基盤と外部の DB`), drop the 、 after a
    short subject (`Void は Vite の…`), and keep it where a listener needs
    a breath. Lint warns at three. Spaces are not pauses: the build drops
    every space next to Japanese, so `有料の Workers` and the reading
    `ワーカーズ フォー プラットフォームズ` both run on.
  - Roughly 300 chars ≈ 1 minute. A chapter is 3–6 minutes and one claim.
  - Chapter shape follows the learning brief's sequence for the chapter's
    objective (worked example first, prediction first, refutation, or
    contrast). When the brief leaves the choice open, use: hook (question / surprise /
    common misconception) → concrete example → mechanism, built up step by
    step → name it → pitfall → quiz. The quiz is the chapter's last word;
    a summary before it turns recall into an echo (lint warns when the
    answer repeats the lines just before the question).
  - The quiz asks the viewer to apply the chapter to a new case, not to
    repeat a line. Its narrated answer gives the reason and, in a few words,
    what the tempting wrong answer misses.
  - A chapter whose brief sequence is refutation opens on that misconception,
    says plainly that it is wrong, and resolves it before the quiz.
  - `"goals"` are the brief's objectives as observable acts
    (〜を説明できる / 〜を選べる), not topics.
  - `"assumes"` lists what the viewer must already know, from the brief's
    Learner (`["SQL の SELECT を書いたことがある"]`). It appears under 前提
    in the description; lint warns when it is missing.
  - Give every term of art one form, chosen by how Japanese engineers
    write it (method and seed glossary: `<PLUGIN>/references/terms-ja.md`),
    and use it in captions, board, quiz and goals alike:
    - established katakana (フォールバック, コントロールプレーン, ドレイン):
      katakana alone. An added English word or gloss only gets in the way.
    - established Japanese (静的安定性, グレー障害, 複合アラーム): Japanese alone.
    - a named concept whose only Japanese reads like an ordinary word or
      has no settled form (constant work = 一定の作業, blast radius = 影響範囲,
      bake time): the English, spoken in katakana, with a short gloss of
      what it is on first mention (`constant work（負荷に関係なく常に同じ量の
      仕事をする設計）`). A bare translation hides that it is a concept.
      The `reading` speaks the English in katakana; the caption shows it.

### Dialogue (cast)

A script with `"cast"` becomes a dialogue video (authoring guide:
`zundamon-video`). Without it nothing below applies.

```json
{
  "cast": ["metan", "zundamon"],
  "description": "概要欄に出す 2〜4 行の説明",
  "chapters": [{"id": "c1", "title": "…", "scenes": [{"id": "c1-1", "lines": [
    {"who": "zundamon", "text": "語れないなら黙るしかないのだ？", "face": "troubled"},
    {"who": "metan", "text": "そう読むと誤解するわ。", "face": "smile", "style": "ツンツン"}
  ]}], "quiz": {"q": "…", "a": "…", "q_who": "zundamon", "a_who": "metan"}}]
}
```

- A string member has art in `characters/<id>.json`; an inline
  `{"id", "speaker", "name"?, "color"?}` member speaks with captions but
  draws nothing. `speaker` must be ずんだもん or 四国めたん. Other voices
  are rejected before synthesis, including through a custom adapter.
- `who` defaults to the previous line's speaker, then the first member;
  `style` defaults to `ノーマル`; `face` sticks per character until that
  character sets it again (first default `normal`). Quiz `q_who` / `a_who`
  default to the first member.
- Style names resolve to ids through `yes-speak --list-speakers --json`
  (once per build); lines are synthesized with `--speaker <id>`. `lint`
  errors on an unknown `who`, `face` or `style`, and warns when a caption
  runs over two lines.
- The page credits every voiced character and the art source itself
  (`data.credits`); the script's `"credit"` is ignored.
- `YES_TTS_CMD` / `EV_TTS_CMD` replaces `yes-speak` (e.g. a fake for tests).
  `uv run test_build.py` runs the build's unit tests.
- Dialogue captions embed their font: M PLUS Rounded 1c ExtraBold (OFL),
  fetched once into `~/.cache/yes/fonts/` (`YES_FONT_CACHE`), checked by
  SHA-256, and cut down to the characters the captions use (tens of KB). The
  thick caption outline needs a rounded face; an angular fallback spikes at
  its corners. If the download fails the build warns and uses system fonts.

## Speech sources

| Source | Set | VOICEVOX rules |
|---|---|---|
| bundled Docker engine | nothing | always |
| a command | `YES_TTS_CMD` (alias `EV_TTS_CMD`), optional `YES_TTS_ENGINE` | unless `YES_TTS_ENGINE=other` |
| files written by the agent | `YES_TTS_FILES=1`, `YES_TTS_ENGINE`, `YES_TTS_SPEAKERS` | when `YES_TTS_ENGINE=voicevox` |

- A command takes `--text T -o FILE --force --speed S [--speaker STYLE_ID]`
  and writes a 24000 Hz mono 16-bit WAV; `--list-speakers --json` prints
  `[{name, styles: [{name, id, type}], credit?}]`.
- VOICEVOX rules: only ずんだもん and 四国めたん (any talk style); a single
  narrator is ずんだもん by its style id, never the engine's default; the
  page credits each voice and links the engine, model and voice terms (the
  bundled engine's pinned versions, otherwise the current terms).
- Files: run `tts-plan`; it writes `out/tts-plan.json`
  `{engine, format, items: [{file, text, speaker, style, style_id, speed}]}`
  for every sentence without audio. Synthesize each `text` with that voice
  and speed and write the WAV to `file`, then `build`. `build` never
  synthesizes in this mode and stops while any file is missing.
  `YES_TTS_SPEAKERS` is the engine's speaker list in the format above (for
  VOICEVOX or a cast), so every line carries a style id.
- The cache key includes the source, so audio from one source never stands
  in for another.

## scenes.html

The stage is 1280×720. A scene's content box is **1152×536** (top bar and
the bottom caption band are reserved — never draw there). Start with an
optional `<style>` for video-specific CSS, then the sections:

```html
<section class="scene" data-scene="clock-1">
  <h2 class="ev-h">1 文 = 1 つの音声ファイル</h2>
  <div class="ev-card" data-at="1" data-focus="1,2">appears with line 1, ringed on lines 1–2</div>
  <div data-at="0" data-out="3">visible for lines 0–2, gone from line 3</div>
</section>
```

- `data-at="n"`: hidden until the scene's line n (0-based) starts. This is
  how a picture builds in step with the sentence that explains it (temporal
  contiguity). Elements without `data-at` show for the whole scene.
- `data-out="n"`: hidden again from line n (for before → after swaps).
  Without `data-at` it is visible from line 0.
  Hidden elements keep their space; wrap the before and after in
  `<div class="ev-stack">` so they occupy the same cell.
- `data-focus="n,m"`: accent ring on those lines; other `data-focus`
  siblings dim. Use it to point instead of saying 「ここ」.
- Each section gets `data-line` (current line index) and CSS vars `--p`
  (scene progress 0–1), `--lp` (current line progress), `--gp` (progress
  through the pause after the line). Drive continuous motion from these,
  e.g. a playhead `left: calc(var(--p) * 100%)`.
- For anything CSS can't express: `<script>EV.on('clock-1', (el, c) => {…})</script>`
  where `c = {t, line, lp, gp, p}`. Must be a pure function of `c` — the
  page seeks, so no timers, no `Date.now()`, no randomness.
- Kit classes: `ev-kicker ev-title ev-h ev-sub ev-label`, `ev-row ev-col
  ev-grid-2/3/4 ev-center`, `ev-card` (+ `accent good warn bad`), `ev-pill`,
  `ev-big`, `ev-code`, `ev-mark`, `ev-arrow`, text colors `ev-good ev-bad
  ev-warn ev-accent ev-muted`. Color tokens `--accent --good --warn --bad
  --muted --line --card` (+ `-soft`) switch with dark mode.
- Visual rules: one idea per scene; show the mechanism, not a box with its
  name; labels sit next to what they label; keep a concept's shape, color
  and position stable across scenes; one accent color with a meaning; no
  decoration or background music. Body text ≥ 22 px, labels ≥ 19 px.


## Verify before publishing

1. `lint` clean (or each warning consciously accepted).
2. `build`; read its warnings (chars/sec on screen, missing readings).
3. `shoot` (default `--at end` = every build of the scene visible, the
   most crowded state; `--at start` too for scenes with `data-out`). Read
   every PNG: overflow past the content box, overlap with the caption band,
   tofu (□), clipped text, a build that never appears. Fix and repeat.
4. Save lines with readings or numbers using `yes-speak 'text' -o line.wav`,
   then listen to the WAV in an audio player. Wrong reading → add to
   readings.json → rebuild (only that line is re-synthesized).
5. Read the transcript (`out/transcript.md`) alone: does the argument stand
   without the screen?
6. `check` (player e2e); it leaves `out/frames/_full-*.png`, the maximized
   player on desktop, phone upright and sideways, and without the API.
7. `uv run <PLUGIN>/scripts/check_mobile.py out/video.html`: nothing may make
   the page scroll sideways on a phone.

Outputs besides the page: `out/captions.vtt`, `out/unit.json` (timeline),
`out/transcript.md`, `out/unit/narration.m4a` — reusable for an mp4 later.
Single videos default to 48 kbps audio (`"bitrate"` in script.json).

## Page behavior (runtime, do not re-implement)

Start screen with the goals (`"goals"` in script.json; no autoplay); the
end screen features the host's primary action, with optional `title`, `note`,
and `auto` (seconds until it runs). A key or pointer interaction cancels the
countdown; the viewer can also choose 「とどまる」. Replay and other actions
remain available. Portrait phones show this screen outside the scaled stage
so its buttons remain readable. Space play/pause, ←/→ previous
/next sentence, Shift+←/→ chapter, J/L ±5 s, C captions, T transcript,
`<`/`>` speed 0.75–2×, F maximize, ? key help (also a button, hidden on narrow
players; Esc or a click outside closes it). Click a transcript sentence to jump.
Maximize (the corner button at the end of the controls, or F; Esc or the
button again leaves) puts the stage, captions and controls in fullscreen
through the Fullscreen API, the stage at its largest 16:9 on the page
background; the description is left out and the controls fade while playing
until the pointer moves. Outside a portrait phone the controls float over the
stage's bottom edge, so the picture uses the whole screen, and the caption
rises above them while they show. Without element fullscreen (iPhone Safari) or when
the browser refuses, the player fills the page instead (`position: fixed`, in
front of a course's outline and version switch). A host action from the end
screen (next video, quiz) leaves it before moving on; the shot mode never
offers it. Deep links:
`#t=12.3`, `#<chapter-id>` (inside a course: `#<unit-id>/t=12.3`).
Pausing writes the position into the hash so a reload resumes there. On
portrait phones captions move below the stage at readable size.

## Character art (立ち絵)

`characters/<id>.json` (`zundamon`, `metan`) defines each character's PSD
source, scale, base layers and faces: `normal smile surprised troubled jito
panic think angry cry`, each with a `[closed, half, open]` mouth and a blink
eye layer. `facing` (`left` / `right`) is the way the art looks as drawn,
seen by the viewer; the player mirrors a character whose `facing` points away
from the stage centre, so the two face each other. The `zundamon-video` skill uses both standing characters by default. Inline cast members are for requested voice-only dialogue or additional off-screen voices. Read ../../../THIRD_PARTY_NOTICES.md before using art. The PSDs and exported parts stay out of git; they are fetched into
`~/.cache/yes/characters/<id>/` (`EV_CHAR_CACHE`).

```bash
uv run characters.py fetch metan            # download + MD5 check + export; no-op once cached
uv run characters.py sheet metan -o s.png   # every face x mouth + blink, to look at
```

After editing a face, run `sheet` and look at it before building.
