# Changelog

All notable changes to the AWS Cursor Plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-08

### Added

- **Plugin manifest** (`.cursor/plugin.json`) with full metadata and component references.
- **AWS Lambda rules** (`rules/aws-lambda.mdc`) — cold start minimization, SDK client reuse, environment variables, least-privilege IAM, timeout handling, structured JSON logging, Lambda Powertools, memory/timeout tuning, dead letter queues, and input event validation.
- **AWS SDK v3 rules** (`rules/aws-sdk.mdc`) — modular imports, credential providers, retries, middleware, error handling, pagination, region config, secrets management, and debugging.
- **AWS CDK rules** (`rules/aws-cdk.mdc`) — L2/L3 constructs, resource tagging, removal policies, context/environment parameterization, naming conventions, stack separation, termination protection for production, construct library patterns, CDK Aspects, cdk-nag compliance, and testing.
- **AWS Architecture Agent** (`agents/aws-architecture-agent.md`) — AI advisor for AWS architecture design, service selection, Well-Architected reviews, cost optimization, security best practices, migration planning, and disaster recovery.
- **Deploy Lambda skill** (`skills/deploy-lambda/SKILL.md`) — end-to-end Lambda deployment workflow: build, synth, diff, deploy, verify, smoke tests, monitoring/alarms, CI/CD pipeline (GitHub Actions), and rollback strategies.
- **Setup CDK Project skill** (`skills/setup-cdk-project/SKILL.md`) — production-ready CDK project initialization: bootstrap, project structure, app entry point, reusable constructs, environment configuration, testing setup, cdk-nag integration, and deployment.
- **Setup Lambda Function skill** (`skills/setup-lambda-function/SKILL.md`) — CDK/SAM project setup, handler patterns, layers, environment variables, VPC config, DLQs, provisioned concurrency, and event source mappings.
- **Setup DynamoDB Table skill** (`skills/setup-dynamodb-table/SKILL.md`) — access pattern design, key schema, GSIs, single-table design, TTL, TypeScript data access layer, and permission grants.
- **Pre-commit hooks** (`hooks/hooks.json`) — credential leak detection for AWS access keys, secret keys, and session tokens.
- **MCP server configuration** (`mcp.json`) — AWS Labs MCP server (`@awslabs/mcp-server-aws`) with tools for S3, Lambda, DynamoDB, CloudFormation, CloudWatch, IAM, SSM, and STS.
- **CDK deployment script** (`scripts/deploy-cdk.sh`) — automated deployment pipeline with credential validation, production safety checks, testing, synthesis, diff, and post-deploy verification.
- **Credential check script** (`scripts/check-aws-credentials.sh`) — bash script scanning staged files for hardcoded AWS credentials.
- Project documentation: `README.md`, `CHANGELOG.md`, `LICENSE`.
