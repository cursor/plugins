# Platform reference for posting

Load this before drafting for a specific platform or before showing a confirmation card.

## Contents

1. Accounts
2. What a post does on each platform
3. Text limits and field use
4. Copy-only platforms (TikTok, X)
5. The confirmation card
6. Progress messages while posting
7. Failure messages
8. Pre-post checklist

## 1. Accounts

Accounts are connected only in the FrameOS web app at https://frameos.studio/dashboard/social-accounts. `list_social_accounts` returns each connected account with `id`, `platform`, `displayName`, `status` and `connectedAt`. Post only to rows whose `status` is `connected`.

| Platform | What must be connected | Display name you will see |
|---|---|---|
| YouTube | A YouTube channel, connected with upload permission | Channel name |
| Facebook | A Facebook Page the user manages (not a personal profile). Connecting adds one account per Page. | Page name |
| Instagram | An Instagram Business account linked to a Facebook Page | Instagram username |
| LinkedIn | The user's personal LinkedIn profile. Company pages are not supported. | Profile name |

If the user has several accounts on one platform, ask which one by display name.

## 2. What a post does on each platform

`post_clip` works for youtube, facebook, instagram and linkedin accounts only. It returns a job; the post happens in the background and the public link arrives in the job `message` when the job is `completed`.

| Platform | Posted as | `privacy` | Link you get back |
|---|---|---|---|
| YouTube | A video upload on the channel | Honoured: public, unlisted or private | `https://youtube.com/shorts/` followed by the video id |
| Facebook | A video on the Page | `private` = uploaded unpublished (not shown on the Page). `public` and `unlisted` = published publicly | `https://www.facebook.com/watch/?v=` followed by the video id |
| Instagram | A Reel, also shared to the feed | Ignored - always public | The Reel's permalink, or `https://www.instagram.com/` if Instagram did not return one |
| LinkedIn | A post on the member's feed with the video attached | Ignored - always public | `https://www.linkedin.com/feed/update/...`, or `https://www.linkedin.com/feed/` if no post id came back |

Things a post never does here: schedule for later, set a custom cover or thumbnail, tag people or locations, post to a LinkedIn company page, or edit or delete the post afterwards. The user does those in the platform's own app.

Captions: for clips with `exportRequired` true, FrameOS posts the exported file in the clip's saved caption style. If that export does not exist yet, `post_clip` refuses with "Captions for this clip aren't rendered yet" - export first (SKILL.md, Workflow B step 2). Clips whose caption style is `none` post without captions. On a `free` plan the clip carries a small FrameOS watermark.

## 3. Text limits and field use

What FrameOS keeps from each field, and the platform rules to respect:

| Platform | `title` kept | `description` kept | Final text | Also respect |
|---|---|---|---|---|
| YouTube | 95 characters (empty uses the clip's own title) | 4500 characters | Title and description separately | No `<` or `>` characters in either field |
| Facebook | 95 characters (empty uses the clip's own title) | 4500 characters; if empty, the title is used | Title and description separately | - |
| Instagram | 95 characters (may be empty) | 4500 characters | title + blank line + description, cut at 2200; with an empty title, the description alone | Put the hook in the first line |
| LinkedIn | 95 characters (may be empty) | 4500 characters | title + blank line + description, cut at 3000; with an empty title, the description alone | Write for a professional feed |

Instagram and LinkedIn join the two fields into one text. To control exactly what appears:
- Text of 95 characters or fewer: all of it in `title`, `description` empty. The post is exactly that text.
- Longer text: the opening line or sentence (max 95 characters) in `title`, the rest in `description`. FrameOS inserts one blank line between them, so do not start `description` with blank lines.
- An empty `title` is fine here: the post is then exactly `description`. (LinkedIn's video title falls back to the clip's own title; it is not part of the post text.)
- If the first sentence is longer than 95 characters, propose a short hook line to go first (and show it to the user) rather than cutting a sentence in half.

`generate_social_copy` returns `title` (up to 100 characters - shorten to 95 before posting), `caption` (up to 4500), and `hashtags` (up to 10). It sees only the clip's transcript (and its title), never the video frames, so it can miss visual context. It never posts and costs no credits, but it is limited to 30 calls per hour per workspace.

How to map a draft:
- YouTube and Facebook: draft `title` to `title` (trimmed to 95), draft `caption` plus hashtags to `description`.
- Instagram and LinkedIn: build one text (hook line, blank line, caption, hashtags), check it fits 2200 or 3000 characters, then split it as above.

## 4. Copy-only platforms (TikTok, X)

`generate_social_copy` accepts tiktok and x, but `post_clip` cannot post there. Deliver instead:
1. The text, fitted to the platform. X standard accounts allow 280 characters per post; trim unless the user says their account allows longer posts. TikTok's own caption limit applies; FrameOS does not check it.
2. A fresh captioned download from `export_clip` (link valid about an hour).
3. A note that the user uploads it in the TikTok or X app. Never say FrameOS posted it.

## 5. The confirmation card

Show one card per post, then wait for a clear yes for that card. Fill every line; never leave the text as "see above". Use the user's words for names. Omit the watermark line unless the plan is `free`.

```
Ready to post - please confirm this one post.

Platform:   <YouTube | Facebook Page | Instagram Reel | LinkedIn profile>
Account:    <displayName>
Clip:       "<clip title>" (<mm:ss>, <aspect>, captions: <style name | off>)
When:       Now (scheduling is not available)
Visibility: <Public | Unlisted | Private> <platform note, e.g. "Instagram posts are always public">
<For YouTube and Facebook:>
Title (<n>/95):
<title>
Description (<n>/4500):
<description>
<For Instagram and LinkedIn:>
Post text, exactly as it will appear (<n>/<2200 | 3000>):
<title>

<description>

Note: this clip carries the FrameOS watermark (free plan).

Reply "post it" to publish this now, or tell me what to change.
```

Rules:
- One card, one post. For three clips to two accounts, that is six cards and six answers.
- If the user changes anything after saying yes, show the new card and ask again.
- Facebook with `unlisted`: replace the visibility line with "Public - Facebook has no unlisted option here; choose Private to upload it unpublished".
- Do not post on an ambiguous reply ("looks good, maybe tweak the hashtags"). Make the tweak, show the card again.
- Captions line: use the style's display name (frameos-captions has the catalogue). A saved style named as a default alias is the karaoke style; `none` means no captions; legacy burned clips keep the captions they were rendered with.

## 6. Progress messages while posting

The job `message` moves through steps like: queued, loading account, downloading clip, then per platform:
- YouTube: uploading to YouTube.
- Facebook: uploading to Facebook.
- Instagram: preparing Instagram Reel, Instagram is processing the Reel (can repeat for several minutes), publishing Instagram Reel.
- LinkedIn: preparing LinkedIn video, uploading LinkedIn video, LinkedIn is processing the video, publishing LinkedIn post.

When `state` is `completed`, `message` is the post link. Relay progress in plain words ("Instagram is still processing the Reel"), not raw percentages.

## 7. Failure messages

When the post job is `failed`, its `message` says why. Never re-post automatically; the platform may have part of the upload.

| Message starts with | Meaning | Tell the user |
|---|---|---|
| social account not found or disconnected; no usable access token; Instagram account id is missing; token refresh failed | The connection to the platform is broken or expired | Reconnect the account at https://frameos.studio/dashboard/social-accounts, then ask again. Nothing was posted. |
| posting to ... is not supported yet | That platform is copy-only | Offer Workflow C (copy plus download). |
| Instagram container creation failed | Instagram refused the video before publishing | Summarise Instagram's reason from the message. Nothing was published. |
| Instagram media processing failed / timed out | Instagram could not process the video | Nothing was published. Offer to try again later, with a fresh confirmation. |
| Instagram publish failed | The final publish step was refused | Ask the user to check their profile before any new attempt. |
| Facebook upload failed | Facebook refused the upload | Summarise the reason; ask the user to check the Page before any new attempt. |
| LinkedIn upload initialization failed / video part upload failed / upload finalization failed / video processing failed / video processing timed out | The video never became a post | No post was created. Offer to try again later, with a fresh confirmation. |
| LinkedIn post failed | The post step was refused | Ask the user to check their profile before any new attempt. |
| youtube upload init failed | YouTube refused the upload before it started | Summarise the reason; nothing was uploaded. |
| youtube upload failed | The upload broke partway | Ask the user to check YouTube Studio for a partial upload before any new attempt. |

Platform messages can include raw API text. Summarise it in one sentence; do not paste the raw error unless the user asks.

## 8. Pre-post checklist

- The user explicitly asked to post (drafting or preparing is not enough).
- `whoami` was called in this conversation.
- The account is `connected`, on the right platform, and the user picked it.
- If `exportRequired` is true, the export in the saved style finished.
- Every field is within the limits above. For YouTube and Facebook the card shows the title that will be used (the clip's own title when `title` is empty).
- The visibility behaviour for this platform was stated on the card.
- The card was shown and the user said yes to this exact post.
- `post_clip` is called once, and the job is followed to the end.
