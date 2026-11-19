---
name: kling-ai-generate-video
description: Write or refine Kling AI video prompts and storyboards, or generate videos through the Kling AI MCP in Cursor. Use for text-to-video, image-to-video, omni reference (全能参考), Kling 4.0 (V4) and Kling 4.0 Flash (V4 Flash), keyframes, audio-guided video, motion control, product showcases, advertising clips, social videos, and cinematic shots.
---

# Kling AI video generation

Deliver the user's current step under the [core Kling Skill](../kling-ai/SKILL.md).

- **Prompt or storyboard only.** Use [motion and shots](references/motion-and-shots.md) to decide whether the supplied prompt needs changes or to plan new material. Return the requested creative text and finish without MCP calls, submission settings, or offers to generate.
- **Missing required asset.** Ask for the asset and explain its role, such as using a product image as the first frame. Stop before discovery or upload and defer other settings questions.
- **Final settings for approval.** Run generation preparation, present the proposed settings, and wait.
- **Authorized generation.** Honor existing approval for the same unsubmitted intent and unchanged settings.
- **Existing task.** Query the known task number once for an explicit status request.
- **Resume after a credit pause.** Follow [credit recovery](../kling-ai/references/tool-workflows.md#resuming-after-a-credit-pause). Keep the original model, prompt, output settings, and references. For image-to-video, verify the original first-frame slot and reference are still usable.

Read [scene patterns](references/scene-patterns.md) for product, advertising, social, or cinematic work. For Elements, the motion library, or local media, also read the core [asset workflows](../kling-ai/references/asset-workflows.md).

## Workflow

1. Capture the requested model or family, duration, ratio, resolution, count, sound, shot intent, and reference roles. Clarify only details that materially change the result. Create or reuse the objective's UUIDv7 `taskTraceId`.
2. Use Cursor's current MCP tool list and `who_am_i` to compare eligible pairs following [capability discovery](../kling-ai/references/capability-discovery.md) and [video routing](references/model-routing.md). Check all requirements against the same live pair. A first-frame requirement needs a first-frame input. Required silence needs a declared sound-off setting that satisfies the request or an explicit silent-output guarantee. If no pair fits, report the unmet requirement and stop.
3. Read the selected tool's complete live `inputSchema` and the pair's [model parameters](../kling-ai/references/model-parameters.md) before uploading local media or building the request. Stop if a required upload fails.
4. Follow [motion and shots](references/motion-and-shots.md) for each new generation, edit, or variant. Reuse a suitable prompt verbatim, make only necessary changes, or write a new prompt if needed. Bind every supported explicit setting to its own argument or applicable fixed model value. Verify the serialized request against the brief and [MCP contract](../kling-ai/references/mcp-contract.md), including the top-level `model`, required prompt, and first-frame slot. Check an explicit resolution such as `1080p` against the selected tool and model's live enum and conditions.
5. Show the final tool/model, prompt summary, output settings, shot structure, reference roles, and required billing disclosures. After approval, follow the [submission workflow](../kling-ai/references/tool-workflows.md#generation) for the credit check and single submission, then follow the core Skill's result rules.

## Mode rules

- Element use requires explicit support for its resource type and binding argument in the selected model; do not infer it from the entry point name.
- Image-to-video and omni reference distinguish first frame, tail frame, keyframes, identity or product reference, style, video, and audio. Pass only roles declared by the selected model and satisfy all conditional combination limits. Pure-text omni reference requires a model that permits no media input.
- Check audio inputs, generated sound, and source-audio retention separately using the selected model's live fields. Apply its sound dependencies and shot controls as described in [model parameters](../kling-ai/references/model-parameters.md). Report the settings actually sent and claim audio or video quality only after inspecting the result.
- Motion control requires a subject image. Choose exactly one motion source - a motion-library ID or a source video - as directed by the live tool. Use the core asset workflow to resolve library IDs and validate motion direction and duration.
- A multi-shot plan is one confirmed video task. Do not submit one generation per shot unless the user explicitly approves separate tasks.
- If image-to-video or omni reference returns a resource error, follow [asset troubleshooting](../kling-ai/references/troubleshooting.md#upload-or-asset-reference-fails) to check first-frame and reference inputs. Only the current video submission's task number can recover its status.

## Quality defaults

- Prefer `1080p` for normal delivery and supported `4k` for commercial, large-screen, or post-production work. Use `720p` for drafts, speed, credit savings, or model limitations. Never lower a higher live default.
- Use about 5 seconds for one action or shot, about 10 seconds for dialogue, a complete product action, or two connected beats, and longer only when supported and narratively necessary.
- Honor explicit duration, ratio, resolution, and count before applying defaults. Pass an explicitly requested ratio when supported, including with a first frame. If unspecified, infer it from the destination or preserve the first-frame composition when allowed.
- Use one primary camera movement in a five-second shot. Use multiple shots only when location, time, scale, or information state changes.
- Do not add unrequested narration, readable text, extra characters, product claims, prices, endorsements, or certifications.

Before submission, internally check whether the action fits the duration, camera instructions conflict, first and tail frame intent is clear, references remain continuous, and multi-shot durations sum correctly. Claim visual QA only when the result was actually inspected.
