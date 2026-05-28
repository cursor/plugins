---
name: why
description: "Use for 'why does X work this way', 'why we picked Y', design rationale, regressions, postmortems, or data-backed thresholds. Discovers available MCPs and queries each evidence category (source control, issue tracker, long-form docs, real-time chat, infrastructure observability, error tracking, product analytics warehouse) in parallel, then returns a cited read on decisions and tradeoffs. Use how for runtime behavior."
---

# Why

Investigate the motivation and intent behind code. Why was it built this way? What edge cases were considered? What product, business, or operational constraints shaped the design? What alternatives were rejected, and on what grounds?

This is a companion to the `how` skill. `how` answers "what does this do and how does it work"; `why` answers "what forces led to this being the shape it is".

## How this skill works

Historical context is spread across seven evidence categories: source control history, issue or ticket tracking, long-form documents, real-time team chat, infrastructure observability, error or exception tracking, and product analytics warehouses. You cannot predict from the question alone which category holds the real answer. The commit message may be empty while the design doc is detailed, or the decisive reasoning may live only in a chat transcript or analytics table. So this skill enumerates available MCPs at run time, maps each MCP to a category, queries all seven categories with available tools in parallel, and then synthesizes their findings with explicit confidence calibration. Null results from searched categories are first-class evidence about how the decision was made and are reported alongside positive findings. The default is coverage, not minimalism.

## Operating Posture. Read This First

Operate as a **careful, cautious, and precise investigator**. Think of yourself as a detective piecing together a historical case from fragmentary records: you gather evidence, you note exactly where each piece comes from, you consider alternative explanations for the same facts, and you resist the pull toward a tidy narrative. When the record is thin, you say so.

Concretely, this means:

- **Evidence before narrative.** Collect the pieces first, then see what story they support. Not the other way around. Never pick a story and then recruit the evidence that fits it.
- **Precision over polish.** Prefer the exact quote and the exact citation over a smooth paraphrase. A reader should be able to follow any claim back to the source and verify it in under a minute.
- **Consider what you haven't seen.** The evidence you find is a sample, not the whole truth. Before settling on a conclusion, ask: "what would I expect to see if an alternative explanation were true? Did I look for it?"
- **Name the gaps.** If a thread goes cold, a source isn't searchable, or a question has no answer, the right move is to document the gap. Do not paper it over with a guess that sounds authoritative.
- **Hedge on purpose.** When your evidence is indirect, your language should signal that ("appears to", "likely", "suggests"). Confidence-matching phrasing is a feature of the output, not a stylistic choice the synthesizer is free to override.
- **No shortcut by code-reading.** Staring at the code can tell you what the code does; it rarely tells you why it exists. Resist the temptation to infer intent from code shape.

This posture is not a disclaimer. It's the working method. The rest of the skill operationalizes it.

## Core Epistemics. Read This Next

This skill builds a **patchwork understanding** from fragmented historical evidence. Tickets go stale. Chat threads get deleted. Commit messages lie. People change their minds between the PR description and the implementation. The original author may have left the company.

Be ruthlessly honest about what you know vs what you're inferring. The goal is not to construct a satisfying story. It is to surface evidence, calibrate confidence, and let the user decide what to believe.

Principles:

- **Cite everything.** Every claim about intent should reference a specific commit hash, PR number, ticket ID, doc URL, chat permalink, or code comment. If you can't cite it, it's inference, not fact. It must be labeled as such.
- **Prefer "appears to" over "because".** Use hedged language when the evidence is indirect. Reserve confident language for things with direct, explicit evidence.
- **Surface contradictions.** If two sources disagree, show both. Don't quietly pick the one that fits your narrative.
- **Acknowledge gaps.** If a question has no answer in any source you searched, say so. An honest "we couldn't find out why" is more valuable than a confident guess.
- **Multiple hypotheses are valid.** When the evidence fits several stories, present them all with the evidence for each. Let the user triangulate.
- **Beware of rationalization.** Code that "makes sense" today may have been written for reasons that no longer apply, or for no good reason at all. Don't retrofit intent.

Read `references/epistemics.md` for the full confidence framework and phrasing guide. The synthesizer must follow it.

## Step 1. Understand the Target and the Question

Parse what the user is asking. The **target** is usually a chunk of code, a pattern, a feature, or a named design decision. The **question** is usually one of:

- "Why was X designed this way?" Design rationale.
- "Why do we do X instead of Y?" Tradeoff / alternatives.
- "What edge cases motivated this?" Defensive reasoning.
- "What business or product constraint led to this?" External forcing function.
- "Why does this code still exist?" Is-this-dead-code territory.
- "What's the history of X?" Broad archaeological sweep.

If the target is vague (e.g., "why do we do it this way?" with no clear referent), make your best guess from the conversation context. Use currently open files, recent edits, the cursor location, and what was just discussed. State your interpretation briefly so the user can redirect if you're off, then proceed.

## Step 2. Establish the Code Anchor

Before spawning investigators, anchor the investigation in concrete code. You need:

- The relevant file path(s) and line range(s)
- The key symbols (function names, class names, constants)
- An initial commit list. The last few commits touching the target.
- PR numbers extracted from merge commits (common pattern: `(#1234)` in the subject line)

Build this inline. It's cheap and every investigator will need it.

```bash
# Blame the target lines to find last-touch commits
git blame -L <start>,<end> <file>

# Full history for the file, with patches, through renames
git log --follow -p -- <file>

# Last N commits touching the file with PR numbers visible
git log --oneline -20 -- <file>

# Extract PR numbers from a commit message
git log -1 --format=%B <commit>
```

Pull the PR bodies and discussion via `gh` for any commits that look substantive:

```bash
gh pr view <number> --json title,body,author,createdAt,mergedAt,labels,closingIssuesReferences,comments,reviews
```

Capture this as the seed context. Include file paths, symbols, commits, PR numbers, and any linked ticket IDs. You'll pass this to the investigators so they don't have to rediscover it.

## Step 3. Spawn Parallel Investigators (default posture)

**Default to the full parallel investigation.** Each evidence category lives in a different kind of system, and you cannot predict from the question alone which category holds the real answer. Commit messages can lie. A ticket tracker may be silent on the question you care about, while a design doc has a crisp answer. You cannot tell which is true without looking. So look across every available category, in parallel, by default.

### Discovery

Before spawning investigators, list the available MCPs from the Cursor environment. Use the available-tools map when it is present. Otherwise inspect the `mcps/` directory that Cursor exposes for enabled MCP servers.

Map each available MCP to one evidence category:

1. Source control history
2. Issue / ticket tracker
3. Long-form documents
4. Real-time team chat
5. Infrastructure observability
6. Error / exception tracking
7. Product analytics warehouse

Source control history is always available through git and `gh`. For the other six categories, use the MCP name, server instructions, tool names, and resource descriptors to classify the source. If an MCP could fit more than one category, choose the category that matches its primary evidence. Record ambiguous cases in the coverage map.

The goal is a complete **coverage map**, not a minimal one. An investigator that searches and finds nothing is not wasted work. A null result from an issue tracker is evidence the decision was not ticketed, which is itself a useful fact about how the decision was made. Document the null, don't skip the search.

Launch all matching investigators in a single message so they run concurrently. The one-investigator-per-category pattern exists so each agent can specialize in one tool's query vocabulary and result shape. Don't ask one agent to cover multiple MCPs.

Subagent config (for each):
- `subagent_type`: `generalPurpose`
- `model`: `composer-2.5-fast`
- `readonly`: `false` (agent mode). **Do not use readonly/Ask mode**. It strips MCP access, which disables MCP-backed investigators entirely. The source control investigator would technically be safe in readonly, but keep modes uniform for consistency. Investigators still shouldn't write anything. That's a posture, not a sandbox.

Each investigator gets:
1. The base prompt from `references/investigator-prompt.md`
2. The category playbook at `references/sources/<source>.md` for the selected MCP, adapted from the examples in `references/source-playbook.md`
3. The cross-cutting playbook at `references/sources/incident-postmortem.md` **if the target code looks defensive** (null checks, retry logic, timeout handling, rate limiting, feature flags, egress guards, OOM handlers)
4. The code anchor from Step 2 (file paths, symbols, commit hashes, PR numbers, ticket IDs)
5. The user's original question

### Investigator roster. One per available evidence category

Spawn one investigator per category that has a matching MCP. Each investigator owns exactly one tool or MCP.

Each entry below lists what the category physically contains and the shape of "why" the category is uniquely positioned to surface. Use it to know what to expect back from each investigator, how to name a gap when a category returns empty, and only in the rare provably irrelevant case, to justify a skip. Every category overlaps in coverage, but each one owns a kind of evidence the others cannot recover. That's why the default is still all seven categories with available MCPs.

1. **Source control investigator**. Git history, `gh` for PRs, code comments, tests. Always spawn. The only guaranteed source. **Best at surfacing:** *implementation-time rationale captured during review*. PR descriptions stating the problem, review threads debating alternatives, inline comments encoding non-obvious constraints, test names that encode motivating edge cases, and commit messages linking tickets or incidents. This is the most trustworthy source because it's tied directly to the diff that shipped.

2. **Issue / ticket tracker investigator** (e.g. Linear, Jira, GitHub Issues, Plane, Shortcut MCP). Tickets, project docs, status updates, spec attachments. **Best at surfacing:** *the product or business forcing function*. Customer requests ("Acme needs X for their SOC2 audit"), compliance deadlines, parent-initiative framing ("Q3 enterprise readiness"), ticket-level scope changes, and labels that categorize the motivation (`customer:*`, `incident-followup`, `compliance`, `perf-regression`). Strongest when the "why" is external to engineering.

3. **Long-form documents investigator** (e.g. Notion, Confluence, Google Docs, Coda MCP). PRDs, specs, RFCs, design docs, ADRs, postmortems, team pages, meeting notes. **Best at surfacing:** *long-form design rationale*. Problem statements, explicit "alternatives considered" and "rejected approaches" sections, strategy documents that set priorities, ADRs with finalized decisions, and postmortem action items that tie directly to code. Where the "why" is written out before it becomes code.

4. **Real-time team chat investigator** (e.g. Slack, Discord, Microsoft Teams, Mattermost MCP). Feature-name and symbol searches, PR URL mentions, incident channels (`#sev-*`, `#incident-*`), author-handle activity around the ship date. **Best at surfacing:** *real-time deliberation that never reached a doc*. Fire-drill decisions during incidents, Q&A between the PR author and reviewers, casual "we decided X because Y" threads, and rationale for small changes that didn't warrant a PRD. Especially important when the source control, ticket, and doc paper trail is thin.

5. **Infrastructure observability investigator** (e.g. Datadog, New Relic, Honeycomb, Grafana, Splunk MCP). Metrics, monitors, dashboards, logs, APM traces, formal incidents. Infra/runtime view. **Best at surfacing:** *infrastructure and runtime reality that motivated the code*. Monitor thresholds whose numbers match code constants, metric spikes in the window right before a PR merge, dashboards created as postmortem action items, incident timelines that reference the target. Strongest when the target reacts to an infra signal (timeouts, retries, rate limits, circuit breakers).

6. **Error / exception tracking investigator** (e.g. Sentry, Rollbar, Bugsnag, Airbrake MCP). Issues, events, stack traces, releases. **Best at surfacing:** *the specific exceptions and error trajectories that motivated defensive or corrective code*. Stack traces that pass through the target function, issues whose first-seen/last-seen windows bracket the PR ship date, release correlations that show an error stopping at a specific version. Strongest for catch blocks, null guards, type checks, retries, and other defenses.

7. **Product analytics warehouse investigator** (e.g. Databricks, Snowflake, BigQuery, ClickHouse, dbt, Redshift MCP). Product-analytics events, experiment and feature-flag exposure tables, usage and billing events, query history, warehouse telemetry. Product/data view. Complements infrastructure observability by covering *user behavior and data reality* around the ship date rather than infra metrics. **Best at surfacing:** *product and data reality that shaped the code*. Feature-usage trajectories (a step-function ramp from zero is strong evidence that "this PR launched it"), experiment/flag exposure data tied to ship decisions, pre-ship distributions that reveal where a threshold constant came from (e.g., `limit = 128 * 1024` matching the p99 of an upload-size column), and data-pipeline scale evidence for migrations/backfills. Strongest for flag-gated code, experiment-driven ships, data migrations, and "where did this number come from" questions.

### When to skip an investigator

Only skip with an **explicit, written justification** that goes in the final "Sources Consulted" section. Two valid reasons to skip:

- **No MCP is available for that category in this environment**. Flag this as a gap, not a choice. Example: "Real-time team chat skipped. No matching MCP available, so conversational record was not searchable."
- **The source is provably irrelevant**, not just "probably irrelevant." A high bar. Example: "Error / exception tracking skipped. Target is a build-time script with no runtime code path." Not: "probably not in error tracking, it's a feature not an error."

"It's pure feature code, error tracking won't have anything" is **not** sufficient justification. Run the search, let the null result speak. "I doubt long-form docs would have this" is **not** sufficient. Check. The cost of an investigator returning empty is one subagent. The cost of missing the design doc that actually exists is a wrong answer.

If your scope assessment suggests a single-commit trivial target where the PR description already contains the complete answer, you may answer inline **only after** confirming all seven available category searches would be redundant. You must say so explicitly in the output. This should be rare.

## Step 4. Synthesize

Spawn one synthesizer subagent:

- `subagent_type`: `generalPurpose`
- `model`: `claude-opus-4-8-thinking-xhigh`
- `readonly`: `false` (agent mode). The synthesizer's quality check includes spot-verifying citations, which can require MCP access. Readonly/Ask mode strips MCPs and defeats that.

The synthesizer gets:
1. The investigator findings, including any null results and any categories skipped with justification
2. The code anchor from Step 2 (file paths, symbols, commit hashes, PR numbers, ticket IDs)
3. The user's original question
4. The epistemics framework from `references/epistemics.md`
5. The synthesizer prompt template from `references/synthesizer-prompt.md`

Its job is to produce the final output: a confidence-weighted, evidence-cited narrative with clearly separated "what we know" and "what we're inferring" sections, plus honest acknowledgment of gaps and null-result sources.

## Step 5. Present

Take the synthesizer's output and present it to the user. You may lightly edit for clarity or add context from the conversation, but **do not rewrite the confidence language**. The epistemic framing is the product. Dropping the hedges to make the answer sound more authoritative is the exact failure mode this skill exists to prevent.

## Output Format

The final output uses this structure. Adapt as needed, but keep the confidence separation intact.

**The Question**. Restate what the user asked, concisely.

**The Code in Question**. File paths, line ranges, and key symbols. One or two lines so the reader is anchored.

**What We Found (direct evidence)**. Claims with explicit citations (PR #, ticket ID, doc URL, chat permalink, commit hash, code comment with file:line). Each bullet is a thing we have textual evidence for. Use present tense and quote or paraphrase the source.

**What We Can Reasonably Infer**. Claims that are well-supported by indirect evidence or combinations of signals, but not explicitly stated anywhere. Each bullet must explain the inference chain: "Given A and B, it's likely that C." Use hedged language ("appears to", "likely", "suggests").

**Competing Hypotheses**. If the evidence fits multiple stories, list them. For each: the hypothesis, the evidence for it, the evidence against it. Don't force a winner when the record doesn't support one. (Skip this section if there's a clear answer.)

**What We Don't Know**. Explicit gaps. Questions the user asked that the evidence didn't answer. Sources we searched and came up empty. Be specific: "We searched the issue tracker for 'rate limit' and found no ticket discussing this specific threshold" is more useful than "we don't know why."

**Sources Consulted**. A bulleted list of every source, one line per investigator, including the ones that returned nothing. The reader should be able to see at a glance: (a) which MCPs were queried, (b) which came back empty, and (c) which were skipped and why. This is the coverage map. It lets the user judge investigation breadth and redirect if something obvious was missed.

Format each line as: `- <Source>: <what was searched>. <what was found, or "no relevant results," or "skipped. reason">.`

Example:
- Source control (git/gh): `git log --follow backend/retry.ts`, PRs #49074, #47812. Found PR #49074 introduced exponential backoff and linked ENG-4421.
- Issue tracker (Linear): searched for "retry" and ENG-4421. Found ENG-4421 parent issue but no discussion of backoff parameters.
- Long-form docs (Notion): searched for "retry policy," "backend retries," "ENG-4421." No relevant results.
- Real-time team chat (Slack): skipped. No matching MCP available in this environment. Gap: conversational record not searched.
- Infrastructure observability (Datadog): searched for `retry_count` metric and monitors around 2024-08-14. Found monitor "Upstream 5xx rate > 1%" created same day as PR #49074.
- Error / exception tracking (Sentry): searched for issues first-seen in Aug 2024 with stack through `retry.ts`. Found issue SENTRY-3821 spiking in the week before the PR.
- Product analytics warehouse (Databricks): queried `<your_analytics_db>.<schema>.stg_backend_upstream_retry` for the 30-day window around 2024-08-14. Daily failure-classified event count fell from ~1.2k/day pre-PR to <50/day post-PR. Also checked `system.query.history` for relevant migration queries. None found.

After the Sources Consulted block, if the user's `why` question is a precursor to actually changing this code, convert lineage findings into a Preserve / Change / Avoid / Risk constraint set suitable for planning the change.

## Common Failure Modes to Avoid

- **Confident storytelling**. Inventing a plausible narrative from thin evidence. If your bullet doesn't have a citation, it goes in "inferred" or "hypotheses," not "what we found."
- **Citing the code as evidence for its own intent**. "This function handles the null case because it checks for null." That's mechanics, not motivation. The motivation has to come from an external source (PR discussion, ticket, comment, conversation) or be clearly labeled as inference.
- **Recency bias**. Assuming the most recent commit is authoritative. The current shape is often the accretion of many earlier decisions. Trace back.
- **Sycophantic agreement**. If the user suggests a reason in their question ("I assume this is for performance?"), don't just confirm it. Treat it as a hypothesis and check the evidence independently.
- **Skipping the gaps section**. It's tempting to end on a strong note, but an honest accounting of what you couldn't find out is part of the value.
- **Skipping investigators by anticipation**. Deciding up front that "long-form docs probably don't have this" or "this isn't an error tracking thing" without actually searching. This is the failure mode the default-to-all-seven posture exists to prevent. A null result from a search is a data point; a skipped search is a blind spot.
- **Collapsing investigators into one agent**. Giving one subagent multiple MCPs to cover. Each MCP has its own query vocabulary, result shape, and common pitfalls. Pooling them dilutes specialization and makes it harder for the synthesizer to reason about coverage. Always one investigator per category.

## Reference Files

- `references/epistemics.md`. Confidence tiers and phrasing guide. The synthesizer must follow it.
- `references/investigator-prompt.md`. Base prompt template for investigator subagents.
- `references/source-playbook.md`. Index pointing at category-organized playbooks below.
- `references/sources/*.md`. One self-contained example playbook per category, plus a cross-cutting `incident-postmortem.md`. Give an investigator the single file that matches its assigned category and adapt it to the available MCP.
- `references/synthesizer-prompt.md`. Prompt template for the synthesizer subagent, including the output format.
