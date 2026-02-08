# Skill: Deploy an AWS Lambda Function

## Description

This skill covers the end-to-end workflow for deploying an AWS Lambda function to a target environment, including building, packaging, deploying with CDK or SAM, verifying the deployment, and setting up CI/CD.

## Prerequisites

- AWS CLI configured with valid credentials (`aws sts get-caller-identity` succeeds)
- Node.js >= 18 installed
- AWS CDK CLI (`npm install -g aws-cdk`) **or** AWS SAM CLI installed
- An AWS account with permissions to create/update Lambda functions, IAM roles, CloudFormation stacks, and related resources
- CDK bootstrap completed in the target account/region (`npx cdk bootstrap aws://<ACCOUNT>/<REGION>`)

## Steps

### 1. Validate the Project Structure

Ensure your project follows a standard layout:

```
my-service/
├── bin/
│   └── app.ts              # CDK app entry point
├── lib/
│   └── my-service-stack.ts  # Stack definitions
├── src/
│   └── handlers/
│       └── my-function.ts   # Lambda handler
├── test/
│   └── my-service.test.ts   # CDK + unit tests
├── cdk.json
├── tsconfig.json
└── package.json
```

### 2. Build and Synthesize

```bash
# Install dependencies
npm ci

# Run linting and type checks
npm run lint
npx tsc --noEmit

# Run tests
npm test

# Synthesize CloudFormation template
npx cdk synth
```

Review the synthesized template in `cdk.out/` to verify the resources that will be created.

### 3. Diff Against the Deployed Stack

Always diff before deploying to understand what will change:

```bash
npx cdk diff
```

Review the output carefully. Watch for:
- **IAM changes** — unintended permission escalation
- **Resource replacements** — resources being destroyed and recreated (data loss risk)
- **Security group changes** — unexpected network exposure

### 4. Deploy to a Development Environment

```bash
# Deploy to dev (using CDK context for environment selection)
npx cdk deploy --context environment=dev --require-approval broadening
```

Key flags:
- `--require-approval broadening` — prompts for confirmation on IAM or security-group changes
- `--context environment=dev` — passes environment context to the stack
- `--outputs-file outputs.json` — saves stack outputs (function ARN, URL, etc.) to a file

#### Using SAM

```bash
sam build
sam deploy \
  --stack-name my-service-dev \
  --parameter-overrides Environment=dev \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --no-confirm-changeset
```

### 5. Verify the Deployment

```bash
# Get the deployed function name from stack outputs
FUNCTION_NAME=$(aws cloudformation describe-stacks \
  --stack-name MyServiceDevStack \
  --query 'Stacks[0].Outputs[?OutputKey==`FunctionName`].OutputValue' \
  --output text)

# Check the function configuration
aws lambda get-function-configuration --function-name "$FUNCTION_NAME"

# Invoke the function with a test payload
aws lambda invoke \
  --function-name "$FUNCTION_NAME" \
  --payload '{"httpMethod":"GET","path":"/health"}' \
  --cli-binary-format raw-in-base64-out \
  response.json

cat response.json

# Check recent logs
aws logs tail "/aws/lambda/$FUNCTION_NAME" --since 5m --follow
```

### 6. Run Smoke Tests

```bash
# If the function has a Function URL or API Gateway endpoint
ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name MyServiceDevStack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text)

# Health check
curl -s "$ENDPOINT/health" | jq .

# Functional test
curl -s -X POST "$ENDPOINT/orders" \
  -H "Content-Type: application/json" \
  -d '{"customerId":"test-001","items":[{"productId":"p1","quantity":1}]}' \
  | jq .
```

### 7. Deploy to Production

```bash
# Diff against production
npx cdk diff --context environment=prod

# Deploy with strict approval
npx cdk deploy \
  --context environment=prod \
  --require-approval broadening \
  --outputs-file prod-outputs.json
```

Production deployment checklist:
- [ ] All tests pass
- [ ] `cdk diff` reviewed and approved
- [ ] Provisioned concurrency configured for latency-critical functions
- [ ] CloudWatch alarms set for errors, throttles, and duration
- [ ] DLQ configured for async invocations
- [ ] Rollback plan documented

### 8. Set Up Monitoring and Alarms

```typescript
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as actions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as sns from "aws-cdk-lib/aws-sns";

const alarmTopic = new sns.Topic(this, "AlarmTopic");

// Error rate alarm
new cloudwatch.Alarm(this, "ErrorAlarm", {
  metric: fn.metricErrors({ period: cdk.Duration.minutes(5) }),
  threshold: 5,
  evaluationPeriods: 2,
  alarmDescription: "Lambda error rate exceeded threshold",
}).addAlarmAction(new actions.SnsAction(alarmTopic));

// Throttle alarm
new cloudwatch.Alarm(this, "ThrottleAlarm", {
  metric: fn.metricThrottles({ period: cdk.Duration.minutes(5) }),
  threshold: 1,
  evaluationPeriods: 1,
  alarmDescription: "Lambda function is being throttled",
}).addAlarmAction(new actions.SnsAction(alarmTopic));

// Duration alarm (approaching timeout)
new cloudwatch.Alarm(this, "DurationAlarm", {
  metric: fn.metricDuration({ period: cdk.Duration.minutes(5), statistic: "p99" }),
  threshold: 25000, // 25 seconds for a 30-second timeout
  evaluationPeriods: 2,
  alarmDescription: "Lambda p99 duration approaching timeout",
}).addAlarmAction(new actions.SnsAction(alarmTopic));
```

### 9. Set Up CI/CD Pipeline

#### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy Lambda

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test

  deploy-dev:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: dev
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::role/GitHubActionsDeployRole
          aws-region: us-east-1
      - run: npm ci
      - run: npx cdk deploy --context environment=dev --require-approval never

  deploy-prod:
    needs: deploy-dev
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::role/GitHubActionsDeployRole
          aws-region: us-east-1
      - run: npm ci
      - run: npx cdk deploy --context environment=prod --require-approval never
```

### 10. Rollback Strategies

If a deployment introduces issues:

```bash
# Option 1: Redeploy the previous version via git revert
git revert HEAD
git push origin main
# CI/CD will deploy the reverted code

# Option 2: Use Lambda aliases and weighted routing
# Shift traffic back to the previous version
aws lambda update-alias \
  --function-name my-function \
  --name live \
  --routing-config 'AdditionalVersionWeights={}'

# Option 3: CloudFormation rollback
aws cloudformation rollback-stack --stack-name MyServiceProdStack
```

## Troubleshooting

| Issue | Solution |
|-------|---------|
| `cdk deploy` fails with bootstrap error | Run `npx cdk bootstrap aws://<ACCOUNT>/<REGION>` |
| Permission denied during deploy | Check IAM permissions for CloudFormation and Lambda |
| Function deploys but returns errors | Check CloudWatch Logs: `aws logs tail /aws/lambda/<name>` |
| Cold start latency is too high | Enable provisioned concurrency, reduce bundle size |
| Stack rollback in progress | Wait for rollback to complete, then fix and redeploy |
| Timeout during deployment | Increase CloudFormation timeout or split into smaller stacks |
