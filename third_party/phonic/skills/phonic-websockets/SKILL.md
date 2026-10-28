---
name: phonic-websockets
description: Build Phonic browser voice sessions and server audio bridges. Use for STS configuration, audio streaming, transcript events, interruptions, and reconnects.
license: MIT
---

# Build Phonic voice connections

SDKs: `npm install phonic` / `pip install phonic`. Entry points: `new PhonicClient({ apiKey })` (Node), `Phonic(api_key=...)` / `AsyncPhonic(...)` (Python). REST base: `https://api.phonic.ai/v1` with `Authorization: Bearer $PHONIC_API_KEY`. Always use the `.ai` domain for API and docs URLs — `phonic.co` addresses still resolve for backward compatibility, but all new code should use `phonic.ai`.

Fetch live docs rather than from memory: use the index at [llms.txt](https://docs.phonic.ai/llms.txt). For the REST API, see [openapi.json](https://docs.phonic.ai/openapi.json). For the WebSocket protocol, see [asyncapi.json](https://docs.phonic.ai/asyncapi.json). If an endpoint does not appear in these docs, it doesn't exist, do not invent one.

## Config message

Every conversation begins with a `config` message:

- Minimal `config` message: `{ "type": "config", "agent": "my-cool-agent", "input_format": "pcm_44100", "output_format": "pcm_44100" }` (pick the audio formats that match your use case).
- For prototyping, it is possible to send the config without a named agent by carrying `system_prompt`, `welcome_message`, `voice_id`, `tools`, and more inline (see the config schema in [asyncapi.json](https://docs.phonic.ai/asyncapi.json)). However, for long-term projects we recommend creating an agent to be able to track version changes, reuse the agent config across different conversation mediums, and avoid frequent redeployments.
- Unknown fields and out-of-bounds values are rejected with `{"error": {"message": "Invalid parameters"}}` plus a `param_errors` object naming each offending field — read it, and treat a config rejection as fatal (a reconnect loop must not resend the same config). Field bounds are documented on the docs pages, but the served `asyncapi.json` artifact currently omits constraint keywords (`minimum`/`maximum`/`const`) — a field looking unconstrained in the artifact doesn't mean it is.

## Browser voice

This is the recommended pattern for building Phonic into a browser:

1. Server side, exchange the API key for a session token with the SDK — `client.auth.createSessionToken({ ttl_seconds: 300 })` (`POST /v1/auth/session_token`). The API key stays on the server — in Next.js, never put it in a `NEXT_PUBLIC_*` env var (those are compiled into client code).
2. The browser connects directly to `wss://api.phonic.ai/v1/sts/ws?session_token=<token>` (token in the query string — browsers can't set WebSocket headers). Don't add a relay server in between; the direct connection is the supported, lowest-latency pattern.
3. Send the config message (see [Config message](#config-message) above).
4. Send and receive audio as base64 16-bit PCM `audio_chunk` messages. We recommend to use chunks of ~20ms (chunks longer than 40ms are rejected with error); note mic access requires a secure context — HTTPS or localhost.
5. The client can also send messages during the call: `add_system_message`, `update_tools_subset`, `set_external_id`, `mute` / `unmute`, `generate_reply` (force a turn), and `say` — schemas in [asyncapi.json](https://docs.phonic.ai/asyncapi.json). These enable patterns like pushing app state into the conversation or a button that makes the agent speak. Note that `update_system_prompt` is deprecated; use `add_system_message` instead.
6. Turn lifecycle comes from explicit events: `assistant_started_speaking` / `assistant_finished_speaking` and `user_started_speaking` / `user_finished_speaking`. When building a transcript UI, start a new assistant entry on `assistant_started_speaking`, not on the first audio chunk — trailing `audio_chunk`s (often with empty text) can arrive after `assistant_finished_speaking`, and keying entries on chunks creates ghost transcript items. Interrupts are signaled by `user_started_speaking`; flush queued playback there.
7. Long sessions need a reconnect loop (there's no browser SDK to do it for you): on a drop, retry with backoff and mint a fresh session token per attempt; classify failures first — network blips are retryable, auth failures (revoked key, expired grant) must stop retrying and surface to the user.

Reference implementations: [phonic-web-demo](https://github.com/Phonic-Co/phonic-web-demo) (Next.js browser voice) and [phonic-examples](https://github.com/Phonic-Co/phonic-examples) (quick start, webhooks, websocket conversations, websocket tools — TS and Python).

## Server audio bridges

- Server audio bridge: `client.conversations.connect()` (context manager in Python: `with client.conversations.connect() as socket: for message in socket: ...`).

- **Server-side reconnects** The SDK's `conversations.connect()` reconnects automatically on abnormal disconnects and resumes the same conversation — opt in with `reconnectConversationOnAbnormalDisconnect: true` (client or per-connect option).
