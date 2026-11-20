---
name: kling-ai
description: Handle Kling AI and 可灵 requests in Cursor, from writing prompts and storyboards to preparing and submitting approved image or video generation. Manage Elements, motion library, uploads, credits, existing tasks, and account switching through the configured MCP.
license: MIT
---

# Kling AI for Cursor

Use only the remote China MCP configured by this plugin: `https://klingai.com/mcp/plugin`. `mcp.json` is the connection source of truth. Do not switch regions, register a second Kling MCP, or start or depend on a local MCP server.

## Request routing

- Identify the current deliverable first. Prompt or storyboard work ends with the requested text and needs no MCP call. If a required generation asset is missing, ask for it, explain its role, and stop before discovery or upload. If the user asks for final settings, discover compatible live capabilities, present the settings, and wait for approval.
- For image prompts, creation, or editing, follow [kling-ai-generate-image](../kling-ai-generate-image/SKILL.md).
- For video prompts, storyboards, generation, model selection, or motion transfer, follow [kling-ai-generate-video](../kling-ai-generate-video/SKILL.md). Include `omni_ref_video` (全能参考) in generation discovery when available, including for text-only video.
- Keep uploads, Elements, motion-library browsing, account operations, credit checks, and task status in this Skill. It also supplies the shared connection, billing, submission, and result rules for both generation Skills.
- Motion library: browse with `motion_library_list`. Resolve the selected motion, then follow the video Skill for `motion_control` with a subject image and exactly one motion source.
- Subject library / Elements: use `element_list`, `element_get`, `element_create`, `element_update`, or `element_delete` for the requested operation. Resolve real IDs before reuse.
- Account and credits: use `query_membership_and_credits`; model capabilities come from `who_am_i`.
- Existing tasks: use `query_tasks` with a known `generationId`. A status or library request never creates a generation.
- If a user reports a missing video, follow [result troubleshooting](references/troubleshooting.md#task-is-still-running-or-the-result-app-does-not-render) for the original submission.
- To continue after topping up, follow [credit recovery](references/tool-workflows.md#resuming-after-a-credit-pause). Check the original submission's task number if it exists. If the user only reports a top-up, refresh the balance without submitting.
- Sign-out or account switching: act only on an explicit user request, stay on the China endpoint, and complete native Cursor OAuth before further Kling calls.

Call only tools present in the live tool list. An attachment alone does not determine its role; clarify only when first frame, tail frame, identity/product reference, editable source, motion source, or style reference would materially change the request.

Read [asset workflows](references/asset-workflows.md) for Elements, the motion library, or uploads. Before generation, follow [capability discovery](references/capability-discovery.md), then [model parameters](references/model-parameters.md), [tool workflows](references/tool-workflows.md), and the [MCP contract](references/mcp-contract.md). Use [prompt examples](references/prompt-examples.md) for creative direction and [troubleshooting](references/troubleshooting.md) after a failure.

## Connection and task identity

- Use OAuth through Cursor's native MCP connection flow (Customize → Plugins, then Connect on `kling-ai`). Never request an API key, token, cookie, authorization header, or credential file. Never log private account fields, upload tickets, or signed URLs.
- Let Cursor manage OAuth discovery, client registration, and credentials through its native MCP flow. This plugin does not configure a custom OAuth client name; do not invent registration overrides or block authorization because the host cannot set one. If the real OAuth flow fails, report the sanitized error and follow [troubleshooting](references/troubleshooting.md).
- Create one UUIDv7 `taskTraceId` for each unrelated new objective. Reuse it across discovery, upload, generation, and querying for that objective wherever the live tool accepts it.
- Preserve exact returned IDs. Present `generationId` as the task number; expose `taskTraceId` only when troubleshooting requires it.

## Billing and single submission

- Image, video, and motion generation consume credits. Call `who_am_i` during preparation and select only models returned in the current account's `availableModels` for the chosen tool, with their declared arguments, inputs, and combination limits. Follow capability discovery for cross-tool selection and refresh stale definitions before proceeding. Do not infer model access from a tool's existence, membership tier, or static examples.
- Show the final workflow, model, prompt summary, duration/resolution, aspect ratio, output count, and reference roles. Honor explicit authorization already given for the same unsubmitted intent and unchanged final settings. Otherwise, obtain confirmation before submission. An upload, library operation, or credit check is not generation approval.
- Include any billing disclosure required by the live model/tool in those final settings. For omni reference that declares per-second billing with input video duration included, explain both facts before submission; output duration alone is not the total billed duration. Do not invent a rate or total credit estimate.
- Immediately before each generation call, check the balance with `query_membership_and_credits` on the same connection. Pause when the current balance is unavailable, non-positive, or clearly insufficient, following [credit recovery](references/tool-workflows.md#resuming-after-a-credit-pause).
- Submit at most once per approved intent. A rejected call also counts as an attempt. A new attempt requires fresh explicit authorization after any failure, timeout, ambiguous response, or rendering problem.
- Do not save an Element automatically during ordinary generation. Element writes and deletion must follow the user's explicit request as described in [asset workflows](references/asset-workflows.md).

## Generation and results

1. Resolve reference roles, Elements, and motion sources; prepare local media before submission. Use the returned provider references exactly as the selected live schema requires.
2. Follow the [submission workflow](references/tool-workflows.md#generation) to confirm the final settings, check credits, and call the chosen tool once. A multi-shot plan remains one task unless the user approves separate tasks.
3. Use `query_tasks` for follow-up only with a known `generationId`. If a submission yields no known ID, report the returned error if present and any unknown creation or billing state, then stop. `query_tasks` requires the ID and cannot search account history or look up `taskTraceId`. A balance check or missing history entry cannot establish the outcome. A status response that omits the ID does not invalidate the known task number.
4. If Cursor renders the generation MCP App, let that App own task refresh. Do not poll the same task from the model or add duplicate media, thumbnails, or download links.
5. If no App renders, query the same `generationId` at the provider-permitted interval until terminal, cancelled, rate-limited, or the turn cannot continue. If a status lookup returns a resource error and explicitly asks to check the same ID later, allow one further lookup at that interval during ongoing polling. Stop on a repeated error or other query failure. Use the tool's text fallback and include at most one primary link per usable requested work. Do not add Markdown image/video embeds or claim an unmounted App was displayed.
6. For an explicit status request, query once and report the current state; do not start a long polling loop.
7. Report full completion only after terminal success with usable primary media of the requested type and count. Count only successful works when work-level status is present, and require actual video media for video results. If some requested works are missing, deliver the usable results and report the actual count, such as "Generated 2 of 3 images." If none are usable, report the discrepancy and keep the task number.
8. Use the returned status, known task number, any result link allowed above, and effective submitted settings. If a lookup fails or polling stops early, report the most recently confirmed state, such as submitted or processing, and say that the current state could not be refreshed. Report the state as unconfirmed only if no state was ever confirmed. Report an actual charge only when the tool returns it, such as `creditsConsumed`. Submission count and a local attempt budget are separate from credits.

## Quality defaults

Apply only when the user has not specified another choice and the live model supports it:

- Prefer full-quality models. Use Turbo, fast, or low-cost modes when the user prioritizes drafts, speed, or credit savings.
- Images: prefer `2k` for normal delivery and `4k` for commercial or crop-heavy work; use `1k` for drafts or speed. Never lower a higher live default.
- Videos: prefer `1080p` for normal delivery and supported `4k` for commercial or post-production work; use `720p` for drafts, cost, speed, or model limitations.
- Generate one result unless more are requested. Use about 5 seconds for one action, about 10 seconds for two connected beats, and longer only when supported and needed. Motion-control duration comes from the selected source and live constraints.
- Pass a requested ratio when supported, including with a first frame. If unspecified, infer it from the destination or preserve the first-frame composition for image-to-video when the live schema allows it.

## Failure behavior

- Unauthorized: use native Cursor OAuth and continue only after authorization succeeds.
- Unsupported argument: refresh the live definitions, revise only unsupported settings, and obtain confirmation before a new generation.
- Insufficient credits: follow [credit recovery](references/tool-workflows.md#resuming-after-a-credit-pause) and report whether the task was paused before submission, rejected, or remains unconfirmed.
- Provider failure: report the sanitized provider message and preserve the task number. Follow [troubleshooting](references/troubleshooting.md) for resource and service errors.
- Expired media URL: query the original `generationId` for current outputs before reuse. A failed refresh is not permission to create a replacement task.
