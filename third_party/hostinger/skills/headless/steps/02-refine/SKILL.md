---
name: headless-step-refine
description: "Step 2 (refine) of the Hostinger Headless flow. Turns the user's seed — often just a domain — into a brief through conversation: asks what they want to build (purpose, audience, tone, pages, products, must-haves; images, local files, links all welcome), then *infers* the backend that fits (WordPress, Ecommerce, WordPress + Ecommerce, WordPress + WooCommerce for a one-site content+store, or Webapp for a custom app/SPA) — it never asks the user to pick a backend or a technology; the user confirms the plan in plain language, then it writes brief.md. Hostinger Ecommerce stays the default for selling; WooCommerce is chosen only when the user explicitly asks for it or wants content and a store on one WordPress site."
---

# headless-step-refine

Find out what the user wants to build, guess which backend fits, and write it down. This is a
**conversation, not a form**: the pasted prompt names a domain and nothing else, so everything about
the site comes from talking to the user.

**Keep it short.** The only thing you must know is *what they are building* — enough to guess the
backend. Every other question is optional: the more the user gives, the better the site, but never
hold the build hostage to refinement. Fill gaps with sensible defaults and say so in the brief. A
skipped question tool is not the user passing on a question; see *When you ask the user* in the
top-level `SKILL.md`.

> **Never ask the user to choose a backend or a technology.** Don't ask "WordPress or Ecommerce?",
> don't present WordPress/Ecommerce/WooCommerce/Webapp as options, and don't surface the backend in a
> multiple-choice UI. Open with **"What do you want to build?"** and infer the backend yourself in
> Step 4 from what they describe (and whether they sell). The backend is a technical decision the flow
> makes *for* the user — they confirm the **plan** (what the site is and does), not the plumbing. The
> only exception is when the user *volunteers* a backend ("build it on WordPress", "use WooCommerce"):
> then honour their choice and note it in the brief.

**In:** the domain (the workspace directory name), plus anything the user already shared.
**Out:** `~/.hostinger/<domain>/brief.md`.

Nothing in this step touches Hostinger. It only asks, decides and writes.

---

## Step 1 — Read the workspace, then the resume check

Read everything already in `~/.hostinger/<domain>/` (`state.json`, `connect.json`, any notes, images
or files the user dropped there) — it all counts as input.

If `brief.md` already exists for this domain, **don't overwrite it**. Show the user a three-line
summary (what the site is, its pages, the suggested backend) and ask: *keep it, or change
something?* Keep → go to Step 6. Change → edit only what they asked for, then re-confirm (Step 5). A
skipped tool result is not Keep; see *When you ask the user* in the top-level `SKILL.md`.

If the site is already provisioned (`site.json` exists), the backend is **fixed** — never change the
Suggested backend on a provisioned site. Explain that switching backends means a new domain.

## Step 2 — Gather what you already have

Before asking anything, collect what the user has already given you, so you don't ask for it again:

- **Inspect the directory the command was run in** — this is the biggest signal for the build mode
  (Step 3). Look for an existing **frontend / webapp / commerce project**: a `package.json`, a
  framework config (`next.config.*`, `astro.config.*`, `vite.config.*`, `svelte.config.*`, `nuxt.*`),
  a `src/` or `app/` tree, `index.html`, a storefront/cart, etc. A real project here usually means the
  user **already has their own frontend** and mainly needs a Hostinger backend to wire it to — lean
  toward "bring your own frontend" in Step 3. If the folder has nothing site-like, assume they don't
  and lean toward "agent builds it".
- Anything in the pasted prompt beyond the domain (a sentence, a link, a screenshot).
- Files in the current project that look like site material (copy, logos, product lists, images).
- What the agent already knows about the user from local memory or this conversation (a prior build,
  stack preferences, a frontend they always use).
- The domain name itself — a hint only (`coral-pottery.com` suggests pottery), never a conclusion.

## Step 3 — Ask

If Step 2 already answers *what are you building* and *will they sell*, skip the Round 1–3 questions
below, but still ask **Build mode** before moving on.

Otherwise open with one line and **wait for the user's answer**: *"Tell me what you want to build — a
sentence is enough. Links, screenshots or files help too. Skip anything you don't want to answer."*

> **"What do you want to build?" is an OPEN question — ask it in plain prose and wait.** Never turn it
> into a multiple-choice list of pre-baked site ideas ("Coffee shop / Travel blog / Portfolio …"):
> that puts words in the user's mouth and defeats the point of asking. Let them describe it in their
> own words. The structured question UI is only for genuinely *choice-shaped* follow-ups (selling
> yes/no, which pages, tone adjectives, the build mode) — not for the opening question, and never for
> the backend.

Ask in **short rounds of 2–3 questions**, and adapt each round to the previous answers. If your tool
has a structured question UI (multiple choice with an "other" field), use it for the choice-shaped
follow-up questions (pages, selling yes/no, tone) — **never for the opening "what do you want to
build?" and never for the backend** (that's your decision, not theirs). **At most 3 rounds**, and
stop early as soon as you can guess the backend and the user seems done — "just build it" or "you
decide" means *use defaults*, not *ask again*. A skipped tool result is not their answer: re-ask
that round in plain text, as *When you ask the user* in the top-level `SKILL.md` says. The re-ask
repeats the round; it doesn't count toward the 3.

**Round 1 — what it is (the only required round):**

1. **What are you building?** The business or project, and what the site is for.
2. **Will you sell anything on it?** Physical products, digital products, services with checkout —
   or nothing. *This decides the backend.* Skip it only when the answer is already unmistakable
   ("an online shop for my candles", "my personal blog"); when in doubt, ask.
3. **Who is it for?** The audience, and how they'll find the site. *(optional)*

**Round 2 — what goes on it (optional, adapt to Round 1):**

- **Content they'll publish over time** — blog posts, articles, news, recipes, portfolio pieces,
  case studies? How often? Or is it a handful of pages that rarely change?
- **Pages** — propose a page list from what you know and ask them to add or remove.
- If they sell: **what and how many** — a rough product count, categories, whether products have
  variants (size, colour), and the shipping regions.

**Round 3 — how it should feel (optional, skip what you already know):**

This is the round that captures **all design input** — the design step reads it from `brief.md` to derive
the design directions, so it is **not** asked again later; gather it here:

- **Reference & look** — a **site they like (URL)** and what to take from it, plus a few adjectives for
  the vibe. Screenshots welcome.
- **Colours & brand** — brand/accent colours, logo, fonts, existing copy, photos. Note where they live.
- **Must-haves and no-gos** — contact form, newsletter, bookings, languages, things to avoid.

If the user asks for something outside the scope (user accounts, member areas, bookings with a
calendar backend, user-generated content), say plainly that the headless flow doesn't support it yet
and record it under **Out of scope** — don't promise it.

> **A contact form *is* supported (WordPress backends).** If the user wants one, keep it in
> **Must-haves** and name it "Contact form". Provision installs **Contact Form 7** on `/cms` and the
> frontend wires a contact page whose form emails the site owner through WordPress's built-in
> `wp_mail()` — no third-party service and no API keys. It's **opt-in**: built only when the brief asks
> for it. (A form that needs accounts, payments or a booking calendar is still out of scope — this is a
> plain name/email/message enquiry form.)

### Build mode — ask once (this one *is* a user choice)

The backend is your call, but **how the frontend gets built is the user's** — because most of the time
the user already has their own frontend and just needs a Hostinger backend to wire it to. After the
folder + memory inspection (Step 2), ask **one** question (a structured choice is ideal here), seeding
the default from what you found:

- **Bring your own frontend** *(default when Step 2 found a real project in the folder)* — "I already
  have a frontend / I'll drive the design and we vibe-code it together." The agent **uses the user's
  existing project in the current folder as the source**, collaborates on design/code at the user's
  direction, and wires it to the provisioned backend. There is **no agent-generated design** — the
  design step defers to the user (see the Build mode box at the top of the design step), and the frontend step builds on their project
  rather than scaffolding a new one.
- **Agent designs and builds it** *(default when the folder has nothing site-like)* — "Give me ideas
  — you design and code it." Today's flow: the design step proposes directions and the frontend step
  scaffolds and implements them.

A skipped tool result is not a pick: re-ask in plain text, and use the seeded default only when the
user says so (see *When you ask the user* in the top-level `SKILL.md`).

Record the answer as the brief's **Build mode**. This is the one frontend/technology question you *do*
put to the user; everything else about the stack (framework, SSR/SSG) is still inferred. The deliverable
is the same either way — a working site on the backend; only *who drives the frontend* changes.

## Step 4 — Decide the backend (your call, from the brief — not a question)

From what the user described, **you** pick the backend that fits — this is an internal decision, never
a question put back to the user. Pick the backend that fits what the user told you:

| Backend | Choose when | What it gives the owner |
|---|---|---|
| **WordPress** | No selling. The owner publishes and edits content: pages, blog, articles, portfolio. | Headless WordPress at `/cms` — write and edit content in wp-admin. |
| **Ecommerce** | Selling is the point, and the rest is a few static pages (About, Contact, FAQ, policies). No ongoing blog. | Hostinger Ecommerce store — products, collections, checkout, payments, shipping, orders. |
| **WordPress + Ecommerce** | Selling **and** regular editorial content (a blog, guides, lookbooks, recipes) the owner keeps adding to, run as **two** backends (WordPress site + separate Hostinger Ecommerce store). | Both: WordPress for content, the Ecommerce store for products and checkout. |
| **WordPress + WooCommerce** | **Only** when the user explicitly names WooCommerce, or explicitly wants content **and** a store on **one** WordPress site (one admin, one domain). The one-site alternative to WordPress + Ecommerce. | A single headless WordPress at `/cms` with the WooCommerce plugin — products, cart, coupons and checkout (Cash on Delivery) over the WooCommerce Store API, plus WP posts/pages on the same site. |
| **Webapp** | A custom **app, SPA or web application** that brings its own code and data — a dashboard, tool, calculator, booking app, a project the user is deploying — **not** a content site or a store. No CMS and no store engine. | A plain Node.js app host (an empty website, no `/cms`), with a MySQL database when the app needs one. The app owns all its routes and data. |

Rules of thumb:

- **Is it an app, or a site?** A custom application the user builds/brings (its own logic, its own data,
  maybe a database) → **Webapp**. A content site or a shop → one of the three above. When the user says
  "my app / SPA / dashboard / tool", or hands you an existing app project to deploy, that's **Webapp**.
- **Selling decides first (for sites).** No selling → WordPress. Selling → Ecommerce or
  WordPress + Ecommerce.
- **Then the content.** Selling plus only a few fixed pages → Ecommerce. Selling plus content the
  owner will keep publishing → WordPress + Ecommerce.
- **Hostinger Ecommerce is the default for selling — WooCommerce is never the default and is never
  recommended on its own.** Choose **WordPress + WooCommerce** only when the user explicitly names
  WooCommerce, or explicitly wants content **and** a store on one WordPress site (one admin, one
  domain — the one-site alternative to WordPress + Ecommerce). For every other selling case, keep
  Hostinger Ecommerce. If the user wants both content and a store but hasn't said "one site" or
  "WooCommerce", offer it as an option — don't switch to it silently.
- **Don't add WordPress "just in case".** A second backend is a second admin to learn. Recommend the
  combination only when the user described ongoing content.
- Selling a single service by enquiry (no checkout, no cart) is **not** commerce → WordPress with a
  contact page.
- **Webapp never uses WordPress or a store.** If the user wants a custom app *and* a CMS/shop, that's two
  different sites — build the app as a Webapp and tell them the content/commerce backend is a separate
  domain.

**Then set rendering** (write it in the brief's **Rendering** section): **Ecommerce → SSR required**
(carts/search need per-request rendering — any SSR framework works; Next.js is the default, not a
requirement); **WordPress + WooCommerce → SSR required** (same reason — cart/checkout need per-request
rendering); **WordPress → SSG (Astro)** if the site is mostly static and the owner is fine rebuilding
to publish, otherwise **SSR**; **Webapp → whatever the app is** (SSR for a server app, SPA for a
client-only app) — it deploys as a Node.js app either way. When unsure, default to **Next.js SSR**.

## Step 5 — Confirm the plan in one message

Send **one** message that confirms **what you'll build** — the plan, not the plumbing. Lead with the
site, not the backend:

- **The plan** — what it is, audience, pages, products (if any), tone. Mark anything you defaulted
  (*"assumed: warm, minimal look"*) so the user sees what they skipped.
- **How it's built** — state the backend as a *consequence* in one plain line, focused on what it
  means for them day to day ("I'll build this on WordPress, so you edit pages and posts in a normal
  WordPress admin"), **not** as a choice you're asking them to make. Don't ask "is WordPress OK?" or
  offer alternatives unless it was a genuine close call *and* the difference matters to the user.

End with *"Good to go, or anything to change?"* A yes (or "go") → write `brief.md`. A skipped tool
result is not a yes (see *When you ask the user* in the top-level `SKILL.md`). Changes → apply them
and write it; don't loop back into questions. If the user *volunteers* a different backend, use
theirs and note it in the brief.

## Step 6 — Write `brief.md` and hand off

Write `brief.md` from the template below. Fill every section from the conversation, defaulting what
the user skipped and tagging it `(assumed)`; leave out **Products** when nothing is sold. Use the
user's own words where you can. Then update `state.json`:
`"stage": "provision"`, fresh `updated_at`.

The **Suggested backend** section is the contract with `03-provision/SKILL.md`, which routes on it.
Its first line must be exactly one of `**WordPress**`, `**Ecommerce**`, `**WordPress + Ecommerce**`,
`**WordPress + WooCommerce**` or `**Webapp**`, followed by an em dash and the one-line reason.
`**WordPress + WooCommerce**` is the WordPress backend with the WooCommerce store turned on — provision
routes it to the `wordpress` subfolder with the store enabled (it is **not** a separate backend).

## `brief.md` template

```markdown
# Brief — <domain>

> Brief agreed with the user on <today>.

## Purpose
<what the site is, who runs it, what it's for — 2–3 sentences>

## Audience
<who visits, how they arrive, what device they mostly use>

## Tone
<voice in a sentence or two>

## Design direction
<look & feel in a few adjectives; **reference site(s)** the user named (URLs) and what to take from them
(layout, structure, mood); colours / brand palette; any screenshots. This is where ALL design questions
land — the frontend step reads this and does not re-ask. Write "Agent's choice: <short style>" when the
user didn't specify. Record in the user's own words a request to keep their current look ("Keep the look
we have: <site URL | screenshots | brand guide>") and any logo idea they describe; the design step acts
on both.>

## Pages
- **<Page>** — <one-line purpose>
- …

## Products
<only when selling: what is sold, rough count, categories, variants, shipping regions, payments>

## Content
<what the owner will publish over time and how often — or "A few fixed pages; no ongoing content.">

## Must-haves
- …

## Out of scope
- …

## Assets
<logo, colours, photos, copy the user provided and where they are; "None yet" if none>

## Suggested backend
**<WordPress | Ecommerce | WordPress + Ecommerce | WordPress + WooCommerce | Webapp>** — <one-line reason>.
<"Confirmed by the user." or "User chose this over the recommended <X> because <reason>.">

## Build mode
**<Bring your own frontend | Agent designs and builds>** — <one line>. <When "Bring your own frontend":
the path to the user's existing project in the current folder (the frontend source), and how they want
to drive design/code. When "Agent designs and builds": leave the design + frontend steps to run as
normal.> The design step and the frontend step both read this: **Bring your own frontend** → design
defers to the user and frontend builds on their project; **Agent designs and builds** → both run as normal.

## Rendering
**<SSR | SSG>** — <reason>. Rules: **Ecommerce requires SSR** and **WordPress + WooCommerce requires
SSR** (carts/checkout need per-request rendering — any SSR framework works; Next.js is the default, not
a requirement); **WordPress may be SSG (Astro)** when the site is mostly static and rarely changes,
otherwise **SSR**. Default when unsure: **Next.js SSR**.
```

## Example — WordPress + Ecommerce

> A ceramicist sells around 30 handmade pieces and writes a monthly studio journal.

```markdown
## Suggested backend
**WordPress + Ecommerce** — sells ~30 products with checkout, and the owner publishes a monthly
studio journal they want to edit themselves.
Confirmed by the user.
```
