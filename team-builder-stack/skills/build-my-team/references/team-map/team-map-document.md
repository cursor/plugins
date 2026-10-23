# Team map

{{#proposal}}
> **{{title}}.** {{summary}} Nothing changes until you say yes.
{{/proposal}}

Built from the team spec{{specLine}}. This is the team map as a Markdown document, for accounts without canvases. It's rebuilt from the spec after each change, and never edited by hand.

## Your team

- **Role:** {{role.role}}
- **Business outcomes and KPIs:** {{role.outcomes}}
- **Unit of work:** {{role.unit}}, {{role.howMany}}
- **Home time zone:** {{role.timeZone}}

### Runs the team

Who verifies, when a bot can't start a fresh checker: {{verifier}}{{#verifierWas}} (changed; was {{verifierWas}}){{/verifierWas}}.

{{#runs}}
- **{{name}}**{{mark}}. {{typeLabel}}. Skills: {{skillsLine}}.
{{#was}}
  - Was: {{.}}
{{/was}}
{{/runs}}

### One blueprint for each kind of unit

The first bot of each kind that works, the model bot, exports itself as the bot template, and each next unit's bot is built from it.

{{#units}}
- **{{name}}**{{mark}}. {{typeLabel}}{{#blueprint}}, bot blueprint{{/blueprint}}. Skills: {{skillsLine}}.
{{#was}}
  - Was: {{.}}
{{/was}}
{{/units}}

### How they hand off

{{#handoffs}}
- {{line}}{{mark}}
{{#was}}
  - Was: {{.}}
{{/was}}
{{/handoffs}}
{{^handoffs}}
None yet.
{{/handoffs}}

### Systems of record

{{#systems}}
- **{{name}}**{{mark}}. Connector: {{connector}}. Unique ID for one unit: {{uniqueId}}. System of record for: {{recordFor}}.{{#howToRead}} How to read: {{howToRead}}.{{/howToRead}}
{{#was}}
  - Was: {{.}}
{{/was}}
{{/systems}}

### Routines

{{#routines}}
- {{line}}{{mark}}
{{#was}}
  - Was: {{.}}
{{/was}}
{{/routines}}
{{^routines}}
None yet.
{{/routines}}

## Bots

{{#bots}}
### {{name}}{{mark}}

{{typeLabel}}{{#blueprint}}, bot blueprint{{/blueprint}}.

{{#showTemplate}}
- **Model bot:** {{modelBot}}
- **Bot template:** {{botTemplate}}
{{/showTemplate}}
- **Skills:** {{skillsLine}}
- **Connectors:** {{systemsLine}}
- **Look:** {{lookLine}}
{{#was}}
- Was: {{.}}
{{/was}}

{{/bots}}
## Skills

{{#librarySkills}}
### {{name}}{{mark}}

{{description}}

- **Template, where it lives:** {{templateLocation}}
{{#templateOwner}}
- **Template owner:** {{templateOwner}}
{{/templateOwner}}
- **Waits for your review at:** {{reviewsLine}}
{{#was}}
- Was: {{.}}
{{/was}}

1. **Load.** {{load}}
2. **Do the work.** Your own named steps:
{{#steps}}
   {{n}}. **{{name}}**{{mark}}.
   Does: {{does}}
   Pulls from: {{pullsFrom}}
   Uses: {{usesLine}}
   Produces: {{produces}}
   Hands to: {{handsTo}}
   Needs your review: {{review}}
{{#was}}
      - Was: {{.}}
{{/was}}
   {{/steps}}
3. **Verify.** {{verify}}
4. **Record.** {{record}}
5. **Hand off.** {{handOff}}

{{/librarySkills}}
{{#sharedSkillsLine}}
Shared skills in your library, which the spec only names: {{sharedSkillsLine}}.

{{/sharedSkillsLine}}
{{#pluginSkillsLine}}
Team Builder Stack skills, which come with the installed plugin, so the spec only names them: {{pluginSkillsLine}}.
{{/pluginSkillsLine}}
{{#missingSkillsLine}}

Named in the spec but not in the skill library yet: {{missingSkillsLine}}.
{{/missingSkillsLine}}
