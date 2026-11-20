# Remote tool workflows

## Generation

1. Use the plugin's single `kling-ai` connection at `https://kling.ai/mcp/plugin` and follow [capability discovery](capability-discovery.md), including all tool-list pages and relevant new entry points.
2. Create or reuse the objective's UUIDv7 `taskTraceId`, reuse the successful `who_am_i` response for this preparation, and apply [model parameters](model-parameters.md) to the selected tool/model pair. Video selection follows [video routing](../../kling-ai-generate-video/references/model-routing.md), including `omni_ref_video` when available. Refresh capability data when invalidated, not just because another reference was loaded.
3. For Elements, motion-library selections, or local media, follow [asset workflows](asset-workflows.md). A library operation does not authorize generation. Do not silently fall back to text-only generation if a required reference is unavailable.
4. Show the final mode, model, prompt summary, resolution, duration when applicable, aspect ratio, output count, and reference roles. Include live-required billing disclosures, including per-second billing and input video duration when applicable. Describe shot controls only as declared by the model, without inferring the actual number of cuts. Obtain explicit approval under the core Skill's billing rule.
5. Validate the request against the [MCP contract](mcp-contract.md), then call `query_membership_and_credits` on the same connection immediately before submission. Pause if the current balance is unavailable, non-positive, explicitly insufficient, or below the live estimate for the exact settings. A positive balance alone cannot establish that an unknown cost is covered. Keep the original settings and follow the recovery steps below.
6. Call the selected generation tool once using its live schema. Preserve the returned `generationId` and confirmed state. Follow the [Cursor result rules](../SKILL.md#generation-and-results) for App refresh or headless polling.

## Resuming after a credit pause

1. Keep the intent, tool, canonical model ID, prompt, output settings, input slots and usable source references, `taskTraceId`, submission state, and any known `generationId` in the current conversation. Use the current balance from `query_membership_and_credits`. Report a shortfall only when the service supplies an estimate for the exact settings.
2. Tell the user the confirmed state. If the balance cannot be checked, explain that submission is paused until it can be verified. For insufficient credits, use the official production top-up link returned by the current connection for the account's region. If no such link is returned, direct the user to the official Kling homepage in the plugin manifest to sign in to the same account and top up from its account page. Ask the user to return to this Cursor conversation and say “Continue the previous task” after topping up.
3. If the user only says they topped up, refresh the balance and explain the next step. When they explicitly ask to continue, identify the original task and ask which one only if several match. If that submission has a `generationId`, check that task before any balance or preparation steps, report its state or result, and end the recovery without a new submission. Any source image or video task number is only for looking up the source media.
4. Continue toward submission only if generation had yet to be called or the service explicitly confirmed that no task was created and no credits were charged. If the outcome is ambiguous, stop and report what remains unconfirmed.
5. Keep the original `taskTraceId` and confirm the original model, settings, and references are still usable on the same connection. Reuse valid upload references and refresh expired ones from accessible originals. Ask only for media that cannot be recovered, and obtain approval before changing the model or billable settings.
6. Honor approval already given for an unsubmitted intent with unchanged settings. If a previous call was rejected without creation or charge, an explicit request to continue those confirmed settings provides fresh authorization. Recheck current credits just before the single submission. If the balance still blocks it, keep the task paused.

## Read-only operations

- Credits: call `query_membership_and_credits` once.
- Task status: call `query_tasks` once with a known `generationId`; do not start long-running polling for a direct status request.
- Model capabilities: call `who_am_i` without creating a task.
- Motion library: call `motion_library_list`; do not call `motion_control` merely to browse.
- Subject library: use `element_list` and `element_get` to resolve real subjects and resource types.

## State changes

- Create or update an Element only as requested, following the complete-resource rules in [asset workflows](asset-workflows.md).
- Delete an Element only when the user explicitly identifies the deletion target. A cover replacement that requires delete-and-recreate needs explicit authorization for the ID change.
- Call `logout` or switch accounts only when explicitly requested. Re-enter native Cursor OAuth through the MCP Connect flow and stop other Kling calls until authorization completes.

Never retry a generation automatically. If a submission yields no known `generationId`, report the returned error if present and any unknown creation or billing state, then stop.
