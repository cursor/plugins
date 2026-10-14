# The question

Why does add(a,b) subtract, and what correction does the local evidence justify?

## The code in question

sample.js:1-2 defines add(a,b). check.mjs:1 imports it and expects add(3,5) to equal 8. Commit bbc4c0d160ae5c044a3a3d858adc1c046526e175 introduced both files.

## What we found

[Direct] The source comment says add two numbers while the implementation evaluates a - b. Sources sample.js:1-2 and introduction patch bbc4c0d.

[Direct] The assertion expects 8 for 3 and 5. Source check.mjs:1.

[Direct] The introduction message is fixture and has no PR or ticket identifier or explanation for subtraction. Source full message bbc4c0d.

[Supported] Subtraction is the failure mechanism. Investigator measured -2 for 3,5 and inspected imported function as (a, b) => a - b. Synthesizer spot-checked source. Sources evidence/investigation.md and sample.js:2.

## What we can reasonably infer

[Inferred] Addition appears to be the intended numeric contract. The comment describes addition and the independent assertion expects its result. Sources sample.js:1 and check.mjs:1.

[Inferred] Changing the operator appears sufficient for the demonstrated failure. Numeric calls and function inspection point to arithmetic rather than imports or string coercion. Source evidence/investigation.md.

## Competing hypotheses

An accidental operator choice conflicts with the comment and assertion, but no author explanation identifies a mistake. A deliberately seeded defect is consistent with the fixture message and user's description, but the commit never says so. Both explanations remain hypotheses.

## What we do not know

The historical reason for subtraction is unknown. Sole introduction commit, local symbols, comments, ADRs and arithmetic history supplied no rationale. No PR or ticket identifiers surfaced. External records were not searched under user restriction. Non-number behavior is not established.

## Sources consulted

- Source control. Native investigator reviewed blame, follow history, recent history, commit message, pickaxe and regex history, local source/assertion, runtime arithmetic. Synthesizer spot-checked source and commit.
- Issue tracker. Skipped because user prohibits external integrations including GitHub.
- Long-form documents. Skipped because user prohibits external integrations including Drive and Space.
- Team chat. Skipped because no relevant matching fixture tool identified.
- Infrastructure observability. Skipped because no relevant matching fixture tool identified.
- Exception tracking. Skipped because no relevant matching fixture tool identified.
- Analytics warehouse. Skipped because no relevant matching fixture tool identified.

## Change constraints

Preserve named add(a,b), module location and original assertion. Change subtraction to addition. Avoid wrappers, guards, coercion, API expansion or assertion weakening. Risk is undefined non-number contract and unknown historical intent.

## Confidence summary

The subtraction mechanism and expected numeric result have strong local evidence. The reason subtraction entered the fixture is unknown. The evidence supports a tiny operator correction without expanding the interface.

Native why_synthesis returned these findings without writes. Parent recorded them with confidence language preserved.
