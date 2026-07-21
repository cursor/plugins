# Severity rubric

Use exactly these three buckets. Every finding must land in one.

## Blocking

Must be fixed for the work to succeed. Examples:

- Incorrect logic or broken control flow relative to the stated intent
- Security vulnerabilities introduced or left open by the change
- Data loss, corruption, or auth/authz holes
- Plan that cannot work given known constraints or missing critical steps
- Tests that claim to cover the request but miss the core behavior

## Non-blocking

Should be fixed to improve quality or reduce risk, but will not by itself prevent success. Examples:

- Real edge cases likely in production that are unhandled
- Design choices that will make the next change painful
- Incomplete error handling on reachable failure paths
- Test gaps on important secondary paths

## Suggestions

Lower-priority improvements that still have a real impact on the outcome. Examples:

- Clearer structure that reduces future mistakes
- Narrower interfaces or better separation that fit this change
- Additional assertions that would catch regressions cheaply

## Do not report

- Style, formatting, import order, naming preference
- Comment grammar or docstring polish
- Speculative hypotheticals with no evidence the path is reachable
- Rewrites of working code solely because you would have designed differently
- Generic best-practice lectures unrelated to this artifact
