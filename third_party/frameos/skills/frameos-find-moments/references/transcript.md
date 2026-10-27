# Reading FrameOS transcripts

How `get_transcript` behaves, how to page it, how to quote from it, and how to turn what you find into a focus prompt for a new run.

## Parameters of `get_transcript`

| Parameter | Type | Default | Rules |
|---|---|---|---|
| `project_id` | string | required | The project (source video) id from `list_projects`. A malformed id is rejected with 422 |
| `start_ms` | integer | 0 | MILLISECONDS from the start of the source. 0 or more |
| `end_ms` | integer or null | null | MILLISECONDS. Must be greater than `start_ms`, otherwise 422 "end_ms must be greater than start_ms" |
| `offset` | integer | 0 | Position in the list of matching segments |
| `limit` | integer | 100 | 1 to 500. Use 500 when reading a whole transcript |
| `include_words` | boolean | false | Adds per-word timings to each segment. Leave off unless you need word-level timing |

## Response

```
{ "project_id": "...", "segments": [ ... ], "total": 412, "next_offset": 100 }
```

- `total` is how many segments match the time window, not the size of this page.
- `next_offset` is the `offset` for the next page, or null on the last page.

Each segment:

```
{ "start": 754.62, "end": 761.1, "text": "So the real reason we changed pricing...", "language": "...",
  "words": [ { "text": "So", "start": 754.62, "end": 754.8 }, ... ] }
```

- `start` and `end` are SECONDS from the start of the source video, even though you ask with milliseconds. The same holds for each word's `start` and `end`.
- `words` appears only with `include_words: true`, and can be missing even then (see Translation).
- A segment may carry a speaker label; do not count on it. Never invent speaker names. Name a speaker only when a label exists or the text itself makes it clear.

## Which segments a window returns

A segment is included when it ends at or after `start_ms` and, if `end_ms` is set, starts before `end_ms`. Segments that straddle the window edges come back whole.

## Units and conversion

- Timestamp to milliseconds: (hours x 3600 + minutes x 60 + seconds) x 1000. 12:30 is 750000. 1:02:05 is 3725000.
- Seconds to a display timestamp: drop the fraction; use m:ss under an hour (754.62 is 12:34) and h:mm:ss from an hour (3725.4 is 1:02:05).
- Clips use the same source timeline. A clip's `startTime` and `endTime` (from `list_clips` or `describe_clip`) are seconds in the source, and `startTimeMs` and `endTimeMs` are the same in milliseconds - pass those straight to `start_ms` and `end_ms` to read exactly what a clip covers.
- For "the last 10 minutes", take the source length from `durationSec` in `list_projects`, or from the `end` of the last segment.

## Paging recipe

1. First call: `offset` 0, `limit` 500, `include_words` false, plus `start_ms`/`end_ms` if the user named a time range.
2. Keep the segments. If `next_offset` is null you are done; otherwise call again with `offset` set to `next_offset` and the same window.
3. Stop after 10 pages. Tell the user how far you got (the timestamp of the last segment read) and offer to continue or narrow the range.
4. For a precise quote start, re-read a narrow window (about a minute) with `include_words: true`.

## Translation

- Speech that is not in English is transcribed and then translated to English by default. The segments then hold the English translation, not the original words.
- Translated segments have no word timings, so `words` is missing even with `include_words: true`.
- If the user says the video is not in English, or word timings are missing, treat the text as a possible translation: label quotes "(translated)" and do not present them as the speaker's exact words.
- Search with English words in that case - the transcript (and FrameOS's own matching on a re-run) uses the English text.

## Per-clip transcripts (the fallback)

- `list_clips` and `describe_clip` return `transcript`: the plain text of one clip, with no timestamps (up to about 24,000 characters).
- Use them when the source transcript is unavailable (older projects). You can then search only what the clips contain, not the whole video. Give each hit the clip's source range (`startTime` to `endTime`) and say the timestamp is the clip's, not the exact line's.

## Quoting format

> "So the real reason we changed pricing was churn, not revenue." - 12:34

- Quote the words exactly as transcribed. Use the start time of the first quoted segment; for longer passages give a range (12:34-13:10).
- Join adjacent segments with a space. Mark any skipped words with "...". Never splice distant passages together without "...".
- Keep quotes to 1-3 sentences unless the user asks for more.
- Recognition errors happen. If a word is clearly wrong, mark it "(unclear)" instead of silently correcting it.
- Moment lists, one per line: timestamp range, a short title, one line on what happens, an optional short quote, and whether an existing clip already covers it.

Example:
1. 12:34-13:20 - Why they changed pricing - the founder explains churn drove the switch. "...churn, not revenue." Not clipped yet.
2. 31:05-32:00 - The first customer story - already Clip 3.

## Overlap with existing clips

- A moment from A to B seconds overlaps a clip when the clip's `startTime` is before B and its `endTime` is after A.
- Call the moment "already clipped" when one clip covers most of it (over half its length); "partly clipped" when the overlap is smaller.

## From findings to a focus prompt

How FrameOS uses `focus_prompt` on a new run:
- Matching is on WORDS, not meaning. Each candidate stretch's transcript is compared with the words in the prompt. Common filler words are ignored (for example: the, about, part, clip, video, talk, mention, want).
- Only light suffix trimming is applied, so different forms of a word may not match. Copy words in the exact form the speaker uses.
- A stretch's match is the share of the prompt's words that appear in it. Every word that is not spoken in the target passage dilutes the match, so a few exact words beat a long list of synonyms.
- It is a preference, not a filter: matching stretches are pushed up the ranking, the AI judge also reads the prompt as a viewer preference, and a prompt that matches nothing leaves the usual best clips. No specific moment is guaranteed to become a clip.
- Only the first 400 characters are used.

Recipe:
1. Read the passage you want clipped.
2. Pick 2-6 distinctive words the speaker actually says in it, in the spoken form: names, products, numbers, unusual nouns.
3. Check each word appears in that passage's segments. Drop any that do not.
4. Leave out generic words (good, really, thing, people) and request words (funny, viral, best, moment, "find the part where").
5. One topic per run works best. With two topics, a stretch about only one of them matches only half the words.
6. Write the words separated by commas.

Example: the passage at 18:02-19:15 says "we stopped cold emailing and switched to LinkedIn voice notes, and replies tripled". A good focus prompt is "cold emailing, LinkedIn, voice notes, replies". A weak one is "the funny part where he talks about outreach growth hacks" - most of its words are never spoken there.
