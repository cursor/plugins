# FrameOS clip workflow details

Reference for the frameos-clip skill. Field names and messages are exactly what the tools return. Errors from any tool arrive as `FrameOS returned HTTP <code>: <detail>`, or `FrameOS API is unavailable` when FrameOS cannot be reached.

## Job states and fields

- `state` is one of `pending`, `processing`, `completed`, `failed`, `cancelled`. Project `status` (from `list_projects` and `get_project`) uses the same five words.
- Progress units differ: `get_job` and `get_project` report 0-1, `list_projects` reports 0-100.
- `get_job` also returns `message`, the total ETA in `eta_seconds` (may be empty until the video is downloaded) and the seconds remaining (0 once finished). A render job has no `result`; read the clips with `list_clips`.
- A job id FrameOS has no record of reads as `pending` with an empty message forever. If a render stays like that for more than 5 minutes, check the project with `list_projects`.
- `get_project` has no error text. The failure reason is in `list_projects` (`errorMessage`) and in the job `message`.
- Job id shapes: render `clip:render:<project id>`, export `export:<clip id>:<time>`. A project's render job id can be rebuilt from the project id.
- There is no cancel tool. Renders are stopped only in the web app, which shows up here as `cancelled`.

## Render messages, in order

| `message` | `progress` | Say to the user |
|---|---|---|
| `queued` | 0 | waiting to start |
| `downloading source` | 0.05 | downloading the video |
| starts with `source blocked the download` | 0.05 | the site blocked the download; FrameOS tries again a couple of times, a few minutes apart |
| `transcribing` | 0.1 | transcribing the audio |
| `scoring hooks across N segments` | 0.3 | finding the strongest moments |
| `rendering N clips` | 0.45 | rendering N clips |
| `rendered k/N clips` | 0.45-0.95 | rendered k of N clips |
| `N clips ready` (state `completed`) | 1.0 | done - call `list_clips` |
| starts with `retrying automatically` (state `pending`) | 0 | FrameOS is re-running it after a temporary failure |

## Export job messages

`queued`, then `loading master`, then `burning <style> captions`, then `uploading export`, then state `completed` with a message starting `export ready`. Typical: 15-60 seconds, plus a cold start.

## Polling by host type

| Host type | Examples | How to wait | Render | Export |
|---|---|---|---|---|
| Has a shell | Claude Code, Codex, Gemini CLI, Copilot CLI, Devin, Cursor or VS Code agents with a terminal | `sleep 30` (render) or `sleep 5` (export) in the shell between calls; keep each sleep at 60 seconds or less | first check at about 60 s, then every 20-30 s; stop after about 45 min (or ETA plus 15 min if longer) | every 5 s; stuck after 10 min |
| Chat only | claude.ai, Claude Desktop chat, ChatGPT, Perplexity | tool calls run back to back; you cannot pause | at most 3 checks per reply, spaced by other useful work, then report progress and hand back | a few checks spaced by other work, then hand back |

- If the shell refuses to sleep, space checks by doing other useful work, and never call `get_job` more than twice a minute.
- Handing back: tell the user what stage it reached and to say "check my FrameOS render" later. On return, call `list_projects` (newest first), match the project by id or title, then continue polling, list the clips, or read the failure.
- When you stop at the cap, the render keeps going on FrameOS. Say so; do not re-submit.

## Failure reasons

Read the reason from `errorMessage` in `list_projects`; it ends with a `(code)`. The job `message` carries the same text, but for some link failures without the code. Renders that delivered no clips are not charged.

The video itself (same source gives the same result - do not re-submit it unchanged):

| Code | Meaning | Next step for the user |
|---|---|---|
| `(source_too_short)` | under 30 seconds of video | use a longer video |
| `(insufficient_credits)` | the balance did not cover the video. Checked at submit when the length is known (the 402 message, saved on the project), otherwise right after download. Nothing was charged | add credits (https://frameos.studio/pricing) or use a shorter video, then submit the same link or `gs_path` again: it re-runs this project |
| `(no_clips_found)` | not enough clear speech | use a longer video, or one with more talking |
| `(no_publishable_clips)` | moments found, none stood on their own | use a longer video, or one where the speaker finishes complete thoughts |
| `(not_a_video)` | the file is an image | upload a video file |
| `(no_audio_track)` | the video has no sound | use a video with audio - clips are picked from speech |
| `(unreadable_source)` | the file is corrupted or unreadable | re-export it as MP4 and upload again |

Link imports that will not fix themselves:

| Code | Meaning | Next step for the user |
|---|---|---|
| `(source_members_only)` | members-only YouTube video | upload the file (YouTube Studio can download your own videos) |
| `(source_requires_auth)` | the video needs a sign-in or is private | make it public, or upload the file |
| `(source_cookies_invalid)` | FrameOS could not sign in to download it | upload the file |
| `(source_format_unavailable)` | no compatible version could be downloaded | upload the file |
| `(unsupported_url)` | FrameOS cannot import from this site | upload the file |
| `(not_direct_media)` | the link is not a video file or a supported video page | use the video's own page link, a direct file link, or upload |
| `(blocked_host)` | private or internal address | use a public link |
| `(google_drive_unsupported)` | not a single-file Drive link | use the file's share link (drive.google.com/file/d/...), not a folder |
| `(google_drive_not_public)` | the Drive file is not shared publicly | share it as "Anyone with the link", or upload |
| `(source_not_found)` | the link points to nothing | check the link |
| `(source_too_large)` | over the 4 GB link-import limit | use a smaller or compressed file |

Temporary (FrameOS may re-run these once by itself within about an hour - check `list_projects` again later before suggesting anything else):

`(source_forbidden)`, `(source_bot_check)`, `(source_download_timeout)`, `(source_rate_limited)`, `(dns_failed)`, `(empty_download)`, `(direct_download_failed)`, `(google_drive_failed)`, `(download_failed)`, `(source_download_failed)`, `(cookie_fetch_failed)`, `(render_failed)`.

If one of these is still `failed` after the automatic retry: for a link, suggest uploading the file directly (sites like YouTube sometimes block server downloads); otherwise suggest trying again later. Re-submitting a link whose last render failed re-runs that same project (it may reuse settings chosen for it earlier in the web app).

Messages without a code:

| Message | Meaning | Next step |
|---|---|---|
| `Processing couldn't get capacity. Please try again.` | no render capacity for 45 minutes | submit the same link again later |
| `Processing timed out. Please try again.` | the render ran too long | try again later, or a shorter source |
| `Processing crashed before it could report. Please try again.` | the render died | submit again |
| starts with `Cancelled` (state `cancelled`) | stopped in the web app | submit again only if the user wants |
| empty, or `Processing failed` | unknown failure | FrameOS may re-run it once by itself; check again later, then submit again if it is still failed |

## Submit errors

| Error | Meaning | What to do |
|---|---|---|
| 402 `Out of credits...` | balance is 0 | link https://frameos.studio/pricing and stop; never retry. The project is listed as failed with the same message and `(insufficient_credits)`; it costs nothing |
| 402 `This video is N minutes long and needs N credits, but your workspace has M...` | the length is known at submit (Vimeo links, or a source an earlier run of this project measured) and the balance does not cover it. M leaves out credits set aside for renders still in progress. The project is listed as failed with the same message | tell the user the shortfall, link https://frameos.studio/pricing, or suggest a shorter video; never retry |
| 429 `N videos are already processing in this workspace (limit N)...` | the workspace already has the maximum renders running (usually 3); nothing was submitted | show what is rendering with `list_projects`; submit again only after one finishes |
| 429 `Another video is still being submitted in this workspace. Submit again in a few seconds.` | another submit was in progress at the same moment; nothing was submitted | wait a few seconds and submit once more |
| 400 `Paste a public video link (http:// or https://), or upload the file.` | the link points at a private or internal address | ask for a public link, or upload the file |
| 422 `This video is only N seconds long...` | under 30 seconds (caught at submit only when the length is known up front) | use a longer video |
| 422 `Unsupported aspect ratio` | shape not allowed | use 9:16, 4:5, 3:4, 1:1 or 16:9 |
| 422 with a list of field errors | link not http(s) or not 8-2048 characters, clip count outside 1-20, or focus text over 1000 characters | fix the field and submit again |
| 503 `Render queue unreachable...` | temporary | wait a minute, retry once |
| `already_running` in the response | this link is already rendering in this workspace; new settings ignored | tell the user and poll that job |

## Uploading a local file

1. Pre-checks with the shell: the file exists; its size (`ls -lh "/path/to/video.mp4"`); its duration in seconds if `ffprobe` is installed: `ffprobe -v error -show_entries format=duration -of csv=p=0 "/path/to/video.mp4"`. Under 30 seconds: do not submit. Credits: the minutes, rounded up.
2. `create_upload_link` with `filename` = the real name with its extension (.mp4, .mov, .mkv, .webm ...). The stored file keeps that extension and the project is titled after it. `content_type` can stay at its default.
3. Send the bytes with one PUT. Quote the URL (it contains `&`). The Content-Type header is not checked, so `video/mp4` is fine for any video:
   `curl -sS --fail -X PUT -H "Content-Type: video/mp4" --upload-file "/path/to/video.mp4" "UPLOAD_URL"`
4. `submit_uploaded_video` with the exact `gs_path` returned in step 2.

| Error | Meaning | What to do |
|---|---|---|
| 404 `Upload link was not issued to this workspace or expired` | the `gs_path` is not from this workspace | new `create_upload_link`, upload again, submit |
| 409 `Video upload has not completed` | the PUT did not finish, or this file already rendered successfully (FrameOS then deletes it) | repeat the PUT (same link if under 1 hour old), then submit again; after a successful render, upload the file again |
| 422 `Invalid uploaded video path` | `gs_path` was changed | pass the exact value from `create_upload_link` |
| 402 out of credits | balance is 0 | the upload stays usable: after the user adds credits, submit the same `gs_path` again |
| 500 `GCS not configured`, `GCS storage unavailable`, `could not sign upload URL...`; 503 `Upload tracking unavailable` | temporary FrameOS problem | retry once later |

- The upload link (the PUT) expires after 1 hour. The `gs_path` carries the workspace, so it can still be submitted after that.
- An upload's length is not known at submit: the credit check runs right after FrameOS downloads it, and a shortfall fails the render with `(insufficient_credits)`, charging nothing. The file is kept, so after the user adds credits, submit the same `gs_path` again.
- Submitting the same `gs_path` again while it renders returns `already_running`; after a failed render it re-runs the same project.
- After a successful render FrameOS deletes the uploaded source. Another render of the same file (for another shape) needs a new upload and is charged again.
- Never show the upload URL to the user or write it to a file.

## Supported sources

- YouTube, Vimeo, Twitch and Kick video links, and other sites FrameOS's downloader supports. YouTube sometimes blocks server downloads; uploading the file always avoids that.
- Public Google Drive files, shared as "Anyone with the link" (single files, not folders).
- Direct video file URLs ending in .mp4, .m4v, .mov, .mkv, .webm, .avi, .mpeg or .mpg.
- Not supported: links that need a sign-in, private or members-only videos, localhost and private or internal addresses.
- Link imports are limited to 4 GB per file.

## ETA

FrameOS estimates about 1.1 x (180 + 0.2 x source seconds + 180 x clip count) seconds: roughly 15 minutes for a 10-minute video with 3 clips, 26 minutes for a 60-minute video with 3 clips, and about 3 more minutes per extra clip. Use it when `eta_seconds` is empty and the user knows the video's length.

## Exports

- `exportRequired` is true when the clip has overlay captions in a style other than `none`. Then `downloadUrl` is empty, and `url` and `previewUrl` play without captions; only the export has captions burned in.
- Clips with captions already burned in, or with style `none`, export as `ready` straight away.
- Export links last about 1 hour; preview links between 1 and 12 hours. Fetch fresh ones with `export_clip` or `list_clips` instead of reusing old ones.

| Error | Meaning | What to do |
|---|---|---|
| 404 `Clip not found` | a newer run of the project replaced the clip, or it is not in this workspace | refresh with `list_clips` and skip it |
| 409 `This clip predates editable captions...` | an older clip that cannot be re-rendered | use its `downloadUrl` from `list_clips` if present; otherwise explain it cannot be exported here |
| 422 `Unknown caption style...` | a bad style was passed or saved | hand off to frameos-captions to set a valid style, then export |
| 503 `Exports require GCS storage` or `Export requires the Cloud Run worker` | temporary | retry once later |

## Fields this skill reads

- Submit response: `project.id`, `job.job_id`, `job.eta_seconds`, `job.status` (only when `already_running`).
- `list_projects` rows: `id`, `title`, `status`, `progress` (0-100), `processingMessage`, `errorMessage`, `clipCount`, `createdAt`.
- `list_clips` items: `id`, `title`, `hook`, `rank`, `score` (0-1), `startTime` and `endTime` (seconds in the source), `previewUrl`, `url`, `captionMode`, `captionStyle`, `exportRequired`, `aspectRatio`.
