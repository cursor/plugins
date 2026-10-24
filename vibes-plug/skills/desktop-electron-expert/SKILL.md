---
name: desktop-electron-expert
description: "Expert guide for Electron 33+ desktop application development — Electron Forge, context isolation, IPC security, native menus, auto-updates, and multi-window management / Panduan ahli pengembangan desktop Electron 33+."
author: "Roedy Rustam"
version: "4.3.0"
---

# Desktop Electron Application Expert (Electron 33+ Security Standard)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
Production guide for engineering secure, high-performance cross-platform desktop applications using Electron 33+. Covers strictly isolated IPC communication via `contextBridge`, mandatory Context Isolation and Sandbox execution modes, native OS shell integrations (system tray, desktop notifications, global shortcuts), automated delta updates with `electron-updater`, multi-platform packaging via Electron Forge or electron-builder, and zero-trust renderer security policies (CSP, `nodeIntegration: false`).

### Trigger Conditions
- Developing desktop software for macOS, Windows, and Linux using React, Vue, or Next.js static exports.
- Hardening Electron application security to prevent Remote Code Execution (RCE) via IPC or XSS vulnerabilities.
- Configuring automatic background software updates and code-signing pipelines (Apple Notarization & Windows EV Authenticode).
- Implementing multi-window managers and native operating system menus.

### Core Security & Process Isolation Architecture

```
┌────────────────────────────────────────────────────────┐
│ 1. MAIN PROCESS (Node.js Environment)                  │
│    Direct OS access, window lifecycle, file system     │
└───────────────────────────┬────────────────────────────┘
                            │  ipcMain.handle()
                            ▼
┌────────────────────────────────────────────────────────┐
│ 2. PRELOAD SCRIPT (Secure Bridge)                      │
│    `contextBridge.exposeInMainWorld('electronAPI', ...)`│
└───────────────────────────┬────────────────────────────┘
                            │  window.electronAPI
                            ▼
┌────────────────────────────────────────────────────────┐
│ 3. RENDERER PROCESS (Chromium Sandbox)                 │
│    Pure UI: React 19 / Vite. Zero direct Node.js access │
└────────────────────────────────────────────────────────┘
```

### Production Security Configuration (`main.ts`)

```typescript
// src/main/index.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';

let mainWindow: BrowserWindow | null = null;

function createSecureWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,       // MANDATORY: Isolates preload from page JS
      nodeIntegration: false,        // MANDATORY: Prohibits Node.js in renderer
      sandbox: true,                 // MANDATORY: Enables OS-level sandbox
      webSecurity: true,             // MANDATORY: Enforces Same-Origin Policy
      allowRunningInsecureContent: false,
    },
  });

  // Strict Content Security Policy (CSP) header enforcement
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"],
      },
    });
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  createSecureWindow();

  // Type-Safe IPC Handlers
  ipcMain.handle('app:get-version', () => app.getVersion());
  ipcMain.handle('system:notify', (_event, title: string, body: string) => {
    // Validate inputs strictly before triggering OS dialogs
    return { status: 'delivered', title };
  });
});
```

### Type-Safe Preload Script (`preload.ts`)

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

export interface DesktopBridge {
  getAppVersion: () => Promise<string>;
  sendNotification: (title: string, body: string) => Promise<{ status: string }>;
}

const desktopAPI: DesktopBridge = {
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  sendNotification: (title, body) => ipcRenderer.invoke('system:notify', title, body),
};

contextBridge.exposeInMainWorld('desktopAPI', desktopAPI);
```

## Orchestration & Integration
- **`tauri-expert`**: Provides architectural comparison (Electron's ecosystem matureness vs. Tauri's low memory footprint).
- **`senior-frontend`**: Structures the React 19 UI running inside the sandboxed renderer window.
- **`ci-cd-devops-architect`**: Configures GitHub Actions for macOS notarization and Windows code signing.
- **`error-resilience-expert`**: Catches unhandled exceptions in the Main process and handles renderer crashes gracefully.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi bersama `tauri-expert`, `senior-frontend`, `ci-cd-devops-architect`, dan `error-resilience-expert`.

### Deskripsi
Panduan produksi untuk membangun aplikasi desktop cross-platform yang aman dan efisien menggunakan Electron 33+. Mengutamakan keamanan IPC dengan Context Isolation, isolasi proses renderer berbasis sandbox, integrasi sistem operasi natif (system tray, menu bar, notifikasi desktop), pembaruan otomatis (*auto-updates*), dan packaging multi-OS (Windows .exe, macOS .dmg/.app, Linux .AppImage).

### Kondisi Pemicu
- Membangun aplikasi desktop menggunakan teknologi web (React, Vue, Vite, Tailwind CSS).
- Memperketat keamanan Electron untuk mencegah kerentanan eksekusi kode jarak jauh (*Remote Code Execution* / RCE).
- Menerapkan komunikasi antarmuka (Renderer) ke sistem file (Main) secara type-safe via `contextBridge`.
- Menyiapkan alur pembaruan otomatis (*auto-updater*) tanpa mengganggu pengalaman pengguna.

### Pola Konsumsi API di Komponen React Renderer

```tsx
// src/renderer/components/SystemInfoCard.tsx
import { useEffect, useState } from 'react';

declare global {
  interface Window {
    desktopAPI: {
      getAppVersion: () => Promise<string>;
      sendNotification: (title: string, body: string) => Promise<{ status: string }>;
    };
  }
}

export function SystemInfoCard() {
  const [version, setVersion] = useState<string>('Memuat...');

  useEffect(() => {
    window.desktopAPI.getAppVersion().then(setVersion);
  }, []);

  const handleNotify = () => {
    window.desktopAPI.sendNotification('Vibes Desktop', 'Pembaruan aplikasi siap dipasang.');
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="font-bold text-slate-800">Informasi Aplikasi Desktop</h3>
      <p className="mt-1 text-sm text-slate-600">Versi Terpasang: <span className="font-semibold">{version}</span></p>
      <button
        onClick={handleNotify}
        className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Kirim Notifikasi Sistem
      </button>
    </div>
  );
}
```

### 3 Hukum Keamanan Mutlak Electron
1. **Wajib Context Isolation**: `contextIsolation: true` wajib aktif agar skrip halaman web tidak dapat mengakses atau memodifikasi objek internal Node.js di preload script.
2. **Matikan nodeIntegration di Renderer**: `nodeIntegration: false` mutlak ditegakkan. Renderer dilarang mengimpor modul `fs`, `child_process`, atau `crypto` secara langsung.
3. **Sandbox Chromium Aktif**: Selalu nyalakan `sandbox: true` untuk membatasi akses proses renderer ke tingkat kernel sistem operasi.

## Integrasi Orkestrasi
- **`tauri-expert`**: Menjadi acuan pembanding jika pengguna mempertimbangkan framework alternatif berbasis Rust.
- **`senior-frontend`**: Menyediakan arsitektur komponen UI yang responsif di dalam window aplikasi.
- **`ci-cd-devops-architect`**: Menangani penandatanganan sertifikat digital (*code signing*) pada pipeline rilis.
- **`error-resilience-expert`**: Mencegah aplikasi tertutup tiba-tiba (*crash*) saat terjadi unhandled error di Main process.