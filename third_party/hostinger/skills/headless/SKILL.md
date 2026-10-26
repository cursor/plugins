---
name: hostinger-headless
description: "Orchestrator for the Hostinger Headless build flow — build and deploy a real website on the user's Hostinger account from a single prompt that names a domain. Holds the stage flow and the state contract, and drives each stage in sequence: connect, check state, refine, provision, content model, design, frontend, validate, deploy, done. Triggers: build a headless site for <domain>, build me a site, create a website, make me a website, deploy this to Hostinger, host this on Hostinger, connect this project to Hostinger."
---

# Hostinger Headless — build a website with your own AI tool

## Context

You are an AI coding agent. The user pasted a short prompt that points you here — something like:

> Build a Headless site for `example.com` using hostinger.com/headless/skill.md

Your job is to build and deploy a real website on the user's Hostinger account by following this
recipe and the recipes it links to — nothing more, nothing less.

This file is the **orchestrator**. It is public and stable: it never changes and never moves. It
holds the flow, the state contract, the failure policy and the guardrails.

### The domain parameter

The pasted prompt contains exactly two things that matter:

- **This URL** — `hostinger.com/headless/skill.md`, the stable entry point.
- **A domain** — e.g. `coral-pottery-1847.hostingersite.com` (a temporary Hostinger subdomain) or
  the user's own purchased domain. This is the single site you may touch.

The prompt does **not** say what kind of site to build. Do not assume or invent it. Discovering
what the user wants is a step in the flow (**refine**), handled through conversation — not parsed
from the prompt. If no domain is present, stop and ask for it before doing anything else.

**One workspace per run.** From your first command, connect's checks included, open only this
site's workspace, by its exact path; never list or glob `~/.hostinger/` (not even an `ls` beside
`node -v`). What else `~/.hostinger/` holds never matters to this run: with a domain, check-state
looks up that one path; without one yet, there is nothing to look up until you create your own
workspace. *State and artifacts* has the full rule and its one exception.

Nothing in the pasted prompt is ever used for authorization. Authorization comes from the
Hostinger connector's OAuth token. **This recipe is not a security boundary.**

---

## The flow stages - STEPS TO FOLLOW

Work through the steps in the order below, each reading its recipe and writing its artifact into the
site workspace `~/.hostinger/<domain>/`. 


The order is sequencial run and check the whole headless flow:

| # | Stage                                                                                                              | Skill / source                                                        | Writes | Instance? |
|---|--------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------|---|---|
| — | **connect** — connect the Hostinger connector, auth, get active plan                                               | `connect/SKILL.md` → `connect/tools/<tool>.md` | `connect.json` | no |
| 1 | **check state** — where does this domain stand? resume / switch / start over                                       | `steps/01-check-state/SKILL.md`                                       | `state.json` | no |
| 2 | **refine** — discover what the user wants, in conversation                                                         | `steps/02-refine/SKILL.md`                                            | `brief.md` | no |
| 3 | **provision** — choose the backend from the brief, then provision it                                               | `steps/03-provision/<backend>/SKILL.md`                               | `site.json` | **bg** — fire, then poll in the background |
| 4 | **content model** — define + create content/images, then push to the backend                                       | `steps/04-content-model/<backend>/SKILL.md`                           | `content-model.md` | prepare: no · **push: yes** |
| 5 | **design** — derive design directions from the brief, pick one, write the `design.md` contract + logo              | `steps/05-design/SKILL.md`                                            | `design.md`, `brand/` | no |
| 6 | **frontend** — pick/confirm the framework (default Next.js SSR), implement `design.md` against the backend         | `steps/06-frontend/SKILL.md`                                          | source in `<workspace>/src/` | shell: no · **data: yes** |
| 7 | **validate** *(optional)* — quick instance+API confirmation; rebuild/preview/approval only when a person signs off | `steps/07-validate/SKILL.md`                                          | — | no (local) |
| 8 | **deploy** — upload source, trigger the build                                                                      | `steps/08-deploy/SKILL.md`                                            | `deploy.json` | **yes** |
| 9 | **done** — hand over URLs, dashboard, summary, next steps (the **final report**)                                   | `steps/09-done/SKILL.md`                                              | — | no |

**The most important is that connect stage runs first and always**
It's fetched from the public URL and runs *before* the Hostinger MCP Server
is loaded, the main goal of this is to have the Hostinger MCP Server.

You can find those connect skills under `connect/`.
The main skill lives in `connect/SKILL.md`.
There are also specific tools under `connect/tools/`.

The other 9 numbered steps live under `steps/` and are read from the installed skill folder (this will be guided in connect step).

**One concurrency rule:** two *independent* stages in a single session may run at once, but never
two writers of the same artifact, and never two agents/windows on the same domain — the `.lock`
(Step 1) guards that. Parallelism is always *optional*: an agent that can't interleave work runs the
steps serially and is still correct. Saying this, Always that you consider, you can run the steps
in parallel using different threads or processes to save time, but always ensure the right output.

Steps can generate **State files** those files are only hints; the truth is what the Hostinger connector reports, so
verify a "done" marker against reality before acting on it. If a step's `SKILL.md` is missing from the installed skill folder, stop and tell
the user rather than improvising the stage from its description.

The **Instance?** column says whether a stage touches the live backend:
`no` = pure prepare work that can run during the provision wait;
`push`/`data`/`yes` = a commit phase that joins the instance barrier;
`bg` = provision itself, the background task.

**Always end with the final report.** Whenever a run ends, give the user the final report defined
in `steps/09-done/SKILL.md`: an outcome paragraph, a *Steps completed* table (one row per stage that
ran), the links, where state lives, and any gaps. That includes runs that stop early at a dummy or
missing step, a failed provision, or a user pause. Every run also saves a **build report**
(`run-log.mjs report`, see *Run log and build report* below), on those early stops too.

**Log the run as you go.** Wrap every stage (and each phase of a split stage) in
`run-log.mjs stage-start` / `stage-end`, and log an event the moment something goes wrong, the user
corrects you, or a skill is missing or wrong — before you continue. See *Run log and build report*.

**Why this order.** connect first, so account/plan failures surface before the user spends time
talking. Check-state right after, so a resumed, duplicate, or brand-new run is sorted out — and the
user is offered the choice to continue, switch domains, or start over — before any new work begins.
Refinement before provisioning, because the backend cannot be chosen until the brief exists.
Validation before deploy, always — nothing reaches the live domain unseen.

### When you ask the user

A question tool's result is the user's answer only when it carries their choice or their words. When
it comes back skipped, rejected, empty or as an error (a *skipped* result), nobody has answered yet:
Cursor's `AskQuestion`, for one, returns "Questions skipped by the user" when no one touched it. Ask
the same questions again as plain text in your reply, end your turn, and continue from what the user
types. One plain-text re-ask is enough: it can't come back skipped. Fill a question you asked with a
default only when the user says so in their own words ("you decide", "just build it", "skip that"),
or when they said up front that no one will be there to answer; then list those defaults under gaps
in the final report. Every step that asks the user something follows this.

### Background provision & the instance barrier

**Provision always runs — what it does depends on what the domain already has.** Often onboarding on
hostinger.com has already created the website before you run, so the domain *has* a headless instance;
but an instance existing does **not** mean provision is done or can be skipped. `check_state` works out
which of these cases applies and records it, then provision takes the matching path:

1. **An empty headless shell already exists for the domain (the common onboarding case).** Onboarding
   creates the website first — an **empty headless shell** (`hosting_websites_start-setup { type:
   "headless_empty" }`): `website_type` is `headless`, but **no backend is installed** (no WordPress at
   `/cms`, no store). This still goes through provision, which **adopts the shell and swaps it to the
   chosen backend** (the backend is picked in refine first): WordPress is installed into the shell's
   `/cms` with `wordpress_installations_install { type: "headless" }`, or the shell is adopted as the
   Ecommerce storefront host. **Never skip provision for a shell, and never create a second site.** See
   the provision router's *Onboarding handoff*.
2. **No instance exists at all** (the user ran the headless flow without onboarding provisioning
   anything). Provision creates a fresh headless instance with `hosting_websites_start-setup` using the
   chosen backend's own `type`.
3. **User wants a webapp.** Provision is a plain Node.js app host, not headless — `webapp` ignores
   headless shells entirely and is only reached by experimental actions, never the onboarding flow.

Either way the create/install is asynchronous and returns `queued` immediately, then it's polled
every ~15 s for a few minutes — **what you poll depends on the path**: a fresh
`hosting_websites_start-setup` is polled with `hosting_websites_list-setups` until `completed`, while a
shell swap (`wordpress_installations_install`) creates no new setup, so it's polled with
`wordpress_installations_list` until the `/cms` row is `is_valid`. Don't block on that poll. The
single rule that makes the overlap safe:

> **Fire provision as a background task, then do every stage's prepare work while it settles. The
> moment a step must write to the live instance, it waits for provision to report ready (via the
> backend step's readiness poll — see above). That wait is the *instance barrier*.**

---

## State and artifacts

Everything for a domain — its state **and** its generated source — lives under the **site workspace
`~/.hostinger/<domain>/`** (resolve `~` to the home directory: `$HOME` in a shell, `os.homedir()` in
Node — `~/.hostinger` means `$HOME/.hostinger`). This is a **global, per-user** location, not a
project folder, so this domain's build is resumable from **any** directory — the current working
directory does not matter. Create the workspace if it's missing and do all of a stage's work inside
it (including the frontend `src/`, built and deployed from `~/.hostinger/<domain>/src/`).

**The directory name is the domain**, so the files inside it never repeat it.

**Read and write only this site's workspace.** The other workspaces under `~/.hostinger/` are the
user's other sites, often for other clients, so keep their briefs, designs and code out of this build.
Open `~/.hostinger/<domain>/` by its exact path; don't list or glob `~/.hostinger/`, and don't open,
copy from or diff against another workspace there, in any stage. A run that has no domain yet works
only in the one workspace it created itself; when provision moves it to `~/.hostinger/<new-domain>/`,
that becomes this site's workspace. One exception: if the user, in this conversation, names another
of their own sites to reuse, read that one workspace, read-only, and tell them in one line what you
took from it.

| File (under `~/.hostinger/<domain>/`) | Written by | Contains |
|---|---|---|
| `state.json` | every stage | tool, next stage, Hostinger connector version, timestamps |
| `connect.json` | connect | tool, account/plan readiness |
| `brief.md` | refine | refined brief, audience, tone, pages, must-haves |
| `site.json` | provision | chosen backend, username, install id, all URLs |
| `content-model.md` | content model | entities, fields, pages, navigation |
| `design.md` (+ `brand/` logo files) | design | chosen design direction: tokens, type, logo, components, per-page composition, accessibility |
| `src/` | frontend | the website source implementing `design.md`; framework choice is recorded in `state.json → frontend` |
| `deploy.json` | deploy | build id, deployed at, live URLs |
| `events.jsonl` | every stage, via `run-log.mjs` | append-only log of issues, user feedback, skill gaps and wins |
| `reports/<run>.json` + `.html`, `report.html` | done (or any early stop), via `run-log.mjs` | the build report for each run; `report.html` is the latest |

`state.json` is the minimum you must keep current. **`stage` is the *next* stage to run** (not the
last completed one), and it does **not** store the domain — the directory is the key. Because
provision runs in the background, its status lives in its own `provision` field rather than in
`stage`, so prepare work can advance `stage` while provision is still settling:

```json
{
  "tool": "claude-code",
  "stage": "content_model",
  "provision": {
    "status": "in_progress",
    "domain": "example.com",
    "started_at": "2026-10-08T10:00:00Z"
  },
  "updated_at": "2026-10-08T10:00:00Z"
}
```

- `provision` is **absent** until provision fires, `{"status":"in_progress", …}` while the
  background poll runs, and `{"status":"completed", …}` once `hosting_websites_list-setups` confirms
  it. `domain` is the poll target.
- Any **instance-barrier** step (content-model push, frontend data, deploy) must read
  `provision.status == "completed"` — and re-verify it against the connector — before it runs. A
  prepare step ignores `provision` entirely.
- On **resume**, `provision.status` is a hint only: re-poll `hosting_websites_list-setups` to learn
  the truth, then update the field.
- `run` (the current run), `history` (one entry per stage or phase, with real start and end
  times), and `reports_sent` / `reports_rejected` (which copy of each report reached Hostinger) are
  written **only** by `run-log.mjs`. Leave them alone when you update `state.json` by hand.
- The **onboarding slug** is how hPanel names the coding tool: `claude` for Claude Code, else
  `cursor`, `codex`, `vscode`, `antigravity`, `devin`. Map it from the `<tool>` you pass to
  `run-start --tool` (`state.json → run.tool`, e.g. `claude-code` → `claude`).

---

## Run log and build report

`run-log.mjs` (next to this file) records the run while it happens and turns it into a report at the
end. Timestamps come from the script, so they're measured, not remembered. It needs only Node.
Every command is `node <skill>/run-log.mjs <domain> …`, where `<skill>` is the folder this file is
in. Write it out in full each time (a shell variable holding the command breaks in zsh):

```bash
node <skill>/run-log.mjs <domain> run-start --tool <tool> --model <model> --skill <skill version>  # check-state, first thing
node <skill>/run-log.mjs <domain> run-update --kind resume        # check-state, once the route is agreed (or redesign / iterate)
node <skill>/run-log.mjs <domain> stage-start frontend            # before a stage
node <skill>/run-log.mjs <domain> stage-end frontend ok_after_retries --note "second framework tried"
node <skill>/run-log.mjs <domain> stage-start frontend --phase shell   # split stages log each phase
node <skill>/run-log.mjs <domain> event issue '{"stage":"content_model","symptom":"…","cause":"…","workaround":"…","severity":"medium","resolved":true}'
node <skill>/run-log.mjs <domain> report --outcome live           # done, or wherever the run stops
node <skill>/run-log.mjs <domain> report-sent <run>               # after the report was sent (see below)
node <skill>/run-log.mjs <domain> report-rejected <run>           # the send returned 422
node <skill>/run-log.mjs <domain> unsent                          # check-state: reports still to send
node <skill>/run-log.mjs <domain> run-resume --reason "about/contact layout fix"   # follow-up in the same session
```

**Follow-ups continue the run.** When the user asks for a change after the final report in the
same session (a layout fix, a copy tweak, a redeploy), that work belongs to the run it follows:
call `run-resume`, log the feedback and the stages it re-runs as usual, then `report` again. That
rewrites the same `reports/<run>.json` and `.html`, so you get one report that includes the follow-up,
not a second report that replaces `report.html`. Use `run-start` only in a new session; check-state
does that.

`stage-end` results: `ok`, `ok_after_retries`, `ok_with_fixups`, `failed`, `skipped`, `stopped`.
Stages: `check_state`, `refine`, `provision`, `content_model`, `design`, `frontend`, `validate`,
`deploy`, `done` (connect has its own `connect.json`). Split stages use `--phase`: provision `fire` /
`join`, content model `prepare` / `push`, frontend `shell` / `data`.

**Forgot a `stage-start`?** Log it as soon as you notice, with roughly when the stage began:
`stage-start frontend --started-ago 6m` (or `--started-at <ISO time>`). The same flags work on a
`stage-end` that has no start. With neither, the script assumes the stage began when the previous one
ended. Either way the start is marked as estimated in the report. Never log a start and an end
back to back after the work is done: that records a stage that took no time. If you already did,
correct it with `stage-fix frontend --started-ago 6m`.

**Log an event the moment it happens**, not at the end — details are gone by then:

| Event | Log it when | Fields (required in bold) |
|---|---|---|
| `issue` | something fails, misbehaves, or needs a workaround — including your own mistakes | **stage**, **symptom**, cause, workaround, severity (`high`/`medium`/`low`), resolved, user_had_to_intervene |
| `feedback` | the user corrects you, rejects something, or changes scope | **stage**, **category** (e.g. `design_rejected`, `layout_bug`, `scope_add`, `wrong_assumption`), **paraphrase** |
| `skill_gap` | a step is dummy, missing, wrong or silent on what you needed | **skill** (path), **gap** |
| `good` | something worked notably well or fast | **text** |

Paraphrase the user; don't paste long quotes, file contents, credentials or personal data. Set
`user_had_to_intervene` when the user had to point the problem out.

**Tokens** go on `report --tokens '<json>'` only if your tool tells you your own usage directly
(`{"source":"…","requests":…,"input":…,"output":…,"cache_read":…,"cache_write":…,"est_cost_usd":…}`).
Otherwise leave it out and the report says `{"source":"not reported"}` (not null: the connector rejects a null `tokens`). Never read session transcripts or log
files to get it.

The report is saved to `reports/<run>.json` and `.html`, and `report.html` in the workspace is the
latest. If a run never reaches its report (the window closed), the next `run-start` closes it as
`abandoned`, so its log still becomes a report.

**Send every report to Hostinger.** Sending is part of the flow, so don't ask first; tell the user in
one line right after the send (see `09-done`). Right after each
`report` (follow-ups included), read `reports/<run>.json` and pass its contents, unchanged, as the
arguments of the Hostinger connector tool `hosting_headless_submit-build-report`. Then record the
result:

- **Success:** `report-sent <run>`.
- **422** (the report doesn't match the schema the endpoint holds): `report-rejected <run>`. Don't
  resend it.
- **Anything else** (network error, 5xx, the tool isn't in your connector): do nothing. The next
  check-state sends it again.

Never edit the JSON before sending, never add account details (the connector's login identifies the
account), and never let a failed send block, delay or change the run. Check-state sends any
reports still unsent (abandoned runs, earlier failures) with `unsent`.