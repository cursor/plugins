---
name: state-management-expert
description: "Expert guide for modern client-side state management: Zustand, Jotai, Valtio, TanStack Store, Redux Toolkit, and server state patterns with TanStack Query / Panduan ahli untuk manajemen state client-side modern: Zustand, Jotai, Valtio, TanStack Store, Redux Toolkit, dan pola server state dengan TanStack Query."
author: "Roedy Rustam"
version: "4.3.0"
---

# State Management Expert (Modern React Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills like `brainstorming`, `zero-to-prod-orchestrator`, and `session-memory-manager` to ensure cohesive execution.

### Description
Expert guide for selecting and implementing the right state management solution for React and Next.js applications. Covers **Zustand 5**, **Jotai 2**, **Valtio**, **TanStack Store**, and **Redux Toolkit 2**, with clear guidance on when to use each, proper separation of server state (TanStack Query) from client state, and advanced patterns like slices, persistence, and devtools integration.

### Trigger Conditions
- Choosing a state management library for a new React/Next.js project.
- Refactoring prop drilling or complex Context API usage.
- Implementing global UI state (modals, drawers, theme, auth session).
- Managing complex form state across multiple steps.
- Implementing undo/redo, optimistic updates, or derived state.
- Migrating from Redux to a lighter alternative.

---

### State Category Separation (Critical First Step)

Before choosing a library, categorize your state:

| Category | Description | Solution |
|---|---|---|
| **Server State** | Data from APIs, databases | TanStack Query / SWR |
| **URL State** | Route params, search filters | `useSearchParams`, nuqs |
| **Form State** | Input values, validation errors | React Hook Form + Zod |
| **UI/Local State** | Modals, drawers, toggles | `useState` / `useReducer` |
| **Global Client State** | Theme, auth, shopping cart | Zustand / Jotai |
| **Cross-tab State** | Sync across browser tabs | Zustand + BroadcastChannel |

**Rule**: Do NOT store server data in client state. Let TanStack Query own all async data.

---

### Library Selection Guide

| Criteria | Zustand 5 | Jotai 2 | Valtio | Redux Toolkit |
|---|---|---|---|---|
| **Mental Model** | Single store, actions | Atomic, bottom-up | Proxy-based, mutable | Flux, reducers |
| **Bundle Size** | ~1KB | ~3KB | ~3KB | ~15KB+ |
| **DevTools** | Redux DevTools | Jotai DevTools | Redux DevTools | Built-in |
| **Async** | Manual or middleware | `atomWithQuery` | `snapshot` | `createAsyncThunk` |
| **Best For** | General global state | Atomic derived state | Simple mutable state | Large teams, strict patterns |

**Recommendation**: Use **Zustand** as the default. Use **Jotai** for fine-grained reactive atoms. Use **Redux Toolkit** only for large enterprise teams with strict conventions.

---

### Zustand 5 — Best Practices

#### Basic Store with TypeScript
```typescript
// stores/ui.store.ts
import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface UiState {
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  activeModal: string | null;
  setTheme: (theme: UiState['theme']) => void;
  toggleSidebar: () => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
}

export const useUiStore = create<UiState>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set) => ({
          theme: 'system',
          sidebarOpen: true,
          activeModal: null,
          setTheme: (theme) => set((state) => { state.theme = theme; }),
          toggleSidebar: () => set((state) => { state.sidebarOpen = !state.sidebarOpen; }),
          openModal: (modalId) => set((state) => { state.activeModal = modalId; }),
          closeModal: () => set((state) => { state.activeModal = null; }),
        }))
      ),
      { name: 'ui-store', partialize: (s) => ({ theme: s.theme }) }
    ),
    { name: 'UiStore' }
  )
);
```

#### Slice Pattern for Large Stores
```typescript
// Pattern: separate slices, combine into one store
import { StateCreator } from 'zustand';

interface AuthSlice {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}

interface CartSlice {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  total: () => number;
}

type AppStore = AuthSlice & CartSlice;

const createAuthSlice: StateCreator<AppStore, [], [], AuthSlice> = (set) => ({
  user: null,
  isAuthenticated: false,
  login: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false }),
});

const createCartSlice: StateCreator<AppStore, [], [], CartSlice> = (set, get) => ({
  items: [],
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
  removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  total: () => get().items.reduce((sum, item) => sum + item.price * item.qty, 0),
});

export const useAppStore = create<AppStore>()(
  devtools((...args) => ({
    ...createAuthSlice(...args),
    ...createCartSlice(...args),
  }))
);
```

#### Selective Subscriptions (Prevent Unnecessary Rerenders)
```typescript
// Only re-render when `theme` changes, not the entire store
const theme = useUiStore((s) => s.theme);
const isModalOpen = useUiStore((s) => s.activeModal === 'confirm-delete');

// Subscribe outside React (side effects, non-component code)
useUiStore.subscribe(
  (s) => s.theme,
  (theme) => document.documentElement.dataset.theme = theme,
  { fireImmediately: true }
);
```

---

### Jotai 2 — Atomic State Patterns

```typescript
// atoms/user.atoms.ts
import { atom, loadable } from 'jotai';
import { atomWithStorage, atomWithReset } from 'jotai/utils';

// Primitive atom
export const themeAtom = atomWithStorage<'light' | 'dark'>('theme', 'light');

// Derived (read-only) atom
export const isDarkAtom = atom((get) => get(themeAtom) === 'dark');

// Async atom with loadable for Suspense-free usage
export const userAtom = atom(async () => {
  const res = await fetch('/api/me');
  if (!res.ok) throw new Error('Failed to fetch user');
  return res.json() as Promise<User>;
});

export const loadableUserAtom = loadable(userAtom);

// In component:
function UserWidget() {
  const loadableUser = useAtomValue(loadableUserAtom);
  if (loadableUser.state === 'loading') return <Spinner />;
  if (loadableUser.state === 'hasError') return <Error />;
  return <div>{loadableUser.data.name}</div>;
}
```

---

### Redux Toolkit 2 — Modern Patterns

```typescript
// features/cart/cartSlice.ts
import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';

interface CartState {
  items: CartItem[];
  status: 'idle' | 'loading' | 'failed';
}

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [], status: 'idle' } as CartState,
  reducers: {
    addItem(state, action: PayloadAction<CartItem>) {
      state.items.push(action.payload); // Immer handles immutability
    },
    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter((i) => i.id !== action.payload);
    },
  },
});

// Memoized selector
export const selectCartTotal = createSelector(
  (state: RootState) => state.cart.items,
  (items) => items.reduce((sum, i) => sum + i.price * i.qty, 0)
);

export const { addItem, removeItem } = cartSlice.actions;
export default cartSlice.reducer;
```

---

### Integration with Next.js App Router

- **Server Components**: No client state. Fetch directly.
- **Client Components**: Use Zustand/Jotai wrapped in providers.
- **Hydration**: Initialize Zustand store from server-fetched data using `useHydrateAtoms` (Jotai) or a `HydrationBoundary` pattern.

```typescript
// providers/store-provider.tsx (App Router pattern)
'use client';
import { createStore, Provider } from 'jotai';
import { useRef } from 'react';

type Props = { children: React.ReactNode; initialUser?: User };

export function StoreProvider({ children, initialUser }: Props) {
  const store = useRef(createStore());
  if (initialUser) store.current.set(userAtom, initialUser);
  return <Provider store={store.current}>{children}</Provider>;
}
```

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `brainstorming`, `zero-to-prod-orchestrator`, dan `session-memory-manager` untuk memastikan arsitektur state yang bersih dan bebas re-render berlebihan.

### Deskripsi
Panduan ahli untuk memilih dan mengimplementasikan solusi manajemen state yang tepat untuk aplikasi React 19 dan Next.js 15. Mencakup **Zustand 5**, **Jotai 2**, **Valtio**, dan **Redux Toolkit 2**, dengan panduan pemilihan yang jelas, pemisahan server state (TanStack Query) dari client state, dan pola lanjutan seperti slices, persistensi, dan integrasi devtools.

### Kondisi Pemicu
- Memilih library state management untuk proyek React/Next.js baru.
- Refaktor prop drilling atau penggunaan Context API yang rumit.
- Mengimplementasikan global UI state (modal, drawer, tema, sesi auth).
- Mengelola state form kompleks di beberapa langkah.
- Mengimplementasikan undo/redo, optimistic update, atau derived state.
- Migrasi dari Redux ke alternatif yang lebih ringan.

---

### Pemisahan Kategori State (Prinsip Terpenting)

| Kategori | Definisi | Solusi Standar 2026 |
|---|---|---|
| **Server State** | Data yang berasal dari database atau endpoint API | TanStack Query v5 / SWR |
| **URL State** | Filter pencarian, pagination, parameter routing | `useSearchParams`, `nuqs` |
| **Form State** | Input formulir, status validasi, pesan kesalahan | React Hook Form + Zod |
| **UI Local State** | Buka/tutup modal, dropdown, toggle accordion | `useState` / `useReducer` |
| **Global Client State** | Status autentikasi, tema, preferensi UI, keranjang belanja | Zustand 5 / Jotai 2 |

**Aturan Emas**: Jangan pernah menyimpan salinan data server di dalam store klien. Serahkan seluruh sinkronisasi data async ke TanStack Query.

---

### Pola Kunci Zustand 5 (TypeScript)

#### 1. Store Global dengan Middleware DevTools & Persistensi
```typescript
// stores/ui.store.ts
import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface UiState {
  tema: 'terang' | 'gelap' | 'sistem';
  sidebarBuka: boolean;
  modalAktif: string | null;
  aturTema: (tema: UiState['tema']) => void;
  toggleSidebar: () => void;
  bukaModal: (idModal: string) => void;
  tutupModal: () => void;
}

export const useUiStore = create<UiState>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set) => ({
          tema: 'sistem',
          sidebarBuka: true,
          modalAktif: null,
          aturTema: (tema) => set((draft) => { draft.tema = tema; }),
          toggleSidebar: () => set((draft) => { draft.sidebarBuka = !draft.sidebarBuka; }),
          bukaModal: (idModal) => set((draft) => { draft.modalAktif = idModal; }),
          tutupModal: () => set((draft) => { draft.modalAktif = null; }),
        }))
      ),
      { name: 'penyimpanan-ui', partialize: (s) => ({ tema: s.tema }) }
    ),
    { name: 'UiStore' }
  )
);
```

#### 2. Selective Subscriptions untuk Mencegah Re-render Berlebih
```typescript
// Hanya komponen yang membutuhkan tema yang akan re-render saat tema berubah
const tema = useUiStore((s) => s.tema);
const isModalHapusBuka = useUiStore((s) => s.modalAktif === 'konfirmasi-hapus');

// Langganan di luar siklus React untuk manipulasi DOM langsung
useUiStore.subscribe(
  (s) => s.tema,
  (tema) => { document.documentElement.dataset.theme = tema; },
  { fireImmediately: true }
);
```

#### 3. Provider Jotai 2 pada Next.js App Router
```typescript
// providers/store-provider.tsx
'use client';

import { createStore, Provider } from 'jotai';
import { useRef } from 'react';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef(createStore());
  return <Provider store={storeRef.current}>{children}</Provider>;
}
```