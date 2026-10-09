# Visual judge

Specialize `verify-this` (from `cursor-team-kit`) for Figma → live UI. Use its falsifiable claim, artifact tree, and VERIFIED / NOT VERIFIED / INCONCLUSIVE verdicts. Define the claim as visual equivalence. Treatment must match baseline on every rubric row. This specialization returns VERIFIED when they match, NOT VERIFIED when any row fails, and INCONCLUSIVE when comparable treatment cannot be captured. Pixel machine-diff is optional; structured side-by-side is required.

## Artifacts

```
/tmp/build-figma/<slug>/
├── intake.md
├── claim.md
├── baseline/        # Figma screenshots + assets
├── treatment/       # live UI captures
├── diff/            # optional composites
├── timeline.md
└── verdict.md
```

## Rubric (any Fail → NOT VERIFIED)

0. **Theme polarity.** Live matches Figma light/dark before other rows. Wrong polarity: switch the app theme and recapture. Do not treat inverted button colors as a primitive bug.
1. **Structure.** Same regions as Figma; no missing or extra chrome.
2. **Primitives.** Mapped components from intake; no invented brand marks; icons match Figma and exist in the repo's icon set.
3. **Type.** Size and line-height within ~1px of the intake metric table (or pinned).
4. **Spacing.** Padding, gaps, and control heights match intake metrics.
5. **Assets.** Figma or repo exports, sized via layout; no natural-size blowups or pre-downscaled images.
6. **Controls.** Checkboxes, buttons, and close affordances match; no guessed icon names.

Figma placeholder counts vs live data are not a Fail unless fixtures were required.

Drive the surface with `control-ui` or the repo's own control skill. After VERIFIED, run the repo's design-polish or QA skill if it has one.

On NOT VERIFIED, fix the failed rows, recapture, and apply the rubric again. Repeat until VERIFIED or INCONCLUSIVE. If the live UI cannot be captured after the control skill's documented setup, stop with INCONCLUSIVE. Record the attempted capture and blocker in `verdict.md`; do not claim Gate 4 complete.
