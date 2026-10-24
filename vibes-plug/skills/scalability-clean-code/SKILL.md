---
name: scalability-clean-code
description: "Software architecture guidelines to maintain code readability (Clean Code, SOLID, DRY) and application scalability / Panduan arsitektur perangkat lunak untuk menjaga keterbacaan kode (Clean Code, SOLID, DRY) dan kemampuan skalabilitas aplikasi."
author: "Roedy Rustam"
version: "4.3.0"
---

# Scalability & Clean Code (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills like `brainstorming`, `zero-to-prod-orchestrator`, and `session-memory-manager` to ensure cohesive execution.

### Description
Software architecture guidelines for writing clean, scalable, and maintainable code. Covers SOLID principles, DRY/YAGNI/KISS, Clean Architecture layers, **Vertical Slice Architecture** (the modern alternative to layered architecture), Domain-Driven Design (DDD) patterns, and practical refactoring techniques.

### Trigger Conditions
- Refactoring a codebase that has become hard to understand or modify.
- Designing the architecture for a new feature or service.
- Identifying and eliminating code smells (God Classes, Feature Envy, Long Methods).
- Deciding between Layered Architecture vs Vertical Slice Architecture.
- Applying SOLID principles to a specific code problem.

### The SOLID Principles (With Modern Context)

#### Single Responsibility Principle (SRP)
A module/class/function should have one reason to change. In 2026 React/Node.js context:
- **Bad**: A React component that fetches data, transforms it, and renders UI.
- **Good**: Separate `useUserQuery()` hook (fetch), `transformUser()` util (transform), `UserCard` component (render).

#### Open/Closed Principle (OCP)
Open for extension, closed for modification. Use composition and strategy pattern:
```typescript
// Bad: modify existing code every time a new payment provider is added
function processPayment(type: 'stripe' | 'polar' | 'paypal', amount: number) {
  if (type === 'stripe') { /* ... */ }
  else if (type === 'polar') { /* ... */ }
}

// Good: extend by adding new providers, not modifying existing code
interface PaymentProvider {
  charge(amount: number): Promise<Receipt>;
}

class StripeProvider implements PaymentProvider { ... }
class PolarProvider implements PaymentProvider { ... }

function processPayment(provider: PaymentProvider, amount: number) {
  return provider.charge(amount);
}
```

#### Dependency Inversion Principle (DIP)
High-level modules should not depend on low-level modules — both should depend on abstractions:
```typescript
// Bad: handler directly imports concrete DB client
import { db } from './postgres-client';

// Good: inject the repository interface
interface UserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

async function getUser(repo: UserRepository, id: string) {
  return repo.findById(id);
}
```

### Vertical Slice Architecture (VSA)
The modern alternative to traditional layered architecture (Controller → Service → Repository). Organize code by **feature** (vertical slice) rather than by **technical layer** (horizontal slice):

```
Traditional (Layered):
src/
  controllers/    ← all controllers together
  services/       ← all services together
  repositories/   ← all repositories together

Vertical Slice:
src/
  features/
    users/
      create-user.handler.ts    ← all logic for "create user" in one place
      create-user.schema.ts
      create-user.test.ts
    products/
      list-products.handler.ts
      list-products.schema.ts
```

**Benefits of VSA**:
- Features are self-contained — easy to add, modify, delete, or move.
- No need to navigate 3-4 layers just to trace one user story.
- Natural boundary for microservice extraction.

```typescript
// features/users/create-user.handler.ts
// One file contains the complete "create user" vertical slice
import { z } from 'zod';
import { db } from '@/lib/db';
import { sendWelcomeEmail } from '@/lib/email';

export const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export async function handleCreateUser(input: CreateUserInput) {
  const validated = CreateUserSchema.parse(input);
  
  const user = await db.user.create({ data: validated });
  await sendWelcomeEmail(user.email, user.name);
  
  return user;
}
```

### Clean Code Principles

#### Functions
- **Do one thing**: Functions should do one thing and do it well.
- **Small**: Aim for < 20 lines. If longer, extract sub-functions.
- **Descriptive names**: `getUsersByWorkspace()` not `getData()`.
- **No side effects**: Pure functions are predictable and testable.

#### Naming
- Variables: noun phrases (`userCount`, `activeWorkspaces`).
- Functions: verb phrases (`fetchUser`, `validateInput`, `sendEmail`).
- Boolean: question form (`isActive`, `hasPermission`, `canEdit`).
- Avoid abbreviations: `workspace` not `ws`, `configuration` not `cfg`.

#### Comments
- **Don't comment bad code — rewrite it.**
- Write self-documenting code: well-named variables and functions eliminate the need for most comments.
- **Do** comment: why (intent), not what (obvious from code).

#### DRY, YAGNI, KISS
- **DRY**: Don't Repeat Yourself — extract shared logic. But: avoid premature abstraction.
- **YAGNI**: You Aren't Gonna Need It — don't build features "just in case".
- **KISS**: Keep It Simple, Stupid — the simplest solution that works is usually best.

#### Anti-Slop & Hyper-YAGNI Directive
- **Zero Placeholder/Stub Code**: Never deliver incomplete functions with `// TODO` or `// ...`. All code must be 100% complete and operational.
- **Zero Speculative Abstractions**: Do not build abstract factory patterns, endless DTO mappings, or premature generic interfaces for single-use implementations.
- **Zero Syntax Narration**: Reject comments that narrate obvious syntax (`// return user`, `// increment count`). Comments must explain non-obvious business invariants or vendor bugs only.
- **Zero Zombie Code**: Permanently purge commented-out code blocks; git history preserves deleted lines.
- **Automated Verification**: Enforce `anti-slop` compliance via `node scripts/check-anti-slop.js --strict`.

### Code Smells & Refactoring

| Smell | Symptom | Refactoring |
|---|---|---|
| **God Class** | Class does everything | Extract Class, Move Method |
| **Long Method** | Method > 30 lines | Extract Method |
| **Feature Envy** | Method uses another class's data excessively | Move Method |
| **Data Clumps** | Same 3+ params appear together repeatedly | Introduce Parameter Object |
| **Magic Numbers** | `if (status === 3)` | Extract Constant |
| **Shotgun Surgery** | One change requires edits in many places | Move Method, Inline Class |
| **Primitive Obsession** | Using string/int for domain concepts | Replace with Value Object |

### Architecture Decision Framework
When choosing an architecture, ask:
1. **What changes together?** Organize code that changes together.
2. **What is independently deployable?** Separate services by deployment boundary.
3. **What has different scaling needs?** Scale independently only what needs it.
4. **What is the team size?** Microservices add overhead — start monolith, extract when needed.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `brainstorming`, `zero-to-prod-orchestrator`, dan `session-memory-manager` untuk memastikan eksekusi yang kohesif.

### Deskripsi
Panduan arsitektur perangkat lunak untuk menulis kode yang bersih, skalabel, dan mudah dirawat. Mencakup prinsip SOLID, DRY/YAGNI/KISS, lapisan Clean Architecture, **Vertical Slice Architecture** (alternatif modern dari layered architecture), pola Domain-Driven Design (DDD), dan teknik refactoring praktis.

### Kondisi Pemicu
- Merefaktor codebase yang sulit dipahami atau dimodifikasi.
- Merancang arsitektur untuk fitur atau layanan baru.
- Mengidentifikasi dan menghilangkan code smell (God Class, Feature Envy, Long Method).
- Memutuskan antara Layered Architecture vs Vertical Slice Architecture.
- Menerapkan prinsip SOLID pada masalah kode tertentu.

### Prinsip SOLID

#### SRP — Single Responsibility Principle
Setiap modul/kelas/fungsi harus memiliki satu alasan untuk berubah. Pisahkan pengambilan data, transformasi data, dan rendering UI.

#### OCP — Open/Closed Principle
Terbuka untuk ekstensi, tertutup untuk modifikasi. Gunakan komposisi dan pola strategi — tambah provider baru tanpa mengubah kode yang ada.

#### DIP — Dependency Inversion Principle
Modul tingkat tinggi tidak boleh bergantung pada modul tingkat rendah — keduanya harus bergantung pada abstraksi (interface).

### Vertical Slice Architecture (VSA)
Alternatif modern dari layered architecture tradisional. Organisasikan kode berdasarkan **fitur** (irisan vertikal), bukan lapisan teknis (irisan horizontal).

**Keuntungan VSA:**
- Fitur bersifat self-contained — mudah ditambah, dimodifikasi, dihapus, atau dipindah.
- Tidak perlu menavigasi 3-4 layer hanya untuk melacak satu user story.
- Batas natural untuk ekstraksi microservice.

### Prinsip Clean Code

#### Fungsi
- Lakukan satu hal dan lakukan dengan baik.
- Nama deskriptif: `getUsersByWorkspace()` bukan `getData()`.
- Tanpa efek samping: fungsi murni dapat diprediksi dan diuji.

#### Penamaan
- Variabel: frasa kata benda (`jumlahPengguna`, `workspaceAktif`).
- Fungsi: frasa kata kerja (`ambilPengguna`, `validasiInput`).
- Boolean: bentuk pertanyaan (`aktif`, `punyaIzin`, `bisaEdit`).

#### Komentar
- Jangan komen kode buruk — tulis ulang.
- Tulis kode yang mendokumentasikan dirinya sendiri.
- Komentar: **mengapa** (niat), bukan apa (jelas dari kode).

#### DRY, YAGNI, KISS
- **DRY**: Jangan ulangi diri sendiri — ekstrak logika bersama.
- **YAGNI**: Anda tidak akan membutuhkannya — jangan bangun fitur "untuk jaga-jaga".
- **KISS**: Tetap sederhana — solusi paling sederhana yang berfungsi biasanya terbaik.

#### Direktif Anti-Slop & Hyper-YAGNI
- **Nol Kode Placeholder/Stub**: Dilarang menyajikan kode yang belum selesai dengan `// TODO` atau `// ...`. Seluruh kode harus 100% lengkap dan fungsional.
- **Nol Abstraksi Spekulatif**: Hindari pola abstract factory, mapping DTO berlapis, atau interface generik prematur untuk implementasi sekali pakai.
- **Nol Komentar Sintaksis**: Tolak komentar yang sekadar menarasikan sintaks kode (`// return user`, `// increment count`). Komentar hanya untuk menjelaskan alasan arsitektural atau aturan bisnis non-obvious.
- **Nol Bangkai Kode (Zombie Code)**: Hapus permanen blok kode yang dikomentari; riwayat git menjaga baris yang dihapus.
- **Verifikasi Otomatis**: Tegakkan kepatuhan `anti-slop` via `node scripts/check-anti-slop.js --strict`.

### Code Smell & Refactoring
Identifikasi dan perbaiki: God Class, Long Method, Feature Envy, Data Clumps, Magic Numbers, Shotgun Surgery, Primitive Obsession.

### Framework Keputusan Arsitektur
1. **Apa yang berubah bersama?** Organisasikan kode yang berubah bersama.
2. **Apa yang dapat di-deploy secara independen?** Pisahkan layanan berdasarkan batas deployment.
3. **Apa yang memiliki kebutuhan scaling berbeda?** Scale secara independen hanya yang membutuhkannya.
4. **Berapa besar tim?** Microservices menambah overhead — mulai monolith, ekstrak saat diperlukan.