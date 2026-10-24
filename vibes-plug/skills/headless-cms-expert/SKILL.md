---
name: headless-cms-expert
description: "Expert guide for Headless CMS integration (Sanity, Payload CMS, Strapi, Contentful, Storyblok) with modern frameworks / Panduan ahli integrasi Headless CMS (Sanity, Payload, Strapi, Contentful) dengan framework modern."
author: "Roedy Rustam"
version: "4.3.0"
---

# Headless CMS Expert (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
- **`nextjs-app-router-expert`**: SSR/ISR content fetching and caching strategies.
- **`api-design-expert`**: REST/GraphQL API patterns for CMS queries.
- **`seo`**: Structured data, sitemaps, and metadata from CMS content.
- **`astro-framework-expert`**: Content collections and static site generation with CMS.
- **`rich-text-editor-expert`**: Custom editor components for CMS authoring.

### Description
Expert guide for selecting, integrating, and optimizing Headless CMS platforms in modern web applications. Covers Sanity v3 (GROQ, Portable Text, Content Lake), Payload CMS 3.x (TypeScript-first, code-defined schemas), Strapi 5 (open-source, self-hosted), Contentful (enterprise, GraphQL), and Storyblok (visual editing). Includes content modeling, preview mode, webhook-based revalidation, and migration strategies.

### Trigger Conditions
- Choosing or integrating a headless CMS.
- Building content-driven websites (blogs, docs, marketing sites).
- Implementing CMS preview/draft mode in Next.js or Astro.
- Designing content models and structured content schemas.
- Migrating from WordPress or monolithic CMS to headless.

---

### CMS Selection Guide

| Criteria | Sanity v3 | Payload 3.x | Strapi 5 | Contentful | Storyblok |
|----------|-----------|-------------|----------|------------|-----------|
| Hosting | Cloud (free tier) | Self-hosted / Cloud | Self-hosted | Cloud | Cloud |
| Schema Definition | Code (JS/TS) | Code (TS) | Admin UI / Code | Web UI | Web UI |
| Query Language | GROQ | REST / GraphQL | REST / GraphQL | GraphQL / REST | REST / GraphQL |
| Rich Text | Portable Text | Lexical / Slate | Blocks | Rich Text API | Rich Text |
| TypeScript | ★★★★★ | ★★★★★ | ★★★★ | ★★★ | ★★★ |
| Real-time | ★★★★★ | ★★★★ | ★★★ | ★★★ | ★★★★ |
| Visual Editing | Sanity Studio | Admin Panel | Admin Panel | Web App | Visual Editor |
| **Best For** | Developers | Code-first teams | Open-source fans | Enterprise | Marketing teams |

**Recommendation:** Use **Sanity v3** for developer-heavy teams. Use **Payload CMS** when you need full TypeScript control and self-hosting. Use **Strapi** for open-source requirements.

### Core Patterns

#### 1. Sanity v3 Integration

```typescript
// sanity.config.ts — Schema-as-code
import { defineConfig, defineField, defineType } from 'sanity';

export const postSchema = defineType({
  name: 'post',
  title: 'Blog Post',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'title' } }),
    defineField({ name: 'body', type: 'array', of: [{ type: 'block' }] }),
    defineField({ name: 'publishedAt', type: 'datetime' }),
  ],
});
```

```typescript
// Fetching with GROQ in Next.js App Router
import { createClient } from 'next-sanity';

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: 'production',
  apiVersion: '2026-08-01',
  useCdn: true,
});

// Server Component
async function BlogPage() {
  const posts = await client.fetch(
    `*[_type == "post"] | order(publishedAt desc) {
      title, slug, publishedAt,
      "excerpt": array::join(string::split(pt::text(body), "")[0..200], "")
    }`
  );
  return <PostList posts={posts} />;
}
```

#### 2. Payload CMS 3.x Integration

```typescript
// payload.config.ts
import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';

export default buildConfig({
  db: postgresAdapter({ pool: { connectionString: process.env.DATABASE_URL! } }),
  editor: lexicalEditor(),
  collections: [
    {
      slug: 'posts',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'content', type: 'richText' },
        { name: 'status', type: 'select', options: ['draft', 'published'] },
      ],
    },
  ],
});
```

#### 3. Webhook Revalidation (Next.js)

```typescript
// app/api/revalidate/route.ts
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-webhook-secret');
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  revalidateTag(body._type); // Revalidate by content type
  return NextResponse.json({ revalidated: true });
}
```

#### 4. Preview Mode Pattern

```typescript
// app/api/draft/route.ts — Sanity preview
import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');
  const slug = searchParams.get('slug');
  if (secret !== process.env.SANITY_PREVIEW_SECRET) {
    return new Response('Invalid token', { status: 401 });
  }
  (await draftMode()).enable();
  redirect(`/posts/${slug}`);
}
```

### Production Checklist
- [ ] Webhook-based ISR revalidation configured.
- [ ] Preview/draft mode working with CMS studio.
- [ ] Image optimization pipeline (next/image or Sanity image URL builder).
- [ ] Content backup/export strategy defined.
- [ ] CORS and API permissions locked down.
- [ ] CDN caching for API responses configured.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
- **`nextjs-app-router-expert`**: Pola pengambilan konten SSR/ISR dan strategi caching.
- **`api-design-expert`**: Pola API REST/GraphQL untuk query CMS.
- **`seo`**: Data terstruktur, sitemap, dan sinkronisasi metadata CMS.
- **`astro-framework-expert`**: Content collections dan static site generation.

### Deskripsi
Panduan ahli untuk memilih, mengintegrasikan, dan mengoptimalkan platform Headless CMS dalam aplikasi web modern. Mencakup Sanity v3 (GROQ, Portable Text), Payload CMS 3.x (TypeScript-first, schema-as-code), Strapi 5 (open-source self-hosted), Contentful, dan Storyblok (visual editor). Termasuk modeling konten, preview mode, dan revalidasi instan berbasis webhook.

### Kondisi Pemicu
- Memilih dan mengintegrasikan headless CMS untuk aplikasi konten.
- Membangun situs web kaya konten (blog, portal media, dokumentasi, landing page).
- Menerapkan fitur live preview / draft mode di Next.js atau Astro.
- Mengonfigurasi revalidasi cache instan saat konten diterbitkan di CMS.

---

### Implementasi Pola Kunci (TypeScript)

#### 1. Definisi Skema Sanity v3 (Schema-as-Code)
```typescript
// sanity.config.ts
import { defineConfig, defineField, defineType } from 'sanity';

export const skemaArtikel = defineType({
  name: 'artikel',
  title: 'Artikel Blog',
  type: 'document',
  fields: [
    defineField({ name: 'judul', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'judul' } }),
    defineField({ name: 'isi', type: 'array', of: [{ type: 'block' }] }),
    defineField({ name: 'diterbitkanPada', type: 'datetime' }),
  ],
});
```

#### 2. Query GROQ di Next.js 15 Server Component
```typescript
import { createClient } from 'next-sanity';

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: 'production',
  apiVersion: '2026-08-01',
  useCdn: true,
});

export async function ambilDaftarArtikel() {
  return await sanity.fetch(
    `*[_type == "artikel"] | order(diterbitkanPada desc) {
      judul, slug, diterbitkanPada,
      "ringkasan": pt::text(isi)[0..200]
    }`
  );
}
```

#### 3. Revalidasi Cache Otomatis via Webhook Next.js
```typescript
// app/api/revalidasi/route.ts
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-webhook-secret');
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Tidak sah' }, { status: 401 });
  }
  const body = await req.json();
  revalidateTag(body._type); // Revalidasi cache berdasarkan tipe konten
  return NextResponse.json({ sukses: true });
}
```