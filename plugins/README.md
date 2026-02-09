# Cursor Plugins

This directory contains plugins for Cursor. Each plugin provides skills and an MCP server integration.

## Plugin Structure

```
plugin-name/
├── .cursor/
│   └── plugin.json        # Plugin manifest (required)
├── skills/                # Agent skills (directories with SKILL.md)
├── mcp.json               # MCP server definitions
├── README.md
├── CHANGELOG.md
└── LICENSE
```

## Available Plugins

| Plugin | Category | Author | Description |
|:-------|:---------|:-------|:------------|
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
| `github` | Developer Tools | Actions, API, CLI, Pull Requests, and repository management |
| `sentry` | Observability | Error monitoring, performance tracking, and alerting |
| `docker` | Developer Tools | Dockerfiles, Compose, multi-stage builds, and containers |
| `firebase` | Backend | Firestore, Cloud Functions, Authentication, and Hosting |
| `twilio` | SaaS | SMS, Voice, WhatsApp, Verify, and communications APIs |
| `slack` | SaaS | Bolt framework, Block Kit, Events API, and app development |
| `launchdarkly` | Developer Tools | Feature flags, experimentation, and progressive rollouts |
| `mongodb` | Backend | Schema design, queries, aggregation, indexes, and Mongoose |

## Installation

```bash
agent install <plugin-name>
```
