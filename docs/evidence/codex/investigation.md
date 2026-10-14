# Source-control investigator findings

Native investigate delegate read original why and poteto instructions, HOST, epistemics, investigator and code archaeology templates. Read-only in practice, no files modified.

## Searches

Ran blame sample.js:1-2, full follow history with patches, recent 20 commits, full commit message, pickaxe for a - b, regex history for add and operators, scoped commit inspection, local symbol/comment/ADR/test searches, direct ESM import, five numeric calls, and add.toString().

## Evidence

bbc4c0d160ae5c044a3a3d858adc1c046526e175 introduces sample.js and check.mjs. Author pstack test, 2026-10-14 20:07:37 +0800. Message fixture. No PR or ticket identifiers. No explicit motivation for subtraction.

sample.js:1 says add two numbers. sample.js:2 subtracts. check.mjs:1 expects add(3,5) to equal 8.

Measured numeric calls returned -2 for 3,5; 2 for 5,3; -7 for 0,7; -8 for -2,6; -0.75 for 1.5,2.25. Imported function printed (a, b) => a - b.

## Hypothesis elimination

Direct import and function inspection rule out wrong module/export. Numeric inputs rule out string coercion for this failure. Literal arithmetic supports the assertion's 8. Wrong operator is the surviving mechanism. Historical motivation is unknown.

## Gaps

Only one target introduction commit exists. No ADR match outside installed skills. No test-named match under exclusions; check.mjs owns the assertion. No PR lookup because no identifiers and external integrations prohibited.

## Constraints

Preserve named add(a,b) and check.mjs. Change subtraction to addition. Avoid wrappers, guards, coercion, test changes. Non-number semantics are outside the established contract.
