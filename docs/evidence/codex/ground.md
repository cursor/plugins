# Overview

The fixture exports one arithmetic function and checks its public behavior. At inspection time, sample.js exports add(a, b) but calculates subtraction.

## Key concepts

The interface takes two numbers and returns a number. The named export lets callers import add directly. The function holds no state.

## How it works

check.mjs imports add from sample.js, calls add(3,5), and asserts that the result equals the literal 8. The current a - b expression produces -2. The parent observed the failing assertion. The script prints add verified only after the assertion succeeds.

## Where things live

sample.js:2 owns the exported function. check.mjs:1 owns the public behavior check.

## Gotchas

The comment says add two numbers, but the operator contradicts it. The existing check covers one positive integer pair. It does not establish behavior for strings or other input types.

Native ground delegate returned this explanation after reading the original how instructions and template. Parent preserved the content and added observed runtime evidence.
