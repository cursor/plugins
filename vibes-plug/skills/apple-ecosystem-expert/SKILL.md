---
name: apple-ecosystem-expert
description: "Expert guide for Apple Ecosystem development. Covers iOS support, Safari WebKit compatibility, PWAs (Progressive Web Apps) for iOS, and Human Interface Guidelines (HIG) for web and native apps / Panduan ahli pengembangan ekosistem Apple (iOS & Web)."
author: "Roedy Rustam"
version: "4.3.0"
---

# Apple Ecosystem Expert — vibes-plug Skill

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
Expert guide for Apple Ecosystem development. Covers Safari WebKit compatibility, Progressive Web Apps (PWAs) tailored for iOS, touch interactions, `manifest.json` configurations, and applying Human Interface Guidelines (HIG) principles to web and iOS applications.

### Trigger Conditions
Activate this skill when the user is:
- Asking for Safari browser compatibility or fixing WebKit bugs.
- Developing PWAs or web apps targeting iOS/iPadOS devices.
- Asking about `apple-touch-icon`, `apple-mobile-web-app-capable`, or related meta tags.
- Building UI elements that need to look and feel native on Apple devices.

---

### Core Concepts

#### 1. iOS PWA & Meta Tags
To ensure a web application looks and acts like a native app on iOS when added to the home screen, include these specific meta tags and configurations:

```html
<!-- iOS Safari PWA Meta Tags -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="App Title" />
<link rel="apple-touch-icon" href="/icon-192x192.png" />
<!-- Support for splash screens requires specific sizes, consider using PWA asset generators -->
```

#### 2. Safari WebKit CSS Quirks
Safari (WebKit) has distinct behavior for viewport sizing and scrolling.

| CSS Feature | WebKit Problem | Solution / Workaround |
|---|---|---|
| `100vh` | Ignores the bottom navigation bar on mobile Safari, causing overflow. | Use `100dvh` (Dynamic Viewport Height) or safe area insets. |
| Over-scrolling | "Rubber-banding" effect reveals background on scroll limits. | `overscroll-behavior: none;` on `body`. |
| Safe Area | Notches and Dynamic Islands block content. | Use `env(safe-area-inset-bottom)`, `env(safe-area-inset-top)`. |

```css
/* Example: Handling safe area and dynamic viewport height */
.container {
  height: 100dvh;
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

#### 3. Touch and Interactions
To achieve native feel on iOS, touch interactions must be smooth. Use CSS properties like `-webkit-tap-highlight-color: transparent;` to remove the default grey tap highlight.

---

### Best Practices

1. **Always use Dynamic Viewports (`dvh`, `svh`, `lvh`):** Standard `vh` in mobile Safari causes layout shifts or hidden content due to the dynamic browser UI.
2. **Handle Safe Areas:** Utilize CSS `env()` variables to avoid content overlapping with the iOS notch or home indicator.
3. **Optimized Touch Targets:** Apple HIG dictates a minimum touch target size of 44x44 pt. Ensure buttons are easily clickable.
4. **PWA Icons and Manifest:** iOS does not fully respect standard `manifest.json` icons; you must provide `<link rel="apple-touch-icon">` explicitly.

---

### Common Pitfalls to Avoid

| Anti-Pattern | Problem | Correct Approach |
|---|---|---|
| Using `100vh` for full screen apps | Bottom content gets hidden under Safari's tab bar. | Use `100dvh`. |
| Ignoring `-webkit-appearance` | Buttons/inputs look like default iOS forms instead of custom UI. | Set `-webkit-appearance: none;` on form elements. |
| Relying only on `manifest.json` for PWA icons | iOS won't use them for the "Add to Home Screen" icon. | Include `<link rel="apple-touch-icon" href="...">`. |

---

### Integration with Other Skills (MANDATORY)

This skill works best when combined with:
- `hig` — For detailed implementation of Apple Human Interface Guidelines styling.
- `mobile-expo-expert` — When building React Native/Expo apps for iOS.
- `tailwind-expert` — To apply CSS adjustments like `dvh` and safe-areas using Tailwind utility classes.
- `design-system-architect, senior-frontend` — To ensure UI components are sized correctly for iOS touch targets (44x44).

### Referenced By Orchestrators (MANDATORY)

This skill should be referenced by the following orchestrators:
- `brainstorming` — Add to the "Mobile & Web Ecosystems" row in the Skill Integration & Orchestration Matrix
- `zero-to-prod-orchestrator` — Add to Phase 4 (Frontend Implementation) & Phase 8 (Production Audit)
- `production-ready-hardener` — Add to Phase 2 (PWA & Compatibility Audit)

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `brainstorming`, `zero-to-prod-orchestrator`, dan `session-memory-manager` untuk memastikan eksekusi yang kohesif.

### Deskripsi
Panduan ahli untuk pengembangan ekosistem Apple. Mencakup kompatibilitas Safari WebKit, Progressive Web Apps (PWA) khusus iOS, interaksi sentuhan, konfigurasi `manifest.json`, dan penerapan prinsip Human Interface Guidelines (HIG) untuk web dan aplikasi iOS.

### Kondisi Pemicu
Aktifkan skill ini ketika pengguna sedang:
- Menanyakan kompatibilitas browser Safari atau memperbaiki bug WebKit.
- Mengembangkan PWA atau aplikasi web yang menargetkan perangkat iOS/iPadOS.
- Menanyakan tentang `apple-touch-icon`, meta tag PWA iOS, atau safe area.
- Membangun elemen UI agar terlihat dan terasa *native* di ekosistem Apple.

### Panduan Singkat

Panduan praktis untuk dukungan Ekosistem Apple (iOS & Web):

- **[Gunakan `100dvh`]:** Jangan pernah gunakan `100vh` di web app iOS, gunakan `100dvh` (Dynamic Viewport Height) agar tidak tertutup navigation bar Safari.
- **[Meta Tag PWA Khusus]:** Wajib menggunakan `<link rel="apple-touch-icon">` dan `<meta name="apple-mobile-web-app-capable" content="yes">` agar PWA berjalan optimal saat ditambahkan ke Home Screen.
- **[Safe Area]:** Terapkan padding `env(safe-area-inset-top)` dsb, untuk menghindari notch (poni) dan Dynamic Island iPhone.
- **[Touch Targets HIG]:** Area sentuh minimum untuk elemen interaktif di iOS adalah 44x44 points.

### Integrasi dengan Skill Lain (WAJIB)

Skill ini bekerja paling baik dikombinasikan dengan:
- `hig` — Untuk menerapkan struktur dan prinsip desain dari Human Interface Guidelines Apple.
- `mobile-expo-expert` — Jika menggunakan React Native untuk aplikasi iOS.
- `tailwind-expert` — Mengatur penyesuaian WebKit seperti `dvh` dan safe-areas dengan utility class.

### Direferensikan oleh Orchestrator (WAJIB)

Skill ini harus direferensikan oleh orchestrator berikut:
- `brainstorming` — Bagian Mobile & Web Ecosystems.
- `zero-to-prod-orchestrator` — Fase 4 dan 8 (Kesiapan Produksi).
- `production-ready-hardener` — Fase 2 (Audit Kompatibilitas Lintas Browser & PWA).


## Orchestration & Integration
- Integrates with: `hig`, `mobile-expo-expert`, `tailwind-expert`, `design-system-architect, senior-frontend`.
- Orchestrated by: `brainstorming`, `zero-to-prod-orchestrator`, `production-ready-hardener`.