---
name: authentication-identity-expert
description: "Expert guide for implementing secure authentication, authorization (RBAC/ABAC), OAuth2, and identity management (Clerk, Auth.js, Supabase Auth) / Panduan ahli untuk autentikasi dan otorisasi."
author: "Roedy Rustam"
version: "4.3.0"
---

# Authentication & Identity Expert (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
Production-grade guide for implementing secure authentication, authorization, and identity management in modern web and mobile applications. Covers **Clerk**, **Supabase Auth**, **Auth.js v5**, **Better Auth**, JWT patterns, OAuth 2.1, PKCE flows, RBAC/ABAC, passkeys (WebAuthn), and MFA implementations for React 19 / Next.js 15 stacks.

### Trigger Conditions
- Working on login/signup flows, session management, or OAuth integrations.
- Integrating Clerk, Supabase Auth, Auth.js v5, Better Auth, or Auth0.
- Implementing RBAC (Role-Based Access Control) or ABAC.
- Setting up WebAuthn/Passkeys, MFA/2FA, or SSO.
- Securing Next.js App Router routes with middleware-based auth guards.

---

### Identity Provider Selection Guide

| Provider | Best For | Key Strength | Pricing Model |
|---|---|---|---|
| **Clerk** | New SaaS products | Best developer DX, prebuilt UI components, orgs/teams out-of-the-box | Per MAU (free up to 10k) |
| **Supabase Auth** | Existing Supabase apps | Native RLS integration, multi-provider OAuth, generous free tier | Included with Supabase |
| **Auth.js v5** | Self-hosted control | Full data ownership, zero vendor lock-in, Edge-compatible | 100% Free / OSS |
| **Better Auth** | Modern TS-first apps | Comprehensive TypeScript plugin ecosystem, 2FA, passkeys | 100% Free / OSS |

---

### Technical Guidelines & Recipes

#### 1. Password Hashing Standards
```typescript
import argon2 from 'argon2';

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  });
}
```

#### 2. Short-Lived JWT + Refresh Token Rotation
```typescript
// Access token: 15 minutes, in memory
// Refresh token: 7-30 days, HttpOnly, Secure, SameSite=Strict cookie
```

#### 3. OAuth 2.1 + PKCE
```typescript
import { generateCodeVerifier, generateCodeChallenge } from 'oslo/oauth2';

const codeVerifier = generateCodeVerifier();
const codeChallenge = await generateCodeChallenge(codeVerifier);
sessionStorage.setItem('pkce_verifier', codeVerifier);

const authUrl = new URL('https://provider.com/oauth/authorize');
authUrl.searchParams.set('code_challenge', codeChallenge);
authUrl.searchParams.set('code_challenge_method', 'S256');
authUrl.searchParams.set('state', cryptoRandomState);
```

#### 4. Clerk — Next.js 15 Integration
```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher(['/', '/sign-in(.*)', '/sign-up(.*)', '/api/webhooks(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect();
});

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
};
```

#### 5. Supabase Auth — RLS Integration
> For detailed Supabase Auth SSR setup, PKCE session cookie handling, and PostgreSQL Row-Level Security (RLS) policies, delegate directly to `supabase-security-expert`.

#### 6. Auth.js v5 (Next.js App Router)
```typescript
import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [GitHub],
  session: { strategy: 'database' },
});
```

#### 7. RBAC — Role-Based Access Control (Server-Side)
```typescript
type Role = 'viewer' | 'editor' | 'admin' | 'super_admin';

const permissions: Record<Role, string[]> = {
  viewer: ['read:posts'],
  editor: ['read:posts', 'write:posts', 'delete:own_posts'],
  admin: ['read:posts', 'write:posts', 'delete:any_post', 'manage:users'],
  super_admin: ['*'],
};

export function hasPermission(userRole: Role, required: string): boolean {
  const allowed = permissions[userRole] || [];
  return allowed.includes('*') || allowed.includes(required);
}
```

#### 8. WebAuthn / Passkeys (2026 Standard)
```typescript
import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server';

export async function getPasskeyRegistrationOptions(userId: string, userEmail: string) {
  return generateRegistrationOptions({
    rpName: 'My App',
    rpID: 'myapp.com',
    userID: new TextEncoder().encode(userId),
    userName: userEmail,
    attestationType: 'none',
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
  });
}
```

### Production Security Checklist
- [ ] Passwords hashed with argon2id or bcrypt (cost >= 12).
- [ ] JWT access token expires in <= 15 minutes; refresh token in HttpOnly cookie.
- [ ] PKCE enforced for all public OAuth clients.
- [ ] Authorization enforced on server actions and API routes (never UI only).
- [ ] Rate limiting on login and signup endpoints.

## Orchestration & Integration
- Connects with `supabase-security-expert`, `saas-architect`, `js-backend-expert`, `firebase-security-expert`, and `production-ready-hardener`.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
- **`supabase-security-expert`**: Konfigurasi otentikasi Supabase SSR, token cookie PKCE, dan kebijakan Row-Level Security (RLS) PostgreSQL.
- **`saas-architect`**: Desain multi-tenancy, isolasi data organisasi, dan alur kerja autentikasi B2B SaaS.
- **`js-backend-expert`**: Middleware otorisasi, penanganan sesi JWT stateless, dan sanitasi header.
- **`production-ready-hardener`**: Audit keamanan otentikasi pra-rilis dan penegakan header CSP.

### Deskripsi
Panduan tingkat produksi untuk implementasi autentikasi aman, otorisasi (RBAC/ABAC), dan manajemen identitas pengguna pada aplikasi web dan mobile modern. Mencakup integrasi **Clerk**, **Supabase Auth**, **Auth.js v5 (NextAuth)**, **Better Auth**, OAuth 2.1 dengan alur PKCE, rotasi Refresh Token HttpOnly, Passkeys (WebAuthn), dan Multi-Factor Authentication (MFA) untuk stack React 19 / Next.js 15.

### Rekomendasi Pemilihan Identity Provider

| Provider | Pilihan Terbaik Untuk | Keunggulan Utama | Model Harga |
|---|---|---|---|
| **Clerk** | Produk SaaS baru & B2B | DX terbaik, UI bawaan siap pakai, manajemen tim/organisasi instan | Per MAU (gratis hingga 10.000 pengguna) |
| **Supabase Auth** | Aplikasi dengan database Supabase | Integrasi native Row-Level Security (RLS), OAuth multi-provider | Termasuk dalam kuota Supabase |
| **Auth.js v5** | Aplikasi mandiri (*Self-hosted*) | Kepemilikan data penuh, zero vendor lock-in, kompatibel Edge | 100% Gratis / Open-Source |
| **Better Auth** | Proyek TypeScript-first modern | Ekosistem plugin komprehensif, 2FA, passkeys bawaan | 100% Gratis / Open-Source |

---

### Resep & Pedoman Teknis Implementasi

#### 1. Standar Hashing Password (Argon2id)
```typescript
import argon2 from 'argon2';

export async function hashPasswordAman(passwordPolos: string): Promise<string> {
  return argon2.hash(passwordPolos, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verifikasiPassword(hashTersimpan: string, passwordInput: string): Promise<boolean> {
  return argon2.verify(hashTersimpan, passwordInput);
}
```

#### 2. Clerk Middleware pada Next.js 15 App Router
```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Definisikan rute yang dapat diakses publik tanpa login
const rutePublik = createRouteMatcher([
  '/',
  '/masuk(.*)',
  '/daftar(.*)',
  '/api/webhooks(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (!rutePublik(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

#### 3. Auth.js v5 (NextAuth) dengan Adapter Database Drizzle ORM
```typescript
// auth.ts
import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    GitHub({ clientId: process.env.AUTH_GITHUB_ID, clientSecret: process.env.AUTH_GITHUB_SECRET }),
    Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role || 'user';
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
});
```

#### 4. Kontrol Akses Berbasis Peran (RBAC) di Sisi Server
```typescript
export type PeranPengguna = 'tamu' | 'anggota' | 'manajer' | 'administrator';

const matriksIzin: Record<PeranPengguna, string[]> = {
  tamu: ['baca:artikel'],
  anggota: ['baca:artikel', 'buat:komentar'],
  manajer: ['baca:artikel', 'buat:komentar', 'kelola:konten'],
  administrator: ['*'],
};

export function validasiIzin(peran: PeranPengguna, izinYangDibutuhkan: string): boolean {
  const daftarIzin = matriksIzin[peran] || [];
  return daftarIzin.includes('*') || daftarIzin.includes(izinYangDibutuhkan);
}
```

### Checklist Keamanan Otentikasi Produksi
- [ ] Password di-hash menggunakan `argon2id` atau `bcrypt` dengan work factor minimal 12.
- [ ] Access token berumur pendek (maksimal 15 menit) disimpan di memori runtime.
- [ ] Refresh token disimpan di cookie berflag `HttpOnly`, `Secure`, dan `SameSite=Strict` dengan rotasi token.
- [ ] Alur OAuth 2.1 publik wajib menerapkan `PKCE` (Proof Key for Code Exchange) dengan challenge SHA-256.
- [ ] Otorisasi hak akses divalidasi ketat pada Server Action dan API Route (bukan sekadar menyembunyikan tombol UI).
- [ ] Proteksi brute-force dengan pembatasan laju (*Rate Limiting*) pada endpoint login dan pendaftaran.