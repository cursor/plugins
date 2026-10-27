# Collections: lifecycle, bulk export and gaps

Read this before creating, filling or exporting a collection.

## What a collection is

- A named group of clips in the workspace, used to organise clips and to export many at once. Clips can come from any project in the workspace.
- Collections are managed only through these tools today. The web app has no collections screen yet.
- Names: 1-120 characters, trimmed, not blank. Unique per workspace and case-sensitive, so "Ep 12" and "ep 12" are two different names.
- `list_collections` returns every collection with its name, creation time and clip count, newest first. The count leaves out deleted clips.
- `list_clips_in_collection` returns the clips in the order they were added, with fresh preview links. Deleted clips and clips from deleted projects are left out.
- Creating collections, adding clips and exporting are free.

## Lifecycle

1. Name it. Suggest "<project or episode title> - <purpose>", for example "Ep 42 - best moments". Ask only if the user seems to care about the name.
2. Find before you create: call `list_collections` and look for an exact name match. If there is one, reuse it.
3. Create: `create_collection(name)`. If it fails because the name already exists, call `list_collections` and use that collection. Do not invent variants like "name (2)" unless the user wants a separate collection.
4. Add clips: `add_clip_to_collection(collection_id, clip_id)`, once per clip. Repeating a call is harmless; "added: false" means the clip was already in the collection. A not-found error means the clip or the collection no longer exists or is in another workspace: skip it and tell the user.
5. Confirm: call `list_clips_in_collection(collection_id)` and show the clips in the ranked one-line format from the skill (the order here is the order added, not the score).
6. Export: follow the procedure below.
7. Change it later: see "Known gaps". To drop clips, make a new collection with only the clips the user wants and use that one.

## Bulk export procedure

An export burns the captions into an MP4, using each clip's saved caption style and appearance. Exports are free. Each download link lasts about 1 hour.

### Before exporting

1. Call `list_clips_in_collection(collection_id)` and count the clips (N).
2. If the user wants a different caption look, restyle the clips first with frameos-captions. The export uses whatever style is saved on each clip.
3. Pick the path:
   - N is 0: nothing to export. Say so.
   - N is 1-50: path A, collection calls.
   - N is over 50: the collection export refuses. Use path B, or ask which clips the user actually needs.

### Path A - collection calls (1-50 clips)

Each `export_collection` call keeps at most 10 clips rendering. Clips past that come back `not_started` and need another call once the rendering ones finish. A clip that is already rendering comes back with its running job, never a second render.

1. Call `export_collection(collection_id)` once.
2. Read each entry in its list of clips:
   - ready: it carries a download link. Done.
   - rendering: it carries a job id. Put the clip and its job id on the wait list.
   - not_started: held back to keep the call short. Leave it for the next call.
   - unavailable: it carries a reason. Explain it in plain words (for example, the clip was made before captions became editable, or it no longer exists). Do not retry that clip in this run.
   The response's `not_started` field counts the clips still waiting.
3. Wait for the wait list (below). For collecting links you can skip that section's step 4: the next collection call returns them.
4. When the wait list is empty, call `export_collection` once more. Finished clips come back ready with their links, and up to 10 clips that were `not_started` start rendering. Repeat steps 2-4 until no clip is rendering or `not_started`.
5. If the call itself fails or times out, wait about 2 minutes and call it once more: clips already rendering return their running job and finished ones come back ready. If it fails again, use path B.

### Path B - clip by clip (more than 50 clips, or after collection calls keep failing)

1. Work in batches of up to 10 clips.
2. For each clip in the batch, call `export_clip(clip_id)` once, with no style:
   - ready: keep the link.
   - rendering: put the clip and its job id on the wait list.
   - not found: skip the clip and note it.
   - 409: read the message and follow it (for example, the clip must be re-processed before its captions can be burned).
   - 422 unknown caption style: the saved style is invalid. Fix it with frameos-captions, then export that clip.
3. Wait for the batch (below) before you start the next batch.

### Waiting for renders (bounded)

1. Wait about 20 seconds after the last export call, then check each job on the wait list with `get_job(job_id)`.
2. After that, do one round over the wait list every 5-10 seconds. Take a job off the list when its state is completed, failed or cancelled.
3. An export usually takes 15-60 seconds. Cap the total wait at about 5 minutes per batch.
4. For each completed job, call `export_clip(clip_id)` once more, with the same arguments as before (no style), to get its download link.
5. For a failed job, read its message and tell the user. Offer one retry later (a single `export_clip` call for that clip); never loop.
6. At the 5-minute cap: report what is ready, list what is still rendering or not started, and stop. Later, check those jobs with `get_job` and finish step 4 (or path A step 4). Do not call `export_clip` or `export_collection` again while jobs are still rendering: an extra call only returns the same jobs.
7. If the host cannot wait between checks (a chat-only app), report progress after the first round and ask the user to say "are my FrameOS exports ready?" in a minute or two. Then resume at step 1 with the same wait list.

### Delivering

Show one table, in the collection's order:

| # | Clip | Length | Captioned MP4 (link lasts about 1 hour) |
|---|---|---|---|
| 1 | Why most podcasts stall in year two | 0:58 | download link |
| 2 | The pricing mistake | 1:12 | still rendering - ask me to check again |
| 3 | Cold open | 0:41 | unavailable: made before captions became editable |

Then:
- Say the links expire in about an hour.
- To refresh a link later, call `export_clip(clip_id)` again. Once that clip's file exists in its current caption style, it returns a fresh link right away without rendering again. If the style changed since, it renders a new file.
- Never re-share an old link.
- Clips rendered on the free plan carry a FrameOS watermark; paid plans render without it. Mention it only if the user asks about the watermark.

## Known gaps

| The user wants to | Answer |
|---|---|
| Rename a collection | Not available yet. Offer a new collection with the new name holding the same clips. |
| Delete a collection | Not available yet. Collections cost nothing to keep. |
| Remove a clip from a collection | Not available yet. Offer a new collection without that clip. |
| Reorder clips in a collection | Not available. The order is the order clips were added. |
| Export more than 50 clips in one call | Not possible. Export clip by clip (path B). |
| Share a collection by public link | Not available through these tools. |
| Post a whole collection | Posting is per clip with a confirmation each time - hand off to frameos-publish. |
| Delete clips or projects | Not available through these tools. |
| Search projects by keyword | No search. Page through `list_projects` and match titles, links and dates. |
