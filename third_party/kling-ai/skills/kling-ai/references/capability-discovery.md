# Account-scoped capability discovery

Read this before choosing a model for generation or a model recommendation. Status, credit, and library queries do not need model discovery.

## Discover candidates

1. Read the current connection's complete `tools/list`, following all pagination. Only discovered tools are candidates. A failed discovery is not an empty list and must not trigger a fallback to old capabilities.
2. If the live `who_am_i` schema declares `tools`, pass a nonempty set of relevant generation tools; otherwise read the full response. Do not invent model or field filters. For V4 discovery, include all discovered generation tools that support the requested output type and intent.
3. Treat `who_am_i.availableModels` and each tool's `models` as the authority for this account. Match requested canonical names or declared aliases within that set. A tool's existence, examples, membership tier, or `defaultModel` alone does not establish model access; the default must also belong to its model set.
4. If a requested model is missing from the filtered response, check the remaining discovered generation tools before concluding it was not returned. A model available only for another output type is not a candidate for this request. Explain that mismatch without claiming an account permission failure or changing the requested media type.
5. Fix one tool/model pair, then read [model parameters](model-parameters.md). Never move a model or its arguments to a different tool.

## Video candidates

For text-driven video, query the discovered `text_to_video` and `omni_ref_video` models together. For image-driven video, compare `image_to_video` and `omni_ref_video`. Include omni for text-only requests and check its live media requirements. Include other discovered tools that could satisfy the request, with `motion_control` for motion transfer. Follow [video model routing](../../kling-ai-generate-video/references/model-routing.md) for eligibility and ranking.

## Selection and visibility

- A user-specified model takes precedence when an eligible pair is returned. Match model names and families, including V4 and V4 Flash, using live canonical names and declared aliases. Identify the selected model by its returned name and recommend only models returned by the current account.
- Required references, duration, sound, speed, and budget take precedence over version preferences. Do not silently drop requirements, increase output count, or lower specifications to make a model fit.
- Reuse one successful discovery response during the same generation preparation. Refresh after reconnecting, switching account/endpoint, changed entitlements, a capability notification, or a rejected model/argument; query additional tools when the candidate set changes.
- A filtered response says nothing about unqueried tools. If full discovery still does not return a requested model, report only that the current connection did not return it. If the user says it is enabled, follow [capability troubleshooting](troubleshooting.md#model-capability-mismatch); do not guess a model identifier or probe access by generating.
- Model capability comes from `who_am_i`; request encoding comes from the tool's `inputSchema`. Tool examples cannot expand model capabilities. Refresh inconsistent or incomplete definitions; if no valid request satisfies both, stop before submission.
