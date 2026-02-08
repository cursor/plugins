# Skill: Set Up an AWS CDK Project

## Description

This skill walks through initializing a production-ready AWS CDK (Cloud Development Kit) project from scratch, including project structure, stack organization, environment configuration, testing setup, CI/CD, and deployment best practices.

## Prerequisites

- Node.js >= 18 installed
- AWS CLI configured with valid credentials (`aws sts get-caller-identity` succeeds)
- AWS CDK CLI installed: `npm install -g aws-cdk`
- An AWS account with permissions to create CloudFormation stacks and associated resources
- CDK bootstrap completed in the target account/region

## Steps

### 1. Bootstrap Your AWS Environment

CDK bootstrap provisions resources that CDK needs to deploy (S3 bucket for assets, IAM roles, ECR repository):

```bash
# Bootstrap the default account/region
npx cdk bootstrap

# Bootstrap a specific account and region
npx cdk bootstrap aws://123456789012/us-east-1

# Bootstrap with custom settings (recommended for organizations)
npx cdk bootstrap aws://123456789012/us-east-1 \
  --qualifier myorg \
  --cloudformation-execution-policies "arn:aws:iam::policy/AdministratorAccess" \
  --tags Project=MyService Environment=shared
```

### 2. Initialize the CDK Project

```bash
mkdir my-service && cd my-service
npx cdk init app --language typescript
```

This creates the default CDK project structure. Reorganize it for production use:

```bash
# Create a clean project structure
mkdir -p src/handlers src/lib config test/unit test/integration
```

Target project layout:

```
my-service/
├── bin/
│   └── app.ts                  # CDK app entry point
├── lib/
│   ├── stacks/
│   │   ├── networking-stack.ts # VPC, subnets, security groups
│   │   ├── data-stack.ts       # DynamoDB, S3, RDS
│   │   ├── compute-stack.ts    # Lambda, ECS, Step Functions
│   │   └── monitoring-stack.ts # CloudWatch, alarms, dashboards
│   └── constructs/
│       ├── api-construct.ts    # Reusable API Gateway + Lambda
│       └── table-construct.ts  # Reusable DynamoDB table
├── src/
│   ├── handlers/               # Lambda handler source code
│   │   ├── api-handler.ts
│   │   └── processor.ts
│   └── lib/                    # Shared application code
│       └── utils.ts
├── config/
│   ├── dev.ts                  # Dev environment config
│   ├── staging.ts              # Staging environment config
│   └── prod.ts                 # Production environment config
├── test/
│   ├── unit/
│   │   └── data-stack.test.ts
│   └── integration/
│       └── api.test.ts
├── cdk.json
├── tsconfig.json
├── jest.config.js
└── package.json
```

### 3. Configure the CDK App Entry Point

Edit `bin/app.ts` to define your stacks with environment-aware configuration:

```typescript
#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { NetworkingStack } from "../lib/stacks/networking-stack";
import { DataStack } from "../lib/stacks/data-stack";
import { ComputeStack } from "../lib/stacks/compute-stack";
import { MonitoringStack } from "../lib/stacks/monitoring-stack";

const app = new cdk.App();

const environment = app.node.tryGetContext("environment") ?? "dev";

// Environment-specific configuration
const envConfig: Record<string, { account: string; region: string }> = {
  dev: { account: "111111111111", region: "us-east-1" },
  staging: { account: "222222222222", region: "us-east-1" },
  prod: { account: "333333333333", region: "us-east-1" },
};

const env = envConfig[environment];
const prefix = `MyService-${environment}`;

// Global tags
cdk.Tags.of(app).add("Project", "MyService");
cdk.Tags.of(app).add("Environment", environment);
cdk.Tags.of(app).add("ManagedBy", "CDK");
cdk.Tags.of(app).add("Owner", "platform-team");

// Stack definitions — ordered by dependency
const networkingStack = new NetworkingStack(app, `${prefix}-Networking`, {
  env,
  environment,
});

const dataStack = new DataStack(app, `${prefix}-Data`, {
  env,
  environment,
  vpc: networkingStack.vpc,
});

const computeStack = new ComputeStack(app, `${prefix}-Compute`, {
  env,
  environment,
  vpc: networkingStack.vpc,
  table: dataStack.table,
  bucket: dataStack.bucket,
});

new MonitoringStack(app, `${prefix}-Monitoring`, {
  env,
  environment,
  functions: computeStack.functions,
  table: dataStack.table,
});
```

### 4. Create a Reusable Construct

`lib/constructs/api-construct.ts`:

```typescript
import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export interface ApiConstructProps {
  /** Name prefix for resources */
  readonly prefix: string;
  /** Path to the Lambda handler entry file */
  readonly handlerEntry: string;
  /** Environment variables for the Lambda function */
  readonly environment?: Record<string, string>;
  /** Memory size in MB (default: 256) */
  readonly memorySize?: number;
  /** Timeout in seconds (default: 30) */
  readonly timeout?: number;
}

export class ApiConstruct extends Construct {
  public readonly api: apigateway.RestApi;
  public readonly handler: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: ApiConstructProps) {
    super(scope, id);

    this.handler = new nodejs.NodejsFunction(this, "Handler", {
      entry: props.handlerEntry,
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: props.memorySize ?? 256,
      timeout: cdk.Duration.seconds(props.timeout ?? 30),
      environment: {
        NODE_OPTIONS: "--enable-source-maps",
        ...props.environment,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: "node20",
      },
      logRetention: logs.RetentionDays.TWO_WEEKS,
      tracing: lambda.Tracing.ACTIVE,
    });

    this.api = new apigateway.RestApi(this, "Api", {
      restApiName: `${props.prefix}-api`,
      deployOptions: {
        stageName: "v1",
        tracingEnabled: true,
        metricsEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const integration = new apigateway.LambdaIntegration(this.handler);
    this.api.root.addProxy({ defaultIntegration: integration });
  }
}
```

### 5. Configure Environment-Specific Settings

`config/dev.ts`:

```typescript
export const devConfig = {
  environment: "dev" as const,
  lambda: {
    memorySize: 256,
    timeout: 30,
    provisionedConcurrency: 0,
  },
  dynamodb: {
    billingMode: "PAY_PER_REQUEST" as const,
    removalPolicy: "DESTROY" as const,
  },
  monitoring: {
    alarmEmail: "dev-alerts@example.com",
    dashboardEnabled: false,
  },
};
```

`config/prod.ts`:

```typescript
export const prodConfig = {
  environment: "prod" as const,
  lambda: {
    memorySize: 512,
    timeout: 30,
    provisionedConcurrency: 5,
  },
  dynamodb: {
    billingMode: "PAY_PER_REQUEST" as const,
    removalPolicy: "RETAIN" as const,
  },
  monitoring: {
    alarmEmail: "prod-alerts@example.com",
    dashboardEnabled: true,
  },
};
```

### 6. Set Up CDK Testing

Install testing dependencies:

```bash
npm install --save-dev jest @types/jest ts-jest
```

`jest.config.js`:

```javascript
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  testMatch: ["**/*.test.ts"],
  transform: { "^.+\\.tsx?$": "ts-jest" },
};
```

Write snapshot and assertion tests:

`test/unit/data-stack.test.ts`:

```typescript
import * as cdk from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import { DataStack } from "../../lib/stacks/data-stack";

describe("DataStack", () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new DataStack(app, "TestDataStack", {
      environment: "test",
    });
    template = Template.fromStack(stack);
  });

  test("creates DynamoDB table with PAY_PER_REQUEST billing", () => {
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      BillingMode: "PAY_PER_REQUEST",
    });
  });

  test("enables point-in-time recovery", () => {
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: true },
    });
  });

  test("creates S3 bucket with encryption", () => {
    template.hasResourceProperties("AWS::S3::Bucket", {
      BucketEncryption: Match.objectLike({
        ServerSideEncryptionConfiguration: Match.anyValue(),
      }),
    });
  });

  test("snapshot test", () => {
    expect(template.toJSON()).toMatchSnapshot();
  });
});
```

### 7. Integrate cdk-nag for Security Compliance

```bash
npm install cdk-nag
```

Add to your app entry point:

```typescript
import { Aspects } from "aws-cdk-lib";
import { AwsSolutionsChecks, NagSuppressions } from "cdk-nag";

// Enable AWS Solutions security checks
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

// Suppress specific rules with justification
NagSuppressions.addStackSuppressions(computeStack, [
  {
    id: "AwsSolutions-IAM4",
    reason: "Using AWS managed policies for Lambda basic execution role",
  },
]);
```

### 8. Configure cdk.json

```json
{
  "app": "npx ts-node --prefer-ts-exts bin/app.ts",
  "watch": {
    "include": ["**"],
    "exclude": [
      "README.md", "cdk*.json", "**/*.d.ts", "**/*.js",
      "tsconfig.json", "package*.json", "yarn.lock",
      "node_modules", "test", "coverage"
    ]
  },
  "context": {
    "@aws-cdk/aws-lambda:recognizeLayerVersion": true,
    "@aws-cdk/core:stackRelativeExports": true,
    "@aws-cdk/aws-apigateway:usagePlanKeyOrderInsensitiveId": true,
    "@aws-cdk/core:enablePartitionLiterals": true,
    "dev": {
      "account": "111111111111",
      "region": "us-east-1"
    },
    "prod": {
      "account": "333333333333",
      "region": "us-east-1"
    }
  }
}
```

### 9. Deploy

```bash
# Synthesize first — review the generated CloudFormation
npx cdk synth --context environment=dev

# Diff against what is already deployed
npx cdk diff --context environment=dev

# Deploy to dev
npx cdk deploy --all --context environment=dev --require-approval broadening

# Deploy to production with explicit approval
npx cdk deploy --all --context environment=prod --require-approval broadening
```

### 10. Enable CDK Watch for Development

During development, use `cdk watch` for fast iterative deployments:

```bash
npx cdk watch --context environment=dev
```

This monitors your source files and automatically deploys changes using hotswap when possible (bypasses full CloudFormation deployments for Lambda code changes).

## Best Practices Checklist

- [ ] CDK bootstrap completed in all target accounts/regions
- [ ] Stacks separated by domain (networking, data, compute, monitoring)
- [ ] Reusable constructs extracted for common patterns
- [ ] Environment configuration parameterized (never hardcoded)
- [ ] All resources tagged (Project, Environment, Owner, ManagedBy)
- [ ] `RemovalPolicy.RETAIN` on production stateful resources
- [ ] Termination protection enabled on production stacks
- [ ] cdk-nag integrated for security compliance
- [ ] Snapshot tests and assertion tests written
- [ ] CI/CD pipeline configured for automated deployments
- [ ] `cdk diff` reviewed before every production deployment

## Troubleshooting

| Issue | Solution |
|-------|---------|
| `CDK bootstrap required` | Run `npx cdk bootstrap aws://<ACCOUNT>/<REGION>` |
| `Cannot find module` | Run `npm ci` and verify `tsconfig.json` paths |
| Cross-stack reference errors | Pass values via construct props instead of `Fn.importValue` |
| Stack update failed — rollback | Wait for rollback, fix the issue, redeploy |
| `cdk synth` very slow | Exclude `node_modules` in `cdk.json` watch config |
| Resource limit exceeded | Split large stacks into smaller, focused stacks |
