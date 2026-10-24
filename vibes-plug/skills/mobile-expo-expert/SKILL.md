---
name: mobile-expo-expert
description: "Expert guide for React Native 0.79+ and Expo SDK 53+ development. Covers cross-platform mobile architecture, Expo Router v4, New Architecture, OTA updates, and native modules / Panduan ahli pengembangan React Native 0.79+ dan Expo SDK 53+ untuk aplikasi mobile."
author: "Roedy Rustam"

version: "4.3.0"
---

# Mobile Expert — React Native & Expo (SDK 53 / RN 0.79 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills like `brainstorming`, `zero-to-prod-orchestrator`, and `session-memory-manager` to ensure cohesive execution.

### Description
Expert guide for building production-grade cross-platform mobile applications using **React Native 0.79+** and **Expo SDK 53+**. Covers the New Architecture (stable), Expo Router v4, OTA updates, native modules, and modern state management patterns for iOS and Android.

### Trigger Conditions
- Building a new iOS/Android cross-platform mobile app.
- Using Expo SDK 53+ or React Native 0.79+ with the New Architecture.
- Implementing file-based routing with **Expo Router v4**.
- Setting up OTA (Over-the-Air) updates with EAS Update.
- Writing native modules using **JSI** (JavaScript Interface) or **Expo Modules API**.
- Integrating device features: camera, biometrics, notifications, location.

### What's New in 2026

#### React Native 0.79 — New Architecture Stable
The **New Architecture** (Fabric + JSI + TurboModules) is now **fully stable** and the default for all new Expo SDK 53 projects:
- **Fabric**: New rendering engine — synchronous rendering, better animations.
- **JSI (JavaScript Interface)**: Direct C++ bridge — no more async serialization for native calls.
- **TurboModules**: Lazy-loaded native modules — significantly faster startup time.
- **Concurrent React**: Full support for `useTransition`, `useDeferredValue`, and Suspense on mobile.

#### Expo SDK 53 — Key Updates
- **Expo Router v4**: File-based routing with typed routes, API routes (Expo functions), and universal links.
- **Expo Camera v15**: Unified camera API for iOS and Android.
- **Expo SQLite v15**: Full SQLite with WAL mode and `useSQLiteContext` hook.
- **Expo Modules API v2**: Easier native module authoring with Swift/Kotlin.
- **EAS Build**: Faster builds with M-series Mac runners.

### Core Architecture Patterns

#### 1. Project Setup (Expo SDK 53 + New Arch)
```bash
npx create-expo-app@latest MyApp --template tabs
cd MyApp
# New Architecture is enabled by default in SDK 53
```

#### 2. Expo Router v4 — File-Based Routing
```
app/
  _layout.tsx          # Root layout (navigation + providers)
  (tabs)/
    _layout.tsx         # Tab navigator
    index.tsx           # Home tab
    profile.tsx         # Profile tab
  (auth)/
    login.tsx           # Login screen
    register.tsx
  modal.tsx             # Modal screen
```

Use **typed routes** for compile-time safety:
```typescript
import { Link, useRouter } from 'expo-router';

// Typed navigation — TypeScript errors on invalid paths
<Link href="/profile">Profile</Link>

const router = useRouter();
router.push('/modal');
```

#### 3. API Routes (Expo Functions)
Expo Router v4 supports API routes for serverless backend logic:
```typescript
// app/api/user+api.ts
export async function GET(request: Request) {
  const user = await db.user.findFirst();
  return Response.json(user);
}
```

#### 4. State Management
- **TanStack Query v5**: Primary choice for server state (`useQuery`, `useMutation`).
- **Zustand**: Lightweight client state management (replace Context for complex state).
- **MMKV**: Ultra-fast synchronous storage (replace AsyncStorage).
- **Expo SQLite + Drizzle**: Local-first database with full SQL support.

#### 5. Navigation Patterns
```typescript
// Deep linking & Universal Links configuration
// app.json
{
  "expo": {
    "scheme": "myapp",
    "ios": { "associatedDomains": ["applinks:myapp.com"] },
    "android": { "intentFilters": [{ "action": "VIEW", "data": [{ "scheme": "https", "host": "myapp.com" }] }] }
  }
}
```

#### 6. Native Modules — Expo Modules API v2
```typescript
// modules/my-sensor/src/MyModule.ts
import { requireNativeModule } from 'expo-modules-core';
const MyModule = requireNativeModule('MyModule');

export function readSensor(): Promise<number> {
  return MyModule.readSensor();
}
```

#### 7. OTA Updates with EAS Update
```bash
# Push an instant OTA update (no App Store review)
eas update --branch production --message "Fix critical bug"
```
Use **channels** to target specific user groups (production, staging, beta).

#### 8. Performance Best Practices
- Use **FlashList** (Shopify) instead of `FlatList` for large lists.
- Use **react-native-reanimated v3** for 60/120fps animations that run on the UI thread.
- Use **react-native-gesture-handler** for gesture recognition on the native thread.
- Enable **Hermes** engine (default in SDK 53) for faster startup and reduced memory.


#### 9. Material Design 3 (M3 / Material You) Cross-Platform Theming
Adhere to M3 specifications (https://m3.material.io/) for dynamic theming across Android and iOS:
```typescript
import { MD3LightTheme, MD3DarkTheme, PaperProvider } from 'react-native-paper';
import { themeFromSourceColor, argbFromHex } from '@material/material-color-utilities';
import { useColorScheme } from 'react-native';

// Generate dynamic M3 color scheme from brand seed
const seedColor = '#6750A4';
const m3Theme = themeFromSourceColor(argbFromHex(seedColor));

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const theme = {
    ...(isDark ? MD3DarkTheme : MD3LightTheme),
    colors: {
      ...(isDark ? MD3DarkTheme.colors : MD3LightTheme.colors),
      primary: isDark ? '#D0BCFF' : '#6750A4',
      primaryContainer: isDark ? '#4F378B' : '#EADDFF',
      surface: isDark ? '#1C1B1F' : '#FFFBFE',
      surfaceVariant: isDark ? '#49454F' : '#E7E0EC',
    },
  };

  return <PaperProvider theme={theme}>{children}</PaperProvider>;
}
```

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `brainstorming`, `zero-to-prod-orchestrator`, dan `session-memory-manager` untuk memastikan eksekusi yang kohesif.

### Deskripsi
Panduan ahli untuk membangun aplikasi mobile cross-platform tingkat produksi menggunakan **React Native 0.79+** dan **Expo SDK 53+**. Mencakup New Architecture (stabil), Expo Router v4, OTA updates, native modules, dan pola state management modern untuk iOS dan Android.

### Kondisi Pemicu
- Membangun aplikasi mobile iOS/Android cross-platform baru.
- Menggunakan Expo SDK 53+ atau React Native 0.79+ dengan New Architecture.
- Mengimplementasikan routing berbasis file dengan **Expo Router v4**.
- Menyiapkan OTA (Over-the-Air) updates dengan EAS Update.
- Menulis native modules menggunakan JSI atau Expo Modules API v2.
- Mengintegrasikan fitur perangkat: kamera, biometrik, notifikasi, lokasi.

### Yang Baru di 2026

#### React Native 0.79 — New Architecture Stabil
**New Architecture** (Fabric + JSI + TurboModules) kini **sepenuhnya stabil** dan menjadi default untuk semua proyek baru Expo SDK 53:
- **Fabric**: Engine rendering baru — rendering sinkron, animasi lebih baik.
- **JSI**: Bridge C++ langsung — tidak ada lagi serialisasi async untuk panggilan native.
- **TurboModules**: Modul native lazy-loaded — startup jauh lebih cepat.
- **Concurrent React**: Dukungan penuh untuk `useTransition`, `useDeferredValue`, dan Suspense di mobile.

#### Expo SDK 53 — Pembaruan Utama
- **Expo Router v4**: Routing berbasis file dengan typed routes, API routes, dan universal links.
- **Expo Camera v15**: API kamera terpadu untuk iOS dan Android.
- **Expo SQLite v15**: SQLite lengkap dengan mode WAL dan hook `useSQLiteContext`.
- **Expo Modules API v2**: Pembuatan modul native yang lebih mudah dengan Swift/Kotlin.
- **EAS Build**: Build lebih cepat dengan runner Mac M-series.

### Pola Arsitektur Inti

#### 1. Routing Berbasis File (Expo Router v4)
Expo Router menggunakan konvensi direktori `app/` untuk mendefinisikan semua layar dan navigasi. Gunakan **typed routes** untuk keamanan type-safe di waktu kompilasi.

#### 2. API Routes (Expo Functions)
Expo Router v4 mendukung API routes untuk logika backend serverless langsung di dalam proyek.

#### 3. State Management
- **TanStack Query v5**: Pilihan utama untuk server state.
- **Zustand**: State klien yang ringan.
- **MMKV**: Penyimpanan sinkron ultra-cepat (pengganti AsyncStorage).
- **Expo SQLite + Drizzle**: Database lokal-first dengan dukungan SQL penuh.

#### 4. Native Modules — Expo Modules API v2
Gunakan Expo Modules API untuk membuat modul native kustom dengan Swift (iOS) dan Kotlin (Android) dengan boilerplate minimal.

#### 5. OTA Updates dengan EAS Update
Dorong pembaruan instan ke pengguna tanpa melalui review App Store. Gunakan channel (`production`, `staging`, `beta`) untuk menargetkan kelompok pengguna tertentu.

#### 6. Praktik Terbaik Performa
- **FlashList**: Pengganti FlatList yang jauh lebih cepat untuk daftar panjang.
- **react-native-reanimated v3**: Animasi 60/120fps yang berjalan di UI thread.
- **react-native-gesture-handler**: Pengenalan gesture di native thread.
- **Hermes Engine**: Default di SDK 53 — startup lebih cepat, memori lebih sedikit.

#### 7. Theming Lintas Platform Material Design 3 (M3 / Material You)
Terapkan spesifikasi M3 (https://m3.material.io/) untuk theming dinamis pada Android dan iOS:
- Gunakan `@material/material-color-utilities` untuk mengekstrak 5 palet tonal M3 dari warna seed brand.
- Integrasikan dengan `react-native-paper` (MD3Theme) atau custom design tokens untuk memastikan peran warna (`primary`, `primaryContainer`, `surface`, `surfaceContainer`) dan elevasi tonal beradaptasi sempurna dengan tema terang dan gelap sistem.
