---
name: astro-framework-expert
description: "Expert guide for Astro 5+ framework — Content Collections, Islands Architecture, View Transitions, partial hydration, and MDX integration / Panduan ahli framework Astro 5+ — Content Collections, Islands Architecture, View Transitions, partial hydration, dan integrasi MDX."
author: "Roedy Rustam"
version: "4.3.0"
---

# Astro Framework Expert (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
- **`seo`**: Astro's built-in SEO capabilities, sitemaps, and structured data.
- **`performance-web-vitals`**: Astro's zero-JS-by-default performance optimization.
- **`tailwind-expert`**: Tailwind CSS v4 integration with Astro.
- **`headless-cms-expert`**: Content fetching from Sanity/Payload/Strapi in Astro.
- **`ci-cd-devops-architect`**: Deploying Astro to Vercel, Cloudflare Pages, or Netlify.

### Description
Expert guide for building high-performance, content-first websites with Astro 5+. Covers Content Collections (type-safe content), Islands Architecture (partial hydration), View Transitions, server-side rendering, hybrid rendering, MDX integration, Astro DB, and multi-framework component support (React, Vue, Svelte in one project).

### Trigger Conditions
- Building content-heavy websites (blogs, docs, marketing pages, portfolios).
- Choosing between Astro and Next.js for a content-first project.
- Implementing partial hydration or Islands Architecture.
- Creating documentation sites or landing pages optimized for performance.
- Using multiple UI frameworks (React + Vue + Svelte) in one project.

---

### Core Concepts

#### Astro vs Next.js Decision Guide

| Criteria | Astro 5 | Next.js 15 |
|----------|---------|------------|
| Primary Focus | Content sites | Full-stack apps |
| Default JS Shipped | 0 KB | React runtime |
| Rendering | Static-first, opt-in SSR | SSR-first, opt-in static |
| Multi-framework | ✅ React, Vue, Svelte, Solid | React only |
| Content Collections | ✅ Built-in, type-safe | Manual with MDX |
| Server Islands | ✅ Deferred rendering | PPR (similar) |
| **Choose When** | Content, SEO, speed critical | Complex interactivity |

**Recommendation:** Choose **Astro** for content-driven sites where performance and SEO are top priorities. Choose **Next.js** for interactive web applications with complex state.

#### 1. Project Setup

```bash
# Create new Astro project
npm create astro@latest ./my-site -- --template blog --typescript strict

# Add integrations
npx astro add tailwind react mdx sitemap
```

#### 2. Content Collections (Type-Safe Content)

```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content', // Markdown/MDX files
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    heroImage: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const authors = defineCollection({
  type: 'data', // JSON/YAML files
  schema: z.object({
    name: z.string(),
    avatar: z.string(),
    bio: z.string(),
  }),
});

export const collections = { blog, authors };
```

```astro
---
// src/pages/blog/[...slug].astro
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content } = await post.render();
---

<article>
  <h1>{post.data.title}</h1>
  <time>{post.data.pubDate.toLocaleDateString()}</time>
  <Content />
</article>
```

#### 3. Islands Architecture (Partial Hydration)

```astro
---
// Only hydrate interactive components — rest ships as 0 JS
import Newsletter from '../components/Newsletter.tsx';
import Counter from '../components/Counter.vue';
import Chart from '../components/Chart.svelte';
---

<!-- Static by default — no JS shipped -->
<h1>My Blog Post</h1>
<p>This is static HTML with zero JavaScript.</p>

<!-- Hydrate only when visible (lazy loading) -->
<Newsletter client:visible />

<!-- Hydrate on page load -->
<Counter client:load />

<!-- Hydrate only on interaction (click, hover) -->
<Chart client:idle />

<!-- Hydrate only on specific media query -->
<MobileMenu client:media="(max-width: 768px)" />
```

#### 4. View Transitions

```astro
---
// src/layouts/BaseLayout.astro
import { ViewTransitions } from 'astro:transitions';
---
<html>
  <head>
    <ViewTransitions />
  </head>
  <body>
    <nav transition:persist><!-- Persists across pages --></nav>
    <main transition:animate="slide">
      <slot />
    </main>
  </body>
</html>
```

#### 5. Server Islands (Deferred Rendering)

```astro
---
// Renders on the server, deferred from the initial page load
// Great for personalized content in otherwise static pages
---
<UserGreeting server:defer>
  <p slot="fallback">Loading...</p>
</UserGreeting>
```

### Production Checklist
- [ ] Content Collections with strict Zod schemas.
- [ ] Sitemap integration enabled (`@astrojs/sitemap`).
- [ ] Image optimization with `astro:assets`.
- [ ] View Transitions for smooth page navigation.
- [ ] Hybrid rendering (static + SSR where needed).
- [ ] Deploy adapter configured (Vercel, Cloudflare, Node).

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
- **`seo`**: Kemampuan SEO bawaan Astro, sitemap otomatis, dan data terstruktur JSON-LD.
- **`performance-web-vitals`**: Optimasi performa zero-JS-by-default Astro untuk Core Web Vitals (skor 100).
- **`tailwind-expert`**: Integrasi Tailwind CSS v4 (@theme) dengan Astro.
- **`headless-cms-expert`**: Pengambilan konten dari Sanity, Payload, atau Strapi secara type-safe di Astro.
- **`ci-cd-devops-architect`**: Deployment ke Vercel, Cloudflare Pages, atau Node.js distroless container.

### Deskripsi
Panduan tingkat produksi untuk membangun website berperforma tinggi dan berfokus konten dengan Astro 5+. Mencakup Content Collections (manajemen konten type-safe berbasis Zod), Islands Architecture (hidrasi parsial), View Transitions native, rendering hybrid/SSR, integrasi MDX, Server Islands (rendering tunda), dan orkestrasi multi-framework (React, Vue, Svelte dalam satu proyek).

### Kondisi Pemicu
- Membangun situs web kaya konten (blog, dokumentasi teknis, portal berita, landing page).
- Memilih arsitektur rendering antara Astro dan Next.js untuk proyek konten.
- Mengimplementasikan hidrasi parsial (*Islands Architecture*) untuk memangkas bundle JavaScript ke browser.
- Menambahkan Server Islands untuk komponen personalisasi tanpa mengorbankan cache CDN statis.

---

### Panduan Keputusan: Astro 5 vs Next.js 15

| Kriteria | Astro 5 | Next.js 15 |
|---|---|---|
| Fokus Utama | Situs berbasis konten | Aplikasi interaktif full-stack |
| Default JavaScript Dikirim | 0 KB (Zero-JS default) | React runtime (~80 KB+) |
| Model Rendering | Statis terlebih dahulu, SSR selektif | SSR-first, statis via caching |
| Dukungan Multi-Framework | React, Vue, Svelte, Solid, Preact | Hanya React |
| Content Collections | Bawaan type-safe via `astro:content` | Manual via MDX / Contentlayer |
| Server Islands | Rendering tunda independen (`server:defer`) | Partial Prerendering (PPR) |

---

### Implementasi Pola Kunci (2026 Standard)

#### 1. Setup Proyek & Integrasi
```bash
# Inisialisasi proyek Astro dengan template blog dan TypeScript ketat
npm create astro@latest ./situs-astro -- --template blog --typescript strict

# Menambahkan integrasi esensial secara otomatis
npx astro add tailwind react mdx sitemap
```

#### 2. Content Collections Type-Safe (`astro:content`)
```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const artikel = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().min(5),
    description: z.string(),
    publishDate: z.coerce.date(),
    author: z.string(),
    tags: z.array(z.string()).default([]),
    isDraft: z.boolean().default(false),
  }),
});

const penulis = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    avatarUrl: z.string().url(),
    role: z.string(),
  }),
});

export const collections = { artikel, penulis };
```

```astro
---
// src/pages/artikel/[...slug].astro
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const posts = await getCollection('artikel', ({ data }) => !data.isDraft);
  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content } = await post.render();
---

<article class="max-w-3xl mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{post.data.title}</h1>
  <time class="text-sm text-slate-500 tabular-nums">{post.data.publishDate.toLocaleDateString('id-ID')}</time>
  <div class="mt-6 prose dark:prose-invert">
    <Content />
  </div>
</article>
```

#### 3. Islands Architecture & Direktif Hidrasi Klien
```astro
---
// src/components/HalamanInteraktif.astro
import FormNewsletter from '../components/FormNewsletter.tsx';
import IndikatorMetrik from '../components/IndikatorMetrik.vue';
import MenuNavigasiMobile from '../components/MenuNavigasiMobile.svelte';
---

<!-- Elemen statis murni: 0 KB JS dikirim ke browser -->
<header class="border-b border-slate-200 dark:border-slate-800 p-4">
  <h1 class="text-xl font-semibold">Portal Teknologi</h1>
</header>

<!-- Hidrasi hanya saat elemen masuk ke viewport layar -->
<FormNewsletter client:visible />

<!-- Hidrasi saat thread browser berada dalam kondisi idle -->
<IndikatorMetrik client:idle />

<!-- Hidrasi hanya aktif pada layar smartphone di bawah 768px -->
<MenuNavigasiMobile client:media="(max-width: 768px)" />
```

#### 4. View Transitions Native & Navigasi Mulus
```astro
---
// src/layouts/TataLetakUtama.astro
import { ViewTransitions } from 'astro:transitions';
---
<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <ViewTransitions />
  </head>
  <body class="bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 antialiased">
    <nav transition:persist class="sticky top-0 z-50 backdrop-blur-md bg-slate-50/80 border-b border-slate-200">
      <slot name="navigasi" />
    </nav>
    <main transition:animate="fade" class="container mx-auto px-4">
      <slot />
    </main>
  </body>
</html>
```

#### 5. Server Islands (`server:defer`) untuk Konten Dinamis
```astro
---
// Renders secara asinkron di server setelah HTML statis awal dikirim via CDN
import WidgetProfilPengguna from '../components/WidgetProfilPengguna.astro';
---
<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
  <div class="md:col-span-2">
    <!-- Konten statis ter-cache secara instan -->
    <h2>Artikel Utama</h2>
  </div>
  <aside>
    <!-- Server Island: Ditunda di server tanpa memblokir TTFB awal -->
    <WidgetProfilPengguna server:defer>
      <div slot="fallback" class="p-4 rounded border border-slate-200 animate-pulse text-sm text-slate-500">
        Memuat data sesi pengguna...
      </div>
    </WidgetProfilPengguna>
  </aside>
</div>
```

### Checklist Kesiapan Produksi Astro
- [ ] Validasi skema Zod ketat pada seluruh Content Collections.
- [ ] Penggunaan komponen `<Image />` bawaan dari `astro:assets` untuk optimasi format WebP/AVIF.
- [ ] Integrasi sitemap XML otomatis (`@astrojs/sitemap`) dan robots.txt.
- [ ] Pengecekan View Transitions dengan `transition:persist` pada pemutar audio atau status navigasi.
- [ ] Konfigurasi adapter deployment sesuai platform target (`@astrojs/vercel`, `@astrojs/cloudflare`, atau `@astrojs/node`).