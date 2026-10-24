---
name: domain-driven-design-expert
description: "Expert guide for Domain-Driven Design (DDD). Covers tactical patterns (Aggregates, Value Objects), strategic patterns (Bounded Contexts), event storming, and CQRS / Panduan ahli Desain Berbasis Domain (DDD)."
author: "Roedy Rustam"
version: "4.3.0"
---

# Domain-Driven Design (DDD) Expert (Strategic & Tactical 2026)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
Comprehensive architectural guide for tackling core business complexity using Domain-Driven Design (DDD). Covers Strategic Design (Bounded Contexts, Context Mapping, Ubiquitous Language, Subdomains) and Tactical Design (immutable Value Objects, Aggregate Roots, Domain Events, Repositories, Specification pattern, and CQRS separation). Emphasizes keeping core domain logic pure and independent of database schemas, ORMs, and web delivery frameworks.

### Trigger Conditions
- Decomposing monolithic applications (*"Big Ball of Mud"*) into clean, decoupled Bounded Contexts.
- Designing rule-heavy, high-invariant business logic (FinTech billing, multi-tier pricing, insurance, logistics).
- Structuring Clean / Hexagonal / Onion architectures in TypeScript, Go, Python, or Rust.
- Defining event payloads and boundaries for Event-Driven Microservices.

### Tactical Pattern: Immutable Value Object & Aggregate Root (TypeScript)

```typescript
// src/domain/shared/value-objects/Money.ts
export class Money {
  readonly amountCents: number;
  readonly currency: 'USD' | 'IDR' | 'EUR';

  private constructor(amountCents: number, currency: 'USD' | 'IDR' | 'EUR') {
    if (amountCents < 0) throw new Error('Money amount cannot be negative.');
    this.amountCents = Math.round(amountCents);
    this.currency = currency;
  }

  static create(amountCents: number, currency: 'USD' | 'IDR' | 'EUR' = 'USD'): Money {
    return new Money(amountCents, currency);
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) throw new Error('Currency mismatch.');
    return new Money(this.amountCents + other.amountCents, this.currency);
  }

  equals(other: Money): boolean {
    return this.amountCents === other.amountCents && this.currency === other.currency;
  }
}

// src/domain/order/OrderAggregate.ts
export interface DomainEvent {
  eventName: string;
  occurredOn: Date;
  aggregateId: string;
}

export class OrderPaidEvent implements DomainEvent {
  eventName = 'OrderPaidEvent';
  occurredOn = new Date();
  constructor(public aggregateId: string, public totalAmount: Money) {}
}

export class OrderAggregate {
  private _domainEvents: DomainEvent[] = [];

  constructor(
    public readonly id: string,
    public readonly customerId: string,
    private _total: Money,
    private _status: 'DRAFT' | 'PAID' | 'CANCELLED' = 'DRAFT'
  ) {}

  get status() { return this._status; }
  get total() { return this._total; }

  // Enforces domain invariant: an order cannot be marked PAID if status is not DRAFT
  markAsPaid(): void {
    if (this._status !== 'DRAFT') {
      throw new Error(`Invalid transition: Cannot pay an order in ${this._status} status.`);
    }
    this._status = 'PAID';
    this._domainEvents.push(new OrderPaidEvent(this.id, this._total));
  }

  pullDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }
}
```

### The 4 Non-Negotiable DDD Invariants
1. **Model Purity**: Domain Entities and Value Objects MUST NOT import database libraries (Prisma, Drizzle, TypeORM) or HTTP frameworks (Express, Next.js). They are pure TypeScript/POJOs.
2. **Access Strictly Through Aggregate Roots**: Never allow external controllers or services to mutate child entities directly. All mutations must pass through methods on the Aggregate Root to guarantee data consistency.
3. **Repository Per Aggregate Root**: Never create repositories for child entities or junction tables. Only Aggregate Roots possess repositories (`OrderRepository`, not `OrderItemRepository`).
4. **Ubiquitous Language**: Code identifiers must strictly mirror real business terminology. Reject vague names like `handleData()` in favor of explicit domain verbs like `authorizePayment()`.

## Orchestration & Integration
- **`scalability-clean-code`**: Aligns DDD tactical models with SOLID, DRY, and Clean Architecture principles.
- **`event-driven-architect`**: Dispatches domain events collected from Aggregate Roots to Kafka / BullMQ.
- **`database-orm-expert`**: Maps pure domain aggregates to persistence schemas via Data Mappers.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi bersama `scalability-clean-code`, `event-driven-architect`, `database-orm-expert`, dan `saas-architect`.

### Deskripsi
Panduan arsitektur komprehensif untuk menangani kompleksitas bisnis inti menggunakan *Domain-Driven Design* (DDD). Mencakup Desain Strategis (*Bounded Contexts*, *Context Mapping*, *Ubiquitous Language*, Pemisahan Subdomain) dan Desain Taktis (*Value Objects* imutabel, *Aggregate Roots*, *Domain Events*, *Repositories*, dan pola CQRS). Menekankan pentingnya menjaga logika bisnis tetap murni dan terisolasi dari database, ORM, maupun framework pengiriman web.

### Kondisi Pemicu
- Merefaktor monolit yang kusut (*Big Ball of Mud*) menjadi *Bounded Contexts* yang mandiri dan terpisah.
- Merancang logika bisnis yang sarat dengan aturan dan invarian ketat (FinTech, sistem penagihan, logistik).
- Menerapkan arsitektur Bersih (*Clean Architecture* / *Hexagonal Architecture*).
- Menentukan payload event yang bersih untuk arsitektur *Event-Driven Microservices*.

### Pola Repository Khusus Aggregate Root

```typescript
// src/domain/order/IOrderRepository.ts
import { OrderAggregate } from './OrderAggregate';

export interface IOrderRepository {
  findById(id: string): Promise<OrderAggregate | null>;
  save(order: OrderAggregate): Promise<void>; // Menyimpan agregat & mempublikasikan Domain Event
}
```

### 4 Aturan Emas Domain-Driven Design
1. **Kemurnian Model Bisnis**: Entitas Domain dilarang mengimpor pustaka database atau framework HTTP. Logika domain harus dapat diuji 100% tanpa koneksi database.
2. **Akses Hanya Melalui Aggregate Root**: Objek luar dilarang memodifikasi entitas anak secara langsung. Seluruh perubahan wajib melalui metode pada Aggregate Root.
3. **Satu Repository untuk Satu Root**: Hanya buat Repository untuk Aggregate Root (`OrderRepository`), bukan untuk tabel pembantu (`OrderItemRepository`).
4. **Bahasa Seragam (Ubiquitous Language)**: Kode wajib mencerminkan bahasa asli bisnis (contoh: gunakan `terbitkanFaktur()` daripada `updateStatusTable()`).

## Integrasi Orkestrasi
- **`scalability-clean-code`**: Menjaga keterbacaan kode dan pemisahan lapisan logika (Separation of Concerns).
- **`event-driven-architect`**: Mengirimkan Domain Events ke broker pesan tanpa merusak transaksi atomik.
- **`database-orm-expert`**: Mengonversi model domain murni ke tabel database melalui Data Mapper.
- **`saas-architect`**: Menyelaraskan batas modul bisnis dengan paket harga dan hak akses pengguna.