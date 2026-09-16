---
name: debug-voice
description: >-
  Use when the user runs /debug-voice, says voice mode has flaws, asks to see or
  capture what happened in a Grok realtime voice session, or a voice integration
  has no debug logging yet. Proposes a plan, then installs a dev-only log
  pipeline (client logger → local NDJSON) in the app's own language and
  conventions, then runs the fix loop: match the user's report to log
  signatures, fix one thing, re-test.
---

# Debug Voice

Make a voice session readable after the fact, then fix from evidence. The agent cannot hear the app; the log is its ears, the user is its judge. No audio, no tokens, never in prod.

Works for any stack. The pipeline is a small contract (below); implement it in whatever the app already uses.

## Workflow

1. **Map** the app (read only).
2. **Plan**: write the change list, show it, **stop**. Nothing is edited until the user aligns.
3. **Install** the agreed pieces in the app's language, framework, and conventions.
4. **Verify** the sink, hand the app to the user.
5. **Fix loop** from the log.

## 1. Map

Find, and note the paths:

- Voice client: where realtime events are received and sent, mic capture, audio playback, token fetch.
- Server: framework, how routes are declared, where shared server code lives, how env is read, what "production" means here.
- Conventions: language(s), module system, formatter, where scripts or tasks live (`package.json`, `Makefile`, `pyproject`, `justfile`), `.gitignore`.
- Client kind: browser, mobile, desktop, CLI. A non-browser client still POSTs the same JSON; a single-process app can skip HTTP and append to the file directly.
- Where audio deltas are handled. They must be counted, never logged.

## 2. Plan, then stop

Fill this in with real paths and the app's language, post it, and wait for a yes or a trimmed list. Do not edit files before that.

```markdown
## Debug voice: plan

Add
- <path>: client logger (batch, redact, flush) in <language>
- <path>: dev-only sink `POST /api/voice/log` → `.voice-logs/<sessionId>.ndjson`
- <path> (optional): summary command `<cmd>`; otherwise read the NDJSON with jq

Modify
- <voice client file>: hook points start, token, mic, env, ws.*, client/server events,
  audio.in (2 s windows), audio.out.first, audio.out, play.stop, stop
- <token route>: append `server.token { ok, status, ms, upstream }` (never the token)
- <UI file>: session id in the voice status line and in voice error messages
- .gitignore: `/.voice-logs`
- <scripts file>: a `voice:logs` task (only if the summary command is wanted)

Logged: event names and non-audio fields, timings, byte counts, mic RMS.
Never: tokens, API keys, raw audio, strings over 400 chars.
Off in production unless `VOICE_LOG=1`.

Reply "go", or strike lines you do not want.
```

## 3. Install: the contract

Match the app. Same language as the surrounding code, same route style, same formatter. Write the pieces from the contract below; do not introduce a second language or toolchain for logging.

**Session id**: 8 lowercase hex chars from a UUID. The sink accepts `^[a-z0-9]{4,64}$`; it becomes a file name.

**Entry** (one JSON object per line):

| Field | Client | Server |
| --- | --- | --- |
| `t` | ms since the logger started | absent; the reader aligns by `ts` |
| `ts` | epoch ms | epoch ms |
| `kind` | `start`, `server`, `client`, `error`, `audio.in`, … | `server.token`, … |
| `src` | absent | `"server"` |
| rest | the hook's fields, redacted | the hook's fields |

**Redaction, applied client side before buffering**: on audio event types (`response.output_audio.delta`, `response.audio.delta`, `input_audio_buffer.append`) replace `delta` / `audio` with `bytes` = decoded base64 length; strings over 400 chars cut to 400 + `…[N chars]`; objects deeper than 4 → `"[depth]"`; arrays over 50 items truncated.

**Client logger**: buffer entries; flush as `POST <sink> {"sessionId","entries":[…]}` every 1 s or at 200 entries; on stop flush with keepalive (or the platform's "survive navigation" equivalent); swallow every transport error, logging must never throw into the voice path. Also mirror entries to the console in dev.

**Sink**: `POST /api/voice/log`, JSON body. `404` unless dev or `VOICE_LOG=1`. `400` if `sessionId` fails the regex or `entries` is not an array. Append at most 500 entries per request, drop any line over 16,000 chars, to `.voice-logs/<sessionId>.ndjson`, creating the directory. Reply `204`.

Pseudocode for any server:

```
handle POST /api/voice/log:
  if production and VOICE_LOG != "1": return 404
  body = parse json or return 400
  if not regex(body.sessionId) or not list(body.entries): return 400
  mkdir .voice-logs; append join(json(e) for e in body.entries[:500] if len < 16000) to .voice-logs/{sessionId}.ndjson
  return 204
```

Pseudocode for the client logger:

```
logger(sessionId, sink):
  buffer = []; started = now()
  log(kind, data): buffer.push({ ...redact(data), t: now() - started, ts: epoch_ms(), kind }); schedule flush (1 s timer, or immediately at 200 entries)
  server(event, extra): log("server", { ...redact_event(event), ...extra })   # never per audio delta
  client(event):        log("client", redact_event(event))                    # never per audio chunk
  error(where, err, extra): log("error", { where, name, message, ...extra })
  flush(final=false): POST sink {"sessionId","entries": buffer}; buffer = []; ignore all errors; keepalive when final
  close(): flush(final=true)
```

## Hook points

`kind` and fields; the shape is the same in every language.

| When | `kind` and fields |
| --- | --- |
| Session start | `start { url, target_rate }` |
| Token fetched / failed | `token.ok { ms }` / `error { where: "token", name, message, ms }` |
| Mic granted / denied | `mic.ok { ms, label, settings }` / `error { where: "mic", … }` |
| Audio graph ready | `env { ua, mic_rate, mic_state, play_rate, play_state, capture_frames, target_rate }` |
| Socket | `ws.connecting`, `ws.open { ms }`, `ws.error`, `ws.close { code, reason, wasClean, by }` |
| Every event sent, except audio chunks | `client { …redacted event }` |
| Every event received, except audio deltas | `server { …redacted event, phase }` |
| Phase change (dedupe) | `phase { phase }` |
| Mic chunks, aggregated per 2 s | `audio.in { chunks, bytes, rms_max, rms_avg, pending, mic_state, phase }` |
| Pre-open buffer sent on open | `audio.flush { chunks }` |
| First audio delta of a response | `audio.out.first { response_id, bytes, since_response_created_ms, since_speech_stopped_ms, play_state }` |
| `response.done` | `audio.out { response_id, status, deltas, bytes, audio_ms, wall_ms, max_gap_ms, queued_ms, underruns, drain_ms_max }` |
| Barge-in stop | `play.stop { reason, dropped_ms }` |
| User stop | `stop { by: "client", phase }`, then flush |
| Token route (server) | `server.token { ok, status, ms, upstream }` |

In the message handler: if the event is an audio delta, count bytes and gaps and play it; otherwise log it as `server` with the current phase, then run the existing handling. Keep `speechStoppedT` from `input_audio_buffer.speech_stopped` and `createdT` from `response.created`; report both distances on the first delta. In the player, count an underrun when the next scheduled time is already in the past mid-response, track the largest drain, reset on `response.created`.

UI: show the id in the voice status line (`Listening · session ab12cd34`) and append `(voice session <id>)` to voice errors, so the user can name the run.

## 4. Verify

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:<port>/api/voice/log \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"smoke001","entries":[{"t":0,"ts":0,"kind":"start"}]}'   # 204
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:<port>/api/voice/log \
  -H 'Content-Type: application/json' -d '{"sessionId":"../x","entries":[]}' # 400
cat .voice-logs/smoke001.ndjson && rm .voice-logs/smoke001.ndjson
```

Then hand off: the user tests in the real app and reports what they said, what they heard, when it went wrong, and the session id.

## Reading a log

Any of these; none needs the app's toolchain:

```bash
f=.voice-logs/<id>.ndjson
jq -r 'select(.kind|IN("start","token.ok","mic.ok","env","ws.open","ws.close","server.token","stop","error")) | "\(.t // .ts)ms \(.kind) \(.type // "") \(.message // "")"' $f   # milestones and errors
jq -r 'select(.kind=="server") | .type' $f | sort | uniq -c | sort -rn                      # server event counts
jq -c 'select(.kind|IN("audio.out.first","audio.out"))' $f                                  # per-turn latency, gaps, underruns
jq -c 'select(.kind=="audio.in")' $f                                                        # mic windows, rms
```

Or read the file; it is one object per line in time order. Server entries have only `ts`; align them to the client clock with the `start` entry's `ts`. If the user wants a summary command, write one in the app's language that prints: milestones, server event counts, one line per `audio.out` turn with its `audio.out.first` latencies, mic window totals, errors and closes, and the last 25 entries.

## 5. Fix loop

1. **Instrument** (steps 1–4) if the app has no `.voice-logs` pipeline yet.
2. **User tests** in the real app and describes the run.
3. **Read the log** around the failing `t`.
4. **Match** symptom → signature → fix (table below). No matching signature: add logging first, re-test, then fix.
5. **Fix one thing**, re-test, confirm the signature is gone in a fresh log.
6. **Write it down**: append a confirmed row under "Confirmed from sessions". If the fix changes how voice should be built, update `/add-voice` too.

## Symptom → log signature → fix (starter rows)

| Symptom (user) | Signature (log) | Fix |
| --- | --- | --- |
| Silence, but transcript appears | `env.play_state` or `audio.out.first.play_state` = `suspended` | Create and resume the playback audio context inside the user gesture; one context per session, not per turn |
| Assistant interrupts itself | `speech_started` with `phase=speaking`; `audio.in.rms_max` rises only during playback | Echo. Confirm with headphones (if it stops, it is echo). Keep echo cancellation on, lower speaker volume, or gate mic sends while `speaking` |
| Choppy, stuttering | `audio.out.underruns` > 0, `drain_ms_max` high, `max_gap_ms` far above chunk length | Schedule a small lead (150–250 ms) before the first chunk plays; do not rebuild the audio context per turn |
| Crackle, wrong pitch or speed | `session.update` rate ≠ buffer rate; odd `bytes` | One rate everywhere (`audio.input/output.format.rate`, player buffer); even-byte alignment |
| Never connects, or closes at once | `ws.close` before `session.updated`; `server.token.ok=false` | Mint a token per click (300 s), protocol `xai-client-secret.<token>`, `model` in URL; read `server.token.status` and `upstream` |
| Mic does nothing | `audio.in.rms_max` ≈ 0 in every window; `mic.ok.label` unexpected | Wrong device or OS permission; check `mic.ok.settings`, `label`, `mic_state` |
| No user transcript | no `conversation.item.input_audio_transcription.updated` | Set `audio.input.transcription.model: "grok-transcribe"` in `session.update` |
| Slow first word | `audio.out.first.since_speech_stopped_ms` high | Try `reasoning.effort: "none"`; shorter `instructions`; check `token.ok.ms` and `ws.open.ms` for connect cost |
| User text appears after the reply | `...transcription.updated` `t` > `response.created` `t` | Create the user row on `input_audio_buffer.committed` (`item_id`), fill it on `updated` |
| First words cut off | `ws.open.ms` large and `audio.flush.chunks` at the buffer cap | Start mic before the socket, buffer early audio, raise the pre-open cap |

## Confirmed from sessions

Append after a fix is verified in a fresh log. Format: `YYYY-MM-DD · symptom · signature · fix · file(s)`.

## Rules

- Plan first; no edits before the user aligns on the change list.
- Never tokens, keys, or raw audio. Audio becomes byte counts.
- Dev only. The sink returns 404 in production unless `VOICE_LOG=1`. `.voice-logs/` is gitignored.
- Logging never throws into the voice path.
- Aggregate audio; never log per chunk.
- One change per re-test so the log tells you which fix worked.
- Do not invent xAI event names; confirm in https://docs.x.ai/developers/model-capabilities/audio/speech-to-speech before adding a signature.
