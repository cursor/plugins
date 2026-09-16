# Grok Voice

Cursor plugin with four skills for building voice features on Grok: realtime speech-to-speech, speech-to-text dictation, text-to-speech read-aloud, and a debug loop for voice sessions.

## What it includes

- `add-voice`: build speech-to-speech into an app, or replace an STT-LLM-TTS cascade / OpenAI Realtime with it. Wires the realtime session, safe auth, and the app mic; adds a waveform Voice Mode button to the composer.
- `add-dictation`: speech-to-text. Batch for a mic button or recorded audio (files, uploads, URLs) with word timestamps, diarization, and subtitles; streaming through a relay for live text.
- `add-read-aloud`: text-to-speech. Batch MP3 for a speaker button on replies; streaming PCM through a relay so audio starts before the reply finishes.
- `debug-voice`: proposes a plan, installs a dev-only log pipeline (client logger → local NDJSON) in the app's own language and conventions, then runs the fix loop: match the user's report to log signatures, fix one thing, re-test.

Icon convention across the skills: waveform = voice mode, microphone = dictation, speaker = read aloud.

## When to use it

Use when a user asks to add voice, dictation, or read-aloud to an app with Grok, runs `/add-voice`, `/add-dictation`, `/add-read-aloud`, or `/debug-voice`, or reports that voice mode misbehaves and needs logs to diagnose it.
