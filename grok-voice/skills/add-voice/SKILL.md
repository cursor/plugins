---
name: add-voice
description: >-
  Use when the user runs /add-voice, types Voice Mode, or asks to add Grok
  realtime voice to an app, including replacing an STT-LLM-TTS cascade or
  OpenAI Realtime.   Wire speech-to-speech, safe auth, and app mic. Composer: waveform button,
  mic icon reserved for dictation. For mic-to-text only use /add-dictation; to speak text replies use
  /add-read-aloud. To add debug logging and fix from logs use /debug-voice.
---

# Add Voice

Add Grok Speech to Speech to an existing app. Run on `/add-voice`, typed **Voice Mode**, or clear “add Grok voice” intent.

## Goal

Working duplex path: user-app mic in, audio out, `wss://api.x.ai/v1/realtime?model=grok-voice-latest`, safe auth. Cursor has no native mic; wire the **app** (or a sample client), not the IDE.

## Protocol first

Language-agnostic event loop. **TypeScript samples default.** Short Python twins only where the client API differs (e.g. `ws` vs `websockets`).

## Docs

- https://docs.x.ai/developers/model-capabilities/audio/speech-to-speech
- https://docs.x.ai/developers/model-capabilities/audio/ephemeral-tokens
- Pricing (cite docs only): https://docs.x.ai/developers/pricing (~$0.08/min STS + $0.004/text item; max session 120 min)

## Steps

1. **Map the app**
   - Stack: none, OpenAI Realtime, STT→LLM→TTS cascade, TTS/STT only.
   - Client: web / Node / iOS / Android / server.
   - If a cascade or OpenAI Realtime exists: replace it with the single duplex loop below (URL, model, voice, event diffs); keep standalone `/v1/stt` or `/v1/tts` only if the product still needs one-shot listen or speak outside the agent.

2. **Auth**
   - Server: Bearer `XAI_API_KEY`.
   - Browser/mobile: backend `POST https://api.x.ai/v1/realtime/client_secrets`, client uses ephemeral token (Bearer or browser `sec-websocket-protocol`: `xai-client-secret.<token>`).
   - Never put a long-lived key in client bundles. Do not paste keys in chat.

3. **Connect + session**
   - URL: `wss://api.x.ai/v1/realtime?model=grok-voice-latest`
   - On open: `session.update` with `voice` (default `eve`), `instructions`, `turn_detection: { type: "server_vad" }` (or `null` for push-to-talk), PCM 24 kHz unless the app already standardizes elsewhere.
   - Set `audio.input.transcription.model: "grok-transcribe"` or no user transcript arrives (`conversation.item.input_audio_transcription.updated` is cumulative, not a delta).
   - Tools if needed: `web_search`, `x_search`, `file_search`, `mcp`, custom `function`.

4. **Audio I/O (app-side)**
   - One `AudioContext` per session for capture and playback, created inside the user gesture (autoplay policy). Ask for 24 kHz; if the browser gives another rate, resample before sending.
   - Mic → AudioWorklet in ~100 ms chunks → `input_audio_buffer.append` (or binary transport). Start WS and mic in parallel; buffer early audio, flush on open.
   - Play `response.output_audio.delta` immediately; schedule with a ~150 ms lead so chunks butt together. On `input_audio_buffer.speech_started`, stop everything queued (barge-in).
   - Transcript rows: create the user row on `input_audio_buffer.committed` (`item_id`), fill it on `…transcription.updated`; assistant text from `response.output_audio_transcript.delta` / `.done`, close the turn on `response.done`.
   - On function tools: `function_call_output`, finish playback, then `response.create`.

5. **Composer UI convention**
   - One primary button, right side of the composer. Empty composer → **waveform** icon (stroked, e.g. Phosphor `WaveformIcon weight="bold"`; never the `fill` weight, which renders as a blob at 16 px), starts voice mode. Any text present → classic **send** arrow; in voice mode that text goes into the live session (`conversation.item.create` + `response.create`). Text reply streaming → stop square.
   - While voice is live the same button shows an **animated waveform** (4 bars, ~3 px wide, 2 px gap, ~16 px tall, min scale 0.4 so they stay legible in a 28 px button) and ends the session on click. Phase drives the animation: listening slow, speaking fast, connecting/thinking slower and slightly dimmed (opacity ≥ 0.75). Honor `prefers-reduced-motion`. No X button, no pulsing ring.
   - Status lives **in the composer, not around it**: the placeholder reads `Connecting…` / `Listening…` / `Thinking…` / `Speaking…`, plus an `sr-only` `role="status"`. No separate status row.
   - The **microphone icon is reserved for dictation** (`/add-dictation`). Never use it for voice mode.

6. **TS skeleton (default)**

```ts
const url = "wss://api.x.ai/v1/realtime?model=grok-voice-latest";
// Node: pass Authorization header. Browser: use xai-client-secret.<token> protocol.
const ws = new WebSocket(url /* , { headers: { Authorization: `Bearer ${token}` } } */);

ws.addEventListener("open", () => {
  ws.send(JSON.stringify({
    type: "session.update",
    session: {
      voice: "eve",
      instructions: "You are a helpful voice agent.",
      turn_detection: { type: "server_vad" },
    },
  }));
});

ws.addEventListener("message", (ev) => {
  const event = JSON.parse(String(ev.data));
  if (event.type === "response.output_audio.delta") {
    // decode base64 PCM and play
  }
});
```

7. **Python twin (only if the app is Python)**

```python
import json, os, websockets

url = "wss://api.x.ai/v1/realtime?model=grok-voice-latest"
headers = {"Authorization": f"Bearer {os.environ['XAI_API_KEY']}"}

async with websockets.connect(url, additional_headers=headers) as ws:
    await ws.send(json.dumps({
        "type": "session.update",
        "session": {
            "voice": "eve",
            "instructions": "You are a helpful voice agent.",
            "turn_detection": {"type": "server_vad"},
        },
    }))
    async for raw in ws:
        event = json.loads(raw)
        if event.get("type") == "response.output_audio.delta":
            pass  # decode and play
```

8. **Instrument (before the first human test)**
   - Run `/debug-voice`: it proposes a plan, then installs a dev-only log sink (`POST /api/voice/log` → `.voice-logs/<sessionId>.ndjson`, gitignored), a client logger with audio reduced to byte counts, and the session id in the UI, in the app's own language.
   - The same skill carries the fix loop and the symptom → log signature → fix table.

9. **Smoke**
   - Text turn via `conversation.item.create` + `response.create`; confirm audio or transcript events.
   - Confirm no long-lived key in client (grep the built client bundle for the env name and `client_secrets`).
   - Hand the app to the user with **headphones**. On speakers the mic hears the reply and the model answers itself; that is echo, not a bug in the loop.
   - Iterate with `/debug-voice`.

## Out of scope

- Speech-to-text only (`/add-dictation`), speaking text (`/add-read-aloud`)
- Image generation and text-only inference
- Invented endpoints, events, or CLI flags
