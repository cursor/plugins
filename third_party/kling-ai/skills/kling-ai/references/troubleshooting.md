# Cursor troubleshooting

## MCP tools are missing

Use Cursor's MCP settings to verify that the plugin's `kling-ai` server is enabled and points to `https://kling.ai/mcp/plugin`. After changing plugin files, run `Developer: Reload Window`; if the tool definitions remain stale, start a new Cursor conversation and check its MCP diagnostics. Do not add a duplicate server or use an API key as a workaround.

## Endpoint migration and authorization

This release uses the Global endpoint `https://kling.ai/mcp/plugin`. The previous Cursor plugin endpoint was `https://kling.ai/mcp`. Before updating an existing connection, retain any outstanding task numbers and finish their status checks through the original connection. Disconnect the old host-managed OAuth session, update the plugin, then use Cursor's MCP Connect flow to authorize the Global account. Never transfer credentials between hosts or assume that regional task history and credits are shared.

For an authorization failure, use Cursor's MCP Connect flow for `kling-ai`, and complete native OAuth. If sign-out or account switching was explicitly requested, call the live `logout` tool as documented and reauthorize before other Kling calls. Do not paste tokens, construct OAuth URLs manually, or add an `oauth_resource` override. `Developer: Reload Window` reloads plugin files; it does not refresh OAuth credentials.

OAuth discovery and client registration belong to the host. Do not require a custom client name or try to add one to generation arguments, headers, or the MCP URL. If the server rejects the host's registration, preserve the sanitized error for the service maintainer instead of guessing metadata or requesting credentials in chat.

## Parameter or resolution validation fails

- Check the actual request for a missing, null, empty, or whitespace-only top-level `model`. Compare `arguments[]` and `inputs[]` with the selected model's required fields, including `prompt` and media slots. Use the exact slot names, such as `image_1` or `first_image`, declared for that model.
- Refresh live definitions and correct only the rejected fields or missing references. If an explicit resolution such as `1080p` was rejected, compare the submitted value with the refreshed enum and its conditions for the same account, connection, tool, and model. If they match, record the mismatch with the trace ID and sanitized fields for the maintainer. Ask the user to choose if their requested setting is unavailable.
- When diagnosing field changes, compare the model's original tool-call arguments with Cursor's outgoing MCP request and the live schema's `required` list if those are available. Record missing diagnostic data and omit credentials and signed URLs.

## Upload or asset reference fails

- Read the live `file_upload` schema and [asset workflow](asset-workflows.md).
- A ticket is only the first step. Complete the multipart upload with `ticket` and binary `file`, then use the confirmed media URL.
- Reuse the objective's `taskTraceId` where accepted. Never send local paths or expired signed URLs as remote media inputs.
- If upload is unavailable or fails, stop before dependent Element writes or generation. Do not silently switch to text-only generation or loop on upload requests.
- If the error concerns a missing resource or invalid signature, verify the complete upload response URL, its source, and the bound slot. Fix the reference and complete the authorized first submission only if the failure was in upload or local validation and generation has yet to be called.
- If the service says to retry with the same generation ID, look up the current submission's confirmed `generationId` using the [result rules](../SKILL.md#generation-and-results). An upload ID or a source image or video task number cannot stand in for it. If no ID belongs to this submission, preserve its trace ID and report that task creation and charging remain unconfirmed.
- For diagnosis, compare available stages of the same request from upload response through Cursor's model input, original tool arguments, and outgoing MCP request. Record unavailable stages. Compare only redacted URL summaries and query parameter names. A `ResourceNotFound` error alone cannot identify the stage that failed.

## Model capability mismatch

If the user says a requested model is enabled but it is absent, follow [capability discovery](capability-discovery.md): finish all tool-list pages, include `omni_ref_video` for video when present, and query remaining generation entry points before concluding the model was not returned. Check the actual connection, endpoint, and MCP version, then refresh discovery. Another client's results or website membership do not replace this connection's account-scoped capabilities.

If the mismatch remains, report that the current connection did not return the requested model and the cause needs investigation. Do not label it an account-permission failure without evidence, change accounts/endpoints, probe guessed model names through generation, or silently fall back to an older model. Keep diagnostics sanitized; omit credentials, private account fields, and signed URLs.

## Element or motion cannot be used

- Resolve ambiguous names before selecting an ID. Use `element_get` to inspect the resource type and access before reuse or updates.
- Use Elements only with live models declaring both the resource type and binding argument, including conditional caps. Preserve required image inputs and use the model's prompt and structured bindings; entry point names alone do not establish support.
- Keep the existing cover and unmodified secondary images when updating an image Element. Do not change its resource type or delete-and-recreate without explicit authorization.
- Motion control requires a subject image and exactly one source: `motionId` or a video input. A library preview URL is not a motion ID. Validate source duration and model arguments; do not invent a `duration` parameter.
- An empty motion library is a valid result. The current tool surface has no motion create, update, or delete operation.

## Task is still running or the result App does not render

Follow the [Cursor result rules](../SKILL.md#generation-and-results). If the user reports a missing video and this submission has a task number, use the mounted App's current status or look up that task when the App is unavailable. Report progress while it runs, deliver the usable video on success, and preserve the task number and reason on failure. If a lookup fails, report the last confirmed state and explain that the refresh failed.

A rendering problem is not a generation failure. Preserve the tool result and follow the core Skill's text fallback and completion rules. Do not register a local MCP server, embed duplicate media, or claim that an unmounted App was displayed.

## Submission fails or times out

If a `generationId` is known, follow the core Skill's App or headless result rules. If no ID is known, report the returned error and any unknown creation or billing state, then stop. A credit balance cannot establish the outcome, and `query_tasks` requires a known ID. Any new attempt needs fresh explicit authorization.

For a provider failure, return the provider message and preserve task IDs. For unsupported arguments, refresh the live schema, revise the rejected settings, and obtain confirmation before any new generation.

Treat a generic service-unavailable message as a service error even when the outer code is `InvalidParameter`. Follow up on a known task number. If there is no task number and the submission is ambiguous, stop and preserve the trace ID. Apply parameter troubleshooting when the service identifies a specific field.

## Rate limit or full generation queue

Distinguish a full generation queue from a rate-limited status query. For a full queue, keep the original settings and any task number. Report the returned waiting instructions and confirmed task state. If the service has no queue for this request, distinguish a confirmed rejection from an unconfirmed submission. When the user asks to continue, check any known task first and follow the [single-submission workflow](tool-workflows.md#generation). If a status query is rate-limited, stop polling and report the last confirmed state and task number.

## Insufficient credits

Use the current balance and provider response to distinguish a task paused before submission, a rejected call, and an unconfirmed submission. Membership allowances alone do not establish the available balance. Follow [credit recovery](tool-workflows.md#resuming-after-a-credit-pause). A balance change or request to view an existing result does not authorize a new submission.

## Result link expired

Query the original `generationId` for current outputs immediately before reuse. Do not treat signed URLs as permanent asset identifiers or log them. If the task cannot be queried in the current region, explain the limitation rather than creating a replacement task.
