---
name: zundamon-video
description: Create a Japanese dialogue explainer with ずんだもん and 四国めたん standing artwork, expressions, lip sync, VOICEVOX voices, and synchronized captions. Use for 掛け合い解説 or ずんだもん動画.
---

# zundamon-video

Resolve all bundled paths from this SKILL.md file, never from a hard-coded
agent installation directory. The plugin root is two directories above this
skill. The complete `yes` plugin is the supported installation unit.

Write and revise local source files. Deliver a single self-contained HTML file
by default, or an HTML + assets bundle when requested. Keep essential viewing
features usable without network access or persistent storage. Do not upload,
publish, or change visibility unless requested. Review the actual rendered
output on desktop and mobile; report unavailable checks honestly.

Before writing content, plan it with the sibling `design` skill: write
`learning-brief.md`, or reuse the one a course has already written.

Read [the dialogue authoring guide](references/authoring.md), then the sibling
[video skill](../video/SKILL.md). Write `script.json` and `scenes.html` and build
them using `../video/build.py`. Read the bundled example before your first video.

Use `"cast": ["metan", "zundamon"]` by default: めたん stands on the left,
ずんだもん on the right, with expressions and lip sync. These are the only
supported voices; do not add other characters. Inline objects containing
only `id` and `speaker` produce voices without artwork; they are not equivalent
to a ずんだもん動画. Use that form only for an explicit voice-only request or an
accepted fallback, not to save download time or HTML size.

Read the plugin's `../../THIRD_PARTY_NOTICES.md` and the source artist's terms
before using the artwork. Fetch both characters with `../video/characters.py`.
If downloading or rendering fails, diagnose it and report any remaining blocker;
do not silently replace the requested characters with voices alone. Keep raw
PSDs and exported artwork out of this repository.

Before delivery, play the actual page and verify both characters are visible,
the speaking character's mouth moves, and expressions change with the dialogue.
Inspect desktop and mobile screenshots for missing layers and overlap with board
text or captions. A successful audio build alone does not verify the video.

The narrator, caption timing, and build verification follow `video`. The delivered
HTML needs neither Docker nor VOICEVOX on the viewer's machine.
