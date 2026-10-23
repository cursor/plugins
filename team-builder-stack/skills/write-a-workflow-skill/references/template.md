# The workflow's template

Every workflow skill has a template for what it produces, with the templates its steps follow. Each template lives in exactly one place, and the person chooses which:

- **In the skill,** under its Template heading. Use this skeleton when the person has no template yet, and build it from two or three real examples of their output, not from the skeleton alone.
- **In Grok Bot itself,** as a document or a canvas, for example: Morning brief template, Grok Bot canvas, named by its id.
- **In the person's own system of record,** for example: Account plan template, Notion page, read with the Notion connector. The skill keeps only that line and the link, never a copy.

The load step reads the template fresh before every run, so every run starts from the same shape, and edits made in Notion or Docs are picked up.

```markdown
# <What the workflow produces>, for <the unit>

<One line on who reads it and when.>

## <A section of the output>

<What goes here. Every fact carries a link to its source.>

## <The next section>

<What goes here.>

## <A step's own template, when a step follows one>

<Its shape, from the template the person named for that step.>

## For your review

<What the person reviews before the bot carries on, and what they need to decide.>

## Sources

<Each source used, with its link and when it was read.>
```
