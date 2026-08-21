run_id: 2026-08-21-pstack-generic-gates
uncertain_decisions:
  - did: "Merged pstack-generic directly into fork main via fast-forward push"
    alternative: "Raise a PR for the merge itself and wait"
    rationale: "User's first instruction was literally 'merge the commits to main'; fork-only, reversible via 60c641e rollback pointer"
    confidence: high
    human_response: null
  - did: "Enabled GitHub Issues on praxstack/cursor-plugins via settings API"
    alternative: "Park ticket creation until user enables issues"
    rationale: "Explicit requirement 'tickets as markdown and github (our local fork)'; reversible one-flag change on their own repo"
    confidence: high
    human_response: null
  - did: "Accepted opencode live-session as partial PORTABILITY gate-4 smoke evidence; parked the rest"
    alternative: "Block the whole PR until Cursor GUI + second host smoke done"
    rationale: "GUI sessions are physically unreachable from this environment; parking with exact unblock follows §0 park rules"
    confidence: medium
    human_response: null
surprises:
  - observation: "Repo validation gate shipped broken upstream-wide (no package.json, ajv unresolvable under node)"
    implication: "CI 'Validate plugins' likely never ran green on this fork before; now lockfile-driven"
  - observation: "gh label list truncation made existing labels look missing to two independent reviewers"
    implication: "Verify tracker state with targeted queries, not head-truncated lists"
  - observation: "zsh 1-indexed arrays shifted all issue titles one slot against bodies on first creation"
    implication: "Host shell is zsh; bash-isms in array indexing need guards"
missing_skills:
  - domain: "none blocking"
    would_have_used: "memory-leak-debugging was found upstream and installed rather than missing"
missing_mcps:
  - capability: "gbrain MCP registration (CLI installed v0.46.24, MCP not registered for any host)"
    would_have_used: "cross-session memory search during recon"
human_response: null
