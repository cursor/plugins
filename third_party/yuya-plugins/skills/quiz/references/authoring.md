All commands and relative resource paths below are relative to the owning skill directory, one level above this reference. `<PLUGIN>` is the directory containing `plugin.json`.

# quiz

One quiz = one `quiz.json`, built by `build.py` into an HTML page or a course unit.

```sh
S='/absolute/path/to/plugin/skills/quiz'
uv run $S/build.py lint  quiz.json
uv run $S/build.py build quiz.json                      # -> out/quiz.html next to it
uv run $S/build.py unit  quiz.json --id ai-quiz --out DIR   # unit bundle (course calls this)
```

```json
{
  "title": "確認テスト: AI とエージェント",
  "questions": [
    {"q": "この要件ならどれを使う？", "choices": ["…", "…", "…", "…"], "answer": 2, "why": "…"}
  ]
}
```

`answer` is the 0-based index of the right choice. `example/quiz.json` is a real one.

## Writing questions

- Test the substance — the thing's nature, use cases, the technical
  background, trade-offs: 「こういう要件ならどれ？」「なぜこの設計だと〜？」
  「この変更で何に気をつける？」. Never test meta: which lesson or category
  covers something, how or when it was announced, dates, counts.
- Answerable from the material it follows or, in a course, earlier lessons;
  nothing the learner was not shown.
- Terms of art in the same form as the material (`<PLUGIN>/references/terms-ja.md`):
  katakana, Japanese, or English + gloss — never a fresh translation in a choice.
- 4 choices, all plausible to someone who half-understood. Draw the wrong
  ones from the learning brief's misconceptions and confusable pairs where
  they fit; the rest come from a plausible half-understanding. Vary the answer
  position (lint warns when every answer sits in the same slot).
- Every question has a `why`: one or two sentences on why the right answer
  is right and what the tempting wrong one misunderstands.
- At least one question per objective, usually 3–4 after a 3–5 minute
  lesson; more only for a standalone drill.

## Page behavior (runtime, do not re-implement)

All questions on one scrolling page; a pick locks the question, marks the
right choice (✓ 正解) and the picked wrong one (✗ あなたの回答) with text,
not color alone, and shows the `why`. When every question is answered the
score appears with ★ for a full score and 解き直す. As a unit it reports
`{score, total, wrong, answers}` to the host (see `video/runtime.js`
for the unit contract); a course stores it and offers the missed questions
again in its review.

Return `out/quiz.html` and describe the validation performed.
