---
name: add-read-aloud
description: >-
  Use when the user runs /add-read-aloud or wants the app to speak text with
  Grok text-to-speech: read-aloud button on assistant replies, auto-speak, TTS,
  voice output, narration, IVR prompts, speech tags, voice_id. For a two-way
  voice agent use /add-voice. For speech-to-text use /add-dictation.
---

# Add Read Aloud

Add Grok Text to Speech to an existing app: a speaker button on assistant replies, auto-speak, or narration of any text. Run on `/add-read-aloud`, typed **Read aloud**, or clear “speak this” / “TTS” intent. Cursor has no speaker; wire the **app**, not the IDE.

## Docs

- https://docs.x.ai/developers/model-capabilities/audio/text-to-speech
- API reference: https://docs.x.ai/developers/rest-api-reference/inference/voice
- Custom voices: https://docs.x.ai/developers/model-capabilities/audio/custom-voices
- Pricing (cite docs only): https://docs.x.ai/developers/pricing

## Pick the path

| Need | Path |
| --- | --- |
| Tap speaker, hear the finished reply. Narrate a page. Generate a file. | **Batch** `POST https://api.x.ai/v1/tts` (default) |
| Audio starts while the LLM is still streaming; barge-in; texts over 15,000 chars | **Streaming** `wss://api.x.ai/v1/tts` through a backend relay |

Batch is the default for a read-aloud button: one request, one MP3, cacheable, the key never leaves the server. Go streaming only when the UX needs audio before the text is complete. `POST /v1/tts` has no documented streaming flag; do not invent one.

## Auth

- Bearer `XAI_API_KEY`, server side only. The TTS docs document no ephemeral-token flow, and browsers cannot set WebSocket headers, so browser streaming goes through your backend relay. Authenticate that upgrade with the app's existing session, check `Origin`, and bind `127.0.0.1`. `WebSocketServer({ port })` alone listens on every interface and spends the key for anyone who can reach it.
- Never put the key in a client bundle. Do not paste keys in chat.

## Steps

1. **Map the app**
   - Where assistant messages render, where per-message actions live (copy, regenerate), how the reply stream ends, server framework, package manager.
   - The **speaker icon belongs to read aloud**. Waveform is voice mode (`/add-voice`), microphone is dictation (`/add-dictation`). Put a ghost speaker button in the message action row; loading shows a spinner, playing shows a stop square. One utterance at a time: starting a new one stops the current one.
   - Align the action row to the reply’s **text edge**, not the button’s box: an icon button centres its glyph, so if the assistant bubble has no padding pull the row left by that inset (e.g. `-ml-[5px]` for a 12–14 px icon in a 24 px button). Measure in the browser; `getBoundingClientRect` on the `<p>` and the `<svg>` should share a left edge.
   - Render the button only once the reply has **finished streaming**; on a live message it would speak a partial reply.
   - With many messages on screen, keep player state (active message id, `loading | playing`, last error) in one shared store (`useSyncExternalStore`, a signal, whatever the app uses) so every button reflects it and errors can surface in the app's existing status area. A per-button `let current` is not enough.
   - Auto-speak: opt-in toggle, off by default, and only after a user gesture on the page (autoplay policy). Never auto-speak on load.
   - If `/add-voice` is installed, its `AudioContext` and PCM player can play streaming TTS; do not add a second audio graph.

2. **Prepare the text**
   - Speak prose, not markup. Strip markdown: headings → text, `**bold**` → text, links → link text, inline code → the code, fenced blocks → `[pause] Code block omitted.`, tables → one sentence per row or omit. Keep punctuation; it drives pacing.
   - Neutralise speech tags that arrive inside the reply (`[laugh]`, `<whisper>`…) so the model’s text cannot steer delivery. Strip only the **documented tag names** (list in step 5), not every bracket: `[1]` citations and `[note]` must survive.
   - Batch limit is **15,000 characters per request**. Split longer text on paragraph, then sentence, then word boundaries and play the parts in order; fetch part N+1 while N plays or there is a silent gap at every boundary. Or use streaming.
   - Cache by `hash(text + voice_id + language + speed)`; the same reply is often replayed.

3. **Batch path (default)**
   - Server: your route takes `{ text, voice_id?, language? }`, validates the shape of each (`voice_id` `^[a-z0-9-]{1,64}$`, `language` BCP-47 or `auto`), forwards JSON, streams the body back with the upstream `Content-Type` and `Cache-Control: no-store`. Map upstream 404 to “unknown voice” so the client gets a readable error. Default output is MP3 at 24 kHz / 128 kbps, playable everywhere in the browser.
   - `language`: default to `"auto"` for a chat app, where replies follow the user’s language; pin `"en"` etc. only for fixed-language products.

```ts
// server (any runtime with fetch)
export async function speak(text: string, voice_id = "eve", language = "auto") {
  if (!text.trim() || text.length > 15_000) throw new Error("TTS text must be 1–15,000 chars");
  const res = await fetch("https://api.x.ai/v1/tts", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.XAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      voice_id,
      language,                       // required: `auto` or BCP-47 (`en`, `pt-BR`); omitting it → 422
      // output_format: { codec: "mp3", sample_rate: 24000, bit_rate: 128000 }, // default
      // speed: 1.0,                  // 0.7–1.5
      // text_normalization: true,    // "$5" → "five dollars"
      // replace: { nginx: "/ˈɛndʒɪn ˈɛks/" },
    }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}`); // 400 bad text/format, 401 key, 404 unknown voice_id, 422 missing required field (e.g. language), 429/500/503 back off and retry
  return new Response(res.body, { headers: { "Content-Type": res.headers.get("content-type") ?? "audio/mpeg" } });
}
```

```ts
// client
let current: HTMLAudioElement | null = null;
async function readAloud(text: string, voiceId = "eve") {
  current?.pause(); current = null;                       // one utterance at a time
  const res = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, voice_id: voiceId }) });
  if (!res.ok) throw new Error("TTS request failed");
  const url = URL.createObjectURL(await res.blob());
  const audio = new Audio(url);
  audio.addEventListener("ended", () => URL.revokeObjectURL(url)); // avoid blob leaks
  current = audio;
  await audio.play();                                      // call from the click handler’s promise chain
}
function stop() { current?.pause(); current = null; }
```

   - Safari: `audio.duration` is `Infinity` on blob URLs. If you need a progress bar, decode with `AudioContext.decodeAudioData(buf.slice(0))` or request `with_timestamps: true` and read `duration` from the JSON envelope (audio is then base64 in `audio`).
   - Safari suspends an `AudioContext` created outside a gesture for good. Create it synchronously in the click handler, before any `await`.

4. **Streaming path**
   - Relay: server holds the key, authenticates the browser upgrade, binds localhost, builds the query string, queues client JSON until the upstream socket is open, then forwards client JSON up and server JSON down. Prefer attaching the upgrade to the app HTTP server so the session cookie is on the request. Request `codec=pcm` for the browser: raw PCM16 chunks can be scheduled as they arrive, while MP3 chunks cannot be decoded piecemeal without `MediaSource`.

```ts
import { WebSocketServer, WebSocket } from "ws";

new WebSocketServer({
  port: 8789,
  host: "127.0.0.1",
  verifyClient: ({ origin, req }) =>
    origin === (process.env.APP_ORIGIN ?? "http://localhost:3000") && Boolean(req.headers.cookie), // replace cookie with the app session
}).on("connection", (client) => {
  const q = new URLSearchParams({ language: "en", voice: "eve", codec: "pcm", sample_rate: "24000" /* optimize_streaming_latency: "1" */ });
  const up = new WebSocket(`wss://api.x.ai/v1/tts?${q}`, { headers: { Authorization: `Bearer ${process.env.XAI_API_KEY}` } });
  const pending: string[] = [];
  up.on("open", () => { for (const m of pending) up.send(m); pending.length = 0; });
  up.on("message", (d) => client.send(d.toString()));                                   // audio.delta, audio.done, audio.clear, session.updated, error
  client.on("message", (d) => {
    const msg = d.toString();
    if (up.readyState === WebSocket.OPEN) up.send(msg);
    else pending.push(msg);                                                             // text.delta can arrive before upstream is open
  });
  const end = () => { pending.length = 0; client.close(); up.close(); };
  up.on("close", end); up.on("error", end); client.on("close", end);
});
```

   - Client: one socket per chat session (it stays open across utterances; 50 concurrent sessions per team, permit TTL 600 s, so reconnect on close). Forward LLM tokens as `text.delta` (each ≤ 15,000 chars), send `text.done` when the reply finishes, `text.clear` on stop or when a new reply starts; drop queued audio on `audio.clear`.

```ts
const ws = new WebSocket(relayUrl);
const ctx = new AudioContext({ sampleRate: 24000 }); // create in the click handler; resume if suspended
let playhead = 0, sources: AudioBufferSourceNode[] = [];

ws.addEventListener("message", (e) => {
  const ev = JSON.parse(e.data);
  if (ev.type === "audio.delta") {
    const bytes = Uint8Array.from(atob(ev.delta), (c) => c.charCodeAt(0));
    const pcm = new Int16Array(bytes.buffer, 0, bytes.byteLength >> 1);
    const buf = ctx.createBuffer(1, pcm.length, 24000);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 32768;
    const src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination);
    playhead = Math.max(playhead, ctx.currentTime + 0.15);   // ~150 ms lead so chunks butt together
    src.start(playhead); playhead += buf.duration; sources.push(src);
  } else if (ev.type === "audio.done") { /* utterance finished; socket stays open */ }
  else if (ev.type === "audio.clear") { sources.forEach((s) => s.stop()); sources = []; playhead = 0; }
  else if (ev.type === "error") showError(ev.message);
});
// on each LLM token:  ws.send(JSON.stringify({ type: "text.delta", delta: token }))
// on reply finished:  ws.send(JSON.stringify({ type: "text.done" }))
// on stop / barge-in: ws.send(JSON.stringify({ type: "text.clear" }))  → wait for audio.clear before the next text.delta
```

   - Words split across `text.delta` boundaries are fine; matching and synthesis run across deltas.

5. **Options** (JSON fields for batch, query params for streaming)

| Want | Set |
| --- | --- |
| Different voice | `voice_id` (batch) / `voice` (streaming). Built-ins from `GET /v1/tts/voices`: `eve` (default), `ara`, `rex`, `leo`, `luna`, `atlas`, `aurora`, `orion`, … 28 total, all multilingual, case-insensitive. Custom voice: 8-char id from the console or `GET /v1/custom-voices` |
| Non-English or mixed | `language`: `en`, `ar-EG`, `ar-SA`, `ar-AE`, `bn`, `zh`, `fr`, `de`, `hi`, `id`, `it`, `ja`, `ko`, `pt-BR`, `pt-PT`, `ru`, `es-MX`, `es-ES`, `tr`, `vi`, or `auto` |
| Faster or slower | `speed` 0.7–1.5 |
| “$5”, “Dr.”, “3/4” spoken as words | `text_normalization: true` |
| Brand names, acronyms, jargon | `replace: { "Acme Mobile": "Acme Mobull", "nginx": "/ˈɛndʒɪn ˈɛks/" }`; ≤200 entries, keys ≤100 chars (letters, digits, apostrophes, spaces), values ≤128; whole-word, case-insensitive, longest match wins. Streaming: `session.update { replace }` before the first `text.delta` |
| Expressive delivery | Inline `[pause]`, `[long-pause]`, `[laugh]`, `[chuckle]`, `[giggle]`, `[cry]`, `[sigh]`, `[breath]`, `[inhale]`, `[exhale]`, `[tsk]`, `[tongue-click]`, `[lip-smack]`, `[hum-tune]`. Wrapping `<whisper>`, `<soft>`, `<loud>`, `<emphasis>`, `<build-intensity>`, `<decrease-intensity>`, `<slow>`, `<fast>`, `<higher-pitch>`, `<lower-pitch>`, `<singing>`, `<sing-song>` around whole phrases |
| Captions, karaoke, lip-sync | `with_timestamps: true` → JSON `{ audio (base64), content_type, duration, audio_timestamps: { graph_chars[], graph_times[][start,end] } }`; step through `graph_chars` in order, never slice input by index |
| First audio sooner (streaming) | `optimize_streaming_latency=1` (docs also list `2`; API reference lists `0`/`1`) |
| Telephony / IVR | `output_format: { codec: "mulaw" \| "alaw", sample_rate: 8000 }`; not playable in browsers |
| Editing, post-production | `codec: "wav"`, `sample_rate: 44100` or `48000` |
| Smaller files | `codec: "mp3"`, `bit_rate: 64000` |

6. **Python twin (only if the server is Python)**

```python
import os, requests
r = requests.post(
    "https://api.x.ai/v1/tts",
    headers={"Authorization": f"Bearer {os.environ['XAI_API_KEY']}"},
    json={"text": text, "voice_id": "eve", "language": "en"},
)
r.raise_for_status(); audio_bytes = r.content  # audio/mpeg
# streaming: websockets.connect(url, additional_headers={"Authorization": f"Bearer {key}"}); send {"type":"text.delta",...}, {"type":"text.done"}; read audio.delta / audio.done
```

7. **Smoke**
   - Batch: `curl -X POST https://api.x.ai/v1/tts -H "Authorization: Bearer $XAI_API_KEY" -H "Content-Type: application/json" -d '{"text":"Hello from read aloud.","voice_id":"eve","language":"en"}' --output /tmp/hello.mp3` → 200 `audio/mpeg` (MP3, 24 kHz, 128 kbps, mono), plays. Omit `language` → 422 (observed; the docs’ table only lists 400). `voice_id: "nope"` → 404.
   - In the app: no speaker while a reply streams; it appears when the reply ends. Click → spinner → stop square → back to speaker when audio ends; click again mid-play → stops at once; click a second reply while the first plays → first stops, second plays. Safari: first play works from the click, `URL.revokeObjectURL` fires on `ended`.
   - Text prep: a reply with a fenced block, a table, a `[1]` citation and a stray `[laugh]` → spoken as “Code block omitted”, one sentence per row, the citation intact, the tag gone. Unit-test this; it is pure.
   - Streaming: send a two-sentence reply token by token; audio should start before `text.done`. Send `text.clear` mid-utterance → `audio.clear`, playback stops with nothing stale. Second utterance on the same socket → fresh `audio.delta`s, no bleed from the first.
   - Search the client bundle for `XAI_API_KEY`; it must not be there. Against a running dev server, fetch `/`, collect the `/_next/static/chunks/*.js` (or equivalent) URLs it references, and grep each; do not rely on a production build you have not made.
   - Debug from logs with `/debug-voice`; swap its hook points to `audio.delta` (byte counts), `audio.done`, `audio.clear`, `error`.

## Out of scope

- A voice agent that listens and answers (`/add-voice`), speech to text (`/add-dictation`)
- Voice cloning beyond passing an existing custom `voice_id`
- Inventing a TTS token flow, a `stream` flag on `POST /v1/tts`, or event names not in the docs
