# AWS Cursor Plugin

A comprehensive [Cursor](https://cursor.com) plugin for building on Amazon Web Services. Provides rules, agents, skills, hooks, and MCP server integration for AWS services including Lambda, S3, DynamoDB, CDK, IAM, CloudFormation, and more.

## Features

| Component | Description |
|-----------|-------------|
| **Rules** | Best-practice rules for AWS Lambda, AWS SDK v3, and AWS CDK |
| **Agents** | Architecture advisor agent for AWS design decisions |
| **Skills** | Step-by-step guides for Lambda deployment, CDK project setup, Lambda functions, and DynamoDB tables |
| **Hooks** | Pre-commit credential leak detection |
| **MCP Server** | Direct AWS service interaction from Cursor via AWS Labs MCP server |
| **Scripts** | CDK deployment pipeline and credential validation scripts |

## Installation

Copy or symlink this plugin directory into your project's `.cursor/plugins/` folder:

```bash
cp -r plugins/aws /your-project/.cursor/plugins/aws
```

Or reference it in your Cursor plugin configuration.

## Components

### Rules

- **`aws-lambda.mdc`** — AWS Lambda best practices: cold start minimization, SDK client reuse, environment variables, least-privilege IAM, timeout handling, structured logging, Lambda Powertools, memory/timeout tuning, dead letter queues, and input validation.
- **`aws-sdk.mdc`** — AWS SDK v3 best practices: modular imports, credential providers, retries, middleware, error handling, pagination, region config, secrets management, and debugging.
- **`aws-cdk.mdc`** — AWS CDK best practices: L2/L3 constructs, tagging, removal policies, context/environment parameterization, naming conventions, stack separation, termination protection, construct patterns, CDK Aspects, cdk-nag compliance, and testing.

### Agents

- **`aws-architecture-agent.md`** — An AI architecture advisor that helps design AWS architectures, select services, optimize costs, review security, and conduct Well-Architected reviews.

### Skills

- **`deploy-lambda`** — End-to-end workflow for deploying Lambda functions: build, synth, diff, deploy, verify, smoke test, monitoring setup, CI/CD, and rollback strategies.
- **`setup-cdk-project`** — Setting up a production-ready CDK project from scratch: bootstrap, project structure, stack organization, reusable constructs, environment config, testing, cdk-nag, and deployment.
- **`setup-lambda-function`** — Creating Lambda functions with CDK or SAM: handler patterns, layers, environment variables, VPC configuration, DLQs, provisioned concurrency, and event source mappings.
- **`setup-dynamodb-table`** — DynamoDB table design: access patterns, key schema, GSIs, single-table design, TTL, TypeScript data access layer, and permission grants.

### Hooks

- **Pre-commit credential check** — Scans staged files for hardcoded AWS access keys, secret keys, and session tokens before every commit.

### MCP Server

- **AWS Labs MCP Server** (`@awslabs/mcp-server-aws`) — Tools to interact with S3, Lambda, DynamoDB, CloudFormation, CloudWatch, IAM, SSM, and STS directly from Cursor.

### Scripts

- **`deploy-cdk.sh`** — Automated CDK deployment pipeline with credential validation, production safety checks, testing, synthesis, diff, deploy, and post-deploy verification.
- **`check-aws-credentials.sh`** — Scans staged files for hardcoded AWS credentials to prevent accidental commits.

## Project Structure

```
plugins/aws/
├── .cursor/
│   └── plugin.json              # Plugin manifest
├── agents/
│   └── aws-architecture-agent.md
├── rules/
│   ├── aws-lambda.mdc
│   ├── aws-sdk.mdc
│   └── aws-cdk.mdc
├── skills/
│   ├── deploy-lambda/
│   │   └── SKILL.md
│   ├── setup-cdk-project/
│   │   └── SKILL.md
│   ├── setup-lambda-function/
│   │   └── SKILL.md
│   └── setup-dynamodb-table/
│       └── SKILL.md
├── hooks/
│   └── hooks.json
├── scripts/
│   ├── deploy-cdk.sh
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
| `AWS_MCP_ALLOW_WRITE` | `false` | Enable write operations in the MCP server |

## License

MIT — see [LICENSE](./LICENSE) for details.
