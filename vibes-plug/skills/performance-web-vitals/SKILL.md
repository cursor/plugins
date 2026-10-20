---
name: performance-web-vitals
description: "Expert guide for Web Performance optimization: Core Web Vitals (LCP, INP, CLS), bundle analysis, image optimization, rendering strategies, and Lighthouse score improvement / Panduan ahli untuk optimasi performa web: Core Web Vitals (LCP, INP, CLS), analisis bundle, optimasi gambar, strategi rendering, dan peningkatan skor Lighthouse."
author: "Roedy Rustam"
version: "4.3.0"
---

# Web Performance & Core Web Vitals Expert

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills like `brainstorming`, `zero-to-prod-orchestrator`, and `session-memory-manager` to ensure cohesive execution.

### Description
Expert guide for measuring, diagnosing, and optimizing web application performance with a focus on **Core Web Vitals** (LCP, INP, CLS), JavaScript bundle optimization, image and font loading strategies, rendering performance, and achieving high Lighthouse scores. Covers Next.js 15, React 19, and modern browser APIs.

### Trigger Conditions
- Improving Lighthouse performance score below 90.
- Diagnosing poor LCP, INP, or CLS metrics.
- Reducing JavaScript bundle size or eliminating render-blocking resources.
- Optimizing image loading, lazy loading, or font delivery.
- Implementing React performance patterns (memo, useDeferredValue, Suspense).
- Setting up Real User Monitoring (RUM) for Core Web Vitals.
- Optimizing server response times (TTFB).

---

### Core Web Vitals Targets (2026 Standards)

| Metric | Good | Needs Improvement | Poor | Measures |
|---|---|---|---|---|
| **LCP** (Largest Contentful Paint) | ≤ 2.5s | 2.5–4.0s | > 4.0s | Loading performance |
| **INP** (Interaction to Next Paint) | ≤ 200ms | 200–500ms | > 500ms | Interactivity (replaced FID) |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | 0.1–0.25 | > 0.25 | Visual stability |
| **FCP** (First Contentful Paint) | ≤ 1.8s | 1.8–3.0s | > 3.0s | Perceived loading |
| **TTFB** (Time to First Byte) | ≤ 800ms | 800–1800ms | > 1800ms | Server responsiveness |

---

### LCP Optimization Strategies

#### 1. Identify and Optimize the LCP Element
```typescript
// Measure LCP with web-vitals library
import { onLCP, onINP, onCLS } from 'web-vitals';

onLCP((metric) => {
  console.log('LCP:', metric.value, 'element:', metric.attribution.lcpEntry?.element);
  // Send to analytics
  sendToAnalytics({ name: metric.name, value: metric.value });
});
```

#### 2. Preload LCP Image (Hero Image)
```html
<!-- In <head> — preload the hero image before CSS blocks it -->
<link rel="preload" as="image" href="/hero.webp"
      imagesrcset="/hero-480.webp 480w, /hero-800.webp 800w"
      imagesizes="(max-width: 600px) 480px, 800px"
      fetchpriority="high">
```

#### 3. Next.js Image Component (LCP Hero)
```tsx
import Image from 'next/image';

// LCP image: priority=true + fill or explicit size
<Image
  src="/hero.webp"
  alt="Hero banner"
  width={1200}
  height={600}
  priority           // disables lazy loading, adds preload link
  fetchPriority="high"
  quality={85}
  sizes="(max-width: 768px) 100vw, 1200px"
/>

// Below-the-fold images: lazy load (default)
<Image
  src="/product.webp"
  alt="Product"
  width={400}
  height={300}
  // loading="lazy" is the default — no need to specify
/>
```

---

### INP Optimization Strategies

#### 1. Break Up Long Tasks
```typescript
// BAD: Long synchronous task blocks the main thread
function processLargeList(items: Item[]) {
  return items.map(expensiveTransform); // blocks for 500ms
}

// GOOD: Yield control back to browser between chunks
async function processLargeListAsync(items: Item[]) {
  const results: Result[] = [];
  for (let i = 0; i < items.length; i++) {
    results.push(expensiveTransform(items[i]));
    if (i % 50 === 0) await scheduler.yield(); // yield every 50 items
  }
  return results;
}
```

#### 2. React 19 — Concurrent Features for INP
```tsx
import { useTransition, useDeferredValue, startTransition } from 'react';

// Non-urgent state updates — mark as transitions
function SearchResults() {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);

  return (
    <>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value); // urgent: update input immediately
          startTransition(() => {
            // non-urgent: defer expensive filtering
          });
        }}
      />
      {isPending && <Spinner />}
      {/* deferredQuery triggers re-render without blocking input */}
      <ResultsList query={deferredQuery} />
    </>
  );
}
```

#### 3. Virtualize Long Lists
```tsx
// Use TanStack Virtual for large lists (1000+ items)
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // estimated row height in px
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((vItem) => (
          <div
            key={vItem.key}
            style={{ position: 'absolute', top: vItem.start, height: vItem.size }}
          >
            <ItemRow item={items[vItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### CLS Optimization Strategies

```css
/* 1. Reserve space for images with aspect-ratio */
img, video {
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9; /* prevents layout shift before load */
}

/* 2. Reserve space for dynamic content */
.ad-container {
  min-height: 250px; /* reserve ad slot height */
}

/* 3. Use font-display: optional or swap */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter.woff2') format('woff2');
  font-display: optional; /* no invisible text, no layout shift */
}
```

```tsx
// 4. Avoid inserting content above existing content
// BAD: inserting notification banner at top pushes content down
setShowBanner(true); // causes CLS

// GOOD: use position:fixed or reserve space at the top
<div className="h-12">{showBanner && <Banner />}</div>
```

---

### Bundle Optimization

#### Next.js Bundle Analysis
```bash
# Analyze bundle composition
ANALYZE=true npm run build
# Or use @next/bundle-analyzer
```

#### Code Splitting Patterns
```tsx
import dynamic from 'next/dynamic';

// Dynamic import — code splits automatically
const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // disable SSR for client-only components
});

// Lazy load with React.lazy (non-Next.js)
const Modal = React.lazy(() => import('./Modal'));
```

#### Tree-shaking Checklist
- Use named imports: `import { debounce } from 'lodash-es'` (not `import _ from 'lodash'`)
- Set `"sideEffects": false` in `package.json` for libraries.
- Avoid `import *` from large libraries.
- Replace `moment.js` with `date-fns` or `dayjs`.
- Use `sharp` for server-side image processing.

---

### React Performance Patterns

```tsx
// memo — skip re-render if props didn't change
const ExpensiveList = memo(({ items }: { items: Item[] }) => (
  <ul>{items.map((i) => <li key={i.id}>{i.name}</li>)}</ul>
));

// useCallback — stable function reference for memo children
const handleDelete = useCallback((id: string) => {
  setItems((prev) => prev.filter((i) => i.id !== id));
}, []); // empty deps = stable reference

// useMemo — memoize expensive calculations
const sortedItems = useMemo(
  () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
  [items]
);
```

---

### Performance Monitoring Setup

```typescript
// report-vitals.ts — send Core Web Vitals to analytics
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

function sendToAnalytics({ name, value, id, navigationType }: Metric) {
  // Send to PostHog, Google Analytics, or your own endpoint
  fetch('/api/analytics/vitals', {
    method: 'POST',
    body: JSON.stringify({ name, value: Math.round(value), id, navigationType }),
    keepalive: true, // ensures request completes even if page unloads
  });
}

onCLS(sendToAnalytics);
onINP(sendToAnalytics);
onLCP(sendToAnalytics);
onFCP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

---

### Lighthouse Score Improvement Checklist

- [ ] LCP image has `priority` or `fetchpriority="high"` + preload link.
- [ ] All non-LCP images use `loading="lazy"`.
- [ ] Fonts loaded with `font-display: optional` or preloaded with `rel="preload"`.
- [ ] No render-blocking `<script>` tags without `defer` or `async`.
- [ ] Bundle size < 200KB gzipped for initial JS.
- [ ] Images served in WebP/AVIF format with `srcset`.
- [ ] Server response time (TTFB) < 600ms — use CDN edge caching.
- [ ] Long tasks (> 50ms) are broken up or deferred.
- [ ] Virtual lists used for > 100 items.
- [ ] Unused CSS removed (PurgeCSS / Tailwind purge).
- [ ] HTTP/2 or HTTP/3 enabled on server.
- [ ] Resource hints: `dns-prefetch`, `preconnect` for third-party origins.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `brainstorming`, `zero-to-prod-orchestrator`, dan `session-memory-manager` untuk memastikan eksekusi yang kohesif.

### Deskripsi
Panduan ahli untuk mengukur, mendiagnosis, dan mengoptimalkan performa aplikasi web dengan fokus pada **Core Web Vitals** (LCP, INP, CLS), optimasi JavaScript bundle, strategi loading gambar dan font, performa rendering, dan mencapai skor Lighthouse yang tinggi.

### Kondisi Pemicu
- Meningkatkan skor Lighthouse di bawah 90.
- Mendiagnosis metrik LCP, INP, atau CLS yang buruk.
- Mengurangi ukuran JavaScript bundle atau menghilangkan resource yang memblokir render.
- Mengoptimalkan loading gambar, lazy loading, atau pengiriman font.
- Mengimplementasikan pola performa React (memo, useDeferredValue, Suspense).
- Menyiapkan Real User Monitoring (RUM) untuk Core Web Vitals.

### Target Core Web Vitals

| Metrik | Baik | Perlu Perbaikan | Buruk |
|---|---|---|---|
| **LCP** | ≤ 2,5 detik | 2,5–4,0 detik | > 4,0 detik |
| **INP** | ≤ 200ms | 200–500ms | > 500ms |
| **CLS** | ≤ 0,1 | 0,1–0,25 | > 0,25 |

### Ringkasan Strategi Optimasi

- **LCP**: Preload hero image, gunakan `priority` di Next.js Image, optimalkan TTFB dengan CDN.
- **INP**: Pecah long task dengan `scheduler.yield()`, gunakan `useTransition` React 19, virtualisasi list panjang.
- **CLS**: Reservasi ruang untuk gambar dengan `aspect-ratio`, hindari penyisipan konten di atas konten yang sudah ada.
- **Bundle**: Analisis bundle, gunakan dynamic import, tree-shaking, dan named imports.
- **Monitoring**: Implementasikan `web-vitals` library untuk melaporkan metrik ke analytics secara real-time.