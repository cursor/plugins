# Firebase Cursor Plugin

Cursor plugin for **Firebase** — Firestore, Authentication, Cloud Functions, Hosting, and Storage.

## Features

- **Rules** — Best-practice rules for Firestore data modeling, security rules, and query patterns
- **Agent** — Firebase architect agent for schema design, Cloud Functions, and cost optimization guidance
- **Skills** — Step-by-step workflows for project setup, Firestore schema design, and deployment
- **Hooks** — Auto-validation of security rules and Cloud Functions on save, commit, and deploy
- **MCP** — Firebase MCP server integration for Firestore, Auth, and Cloud Functions management

## Plugin Structure

```
plugins/firebase/
├── .cursor/
│   └── plugin.json                 # Plugin manifest
├── agents/
│   └── firebase-architect-agent.md # Architecture & design agent
├── rules/
│   ├── firestore.mdc               # Firestore data modeling & query rules
│   └── firebase-security-rules.mdc # Security rules best practices
├── skills/
│   ├── setup-firebase/
│   │   └── SKILL.md                # Firebase CLI setup & project initialization
│   └── design-firestore-schema/
│       └── SKILL.md                # Firestore schema design patterns
├── hooks/
│   └── hooks.json                  # Save, commit, and deploy hooks
├── scripts/
│   └── deploy-firebase.sh          # Deployment helper script
├── extensions/                     # Extension directory (reserved)
├── mcp.json                        # MCP server configuration
├── README.md
├── CHANGELOG.md
└── LICENSE
```

## Getting Started

### Prerequisites

- [Cursor](https://cursor.com/) editor
- [Node.js](https://nodejs.org/) 18+
- [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`)
- A Firebase project (create one at [Firebase Console](https://console.firebase.google.com))

### Installation

This plugin is part of the [service-plugin-generation](https://github.com/cursor/service-plugin-generation) repository. Clone the repo and the plugin will be available in Cursor automatically.

### Usage

1. **Follow the setup skill** — Use `skills/setup-firebase/SKILL.md` to initialize a new Firebase project with CLI, emulators, and deployment configuration.

2. **Design your schema** — Use `skills/design-firestore-schema/SKILL.md` for data modeling patterns, security rules, and composite indexes.

3. **Ask the architect agent** — Invoke the Firebase Architect Agent for guidance on schema design, Cloud Functions architecture, cost optimization, and scaling.

4. **Deploy** — Use the deploy script for targeted or full deployments:

```bash
./scripts/deploy-firebase.sh                   # Deploy everything
./scripts/deploy-firebase.sh functions          # Deploy Cloud Functions only
./scripts/deploy-firebase.sh firestore hosting  # Deploy Firestore rules + Hosting
```

## Services Covered

| Service | Coverage |
|---------|----------|
| **Firestore** | Data modeling, queries, indexes, offline persistence, converters |
| **Authentication** | Providers, custom claims, RBAC, session management |
| **Cloud Functions** | Triggers, HTTP callables, scheduling, idempotency, cold starts |
| **Hosting** | Static deployment, CDN caching, multi-site |
| **Cloud Storage** | Upload rules, file validation, security |

## Links

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Data Modeling](https://firebase.google.com/docs/firestore/data-model)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Cloud Functions](https://firebase.google.com/docs/functions)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)

## License

MIT — see [LICENSE](./LICENSE).
