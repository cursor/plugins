# API Design Guide

## Overview
This reference documents production-grade API design patterns covering REST, GraphQL, gRPC, and WebSocket APIs with concrete implementation examples.

---

## 1. RESTful API Design (OpenAPI 3.1)

### Spec-First Design

Always define the API contract before implementing. Use OpenAPI 3.1 for REST APIs.

```yaml
# openapi.yaml
openapi: 3.1.0
info:
  title: Product Catalog API
  version: 2.0.0
  description: Product management and catalog service

servers:
  - url: https://api.example.com/v2
    description: Production
  - url: https://staging-api.example.com/v2
    description: Staging

paths:
  /products:
    get:
      operationId: listProducts
      summary: List products with filtering and pagination
      tags: [Products]
      parameters:
        - name: cursor
          in: query
          schema:
            type: string
          description: Cursor for pagination (base64 encoded)
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
        - name: category
          in: query
          schema:
            type: string
        - name: fields
          in: query
          schema:
            type: string
          description: Comma-separated list of fields to include
      responses:
        '200':
          description: Paginated list of products
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProductListResponse'
        '429':
          description: Rate limit exceeded
          headers:
            Retry-After:
              schema:
                type: integer
              description: Seconds to wait before retrying

    post:
      operationId: createProduct
      summary: Create a new product
      tags: [Products]
      parameters:
        - name: Idempotency-Key
          in: header
          required: true
          schema:
            type: string
            format: uuid
          description: Unique key to ensure idempotent creation
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateProductRequest'
      responses:
        '201':
          description: Product created successfully
        '409':
          description: Product already exists (idempotent replay)

components:
  schemas:
    ProductListResponse:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/Product'
        pagination:
          $ref: '#/components/schemas/CursorPagination'

    CursorPagination:
      type: object
      properties:
        next_cursor:
          type: string
          nullable: true
        has_more:
          type: boolean
        total_count:
          type: integer
```

### Cursor-Based Pagination (TypeScript)

```typescript
// lib/pagination.ts
interface CursorPaginationParams {
  cursor?: string;
  limit: number;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    next_cursor: string | null;
    has_more: boolean;
  };
}

export async function paginateWithCursor<T extends { id: string; createdAt: Date }>(
  query: (params: { cursor?: { id: string; createdAt: Date }; limit: number }) => Promise<T[]>,
  params: CursorPaginationParams
): Promise<PaginatedResult<T>> {
  const { cursor, limit } = params;
  const decodedCursor = cursor
    ? JSON.parse(Buffer.from(cursor, 'base64url').toString())
    : undefined;

  // Fetch one extra to determine if there are more results
  const items = await query({ cursor: decodedCursor, limit: limit + 1 });
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;

  const lastItem = data[data.length - 1];
  const nextCursor = hasMore && lastItem
    ? Buffer.from(JSON.stringify({ id: lastItem.id, createdAt: lastItem.createdAt }))
        .toString('base64url')
    : null;

  return { data, pagination: { next_cursor: nextCursor, has_more: hasMore } };
}
```

### Idempotency Key Middleware

```typescript
// middleware/idempotency.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function withIdempotency<T>(
  key: string,
  handler: () => Promise<T>,
  ttlSeconds: number = 86400
): Promise<{ result: T; isReplay: boolean }> {
  // Check if this key was already processed
  const cached = await redis.get<string>(`idempotency:${key}`);
  if (cached) {
    return { result: JSON.parse(cached) as T, isReplay: true };
  }

  // Execute the handler
  const result = await handler();

  // Store the result for replay
  await redis.set(`idempotency:${key}`, JSON.stringify(result), { ex: ttlSeconds });

  return { result, isReplay: false };
}
```

---

## 2. GraphQL API Design

### Schema-First with Code Generation

```graphql
# schema.graphql
type Query {
  product(id: ID!): Product
  products(
    filter: ProductFilter
    pagination: PaginationInput
    sort: ProductSort
  ): ProductConnection!
}

type Mutation {
  createProduct(input: CreateProductInput!): CreateProductPayload!
  updateProduct(id: ID!, input: UpdateProductInput!): UpdateProductPayload!
  deleteProduct(id: ID!): DeleteProductPayload!
}

type Product {
  id: ID!
  name: String!
  description: String
  price: Float!
  category: Category!
  variants: [ProductVariant!]!
  reviews(first: Int, after: String): ReviewConnection!
  createdAt: DateTime!
  updatedAt: DateTime!
}

# Relay-style connection for cursor pagination
type ProductConnection {
  edges: [ProductEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type ProductEdge {
  cursor: String!
  node: Product!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

input ProductFilter {
  categoryId: ID
  minPrice: Float
  maxPrice: Float
  search: String
}

input PaginationInput {
  first: Int
  after: String
  last: Int
  before: String
}
```

### DataLoader for N+1 Prevention

```typescript
// loaders/product-loader.ts
import DataLoader from 'dataloader';
import { db } from '@/lib/db';
import { products } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';

export function createProductLoader() {
  return new DataLoader<string, typeof products.$inferSelect | null>(
    async (ids) => {
      const results = await db
        .select()
        .from(products)
        .where(inArray(products.id, [...ids]));

      // Map results back to input order (DataLoader requirement)
      const resultMap = new Map(results.map((r) => [r.id, r]));
      return ids.map((id) => resultMap.get(id) ?? null);
    },
    { cache: true, maxBatchSize: 100 }
  );
}
```

---

## 3. gRPC API Design

### Protocol Buffer Definition

```protobuf
// proto/product/v1/product.proto
syntax = "proto3";

package product.v1;

option go_package = "github.com/example/api/gen/product/v1";

import "google/protobuf/timestamp.proto";
import "google/protobuf/field_mask.proto";

service ProductService {
  // Unary RPCs
  rpc GetProduct(GetProductRequest) returns (GetProductResponse);
  rpc CreateProduct(CreateProductRequest) returns (CreateProductResponse);
  rpc UpdateProduct(UpdateProductRequest) returns (UpdateProductResponse);
  rpc DeleteProduct(DeleteProductRequest) returns (DeleteProductResponse);

  // Server streaming for real-time updates
  rpc WatchProductChanges(WatchProductChangesRequest) returns (stream ProductChange);

  // Bulk operations
  rpc BatchGetProducts(BatchGetProductsRequest) returns (BatchGetProductsResponse);
}

message Product {
  string id = 1;
  string name = 2;
  string description = 3;
  int64 price_cents = 4; // Use integer cents to avoid floating point issues
  string category_id = 5;
  ProductStatus status = 6;
  google.protobuf.Timestamp created_at = 7;
  google.protobuf.Timestamp updated_at = 8;
}

enum ProductStatus {
  PRODUCT_STATUS_UNSPECIFIED = 0;
  PRODUCT_STATUS_DRAFT = 1;
  PRODUCT_STATUS_ACTIVE = 2;
  PRODUCT_STATUS_ARCHIVED = 3;
}

message UpdateProductRequest {
  string id = 1;
  Product product = 2;
  google.protobuf.FieldMask update_mask = 3; // Partial updates
}

message GetProductRequest {
  string id = 1;
}

message GetProductResponse {
  Product product = 1;
}
```

---

## 4. WebSocket & Real-Time APIs

### Type-Safe WebSocket with Zod Validation

```typescript
// lib/ws/types.ts
import { z } from 'zod';

// Define all possible client → server messages
export const ClientMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('subscribe'),
    channel: z.string(),
  }),
  z.object({
    type: z.literal('unsubscribe'),
    channel: z.string(),
  }),
  z.object({
    type: z.literal('message'),
    channel: z.string(),
    payload: z.unknown(),
  }),
  z.object({
    type: z.literal('ping'),
  }),
]);

// Define all possible server → client messages
export type ServerMessage =
  | { type: 'subscribed'; channel: string }
  | { type: 'unsubscribed'; channel: string }
  | { type: 'message'; channel: string; payload: unknown; sender: string }
  | { type: 'pong' }
  | { type: 'error'; code: string; message: string };
```

---

## 5. Error Handling Standards

### Structured Error Response (RFC 7807 - Problem Details)

```typescript
// lib/errors.ts
interface ProblemDetails {
  type: string;      // URI identifying the error type
  title: string;     // Human-readable summary
  status: number;    // HTTP status code
  detail?: string;   // Human-readable explanation specific to this occurrence
  instance?: string; // URI identifying the specific occurrence
  errors?: FieldError[]; // Validation errors
}

interface FieldError {
  field: string;
  message: string;
  code: string;
}

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly type: string,
    public readonly title: string,
    public readonly detail?: string,
    public readonly fieldErrors?: FieldError[],
  ) {
    super(title);
  }

  toProblemDetails(): ProblemDetails {
    return {
      type: `https://api.example.com/errors/${this.type}`,
      title: this.title,
      status: this.status,
      detail: this.detail,
      errors: this.fieldErrors,
    };
  }
}

// Usage
throw new AppError(
  422,
  'validation-failed',
  'Validation Failed',
  'One or more fields failed validation',
  [
    { field: 'email', message: 'Invalid email format', code: 'INVALID_FORMAT' },
    { field: 'price', message: 'Price must be positive', code: 'INVALID_RANGE' },
  ]
);
```

---

## Best Practices Summary

| Practice | Description |
|----------|-------------|
| Spec-first design | Define API contract before implementation |
| Cursor pagination | Use cursor-based pagination for large datasets |
| Idempotency keys | Make all mutations idempotent with unique keys |
| Rate limiting | Protect APIs with token bucket / sliding window |
| Versioning | URL path versioning (`/v1/`) for breaking changes |
| Error format | Use RFC 7807 Problem Details for structured errors |
| Field masking | Allow clients to select specific fields |
| HATEOAS | Include actionable links in responses |

---

## Conclusion
Good API design is the foundation of a scalable system. Invest in spec-first design, strong typing, and consistent error handling to create APIs that are easy to consume, evolve, and maintain.
