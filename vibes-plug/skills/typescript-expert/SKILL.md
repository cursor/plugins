---
name: typescript-expert
description: "Expert guide for TypeScript 5.8+ advanced type system, strict mode, generics, utility types, branded types, inferred type predicates, isolated declarations, and type-safe architectural patterns / Panduan ahli untuk sistem tipe TypeScript 5.8+, mode strict, generics, utility types, branded types, inferred type predicates, isolated declarations, dan pola arsitektur type-safe."
author: "Roedy Rustam"
version: "4.3.0"
---

# TypeScript Expert (TypeScript 5.8+ Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills like `brainstorming`, `zero-to-prod-orchestrator`, and `session-memory-manager` to ensure cohesive execution.

### Description
Expert-level TypeScript development covering the advanced type system, strict mode enforcement, generic programming, utility types, branded types, and type-safe patterns for production applications. Targets **TypeScript 5.8+** features including inferred type predicates, isolated declarations, `NoInfer`, `using` declarations, variadic tuple improvements, and `const` type parameters.

### Trigger Conditions
- Writing TypeScript with advanced generic constraints.
- Enforcing strict type safety in existing codebases.
- Designing type-safe API contracts (REST, tRPC, Zod schemas).
- Implementing branded types for domain modeling.
- Resolving complex type errors or `any` pollution.
- Setting up `tsconfig.json` for strict projects.
- Writing TypeScript utility types or type helpers.

---

### TypeScript 5.x — Key Features

#### `using` Declarations (Explicit Resource Management, TS 5.2)
```typescript
// Automatically calls [Symbol.dispose] on scope exit
function processFile(path: string) {
  using handle = openFile(path); // disposed when function exits
  handle.write('data');
}

// Async version with [Symbol.asyncDispose]
async function processDatabase() {
  await using conn = await getConnection();
  await conn.query('SELECT 1');
} // conn.close() called automatically
```

#### `NoInfer<T>` Utility Type (TS 5.4)
```typescript
// Prevents unintended type widening in generic inference
function createState<T>(initial: T, fallback: NoInfer<T>): T {
  return initial ?? fallback;
}

// TS now errors if fallback type doesn't match initial
createState('hello', 42); // Error: Argument of type 'number' is not assignable to type 'string'
```

#### `const` Type Parameters (TS 5.0)
```typescript
// Infer literal types from generic arguments
function identity<const T>(value: T): T { return value; }

const a = identity(['a', 'b', 'c']); // type: readonly ["a", "b", "c"]
const b = identity({ x: 10 });        // type: { readonly x: 10 }
```

---

### TypeScript 5.5 - 5.8 — New Features

#### Inferred Type Predicates (TS 5.5)
```typescript
// TypeScript now infers type predicates from return statements automatically
const nums = [1, null, 2, undefined, 3].filter((x) => x !== null);
// nums is now inferred as number[] — no manual type assertion needed!

// Before TS 5.5 you needed:
const nums = [1, null, 2].filter((x): x is number => x !== null);

// Works with any refinement pattern:
function isString(x: unknown) {
  return typeof x === 'string'; // TS 5.5 infers: (x: unknown) => x is string
}
```

#### Isolated Declarations (TS 5.5)
```typescript
// New tsconfig option: "isolatedDeclarations": true
// Forces explicit return types on all exported functions — enables
// parallel .d.ts generation (massively speeds up monorepo builds)
export function add(a: number, b: number): number { // explicit return type required
  return a + b;
}
```

#### Iterator Helper Methods (TS 5.6 — ES2025)
```typescript
// Native iterator methods now fully typed
const result = [1, 2, 3, 4, 5]
  .values()          // IteratorObject
  .filter(x => x % 2 === 0)  // 2, 4
  .map(x => x * 10)  // 20, 40
  .toArray();        // [20, 40]
```

---

### Strict Mode Configuration

```json
// tsconfig.json — recommended strict config for Next.js / monorepo projects
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "Preserve",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "isolatedModules": true,
    "isolatedDeclarations": true,
    "verbatimModuleSyntax": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  }
}
```

> **Note**: Use `"moduleResolution": "Bundler"` with `"module": "Preserve"` for Vite, Next.js, and other bundler-based projects. Use `"NodeNext"` for Node.js/Bun/Deno runtimes.

---

### Advanced Type Patterns

#### Branded Types for Domain Modeling
```typescript
// Prevent mixing semantically different primitives
type Brand<T, B extends string> = T & { readonly __brand: B };

type UserId   = Brand<string, 'UserId'>;
type PostId   = Brand<string, 'PostId'>;
type Email    = Brand<string, 'Email'>;

// Constructor functions with validation
function createUserId(id: string): UserId {
  if (!id.startsWith('user_')) throw new Error('Invalid user ID format');
  return id as UserId;
}

function getUser(id: UserId): Promise<User> { /* ... */ }

const postId = 'post_abc' as PostId;
getUser(postId); // Compile error: PostId is not assignable to UserId
```

#### Discriminated Unions for State Machines
```typescript
type ApiState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function render<T>(state: ApiState<T>) {
  switch (state.status) {
    case 'idle':    return 'Idle';
    case 'loading': return 'Loading...';
    case 'success': return `Data: ${JSON.stringify(state.data)}`;
    case 'error':   return `Error: ${state.error.message}`;
    // TypeScript enforces exhaustive matching
  }
}
```

#### Template Literal Types
```typescript
type EventName = 'click' | 'focus' | 'blur';
type HandlerName = `on${Capitalize<EventName>}`;
// Result: 'onClick' | 'onFocus' | 'onBlur'

type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

type Paths<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends object
    ? Paths<T[K], `${Prefix}${K}.`>
    : `${Prefix}${K}`;
}[keyof T & string];

// Paths<{ user: { name: string; age: number } }> = "user.name" | "user.age"
```

#### Conditional Types and `infer`
```typescript
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
type ArrayElement<T> = T extends (infer U)[] ? U : never;
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// Extract function parameter types
type Parameters<T extends (...args: any) => any> =
  T extends (...args: infer P) => any ? P : never;
```

---

### Type-Safe Patterns

#### Zod Schema + TypeScript Integration
```typescript
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string().cuid(),
  email: z.string().email(),
  role: z.enum(['USER', 'ADMIN']),
  createdAt: z.coerce.date(),
});

type User = z.infer<typeof UserSchema>; // Derive type from schema

// Type-safe parsing with error handling
function parseUser(data: unknown): User {
  return UserSchema.parse(data); // throws ZodError on failure
}

const safeResult = UserSchema.safeParse(data);
if (safeResult.success) {
  console.log(safeResult.data.email); // fully typed
}
```

#### Type-Safe Environment Variables
```typescript
// env.ts — validate env at startup
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL:    z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NODE_ENV:        z.enum(['development', 'test', 'production']),
  PORT:            z.coerce.number().default(3000),
});

export const env = envSchema.parse(process.env);
// env.PORT is now type `number`, not `string | undefined`
```

#### Generic Repository Pattern
```typescript
interface Repository<T, TId> {
  findById(id: TId): Promise<T | null>;
  findMany(filter?: Partial<T>): Promise<T[]>;
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update(id: TId, data: Partial<Omit<T, 'id'>>): Promise<T>;
  delete(id: TId): Promise<void>;
}

class UserRepository implements Repository<User, UserId> {
  async findById(id: UserId) { /* ... */ }
  // TypeScript enforces all interface methods are implemented
}
```

---

### Common Pitfalls to Avoid

| Anti-Pattern | Problem | Solution |
|---|---|---|
| `as any` | Disables type checking | Use `unknown` + narrowing or Zod |
| `as Type` (unsafe cast) | Bypasses structural checking | Use type guards or `satisfies` |
| `// @ts-ignore` | Silences real errors | Fix the root type issue |
| `!` non-null assertion | Runtime errors if null | Use optional chaining + nullish coalescing |
| `Object` / `{}` type | Accepts anything non-null | Use specific types or `Record<string, unknown>` |
| Implicit `any` in callbacks | Breaks type inference | Always type function parameters |

---

### The `satisfies` Operator (TS 4.9+)
```typescript
// Validates against a type without widening the inferred type
const config = {
  port: 3000,
  host: 'localhost',
  debug: true,
} satisfies Record<string, string | number | boolean>;

// config.port is still inferred as `3000` (literal), not `number`
config.port.toFixed(2); // Works! Literal type preserved.
```

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `brainstorming`, `zero-to-prod-orchestrator`, dan `session-memory-manager` untuk memastikan eksekusi yang kohesif.

### Deskripsi
Panduan TypeScript level ahli mencakup sistem tipe tingkat lanjut, penerapan strict mode, pemrograman generik, utility types, branded types, dan pola type-safe untuk aplikasi produksi. Menargetkan fitur **TypeScript 5.8+** termasuk inferred type predicates, isolated declarations, `NoInfer`, deklarasi `using`, peningkatan variadic tuple, dan parameter tipe `const`.

### Kondisi Pemicu
- Menulis TypeScript dengan generic constraints tingkat lanjut.
- Menerapkan type safety ketat di codebase yang ada.
- Merancang kontrak API type-safe (REST, tRPC, Zod schema).
- Mengimplementasikan branded types untuk pemodelan domain.
- Menyelesaikan type error kompleks atau polusi `any`.
- Menyiapkan `tsconfig.json` untuk proyek strict dengan `isolatedDeclarations`.
- Menulis utility types atau type helpers TypeScript.

### Panduan Singkat

- **Aktifkan strict mode**: Selalu gunakan `"strict": true` ditambah `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, dan `isolatedDeclarations`.
- **Inferred Type Predicates** (TS 5.5): Filter array tanpa type assertion manual — TypeScript inferensikan sendiri.
- **Isolated Declarations** (TS 5.5): Aktifkan untuk mempercepat build monorepo via parallel `.d.ts` generation.
- **Branded Types**: Cegah pencampuran primitif yang berbeda secara semantis (UserId vs PostId).
- **Discriminated Union**: Gunakan untuk state machine dan variant data yang terbatas.
- **Zod**: Validasi data eksternal dan turunkan tipe TypeScript dari schema Zod.
- **Hindari `as any`**: Gunakan `unknown` dengan narrowing atau Zod untuk data yang tidak diketahui tipenya.
- **`satisfies` operator**: Validasi objek terhadap tipe tanpa melebarkan tipe yang diinferensi.
- **`moduleResolution: Bundler`**: Gunakan untuk proyek Next.js/Vite; `NodeNext` untuk Node.js/Bun backend.