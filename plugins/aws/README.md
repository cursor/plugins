# AWS Cursor Plugin

A comprehensive [Cursor](https://cursor.com) plugin for building on Amazon Web Services. Provides rules, agents, skills, hooks, and MCP server integration for AWS services including Lambda, S3, DynamoDB, CDK, IAM, and more.

## Features

| Component | Description |
|-----------|-------------|
| **Rules** | Best-practice rules for AWS SDK v3 and AWS CDK |
| **Agents** | Architecture advisor agent for AWS design decisions |
| **Skills** | Step-by-step guides for Lambda functions and DynamoDB tables |
| **Hooks** | Pre-commit credential leak detection |
| **MCP Server** | Direct AWS service interaction from Cursor |

## Installation

Copy or symlink this plugin directory into your project's `.cursor/plugins/` folder:

```bash
cp -r plugins/aws /your-project/.cursor/plugins/aws
```

Or reference it in your Cursor plugin configuration.

## Components

### Rules

- **`aws-sdk.mdc`** — AWS SDK v3 best practices: modular imports, credential providers, retries, error handling, pagination, and debugging.
- **`aws-cdk.mdc`** — AWS CDK best practices: L2/L3 constructs, removal policies, tagging, Aspects, testing, and cdk-nag security checks.

### Agents

- **`aws-architecture-agent.md`** — An AI architecture advisor that helps design AWS architectures, select services, optimize costs, and conduct Well-Architected reviews.

### Skills

- **`setup-lambda-function`** — End-to-end guide for creating Lambda functions with CDK or SAM, including handler patterns, layers, environment variables, VPC configuration, DLQs, and provisioned concurrency.
- **`setup-dynamodb-table`** — Complete guide for DynamoDB table design: key schema, GSIs, single-table design, TTL, access patterns, and a TypeScript data access layer.

### Hooks

- **Pre-commit credential check** — Scans staged files for hardcoded AWS access keys, secret keys, and session tokens before every commit.

### MCP Server

- **AWS Operations** — MCP server providing tools to interact with S3, Lambda, DynamoDB, CloudFormation, CloudWatch, IAM, and SSM directly from Cursor.

## Project Structure

```
plugins/aws/
├── .cursor/
│   └── plugin.json          # Plugin manifest
├── agents/
│   └── aws-architecture-agent.md
├── rules/
│   ├── aws-sdk.mdc
│   └── aws-cdk.mdc
├── skills/
│   ├── setup-lambda-function/
│   │   └── SKILL.md
│   └── setup-dynamodb-table/
│       └── SKILL.md
├── hooks/
│   └── hooks.json
├── scripts/
│   └── check-aws-credentials.sh
├── extensions/
├── mcp.json
├── README.md
├── CHANGELOG.md
└── LICENSE
```

## Configuration

### AWS Credentials

The plugin expects AWS credentials to be configured via one of:

- Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
- AWS credentials file (`~/.aws/credentials`)
- IAM instance profile or task role
- AWS SSO (`aws sso login`)

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AWS_PROFILE` | `default` | AWS CLI profile to use |
| `AWS_REGION` | `us-east-1` | Default AWS region |

## License

MIT — see [LICENSE](./LICENSE) for details.
