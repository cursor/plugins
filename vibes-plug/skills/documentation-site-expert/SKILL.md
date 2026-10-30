---
name: documentation-site-expert
description: "Expert guide for technical documentation sites (Mintlify, Docusaurus, Storybook, VitePress) and component documentation / Panduan ahli situs dokumentasi teknis (Mintlify, Docusaurus, Storybook, VitePress) dan dokumentasi komponen."
author: "Roedy Rustam"
version: "4.3.0"
---

# Documentation Site Expert (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
- **`openapi-swagger-codegen-expert`**: Auto-generate API reference pages from OpenAPI 3.1 specs.
- **`design-system-architect`**: Component documentation and design token references with Storybook.
- **`astro-framework-expert`**: Astro Starlight as a full-featured docs site platform.
- **`seo`**: Documentation SEO — canonical URLs, sitemap.xml, structured data, and GEO.
- **`ci-cd-devops-architect`**: Automated deployment pipelines to Vercel, Cloudflare Pages, GitHub Pages.
- **`senior-frontend`**: Custom MDX components, interactive playgrounds, and React-based doc UIs.
- **`search-engine-expert`**: Algolia DocSearch, Pagefind, and Typesense integration for doc search.
- **`global-a11y-i18n-expert`**: i18n multi-language documentation and WCAG-compliant doc sites.

### Description
Expert guide for building production-grade technical documentation sites and component libraries. Covers **Mintlify** (AI-native SaaS docs), **Docusaurus 3** (React/OSS), **Storybook 8** (component playground), **VitePress 2** (Vue-powered), and **Astro Starlight** (content-heavy i18n). Includes API reference generation, versioning strategies, search integration, Chromatic visual testing, and CI/CD deployment workflows.

### Trigger Conditions
- Creating documentation sites for APIs, libraries, or SaaS products.
- Setting up Storybook for component documentation and visual regression.
- Choosing a documentation framework for an open-source project.
- Generating API reference docs from OpenAPI specs.
- Migrating from legacy docs (GitBook, Confluence, readme.io) to modern static sites.
- Adding versioning, search, or i18n to an existing documentation site.

---

### Framework Selection Matrix

| Framework      | Stack        | AI Search    | Versioning | i18n | Best For                         |
|----------------|--------------|--------------|------------|------|----------------------------------|
| Mintlify       | React / MDX  | ✅ AI Native  | ✅          | ✅   | SaaS API docs, commercial products |
| Docusaurus 3   | React / MDX  | ✅ Algolia    | ✅          | ✅   | Open-source projects             |
| Storybook 8    | Any framework| ❌            | ❌          | ❌   | UI component library playground  |
| VitePress 2    | Vue / MD     | ✅ Built-in   | ❌          | ✅   | Vue ecosystem / library docs     |
| Astro Starlight| Astro / MDX  | ✅ Pagefind   | ✅          | ✅   | Content-heavy multi-lang docs    |

**Decision Rule:**
- SaaS product → **Mintlify** (zero-config, AI search, API playground)
- OSS library → **Docusaurus** (versioning + Algolia + community plugins)
- Component library → **Storybook** (visual testing + interactions + Chromatic)
- Vue project → **VitePress** (native Vue integration, blazing fast)
- Content-heavy / i18n-first → **Astro Starlight** (Pagefind, i18n routing)

---

## 1. Mintlify

### `mint.json` — Complete Configuration

```json
{
  "name": "Acme API",
  "logo": {
    "light": "/logo/light.svg",
    "dark": "/logo/dark.svg"
  },
  "favicon": "/favicon.svg",
  "colors": {
    "primary": "#0D9373",
    "light": "#07C983",
    "dark": "#0D9373",
    "anchors": { "from": "#0D9373", "to": "#07C983" }
  },
  "topbarLinks": [
    { "name": "Support", "url": "mailto:support@acme.com" }
  ],
  "topbarCtaButton": {
    "name": "Dashboard",
    "url": "https://app.acme.com"
  },
  "tabs": [
    { "name": "API Reference", "url": "api-reference" }
  ],
  "anchors": [
    { "name": "Changelog", "icon": "list", "url": "changelog" },
    { "name": "GitHub", "icon": "github", "url": "https://github.com/acme/api" }
  ],
  "navigation": [
    {
      "group": "Getting Started",
      "pages": ["introduction", "quickstart", "authentication"]
    },
    {
      "group": "Guides",
      "pages": ["guides/webhooks", "guides/pagination", "guides/rate-limits"]
    },
    {
      "group": "API Reference",
      "pages": ["api-reference/introduction", "api-reference/endpoints/users", "api-reference/endpoints/payments"]
    }
  ],
  "openapi": "https://api.acme.com/openapi.json",
  "api": {
    "baseUrl": "https://api.acme.com/v1",
    "auth": {
      "method": "bearer"
    },
    "playground": { "mode": "show" }
  },
  "feedback": { "thumbsRating": true, "suggestEdit": true },
  "search": { "prompt": "Search Acme docs..." },
  "footerSocials": {
    "twitter": "https://twitter.com/acme",
    "github": "https://github.com/acme"
  }
}
```

### MDX Authoring with Custom Components

```mdx
---
title: "Authentication"
description: "Secure your API requests with Bearer tokens."
---

import { Note, Warning, CodeGroup } from 'mintlify/components';

<Note>
  All API requests require an `Authorization: Bearer <token>` header.
</Note>

<Warning>
  Never expose your API secret in client-side code or version control.
</Warning>

## Obtaining an API Key

Navigate to **Settings → API Keys** in your dashboard and click **Create Key**.

<CodeGroup>
```bash cURL
curl https://api.acme.com/v1/users \
  -H "Authorization: Bearer $ACME_API_KEY"
```

```typescript TypeScript
import AcmeClient from '@acme/sdk';

const client = new AcmeClient({ apiKey: process.env.ACME_API_KEY });
const users = await client.users.list();
```
</CodeGroup>
```

### API Playground Auto-Generation from OpenAPI

```bash
# Mintlify CLI — scrape OpenAPI and generate MDX stubs
npm install -g mintlify
mintlify dev             # local preview at http://localhost:3000
mintlify scrape          # auto-generate pages from openapi field in mint.json
```

Mintlify reads the `"openapi"` field in `mint.json` and auto-generates interactive API reference pages with a live request playground, response schema viewer, and try-it UI — zero additional MDX authoring required.

---

## 2. Docusaurus 3

### `docusaurus.config.ts` — Production-Ready Example

```typescript
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Acme Docs',
  tagline: 'The fastest way to build on Acme',
  favicon: 'img/favicon.ico',
  url: 'https://docs.acme.com',
  baseUrl: '/',
  organizationName: 'acme',
  projectName: 'acme-docs',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'id', 'ja'],
  },
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/acme/docs/tree/main/',
          showLastUpdateTime: true,
          showLastUpdateAuthor: true,
          versions: {
            current: { label: 'v3 (Next)', path: 'next', banner: 'unreleased' },
          },
          lastVersion: 'v2',
        },
        blog: {
          showReadingTime: true,
          feedOptions: { type: ['rss', 'atom'], xslt: true },
        },
        theme: {
          customCss: './src/css/custom.css',
        },
        sitemap: { changefreq: 'weekly', priority: 0.5 },
      } satisfies Preset.Options,
    ],
  ],
  plugins: [
    [
      'docusaurus-plugin-openapi-docs',
      {
        id: 'api',
        docsPluginId: 'classic',
        config: {
          acme: {
            specPath: 'openapi/acme.yaml',
            outputDir: 'docs/api',
            sidebarOptions: { groupPathsBy: 'tag', categoryLinkSource: 'tag' },
          },
        },
      },
    ],
    ['@docusaurus/plugin-ideal-image', { max: 1030, min: 640, steps: 2 }],
  ],
  themeConfig: {
    algolia: {
      appId: 'YOUR_APP_ID',
      apiKey: 'YOUR_SEARCH_API_KEY',
      indexName: 'acme_docs',
      contextualSearch: true,
      searchPagePath: 'search',
    },
    prism: {
      theme: { plain: {}, styles: [] },
      additionalLanguages: ['bash', 'json', 'yaml', 'typescript'],
    },
    navbar: {
      title: 'Acme',
      logo: { alt: 'Acme Logo', src: 'img/logo.svg' },
      items: [
        { type: 'docsVersionDropdown', position: 'left' },
        { type: 'localeDropdown', position: 'right' },
        { href: 'https://github.com/acme/docs', label: 'GitHub', position: 'right' },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        { title: 'Docs', items: [{ label: 'Getting Started', to: '/docs/intro' }] },
        { title: 'Community', items: [{ label: 'Discord', href: 'https://discord.gg/acme' }] },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Acme, Inc.`,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
```

### Versioning Strategy

```bash
# Create a new versioned snapshot (freezes current /docs)
npm run docusaurus docs:version 2.0.0

# Resulting structure:
# versioned_docs/version-2.0.0/   ← frozen snapshot
# versioned_sidebars/version-2.0.0-sidebars.json
# versions.json                   ← ["2.0.0"]
# docs/                           ← "next" (unreleased)
```

### Algolia DocSearch Integration

```bash
# Request free DocSearch tier at: https://docsearch.algolia.com/apply
# Then install crawler config:
npm install @algolia/client-search
```

```javascript
// algolia-crawler-config.js (submitted to Algolia dashboard)
new Crawler({
  appId: 'YOUR_APP_ID',
  apiKey: 'YOUR_WRITE_API_KEY',
  rateLimit: 8,
  startUrls: ['https://docs.acme.com/'],
  renderJavaScript: false,
  sitemaps: ['https://docs.acme.com/sitemap.xml'],
  ignoreCanonicalTo: true,
  discoveryPatterns: ['https://docs.acme.com/**'],
  actions: [{
    indexName: 'acme_docs',
    pathsToMatch: ['https://docs.acme.com/**'],
    recordExtractor: ({ $, helpers }) => {
      return helpers.docsearch({
        recordProps: {
          lvl1: ['header h1', 'article h1', 'main h1'],
          content: ['article p, article li', 'main p, main li'],
        },
        indexHeadings: true,
      });
    },
  }],
  initialIndexSettings: {
    acme_docs: {
      attributesForFaceting: ['type', 'lang', 'version'],
      attributesToRetrieve: ['hierarchy', 'content', 'anchor', 'url'],
      attributesToHighlight: ['hierarchy', 'content'],
      attributesToSnippet: ['content:10'],
      searchableAttributes: ['unordered(hierarchy.lvl0)', 'content'],
      distinct: true,
      attributeForDistinct: 'url',
      ranking: ['words', 'filters', 'typo', 'attribute', 'proximity', 'exact', 'custom'],
    },
  },
});
```

### MDX Plugins

```bash
npm install remark-math rehype-katex remark-gfm rehype-mermaid
```

```typescript
// docusaurus.config.ts — add to docs preset options:
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// inside docs preset:
remarkPlugins: [remarkMath],
rehypePlugins: [rehypeKatex],
```

---

## 3. Storybook 8

### Installation & Autodocs

```bash
# Initialize Storybook in an existing project
npx storybook@latest init

# Start dev server
npm run storybook

# Build static site
npm run build-storybook
```

### Story with Interaction Testing

```typescript
// src/components/Button/Button.stories.ts
import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';
import { Button } from './Button';

const meta = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost'] },
    size: { control: 'radio', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { variant: 'primary', size: 'md', children: 'Click me' },
};

export const InteractionTest: Story = {
  args: { variant: 'primary', children: 'Submit' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /submit/i });
    await userEvent.click(button);
    await expect(button).toBeInTheDocument();
  },
};
```

### `.storybook/main.ts` — Addon Ecosystem

```typescript
import type { StorybookConfig } from '@storybook/nextjs';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-onboarding',
    '@storybook/addon-links',
    '@storybook/addon-essentials',      // Controls, Docs, Actions, Viewport, Backgrounds
    '@storybook/addon-interactions',    // play() function testing
    '@storybook/addon-a11y',            // Axe-core accessibility audit
    '@chromatic-com/storybook',         // Chromatic visual testing
    '@storybook/addon-themes',          // Light/Dark theme switching
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  docs: { autodocs: 'tag' },
  staticDirs: ['../public'],
};

export default config;
```

### Chromatic Visual Testing

```bash
npm install --save-dev chromatic

# Run visual regression against baseline
npx chromatic --project-token=<your-token>

# CI flag — accept changes automatically on main branch
npx chromatic --project-token=<your-token> --auto-accept-changes main
```

```yaml
# .github/workflows/chromatic.yml
name: Chromatic
on: push
jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'npm' }
      - run: npm ci
      - name: Run Chromatic
        uses: chromaui/action@v11
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          exitZeroOnChanges: true
```

---

## 4. VitePress 2

### `docs/.vitepress/config.mts`

```typescript
import { defineConfig } from 'vitepress';

export default defineConfig({
  lang: 'en-US',
  title: 'Acme Library',
  description: 'A powerful TypeScript utility library.',
  lastUpdated: true,
  cleanUrls: true,
  srcDir: './src',
  outDir: '../dist-docs',

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#5f67ee' }],
    ['meta', { property: 'og:type', content: 'website' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Guide', link: '/guide/what-is-acme' },
      { text: 'Reference', link: '/reference/config' },
      {
        text: 'v2.0',
        items: [
          { text: 'v1.x Docs', link: 'https://v1.acme.dev' },
          { text: 'Changelog', link: '/changelog' },
        ],
      },
    ],
    sidebar: {
      '/guide/': [
        { text: 'Introduction', items: [
          { text: 'What is Acme?', link: '/guide/what-is-acme' },
          { text: 'Getting Started', link: '/guide/getting-started' },
        ]},
        { text: 'Advanced', items: [
          { text: 'Configuration', link: '/guide/configuration' },
          { text: 'Plugin API', link: '/guide/plugin-api' },
        ]},
      ],
    },
    editLink: {
      pattern: 'https://github.com/acme/lib/edit/main/docs/src/:path',
      text: 'Edit this page on GitHub',
    },
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: 'https://github.com/acme/lib' }],
  },

  locales: {
    root: { label: 'English', lang: 'en' },
    id: { label: 'Bahasa Indonesia', lang: 'id', link: '/id/', themeConfig: {
      nav: [{ text: 'Panduan', link: '/id/guide/what-is-acme' }],
    }},
  },
});
```

### Vue 3 Custom Theme Component

```vue
<!-- docs/.vitepress/theme/components/ApiPreview.vue -->
<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{ endpoint: string; method?: 'GET' | 'POST' }>();
const response = ref<string | null>(null);

async function runRequest() {
  const res = await fetch(props.endpoint, { method: props.method ?? 'GET' });
  response.value = JSON.stringify(await res.json(), null, 2);
}
</script>

<template>
  <div class="api-preview">
    <div class="controls">
      <span class="method">{{ method ?? 'GET' }}</span>
      <code class="endpoint">{{ endpoint }}</code>
      <button @click="runRequest">Run</button>
    </div>
    <pre v-if="response" class="response">{{ response }}</pre>
  </div>
</template>
```

```typescript
// docs/.vitepress/theme/index.ts
import DefaultTheme from 'vitepress/theme';
import ApiPreview from './components/ApiPreview.vue';
import type { Theme } from 'vitepress';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ApiPreview', ApiPreview);
  },
} satisfies Theme;
```

---

## 5. Astro Starlight

### Installation & Sidebar Config

```bash
npm create astro@latest -- --template starlight
```

```typescript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  integrations: [
    starlight({
      title: 'Acme Docs',
      logo: { src: './src/assets/logo.svg' },
      social: { github: 'https://github.com/acme/acme' },
      defaultLocale: 'root',
      locales: {
        root: { label: 'English', lang: 'en' },
        id: { label: 'Bahasa Indonesia', lang: 'id' },
        ja: { label: '日本語', lang: 'ja' },
      },
      sidebar: [
        { label: 'Start Here', items: [
          { label: 'Introduction', link: '/intro/' },
          { label: 'Installation', link: '/install/' },
        ]},
        { label: 'Guides', autogenerate: { directory: 'guides' } },
        { label: 'Reference', autogenerate: { directory: 'reference' } },
      ],
      editLink: { baseUrl: 'https://github.com/acme/docs/edit/main/' },
      lastUpdated: true,
      pagination: true,
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 4 },
      customCss: ['./src/styles/custom.css'],
      components: {
        SiteTitle: './src/components/CustomSiteTitle.astro',
      },
    }),
  ],
});
```

### Pagefind Search Configuration

Starlight ships with **Pagefind** out of the box — zero config needed. Pagefind runs at build time and creates a client-side search index from your HTML output.

```bash
# Build triggers Pagefind indexing automatically
npm run build

# Pagefind index output: dist/pagefind/
# Bundle size: ~8 KB JS + compressed index shards
```

### i18n MDX Page Structure

```
src/content/docs/
├── intro.mdx              ← English (root locale)
├── install.mdx
├── guides/
│   └── quickstart.mdx
└── id/                    ← Bahasa Indonesia
    ├── intro.mdx
    ├── install.mdx
    └── guides/
        └── quickstart.mdx
```

```mdx
---
# src/content/docs/id/intro.mdx
title: Pengantar
description: Selamat datang di dokumentasi Acme.
---

Acme adalah library TypeScript berkinerja tinggi untuk membangun pipeline data modern.

## Fitur Utama

- ⚡ **Performa tinggi** — dioptimalkan untuk throughput jutaan record per detik
- 🔒 **Type-safe** — dibangun dengan TypeScript strict mode
- 🧩 **Modular** — gunakan hanya modul yang Anda butuhkan
```

---

## 6. Content Architecture Best Practices

### Versioning Strategy

| Strategy | When to Use | Tool |
|----------|-------------|------|
| Path-based (`/v1/`, `/v2/`) | REST API with major breaking changes | Mintlify tabs, Docusaurus versions |
| Branch-based | Older maintained releases | `docusaurus docs:version` |
| Monorepo package versioning | Multi-package libs | Changesets + VitePress |
| Date-based | SDKs with frequent patch releases | Changelog + semver badges |

### Changelog Automation with Changesets

```bash
npm install --save-dev @changesets/cli @changesets/changelog-github
npx changeset init

# Add a changeset (run after each PR)
npx changeset add

# Release: bump versions + update CHANGELOG.md
npx changeset version
npx changeset publish
```

```json
// .changeset/config.json
{
  "$schema": "https://unpkg.com/@changesets/config/schema.json",
  "changelog": ["@changesets/changelog-github", { "repo": "acme/lib" }],
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

### API Reference via `openapi-typescript`

```bash
npm install --save-dev openapi-typescript typescript

# Generate types from live spec or local file
npx openapi-typescript https://api.acme.com/openapi.json -o src/types/api.d.ts
npx openapi-typescript ./openapi/acme.yaml -o src/types/api.d.ts
```

```typescript
// src/lib/api-client.ts — type-safe API client from generated types
import createClient from 'openapi-fetch';
import type { paths } from '../types/api';

export const apiClient = createClient<paths>({
  baseUrl: 'https://api.acme.com/v1',
  headers: { Authorization: `Bearer ${process.env.API_KEY}` },
});

// Fully typed request — IDE autocomplete for paths, params, and response
const { data, error } = await apiClient.GET('/users/{id}', {
  params: { path: { id: '123' } },
});
```

---

## 7. Deployment

### Vercel (Recommended for Mintlify + Docusaurus + VitePress)

```json
// vercel.json — Docusaurus / VitePress
{
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "framework": null,
  "rewrites": [{ "source": "/(.*)", "destination": "/$1" }],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

### Cloudflare Pages

```yaml
# Build settings (Cloudflare Dashboard → Pages → Build & deployments)
# Build command:  npm run build
# Output dir:     build        (Docusaurus) | dist (VitePress/Starlight)
# Node.js:        22.x
```

```toml
# wrangler.toml — for Workers + Pages hybrid
name = "acme-docs"
compatibility_date = "2026-01-01"

[site]
bucket = "./build"
```

### GitHub Pages Workflow

```yaml
# .github/workflows/deploy-docs.yml
name: Deploy Docs
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'npm' }
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: build }

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

---

## Orchestration & Integration
- `openapi-swagger-codegen-expert` — API reference auto-generation
- `design-system-architect` — design token docs, Storybook integration
- `astro-framework-expert` — Starlight configuration
- `seo` — sitemap, canonical, structured data
- `ci-cd-devops-architect` — automated deployment pipelines
- `global-a11y-i18n-expert` — multi-language documentation
- `search-engine-expert` — Algolia, Pagefind, Typesense

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
- **`openapi-swagger-codegen-expert`**: Otomatisasi halaman referensi API dari spesifikasi OpenAPI 3.1.
- **`design-system-architect`**: Dokumentasi komponen dan referensi design token dengan Storybook.
- **`astro-framework-expert`**: Astro Starlight sebagai platform situs dokumentasi lengkap.
- **`seo`**: SEO dokumentasi — canonical URL, sitemap.xml, structured data, dan GEO.
- **`ci-cd-devops-architect`**: Pipeline deployment otomatis ke Vercel, Cloudflare Pages, GitHub Pages.
- **`senior-frontend`**: Komponen MDX kustom, playground interaktif, dan UI dokumentasi berbasis React.
- **`global-a11y-i18n-expert`**: Dokumentasi multi-bahasa i18n dan situs dokumentasi sesuai WCAG.

### Deskripsi
Panduan ahli untuk membangun situs dokumentasi teknis tingkat produksi dan library komponen. Mencakup **Mintlify** (docs SaaS AI-native), **Docusaurus 3** (React/OSS), **Storybook 8** (playground komponen), **VitePress 2** (berbasis Vue), dan **Astro Starlight** (konten berat dengan i18n). Termasuk panduan generasi referensi API, strategi versioning, integrasi pencarian, pengujian visual Chromatic, dan workflow CI/CD deployment.

### Kondisi Pemicu
- Membuat situs dokumentasi untuk API, library, atau produk SaaS.
- Menyiapkan Storybook untuk dokumentasi komponen dan regresi visual.
- Memilih framework dokumentasi untuk proyek open-source.
- Menghasilkan halaman referensi API dari spesifikasi OpenAPI.
- Migrasi dari dokumentasi lama (GitBook, Confluence) ke situs statis modern.
- Menambahkan versioning, pencarian, atau i18n ke situs dokumentasi yang sudah ada.

---

### Matriks Pemilihan Framework

| Framework      | Stack        | Pencarian AI | Versioning | i18n | Terbaik Untuk                      |
|----------------|--------------|--------------|------------|------|------------------------------------|
| Mintlify       | React / MDX  | ✅ AI Native  | ✅          | ✅   | Docs API SaaS, produk komersial    |
| Docusaurus 3   | React / MDX  | ✅ Algolia    | ✅          | ✅   | Proyek open-source                 |
| Storybook 8    | Semua stack  | ❌            | ❌          | ❌   | Playground library komponen UI     |
| VitePress 2    | Vue / MD     | ✅ Bawaan     | ❌          | ✅   | Ekosistem Vue / docs library       |
| Astro Starlight| Astro / MDX  | ✅ Pagefind   | ✅          | ✅   | Docs konten berat multi-bahasa     |

**Aturan Keputusan:**
- Produk SaaS → **Mintlify** (zero-config, pencarian AI, playground API)
- Library OSS → **Docusaurus** (versioning + Algolia + plugin komunitas)
- Library komponen → **Storybook** (visual testing + interaksi + Chromatic)
- Proyek Vue → **VitePress** (integrasi Vue native, sangat cepat)
- Konten berat / i18n-first → **Astro Starlight** (Pagefind, routing i18n)

---

### 1. Mintlify — Ringkasan Konfigurasi

File `mint.json` mengontrol seluruh navigasi, branding, dan integrasi API playground. Field `"openapi"` menunjuk ke spesifikasi OpenAPI dan secara otomatis menghasilkan halaman referensi interaktif — tidak perlu authoring MDX tambahan untuk setiap endpoint.

```bash
npm install -g mintlify
mintlify dev        # pratinjau lokal di http://localhost:3000
mintlify scrape     # hasilkan halaman dari field openapi di mint.json
```

**Komponen MDX bawaan:** `<Note>`, `<Warning>`, `<Tip>`, `<Info>`, `<CodeGroup>`, `<Accordion>`, `<Card>`, `<CardGroup>`, `<Steps>`, `<Tabs>` — langsung digunakan dalam file `.mdx` tanpa import.

---

### 2. Docusaurus 3 — Ringkasan

Docusaurus adalah pilihan terbaik untuk proyek open-source karena mendukung:
- **Versioning**: `npm run docusaurus docs:version 2.0.0` membuat snapshot beku dari `/docs` saat ini.
- **Algolia DocSearch**: Gratis untuk proyek OSS — daftar di `https://docsearch.algolia.com/apply`.
- **Plugin MDX**: `remark-math` + `rehype-katex` untuk LaTeX, `rehype-mermaid` untuk diagram.
- **Plugin OpenAPI**: `docusaurus-plugin-openapi-docs` menghasilkan halaman referensi dari spec YAML.

---

### 3. Storybook 8 — Ringkasan

Storybook adalah standar industri untuk mendokumentasikan dan menguji komponen UI secara visual.

**Fitur Utama:**
- **Autodocs**: Tambahkan `tags: ['autodocs']` ke meta story — halaman dokumentasi otomatis dihasilkan dari props TypeScript.
- **Interaction Testing**: Gunakan `play()` dengan `@storybook/test` untuk mensimulasikan interaksi pengguna dan memverifikasi perilaku komponen.
- **Chromatic**: Layanan visual regression testing — tangkap perubahan UI yang tidak disengaja di setiap PR.
- **Addon Aksesibilitas**: `@storybook/addon-a11y` menjalankan audit axe-core pada setiap story.

---

### 4. VitePress 2 — Ringkasan

VitePress adalah pilihan ideal untuk ekosistem Vue atau proyek library TypeScript yang membutuhkan dokumentasi cepat.

- File konfigurasi: `docs/.vitepress/config.mts` (TypeScript penuh)
- Pencarian lokal bawaan — tidak perlu Algolia untuk proyek kecil/menengah
- Integrasi komponen Vue langsung dalam halaman Markdown
- Dukungan i18n multi-bahasa melalui konfigurasi `locales`

---

### 5. Astro Starlight — Ringkasan

Starlight dibangun di atas Astro dan merupakan pilihan terbaik untuk dokumentasi konten berat dengan i18n.

- **Pagefind**: Pencarian statis client-side — dihasilkan saat build, ukuran bundle ~8KB JS.
- **i18n**: Dukung banyak bahasa dengan routing otomatis (`/id/`, `/ja/`, dll.)
- **Sidebar otomatis**: `autogenerate: { directory: 'guides' }` membuat sidebar dari struktur folder.
- **Edit di GitHub**: Link "Edit halaman ini" otomatis dihasilkan dari konfigurasi `editLink`.

---

### 6. Arsitektur Konten — Praktik Terbaik

**Strategi Versioning:**
- Gunakan `docusaurus docs:version` untuk snapshot rilis beku.
- Gunakan **Changesets** (`@changesets/cli`) untuk otomatisasi changelog dan bumping versi package.
- Sertakan badge versi semver di halaman utama docs.

**Otomatisasi Changelog:**
```bash
npx changeset add       # tambahkan changeset setelah setiap PR
npx changeset version   # bump versi + update CHANGELOG.md
npx changeset publish   # publish ke npm
```

**Referensi API via `openapi-typescript`:**
```bash
npx openapi-typescript https://api.acme.com/openapi.json -o src/types/api.d.ts
```
Hasilkan tipe TypeScript penuh dari spesifikasi OpenAPI — gunakan bersama `openapi-fetch` untuk client API yang fully type-safe.

---

### 7. Deployment

| Platform         | Perintah Build                | Output Dir              | Catatan                          |
|------------------|-------------------------------|-------------------------|----------------------------------|
| Vercel           | `npm run build`               | `build` / `dist`        | Zero-config untuk Docusaurus      |
| Cloudflare Pages | `npm run build`               | `build` / `dist`        | Konfigurasi via dashboard         |
| GitHub Pages     | `npm run build`               | `build`                 | Gunakan workflow Actions di atas  |
| Netlify          | `npm run build`               | `build`                 | Tambahkan `netlify.toml`          |

**Mintlify** di-deploy melalui platform Mintlify sendiri — hubungkan repo GitHub di dashboard `mintlify.com` dan setiap push ke `main` otomatis men-deploy.