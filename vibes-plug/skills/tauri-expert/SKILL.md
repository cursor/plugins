---
name: tauri-expert
description: "Expert skill for Tauri (v2) development, Rust backend, IPC, and security / Panduan ahli untuk pengembangan Tauri v2, Rust backend, IPC, dan keamanan."
author: "Roedy Rustam"
version: "4.3.0"
---

# Tauri Expert

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills like `brainstorming`, `zero-to-prod-orchestrator`, and `session-memory-manager` to ensure cohesive execution.

### Description
This skill provides best practice guidance for building cross-platform desktop and mobile applications using Tauri (specifically Tauri v2). It covers frontend integration with the Rust backend, Inter-Process Communication (IPC), state management, and security.

### Instructions & Best Practices

#### 1. Architecture & IPC (Inter-Process Communication)
- Use `tauri::command` to define Rust functions callable from the frontend.
- Invoke Rust functions from the frontend using `@tauri-apps/api/core` (`invoke`).
- Utilize Tauri's event system (`emit` from Rust, `listen` on frontend) for real-time or async updates.
- Keep heavy processing and filesystem access in Rust (backend), while the frontend focuses purely on UI.

#### 2. State Management (Rust Backend)
- Use `tauri::State` to store and manage global state in the Rust backend.
- Use `std::sync::Mutex` or `tokio::sync::Mutex` (if async) for mutable state.
- Initialize managed state during application setup: `tauri::Builder::default().manage(MyState::default())`.

#### 3. Security & Capabilities
- Enforce strict context isolation.
- In Tauri v2, use the **Capabilities** system to restrict API access per window or plugin.
- Never expose dangerous filesystem, shell, or network APIs globally. Only grant allowlist access to specific, required paths or commands.

#### 4. Performance & Concurrency
- Use `async fn` for `tauri::command` when handling heavy I/O to avoid blocking the main thread.
- Use `serde` (`Serialize`, `Deserialize`) efficiently for data structures sent between Rust and the frontend.

#### 5. Plugin Management (Tauri v2)
- Use official Tauri plugins (e.g., `tauri-plugin-fs`, `tauri-plugin-store`, `tauri-plugin-dialog`) instead of writing custom I/O modules when available.
- Initialize plugins in `main.rs` or `lib.rs`: `app.plugin(tauri_plugin_dialog::init())`.

#### 6. Cross-Platform & Build
- Avoid hardcoded paths. Use the `app_handle.path()` resolver for AppData, Cache, and other system directories.
- Ensure dependencies in `Cargo.toml` support cross-compilation (Windows, macOS, Linux, iOS, Android).

### Trigger Conditions
Active when:
- Building, debugging, or refactoring Tauri applications.
- Writing IPC systems between the frontend (React/Svelte/Vue) and the Rust backend.
- Configuring security (`tauri.conf.json`, capabilities, permissions).

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `brainstorming`, `zero-to-prod-orchestrator`, dan `session-memory-manager` untuk memastikan eksekusi yang kohesif.

### Deskripsi
Skill ini memberikan panduan praktik terbaik (best practices) untuk membangun aplikasi desktop dan mobile lintas platform menggunakan Tauri (terutama Tauri v2). Skill ini mencakup integrasi frontend dengan backend Rust, Inter-Process Communication (IPC), manajemen state, serta keamanan.

### Instruksi & Praktik Terbaik

#### 1. Arsitektur & IPC (Inter-Process Communication)
- Gunakan `tauri::command` untuk mendefinisikan fungsi Rust yang bisa dipanggil dari frontend.
- Panggil fungsi Rust dari frontend menggunakan `@tauri-apps/api/core` (`invoke`).
- Manfaatkan sistem *event* Tauri (`emit` dari Rust, `listen` di frontend) untuk pembaruan *real-time* atau asinkron dari backend.
- Lakukan operasi berat di sisi Rust (backend), sedangkan frontend hanya fokus pada UI.

#### 2. Manajemen State (Rust Backend)
- Gunakan `tauri::State` untuk menyimpan dan mengelola state global di backend Rust.
- Gunakan `std::sync::Mutex` or `tokio::sync::Mutex` (jika asinkron) untuk state yang bisa berubah (mutable state).
- Lakukan inisialisasi state saat setup aplikasi: `tauri::Builder::default().manage(MyState::default())`.

#### 3. Keamanan (Security & Capabilities)
- Terapkan isolasi konteks secara ketat.
- Di Tauri v2, gunakan sistem **Capabilities** untuk membatasi akses API per jendela/plugin.
- Jangan mengekspos API filesystem, shell, atau jaringan yang berbahaya secara global. Hanya beri akses (`allowlist`) ke path atau perintah (commands) yang spesifik dan dibutuhkan.

#### 4. Kinerja & Asinkronisitas
- Gunakan `async fn` pada `tauri::command` untuk I/O yang berat agar tidak memblokir *main thread*.
- Gunakan `serde` (`Serialize`, `Deserialize`) secara efisien untuk mengirim struktur data kompleks antara Rust dan frontend.

#### 5. Pengelolaan Plugin (Tauri v2)
- Gunakan ekosistem plugin Tauri (seperti `tauri-plugin-fs`, `tauri-plugin-store`, `tauri-plugin-dialog`) alih-alih membuat modul I/O sendiri jika sudah tersedia.
- Inisialisasi plugin di file `main.rs` atau `lib.rs`: `app.plugin(tauri_plugin_dialog::init())`.

#### 6. Lintas Platform (Cross-Platform) & Build
- Hindari *hardcode* path sistem operasi. Gunakan `app_handle.path()` resolver untuk direktori AppData, Cache, dsb.
- Pastikan dependencies di `Cargo.toml` mendukung *cross-compilation* (Windows, macOS, Linux, iOS, Android).

### Kondisi Pemicu
Aktif saat:
- Membangun, men-debug, atau melakukan *refactoring* pada aplikasi Tauri.
- Menulis sistem IPC antara frontend (React/Svelte/Vue) dan backend Rust.
- Mengonfigurasi keamanan (`tauri.conf.json`, capabilities, permission).