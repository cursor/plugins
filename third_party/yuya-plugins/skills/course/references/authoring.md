All commands and relative resource paths below are relative to the owning skill directory, one level above this reference. `<PLUGIN>` is the directory containing `plugin.json`.

# course

A course is a dir with `course.json` that lists lessons; each lesson is a
sequence of **units**, and each unit is built by the skill that owns its
kind. This skill owns the shell (outline, home, progress, review) and the
orchestration; it never renders a video or a question itself.

| kind    | skill                   | source            |
|---------|-------------------------|-------------------|
| `video` | `video` | a video project dir (`script.json` + `scenes.html`) |
| `quiz`  | `quiz`            | a `quiz.json`     |
| `slides`| `slides`          | a deck `.html` made from its template |

```json
{
  "title": "Cloudflare 2026年9月のアップデート講座",
  "subtitle": "…", "credit": "VOICEVOX:ずんだもん", "bitrate": "32k",
  "lessons": [
    {"id": "ai", "title": "AI とエージェント", "summary": "…", "goals": ["…を説明できる"],
     "units": [{"kind": "video", "src": "lessons/ai"}, {"kind": "quiz", "src": "lessons/ai/quiz.json"}]}
  ]
}
```

```sh
S='/absolute/path/to/plugin/skills/course'
uv run $S/build.py build <course>   # builds every unit via its skill (TTS cached) -> out/course.html
uv run $S/build.py shoot <course>   # out/frames: home + every unit, desktop and mobile; LOOK at them
uv run $S/build.py check <course>   # e2e in headless Chrome; every line must say ok (also out/frames/_full-*-course.png)
uv run $S/build.py build <course> --host-script host.js   # inline a window.YESHost definition (below)
```

Unit ids default to `<lesson>-<kind>` (`ai-video`, `ai-quiz`). The lesson's
`title` and `goals` replace the video's own on its start screen.

### Versions of a video (`variants`)

A video unit can come in two or more versions of the same content — say a
single narrator and a ずんだもん × 四国めたん dialogue — and the learner
picks one with a switch above the player. Give `variants` instead of `src`:

```json
{"kind": "video", "variants": [
  {"key": "narrator", "label": "ナレーション", "src": "lessons/knob/narrator"},
  {"key": "zundamon", "label": "ずんだもん", "src": "lessons/knob/zundamon"}]}
```

- Each version is a normal video project, built as its own unit
  `<unit>~<key>` (`knob-video~narrator`). Use the same keys and labels in
  every lesson: the choice is one course-wide preference.
- Write the versions with the **same shape**: the same chapters, the same
  number of scenes per chapter and of lines per scene (quizzes included).
  Switching maps the position by (chapter, scene, line) index and continues
  from the head of that line; where the other version has no such line it
  lands on the chapter's start. `build` warns when the shapes differ.
- Scene ids, chapter ids and custom classes still must not collide: give
  each version its own prefix (`knob-1` / `knobn-1`).
- To the learner it is one unit: one card badge, one 続きから, one
  progress. Watched time counts toward the unit whichever version plays, so
  85 % in either version (or across a switch) completes it. The outline
  lists the chapters of the version in use; the duration shown is that
  version's.
- The choice is saved under the key `variant` (`{key}`) and opens every
  other lesson in that version. Opening a version (switch, link, 続きから)
  makes it the choice. A lesson without that key opens in its first version.
- Hash: `#<unit>~<key>[/<rest>]`. The version is in the hash because a
  `t=` belongs to one version's timeline; `#<unit>` alone opens the
  preferred version. `resume` records `{unit, rest, variant}`, and 続きから
  reopens that version at that time.
- Size: every version's audio is on the page. Count the minutes of all
  versions: at `"bitrate": "24k"` audio costs ~0.24 MB per minute
  (7 lessons × 2 versions × 4 min ≈ 13.5 MB), so a two-version course of
  that length needs 24k under a 16 MiB host limit. Identical images (立ち絵
  layers that every dialogue version embeds) are stored once per page;
  `build` prints how many.
- `check` adds the version e2e checks (switch keeps the line and playback,
  the choice follows into another lesson and survives a reload, finishing
  one version completes the lesson); `shoot` shoots every version, also
  mid-video (`<unit>~<key>-mid-*.png`).

### Host storage (`window.YESHost`)

A page host that has more than the browser offers (a server-side store, a
viewer that blocks `localStorage`) can define this before the shell runs, via
`--host-script FILE` (inlined right after the charset, before every runtime):

```js
window.YESHost = {
  storage: {
    list() { /* → Promise<[{key, value}]> */ },
    get(key) { /* → Promise<value | undefined> */ },
    set(key, value) { /* → Promise; value is JSON */ },
  },
};
```

The shell reads `localStorage` first, then merges `storage.list()` and
redraws; every save goes to both. Keys are `u:<unit>`, `resume` and
`variant` (characters `[A-Za-z0-9_.:~-]`); values are small JSON objects.
Speed and caption preferences stay in the browser. A failing store is
ignored. Without `YESHost` nothing changes.

## Orchestration

1. **Write the learning brief and split the topic.** Write `learning-brief.md`
   with the `design` skill, then, from it and the sources, choose 4–8 lessons of 3–5 minutes,
   each owning a distinct part of the topic. Write the lesson list with one
   line of scope each, and decide which lesson owns any item two sources both
   mention. No "overview" lesson that previews the others — the home view
   already shows the course; an intro lesson only if it teaches something
   none of the others do. Then assign each objective, with its
   misconceptions, sequence and checks, to the lesson that owns it, and
   record the assignment in `learning-brief.md`.
2. **Brief writers.** Copy `lesson-brief.md` and fill its slots: the
   learner, the sources, the course dir, each lesson's scope and the other
   lessons' scopes, each lesson's part of the learning brief, and a **term table** — each term of art with its one
   form (katakana, Japanese, or English + gloss; method in
   `<PLUGIN>/references/terms-ja.md`), checked against the vendor's Japanese
   docs and common usage, so several writers don't pick several renderings.
   When the host can run subagents, dispatch one writer per lesson in
   parallel with the filled brief; otherwise write the lessons one by one
   from it. Writers build and shoot their own video before reporting. When
   several builds share one speech endpoint, set `EV_TTS_WORKERS=1` in each.
3. **Review the drafts as the editor** — this is where quality comes from:
   - overlap: list every item and the lessons that teach it (read each
     `script.json`); keep each in one lesson and send the others back.
   - meta: grep narration, scenes and questions for course structure,
     announcement framing and dates (`発表|Birthday|changelog|9月の|どのレッスン`).
     Send back anything found.
   - tests: each question asks about substance (要件→選択, なぜ, 気をつける点).
   - learning design: grade each lesson against the `design` rubric
     (alignment, thinking points, distractors, feedback, spacing).
   - unit choice: narrated video for a mechanism or a story that unfolds;
     slides for reference material the learner steps through at their own
     pace (tables, comparisons, code); quiz after each lesson.
   Iterate with the writers (or revise the lessons yourself) until clean.
4. **Write course.json** from the writers' summaries and the brief's
   objectives as goals, and build.
5. **Verify**: `shoot` (home, each unit, desktop + mobile) and read the
   frames; `check` must pass; skim `out/transcript.md` for overlap once more.
6. **Deliver** `out/course.html`, or its bundle, with verification results.

## Page behavior (runtime, do not re-implement)

- Home: progress, 続きから (last paused unit and position), lesson cards with
  each unit's status, 間違えた問題を復習 when any question is still missed.
- Outline: lessons with their duration; the current lesson expands into its
  video chapters and its test with the score badge. On narrow screens it is
  a drawer behind ☰ 目次.
- Nothing is locked. A video unit is done once 85 % of it was actually
  played (seeking does not count); a slides unit once its last step was
  reached; a quiz unit once it was taken; a lesson once all its units are done.
- A video followed by its lesson's quiz ends on 「次は確認テスト」 with
  the question count and a large button. An untaken quiz opens after 10 seconds;
  「とどまる」, a key, or a pointer interaction cancels that countdown.
  A taken quiz shows its previous score and never opens automatically.
  Completed videos lead 続きから to the untaken quiz, and the home and outline
  mark it 「▶ 次は確認テスト」. A quiz's end leads to the next lesson
  or back to the video.
- Review: one quiz over every missed question, labelled with its lesson;
  answering one right removes it from the missed list (the lesson's score
  stays as first taken).
- State is saved to localStorage where available and otherwise kept in memory,
  plus the host's store when `window.YESHost.storage` exists. Sandboxed viewers
  may disable persistence; the course still works.
- Deep links: `#home`, `#review`, `#<lesson>` (its first unfinished unit),
  `#<unit>[~<version>][/<rest>]` where rest is the unit's own (`t=12.3`, a
  chapter id).
- Images: every `data:` URI that several units embed is written once into a
  shared table (`blobs`); the shell restores it before a unit gets its data.

## Adding a unit kind

A kind is a skill whose `build.py unit <src> --id ID --out DIR` writes
`unit.json` (`id, kind, title, duration?, outline: [{rest, title}], data`),
`unit.html` (`<div class="su-unit" data-unit=ID data-kind=KIND hidden>…</div>`),
`runtime.js` (registers `YESUnits.kinds.KIND`, contract in
`video/runtime.js`) and `runtime.css`. Then add it to
`KINDS` in `build.py`. Only video units take `variants`; the contract's
optional `locate()` / `play()` are what switching versions uses.
