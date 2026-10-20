---
name: web-game-engine-expert
description: "Expert guide for modern web-based game development. Covers PlayCanvas, Babylon.js Havok, Three.js/R3F Rapier & Jolt Physics, Fixed-Timestep Accumulators, Zero-GC Pooling, ECS (bitECS/Miniplex), Spatial Audio (HRTF), and WebTransport networking / Panduan ahli pengembangan game web modern dan efisien."
author: "Roedy Rustam"
version: "4.3.0"
---

# Web Game Engine Expert (Physics, Architecture & Game Loops)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills:
- `web-3d-graphics-expert` — Visual rendering layer (WebGPU, Three.js, Babylon.js, PlayCanvas).
- `glsl-shader-expert` — Custom gameplay shaders, damage flashes, VFX materials.
- `webxr-ar-vr-expert` — Spatial controls and VR/AR controller tracking.
- `realtime-collaboration-expert` — Low-latency multiplayer state synchronization (WebRTC / WebTransport).
- `performance-web-vitals` — Frame budgeting (16.6ms for 60fps, 8.3ms for 120fps) and eliminating Garbage Collection stalls.
- `wasm-edge-computing-expert` — Compiling custom Rust/C++ simulation modules to WASM.

### Description
Production-grade guidance for engineering commercial-quality 2D and 3D web games running at steady 60 to 144+ FPS. Enforces strict game architectural patterns: **Fixed-Timestep Accumulators with render interpolation**, **WebAssembly Physics Engines** (Rapier 3D, Jolt Physics, Havok), **Zero-GC Object Pooling** to eliminate JavaScript garbage collection stutters, **Entity Component System (ECS)** architectures, **Web Audio API 3D Spatial Sound (HRTF)**, and **WebTransport / WebRTC low-latency netcode**.

### Trigger Conditions
Activate this skill when the user is:
- Developing a web-based game or physics simulation (2D or 3D).
- Integrating physics with `@dimforge/rapier3d`, `jolt-physics`, `@babylonjs/havok`, or `@react-three/rapier`.
- Building or refactoring a game loop to fix frame pacing or physics stuttering on 120Hz/144Hz monitors.
- Implementing an Entity Component System (ECS) with `bitECS` or `miniplex`.
- Designing zero-allocation object pools for projectiles, particles, or temporary math vectors.
- Adding Gamepad API, Pointer Lock mouse look, or mobile virtual touch controls.
- Integrating 3D positional audio via the Web Audio API.
- Architecting multiplayer game networking with WebTransport (QUIC datagrams) or WebRTC DataChannels.

---

### Modern Web Game Engine Landscape (2026)

| Engine / Stack | Dimension | Physics Backend | Key Strengths |
| :--- | :--- | :--- | :--- |
| **PlayCanvas Engine** | 3D | Ammo.js / Rapier WASM | Complete production game engine, tiny runtime (~200KB), mobile-first 60fps, built-in sound & input. |
| **Babylon.js + Havok** | 3D | Havok Physics WASM | AAA physics simulation, native sub-stepping, character controllers, convex decomposition. |
| **Three.js / R3F + Rapier / Jolt** | 3D | Rapier 3D (Rust) / Jolt (C++) | Modular, massive ecosystem, best for React/Vue indie games and procedural worlds. |
| **LittleJS** | 2D | Built-in lightweight physics | Micro-size (<50KB), hyper-fast hybrid WebGL/2D canvas, ideal for 2D platformers & game jams. |
| **PixiJS v8** | 2D | Matter.js / Rapier 2D | Next-gen WebGPU 2D rendering pipeline, thousands of animated sprites at 144 FPS. |
| **Needle Engine** | 3D | PhysX / Rapier | Export directly from Unity/Blender into Three.js with full component lifecycles. |

---

### 1. The Deterministic Game Loop: Fixed-Timestep Accumulator

> **CRITICAL RULE**: Never tie physics updates directly to `requestAnimationFrame` delta time. A variable delta causes non-deterministic physics, tunneling, and jitter on 120Hz/144Hz monitors.
- **Solution:** Accumulate frame time and step physics at a fixed tick rate (e.g., 60Hz). Calculate `alpha` to interpolate render transforms smoothly between the previous and current physics state.

```typescript
export class GameLoop {
  private accumulator = 0;
  private lastTime = performance.now();
  private readonly FIXED_TIMESTEP = 1 / 60; // 60Hz fixed physics step
  private readonly MAX_FRAME_TIME = 0.25;   // Clamp to prevent "spiral of death" during lag

  constructor(
    private updatePhysics: (dt: number) => void,
    private render: (alpha: number) => void
  ) {}

  public start() {
    this.lastTime = performance.now();
    requestAnimationFrame(this.tick);
  }

  private tick = (currentTime: number) => {
    let frameTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Clamp huge lags (e.g., user changed browser tab)
    if (frameTime > this.MAX_FRAME_TIME) {
      frameTime = this.MAX_FRAME_TIME;
    }

    this.accumulator += frameTime;

    // Execute fixed updates
    while (this.accumulator >= this.FIXED_TIMESTEP) {
      this.updatePhysics(this.FIXED_TIMESTEP);
      this.accumulator -= this.FIXED_TIMESTEP;
    }

    // Alpha is the leftover fractional progress towards the next physics step [0.0, 1.0)
    const alpha = this.accumulator / this.FIXED_TIMESTEP;
    this.render(alpha);

    requestAnimationFrame(this.tick);
  };
}
```

---

### 2. High-Performance WASM Physics: Rapier & Jolt

#### Option A: Rapier 3D (Rust + WASM + SIMD)
Lightweight, determinism-friendly, native support in React Three Fiber (`@react-three/rapier`):
```tsx
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';

export function GamePhysicsWorld({ children }: { children: React.ReactNode }) {
  return (
    <Physics gravity={[0, -9.81, 0]} timeStep="vary">
      {/* Player Dynamic Capsule */}
      <RigidBody position={[0, 2, 0]} enabledRotations={[false, false, false]} colliders="ball">
        <mesh>
          <sphereGeometry args={[0.5]} />
          <meshStandardMaterial color="dodgerblue" />
        </mesh>
      </RigidBody>

      {/* Static Floor */}
      <RigidBody type="fixed">
        <CuboidCollider args={[20, 0.5, 20]} position={[0, -0.5, 0]} />
      </RigidBody>

      {children}
    </Physics>
  );
}
```

#### Option B: Jolt Physics WASM (`jolt-physics`)
The AAA open-source physics engine used in titles like *Horizon Forbidden West*. Best for massive simulations (>2,000 rigid bodies) and advanced ragdolls in vanilla Three.js or Babylon.js.

> **Physics Best Practice**: ALWAYS use primitive colliders (`Sphere`, `Box`, `Capsule`) for moving dynamic bodies. NEVER use `Trimesh` (triangle mesh) for dynamic objects; `Trimesh` should only be used for static world terrain.

---

### 3. Zero-GC Memory Management & Object Pooling

> **CRITICAL RULE**: In games, memory allocation (`new Vector3()`, `new Bullet()`) inside the tick loop triggers V8 Garbage Collection (GC) pauses every few seconds, dropping frames from 60 to 45 FPS.
- **Scratch Object Reuse:** Create scratch variables once at module level.
  ```typescript
  // BAD: Allocates a new vector every frame
  const dir = new THREE.Vector3().subVectors(target, source).normalize();

  // GOOD: Reuses module-level scratch vector
  const _scratchVec = new THREE.Vector3();
  _scratchVec.subVectors(target, source).normalize();
  ```
- **Generic Object Pool:**
```typescript
export class ObjectPool<T> {
  private pool: T[] = [];
  constructor(
    private factory: () => T,
    private reset: (item: T) => void,
    initialSize = 50
  ) {
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory());
    }
  }

  public acquire(): T {
    return this.pool.length > 0 ? this.pool.pop()! : this.factory();
  }

  public release(item: T): void {
    this.reset(item);
    this.pool.push(item);
  }
}
```

---

### 4. Input Management: Pointer Lock & Gamepad API

```typescript
// 1. First-Person / Third-Person Mouse Look
export function setupPointerLock(canvas: HTMLCanvasElement, onLook: (dx: number, dy: number) => void) {
  canvas.addEventListener('click', () => {
    if (document.pointerLockElement !== canvas) {
      canvas.requestPointerLock();
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === canvas) {
      onLook(e.movementX, e.movementY);
    }
  });
}

// 2. Gamepad API with Deadzone Normalization
export function pollGamepad(deadzone = 0.15) {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = gamepads[0];
  if (!gp) return null;

  const filterAxis = (val: number) => (Math.abs(val) > deadzone ? val : 0);

  return {
    moveX: filterAxis(gp.axes[0]),
    moveY: filterAxis(gp.axes[1]),
    lookX: filterAxis(gp.axes[2]),
    lookY: filterAxis(gp.axes[3]),
    buttonJump: gp.buttons[0]?.pressed ?? false,
    buttonAction: gp.buttons[1]?.pressed ?? false
  };
}
```

---

### 5. 3D Spatial Positional Audio (Web Audio API)

```typescript
export class SpatialAudioManager {
  private ctx = new AudioContext();
  private listener = this.ctx.listener;

  public updateListenerPosition(pos: { x: number; y: number; z: number }, forward: { x: number; y: number; z: number }, up = { x: 0, y: 1, z: 0 }) {
    if (this.listener.positionX) {
      this.listener.positionX.value = pos.x;
      this.listener.positionY.value = pos.y;
      this.listener.positionZ.value = pos.z;
      this.listener.forwardX.value = forward.x;
      this.listener.forwardY.value = forward.y;
      this.listener.forwardZ.value = forward.z;
      this.listener.upX.value = up.x;
      this.listener.upY.value = up.y;
      this.listener.upZ.value = up.z;
    }
  }

  public createSpatialSound(audioBuffer: AudioBuffer, pos: { x: number; y: number; z: number }) {
    const source = this.ctx.createBufferSource();
    source.buffer = audioBuffer;

    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF'; // High-fidelity Head-Related Transfer Function
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = 1000;
    panner.rolloffFactor = 1;
    panner.positionX.value = pos.x;
    panner.positionY.value = pos.y;
    panner.positionZ.value = pos.z;

    source.connect(panner);
    panner.connect(this.ctx.destination);
    source.start();
  }
}
```

---

### 6. Modern Multiplayer Networking: WebTransport vs WebRTC

For fast-paced real-time action games:
- **Avoid WebSockets for player movement:** WebSockets use TCP. When a packet is lost, TCP pauses delivery of all subsequent packets (Head-of-Line blocking), causing massive lag spikes.
- **Use WebTransport (QUIC) or WebRTC DataChannels:**
  - Unreliable, unordered datagrams for continuous movement updates (`x, y, z, vx, vy, vz`).
  - Reliable streams for critical state transitions (damage, weapon fire, chat, player joined).
- **Client-Side Prediction & Reconciliation:**
  1. Client immediately simulates movement locally upon keypress and stores input history with tick numbers.
  2. Server processes input at fixed 20Hz-60Hz and replies with authoritative position.
  3. Client reconciles authoritative state and replays unacknowledged inputs to avoid input lag.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan:
- `web-3d-graphics-expert` — Lapisan visual rendering (WebGPU, Three.js, Babylon.js, PlayCanvas).
- `glsl-shader-expert` — Shader kustom untuk efek visual, kilatan luka, dan partikel game.
- `webxr-ar-vr-expert` — Kontrol spasial dan pelacakan kontroler VR/AR.
- `realtime-collaboration-expert` — Sinkronisasi state multiplayer real-time (WebRTC / WebTransport).
- `performance-web-vitals` — Manajemen frame budget (16.6ms untuk 60fps) dan pencegahan Garbage Collection stall.
- `wasm-edge-computing-expert` — Kompilasi modul simulasi C++/Rust kustom ke WebAssembly.

### Deskripsi
Panduan produksi untuk merekayasa game web komersial 2D dan 3D dengan target stabil di 60 hingga 144+ FPS. Menerapkan arsitektur game modern: **Fixed-Timestep Accumulator dengan interpolasi render**, **Physics Engine berbasis WebAssembly** (Rapier 3D, Jolt Physics, Havok), **Zero-GC Object Pooling** untuk mencegah lonjakan Garbage Collector JavaScript, arsitektur **ECS (Entity Component System)**, **Audio Spasial 3D Web Audio API (HRTF)**, dan **Netcode WebTransport / WebRTC berlatensi rendah**.

### Kondisi Pemicu
Aktifkan skill ini ketika pengguna:
- Membangun game web atau simulasi fisika (2D maupun 3D).
- Mengintegrasikan mesin fisika `@dimforge/rapier3d`, `jolt-physics`, `@babylonjs/havok`, atau `@react-three/rapier`.
- Memperbaiki ketidakteraturan fisika atau *stuttering* pada monitor 120Hz/144Hz.
- Mengimplementasikan ECS (*Entity Component System*) dengan `bitECS` atau `miniplex`.
- Mendesain *Object Pool* tanpa alokasi memori berulang untuk proyektil, peluru, atau partikel.
- Mengintegrasikan kontrol Gamepad API, Pointer Lock (mouse look), atau kontrol sentuh virtual mobile.
- Menambahkan audio spasial 3D menggunakan Web Audio API.
- Merancang arsitektur multiplayer real-time menggunakan WebTransport atau WebRTC.

---

### Prinsip Inti Rekayasa Game Web

1. **Fixed-Timestep Accumulator Loop (Wajib)**:
   - Jangan pernah menjalankan komputasi fisika langsung pada delta waktu `requestAnimationFrame`. Perubahan refresh rate monitor (60Hz, 120Hz, 144Hz) akan merusak konsistensi fisika.
   - Akumulasikan waktu frame dan jalankan langkah fisika pada tick tetap (misal 60Hz), lalu hitung `alpha` untuk menginterpolasikan posisi render grafis secara mulus.

2. **Mesin Fisika WASM (Rapier / Jolt / Havok)**:
   - Gunakan **Rapier 3D** (Rust WASM + SIMD) untuk Three.js/R3F.
   - Gunakan **Jolt Physics** untuk simulasi skala besar ribuan objek dinamis.
   - Gunakan **Havok** jika membangun di atas Babylon.js.
   - Hindari penggunaan *mesh collider* (Trimesh) pada objek bergerak; selalu gunakan primitif (Bola, Kotak, Kapsul).

3. **Manajemen Memori Zero-GC**:
   - Pembuatan objek baru (`new Vector3()`, objek peluru) setiap frame memicu *Garbage Collection* di browser yang menyebabkan frame drop berkala.
   - Daur ulang objek menggunakan pola *Object Pooling* dan gunakan kembali variabel scratch statis.

4. **Kontrol Responsif**:
   - Manfaatkan *Pointer Lock API* untuk kontrol kamera first-person / third-person dengan `movementX` dan `movementY`.
   - Gunakan *Gamepad API* dengan deadzone filter untuk mendukung controller konsol (PlayStation, Xbox).

5. **Audio Spasial 3D (HRTF)**:
   - Hubungkan *AudioListener* ke transformasi kamera, dan hubungkan suara ke *PannerNode* dengan model panning `'HRTF'` untuk audio 3 dimensi realistis berdasarkan jarak dan arah.

6. **Netcode Modern (WebTransport)**:
   - Jangan gunakan WebSocket (TCP) untuk posisi pergerakan pemain karena rentan terhadap *Head-of-Line blocking*.
   - Gunakan **WebTransport** (datagram UDP over QUIC) atau WebRTC DataChannels disertai *Client-Side Prediction* dan *Server Reconciliation*.