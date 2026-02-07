# GitHub Plugin for Cursor

A comprehensive Cursor plugin for working with GitHub — Actions, API, CLI, Pull Requests, and repository management.

## Overview

This plugin provides rules, agents, skills, hooks, and MCP server configuration to help developers work effectively with GitHub's ecosystem directly from Cursor.

## Contents

### Rules

| File | Scope | Description |
|------|-------|-------------|
| `rules/github-actions.mdc` | `.github/workflows/*.yml` | Best practices for GitHub Actions: pinned SHAs, least-privilege permissions, concurrency, caching, matrix builds, reusable workflows |
| `rules/github-api.mdc` | `**/*.ts`, `**/*.js` | Best practices for the GitHub API: Octokit SDK, rate limiting, pagination, GraphQL, webhook signatures, error handling |

### Agents

| File | Description |
|------|-------------|
| `agents/github-actions-agent.md` | Specialized agent for creating, debugging, and optimizing GitHub Actions workflows and CI/CD pipelines |
| `agents/github-pr-reviewer.md` | Agent for reviewing pull requests with structured findings, severity levels, and actionable suggestions |

### Skills

| Skill | Trigger | Description |
|-------|---------|-------------|
| `skills/create-github-action/SKILL.md` | Creating a custom GitHub Action | Step-by-step guide for composite and JavaScript actions, including marketplace publishing |
| `skills/setup-ci-pipeline/SKILL.md` | Setting up CI/CD | Pipeline patterns for Node.js, Python, Docker, and cloud deployments with branch protection and Dependabot |

### Hooks

| Hook | Event | Description |
|------|-------|-------------|
| `validate-github-actions-workflows` | `pre-commit` | Validates workflow YAML syntax, checks pinned actions, and verifies permissions blocks |
| `format-workflow-yaml` | `post-save` | Auto-formats workflow YAML with Prettier on save |

### MCP Server

The `mcp.json` configures the `@modelcontextprotocol/server-github` MCP server, providing AI-accessible GitHub API operations:

- Repository search and management
- Issue and pull request CRUD
- Code search
- Branch management
- Workflow run inspection

### Scripts

| Script | Description |
|--------|-------------|
| `scripts/validate-workflows.sh` | Comprehensive workflow validator checking YAML syntax, pinned actions, permissions, concurrency, timeouts, and security |

## Setup

### 1. Install the Plugin

Copy or symlink the `plugins/github/` directory into your Cursor workspace.

### 2. Configure the MCP Server

Set the `GITHUB_TOKEN` environment variable with a personal access token or GitHub App installation token:

```bash
export GITHUB_TOKEN="ghp_your_token_here"
```

For fine-grained tokens, grant the minimum scopes your workflow requires:

| Scope | Use Case |
|-------|----------|
| `repo` | Full repository access |
| `read:org` | Organization membership |
| `workflow` | GitHub Actions management |
| `read:packages` | Package registry access |

### 3. Install Optional Tools

For the best experience, install these tools:

```bash
# actionlint — GitHub Actions workflow linter
brew install actionlint         # macOS
go install github.com/rhysd/actionlint/cmd/actionlint@latest  # Go

# yamllint — general YAML linter
pip install yamllint

# gh — GitHub CLI
brew install gh                 # macOS
sudo apt install gh             # Ubuntu/Debian
```

### 4. Validate Your Workflows

```bash
chmod +x plugins/github/scripts/validate-workflows.sh
./plugins/github/scripts/validate-workflows.sh
```

## Usage

### With Cursor AI

The plugin activates automatically when you work with relevant files:

- **Editing workflow YAML** — GitHub Actions rules and hooks activate, providing inline guidance and pre-commit validation.
- **Writing API code** — GitHub API rules activate when editing `.ts` or `.js` files that interact with the GitHub API.
- **Asking about CI/CD** — The GitHub Actions Agent provides expert guidance on pipeline creation and debugging.
- **Reviewing PRs** — The PR Reviewer Agent generates structured reviews with severity-tagged findings.

### Running the Workflow Validator

```bash
# Validate default directory (.github/workflows)
./plugins/github/scripts/validate-workflows.sh

# Validate a custom directory
./plugins/github/scripts/validate-workflows.sh path/to/workflows
```

The validator checks:
1. YAML syntax validity
2. actionlint errors (if installed)
3. Actions pinned to full commit SHAs
4. Explicit `permissions:` blocks
5. Concurrency groups configured
6. Job `timeout-minutes` set
7. `pull_request_target` safety
8. No hard-coded secrets

## Project Structure

```
plugins/github/
├── .cursor/
│   └── plugin.json              # Plugin manifest
├── agents/
│   ├── github-actions-agent.md  # CI/CD specialist agent
│   └── github-pr-reviewer.md   # PR review agent
├── rules/
│   ├── github-actions.mdc      # Actions best practices
│   └── github-api.mdc          # API best practices
├── skills/
│   ├── create-github-action/
│   │   └── SKILL.md            # Custom action creation guide
│   └── setup-ci-pipeline/
│       └── SKILL.md            # CI/CD pipeline setup guide
├── hooks/
│   └── hooks.json              # Pre-commit and post-save hooks
├── scripts/
│   └── validate-workflows.sh   # Workflow validation script
├── extensions/                  # Extension point (reserved)
├── mcp.json                    # MCP server configuration
├── README.md                   # This file
├── CHANGELOG.md                # Version history
└── LICENSE                     # MIT License
```

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Make your changes and add tests where applicable.
4. Submit a pull request with a clear description.

## License

MIT License — see [LICENSE](LICENSE) for details.
