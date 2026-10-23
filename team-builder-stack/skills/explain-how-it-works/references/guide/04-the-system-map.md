# 4. The system map

The tailoring lives in one place, the system map, not inside each skill. It lists three things.

1. **The systems of record.** Where the work lives, such as Salesforce, Notion, Linear, or a data warehouse.
2. **How each one stores data.** The objects, fields, and pages that matter.
3. **How each one ties to the unit of work.** For example, an account is a Salesforce Account ID and a row in Notion.

When a tool changes, you update the map, and every skill that depends on it keeps working.

## In the Team Builder Stack

The system map is the Systems of record section of your team spec, the one file that says how your team is put together. It sits in `/workspace/team-builder-stack/team-spec.md`, on the computer your bots share. [Build my team](../../../build-my-team/SKILL.md) writes it by interviewing you, and every Team Builder skill reads it. When a section is missing, a skill uses a safe default and says so. The spec has five sections.

- **Your role.** The person’s role, the business outcomes they drive and their KPIs, their unit of work and how many they carry, and their home time zone.
- **Your team.** One bot blueprint for each kind of unit, plus Team Builder, and the handoffs between bots. Each blueprint links to its bot template and never copies it.
- **Your workflows.** Which skill runs each workflow and for which bot blueprint, where each workflow’s deliverable template lives, the voice skill in use, and the backlog of work worth a skill.
- **Systems of record.** For each system: its connector, what it holds, the unique ID that finds one unit, and what it’s the system of record for. How far back to read is set in each workflow skill’s load step, not here.
- **Records and logs.** Where each unit’s record, drafts, and log go, what each log records, where reports across units go, and the team map’s canvas id or document link.

The spec holds only what Grok Bot doesn’t already keep, and points to the rest. You see it as the team map: a canvas by default, or a Markdown document when canvases aren’t available. The map is rebuilt from the spec after each change, and never edited by hand.

Next: [Growing the team](05-growing-the-team.md).
