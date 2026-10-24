---
name: tanstack-query-expert
description: "Advanced TanStack Query (v5) expert. Covers useSuspenseQuery, infinite scrolling, optimistic mutations, SSR/React Server Components hydration, and advanced cache invalidation / Pakar manajemen state asinkron menggunakan TanStack Query (React Query) v5 dan Next.js App Router (SSR)."
author: "Roedy Rustam"
version: "4.3.0"
---

# TanStack Query Expert (v5 + TanStack Router/Start Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills like `brainstorming`, `zero-to-prod-orchestrator`, and `session-memory-manager` to ensure cohesive execution.

### Description
Production-grade TanStack Query (v5) mastery for modern React (v18/19) and Next.js (App Router) applications. Covers declarative data fetching, advanced cache invalidation, optimistic UI updates, Suspense boundaries, SSR hydration, and the new **TanStack Router** + **TanStack Start** ecosystem for full-stack type-safe applications.

### Trigger Conditions
- Refactoring data fetching logic (replacing `useEffect` + `useState` patterns).
- Designing query key factories (Array-based, strictly typed).
- Writing `useMutation` hooks with immediate Optimistic Updates.
- Implementing Infinite Scrolling (`useInfiniteQuery`).
- Using React Suspense with `useSuspenseQuery`.
- Integrating TanStack Query with Next.js App Router (Server Components prefetching + Client Boundary hydration).
- Building type-safe SPAs with **TanStack Router** (typed routes, route-level loaders).
- Building full-stack apps with **TanStack Start** (server functions, RSC-like patterns).

### Core Concepts & Rules of Thumb
- **Never** use `useEffect` to fetch data if TanStack Query is available.
- **Never** sync query data into local React state (e.g., `useEffect(() => setLocalState(data), [data])`). Derive state during render instead.
- **Stale != Garbage Collected**: `staleTime` dictates when background refetch triggers. `gcTime` dictates how long inactive data stays in memory.
- **Always** use `queryOptions()` helper to co-locate query definition and reuse it across components and loaders.

### Advanced Query Patterns

#### 1. `queryOptions()` Helper — The 2026 Best Practice
Co-locate your query definition using `queryOptions()` to share it between components and route loaders:
```typescript
import { queryOptions } from '@tanstack/react-query';

export const userQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['users', userId],
    queryFn: () => fetchUser(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

// In component:
const { data } = useQuery(userQueryOptions(userId));

// In TanStack Router loader:
export const Route = createFileRoute('/users/$userId')({
  loader: ({ context: { queryClient }, params }) =>
    queryClient.ensureQueryData(userQueryOptions(params.userId)),
  component: UserPage,
});
```

#### 2. Custom Hook & Suspense Pattern
Abstract `useQuery` into custom hooks. Use `useSuspenseQuery` for modern React architectures:
```typescript
export function useUser(userId: string) {
  return useSuspenseQuery(userQueryOptions(userId));
}
```

#### 3. Query Key Factories (Mandatory for Scale)
Use factories to prevent typos and ensure invalidation targets the correct subsets:
```typescript
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: string) => [...userKeys.lists(), { filters }] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};
```

#### 4. Optimistic Updates (v5 Best Practice)
Give users instant feedback by updating the cache before the server responds:
```typescript
const mutation = useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    await queryClient.cancelQueries({ queryKey: todoKeys.lists() });
    const previous = queryClient.getQueryData(todoKeys.lists());
    queryClient.setQueryData(todoKeys.lists(), (old) =>
      old?.map(t => t.id === newTodo.id ? newTodo : t)
    );
    return { previous };
  },
  onError: (err, _, context) => {
    queryClient.setQueryData(todoKeys.lists(), context?.previous);
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: todoKeys.lists() }),
});
```

#### 5. TanStack Router — Type-Safe Client-Side Routing
TanStack Router is the recommended router for SPAs in 2026 — fully type-safe routes, search params, and loaders:
```typescript
import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';

const rootRoute = createRootRoute({ component: RootLayout });

const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/users',
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(usersQueryOptions()),
  component: UsersPage,
});
```

#### 6. TanStack Start — Full-Stack Framework
TanStack Start brings server functions and SSR to TanStack Router apps — a Vite-powered alternative to Next.js for SPAs that need SSR:
```typescript
import { createServerFn } from '@tanstack/start';

// Type-safe server function (runs on server)
const getUser = createServerFn({ method: 'GET' })
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    return db.user.findUnique({ where: { id: data.userId } });
  });
```

#### 7. Next.js App Router SSR Hydration
Prefetch on the server and hydrate on the client seamlessly:
```typescript
// Server Component (app/users/page.tsx)
export default async function UsersPage() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery(usersQueryOptions());
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UsersList />
    </HydrationBoundary>
  );
}
```

### Troubleshooting
- **Infinite Fetching Loops**: Check your `queryFn`. Unhandled exceptions trigger 3 auto-retries. Ensure stable query keys (no object literals in render).
- **`staleTime` vs `gcTime`**: If `gcTime` < `staleTime`, data is deleted from memory before it becomes stale — this defeats the cache. Always set `gcTime >= staleTime`.
- **Hydration Mismatch**: Ensure server and client produce identical initial query data — check for timezone or locale differences.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `brainstorming`, `zero-to-prod-orchestrator`, dan `session-memory-manager` untuk memastikan eksekusi yang kohesif.

### Deskripsi
Penguasaan TanStack Query (v5) tingkat produksi untuk aplikasi React modern (v18/19) dan Next.js (App Router). Mencakup data fetching deklaratif, invalidasi cache lanjutan, optimistic UI, Suspense boundaries, hidrasi SSR, serta ekosistem **TanStack Router** + **TanStack Start** untuk aplikasi full-stack yang type-safe.

### Kondisi Pemicu
- Refactoring logika data fetching (menggantikan `useEffect` + `useState`).
- Merancang query key factories berbasis Array yang type-safe.
- Menulis hook `useMutation` dengan Optimistic Updates instan.
- Mengimplementasikan Infinite Scrolling (`useInfiniteQuery`).
- Memanfaatkan React Suspense dengan `useSuspenseQuery`.
- Mengintegrasikan TanStack Query dengan Next.js App Router (prefetching RSC + hidrasi client boundary).
- Membangun SPA type-safe dengan **TanStack Router** (rute bertipe, route-level loaders).
- Membangun aplikasi full-stack dengan **TanStack Start** (server functions, pola mirip RSC).

### Aturan Utama & Prinsip
- **Jangan pernah** gunakan `useEffect` untuk fetch data jika TanStack Query tersedia.
- **Jangan pernah** sinkronkan data query ke state lokal React.
- `staleTime`: kapan refetch latar belakang dipicu. `gcTime`: berapa lama data tidak aktif di memori.
- **Selalu** gunakan helper `queryOptions()` untuk mendefinisikan dan berbagi query definition.

### Pola Tingkat Lanjut

#### 1. Helper `queryOptions()` — Best Practice 2026
Co-locate definisi query menggunakan `queryOptions()` untuk berbagi antara komponen dan route loader. Lihat contoh kode di bagian English.

#### 2. Custom Hook & Suspense Pattern
Abstraksikan `useQuery` ke dalam custom hook. Gunakan `useSuspenseQuery` untuk loading state yang ditangani oleh `<Suspense>`.

#### 3. Query Key Factories
Gunakan factory untuk mencegah typo dan memastikan invalidation menargetkan subset data yang tepat.

#### 4. Optimistic Updates
Perbarui cache sebelum server merespons untuk umpan balik instan kepada pengguna.

#### 5. TanStack Router
Router client-side yang fully type-safe untuk SPA — rute, search params, dan loader semuanya bertipe. Direkomendasikan untuk proyek SPA baru di 2026 (menggantikan React Router).

#### 6. TanStack Start
Framework full-stack berbasis Vite dengan server functions type-safe — alternatif Next.js untuk SPA yang membutuhkan SSR.

#### 7. Hidrasi SSR Next.js App Router
Prefetch di Server Component, lalu wrap dengan `<HydrationBoundary>` agar data langsung tersedia di Client Component tanpa request tambahan.

### Pemecahan Masalah
- **Loop Fetching**: Query key tidak stabil atau `queryFn` yang melempar error tak tertangani.
- **`staleTime` vs `gcTime`**: Jangan set `gcTime` lebih kecil dari `staleTime`.
- **Hydration Mismatch**: Pastikan server dan client menghasilkan data awal yang identik.