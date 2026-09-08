---
name: add-dictation
description: >-
  Use when the user runs /add-dictation or wants speech turned into text with
  Grok speech-to-text: a mic button that dictates into the composer, live
  captions, or transcribing recorded audio (files, uploads, URLs) with word
  timestamps, diarization, subtitles, meeting notes. STT, transcribe,
  transcription. For a voice agent that talks back use /add-voice.
---

# Add Dictation

Add Grok Speech to Text to an existing app: a mic button that dictates into the composer, live captions, or transcripts of recorded audio. Run on `/add-dictation`, typed **Dictate**, or clear “transcribe” intent. Cursor has no mic; wire the **app**, not the IDE.

## Docs

- https://docs.x.ai/developers/model-capabilities/audio/speech-to-text
- Pricing (cite docs only): https://docs.x.ai/developers/pricing

## Pick the path

| Need | Path |
| --- | --- |
| Tap, speak, tap, text appears. Uploaded files. URLs. | **Batch** `POST https://api.x.ai/v1/stt` (default) |
| Text appears while speaking: captions, long dictation, push-to-talk | **Streaming** `wss://api.x.ai/v1/stt` through a backend relay |

Batch is the default for a composer mic button: one request, no socket, the key never leaves the server. Go streaming only when the UX needs interim text.

## Auth

- Bearer `XAI_API_KEY`, server side only. The STT docs document no ephemeral-token flow, and browsers cannot set WebSocket headers, so browser streaming goes through your backend relay. Authenticate that upgrade with the app's existing session, check `Origin`, and bind `127.0.0.1`. `WebSocketServer({ port })` alone listens on every interface and spends the key for anyone who can reach it. Do not invent a token flow.
- Never put the key in a client bundle. Do not paste keys in chat.

## Steps

1. **Map the app**
   - Composer or input component, where the text should land (insert at cursor vs replace), server framework, package manager.
   - The **microphone icon belongs to dictation**. If `/add-voice` is installed, its waveform primary button stays as is; add the mic as a secondary ghost button beside it.
   - Existing mic capture? If `/add-voice` ran, its PCM capture can feed streaming STT; pass its rate as `sample_rate`. 16 kHz is the model’s native rate; other supported rates (8000, 16000, 22050, 24000, 44100, 48000) are resampled server side.

2. **Batch path (default)**
   - Client: `MediaRecorder` → `Blob` → `POST` to your own route. The endpoint auto-detects containers (WAV, MP3, OGG, Opus, FLAC, AAC, MP4, M4A, MKV, WebM), so send whatever `MediaRecorder` produces.
   - Server: forward as `multipart/form-data`. Option fields first, **`file` last**; fields after `file` may be ignored. `file` or `url`, max 500 MB.

```ts
// server (any runtime with fetch + FormData)
export async function transcribe(blob: Blob, filename: string) {
  const form = new FormData();
  form.append("format", "true");     // written-form numbers/currency; requires language
  form.append("language", "en");
  // form.append("keyterm", "Acme"); // repeat per term, ≤100 terms × 50 chars
  form.append("file", blob, filename); // last
  const res = await fetch("https://api.x.ai/v1/stt", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.XAI_API_KEY}` },
    body: form,
  });
  if (!res.ok) throw new Error(`STT ${res.status}`); // 400 bad input, 413 >500 MB, 429 back off, 502 url fetch failed, 503 retry
  return (await res.json()) as {
    text: string; language: string; duration: number;
    words?: { text: string; start: number; end: number; speaker?: number }[];
    channels?: { index: number; text: string; words: unknown[] }[];
  };
}
```

```ts
// client
const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/mp4";
const rec = new MediaRecorder(stream, { mimeType: mime });
const parts: BlobPart[] = [];
rec.ondataavailable = (e) => parts.push(e.data);
rec.onstop = async () => {
  const fd = new FormData();
  fd.append("file", new Blob(parts, { type: mime }), "dictation");
  const { text } = await (await fetch("/api/dictation", { method: "POST", body: fd })).json();
  insertAtCursor(text);
};
rec.start(); // second tap: rec.stop()
```

3. **Streaming path**
   - Relay: server holds the key, authenticates the browser upgrade, binds localhost, forwards binary frames and client control messages up, JSON events down. Build the query string server side. Prefer attaching the upgrade to the app HTTP server so the session cookie is on the request.

```ts
import { WebSocketServer, WebSocket } from "ws";

new WebSocketServer({
  port: 8788,
  host: "127.0.0.1",
  verifyClient: ({ origin, req }) =>
    origin === (process.env.APP_ORIGIN ?? "http://localhost:3000") && Boolean(req.headers.cookie), // replace cookie with the app session
}).on("connection", (client) => {
  const q = new URLSearchParams({ sample_rate: "16000", encoding: "pcm", interim_results: "true", language: "en" });
  const up = new WebSocket(`wss://api.x.ai/v1/stt?${q}`, { headers: { Authorization: `Bearer ${process.env.XAI_API_KEY}` } });
  up.on("message", (d) => client.send(d.toString()));                       // transcript.* and error events
  client.on("message", (d, isBinary) => up.readyState === WebSocket.OPEN && up.send(d, { binary: isBinary })); // audio + finalize/audio.done
  const end = () => { client.close(); up.close(); };
  up.on("close", end); up.on("error", end); client.on("close", end);
});
```

   - Browser capture: PCM16 little-endian, mono, 16 kHz, **100 ms frames = 3,200 bytes**, raw binary, no base64. Wait for `transcript.created` before sending. `MediaRecorder` output is a container, not raw frames; do not stream it.

```ts
const ws = new WebSocket(relayUrl); ws.binaryType = "arraybuffer";
const ctx = new AudioContext({ sampleRate: 16000 }); // if ctx.sampleRate !== 16000, downsample in the worklet
await ctx.audioWorklet.addModule("/pcm16-worklet.js"); // Float32 → Int16LE, posts one 3,200-byte frame per 100 ms
const node = new AudioWorkletNode(ctx, "pcm16");
ctx.createMediaStreamSource(stream).connect(node);
let ready = false;
node.port.onmessage = (e) => ready && ws.readyState === WebSocket.OPEN && ws.send(e.data);

let committed = "", locked = "", live = "";
ws.addEventListener("message", (e) => {
  const ev = JSON.parse(e.data);
  if (ev.type === "transcript.created") ready = true;
  else if (ev.type === "transcript.partial") {
    if (ev.speech_final) { committed += ev.text + " "; locked = ""; live = ""; } // complete stitched utterance
    else if (ev.is_final) { locked += ev.text + " "; live = ""; }                // chunk final: text will not change
    else live = ev.text;                                                          // interim: may change
    render(committed + locked + live);
  } else if (ev.type === "transcript.done") ws.close();                          // after audio.done
  else if (ev.type === "error") showError(ev.message);                           // most errors close the socket
});
// stop: ws.send(JSON.stringify({ type: "audio.done" }))
// push-to-talk release: ws.send(JSON.stringify({ type: "Finalize" })) then keep streaming (docs show both `finalize` and `Finalize`; the examples use `Finalize`)
```

4. **Options** (query params for streaming, form fields for batch)

| Want | Set |
| --- | --- |
| Text while speaking | `interim_results=true` |
| “one hundred dollars” → `$100` | streaming: `language=en`; batch: `format=true` + `language=en` |
| Product names, jargon | `keyterm=` repeated |
| Not cut off mid-sentence while dictating numbers | `smart_turn=0.7&smart_turn_timeout=3000` |
| Faster or slower end of utterance | `endpointing=` ms, default 400 |
| Who said what (meetings) | `diarize=true` → `words[].speaker` |
| Agent and customer on separate channels | `multichannel=true&channels=2` (PCM only, not Opus) |
| Keep “um”, “uh” | `filler_words=true` (removed by default) |
| Low bandwidth or mobile | `encoding=opus`, exactly one raw Opus packet per frame, omit `sample_rate` |
| Raw audio to batch | `audio_format=pcm|mulaw|alaw` + `sample_rate` |
| Quiet or telephony audio | lower `vad_threshold` (streaming default 0.08, batch 0.5) |

5. **Python twin (only if the server is Python)**

```python
import os, requests
r = requests.post(
    "https://api.x.ai/v1/stt",
    headers={"Authorization": f"Bearer {os.environ['XAI_API_KEY']}"},
    data=[("format", "true"), ("language", "en")],
    files={"file": ("dictation.webm", blob, "audio/webm")},  # requests sends data fields before files
)
r.raise_for_status(); text = r.json()["text"]
# streaming: websockets.connect(url, additional_headers={"Authorization": f"Bearer {key}"}); await ws.send(pcm_bytes)
```

6. **Smoke**
   - Batch: `curl -X POST https://api.x.ai/v1/stt -H "Authorization: Bearer $XAI_API_KEY" -F language=en -F file=@short.wav` → 200 with `text`. Same call with `-F format=true` and no `language` → 400.
   - Streaming: dictate two sentences with a pause between them. Expect interim text, then a final; no duplicated or vanished words at the utterance boundary (if words vanish, the stitched `speech_final` text did not include the chunk finals: append instead of replacing `locked`). `audio.done` → `transcript.done`, socket closes.
   - Search the client bundle for `XAI_API_KEY`; it must not be there.
   - Debug from logs with `/debug-voice`; swap its hook points to `transcript.*` events.

## Out of scope

- Speech that talks back (`/add-voice`), speaking text (`/add-read-aloud`)
- Inventing an STT token flow, endpoints, or event names not in the docs
