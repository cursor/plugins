# Cursor Plugins

Official Cursor plugins for popular developer tools, frameworks, and SaaS products. Each plugin is a standalone directory at the repository root with its own `.cursor/plugin.json` manifest.

## Plugins

| Plugin | Category | Description |
|:-------|:---------|:------------|
| [GitHub](github/) | Developer Tools | Actions, API, CLI, Pull Requests, and repository management |
| [Docker](docker/) | Developer Tools | Dockerfiles, Compose, multi-stage builds, and containers |
| [LaunchDarkly](launchdarkly/) | Developer Tools | Feature flags, experimentation, and progressive rollouts |
| [Sentry](sentry/) | Observability | Error monitoring, performance tracking, and alerting |
| [Firebase](firebase/) | Backend | Firestore, Cloud Functions, Authentication, and Hosting |
| [MongoDB](mongodb/) | Backend | Schema design, queries, aggregation, indexes, and Mongoose |
| [Twilio](twilio/) | SaaS | SMS, Voice, WhatsApp, Verify, and communications APIs |
| [Slack](slack/) | SaaS | Bolt framework, Block Kit, Events API, and app development |
| [Next.js React TypeScript](nextjs-react-typescript/) | Frontend | Next.js App Router, React, Shadcn UI, and Tailwind rules |
| [Frontend Developer](frontend-developer/) | Frontend | React, Next.js, TypeScript, and Tailwind CSS development rules |
| [SvelteKit](sveltekit-development/) | Frontend | Svelte 5 and SvelteKit modern web development guide |
| [Flutter Dart](flutter-dart/) | Mobile | Flutter and Dart clean architecture development rules |
| [SwiftUI iOS](swiftui-ios/) | Mobile | SwiftUI and Swift iOS/macOS development rules |
| [FastAPI Python](fastapi-python/) | Backend | FastAPI and scalable Python API development rules |
| [Django Python](django-python/) | Backend | Django and scalable Python web application rules |
| [Rails Ruby](rails-ruby/) | Backend | Ruby on Rails, PostgreSQL, Hotwire, and Tailwind rules |
| [Elixir Phoenix](elixir-phoenix/) | Backend | Elixir, Phoenix, LiveView, and Tailwind development rules |
| [Laravel TALL Stack](laravel-tallstack/) | Backend | Laravel TALL Stack (Tailwind, Alpine.js, Livewire) with DaisyUI |
| [Go API Development](go-api-development/) | Backend | Go API development with standard library (1.22+) rules |
| [Rust Async](rust-async/) | Systems | Rust async programming and concurrent systems rules |
| [Playwright Testing](playwright-testing/) | Testing | Playwright end-to-end testing and QA automation rules |
| [Unity GameDev](unity-gamedev/) | GameDev | C# Unity game development and design patterns rules |
| [Deep Learning Python](deep-learning-python/) | ML | Deep learning, transformers, and diffusion model rules |
| [Terraform IaC](terraform-iac/) | DevOps | Terraform and cloud Infrastructure as Code best practices |
| [Solidity Web3](solidity-web3/) | Blockchain | Solidity smart contract security and development rules |

## Plugin Structure

Each plugin follows the [Cursor plugin specification](https://www.notion.so/cursorai/Building-Plugins-for-Cursor-2f7da74ef04580228fbbf20ecf477a55):

```
plugin-name/
├── .cursor/
│   └── plugin.json        # Plugin manifest (required)
├── skills/                # Agent skills (SKILL.md with frontmatter)
├── rules/                 # Cursor rules (.mdc files)
├── mcp.json               # MCP server definitions
├── README.md
├── CHANGELOG.md
└── LICENSE
```

## License

MIT
