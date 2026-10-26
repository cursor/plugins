---
name: headless-step-check-state
description: "First build step of the Hostinger Headless flow, run right after connect. Works out where a given domain's build stands — is a run already in progress, does the site already exist, how far did it get — by reconciling the global workspace state under ~/.hostinger/<domain>/ with what the Hostinger connector reports, then guides the user to continue, switch or buy a domain, or start over. Owns all resume/position logic for the flow."
---

# headless-step-check-state

The first build step of the Hostinger Headless flow (orchestrated by `hostinger.com/headless/skill.md`),
run right after connect. Connect has already connected the Hostinger connector and confirmed the
account can build. Your job here is to
**figure out where this domain stands and agree the route with the user** before any new work begins.
This step owns all resume/position logic — no other stage second-guesses it.

Nothing in this step creates, provisions, deploys, or deletes anything. It reads and guides. Its
only writes to Hostinger are reports: unsent build reports (Step 0) and the connected tool (Step 3).

---

## Where state lives

Everything for a domain lives under the global site workspace **`~/.hostinger/<domain>/`** — one
directory per domain, under the user's home (`~` = `$HOME`), **not** the current working directory.
The directory name **is** the domain, so `state.json` inside does not store it. Because it's global,
this domain's build is resumable from any directory.

`state.json` shape (`stage` is the *next* stage to run; `provision` is the background task's status,
present only once provision has fired):

```json
{ "tool": "claude-code", "stage": "content_model",
  "provision": { "status": "in_progress", "domain": "<domain>", "started_at": "…" },
  "updated_at": "…" }
```

`provision.status` is `in_progress` or `completed` — but it is a **hint**: always re-verify it against
`hosting_websites_list-setups` (Step 1) before trusting it to gate an instance-barrier step.

---

## Step 0 — Start the run log

Before anything else, start a run and the stage (see *Run log and build report* in the top-level
`SKILL.md`):

```bash
node <skill>/run-log.mjs <domain> run-start --tool <tool> --model <model> --skill <skill version>
node <skill>/run-log.mjs <domain> stage-start check_state
```

If an earlier run on this domain never wrote its report, `run-start` closes it as `abandoned` first.

Then send any build reports that haven't reached Hostinger yet (that abandoned run, or a send that
failed last time):

```bash
node <skill>/run-log.mjs <domain> unsent
```

Each line is `<run> <path>`. For each, send the file through `hosting_headless_submit-build-report`
and record the result, as described in *Run log and build report* in the top-level `SKILL.md`. One
try each. Don't ask first; if any went out, say so in one line (e.g. "Sent 1 earlier build report to
Hostinger."). Don't let a failure hold up this step.
Check-state runs once per session. A follow-up after the final report, in the same session, doesn't
come back here: it calls `run-resume` (see *Run log and build report* in the top-level `SKILL.md`).

## Step 1 — Is a build actively running right now? (check this before anything else)

Keep two things separate, and **never guess from a timestamp.**

- **A platform build actively in progress** — the only *reliable* "running now" signal. Check
  `hosting_websites_list-setups { "domain": "<domain>" }` and exact-match the domain row:
  - `status: running` → provisioning is underway **right now** (a background provision from an earlier
    turn). Don't start a second one — reconcile `state.json`'s `provision` to `in_progress`, and
    either resume prepare work while it finishes or poll it to `completed` at the barrier.
  - `status: failed` → not running; route to provision to self-heal (Step 3).
  - `completed` → provision is done; set `provision.status` to `completed`. Instance-barrier steps
    (content push, frontend data, deploy) are now unblocked.
  - no row → not provisioned yet; carry on.

  This check **is** the source of truth for `provision.status`: a stored `in_progress`/`completed` in
  `state.json` is only a hint until this reconciles it.

- **A `.lock`** — `~/.hostinger/<domain>/.lock`. It only tells you *a previous run
  touched this domain*. **Do not judge it by age** — a 2-minute-old lock and a 3-year-old lock get the
  same treatment, and a lock on its own is **not** a reason to interrupt the user. Carry it into Step 5:
  if there's nothing to resume (new build), silently take it over; only if there's real state to resume
  do you also ask *is another Claude window building this domain right now?* (yes → stop; no → take
  over).

Once you're actively working this domain, **acquire/refresh the lock** (write the current timestamp),
and **release it on a clean stop** (Step 6). The lock marks an active session, nothing more.

---

## Step 2 — Read the workspace directory

Check `~/.hostinger/<domain>/` by its exact path (for example `test -d ~/.hostinger/<domain>`), not
by listing `~/.hostinger/`:

- **Absent** → no history for this domain in the workspace.
- **Present** → read `state.json` (its `stage`) and whatever artifacts exist (`brief.md`,
  `site.json`, …). Treat these as a hint, not the truth.

---

## Step 3 — Verify against reality (reality wins)

Query the Hostinger connector — the local files are never trusted on their own:

- **Does the site exist?** `hosting_websites_list { "domain": "<domain>" }`. ⚠️ This filter is a
  **case-insensitive substring match**, not exact — so `test.com` would also return
  `shop.test.com`. **Compare each returned row's `domain` to your target for an *exact* match**
  (case-insensitive) and ignore the rest. No exact row ⇒ the domain is free. An exact row ⇒ the site
  exists; note its `website_type` (`headless`, `wordpress`, `nodejs`, …) and `username`.
- **Tell hPanel the tool connected.** As soon as you have the exact row, call
  `hosting_headless_report-tool-connected { "username": "<row username>", "domain": "<domain>", "tool": "<slug>" }`
  once, where `<slug>` is the onboarding slug (see *State and artifacts* in the top-level `SKILL.md`).
  This flips hPanel's onboarding card to "connected". Don't ask first and don't mention it. Skip the
  call when there's no exact row or your tool has no onboarding slug. If
  `hosting_headless_report-tool-connected` isn't in your connector, or the call returns an error,
  ignore it: no retry, nothing said to the user, and the run carries on unchanged.
- **How far did it get?** If the site exists, check its setup via
  `hosting_websites_list-setups { "domain": "<domain>" }` (exact-match the row the same way):
  - `status: completed` → provisioned; then, depending on backend, check whether a build has succeeded.
  - `status: running` → still provisioning (see Step 1).
  - `status: failed` → provisioning stopped before finishing → route to **provision** to self-heal.
- **Is it an empty headless shell from onboarding?** A `headless` site whose setup is `completed` is
  **not necessarily finished** — onboarding now creates the website *before* the build runs, as an
  **empty headless shell** (`hosting_websites_start-setup { type: "headless_empty" }`): `website_type`
  is `headless` but **no backend is installed** (no WordPress at `/cms`, no store). Tell a shell from a
  real backend the same way provision does: within 24 h the setup `type` is `headless_empty`; otherwise
  `wordpress_installations_list { username, domain, ownership: "all" }` returns **no** `/cms` row and
  there is no `site.json` recording a backend. An empty shell means **provision has not chosen or
  installed a backend yet** — this is a **new build** that happens to already own its website, not a
  finished or resumable one. Route it to **refine** (choose the backend), then **provision** adopts the
  shell and swaps it to that backend (see the provision router's *Onboarding handoff*). Never create a
  second site, and never skip provision for it.

Reconcile with the local state. **When they disagree, reality wins** and the local `stage` is
corrected.

---

## Step 4 — Determine the position

Connect always writes `state.json` (with `stage: check_state`) before this step runs, so local
state is never truly empty. **"Local state: none" here means only connect artifacts exist** —
`connect.json` + a `state.json` still pointing at `check_state`/`refine`, and **no build artifacts
yet** (`brief.md`, `site.json`, …).

| Local state | Reality (domain) | Position |
|---|---|---|
| none (connect only) | free | **new build** — start from refine |
| none (connect only) | empty headless shell (onboarding) | **new build on an existing shell** — start from refine; provision adopts the shell and swaps it to the chosen backend. Never create a second site, never skip provision |
| none (connect only) | site exists with a real backend | **adopt / resume** — never create a second site; route to the first unfinished stage |
| build artifacts present, incomplete | matches | **resume** at `state.json`'s `stage` |
| build artifacts present | disagrees | **reality wins** — recompute the stage from what actually exists |
| build artifacts present, all done | live site exists | **finished** — this is now an *iterate* request, not a build |

---

## Step 5 — Guide the user

The question to ask depends on whether there is actually **something to resume** — i.e. **build
artifacts** (`brief.md`, `site.json`, …) or a **live site** for this domain. A stray `.lock` or
connect-only files are *not* something to resume.

- **New build** (no build artifacts and either the domain is free **or** it holds only an empty
  headless shell from onboarding) → just proceed to refine. **Don't ask resume vs start over** —
  there's nothing to resume; both would land in the same place. An empty headless shell is not
  "something to resume": it has no backend and no content yet, so it's a fresh build that already owns
  its website — provision will adopt and swap it. Mention it in one line ("Using the headless site
  onboarding already created for this domain."). If a leftover `.lock` is lying around, silently take
  it over and continue (optionally mention it in one line).
- **Something to resume** (build artifacts exist, or a site exists for the domain **with a real backend
  installed** — WordPress at `/cms`, a store, or a deployed app) → tell the user plainly what's there
  and **ask them to choose**, regardless of how old it is (don't guess from timestamps):

- **Resume** — pick up at the computed stage. (If a `.lock` is present in this case, also confirm no
  other window is actively building this domain right now.)
- **Start over / redo a step** — only safe **before anything is provisioned**. If the site is already
  provisioned or live, you **cannot** re-create it: that is forward-only *iterate* (change content or
  design and redeploy), not a fresh build. Never re-provision or overwrite a live site; if the user
  insists on a clean slate for a live domain, explain the limitation and point them at hPanel.
- **Switch domain** — they want a different domain. A new domain is a **new workspace**
  (`~/.hostinger/<other-domain>/`, with its own `src/`). Hand off to start that domain's run.
- **Buy a domain** — they want a custom domain instead of the temporary one. Route to the domain
  purchase / `connect-domain` flow, then continue with the chosen domain.

When the intent is ambiguous, **ask** — don't guess. A skipped tool result is ambiguous; see
*When you ask the user* in the top-level `SKILL.md`.

---

## Step 6 — Record and route

Write `~/.hostinger/<domain>/state.json` with the agreed next `stage` and a fresh timestamp. If the
route isn't a new build, record it with `run-log.mjs <domain> run-update --kind resume` (or
`redesign` / `iterate`), then end the stage with `stage-end check_state ok --note "<the route>"`.
Then:

- **Handing straight to the next stage in this same session?** Keep the `.lock` (you are still
  actively running) and continue.
- **Stopping and returning control to the user?** (e.g. the next stage isn't built yet, or you are
  waiting on them.) **Delete the `.lock`** — the session is no longer active, and a leftover lock just
  forces an unnecessary "is another window running?" question on the next run. Always release the lock
  on a clean stop; it exists only to mark an actively-running session. A stop is still the end of a
  run: give the final report and save the build report (`09-done`).

---

## Invariants

- **One directory per domain.** The domain is the key; state files never repeat it.
- **Only this domain's workspace.** Never list `~/.hostinger/` or open another site's workspace (see
  *State and artifacts* in the top-level `SKILL.md`).
- **Never create a second site** on a domain that already has one.
- **Never re-provision or overwrite a live site.** Recovery is forward-only.
- **Reality beats local state**, always.
- **When ambiguous, ask.**
