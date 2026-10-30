---
name: mpa-orchestrator
description: "Orchestrates Multi-Page Application (MPA) architecture within a single repository, integrating with relevant skills / Mengorkestrasi arsitektur Multi-Page Application (MPA) dalam satu repositori, terintegrasi dengan skill relevan lainnya."
author: "Roedy Rustam"
version: "4.3.0"
---

# Multi-Page Application (MPA) Orchestrator (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills like `htmx-hypermedia-expert`, `brainstorming`, `zero-to-prod-orchestrator`, and `session-memory-manager` to ensure cohesive execution.

### Description
A structured approach for building and orchestrating Multi-Page Application (MPA) architectures within a single repository. Acts as an orchestrator connecting MPA principles with specialized skills (like `mvc-expert`, `saas-multi-tenant`, `senior-frontend`) to deliver cohesive, server-rendered applications. In 2026, MPAs are increasingly built with **Astro 5** for content-heavy sites or **traditional server frameworks** (Laravel, Django, Go) augmented with **HTMX 2** or **Alpine.js** for interactivity.

### Core MPA Principles in a Single Repository
1. **Centralized Architecture**: Frontend views, backend logic, and routing in a unified codebase — simplifies deployment and reduces cognitive load.
2. **Server-Side Routing & Rendering**: A Front Controller intercepts requests, fetches data, and renders complete HTML per route. Options in 2026:
   - **Astro 5**: Best for content-heavy sites — renders to static HTML by default, hydrates islands on demand.
   - **Next.js 15 (Pages Router)**: Traditional MPA feel with React components.
   - **Backend-driven**: Laravel/Django/Gin templates rendered server-side.
3. **Islands Architecture (Astro 5)**:
   - Render 100% static HTML for non-interactive content.
   - Use `client:load`, `client:idle`, or `client:visible` directives to hydrate interactive islands only when needed.
   - Supports React, Vue, Svelte, Solid, or vanilla JS islands side by side.
4. **HTMX 2 — HTML-First Interactivity**:
   - Enhance any server-rendered page with partial HTML swaps without writing JavaScript.
   - Works with any backend — Django, Laravel, Go, Node.js.
   - `hx-get`, `hx-post`, `hx-target`, `hx-swap` for declarative AJAX.
5. **Shared UI Ecosystem**:
   - Maintain a `layouts/` directory for base HTML structures.
   - Maintain a `components/` directory for reusable UI elements.
6. **Asset Management**: Centralize static assets in `public/`. Implement cache-busting for production.
7. **Session-based State**: Use secure HTTP-only cookies and server sessions for auth, tenant context, and flash messages.

### Bundler & Multi-Entry Configuration
In a modern frontend context (especially for MPAs), define multiple entry points in the bundler configuration. This generates separate, optimized JavaScript and CSS bundles for the public site versus the complex admin dashboard, drastically reducing overall payload sizes for general users.

**Implementation Checklist:**
- [ ] Create separate HTML entry points in the root/public directory (e.g., `index.html`, `admin.html`).
- [ ] Configure the frontend bundler (Vite/Webpack) to output multiple bundles.
- [ ] Set up server-side routing (Nginx or Node.js) to serve the correct entry HTML based on the URL path.
- [ ] Ensure shared components and utilities are properly tree-shaken and split into common chunks.

**Example: Vite Config for Multiple Entries**
```javascript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        app: resolve(__dirname, 'app.html')
      }
    }
  }
});
```

### Framework Selection Guide

| Need | Recommended Stack |
|---|---|
| Content site / Blog / Docs | **Astro 5** + MDX + Tailwind v4 |
| Full server-rendered app (PHP) | **Laravel 11** + Livewire 3 / Alpine.js |
| Full server-rendered app (Python) | **Django 5** + HTMX 2 + Alpine.js |
| Full server-rendered app (Go) | **Templ** + HTMX 2 + Tailwind v4 |
| React MPA with SSR | **Next.js 15** Pages Router or App Router |

### Orchestration Guidelines
- **With `htmx-hypermedia-expert`**: MUST execute FIRST before any HTML/CSS task to ensure modern frontend standards.
- **With `mvc-expert`**: Enforce MVC pattern — Controllers handle logic, Views handle rendering.
- **With `saas-multi-tenant`**: Integrate tenant identification in core routing middleware — every page load initializes `tenant_id` context securely.
- **With `senior-frontend` / `ui-ux-pro-max`**: Enhance with Alpine.js for reactive UI or HTMX 2 for HTML-driven partial updates — no heavy client-side bundles.
- **With `seo`**: Maximize MPA's inherent SEO advantages — every page returns fully populated HTML, correct meta tags, and Schema.org JSON-LD on initial load.
- **vs `spa-orchestrator`**: Choose MPA when SEO is critical, data is mostly read-heavy, and complex client-side state is not required. Choose SPA when the app is highly interactive and session-based (like dashboards).

### Trigger Conditions
- Building a web application using the Multi-Page Application (MPA) approach in a single repository.
- Refactoring or migrating an existing app to a centralized MPA architecture.
- Building content sites, marketing pages, or SEO-critical applications.
- Using Astro 5 for static or content-heavy sites with optional interactive islands.
- Adding interactivity to server-rendered pages with HTMX 2 without a full SPA rewrite.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `htmx-hypermedia-expert`, `brainstorming`, `zero-to-prod-orchestrator`, dan `session-memory-manager` untuk memastikan eksekusi yang kohesif.

### Deskripsi
Pendekatan terstruktur untuk membangun dan mengorkestrasi arsitektur Multi-Page Application (MPA) di dalam satu repositori. Bertindak sebagai orkestrator yang menghubungkan prinsip MPA dengan skill spesialis lain untuk menghasilkan aplikasi server-rendered yang kohesif dan modern. Di 2026, MPA semakin banyak dibangun dengan **Astro 5** untuk situs konten-berat atau framework server tradisional yang diperkuat dengan **HTMX 2** atau **Alpine.js**.

### Prinsip Inti MPA
1. **Arsitektur Terpusat**: View frontend, logika backend, dan routing dalam satu codebase.
2. **Routing & Rendering Sisi Server**: Front Controller menangkap permintaan, mengambil data, dan me-render HTML lengkap per rute.
3. **Islands Architecture (Astro 5)**: Render HTML statis 100% secara default, hidrate island interaktif hanya saat diperlukan.
4. **HTMX 2 — Interaktivitas HTML-First**: Tingkatkan halaman server-rendered dengan pertukaran HTML parsial tanpa menulis JavaScript.
5. **Ekosistem UI Bersama**: Direktori `layouts/` dan `components/` untuk elemen UI yang dapat digunakan kembali.
6. **State Berbasis Session**: Cookie HTTP-only dan session sisi server untuk autentikasi dan konteks tenant.

### Konfigurasi Bundler & Multi-Entry
Dalam konteks frontend modern (khususnya untuk MPA), tentukan beberapa *entry points* pada konfigurasi *bundler*. Ini akan menghasilkan bundel JavaScript dan CSS yang terpisah dan optimal antara situs publik dan dashboard admin, sehingga secara drastis mengurangi ukuran *payload* bagi pengguna umum.

**Checklist Implementasi:**
- [ ] Buat titik entri HTML terpisah di direktori utama/publik (misal: `index.html`, `admin.html`).
- [ ] Konfigurasi bundler frontend (Vite/Webpack) untuk menghasilkan multiple bundle.
- [ ] Siapkan routing di sisi server (Nginx atau Node.js) untuk menyajikan HTML entri yang benar berdasarkan path URL.
- [ ] Pastikan komponen dan utilitas yang dipakai bersama dioptimalkan (tree-shaking) dan dipisah ke dalam *common chunks*.

### Panduan Pemilihan Framework

| Kebutuhan | Stack yang Direkomendasikan |
|---|---|
| Situs konten / Blog / Docs | **Astro 5** + MDX + Tailwind v4 |
| Aplikasi server-rendered (PHP) | **Laravel 11** + Livewire 3 / Alpine.js |
| Aplikasi server-rendered (Python) | **Django 5** + HTMX 2 + Alpine.js |
| Aplikasi server-rendered (Go) | **Templ** + HTMX 2 + Tailwind v4 |
| React MPA dengan SSR | **Next.js 15** Pages Router atau App Router |

### Panduan Orkestrasi
- **Dengan `modern-web-guidance`**: WAJIB dieksekusi PERTAMA KALI sebelum tugas HTML/CSS untuk memastikan standar frontend modern.
- **Dengan `mvc-expert`**: Pastikan MPA mengikuti pola MVC secara ketat.
- **Dengan `saas-multi-tenant`**: Integrasikan identifikasi tenant di middleware routing inti.
- **Dengan `senior-frontend` / `ui-ux-pro-max`**: Tingkatkan dengan Alpine.js atau HTMX 2 untuk interaksi tanpa bundle berat.
- **Dengan `seo`**: Setiap halaman mengembalikan HTML penuh, tag meta, dan JSON-LD terisi saat load awal.
- **vs `spa-orchestrator`**: Pilih MPA saat SEO kritis dan data kebanyakan read-heavy. Pilih SPA saat aplikasi sangat interaktif seperti dashboard.

### Kondisi Pemicu
- Membangun aplikasi web dengan pendekatan MPA dalam satu repositori.
- Refaktor atau migrasi aplikasi yang ada ke arsitektur MPA terpusat.
- Membangun situs konten, halaman marketing, atau aplikasi kritis SEO.
- Menggunakan Astro 5 untuk situs statis atau konten-berat dengan island interaktif opsional.
- Menambahkan interaktivitas ke halaman server-rendered dengan HTMX 2 tanpa menulis ulang ke SPA.

---
### 📄 Standard Pages Mandate (CRITICAL)
**MANDATORY**: Whenever you are building a new application, landing page, or website, you MUST automatically create the following standard pages:
1. **About Page** (`/about`)
2. **Profile Page** (`/profile`)
3. **Contact Page** (`/contact`)
4. **Terms of Reference / Terms of Service** (`/terms`)
5. **Privacy Policy** (`/privacy-policy`)

These pages must be generated with standard boilerplate content that can later be customized to fit the specific application. Do not wait for the user to ask for them; they are a strict requirement for all web projects. / **WAJIB**: Otomatis buatkan halaman standar (About, Profile, Contact, Terms, Privacy Policy) pada setiap pembuatan aplikasi/website baru dengan konten boilerplate yang bisa disesuaikan nanti.