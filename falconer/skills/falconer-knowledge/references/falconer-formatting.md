# Falconer formatting

Falconer documents use Markdown plus Falconer-specific references and rich blocks.

## References

Preserve existing Falconer references exactly:

```markdown
![f>][reference-id]
![f>][display text][reference-id]
```

Do not invent new reference IDs. If a reference is needed and no ID exists, write normal text and ask the user or use available Falconer tools to find the referenced content.

## Headings

Falconer supports four heading levels:

```markdown
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
```

## Text styles

Use standard Markdown for bold, italic, strikethrough, links, and inline code:

```markdown
**bold**
*italic*
~~struck through~~
`inline code`
[link](https://falconer.com)
```

Highlights use `mark` tags with Falconer color tokens:

```html
<mark data-color="blue" style="background-color: hsl(var(--editor-color-blue)); color: inherit; padding-top: 2px; padding-bottom: 3px;">highlighted text</mark>
```

Supported highlight colors are red, orange, yellow, green, blue, and purple.

## Lists and tasks

Use GitHub-flavored Markdown for lists and task lists:

```markdown
- Parent item
  - Child item

1. First item
2. Second item

- [x] Finished task
- [ ] Open task
```

## Callouts

Falconer supports these callouts:

```markdown
> [!NOTE]
>
> Helpful context or a tip.

> [!CAUTION]
>
> Something to be careful about.

> [!DANGER]
>
> Something that can cause real harm.
```

## Code

Use fenced code blocks with a language:

```python
def greet(name: str) -> str:
    return f"Hello, {name}!"
```

## Tables

Use GitHub-flavored Markdown tables:

```markdown
| Element | How to insert it | Sortable |
| --- | --- | --- |
| Heading | `## ` | No |
| Table | `/table` | Yes |
```

## Math

Falconer renders LaTeX with KaTeX:

```markdown
Inline math: $E = mc^2$

Centered block:

$$
\int_0^\infty e^{-x}\,dx = 1
$$
```

Some existing documents may use `$$inline math$$` or block math fenced with `$$...$$` or `$$$...$$$`. Preserve existing math delimiters unless changing them is necessary.

## Diagrams

Use Mermaid code blocks for diagrams:

```mermaid
flowchart LR
    Write[Write] --> Connect[Connect tools]
    Connect --> Automate[Docs stay current]
```

## Columns

Use columns for side-by-side content:

```markdown
<Columns cols={2}>
  <Column>
**Write**

Draft docs in a Markdown-native editor.
  </Column>
  <Column>
**Connect**

Pull in code, conversations, and meeting notes.
  </Column>
</Columns>
```

## Cards

Cards are icon-topped tiles:

```markdown
<Card icon="rocket" cta="Start writing">

Open a new doc and try the slash menu.

</Card>
```

## Accordions

Use accordions for optional detail:

```markdown
<AccordionGroup>

<Accordion title="When should I use an accordion?">

For optional detail that would clutter the main flow if shown by default.

</Accordion>

</AccordionGroup>
```

## Tabs

Use tabs for alternatives:

```markdown
<Tabs>

<Tab title="For writers">

Use callouts, tables, and headings to make docs scannable.

</Tab>

<Tab title="For engineers">

Use code blocks, math, and Mermaid diagrams.

</Tab>

</Tabs>
```

## Media

For local images or videos, call `upload_media` first and insert the returned snippet. Do not guess asset URLs or write local filesystem paths into Falconer documents.

## Divider

Use a horizontal rule for dividers:

```markdown
---
```
