# Changelog

All notable changes to the AWS Cursor Plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-07

### Added

- **Plugin manifest** (`.cursor/plugin.json`) with full metadata and component references.
- **AWS SDK v3 rules** (`rules/aws-sdk.mdc`) — modular imports, credential providers, retries, middleware, error handling, pagination, region config, secrets management, and debugging.
- **AWS CDK rules** (`rules/aws-cdk.mdc`) — L2/L3 constructs, construct library patterns, removal policies, tagging, CDK Aspects, stack naming, context config, testing, and cdk-nag.
- **AWS Architecture Agent** (`agents/aws-architecture-agent.md`) — AI advisor for AWS architecture design, service selection, Well-Architected reviews, cost optimization, and disaster recovery planning.
- **Setup Lambda Function skill** (`skills/setup-lambda-function/SKILL.md`) — CDK/SAM project setup, handler patterns, layers, environment variables, VPC config, DLQs, provisioned concurrency, and event source mappings.
- **Setup DynamoDB Table skill** (`skills/setup-dynamodb-table/SKILL.md`) — access pattern design, key schema, GSIs, single-table design, TTL, TypeScript data access layer, and permission grants.
- **Pre-commit hooks** (`hooks/hooks.json`) — credential leak detection for AWS access keys, secret keys, and session tokens.
- **MCP server configuration** (`mcp.json`) — AWS operations server with tools for S3, Lambda, DynamoDB, CloudFormation, CloudWatch, IAM, and SSM.
- **Credential check script** (`scripts/check-aws-credentials.sh`) — bash script scanning staged files for hardcoded AWS credentials.
- Project documentation: `README.md`, `CHANGELOG.md`, `LICENSE`.
