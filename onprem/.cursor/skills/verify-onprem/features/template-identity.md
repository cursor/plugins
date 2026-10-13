# Template identity

## Sub-features
- `template-identity`: the 18 role lines in setup-onprem's rule template are byte-identical to the 18 role lines in principle-role-mapping's default block, and every value is in the closed set.

## How to get to it (user POV)
Two surfaces both claim to show the default mapping. If an operator edits one and not the other, an agent reading the role-mapping principle and an agent reading setup get different defaults, and the rule file that gets written depends on which surface the session happened to load.

## Driving it with verify.py
Part of the default pass. Observable end state: `"ok": true` with the detail "18 role lines identical...". A failure reports the line counts on both sides and any out-of-set values.

## Gotchas
- The comparison is anchored on the `# onprem model configuration` marker in setup-onprem and the first fenced block in role-mapping. If either file's template moves or its marker rewords, the suite fails loudly rather than silently comparing the wrong blocks.
- This check compares templates, not the live rule file. The live file's role lines are checked by the `rule-audit` suite.
