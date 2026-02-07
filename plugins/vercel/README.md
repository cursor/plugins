# Vercel Plugin for Cursor

A comprehensive Cursor plugin for deploying and managing applications on **Vercel**. Provides rules, agents, skills, and tooling for serverless functions, Edge Runtime, project configuration, and deployment workflows.

## Features

- **Rules** — Contextual best-practice guidance for Vercel serverless/edge functions and project configuration
- **Agent** — Deployment optimization agent for diagnosing build failures, improving performance, and configuring deployments
- **Skills** — Step-by-step guides for deploying to Vercel and setting up Edge Functions
- **Hooks** — Automated build validation and type checking on file changes and pre-push
- **MCP Server** — Integration with the Vercel API for managing projects, deployments, and environment variables
- **Deploy Script** — Production-ready deployment script with preflight checks, health checks, and CI/CD support

## Directory Structure

```
plugins/vercel/
├── .cursor/
│   └── plugin.json          # Plugin manifest
├── agents/
│   └── vercel-deployment-agent.md   # Deployment optimization agent
├── rules/
│   ├── vercel-functions.mdc         # Serverless & edge function rules
│   └── vercel-config.mdc           # Configuration best practices
├── skills/
│   ├── deploy-to-vercel/
│   │   └── SKILL.md                # Deployment guide
│   └── setup-edge-functions/
│       └── SKILL.md                # Edge functions guide
├── hooks/
│   └── hooks.json                  # Git & file-change hooks
├── scripts/
│   └── deploy.sh                   # Deployment script
├── extensions/                     # Reserved for future extensions
├── mcp.json                        # MCP server configuration
├── README.md                       # This file
├── CHANGELOG.md                    # Release history
└── LICENSE                         # MIT License
```

## Getting Started

### Prerequisites

- [Cursor](https://cursor.com/) editor
- [Node.js](https://nodejs.org/) 18+
- [Vercel CLI](https://vercel.com/cli) (`npm i -g vercel`)
- A [Vercel](https://vercel.com/) account

### Installation

This plugin is included in the `service-plugin-generation` repository. To use it:

1. Clone the repository or copy the `plugins/vercel/` directory into your project
2. The plugin's rules will automatically activate when you edit matching files:
   - `api/**/*.ts`, `app/api/**/*.ts`, `pages/api/**/*.ts` → serverless function best practices
   - `vercel.json`, `next.config.*` → configuration best practices
3. Access the deployment agent for interactive help with build and deployment issues

### Environment Variables

Set `VERCEL_TOKEN` for MCP server and CI/CD integration:

```bash
# Local development
export VERCEL_TOKEN="your-vercel-token"

# CI/CD — set as a secret in your provider
# GitHub Actions: Settings → Secrets → VERCEL_TOKEN
```

## Rules

### vercel-functions.mdc

Activated when editing API route handlers. Covers:

- Runtime selection (edge vs. serverless)
- Function duration and timeout configuration
- Cold start mitigation strategies
- Streaming responses with Web Streams API
- CORS header configuration
- Environment variable usage
- Error handling patterns
- Vercel KV, Blob, and Postgres integration
- Input validation and security

### vercel-config.mdc

Activated when editing `vercel.json` or `next.config.*`. Covers:

- Rewrites and redirects
- Security headers
- Build settings and framework presets
- Function region configuration
- Cron job setup
- Monorepo configuration
- Deployment protection

## Agent

The **Vercel Deployment Agent** helps with:

- Diagnosing build failures and deployment errors
- Optimizing build times and bundle sizes
- Configuring preview and production deployments
- Setting up custom domains and DNS
- Implementing caching strategies (ISR, SWR, Data Cache)
- Edge function architecture and performance tuning

## Skills

### Deploy to Vercel

Complete walkthrough from setup to production:

1. Install Vercel CLI
2. Authenticate and link project
3. Configure environment variables
4. Deploy to preview and production
5. Set up custom domains
6. Configure CI/CD pipelines

### Set Up Edge Functions

Guide for edge function development:

1. When to choose edge vs. serverless
2. Creating edge route handlers (App Router & Pages Router)
3. Edge Middleware for auth, geo-routing, A/B testing
4. Streaming responses and AI SDK integration
5. Edge Config for feature flags
6. Troubleshooting common edge runtime issues

## Deploy Script

The included `scripts/deploy.sh` provides:

```bash
./scripts/deploy.sh              # Preview deployment
./scripts/deploy.sh --prod       # Production deployment
./scripts/deploy.sh --dry-run    # Build validation only
./scripts/deploy.sh --help       # Show all options
```

Features: framework detection, TypeScript validation, post-deploy health checks, CI/CD compatibility.

## License

MIT — see [LICENSE](./LICENSE) for details.
