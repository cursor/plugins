# System Design Patterns

## Overview
This reference documents production-grade system design patterns for fullstack expert architects. Covers distributed systems, event-driven architectures, and scalable microservice topologies.

---

## 1. Microservices Communication Patterns

### Synchronous: API Gateway + Service Mesh

Use an API Gateway (Kong, AWS API Gateway, Envoy) as the single entry point. Behind it, services communicate via gRPC for internal calls (binary protocol, code-gen, strict contracts).

```
┌──────────────┐
│   Client      │
└──────┬───────┘
       │ HTTPS
┌──────▼───────┐
│  API Gateway  │  (Rate limiting, Auth, Routing)
└──────┬───────┘
       │ gRPC / HTTP
  ┌────┼────┐
  ▼    ▼    ▼
┌───┐┌───┐┌───┐
│Svc││Svc││Svc│
│ A ││ B ││ C │
└─┬─┘└─┬─┘└─┬─┘
  │    │    │
  ▼    ▼    ▼
┌───────────────┐
│  Database(s)  │
└───────────────┘
```

### Asynchronous: Event-Driven Architecture (EDA)

For decoupled, resilient communication:

```typescript
// Producer: Order Service (TypeScript + BullMQ)
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL!);
const orderEventsQueue = new Queue('OrderEvents', { connection });

export async function publishOrderCreated(order: Order) {
  await orderEventsQueue.add('order.created', {
    orderId: order.id,
    userId: order.userId,
    total: order.total,
    items: order.items,
    timestamp: new Date().toISOString(),
  }, {
    attempts: 5,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: { age: 86400 }, // Keep completed jobs for 24h
  });
}
```

```typescript
// Consumer: Notification Service (TypeScript + BullMQ Worker)
import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL!);

const notificationWorker = new Worker(
  'OrderEvents',
  async (job: Job) => {
    switch (job.name) {
      case 'order.created':
        await sendOrderConfirmationEmail(job.data);
        await sendPushNotification(job.data.userId, 'Order confirmed!');
        break;
      case 'order.shipped':
        await sendShippingNotification(job.data);
        break;
    }
  },
  { connection, concurrency: 5 }
);
```

---

## 2. Saga Pattern for Distributed Transactions

When a business operation spans multiple services, use the Saga pattern (choreography or orchestration) instead of distributed 2PC.

### Orchestrator-Based Saga

```typescript
// Saga Orchestrator (TypeScript)
interface SagaStep<T> {
  name: string;
  execute: (context: T) => Promise<void>;
  compensate: (context: T) => Promise<void>;
}

class SagaOrchestrator<T> {
  private steps: SagaStep<T>[] = [];
  private completedSteps: SagaStep<T>[] = [];

  addStep(step: SagaStep<T>): this {
    this.steps.push(step);
    return this;
  }

  async execute(context: T): Promise<void> {
    for (const step of this.steps) {
      try {
        console.log(`▶ Executing: ${step.name}`);
        await step.execute(context);
        this.completedSteps.push(step);
      } catch (error) {
        console.error(`✗ Failed at: ${step.name}`, error);
        await this.rollback(context);
        throw new SagaFailedError(step.name, error);
      }
    }
  }

  private async rollback(context: T): Promise<void> {
    // Compensate in reverse order
    for (const step of [...this.completedSteps].reverse()) {
      try {
        console.log(`↩ Compensating: ${step.name}`);
        await step.compensate(context);
      } catch (error) {
        console.error(`⚠ Compensation failed: ${step.name}`, error);
        // Log to dead letter queue for manual intervention
      }
    }
  }
}

// Usage: Order Creation Saga
const orderSaga = new SagaOrchestrator<OrderContext>()
  .addStep({
    name: 'Reserve Inventory',
    execute: async (ctx) => await inventoryService.reserve(ctx.items),
    compensate: async (ctx) => await inventoryService.release(ctx.items),
  })
  .addStep({
    name: 'Process Payment',
    execute: async (ctx) => await paymentService.charge(ctx.paymentMethod, ctx.total),
    compensate: async (ctx) => await paymentService.refund(ctx.paymentId),
  })
  .addStep({
    name: 'Create Order Record',
    execute: async (ctx) => await orderService.create(ctx),
    compensate: async (ctx) => await orderService.cancel(ctx.orderId),
  });
```

---

## 3. CQRS (Command Query Responsibility Segregation)

Separate write models (commands) from read models (queries) when read/write patterns differ significantly.

```
┌─────────────┐    ┌─────────────┐
│  Write API   │    │  Read API    │
│  (Commands)  │    │  (Queries)   │
└──────┬──────┘    └──────┬──────┘
       │                  │
       ▼                  ▼
┌─────────────┐    ┌─────────────┐
│  Write DB    │──▶│  Read DB     │
│ (PostgreSQL) │    │   (Redis /   │
│ Normalized   │    │  Elasticsearch)
└─────────────┘    └─────────────┘
       │
       ▼  (Domain Events)
┌─────────────┐
│  Event Bus   │
│  (Kafka)     │
└─────────────┘
```

```typescript
// Write side: Command Handler
async function handleCreateProduct(cmd: CreateProductCommand): Promise<string> {
  // Validate business rules
  const product = Product.create(cmd);

  // Persist to write store
  await db.insert(products).values(product.toRow());

  // Publish domain event for read model projection
  await eventBus.publish('product.created', {
    id: product.id,
    name: product.name,
    price: product.price,
    category: product.category,
  });

  return product.id;
}

// Read side: Event Projector
eventBus.subscribe('product.created', async (event) => {
  // Project into denormalized read model optimized for queries
  await redis.hset(`product:${event.id}`, {
    ...event,
    searchText: `${event.name} ${event.category}`.toLowerCase(),
  });

  // Also index in Elasticsearch for full-text search
  await esClient.index({
    index: 'products',
    id: event.id,
    body: event,
  });
});
```

---

## 4. Circuit Breaker Pattern

Prevent cascading failures in distributed systems by wrapping external service calls with circuit breakers.

```typescript
// Circuit Breaker Implementation (TypeScript)
enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject calls
  HALF_OPEN = 'HALF_OPEN' // Testing recovery
}

class CircuitBreaker {
  private state = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;

  constructor(
    private readonly name: string,
    private readonly threshold: number = 5,
    private readonly resetTimeoutMs: number = 30000,
  ) {}

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new CircuitOpenError(`Circuit ${this.name} is OPEN`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = CircuitState.CLOSED;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.threshold) {
      this.state = CircuitState.OPEN;
      console.warn(`⚡ Circuit ${this.name} opened after ${this.failureCount} failures`);
    }
  }
}

// Usage
const paymentCircuit = new CircuitBreaker('payment-service', 5, 30000);

async function processPayment(order: Order) {
  return paymentCircuit.call(() =>
    fetch('https://payment-api.example.com/charge', {
      method: 'POST',
      body: JSON.stringify({ amount: order.total }),
    })
  );
}
```

---

## 5. Service Discovery & Load Balancing

### DNS-Based (Kubernetes)

```yaml
# Kubernetes Service (ClusterIP) for internal discovery
apiVersion: v1
kind: Service
metadata:
  name: user-service
  namespace: production
spec:
  selector:
    app: user-service
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
---
# HorizontalPodAutoscaler for dynamic scaling
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: user-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: user-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

---

## Anti-Patterns to Avoid

### 🚫 Distributed Monolith
Don't create microservices that are tightly coupled and must be deployed together. If services can't be deployed independently, they're a distributed monolith — worse than a proper monolith.

### 🚫 Shared Database Between Services
Each service should own its data store. Cross-service data access should happen via APIs or events, never direct database queries.

### 🚫 Synchronous Call Chains
Avoid long chains of synchronous HTTP calls (`A → B → C → D`). Each hop adds latency and a failure point. Use async messaging for non-critical paths.

---

## Conclusion
Choosing the right system design patterns depends on your scale, team size, and consistency requirements. Start with a modular monolith and extract services only when you have clear domain boundaries and operational maturity.
