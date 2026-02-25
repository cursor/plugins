# Excalidraw plugin

Build and iterate Excalidraw diagrams directly from product and engineering context.

## Installation

```bash
/add-plugin excalidraw
```

## Components

### Skills

| Skill | Description |
|:------|:------------|
| `create-excalidraw-diagram` | Create a new `.excalidraw` diagram from architecture, UX, or workflow requirements |
| `iterate-excalidraw-diagram` | Apply targeted updates to an existing `.excalidraw` file while preserving structure |

### Rules

| Rule | Description |
|:-----|:------------|
| `excalidraw-file-integrity` | Keeps `.excalidraw` edits valid, incremental, and readable |

## Typical flow

1. Ask Cursor to draft or update a diagram from your requirements.
2. Review the generated `.excalidraw` file in Excalidraw.
3. Request focused iterations (layout, labels, grouping, styling) until ready.

## License

MIT
