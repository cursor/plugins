# Skill: Set Up an AWS Lambda Function

## Description

This skill walks through creating a production-ready AWS Lambda function, including the handler code, infrastructure definition (CDK or SAM), layers, environment variables, and VPC configuration.

## Prerequisites

- AWS CLI configured with valid credentials
- Node.js >= 18 (or target runtime installed)
- AWS CDK CLI (`npm install -g aws-cdk`) **or** AWS SAM CLI installed
- An AWS account with permissions to create Lambda functions, IAM roles, and related resources

## Steps

### 1. Initialize the Project

#### Using CDK

```bash
mkdir my-lambda-service && cd my-lambda-service
npx cdk init app --language typescript
npm install @aws-cdk/aws-lambda @aws-cdk/aws-logs
```

#### Using SAM

```bash
sam init --runtime nodejs20.x --name my-lambda-service --app-template hello-world
cd my-lambda-service
```

### 2. Write the Lambda Handler

Create the handler file at `src/handlers/my-function.ts`:

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log("Request ID:", context.awsRequestId);
  console.log("Event:", JSON.stringify(event, null, 2));

  try {
    const body = JSON.parse(event.body ?? "{}");

    // Business logic here

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": context.awsRequestId,
      },
      body: JSON.stringify({
        message: "Success",
        requestId: context.awsRequestId,
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};
```

### 3. Define Infrastructure with CDK

In `lib/my-lambda-stack.ts`:

```typescript
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export class MyLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const fn = new nodejs.NodejsFunction(this, "MyFunction", {
      entry: "src/handlers/my-function.ts",
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64, // Graviton — cheaper & faster
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      environment: {
        NODE_OPTIONS: "--enable-source-maps",
        LOG_LEVEL: "info",
        TABLE_NAME: "my-table", // Reference actual resource
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: "node20",
      },
      logRetention: logs.RetentionDays.TWO_WEEKS,
      tracing: lambda.Tracing.ACTIVE, // X-Ray tracing
    });

    // Output the function ARN
    new cdk.CfnOutput(this, "FunctionArn", { value: fn.functionArn });
  }
}
```

### 4. Add Lambda Layers

Layers are useful for sharing dependencies or large binaries across functions:

```typescript
const sharedLayer = new lambda.LayerVersion(this, "SharedDepsLayer", {
  code: lambda.Code.fromAsset("layers/shared-deps"),
  compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
  compatibleArchitectures: [lambda.Architecture.ARM_64],
  description: "Shared dependencies for Lambda functions",
});

const fn = new nodejs.NodejsFunction(this, "MyFunction", {
  // ... other props
  layers: [sharedLayer],
});
```

### 5. Configure Environment Variables

Best practices for environment variables:

- Use SSM Parameter Store or Secrets Manager for sensitive values.
- Reference CDK resource attributes directly (e.g., `table.tableName`).
- Keep non-sensitive config in environment variables for fast access.

```typescript
import * as ssm from "aws-cdk-lib/aws-ssm";

const apiKeyParam = ssm.StringParameter.fromStringParameterName(
  this, "ApiKey", "/myapp/api-key"
);

const fn = new nodejs.NodejsFunction(this, "MyFunction", {
  environment: {
    TABLE_NAME: table.tableName,
    QUEUE_URL: queue.queueUrl,
    API_KEY_PARAM: apiKeyParam.parameterName,
  },
});

// Grant read access to the parameter
apiKeyParam.grantRead(fn);
```

### 6. VPC Configuration

Place Lambda in a VPC when it needs to access private resources (RDS, ElastiCache, internal services):

```typescript
import * as ec2 from "aws-cdk-lib/aws-ec2";

const vpc = ec2.Vpc.fromLookup(this, "Vpc", { vpcName: "my-vpc" });

const fn = new nodejs.NodejsFunction(this, "MyFunction", {
  vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  securityGroups: [securityGroup],
  // ... other props
});
```

> **Note:** Lambda functions in a VPC require a NAT Gateway for internet access. Use VPC endpoints for AWS services (S3, DynamoDB, SQS) to avoid NAT Gateway costs and improve latency.

### 7. Deploy

```bash
# CDK
npx cdk synth
npx cdk deploy

# SAM
sam build
sam deploy --guided
```

### 8. Test

```bash
# Invoke locally (SAM)
sam local invoke MyFunction -e events/test-event.json

# Invoke in AWS
aws lambda invoke \
  --function-name my-function \
  --payload '{"key": "value"}' \
  --cli-binary-format raw-in-base64-out \
  response.json

cat response.json
```

## Common Patterns

### Dead Letter Queue (DLQ)

```typescript
import * as sqs from "aws-cdk-lib/aws-sqs";

const dlq = new sqs.Queue(this, "DLQ", {
  retentionPeriod: cdk.Duration.days(14),
});

const fn = new nodejs.NodejsFunction(this, "MyFunction", {
  deadLetterQueue: dlq,
  retryAttempts: 2,
});
```

### Provisioned Concurrency

```typescript
const alias = fn.addAlias("live");
const scaling = alias.addAutoScaling({ minCapacity: 5, maxCapacity: 50 });
scaling.scaleOnUtilization({ utilizationTarget: 0.7 });
```

### Event Source Mappings

```typescript
import * as eventsources from "aws-cdk-lib/aws-lambda-event-sources";

// SQS trigger
fn.addEventSource(new eventsources.SqsEventSource(queue, {
  batchSize: 10,
  maxBatchingWindow: cdk.Duration.seconds(5),
}));

// DynamoDB Streams trigger
fn.addEventSource(new eventsources.DynamoEventSource(table, {
  startingPosition: lambda.StartingPosition.TRIM_HORIZON,
  batchSize: 100,
  retryAttempts: 3,
}));
```

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Cold start latency | Use provisioned concurrency or ARM64 + smaller bundles |
| Timeout errors | Increase `timeout`, check downstream service latency |
| Out of memory | Increase `memorySize` (also increases CPU proportionally) |
| VPC connectivity | Verify security groups, NACLs, and route tables |
| Permission denied | Check IAM role policies; use `grant*` methods in CDK |
