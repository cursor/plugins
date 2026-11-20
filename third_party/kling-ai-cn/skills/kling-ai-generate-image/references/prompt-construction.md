# Image prompt construction

## Decide whether to revise

- Honor requests to use a prompt verbatim. Otherwise, review the supplied prompt for the subject, protected facts, setting, composition, lighting, color, style, and constraints that affect the intended image. Leave unspecified creative details to the model when they do not affect the user's goal.
- If the prompt is clear, consistent, and sufficient for the task, return or submit it verbatim. Apply the same check to a general request to optimize it.
- Resolve material gaps, ambiguities, or conflicts from the request and reference media first. If a key detail is still unclear, ask before proceeding. When the user clarifies one phrase, change only that phrase.
- Change only the wording needed to satisfy the request or close the gap. If one extra sentence is enough, append it and preserve the rest verbatim. For generation, change reference syntax only as required by the selected model. If that conflicts with a request for verbatim use, clarify before submitting.

## Recommended order

Use the relevant items when writing a new prompt or adding missing information.

1. Destination and medium: product photograph, editorial portrait, poster, thumbnail, or marketing still.
2. Subject and protected facts: identity, product structure, exact colors, logo, or copy.
3. Action or visual concept.
4. Environment, time, weather, and mood.
5. Composition: aspect ratio, framing, camera height, focal hierarchy, negative space, and safe areas.
6. Lighting and color.
7. Materials, textures, surface detail, and degree of realism.
8. Constraints: subject count, protected facts, and requested exclusions.

Translate abstract requests such as "premium," "cinematic," or "high quality" into visible lighting, depth of field, material, color, and composition decisions instead of stacking adjectives.

## Multiple references

Assign roles before writing the creative prompt. Identity, product structure, composition, style, and official logo references are not interchangeable. Transfer only the visual traits the user selected from a style reference; do not transfer identity or composition unintentionally.

## Coherent image series

Describe what stays consistent across the series, such as the subject, outfit, or visual style. If the user specifies a sequence, preserve its order and match the scene count to the requested output count.

## Exact text

- Preserve user-provided copy verbatim.
- When the user agrees to add text later, prepare a base image with intentional space for the copy.
- For generated text, include the exact copy once with any specified placement, hierarchy, or language. Leave unspecified typography, color, and margins to the model. When adding one title, preserve existing labels. Restrict other text only when the user asks for that restriction. Check spelling and layout in the rendered image before judging accuracy.

## Controlled variants

Keep protected facts identical and change only one dimension at a time: concept, camera distance, composition, mood, color, or expression and action. Do not replace a clear creative decision with a batch of near-duplicates.

Avoid conflicting camera instructions, long repetitive negative lists, and unverified product or brand claims.
