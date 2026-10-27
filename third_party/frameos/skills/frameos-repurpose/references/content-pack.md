# Content pack: plan, checklist, delivery, platforms, delegation

Templates and tables for the frameos-repurpose skill. Fill the angle-bracket fields; drop lines that do not apply. Keep tool names and IDs out of everything the user sees.

## 1. Plan template (show this, then wait for a clear yes)

```
Content pack plan - <episode title or link>

Source:       <link, file name, or "your existing project <title>">, about <M> min
Render:       up to <N> clips in <shape> (FrameOS may return fewer)<, focused on "<words>">
Keep:         the best <K> clips by score
Captions:     <style display name> - <its look from the catalogue: bold, clean, boxed or fun>
Thumbnails:   <T> (<per-clip count> for <which clips>, <shape>) | none
Post copy:    drafts for <platforms>, tone "<tone>"
Collection:   "<episode title> - content pack" in your FrameOS workspace
Posting:      not included | at the end, I will ask you to confirm each post one by one

Estimated credits: <M> (render) + <T> x 10 (thumbnails) = <total>
Your balance:      <balance> credits
Exports, caption styles, copy drafts and the collection are free.

Reply "go" to start, or tell me what to change.
```

Credit estimate rules:
- Render: source minutes rounded up, x 1 per render pass (one pass per shape). An existing project reused as the source costs 0 for the render.
- Thumbnails: number of thumbnails x 10.
- Always say "estimated". Renders are charged only when clips are delivered, so a failed render costs nothing. A new render of a video FrameOS already finished is a new project and is charged in full again; minutes paid on the earlier project do not carry over.
- Unknown source length: write the rate with an example ("about 1 credit per minute: a 60-minute episode is about 60 credits") and ask for the rough length.
- Never add prices, plans or offers. For more credits link https://frameos.studio/pricing.

## 2. Running checklist (show after every step)

```
Content pack: <episode title>   collection "<name>"
[x] 1. Plan approved - estimate <total> credits
[~] 2. Render - <progress>% (<about N min left>)
[ ] 3. Pick the best <K> clips
[ ] 4. Collection
[ ] 5. Caption style: <style>
[ ] 6. Captioned MP4s <done>/<K>
[ ] 7. Thumbnails <done>/<T>
[ ] 8. Copy drafts <done>/<K x platforms> (<platforms>)
[ ] 9. Delivered
[ ] 10. Posting (optional - each post confirmed separately)
```

Marks: `[x]` done, `[~]` in progress, `[ ]` not started, `[-]` skipped (say why on the line).

### Resume table - how to tell a step's state from FrameOS

| Step | How to check | If not done |
|---|---|---|
| 2 Render | `list_projects`: find the project by title, link or date; read its status | processing: keep waiting (frameos-clip); failed: explain and offer a re-run |
| 3-4 Picks and collection | `list_collections` has the pack's name; `list_clips_in_collection` lists the picks | pick again from `list_clips`, then create or reuse the collection |
| 5 Caption style | each picked clip's `captionStyle` and `captionAppearance` match the plan | set it again (frameos-captions). If unsure, set it again anyway: it is free and instant |
| 6 Exports | `export_clip(clip_id)` once per picked clip: ready means done; it does not render again if that style's file exists | rendering: wait on its job. A call while that export is still rendering returns the same job, never a second render |
| 7 Thumbnails | `list_thumbnails`, newest first, created after the pack started | ask before making new ones - they cost credits |
| 8 Copy drafts | not stored in FrameOS | regenerate if the user wants them (free; counts toward the 30-per-hour limit) |
| 10 Posts | not listed by these tools | ask the user what was already posted; never post again without a fresh confirmation |

## 3. Final deliverable

```
Your content pack - <episode title>

| # | Clip | Length | Score | From the episode | Captioned MP4 | Thumbnail |
|---|------|--------|-------|------------------|---------------|-----------|
| 1 | <title> | 0:58 | 8.7/10 | 12:04-13:02 | download | image |
| 2 | <title> | 1:12 | 8.1/10 | 31:40-32:52 | download | - |

Post copy
1. <title>
   - YouTube Shorts: title "<title>" / description <text> / <hashtags>
   - Instagram: <full caption> <hashtags>
   - TikTok (post it yourself): <caption> <hashtags>
2. ...

All clips are in your collection "<name>".
Credits used: <actual, from the usage history> - balance now <balance>.
Download and image links expire in about an hour - ask me to refresh them.
Next: I can post any of these (I will confirm each one), refresh links, or try another caption style.
```

Rules: length = end minus start, as m:ss; score = 0-1 value x 10 with one decimal; "From the episode" = the clip's start and end in the source video; link the captioned export, not the caption-free preview. Mark missing items plainly ("still rendering", "skipped - not enough credits").

## 4. Platform recommendations

| Platform | Shape | Posting through FrameOS | Copy notes |
|---|---|---|---|
| TikTok | 9:16 | No - copy only; the user uploads the file | Short caption, a few hashtags |
| Instagram Reels | 9:16 | Yes - Instagram Business account linked to a Facebook Page; always public | One text, up to 2200 characters; frameos-publish splits it between title and description |
| Instagram feed | 4:5 | Yes - posted as a Reel that is also shared to the feed | Same as Reels |
| YouTube Shorts | 9:16 | Yes - public, unlisted or private as chosen | Title is cut to 95 characters; description holds the rest; thumbnails 9:16 |
| YouTube main channel | 16:9 | Yes - uploaded to the channel | Thumbnails 16:9 |
| Facebook Page | 9:16 or 4:5 | Yes - Pages only; "private" posts unpublished; "unlisted" still posts publicly | Title plus description |
| LinkedIn | 1:1 or 4:5 | Yes - personal profile only (not company pages); always public | One text, up to 3000 characters; frameos-publish splits it between title and description |
| X | 1:1 or 4:5 | No - copy only; the user uploads the file | Keep it short; trim the draft to fit the user's X limit |

Posts made through FrameOS never attach a thumbnail or cover; the user uploads thumbnails in the platform's own app.

Shapes: one render makes one shape. If the user wants a single render, use 9:16 for every platform and say feed shapes would need a second render.

Caption style starting points (guidance only; the full catalogue, the use-case table and fine-tuning live in frameos-captions):
- General short video (TikTok, Reels, Shorts): Karaoke (`karaoke`, the default). High energy: Beasty (`beasty`).
- Podcast or interview: Simple (`simple`). Calm, professional feeds such as LinkedIn: Soft Landing (`soft-landing`).
- Teaching, tips and explainers: Think Media (`think-media`) or Highlighter Box (`highlighter-box`).
- One clip carries one saved style, and posting uses the export in that saved style. For a different look per platform, duplicate the clip first (frameos-library), style each copy, and export each copy.

## 5. Two shapes in one pack

1. Run the first render to completion. Submitting the same link while it is still processing returns the running render and ignores the new shape.
2. Submit the same source again with the second shape. It becomes a separate project and may pick somewhat different moments, so pick and caption its clips separately.
3. Uploaded files: FrameOS deletes an uploaded source after a successful render, so the second pass needs the file uploaded again.
4. Budget the second pass at the full source minutes in the estimate: it is a new project, so it is charged in full.
5. Put both shapes in the same collection, and label the shape in the delivery table.

## 6. Delegation map

| Sibling skill | This skill hands it | It hands back |
|---|---|---|
| frameos-find-moments | (optional, before planning) a processed project and the topic | the speaker's literal words for the render focus, quotes for copy |
| frameos-clip | source, clip count, shape, focus | the finished project and its ranked clips; exports for single clips |
| frameos-library | the picked clips and the pack name | the collection; stale-clip handling; batched exports past 10 clips; usage |
| frameos-captions | the picked clips and the chosen style | clips with the style saved and ready to export |
| frameos-thumbnails | each clip and the thumbnail shape and count | thumbnail images and their headline text |
| frameos-publish | each clip and its platforms and tone | copy drafts; later, posts confirmed one by one |

Order matters: captions before exports (an export burns the saved style), exports before posting (an overlay-caption clip cannot be posted until its export in the saved style exists), and picks before the collection.
