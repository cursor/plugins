# Thumbnails reference

Load this when choosing a source, shape or style reference, or when reading a thumbnail result.

## Contents

1. Sources
2. Shapes per platform
3. Cost and affordability
4. Job progress and polling
5. Result fields
6. Style references
7. Designs and labels
8. Presenting results
9. Troubleshooting

## 1. Sources

`create_thumbnail_job` takes exactly one source. Sending `clip_id` together with another source is refused; sending none is refused with "A video link is required."

| Source | What FrameOS reads | Best for | Watch out for |
|---|---|---|---|
| `clip_id` | The clip's rendered video file | Shorts, Reels and TikTok covers; any project made from an uploaded file | On a `free` plan the frames include the small FrameOS watermark (paid plans with a brand logo show that logo instead) |
| `video_id` (the project ID) | The project's original source video | A thumbnail for the full episode, e.g. the main YouTube upload | Fails for uploaded-file projects - the source file is removed after rendering. Use a clip instead |
| `url` | A public video link, downloaded fresh | A video that is not in FrameOS yet | Must be a public http(s) link of the kind FrameOS can clip (YouTube, Vimeo, Twitch, Kick, public Google Drive file, direct video file). `gs://` paths, local files and private or internal addresses are refused with "url must be a public http(s) video link". Long videos take longer to download |

The headline is written from what is said in the source. A clip gives a headline about that moment; a full video gives one about the whole episode.

## 2. Shapes per platform

`aspect` accepts `auto`, `16:9`, `9:16`, `1:1`, `4:5`, `3:4`. `auto` picks the supported shape closest to the source's frame, so a vertical clip gives 9:16.

| Use | `aspect` | Output size |
|---|---|---|
| YouTube video thumbnail (long-form) | `16:9` | 1280 x 720 |
| YouTube Shorts, Instagram Reels, TikTok cover | `9:16` | 1080 x 1920 |
| Instagram or Facebook feed image | `4:5` | 1080 x 1350 |
| Square placements (works on most feeds) | `1:1` | 1080 x 1080 |
| Portrait placements that use 3:4 | `3:4` | 1080 x 1440 |

Pass the shape explicitly whenever the target platform differs from the source shape - for example a 16:9 YouTube thumbnail from a vertical clip.

Non-vertical shapes and style references use a newer layout engine. If it cannot produce a design, FrameOS falls back to its vertical templates, and the results come back as 1080 x 1920 whatever shape was asked. Always compare `width` and `height` with the request and tell the user if they differ.

## 3. Cost and affordability

- 10 credits per thumbnail delivered. Failed jobs cost nothing.
- `max_thumbnails` is 1 to 3. Larger values are capped at 3. 0 or less is refused.
- FrameOS makes at most as many as the balance covers: affordable = balance divided by 10, rounded down. Example: a balance of 25 asked for 3 delivers at most 2 (20 credits). A balance under 10 is refused as out of credits.
- A job can deliver fewer images than asked even with enough credits (a design can fail); only delivered images are charged.
- The balance in `whoami` can lag by up to a minute. `get_usage` shows the live balance and recent spend, including thumbnails.
- Never quote prices or plans. For more credits, link https://frameos.studio/pricing.

What to say before starting (fill in the numbers):
"I'll make 3 thumbnail options at 10 credits each - 30 credits, charged only for the ones delivered. You have 140 credits."

## 4. Job progress and polling

- `create_thumbnail_job` returns `jobId` (camelCase) and status `queued`.
- `get_thumbnail_job` returns the job `state` (`pending`, `processing`, `completed`, `failed`, `cancelled`), `progress` from 0 to 1, a `message`, a time estimate (about 120 s), and `result` once completed.
- Typical message order: queued, starting, downloading source (link and project sources), transcribing clip, matching your style (style reference or non-vertical shape) or sampling frames, finalizing, done.
- Cadence: first check about 20 s after starting, then every 10 s. Usually done in about 2 minutes; a long link can take several minutes to download.
- Stop after 15 minutes. A job still `pending` by then most likely never started; do not start another automatically. Check `list_thumbnails` later.
- There is no cancel tool. Never start a duplicate job while one is running - each delivered image is charged.

## 5. Result fields

When `state` is `completed`, `result` contains:

- `thumbnails`: a list, one item per image:
  - `url` - preview link (expires within hours)
  - `downloadUrl` - forced-download link (expires after about an hour)
  - `role` - short label, e.g. Best Match, Alternative, Wildcard, or a design name such as Scene Headline
  - `reason` - one sentence on why this design was chosen
  - `template` - internal design name (do not show it unless asked)
  - `width`, `height` - pixel size
  - a relative fit score (internal; do not show it)
- `title` - the headline idea in one line; also a decent video title suggestion
- `hook` - the headline pieces: `topic`, `kicker` (small line above), `line1`, `line2` (the big text), and a short rationale

`list_thumbnails` (newest first, `limit` 1 to 100, default 30) returns saved thumbnails with fresh links: `id`, `url`, `downloadUrl`, `template`, `role`, `title`, `width`, `height`, `jobId`, `createdAt`. It has no `reason`. Group rows by `jobId` to find one job's results.

## 6. Style references

`style_ref` is a link to one image of a thumbnail whose look the user wants.

What FrameOS takes from it:
- the layout family (for example a text panel beside a face, a full scene with a stacked headline)
- colours read from the image's pixels
- borders and the text panel's side and width
- a logo or channel name from its corner, which may be placed on the new thumbnails

Good references:
- One of the user's own past thumbnails - this keeps a channel consistent and avoids copying someone else's logo.
- A clear, uncluttered thumbnail at normal thumbnail size.

Rules:
- It must be a direct public `http(s)` link to an image file (jpg or png). A web page link, a login-only link or a private file will not work.
- If the image cannot be downloaded, the job still runs with the house style and gives no warning. If the results look nothing like the reference, say so.
- Do not encourage copying another creator's branding. If the user points at someone else's thumbnail, mention that a logo or name from it may be carried over and should be checked before use.
- Storage paths (gs:// links), local files and private or internal addresses are refused with "style_ref must be a public http(s) image link".

## 7. Designs and labels

Vertical jobs without a style reference use the classic templates. Their labels are Best Match, Alternative and Wildcard, in that order.

The newer engine (non-vertical shapes or a style reference) uses design families. Labels you may see:
- Scene Headline - the full scene kept, with a bold stacked headline
- Cutout Duo - people cut out as stickers, with a bubble headline and name labels
- Flat Illustrated - flat colour background with drawn doodles, cutouts and name pills
- Data Story - a video-frame card with fact cards built from numbers spoken in the video
- Layout Transfer - the reference's layout reproduced: panel, face position and border

All of these are made from the video's own frames plus drawn shapes and text. None of them generate new imagery.

## 8. Presenting results

Keep it short. Example:

```
Your 3 thumbnail options (16:9, 1280 x 720):
1. Best Match - <reason>. Preview: <url>  Download: <downloadUrl>
2. Alternative - <reason>. Preview: <url>  Download: <downloadUrl>
3. Wildcard - <reason>. Preview: <url>  Download: <downloadUrl>
Headline: "<line1> <line2>"  (suggested title: "<title>")
Charged: 30 credits. Links expire - ask me for fresh ones any time.
```

Then offer next steps: a different shape, a style reference, or a new run (each new run costs again).

## 9. Troubleshooting

| Symptom | Likely cause | Next step |
|---|---|---|
| Out of credits when starting | Balance under 10 | Link https://frameos.studio/pricing. Do not retry. |
| Refused: "url must be a public http(s) video link" | A `gs://` path, local file or private address was sent as `url` | Use `clip_id` or `video_id` for media in FrameOS, or ask for a public link. |
| Refused: "style_ref must be a public http(s) image link" | The style reference was not a public link | Ask for a direct public image link, or run without one. |
| Refused with a field error on `max_thumbnails` | 0 or a negative number was sent | Send 1, 2 or 3. |
| Fewer images than asked | Balance covered fewer, or a design failed | Say how many were delivered and charged. |
| Asked for 16:9, got 1080 x 1920 | Newer layout engine fell back to vertical | Offer one new attempt (costs again), possibly from another source. |
| Results ignore the style reference | The image link could not be downloaded or was a web page | Ask for a direct public image link. |
| Headline looks generic or unrelated | The speech could not be used, so the headline fell back to the title | Offer a run from a different source (costs again). |
| Job failed for a project made from an uploaded file | Source file was removed after rendering | Use `clip_id`. |
| Job failed with a download error | Private, removed or unsupported link | Ask for another public link or use a clip. |
| Job failed: "Thumbnail generation failed" or "Could not generate thumbnails for that video" | Processing error | Nothing was charged. Try a clip as the source, after asking. |
| Job stuck in `pending` for 15 minutes | The job did not start | Stop polling; check `list_thumbnails` later. Do not start another job without asking. |
| Links stopped working | Signed links expired | Call `list_thumbnails` for fresh links. |
