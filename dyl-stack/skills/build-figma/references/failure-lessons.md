# Failure lessons

What broke in past Figma → UI runs, and which gate each one produced. Styling and token rules live in the repo's own guidance, found during design-system discovery. This file only records why the gates exist.

## What went wrong

1. Shipped functional UI first; Figma-faithful visuals only came after the human pushed back. → Gate 1 blocks coding until intake exists.
2. Drew a brand mark by hand instead of exporting it from Figma or using the repo's existing asset. → Hard ban 2.
3. Reached for a list or dialog primitive that looked close but had different structure (a recessed card with divider rows is not a plain list). → Hard ban 3, node → primitive map.
4. Trusted a primitive's size tokens where they disagreed with Figma px. → Metric table, hard ban 4.
5. Styling that compiled but never emitted, or dynamic styles the styling system could not handle. → Gate 3, match neighbors and lint.
6. Guessed icon names; downscaled a brand image before sizing it, which crushed its detail. → Rubric rows 2, 5, 6.
7. Judged a light-theme build against a dark-theme frame. → Rubric row 0.
