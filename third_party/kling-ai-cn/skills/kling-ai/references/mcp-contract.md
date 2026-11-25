# Kling MCP input and output contract

This reference records only stable tool-level constraints. Always take models, defaults, enums, required fields, item limits, and media inputs from the current `tools/list` and `who_am_i` response.

## Tool groups

- Discovery and account: `who_am_i`, `query_membership_and_credits`, `logout`
- Generation and status: `text_to_image`, `image_to_image`, `text_to_video`, `image_to_video`, `omni_ref_video`, `motion_control`, `query_tasks`
- Media and reuse: `file_upload`, `motion_library_list`, `element_create`, `element_list`, `element_get`, `element_update`, `element_delete`

Call only tools that exist in the current tool list.

## Generation request

- Generation tools normally use `model`, `arguments[]`, `inputs[]`, `rationale`, and `taskTraceId`; the live tool `inputSchema` defines the actual outer request and encoding. Omit unused inputs when allowed, but never omit required media.
- Always pass the canonical model ID from `who_am_i` for the selected tool in the top-level `model` field, even if an older tool schema omits it from `required`. If the user did not name a model, select a compatible one and pass its ID. Reject missing, null, empty, or whitespace-only values.
- Each `arguments[]` item is `{name, value}`. Include every required argument once and use strings for values when the schema requires them. Include a meaningful `prompt` when required. Use an empty prompt only when the current mode permits it and it fits the user's intent. Use the selected model's exact resolution field, enum, and conditions.
- Each `inputs[]` item is `{name, inputType, url}`. Bind every required media input to the selected model's exact slot and use the tool schema's literal `inputType`, including uppercase `URL` when declared. Pass uploaded references according to the [media upload workflow](asset-workflows.md#local-media-uploads).
- `rationale` explains the user's objective and parameter choices. It does not replace the generation prompt.
- `taskTraceId` is a UUIDv7. Reuse it for one objective and create a fresh value for an unrelated objective. It supports tracing and does not make a repeated generation call idempotent.

Follow [capability discovery](capability-discovery.md) before submission and reuse its successful response for the same preparation unless invalidated. Model capabilities come from `who_am_i`, while request structure comes from the tool `inputSchema`; general descriptions do not expand model capabilities. Refresh inconsistent definitions and stop if no valid request satisfies both. Apply the selected model's [parameter and combination constraints](model-parameters.md).

## Stable gates

- Element support is model-specific, not determined by an entry point's name. Do not pass an Element or prompt binding unless the selected model explicitly declares the binding argument and support for that resource type.
- Call `element_get` before using an Element. Check `elementSupport`, required media, individual and combined caps, and reference-video conditions for the selected model, including omni reference.
- `motion_control` requires a subject image. Follow the tool description when choosing exactly one motion source: a library `motionId` or a source video.
- When a model requires media from `file_upload`, do not pass a local path or arbitrary external URL directly.
- Never pass an undeclared argument, input name, or enum value.

## Elements

- An image Element uses a cover and the provider-allowed number of secondary images. Do not combine it with a video resource.
- A video Element uses a video resource and may include voice only when the tool allows it. Do not combine it with cover or secondary images.
- Use only tags declared by the tool description.
- Call `element_get` before `element_update`, then update the complete object so omitted fields are not cleared accidentally.
- Obtain explicit user confirmation before deletion or a delete-and-recreate workflow.

## Known results

- A generation submission normally returns `generationId` and `status`, and may return `creditsConsumed`.
- `query_tasks` normally returns task status, timestamps, and `works[]`. A work may include primary media, unwatermarked media, and cover URLs. Determine terminal state and media semantics from the live response.
- Signed URLs may expire. Never log them or treat them as permanent asset identifiers.
- For a tool without a public output schema, use the real response as returned. Do not invent fields or success states.
