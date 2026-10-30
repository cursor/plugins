---
name: browser-extension-mv3-pro
description: "Expert guide for modern browser extension development (Manifest V3) — Chrome SidePanel API, Background Service Workers, Offscreen Documents, declarativeNetRequest, WebAssembly in MV3, and cross-browser WebExtensions / Panduan ahli pengembangan ekstensi browser modern (Manifest V3)."
author: "Roedy Rustam"
version: "4.3.0"
---

# 🧩 Browser Extension Manifest V3 Pro Guide (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with `senior-frontend`, `tailwind-expert`, `pwa-offline-first-expert`, `ai-llm-integration-expert`, `vercel-ai-sdk-expert`, `mcp-server-architect`, `authentication-identity-expert`, `zero-trust-secret-vault`, and `anti-slop`.

### Description
Expert guide for engineering high-performance, secure, and cross-browser extensions using **Chrome Manifest V3 (MV3)**, Firefox WebExtensions MV3, and Safari Web Extensions. Manifest V3 fundamentally modernizes browser extension development by replacing persistent background pages with ephemeral service workers, enforcing strict declarative network rules, mandating modern native side panels, and providing offscreen sandboxes for complex computational workloads.

### Architecture & Manifest V3 Invariants

1. **Ephemeral Background Service Workers**:
   - Background service workers terminate after ~30 seconds of inactivity.
   - Never store long-lived state in global JavaScript memory. Use `chrome.storage.session` for transient in-memory state and `chrome.storage.local` for persistent storage.
   - Use `chrome.alarms` instead of `setInterval` / `setTimeout` for recurring operations.

2. **SidePanel API (`chrome.sidePanel`)**:
   - The native 2026 standard for AI copilots, page analyzers, and context tools.
   - Replaces disruptive modal popups and injected DOM overlays with a native, non-intrusive browser panel.

3. **Offscreen Documents API (`chrome.offscreen`)**:
   - Service workers lack DOM access, canvas, audio playback, and `window`.
   - Offscreen documents provide a secure sandboxed DOM environment for WebAssembly (WASM), audio decoding, and clipboard access.

4. **Declarative Net Request (`chrome.declarativeNetRequest`)**:
   - Replaces blocking `webRequest` API for high-speed, privacy-first network modifications and header manipulation.

---

### Production Manifest V3 Contract (`manifest.json`)

```json
{
  "manifest_version": 3,
  "name": "Vibes AI Copilot & Analyzer",
  "version": "1.0.0",
  "description": "Production-grade AI companion extension built with Manifest V3 and React 19.",
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "action": {
    "default_icon": "icons/icon-48.png",
    "default_title": "Open Vibes AI Side Panel"
  },
  "side_panel": {
    "default_path": "sidepanel/index.html"
  },
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  "permissions": [
    "sidePanel",
    "storage",
    "alarms",
    "offscreen",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "https://*/*"
  ],
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content-script.js"],
      "run_at": "document_idle"
    }
  ],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; worker-src 'self';"
  }
}
```

---

### Background Service Worker (`background/service-worker.ts`)

```typescript
export interface ExtensionMessage {
  type: 'ANALYZE_CURRENT_PAGE' | 'EXECUTE_WASM_SANDBOX';
  payload?: any;
}

export interface ExtensionResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// 1. Enable Side Panel on toolbar icon click
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error: Error) => console.error('[SW] Failed to set side panel behavior:', error));

// 2. Life-Cycle & Heartbeat Management
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    await chrome.storage.local.set({
      installedAt: Date.now(),
      theme: 'system',
      copilotEnabled: true,
    });
    // Setup recurring background sync alarm (minimum interval 1 minute in MV3)
    chrome.alarms.create('telemetry_sync', { periodInMinutes: 15 });
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'telemetry_sync') {
    handlePeriodicSync();
  }
});

async function handlePeriodicSync(): Promise<void> {
  const data = await chrome.storage.local.get(['telemetry_queue']);
  const queue = Array.isArray(data.telemetry_queue) ? data.telemetry_queue : [];
  if (queue.length === 0) return;

  try {
    const response = await fetch('https://api.vibes.dev/v1/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: queue }),
    });
    if (response.ok) {
      await chrome.storage.local.set({ telemetry_queue: [] });
    }
  } catch (err) {
    console.warn('[SW] Telemetry sync deferred:', err);
  }
}

// 3. Offscreen Document Manager (WASM / DOM Sandbox)
let creatingOffscreen: Promise<void> | null = null;

async function ensureOffscreenDocument(path: string): Promise<void> {
  const offscreenUrl = chrome.runtime.getURL(path);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [offscreenUrl],
  });

  if (existingContexts.length > 0) return;

  if (creatingOffscreen) {
    await creatingOffscreen;
    return;
  }

  creatingOffscreen = chrome.offscreen.createDocument({
    url: path,
    reasons: [chrome.offscreen.Reason.WORKERS, chrome.offscreen.Reason.CLIPBOARD],
    justification: 'WASM bytecode execution and secure clipboard parsing.',
  });

  await creatingOffscreen;
  creatingOffscreen = null;
}

// 4. Type-Safe Unified Message Bus
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse: (response: ExtensionResponse) => void) => {
    handleIncomingMessage(message, sender)
      .then(sendResponse)
      .catch((error: Error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for asynchronous reply
  }
);

async function handleIncomingMessage(
  message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender
): Promise<ExtensionResponse> {
  switch (message.type) {
    case 'ANALYZE_CURRENT_PAGE': {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab?.id) {
        throw new Error('No active browser tab found.');
      }

      const [injectionResult] = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: () => ({
          title: document.title,
          url: window.location.href,
          metaDescription: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '',
          headings: Array.from(document.querySelectorAll('h1, h2')).map((h) => h.textContent?.trim() || ''),
        }),
      });

      return { success: true, data: injectionResult.result };
    }

    case 'EXECUTE_WASM_SANDBOX': {
      await ensureOffscreenDocument('offscreen/sandbox.html');
      const offscreenResponse = await chrome.runtime.sendMessage({
        target: 'offscreen',
        type: 'RUN_BYTECODE',
        payload: message.payload,
      });
      return offscreenResponse;
    }

    default:
      return { success: false, error: `Unknown message type: ${(message as ExtensionMessage).type}` };
  }
}
```

---

### Offscreen Document Sandbox (`offscreen/sandbox.ts`)

```typescript
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.target !== 'offscreen') return;

  if (message.type === 'RUN_BYTECODE') {
    executeSandboxedBytecode(message.payload)
      .then((result) => sendResponse({ success: true, result }))
      .catch((err: Error) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function executeSandboxedBytecode(wasmBase64: string): Promise<number> {
  const binaryString = atob(wasmBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const wasmModule = await WebAssembly.instantiate(bytes, {
    env: {
      memory: new WebAssembly.Memory({ initial: 256, maximum: 512 }),
    },
  });

  const runCompute = wasmModule.instance.exports.compute as () => number;
  return typeof runCompute === 'function' ? runCompute() : 0;
}
```

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasikan skill `senior-frontend`, `tailwind-expert`, `pwa-offline-first-expert`, `ai-llm-integration-expert`, `vercel-ai-sdk-expert`, `mcp-server-architect`, `authentication-identity-expert`, `zero-trust-secret-vault`, dan `anti-slop`.

### Deskripsi
Panduan komprehensif untuk merekayasa ekstensi peramban modern berkinerja tinggi, aman, dan lintas platform (Chrome, Edge, Firefox, Safari) berbasis **Manifest V3 (MV3)**. Standar Manifest V3 menggantikan background page persisten dengan service worker efemeral, menegakkan aturan declarative network yang aman, menyediakan SidePanel API native, serta sandbox dokumen offscreen untuk eksekusi WebAssembly dan pemrosesan audio/clipboard.

### Prinsip Utama & Invarian Arsitektur MV3

1. **Service Worker Efemeral**:
   - Background service worker akan otomatis mati setelah ~30 detik tidak aktif.
   - Jangan pernah menyimpan state jangka panjang di memori global JavaScript. Gunakan `chrome.storage.session` untuk state in-memory sementara dan `chrome.storage.local` untuk data persisten.
   - Gunakan `chrome.alarms` untuk tugas berulang terjadwal.

2. **SidePanel API (`chrome.sidePanel`)**:
   - Standar modern 2026 untuk panel samping pendamping AI (*AI Copilot*) dan inspeksi konteks halaman web tanpa mengganggu tampilan halaman utama pengguna.

3. **Dokumen Offscreen (`chrome.offscreen`)**:
   - Karena Service Worker tidak memiliki akses ke DOM, dokumen offscreen menyediakan lingkungan DOM terisolasi untuk eksekusi WebAssembly (WASM), dekode audio, dan manipulasi clipboard.

4. **Declarative Net Request**:
   - Memodifikasi header dan rute jaringan secara deklaratif dan cepat tanpa overhead performa dari blocking webRequest lama.

---

### Praktik Terbaik Keamanan & Anti-Slop Ekstensi

1. **Larangan Evaluasi Kode Dinamis**:
   - Dilarang keras menggunakan `eval()`, `new Function()`, atau mengeksekusi skrip dari CDN luar. Seluruh kode wajib dibundel secara lokal.
2. **Isolasi Dunia Konteks (Isolated World)**:
   - Content script berjalan di dunia terisolasi. Komunikasi antar host page dan ekstensi dilakukan melalui pesan tervalidasi dengan sanitasi ketat.
3. **Kontrak UI 5-State**:
   - Seluruh elemen interaktif pada SidePanel wajib menerapkan kontrak 5-state (default, hover, focus-visible, active, disabled) dengan tipografi modern dan angka tabular (`tabular-nums`).
