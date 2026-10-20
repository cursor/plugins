---
name: wasm-edge-computing-expert
description: "Expert guide for WebAssembly (WASM) and Edge Computing. Covers WASI preview 2, Spin/Fermyon, Cloudflare Workers WASM, and high-performance browser computing / Panduan ahli untuk WebAssembly (WASM) dan Edge Computing. Mencakup WASI preview 2, Spin/Fermyon, Cloudflare Workers WASM, dan komputasi performa tinggi di browser."
author: "Roedy Rustam"
version: "4.3.0"
---

# WASM & Edge Computing Expert

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
A specialized guide for writing, compiling, and deploying WebAssembly (WASM) modules both on the Edge and in the browser. Covers the new WebAssembly System Interface (WASI) Preview 2, serverless execution environments (Spin, Cloudflare Workers, Fastly Compute), and bidirectional JavaScript-to-WASM interop.

### Trigger Conditions
- When porting heavy computational tasks (image processing, video encoding, cryptography) from JavaScript to Rust/Go via WASM.
- When deploying ultra-fast, cold-start-free serverless functions on Cloudflare Workers or Fermyon Spin.
- When the user asks about "WASI", "WebAssembly", or "Edge computing performance".
- When bridging legacy C/C++ libraries to run in the browser using Emscripten.

### Core Architectural Guidelines

#### 1. Language Choice & Toolchain
- **Rust (Recommended)**: Use `wasm-pack` for browser modules and `cargo component` for WASI Preview 2. Rust offers the smallest binary sizes and no garbage collector overhead.
- **Go**: Go 1.21+ has native WASI support (`GOOS=wasip1 GOARCH=wasm`), but binaries are larger due to the included runtime. Use TinyGo for smaller binaries.
- **AssemblyScript**: Use when the team only knows TypeScript, though performance is slightly less than Rust.

#### 2. Browser Integration (`wasm-bindgen`)
When writing Rust for the browser, minimize crossings between JS and WASM, as serialization is expensive.
```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn compute_heavy_task(input: &[u8]) -> Vec<u8> {
    // Process data entirely in WASM before returning
    input.iter().map(|&b| b.wrapping_add(1)).collect()
}
```

#### 3. Edge & WASI Preview 2
WASI Preview 2 introduces the Component Model, allowing WASM modules to securely access system resources (HTTP, Filesystem) without being tied to a specific language.
- Deploying to Cloudflare Workers:
  ```toml
  # wrangler.toml
  main = "./build/worker.js"
  [wasm_modules]
  MODULE = "./build/module.wasm"
  ```
- Deploying to Fermyon Spin: Use the `spin` CLI to build microservices entirely in WASM that start in under 1 millisecond.

#### 4. Shared Memory & Atomics
For multi-threaded browser WASM, use `SharedArrayBuffer` and Web Workers. Ensure your server sends the correct headers:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

## Orchestration & Integration
- Enhances `api-gateway-proxy-expert` for running custom logic at the edge (Cloudflare/Kong).
- Integrates with `rust-programming-expert` or `go-programming-expert` for module compilation.
- Pairs with `performance-web-vitals` to offload main-thread blocking tasks.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Deskripsi
Panduan khusus untuk menulis, mengompilasi, dan mendeploy modul WebAssembly (WASM) baik di Edge maupun di browser. Mencakup WebAssembly System Interface (WASI) Preview 2, lingkungan serverless (Spin, Cloudflare Workers), dan interoperabilitas JavaScript-ke-WASM dua arah.

### Kondisi Pemicu
- Saat memindahkan tugas komputasi berat (pemrosesan gambar, kriptografi) dari JavaScript ke Rust/Go melalui WASM.
- Saat mendeploy fungsi serverless ultra-cepat tanpa *cold start* di Cloudflare Workers atau Fermyon Spin.
- Saat menjembatani library C/C++ lama untuk dijalankan di browser menggunakan Emscripten.

### Panduan Arsitektur Inti

#### 1. Pilihan Bahasa & Toolchain
- **Rust (Direkomendasikan)**: Menghasilkan ukuran biner terkecil. Gunakan `wasm-pack` untuk web dan `cargo component` untuk WASI.
- **Go**: Gunakan TinyGo untuk ukuran modul yang lebih kecil, atau Go native `GOOS=wasip1` untuk dukungan WASI penuh (namun biner akan lebih besar).
- **AssemblyScript**: Jika tim hanya menguasai TypeScript.

#### 2. Integrasi Browser
Minimalkan pertukaran data (crossing) antara JavaScript dan WASM karena biaya serialisasinya tinggi. Kirim array besar (seperti `Uint8Array`) sekali, proses seluruhnya di WASM, lalu kembalikan hasilnya.

#### 3. Edge & WASI Preview 2 (Component Model)
WASI Preview 2 memungkinkan modul WASM mengakses resource sistem (HTTP, File) secara aman. Anda dapat mendeploy service WASM murni ke infrastruktur edge seperti Fermyon Spin atau Fastly dengan waktu mulai (startup time) di bawah 1 milidetik, jauh lebih cepat daripada container Docker tradisional.

#### 4. Shared Memory & Web Workers
Untuk performa multi-threading sejati di browser menggunakan WASM, gunakan `SharedArrayBuffer`. Pastikan server Anda mengirimkan header keamanan COOP dan COEP yang diwajibkan oleh browser modern.

## Integrasi Orkestrasi
- Memperkuat `api-gateway-proxy-expert` untuk logika kustom di edge.
- Terintegrasi dengan `rust-programming-expert` untuk kompilasi modul.
- Melengkapi `performance-web-vitals` dengan memindahkan komputasi berat dari *main thread* JavaScript.