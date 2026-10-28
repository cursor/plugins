---
name: phonic-voices
description: Find, preview, and select Phonic voices for a language, accent, or speaking style. Use when a user wants to hear voice options, configure a voice ID, or randomly allocate voices across conversations.
license: MIT
---

# Find a Phonic voice

Point users to the [voice picker](https://phonic.ai/voices) to browse and listen. Use the [voices reference](https://docs.phonic.ai/docs/build/agents/voices) for voice IDs and descriptions. Use the connected `list_voices` tool (with its required model argument) or current SDK/API to verify availability, and `get_voice` for details when exposed. Tool prefixes and supported model values vary by client; inspect the schema rather than guessing them.

Start with the use case and the person the voice should evoke. Ask only for missing details that change the recommendation:

- What will this person do on the call, and who will they be speaking with?
- Which languages matter most, and which need occasional support?
- What personality, energy, accent, or speaking style fits the intended experience?

Use the language-proficiency ratings to prioritize the important languages, then match style and accent to the desired persona. Offer a small shortlist with verified voice IDs and a brief reason for each. For example, Sandeep can fit a realistic, tired, monotonous customer-support representative; Sabrina can fit a cheerful, chatty persona. Treat these as listening starting points and verify their current availability and target-language suitability.

Preview candidates with the same short, representative sentence in the intended language using `voices_preview` or the voice picker. Include domain terms and numbers when their pronunciation matters. If the client can play returned audio, let the user listen; otherwise point them to the voice picker or voices page. Do not claim to have heard audio that you could not play or inspect.

Set `voice_id` only within the requested agent/application change. Note that choosing a voice and setting the conversation's language are separate settings. For multilingual use, read the [multilingual guide](https://docs.phonic.ai/docs/build/agents/multilingual.md) and preview every important target language before recommending a final choice.

## Allocate voices across conversations

Choose based on the experience callers should have: should they recognize a consistent persona, or hear different members of a team? Use context already provided; ask only if this affects the choice and is unclear.

- **Fixed voice:** fits a recurring persona, such as a front-desk receptionist whom callers expect to recognize across calls.
- **Random voice set:** fits a team experience, such as customer service, where callers may hear a different representative on each call instead of always hearing the same voice. Random selection can still repeat a voice on consecutive calls.

Narrow the candidate set to voices suitable for the required languages and persona first.

Phonic supports equal-probability random allocation: set `voice_id` and `additional_voice_ids` on the agent. Each conversation receives one voice from their combined set. The additional list must exclude `voice_id` and contain no duplicates. Verify the exposed schema against the [agent API](https://docs.phonic.ai/api-reference/agents/create.md) before applying it. For example, a set with `voice_id: "sabrina"` and `additional_voice_ids: ["sandeep"]` selects either voice with equal probability; it does not alternate predictably.
