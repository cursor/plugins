# Skill: Set Up a DynamoDB Table

## Description

This skill covers designing and provisioning a DynamoDB table with proper key schema, secondary indexes, access patterns, and single-table design considerations.

## Prerequisites

- AWS CLI configured with valid credentials
- AWS CDK CLI (`npm install -g aws-cdk`) or AWS Console access
- Understanding of your application's access patterns

## Steps

### 1. Define Access Patterns

Before creating a table, list every access pattern your application needs. DynamoDB schema design is driven entirely by access patterns, not entity relationships.

**Example access patterns for an e-commerce app:**

| Access Pattern | Key Condition |
|---|---|
| Get user by ID | PK = `USER#<userId>` |
| Get order by ID | PK = `ORDER#<orderId>` |
| List orders for a user | PK = `USER#<userId>`, SK begins_with `ORDER#` |
| List orders by date | GSI1PK = `USER#<userId>`, GSI1SK = `ORDER#<date>` |
| Get product by ID | PK = `PRODUCT#<productId>` |

### 2. Design the Key Schema

#### Partition Key (PK)

- Choose a high-cardinality attribute to distribute load evenly.
- Avoid hot partitions — never use low-cardinality values (e.g., status, date alone).
- Use composite keys with entity prefixes for single-table design: `USER#123`, `ORDER#456`.

#### Sort Key (SK)

- Use the sort key to support range queries, hierarchical data, and multiple entity types per partition.
- Compose sort keys for flexible queries: `ORDER#2025-01-15#abc123`.

### 3. Define the Table with CDK

```typescript
import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export class DataStack extends cdk.Stack {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.table = new dynamodb.Table(this, "MainTable", {
      tableName: "my-service-table",
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // On-demand
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Protect production data
      pointInTimeRecovery: true, // Enable PITR backups
      encryption: dynamodb.TableEncryption.AWS_MANAGED, // Encryption at rest
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES, // Enable streams
    });
  }
}
```

### 4. Add Global Secondary Indexes (GSIs)

GSIs allow you to query data by alternate key patterns. Design GSIs to cover access patterns not served by the base table keys.

```typescript
// GSI for querying by an alternate access pattern
this.table.addGlobalSecondaryIndex({
  indexName: "GSI1",
  partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
  sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
  projectionType: dynamodb.ProjectionType.ALL,
});

// GSI for a specific lookup pattern with limited projection
this.table.addGlobalSecondaryIndex({
  indexName: "GSI2",
  partitionKey: { name: "GSI2PK", type: dynamodb.AttributeType.STRING },
  sortKey: { name: "GSI2SK", type: dynamodb.AttributeType.STRING },
  projectionType: dynamodb.ProjectionType.INCLUDE,
  nonKeyAttributes: ["name", "email", "status"],
});
```

### 5. Single-Table Design

Single-table design stores multiple entity types in one table, using composite keys and overloaded indexes to support all access patterns.

#### Entity Mapping

```
┌──────────────┬─────────────────────┬──────────────────────────────┐
│ Entity       │ PK                  │ SK                           │
├──────────────┼─────────────────────┼──────────────────────────────┤
│ User         │ USER#<userId>       │ PROFILE                      │
│ User Email   │ USER#<userId>       │ EMAIL#<email>                │
│ Order        │ USER#<userId>       │ ORDER#<orderId>              │
│ Order Item   │ ORDER#<orderId>     │ ITEM#<itemId>                │
│ Product      │ PRODUCT#<productId> │ DETAILS                      │
└──────────────┴─────────────────────┴──────────────────────────────┘
```

#### TypeScript Data Access Layer

```typescript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME!;

// Get a user profile
export async function getUser(userId: string) {
  const result = await client.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: "PROFILE" },
    })
  );
  return result.Item;
}

// List all orders for a user
export async function listUserOrders(userId: string) {
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":sk": "ORDER#",
      },
    })
  );
  return result.Items ?? [];
}

// Create an order (transactional write)
export async function createOrder(userId: string, order: Order) {
  await client.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `USER#${userId}`,
        SK: `ORDER#${order.id}`,
        GSI1PK: `USER#${userId}`,
        GSI1SK: `ORDER#${order.createdAt}`,
        ...order,
        entityType: "Order",
        createdAt: new Date().toISOString(),
      },
      ConditionExpression: "attribute_not_exists(PK)", // Prevent overwrites
    })
  );
}
```

### 6. Configure TTL (Time to Live)

Use TTL to automatically expire items (sessions, logs, temporary data):

```typescript
this.table = new dynamodb.Table(this, "MainTable", {
  // ... key schema
  timeToLiveAttribute: "expiresAt", // Unix epoch timestamp
});
```

Set TTL in your application code:

```typescript
await client.send(
  new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: `SESSION#${sessionId}`,
      SK: "DATA",
      expiresAt: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    },
  })
);
```

### 7. Grant Permissions

Use CDK grant helpers for least-privilege access:

```typescript
// Read-only access
table.grantReadData(lambdaFunction);

// Read-write access
table.grantReadWriteData(lambdaFunction);

// Fine-grained access to specific indexes
table.grant(lambdaFunction, "dynamodb:Query");
```

### 8. Deploy and Verify

```bash
# Deploy with CDK
npx cdk deploy

# Verify table creation
aws dynamodb describe-table --table-name my-service-table

# Insert a test item
aws dynamodb put-item \
  --table-name my-service-table \
  --item '{"PK": {"S": "USER#001"}, "SK": {"S": "PROFILE"}, "name": {"S": "Alice"}}'

# Query items
aws dynamodb query \
  --table-name my-service-table \
  --key-condition-expression "PK = :pk" \
  --expression-attribute-values '{":pk": {"S": "USER#001"}}'
```

## Best Practices

- **Design for access patterns first** — never start with an entity-relationship model.
- **Avoid scans** — always use `Query` with key conditions or GSIs.
- **Use sparse indexes** — only items with the GSI key attributes appear in the index.
- **Monitor consumed capacity** — use CloudWatch metrics and set alarms on throttling.
- **Use batch operations** — `BatchWriteItem` and `BatchGetItem` for bulk operations.
- **Enable Point-in-Time Recovery** — always enable PITR for production tables.
- **Use DynamoDB Streams** — for event-driven architectures, replication, and audit logs.

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Hot partition / throttling | Redesign partition key for higher cardinality |
| Query returns too many items | Add sort key conditions or filter expressions |
| GSI lag | GSIs are eventually consistent; design accordingly |
| Item size limit (400 KB) | Store large payloads in S3, reference by key |
| High costs on scans | Replace scans with queries using proper indexes |
