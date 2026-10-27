---
name: post-task
description: >
  Post a task on Airtasker by guiding the user through a structured conversation
  to capture job details, location, timing, and budget, then submitting via the
  Airtasker MCP server. Use when asked to post a task, create a task, or hire
  someone on Airtasker. Prerequisites: Airtasker account, payment method configured,
  and MCP server authenticated at mcp.airtasker.com/mcp.
model: sonnet
context: inherit
user-invocable: true
allowed-tools:
  - mcp__airtasker_mcp_server__post_task
argument-hint: "[optional: brief task description]"
---

## GOAL

Guide the user through a structured 4-step conversation to capture everything
needed for a well-described Airtasker task, then post it via `post_task`.

The more detail in the description, the better quality offers the user will
receive. Help them be thorough.

---

## STEPS

**Ask one question at a time throughout the entire flow. Wait for the user's
answer before asking the next question. Never batch or combine questions.**

### 1. What and when

If `$ARGUMENTS` was provided, present it back as a starting point and ask them
to confirm or expand on it. Otherwise, ask what they need done. Once you have
the description, ask when they need it (flexible / by a certain date / on a
specific date) as a separate follow-up.

Record the raw description — it will be shaped into a proper title and
description later. Record the timing preference for `date_type` and
`timeless_date` mapping:

| User says            | `date_type`   | `timeless_date` needed? |
| -------------------- | ------------- | ----------------------- |
| "Anytime / flexible" | `flexible`    | No                      |
| "By [date]"          | `before_date` | Yes                     |
| "On [date]"          | `on_date`     | Yes                     |

---

### 2. Location

Ask where they need the job done. If their location is already known from
context, present it and ask them to confirm or correct it.

- The location must be a **suburb or neighbourhood**, not an exact address
  (exact addresses are a security concern on Airtasker's platform).
- If they provide an exact address, ask them to confirm the suburb name instead.
- If the task is entirely remote/online, record `location_type = remote` and
  skip lat/lng entirely.

Once you have the suburb name, use your geographic knowledge to determine the
centroid latitude and longitude for that suburb. Do **not** ask the user for
coordinates — derive them yourself. Set `display_name` to the suburb name.

---

### 3. Task-specific details

Detect whether this is a **Moving**, **Cleaning**, or **Gardening** task based
on the description:

- **Moving** — keywords: moving, removalist, move furniture, relocate, boxes, transport items
- **Cleaning** — keywords: cleaning, clean house, clean apartment, end of lease, bond clean, vacate clean
- **Gardening** — keywords: garden, lawn, mowing, weeding, hedge, whipper snipper, garden clean up

Follow the matching sub-flow below.

**If none of the above match**, think about what a professional doing this job
would need to know before agreeing to a price. Ask 2–4 targeted questions —
things like property size, materials needed, accessibility, specific requirements,
or anything that would affect scope or effort. Use the answers to enrich the
task description.

---

#### Moving sub-flow

Ask **one question at a time**. Wait for the user's answer before asking the
next question. Do not combine or batch questions.

1. **Pick-up location** — which suburb/neighbourhood are they moving from?
2. **Drop-off location** — which suburb/neighbourhood are they moving to?
3. **Size of move** — which best describes it?
   - A few items
   - Apartment
   - House
4. **Stairs** — are there stairs? If yes, are they at the pick-up location,
   drop-off location, or both?
5. **Item description** — ask for a detailed list of what needs moving (types
   of items and approximate quantities).

Use the pick-up suburb centroid as the `location_type` (in_person) for the task.

Construct the description using this template:

```
{user's item description}

Pickup Location: {pickup suburb}
Drop-off Location: {drop-off suburb}
Removals size: {A few items / Apartment / House}
Stairs: {None / At pickup / At drop-off / At both locations}
```

---

#### Cleaning sub-flow

Ask **one question at a time**. Wait for the user's answer before asking the
next question. Do not combine or batch questions.

1. **Type of clean** — regular or end of lease?
2. **Bedrooms** — how many bedrooms?
3. **Bathrooms** — how many bathrooms?
4. **Equipment and supplies** — does the cleaner need to bring equipment/supplies,
   or will the user provide them?
5. **Additional details** — any specific areas or requirements to include?

Construct the description using this template:

```
{user's additional details}

Type of clean: {Regular / End of lease}
Number of bedrooms: {count}
Number of bathrooms: {count}
Equipment and supplies: {Cleaner to bring / User will provide}
```

---

#### Gardening sub-flow

Ask **one question at a time**. Wait for the user's answer before asking the
next question. Do not combine or batch questions.

1. **Services needed** (multiple can be selected):
   - Lawn mowing
   - Weeding
   - Hedge trim
   - Whipper snipping
   - Garden clean up
   - Other
2. **Garden size** — which best describes the area?

   If the task location is in the **US**, use these options:
   - Small (under 500 sq ft)
   - Medium (500–1500 sq ft)
   - Large (1500–3000 sq ft)
   - Extra large (above 3000 sq ft)

   Otherwise:
   - Small (under 50m²)
   - Medium (50m²–100m²)
   - Large (150m²–300m²)
   - Extra large (above 300m²)
3. **Green waste bin** — do they have one available?
4. **Additional details** — any specific areas or tasks to describe?

Construct the description using this template:

```
{user's additional details}

Type of gardening: {comma-separated list of selected services}
Size of garden: {Small / Medium / Large / Extra large}
Has green waste bin: {Yes / No}
```

---

### 4. Budget

Ask how much they want to offer as a budget. Clarify it must be a **whole
dollar amount** (no cents). Record it as an integer.

---

### 5. Confirm and post

Before calling any tools, present a summary of everything collected:

- Title (your proposed concise title)
- Description (full, as it will be posted)
- Location
- Date/timing
- Budget

Ask the user to confirm or make any corrections.

Once confirmed, call `post_task` with:

   | Field             | Value                                                                                        |
   | ----------------- | -------------------------------------------------------------------------------------------- |
   | `title`           | Concise action phrase (e.g. "Help moving a 2-bedroom apartment from Surry Hills to Newtown") |
   | `description`     | Full description with all collected details                                                  |
   | `price`           | Whole dollar integer                                                                         |
   | `location_type`   | `{ type: "in_person", latitude, longitude, display_name }` or `{ type: "remote" }`           |
   | `date_type`       | `"flexible"` / `"on_date"` / `"before_date"`                                                 |
   | `timeless_date`   | Required when `date_type` ≠ `"flexible"`                                                     |
   | `specified_times` | Include if the user mentioned a time of day preference                                       |

After posting, share the returned task URL with the user and let them know offers typically
arrive within minutes to hours — not immediately.

---

## CONSTRAINTS

- Never include the user's contact details (email, phone, exact address) in
  the title or description.
- Location must always be a suburb/neighbourhood centroid — never exact
  coordinates for a residential address.
- `price` must be a positive integer (whole dollars only).
- `timeless_date` is required whenever `date_type` is `"on_date"` or
  `"before_date"`. Do not call `post_task` without it in those cases.
- Do not skip the `get_task_info` eligibility check before posting.
