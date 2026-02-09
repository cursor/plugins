# Cursor Plugins

This directory contains official plugins for Cursor.

## Plugin Structure

Each plugin follows a standard structure:

```
plugin-name/
├── .cursor/
│   └── plugin.json        # Plugin manifest (required)
├── README.md              # Plugin documentation
├── rules/                 # Cursor rules (.mdc files)
├── agents/                # Subagents (markdown files)
├── skills/                # Agent skills (directories with SKILL.md)
├── hooks/
│   └── hooks.json         # Hook configuration
├── mcp.json               # MCP server definitions (optional)
├── extensions/            # VS Code extensions (.vsix files)
├── scripts/               # Utility scripts for hooks
├── LICENSE
└── CHANGELOG.md
```

## Plugin Components

| Component       | Location              | Purpose                                  |
|:----------------|:----------------------|:-----------------------------------------|
| **Manifest**    | `.cursor/plugin.json` | Required metadata file                   |
| **Rules**       | `rules/`              | Cursor rules (.mdc files)                |
| **Agents**      | `agents/`             | Subagent Markdown files                  |
| **Skills**      | `skills/`             | Agent Skills with SKILL.md files         |
| **Hooks**       | `hooks/hooks.json`    | Hook configuration                       |
| **MCP servers** | `mcp.json`            | MCP server definitions                   |
| **Extensions**  | `extensions/`         | VS Code extension bundles (.vsix files)  |

## Creating a Plugin

1. Create a new directory under `plugins/`
2. Add a `.cursor/plugin.json` manifest file
3. Add your components (rules, agents, skills, hooks, etc.)
4. Add a `README.md` documenting your plugin

See the `boilerplate` directory for a complete example.

## Plugin Manifest

The `.cursor/plugin.json` manifest is required and defines your plugin's metadata:

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "A brief description of what your plugin does",
  "author": {
    "name": "Your Name",
    "email": "you@example.com"
  },
  "license": "MIT",
  "keywords": ["example"],
  "agents": "./agents/",
  "skills": "./skills/",
  "rules": "./rules/",
  "hooks": "./hooks/hooks.json",
  "mcpServers": "./mcp.json",
  "extensions": "./extensions/"
}
```

## Available Plugins

| Plugin | Category | Author | Description |
|:-------|:---------|:-------|:------------|
| `boilerplate` | utilities | — | Complete example plugin demonstrating all components |
| `frontend-developer` | frontend | Mohammadali Karimi | React, Next.js, TypeScript, and Tailwind CSS development rules |
| `nextjs-react-typescript` | frontend | Pontus Abrahamsson | Next.js App Router, React, Shadcn UI, and Tailwind rules |
| `sveltekit-development` | frontend | MMBytes | Svelte 5 and SvelteKit modern web development guide |
| `fastapi-python` | backend | Caio Barbieri | FastAPI and scalable Python API development rules |
| `django-python` | backend | Caio Barbieri | Django and scalable Python web application development rules |
| `rails-ruby` | backend | Theo Vararu | Ruby on Rails, PostgreSQL, Hotwire, and Tailwind rules |
| `elixir-phoenix` | backend | Ilyich Vismara | Elixir, Phoenix, LiveView, and Tailwind development rules |
| `laravel-tallstack` | backend | Ismael Fi | Laravel TALL Stack (Tailwind, Alpine.js, Livewire) with DaisyUI |
| `go-api-development` | backend | Marvin Kaunda | Go API development with standard library (1.22+) rules |
| `rust-async` | systems | Sheng-Yan, Zhang | Rust async programming and concurrent systems rules |
| `swiftui-ios` | mobile | Josh Pigford | SwiftUI and Swift iOS/macOS development rules |
| `flutter-dart` | mobile | Sercan Yusuf | Flutter and Dart clean architecture development rules |
| `playwright-testing` | testing | Douglas Urrea Ocampo | Playwright end-to-end testing and QA automation rules |
| `unity-gamedev` | gamedev | Pontus Abrahamsson | C# Unity game development and design patterns rules |
| `deep-learning-python` | ml | Yu Changqian | Deep learning, transformers, and diffusion model rules |
| `terraform-iac` | devops | Abdeldjalil Sichaib | Terraform and cloud Infrastructure as Code best practices |
| `solidity-web3` | blockchain | Alfredo Bonilla | Solidity smart contract security and development rules |

## Installation

Plugins can be installed via CLI:

```bash
agent install <plugin-name>
```

Or from a marketplace:

```bash
agent install <plugin-name>@<marketplace>
```

## Contributing

When adding a new plugin:

1. Follow the standard directory structure
2. Include a comprehensive README.md
3. Use semantic versioning (MAJOR.MINOR.PATCH)
4. Include a LICENSE file
5. Test your plugin thoroughly before submitting
