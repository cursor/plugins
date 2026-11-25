---
name: kling-ai-generate-image
description: Write or refine Kling AI image prompts, or generate and edit images through the Kling AI MCP in Cursor. Use for Kling Image 4.0, text-to-image, image-to-image, coherent image series, posters, product photography, portraits, covers, advertising stills, visual concepts, and controlled variants.
---

# Kling AI image generation

For prompt-only work, use [prompt construction](references/prompt-construction.md) to decide whether the prompt needs changes, then return it and finish. Preserve composition requirements such as left-side copy space. Skip MCP calls, submission-setting recommendations, and offers to generate. If generation needs a missing image, ask for it, explain its role, and stop there.

For generation preparation or submission, follow the Cursor OAuth, billing confirmation, single-submission, status, and result rules in the [core Kling Skill](../kling-ai/SKILL.md).

To continue a paused image task, follow [credit recovery](../kling-ai/references/tool-workflows.md#resuming-after-a-credit-pause) before preparing another submission. Keep the original prompt, settings, and reference roles.

Read [scene patterns](references/scene-patterns.md) for product, advertising, portrait, poster, or cover work. For Element reuse or local media, also read the core [asset workflows](../kling-ai/references/asset-workflows.md).

When the user leaves model selection open, prefer Kling Image 4.0 if the account's live `who_am_i` response lists it for the chosen image entry point and it meets the request. Otherwise, prefer the entry point's compatible live `defaultModel`, then consider another compatible live model. Honor an explicitly requested model, including a request for the account's live default. If that choice cannot fulfill the request, explain the limitation and wait for the user to choose how to proceed.

## Workflow

1. Use `text_to_image` for a new image. Use `image_to_image` when source media controls identity, product structure, composition, editable content, or style. An attachment alone does not determine the mode.
2. Ask only for missing information that materially changes the result: subject, destination and aspect ratio, required copy, reference roles, protected facts, or output count.
3. Create or reuse the UUIDv7 `taskTraceId` for this objective, follow [capability discovery](../kling-ai/references/capability-discovery.md), and select a compatible tool/model pair from this account's `who_am_i` response. Apply [model parameters](../kling-ai/references/model-parameters.md) before constructing arguments or reference bindings.
4. Upload local images when needed and bind the complete returned URL to the selected model's input slot, such as `image_1` when required. Use the exact `inputType` declared by the tool schema, including uppercase `URL` when declared. Reuse valid upload references when resuming. Never silently degrade to text-to-image after an upload failure.
5. Follow [prompt construction](references/prompt-construction.md) for each new generation, edit, or variant. Reuse a suitable prompt verbatim, make only necessary changes, or write a new prompt if needed. Check that the prompt and actual reference roles agree.
6. Show the final mode, model, prompt summary, resolution, aspect ratio, output count, and reference roles. Obtain explicit approval under the core Skill's billing rule; honor an existing explicit authorization for the final settings.
7. After approval, check the actual request against the [MCP contract](../kling-ai/references/mcp-contract.md), including the top-level `model`, required arguments, and media slots. Immediately before calling `text_to_image` or `image_to_image`, call `query_membership_and_credits` on the same connection. If the balance is unavailable or insufficient, pause even if the upload succeeded. Otherwise submit once and follow the core Skill's result rules.

## Mode rules

- For Kling Image 4.0 (可灵图片 4.0), check the selected tool's live support for the requested resolution and generation mode together. The model supports native 8K and up to 10 images in Series Mode, subject to the connected account's available settings. Use the exact live resolution value when requested.
- Element support follows the selected model's declared resource types and binding argument, not the entry point name.
- Image-to-image may use one or more images with explicit roles. State the purpose of every image when multiple references are present.
- For a coherent image series, choose a live model that explicitly supports series generation and the requested count. Set the model's declared count field and enable its series control when declared. Multiple output images alone do not establish series support. If no eligible model supports the requested settings together, explain the limitation before submission.
- Before using an Element subject, follow the core asset workflow, call `element_get`, and choose a model that explicitly supports the resource type and binding argument. Check individual and combined reference caps, and bind the exact ID with the model's declared prompt and structured syntax.
- For a variant, lock every fact that the user did not ask to change. Change one major dimension per confirmed generation.
- A status request uses only `query_tasks`; it does not create an image.
- If image-to-image returns a resource error, follow [asset troubleshooting](../kling-ai/references/troubleshooting.md#upload-or-asset-reference-fails). Use a task number for recovery only when it belongs to this image-to-image submission.

## Quality defaults

- Prefer live-supported `2k` for normal delivery, `4k` for commercial work, advertising, fine materials, or crop-heavy post-production, and `1k` only for drafts, speed, or credit savings. Never lower a higher live default.
- Infer ratio from destination: `1:1` for square social or product media, `4:5` for portrait feeds, `9:16` for stories or vertical covers, and `16:9` for banners or thumbnails.
- Generate one image unless the user requests more.
- Unless the user explicitly requests text inside the generated image, prefer a clean image with intentional copy-safe space.
- Treat brand names, logos, faces, product structure, and user-provided copy as protected facts. Never invent performance, price, certification, ingredients, awards, effects, or statistics.

Before submission, internally check focal subject, visual hierarchy, safe area, lighting, reference roles, and conflicting instructions. Claim visual QA only when the result was actually inspected.
