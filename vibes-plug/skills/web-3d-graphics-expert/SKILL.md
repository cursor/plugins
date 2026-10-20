---
name: web-3d-graphics-expert
description: "Expert guide for modern WebGPU and WebGL 3D graphics in the browser using Three.js (WebGPURenderer + TSL), Babylon.js, PlayCanvas, React Three Fiber (R3F), and 3Dviz spatial reasoning — covers object craft across 3 scales, surface continuity at joins, physical interaction envelopes, grounded scientific visualization, KTX2/Meshopt optimization, and 3D visual anti-slop / Panduan ahli grafis 3D web, WebGPU modern, dan penalaran spasial 3Dviz."
author: "Roedy Rustam"
version: "4.3.0"
---

# Web 3D Graphics & Spatial Reasoning Expert (WebGPU, Three.js, Babylon.js & 3Dviz)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills:
- `senior-frontend` — Integrating React Three Fiber (R3F) in React 19 / Next.js 15.
- `vue-frontend-expert` — Integrating TresJS in Vue 3 / Nuxt 3.
- `svelte-sveltekit-expert` — Integrating Threlte in Svelte 5 (Runes).
- `web-game-engine-expert` — Physics simulations (Rapier, Jolt, Havok), game loops, and ECS.
- `glsl-shader-expert` — Shading languages, WGSL compute shaders, and TSL nodes.
- `webxr-ar-vr-expert` — WebXR immersive VR/AR experiences.
- `data-visualization-expert` — 3D scientific data visualization and spatial explainers.
- `anti-slop` — 3D visual anti-slop, eliminating generic glowing orbs and proxy meshes.
- `performance-web-vitals` — Minimizing Total Blocking Time (TBT), asset streaming, and bundle sizing.

### Description
Production-grade guidance for architecting high-fidelity, high-framerate 3D experiences in the browser combined with grounded spatial reasoning (3Dviz Protocol). Covers the modern **WebGPU-first** paradigm with automatic WebGL2 fallbacks, **Three.js (r170+) WebGPURenderer** and **TSL (Three Shading Language)**, **Babylon.js WebGPUEngine** with Snapshot Rendering, **PlayCanvas Engine** for ultra-lightweight mobile delivery, and rigorous **object craft across 3 scales** (silhouette, construction, surface).

### Trigger Conditions
Activate this skill when:
- Initializing a WebGPU or WebGL 3D scene, explainer, or interactive model.
- Using `three` (`three/webgpu`), `@react-three/fiber`, `@babylonjs/core`, `playcanvas`, `@tresjs/core`, or `@threlte/core`.
- Designing expressive 3D models, scientific visualizations, or spatial puzzles from scratch.
- Authoring custom geometry, shaders in TSL/WGSL, or procedural meshes.
- Diagnosing object craft weaknesses: accidental seams, pinching highlights, floating geometry, or proxy meshes disguised with high-res textures.
- Implementing physical collision bounds, fixed-timestep physics, or continuous collision detection.
- Compressing 3D assets (`.glb`) with KTX2 Basis Universal and Meshopt.
- Eliminating draw call bottlenecks, FPS drops, or VRAM memory leaks.

---

## 1. The 10-Step Spatial Reasoning & Construction Workflow

A runnable 3D scene requires disciplined spatial judgment. Follow these 10 decisions:

```
  STEP 1                STEP 2               STEP 3                 STEP 4
Visual Intent  ───►  Object Reasoning ───► Grounded Truth  ───► Construction Route
 (Direction)          (The 3 Scales)      (Scientific Claim)    (Kit / Custom / Scan)
       │
       ▼
  STEP 5                STEP 6               STEP 7                 STEP 8
Join Continuity ───► Material & Light ───► Physical Bounds  ───► Real Frame Inspection
(Skin / Layers)       (PBR Identity)       (Colliders & Time)    (Multi-Angle Capture)
       │
       ▼
  STEP 9                STEP 10
Visual Review   ───► Honest Reporting
(Anti-Slop 3D)       (Limitations & State)
```

1. **Intent & Visual Direction**: Identify what the viewer should understand, feel, or do. Decide viewing distance (overview vs. inspection vs. macro close-up). Establish how silhouette, material, lighting, camera, and motion coordinate together.
2. **Object Reasoning (The 3 Scales)**: Before selecting a template, define the silhouette, proportions, connections, surface identity, and behavior that make the hero object convincing. Solve the hardest or most distinctive object first.
3. **Grounded Representation & Scientific Truth**: Choose whether the scene is an illustration, discrete state machine, physical simulation, or recorded playback. For academic/scientific subjects, verify the chain: **Claim → Mathematical Model → Rendered Visual**. An aesthetic mesh does not certify a scientific claim.
4. **Construction Routing per Object**: Choose the right construction route (see Routing Table below) based on requirements rather than habit.
5. **Join Continuity & Topology**: At junctions where parts attach, decide whether the object requires a continuous skin, an overlapping layered covering, or separate articulated mechanical parts.
6. **Material & Lighting Direction**: Build distinct PBR responses (soft tissue, satin, brushed metal, stone, glass, diagrammatic hue). Direct lighting to reveal form: avoid clipped highlights, crushed shadows, and muddy reflections.
7. **Physical Interaction & Spatial Constraints**: Ensure colliders follow visible meshes (including roofs, overhangs, wings, and swept envelopes). Decouple simulation steps from render frames using fixed-timestep accumulators (`accumulatedTime`).
8. **Real Output Inspection**: Never describe an unobserved frame. Inspect overview, oblique angles, meaningful close-ups, and interactive states in an actual browser viewport.
9. **Visual Review & 3D Anti-Slop**: Evaluate against the 16-point 3D visual review checklist. Fix structural shape defects before adding superficial textures or post-processing bloom.
10. **Honest Reporting**: Clearly separate what was mathematically modeled, visually observed, numerically verified, and what remains an artistic simplification.

---

## 2. Construction Routing Table

| Route | When to Choose | What to Preserve |
| :--- | :--- | :--- |
| **Reuse Kit Directly** | Shape, structure, behavior, and finish perfectly match the project brief. | Inspect at intended viewing distance; a well-crafted kit can serve as a hero. |
| **Adapt Kit or Compose Parts** | Common construction is useful, but silhouette, scale, or articulation differs. | Change silhouette, proportions, joins, and materials; recoloring alone is insufficient. |
| **Author Custom Geometry / Rigs** | Distinctive hero, analytical form, scientific mechanism, or unique organic creature. | Reuse low-level mathematical operations and helpers; custom does not mean rebuilding basic infrastructure. |
| **External Authored Asset / Scan** | Real-world scanned CAD, photogrammetry, or museum-grade model fits better than procedural recreation. | Verify provenance, license rights, physical scale (1 unit = 1 meter), registration, and clean topology. |
| **Hybrid Combination** | Different elements require different methods (e.g., procedural terrain + scanned hero + particle effects). | Keep visual style, lighting scale, state ownership, and interaction interfaces coherent. |

---

## 3. Object Craft: Form, Material & Continuity Across 3 Scales

Adding more scattered objects never fixes weak modeling of the primary subject. Craft must be resolved across three distinct visual scales:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        THE 3 SCALES OF OBJECT CRAFT                    │
├───────────────────┬────────────────────────────┬───────────────────────┤
│    SILHOUETTE     │        CONSTRUCTION        │        SURFACE        │
│ Proportions & Mass│   Thickness, Joints, Joins │ Texture Grain & Seams │
│ (Readable in B&W) │  (Mechanical / Biological) │   (Viewing Scale Only)│
└───────────────────┴────────────────────────────┴───────────────────────┘
```

### Scale 1: Silhouette (The Outline Test)
- **Rule**: An object must be immediately recognizable by its silhouette alone without relying on surface color or lighting.
- A windmill, inn, and observatory must remain distinguishable in pure black-and-white. Distinct creature species require distinct anatomical skeletal proportions, not recolored copies of the same base mesh.
- Model silhouette-changing features as **actual geometry**, not normal maps or bump textures.

### Scale 2: Construction & Join Continuity
When attached volumes look like unrelated lumps, diagnose the join relationship:

| Observed Weakness | Root Cause | Sovereign Intervention |
| :--- | :--- | :--- |
| **Accidental seams or bulging seams** | Separate meshes intersecting clumsily on what should be one organic skin. | Author shared continuous surface loops, bridge boundary edges, or perform selective remeshing/CSG union. |
| **Pinching or faceted highlights** | Non-uniform vertex normals, bad winding, or excessive triangulation at joints. | Inspect vertex normals, local curvature, and topology loops before adding polygons. |
| **Disconnected floating layers** | Armor plates, roof tiles, or feathers floating without roots or overlap order. | Refine overlap sequence, root anchorage, thickness, and realistic spacing. |
| **Redundant internal geometry** | Meshes joined without deleting internal hidden polygons, wasting GPU vertex budgets. | Purge hidden internal faces unless revealed by dynamic cutaways or animation. |

> ⚠️ **BufferGeometryUtils Note**: Three.js `mergeGeometries` merely merges attribute buffers into a single draw call. It does **NOT** perform a solid CSG boolean union and does not delete interior hidden faces. Use deliberate topological authoring.

### Scale 3: Surface & Material Response
- Detail must survive at the actual camera distance. Avoid uniform procedural noise, random scratches, or gratuitous subdivision.
- Give materials distinct physical identities: soft tissue requires subsurface scattering/transmission; metal requires low roughness and high metallic response; stone requires directional grain and worn contact areas.

---

## 4. Modern Web 3D Engine Implementations

### A. Three.js WebGPU + TSL (Three Shading Language)
```typescript
import * as THREE from 'three/webgpu';
import { color, float, positionLocal, time, vec3, Fn } from 'three/tsl';

const canvas = document.querySelector('#canvas') as HTMLCanvasElement;
const renderer = new THREE.WebGPURenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
await renderer.init();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 3, 6);

// TSL Node Material: Compiles to WGSL on WebGPU, GLSL on WebGL2 fallback
const customMaterial = new THREE.MeshStandardNodeMaterial({ roughness: 0.2, metalness: 0.8 });

const animatedDisplacement = Fn(() => {
  const t = time.mul(1.5);
  return positionLocal.y.add(t).sin().mul(0.1);
});

customMaterial.positionNode = positionLocal.add(vec3(0, animatedDisplacement(), 0));

const geometry = new THREE.IcosahedronGeometry(1.5, 32);
const mesh = new THREE.Mesh(geometry, customMaterial);
scene.add(mesh);

renderer.setAnimationLoop(() => {
  mesh.rotation.y += 0.005;
  renderer.render(scene, camera);
});
```

### B. React Three Fiber (R3F) with React 19
```tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, Float } from '@react-three/drei';
import * as THREE from 'three/webgpu';

function HeroModel() {
  const { scene } = useGLTF('/models/scientific-apparatus.glb');
  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
      <primitive object={scene} />
    </Float>
  );
}

export function SceneViewer() {
  return (
    <Canvas
      gl={(canvas) => new THREE.WebGPURenderer({ canvas, antialias: true })}
      camera={{ position: [0, 2, 5], fov: 45 }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} castShadow intensity={1.2} />
      <HeroModel />
      <Environment preset="studio" />
      <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
    </Canvas>
  );
}
useGLTF.preload('/models/scientific-apparatus.glb');
```

---

## 5. Physical Interaction, Colliders & Spatial Constraints

When an object occupies space, its physical presence must match its visual boundaries:

### Collider Envelopes Must Follow Visible Meshes
- **The Rule**: Derive colliders from actual mesh geometry. A bounding box that excludes a building's roof will allow airborne characters to fly straight through the roof.
- Moving creatures require **articulated compound colliders** or conservative whole-body capsules that encompass wings, antlers, horns, and turning clearance. A single point at the actor's root is strictly insufficient.

### Discrete Simulation vs. Render Interpolation (Fixed Timestep)
Decouple physics integration from display refresh rates (60Hz, 120Hz, ProMotion) to prevent physics tunneling and non-deterministic behavior:

```typescript
// Fixed Timestep Accumulator Pattern (Fix Your Timestep - Glenn Fiedler)
const PHYSICS_TIMESTEP = 1 / 60; // 60Hz fixed simulation rate
let accumulatedTime = 0;
let lastTime = performance.now();

export function updatePhysicsLoop(currentTime: number, physicsWorld: any) {
  const frameDelta = (currentTime - lastTime) / 1000;
  lastTime = currentTime;
  
  // Cap max frame delta to prevent "spiral of death" on tab resume
  accumulatedTime += Math.min(frameDelta, 0.1);

  while (accumulatedTime >= PHYSICS_TIMESTEP) {
    physicsWorld.step(PHYSICS_TIMESTEP);
    accumulatedTime -= PHYSICS_TIMESTEP;
  }
  
  // Alpha factor for visual transform interpolation between physics states
  const interpolationAlpha = accumulatedTime / PHYSICS_TIMESTEP;
  return interpolationAlpha;
}
```

---

## 6. Scientific Visualization & Grounded Truth Protocol

For models conveying scientific, anatomical, or engineering concepts:
1. **Fact-Check the Chain**: **Source Standard / Formula → Mathematical Model → Rendered Result**. An accurate formula in code does not certify a visual result if coordinate axes or scales are inverted.
2. **Expose Physical Units & Scale**: Never let the viewer guess scale. Include explicit metric units, a 3D scale bar, or known reference objects. Distinguish physical simulation from visual magnification.
3. **True Controls & State Transparency**: Controls must alter the modeled state truthfully. Adjusting a "pressure" slider must alter the underlying physics model or state machine, not just trigger a decorative particle effect. Reset buttons must restore declared initial conditions.

---

## 7. GPU Asset Pipeline & Memory Optimization

1. **KTX2 + Basis Universal GPU Textures (`KHR_texture_basisu`)**:
   - Compresses textures directly in GPU VRAM (saving 75%-85% VRAM compared to PNG/JPG).
   - Transcodes on the fly into native desktop (BC7) or mobile (ASTC) texture formats.
   ```bash
   npx @gltf-transform/cli optimize input.glb output.glb --texture-compress ktx2
   ```
2. **Meshopt Geometry Compression (`EXT_meshopt_compression`)**:
   - Decompresses at gigabytes per second on WASM (10x faster than Draco on mobile CPUs) and optimizes vertex cache locality.
   ```bash
   npx @gltf-transform/cli meshopt input.glb output.glb
   ```
3. **Strict Memory Lifecycle Management (`.dispose()`)**:
   - Explicitly traverse and dispose geometries, materials, and textures when unmounting scenes:
   ```typescript
   export function purgeThreeObject(root: THREE.Object3D) {
     root.traverse((node) => {
       if ((node as THREE.Mesh).isMesh) {
         const mesh = node as THREE.Mesh;
         mesh.geometry?.dispose();
         if (Array.isArray(mesh.material)) {
           mesh.material.forEach((m) => m.dispose());
         } else if (mesh.material) {
           mesh.material.dispose();
         }
       }
     });
   }
   ```

---

## 8. 16-Point 3D Visual Anti-Slop & Quality Checklist

Evaluate every 3D scene against this checklist before completion:

- [ ] **1. Silhouette Clarity**: Does the hero object read distinctly by silhouette alone without color?
- [ ] **2. Plausible Construction**: Do parts connect with realistic thickness, joints, and recesses rather than floating?
- [ ] **3. Join Continuity**: Are skin junctions smooth and mechanical joints cleanly articulated without accidental seams?
- [ ] **4. Viewing-Scale Detail**: Is detail budgeted for the actual camera viewing scale without meaningless micro-noise?
- [ ] **5. Distinct Material Response**: Do materials exhibit varied, physically accurate PBR responses (metal, tissue, stone)?
- [ ] **6. Purposeful Lighting**: Is lighting arranged to reveal form without blown-out highlights or crushed shadows?
- [ ] **7. Effects Earned**: Are bloom, fog, and depth-of-field used purposefully without hiding modeling flaws?
- [ ] **8. Guided Composition**: Does the camera framing, depth, and contrast guide focus to the hero element?
- [ ] **9. Legible Scale**: Are physical dimensions, scale bars, or units clear to the viewer?
- [ ] **10. Appropriate Projection**: Is the camera projection (perspective vs. orthographic) suited to the subject?
- [ ] **11. Intentional Repetition**: Is instancing (`InstancedMesh`) used for repetitive assets without accidental visual jitter?
- [ ] **12. Meaningful Motion**: Is animation purposeful, respecting `prefers-reduced-motion`, with stillness used when appropriate?
- [ ] **13. Spatial Clearance**: Do moving objects avoid clipping through floors, roofs, or surrounding obstacles?
- [ ] **14. Collider Fidelity**: Do collision envelopes enclose actual geometry (including overhangs and wings)?
- [ ] **15. Truthful Controls**: Do sliders, toggles, and resets accurately change the modeled state and restore initial values?
- [ ] **16. Grounded Scientific Claims**: Are anatomical, chemical, or physical models grounded in verified references?

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan:
- `senior-frontend` — Integrasi React Three Fiber (R3F) pada React 19 / Next.js 15.
- `vue-frontend-expert` — Integrasi TresJS pada Vue 3 / Nuxt 3.
- `svelte-sveltekit-expert` — Integrasi Threlte pada Svelte 5 (Runes).
- `web-game-engine-expert` — Simulasi fisika (Rapier, Jolt, Havok), game loop, dan ECS.
- `glsl-shader-expert` — Bahasa shader, compute shader WGSL, dan node TSL.
- `webxr-ar-vr-expert` — Pengalaman WebXR VR/AR imersif.
- `data-visualization-expert` — Visualisasi data ilmiah 3D dan explainer spasial.
- `anti-slop` — Anti-slop visual 3D, membasmi orbe bersinar generik dan model proksi murahan.
- `performance-web-vitals` — Meminimalkan TBT (Total Blocking Time) dan optimasi ukuran bundle.

### Deskripsi
Panduan produksi untuk membangun grafis 3D performa tinggi di browser yang dipadukan dengan penalaran spasial mendalam (*Protokol 3Dviz*). Mengutamakan paradigma modern **WebGPU-first** dengan fallback otomatis ke WebGL2, **Three.js (r170+) WebGPURenderer** dan **TSL (Three Shading Language)**, **Babylon.js WebGPUEngine** dengan Snapshot Rendering, **PlayCanvas Engine** untuk performa mobile ekstrem, serta keahlian bentuk objek (*object craft*) lintas **3 skala visual** (siluet, konstruksi, permukaan).

### Kondisi Pemicu
Aktifkan skill ini ketika:
- Menginisialisasi *scene* WebGPU atau WebGL 3D, visualisasi ilmiah, atau model interaktif.
- Menggunakan `three` (`three/webgpu`), `@react-three/fiber`, `@babylonjs/core`, `playcanvas`, `@tresjs/core`, atau `@threlte/core`.
- Merancang model 3D ekspresif atau teka-teki spasial dari awal.
- Menulis shader khusus dalam TSL/WGSL atau geometri prosedural.
- Memperbaiki kelemahan bentuk objek: sambungan robek, artefak pencahayaan (*pinching*), objek mengambang tanpa dasar, atau model generik yang ditutupi tekstur resolusi tinggi.
- Mengonfigurasi batas tabrakan fisik (*collider envelopes*), fisika *fixed-timestep*, atau *continuous collision detection*.
- Mengompresi aset 3D (`.glb`) dengan KTX2 Basis Universal dan Meshopt.
- Mengatasi penurunan FPS (*frame drop*), hambatan *draw call*, atau kebocoran memori VRAM.

---

## 1. Alur Kerja Penalaran Spasial & Konstruksi 3Dviz (10 Langkah)

Sebuah scene 3D yang dapat dijalankan membutuhkan pertimbangan visual yang matang. Ikuti 10 keputusan ini:

1. **Arah & Maksud Visual**: Tentukan apa yang harus dipahami, dirasakan, atau dilakukan oleh pengguna. Tentukan jarak pandang utama (*overview*, inspeksi, atau *close-up* mikro). Pastikan siluet, material, cahaya, kamera, dan gerakan bekerja selaras.
2. **Penalaran Objek (3 Skala Visual)**: Sebelum memilih template, rumuskan siluet, proporsi, sambungan, karakter permukaan, dan perilaku objek utama. Selesaikan objek yang paling menantang terlebih dahulu.
3. **Representasi Berpijak & Kebenaran Ilmiah**: Tentukan apakah scene berupa ilustrasi, state machine diskrit, simulasi fisika, atau pemutaran animasi. Untuk visualisasi ilmiah, verifikasi rantai: **Klaim/Rumus → Model Matematis → Hasil Visual**.
4. **Rute Konstruksi per Objek**: Pilih rute konstruksi yang tepat (gunakan kit langsung, modifikasi kit, buat geometri kustom, atau gunakan aset pindaian/CAD eksternal).
5. **Kontinuitas Sambungan (*Join Continuity*)**: Pada area sambungan, tentukan apakah objek membutuhkan kulit organik menyatu (*continuous skin*), lapisan bersusun (*layered covering*), atau bagian artikulasi mekanis terpisah.
6. **Arah Material & Pencahayaan**: Rancang respons PBR yang berbeda untuk setiap material (jaringan lunak, logam, batu, kaca). Arahkan cahaya untuk mempertegas bentuk; hindari highlight terpotong (*clipped highlights*) atau bayangan terlalu gelap.
7. **Interaksi Fisik & Batas Spasial**: Pastikan batas tabrakan (*collider*) membungkus mesh visual secara akurat (termasuk atap, sayap, tanduk). Pisahkan tick fisika dari rendering menggunakan akumulator *fixed-timestep*.
8. **Inspeksi Output Nyata di Browser**: Jangan pernah menyimpulkan kualitas visual dari frame yang belum dilihat langsung. Periksa dari sudut overview, oblique, close-up, dan saat interaksi berjalan.
9. **Review Visual & Anti-Slop 3D**: Evaluasi terhadap 16 poin checklist visual. Perbaiki kelemahan bentuk dasar sebelum menambal dengan tekstur atau efek post-processing berlebih.
10. **Laporan Jujur**: Jelaskan secara transparan apa yang dimodelkan secara matematis, apa yang diverifikasi secara numerik, dan bagian mana yang merupakan penyederhanaan artistik.

---

## 2. Keahlian Bentuk Objek: 3 Skala Visual (*Object Craft*)

Menambahkan banyak objek pendukung tidak akan menutupi kelemahan pemodelan pada objek utama. Kualitas bentuk harus diselesaikan pada tiga skala:

### Skala 1: Siluet (*The Silhouette Test*)
- Objek harus dapat dikenali seketika hanya dari siluet hitam-putih tanpa mengandalkan warna atau cahaya.
- Spesies makhluk yang berbeda memerlukan struktur proporsi tulang yang berbeda, bukan sekadar model yang sama yang diberi warna berbeda.
- Fitur yang mengubah garis luar objek wajib dimodelkan sebagai **geometri nyata**, bukan sekadar peta normal (*normal map*).

### Skala 2: Konstruksi & Kontinuitas Sambungan
- **Sambungan Kulit Organik**: Hindari batas persimpangan mesh yang canggung; buat sambungan topologi kontinu atau lakukan remeshing/CSG union yang halus.
- **Lapisan Armor / Bulu**: Pastikan memiliki ketebalan nyata, urutan tumpang-tindih yang teratur, dan jangkar pangkal yang jelas.
- **Artikulasi Mekanis**: Poros dan bantalan harus memiliki toleransi ruang (*clearance*) visual yang masuk akal.

### Skala 3: Perlakuan Permukaan & Material
- Berikan detail permukaan (arah serat kayu, jahitan kain, area kontak aus) hanya pada skala yang terlihat oleh kamera.
- Hindari kebisingan prosedural (*random procedural noise*) yang seragam di seluruh permukaan.

---

## 3. Fisika & Batas Tabrakan Spasial

1. **Collider Wajib Mengikuti Geometri Nyata**:
   - Kotak pembatas (*bounding box*) dasar yang mengecualikan atap bangunan akan menyebabkan karakter melayang menembus atap.
   - Karakter makhluk hidup membutuhkan gabungan collider kapsul majemuk (*compound colliders*) yang mencakup bentang sayap, tanduk, dan ruang gerak putar.
2. **Integrasi Fixed-Timestep (Memisahkan Fisika dari Refresh Rate)**:
   - Gunakan laju simulasi tetap (misal: 60Hz) dengan akumulator waktu untuk mencegah penembusan objek (*tunneling*) dan memastikan stabilitas matematis pada layar 120Hz/ProMotion.

---

## 4. Pipeline Aset GPU & Optimasi Memori

1. **Kompresi Tekstur KTX2 + Basis Universal**:
   - Menghemat 75%-85% VRAM GPU dibanding PNG/JPG karena tetap terkompresi di dalam memori kartu grafis.
2. **Kompresi Geometri Meshopt**:
   - Dekompresi WASM berkecepatan gigabyte per detik (10x lebih cepat dari Draco pada perangkat mobile).
3. **Pembersihan Siklus Hidup Memori (`.dispose()`)**:
   - Telusuri seluruh hierarki objek dan panggil `.dispose()` pada geometri, material, dan tekstur saat komponen di-unmount agar tidak terjadi kebocoran memori VRAM GPU.

---

## 5. Checklist Mandiri Kualitas Grafis 3D (16 Poin)

- [ ] **1. Kejelasan Siluet**: Apakah objek utama terbaca jelas hanya dari siluet hitam-putih?
- [ ] **2. Konstruksi Masuk Akal**: Apakah setiap bagian terhubung dengan ketebalan dan sambungan yang meyakinkan?
- [ ] **3. Kontinuitas Sambungan**: Apakah sambungan kulit halus dan sambungan mekanis terartikulasi tanpa robekan visual?
- [ ] **4. Detail Sesuai Jarak Kamera**: Apakah detail difokuskan pada area yang terlihat oleh kamera tanpa noise acak?
- [ ] **5. Respons PBR Berkarakter**: Apakah setiap material merespons cahaya secara akurat (logam, jaringan lunak, batu)?
- [ ] **6. Pencahayaan Mempertegas Bentuk**: Apakah pencahayaan menghindari highlight terpotong atau bayangan terlalu gelap?
- [ ] **7. Efek Berdasar**: Apakah bloom, fog, dan depth-of-field digunakan secara terarah tanpa menutupi cacat model?
- [ ] **8. Komposisi Terarah**: Apakah framing kamera dan kontras mengarahkan pandangan ke fokus utama?
- [ ] **9. Skala Terbaca**: Apakah satuan metrik, scale bar, atau objek pembanding ditampilkan secara jelas?
- [ ] **10. Proyeksi Kamera Sesuai**: Apakah perspektif atau ortografis dipilih sesuai tujuan komunikasi?
- [ ] **11. Instancing Efisien**: Apakah objek berulang menggunakan `InstancedMesh` tanpa jitter acak yang merusak struktur?
- [ ] **12. Gerakan Bermakna**: Apakah animasi bertujuan jelas dan mematuhi aturan aksesibilitas `prefers-reduced-motion`?
- [ ] **13. Bebas Tembus Spasial**: Apakah objek bergerak terbebas dari tabrakan menembus lantai, atap, atau rintangan?
- [ ] **14. Akurasi Batas Collider**: Apakah collider fisik mencakup seluruh bentuk visual (termasuk atap dan sayap)?
- [ ] **15. Kontrol & Reset Jujur**: Apakah slider dan tombol reset benar-benar mengubah state model dan mengembalikan nilai awal?
- [ ] **16. Kebenaran Klaim Ilmiah**: Apakah model ilmiah/teknis berakar pada referensi yang terverifikasi?