# README Generator

Scan any repository and generate a complete, accurate `README.md` — grounded in what the project actually contains, never in guesses.

## Installation

```bash
/add-plugin readme-generator
```

## Components

### Skills

| Skill | Description |
|:------|:------------|
| `generate-readme` | Survey a repo (manifest, layout, docs, license, CI) and generate a complete README grounded in real facts |

## Usage

Ask Cursor to generate or update your README:

```
Generate a README for this repository
```

```
Our README is outdated — update it to match the current scripts and layout
```

The skill will:

1. Detect language, framework, and package manager from manifest files.
2. Read real scripts, entry points, and config (including `.env.example`) instead of inventing them.
3. Draft description, features, requirements, install, usage, configuration, development, and license sections — skipping what does not apply.
4. Preserve accurate content in an existing README and flag stale parts instead of blindly overwriting.

## License

MIT
