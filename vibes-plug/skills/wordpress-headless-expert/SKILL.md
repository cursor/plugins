---
name: wordpress-headless-expert
description: "Expert guide for headless WordPress architecture — WPGraphQL, ACF Pro, Faust.js, Next.js/Astro frontend, webhooks, and caching / Panduan ahli arsitektur WordPress headless."
author: "Roedy Rustam"
version: "4.3.0"
---

# WordPress Headless Expert (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
- **`headless-cms-expert`**: Comparing and migrating between CMS backends.
- **`nextjs-app-router-expert`**: Next.js App Router integration with WPGraphQL.
- **`astro-framework-expert`**: Static site generation and content pipelines from WordPress.
- **`seo`**: Syncing Yoast SEO / Rank Math metadata to modern frontend head tags.
- **`performance-web-vitals`**: Caching and Edge SSR optimization for decoupled WordPress.

### Description
Production guide for architecting, deploying, and maintaining headless WordPress systems. Covers decoupled WordPress backends with WPGraphQL and Advanced Custom Fields (ACF Pro), frontend rendering with Next.js 15 or Astro 5, Faust.js framework integration, webhook-triggered on-demand revalidation, authentication (JWT / Application Passwords), and WooCommerce headless setups.

### Trigger Conditions
- Decoupling an existing WordPress site into a headless architecture with Next.js/Astro.
- Querying WordPress content using WPGraphQL and ACF Pro field groups.
- Synchronizing SEO metadata (Yoast / RankMath) with modern frontend metadata APIs.
- Setting up on-demand ISR revalidation hooks from WordPress publish events.

---

### Core Architecture & Patterns

#### 1. WPGraphQL Query Integration (Next.js 15 Server Component)
```typescript
const WP_GRAPHQL_ENDPOINT = process.env.WORDPRESS_API_URL || 'https://cms.example.com/graphql';

interface PostPreview {
  id: string;
  title: string;
  slug: string;
  date: string;
  excerpt: string;
  featuredImage?: {
    node: {
      sourceUrl: string;
      altText: string;
    };
  };
}

export async function fetchWordPressPosts(): Promise<PostPreview[]> {
  const query = `
    query GetLatestPosts {
      posts(first: 10, where: { orderby: { field: DATE, order: DESC } }) {
        nodes {
          id
          title
          slug
          date
          excerpt
          featuredImage {
            node {
              sourceUrl
              altText
            }
          }
        }
      }
    }
  `;

  const res = await fetch(WP_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
    next: { tags: ['wordpress:posts'], revalidate: 3600 },
  });

  const { data } = await res.json();
  return data?.posts?.nodes ?? [];
}
```

#### 2. Yoast / RankMath SEO Metadata Extraction
```typescript
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const query = `
    query GetPostSEO($slug: ID!) {
      post(id: $slug, idType: SLUG) {
        title
        seo {
          title
          metaDesc
          opengraphTitle
          opengraphDescription
          opengraphImage {
            sourceUrl
          }
        }
      }
    }
  `;

  const res = await fetch(WP_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { slug: params.slug } }),
  });

  const { data } = await res.json();
  const seo = data?.post?.seo;

  return {
    title: seo?.title || data?.post?.title,
    description: seo?.metaDesc,
    openGraph: {
      title: seo?.opengraphTitle,
      description: seo?.opengraphDescription,
      images: seo?.opengraphImage ? [{ url: seo.opengraphImage.sourceUrl }] : [],
    },
  };
}
```

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
- **`headless-cms-expert`**: Pemilihan dan perbandingan CMS backend.
- **`nextjs-app-router-expert`**: Integrasi Next.js App Router dengan query WPGraphQL.
- **`seo`**: Sinkronisasi data meta Yoast/RankMath ke tag metadata frontend modern.
- **`performance-web-vitals`**: Caching dan Edge SSR optimization untuk decoupled WordPress.

### Deskripsi
Panduan produksi untuk membangun dan memelihara arsitektur WordPress headless. Menggunakan WPGraphQL, ACF Pro, Faust.js, Next.js 15, atau Astro 5, revalidasi ISR instan via webhook, autentikasi aman, dan integrasi WooCommerce decoupled.

### Kondisi Pemicu
- Memisahkan frontend WordPress ke arsitektur decoupled (Next.js/Astro).
- Mengambil konten WordPress via WPGraphQL dan grup field ACF Pro.
- Mengonfigurasi revalidasi instan saat konten diterbitkan di WordPress.

---

### Implementasi Pola Kunci (TypeScript & Next.js 15)

```typescript
const WP_GRAPHQL_ENDPOINT = process.env.WORDPRESS_API_URL || 'https://cms.example.com/graphql';

export async function ambilArtikelWordPress() {
  const query = `
    query DapatkanArtikelTerbaru {
      posts(first: 10, where: { orderby: { field: DATE, order: DESC } }) {
        nodes {
          id
          title
          slug
          date
          excerpt
        }
      }
    }
  `;

  const res = await fetch(WP_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
    next: { tags: ['wordpress:artikel'], revalidate: 3600 },
  });

  const { data } = await res.json();
  return data?.posts?.nodes ?? [];
}
```