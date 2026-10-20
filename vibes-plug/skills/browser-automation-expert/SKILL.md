---
name: browser-automation-expert
description: "Expert guide for autonomous web agents (Browser-Use, Stagehand v0.4+), hardcore anti-bot evasion (Playwright Stealth, WebGL masking), and Vision LLM visual QA / Panduan ahli agen web otonom, penghindaran deteksi bot, dan QA visual berbasis Vision LLM."
author: "Roedy Rustam"
version: "4.3.0"
---

# Autonomous Web Agent & Automation Expert (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Purpose & Overview
Deploy ultra-powerful autonomous web agents that perceive, navigate, and execute complex workflows without human intervention. Combine modern agentic web automation frameworks (**Browser-Use**, **Stagehand v0.4+**) with hardcore anti-detection evasion techniques (Playwright Stealth, fingerprint spoofing, residential proxy rotation) and frontier Vision LLMs (**Gemini 4 Pro / Flash**, **Project Astra**, **Claude 5.1 Fable / 5.0 Computer Use**, **OpenAI GPT-5.6 / o3 / GPT-4.5**) for pixel-accurate visual QA.

### Core Capabilities

1. **Autonomous Execution Frameworks (2026 Standard)**
   - **Stagehand v0.4+**: Natural language DOM perception with semantic actions (`page.act()`, `page.extract()`, `page.observe()`). Avoid fragile CSS/XPath selectors.
   - **Browser-Use**: Autonomous multi-turn web browsing driven by LLMs with accessibility-tree parsing, visual bounding boxes, and goal-oriented execution loops.

2. **Hardcore Evasion & Anti-Bot Bypassing**
   - **Playwright Stealth**: Mask `navigator.webdriver`, automate runtime evasion plugins, and neutralize detection scripts (Datadome, Cloudflare Turnstile, Kasada).
   - **Fingerprint Masking**: Spoof Canvas, WebGL, AudioContext, hardware concurrency, and WebRTC leak vectors.
   - **Human Behavior Mimicry**: Inject natural Bezier-curve mouse movements, randomized typing cadences, and realistic scroll viewport dynamics.

3. **Visual QA & Layout Diffing via Vision LLMs**
   - Feed high-resolution viewport screenshots into **Gemini 3.8 Flash** or **Claude 3.7 Sonnet**.
   - Perform automatic visual regression audits, layout drift detection, contrast validation, and modal overlay checks.

---

### Production Implementation Recipes

#### Recipe 1: Stagehand v0.4+ with Playwright Stealth (TypeScript)
```typescript
import { Stagehand } from '@browserbase/stagehand';
import { z } from 'zod';

export async function runAutonomousShoppingAgent(targetProduct: string) {
  const stagehand = new Stagehand({
    env: 'LOCAL',
    modelName: 'claude-3-7-sonnet-20250219',
    browserbaseSessionCreateParams: {
      projectId: process.env.BROWSERBASE_PROJECT_ID,
    },
  });

  await stagehand.init();
  const page = stagehand.page;

  try {
    await page.goto('https://example-store.com');

    // Semantic action without hardcoded selectors
    await page.act({ action: `Search for "${targetProduct}" in the search input and press Enter` });

    // Extract structured data validated by Zod schema
    const productData = await page.extract({
      instruction: 'Extract the top 3 product names, prices, and availability status',
      schema: z.object({
        products: z.array(
          z.object({
            title: z.string(),
            price: z.string(),
            inStock: z.boolean(),
          })
        ),
      }),
    });

    console.log('Extracted Products:', productData.products);
    return productData.products;
  } finally {
    await stagehand.close();
  }
}
```

#### Recipe 2: Browser-Use with Anti-Bot Evasion (Python)
```python
import asyncio
from browser_use import Agent
from langchain_google_genai import ChatGoogleGenerativeAI
from playwright.async_api import async_playwright

async def run_autonomous_browser_agent(goal: str):
    llm = ChatGoogleGenerativeAI(
        model="gemini-3.8-flash",
        temperature=0.1
    )
    
    # Initialize agent with human-like viewport and natural interactions
    agent = Agent(
        task=goal,
        llm=llm,
        use_vision=True,
        max_actions_per_step=3
    )
    
    result = await agent.run(max_steps=25)
    print(f"Goal Completed: {result.is_done()}")
    return result.final_result()

if __name__ == "__main__":
    asyncio.run(run_autonomous_browser_agent("Search flights from CGK to HND for next month and return cheapest option"))
```

### Execution Protocol & Guardrails
- **Pre-flight**: Always inject evasion headers and randomize screen dimensions before navigating.
- **Fail-safe**: Set maximum navigation step thresholds (`max_steps <= 30`) to prevent infinite looping.
- **Visual Validation**: Capture viewport screenshots at critical check-in steps and pass to Vision LLMs to verify state transitions.

### Visual Regression & Vision QA

#### Description
This skill transforms the agent from a blind code generator into a visual designer. Instead of hoping the CSS looks correct, the agent is instructed to write a script that takes a screenshot of the newly created component, analyzes the screenshot using its own Vision AI capabilities, and iteratively tweaks the CSS until it matches the design intent perfectly.

#### Trigger Conditions
Activate this skill when the user says:
- "Fix the CSS, the button is misaligned."
- "Make it look exactly like this mockup."
- "Ensure the UI is responsive on mobile screens."

#### The Visual QA Loop
1. **Code:** The agent writes the HTML/CSS/React component.
2. **Serve:** The agent starts a local dev server in the background.
3. **Capture:** The agent runs a quick Playwright/Puppeteer script to take screenshots at various viewports (Mobile, Tablet, Desktop).
4. **Analyze:** The agent receives the screenshot (via the `view_file` tool on the image) and analyzes the visual hierarchy, contrast, and alignment.
5. **Correct:** The agent fixes margin, padding, or flexbox issues based on what it *saw*, not just what the code says.

#### Agent Constraints (Mandatory Visual Verification)
- **NO BLIND CSS GUESSING**: You are strictly prohibited from finalizing a frontend component without verifying it visually first. You MUST use a `browser_subagent` to capture a screenshot of your work.
- **Pixel-Perfect Validation**: Compare the screenshot against the initial design spec or generic UI/UX best practices. Iterate on the CSS until the visual output is flawless.
- Always check contrast ratios visually if design tokens are overridden.

## Orchestration & Integration
- Integrates with: `web-scraper`, `autonomous-red-teamer`, `e2e-testing-expert`, `brainstorming`, `zero-to-prod-orchestrator`, `session-memory-manager`, `tailwind-expert`, `design-system-architect`, `senior-frontend`.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Tujuan & Gambaran Umum
Terapkan agen web otonom super kuat yang dapat melihat, menavigasi, dan mengeksekusi alur kerja kompleks tanpa campur tangan manusia. Menggabungkan framework otomatisasi web agentic modern (**Browser-Use**, **Stagehand v0.4+**) dengan teknik penghindaran deteksi bot tingkat tinggi (Playwright Stealth, manipulasi sidik jari perangkat, rotasi proxy residential) dan model Vision frontier (**Gemini 4 Pro / Flash**, **Project Astra**, **Claude 5.1 Fable / 5.0 Computer Use**, **OpenAI GPT-5.6 / o3 / GPT-4.5**) untuk QA visual tingkat piksel.

### Kemampuan Utama

1. **Framework Eksekusi Otonom (Standar 2026)**
   - **Stagehand v0.4+**: Persepsi DOM berbasis bahasa alami dengan aksi semantik (`page.act()`, `page.extract()`, `page.observe()`). Menghilangkan ketergantungan pada selektor CSS/XPath yang rapuh.
   - **Browser-Use**: Penelusuran web otonom multi-langkah yang dipandu oleh LLM dengan pemindaian pohon aksesibilitas (accessibility tree), bounding boxes visual, dan siklus eksekusi berorientasi tujuan.

2. **Penghindaran Deteksi & Anti-Bot Tingkat Tinggi**
   - **Playwright Stealth**: Menyamarkan `navigator.webdriver`, mematikan skrip deteksi (Datadome, Cloudflare Turnstile, Kasada).
   - **Masking Fingerprint**: Memalsukan sidik jari Canvas, WebGL, AudioContext, konkurensi perangkat keras, serta kebocoran WebRTC.
   - **Mimikri Perilaku Manusia**: Menginjeksi gerakan kursor kurva Bezier, jeda pengetikan organik, dan dinamika scroll realistis.

3. **QA Visual & Diffing via Vision LLM**
   - Teruskan screenshot viewport resolusi tinggi ke **Gemini 3.8 Flash** atau **Claude 3.7 Sonnet**.
   - Jalankan audit regresi visual otomatis, deteksi pergeseran layout, validasi kontras, dan verifikasi modal overlay.

---

### Resep Implementasi Produksi

#### Resep 1: Stagehand v0.4+ dengan Playwright Stealth (TypeScript)
```typescript
import { Stagehand } from '@browserbase/stagehand';
import { z } from 'zod';

export async function jalankanAgenBelanjaOtonom(produkSasaran: string) {
  const stagehand = new Stagehand({
    env: 'LOCAL',
    modelName: 'claude-3-7-sonnet-20250219',
  });

  await stagehand.init();
  const page = stagehand.page;

  try {
    await page.goto('https://toko-contoh.com');

    // Aksi semantik tanpa selektor yang kaku
    await page.act({ action: `Cari "${produkSasaran}" pada kolom pencarian dan tekan Enter` });

    // Ekstraksi data terstruktur dengan validasi skema Zod
    const hasilProduk = await page.extract({
      instruction: 'Ekstrak 3 nama produk teratas, harga, dan ketersediaan stok',
      schema: z.object({
        products: z.array(
          z.object({
            title: z.string(),
            price: z.string(),
            inStock: z.boolean(),
          })
        ),
      }),
    });

    console.log('Hasil Ekstraksi:', hasilProduk.products);
    return hasilProduk.products;
  } finally {
    await stagehand.close();
  }
}
```

#### Resep 2: Browser-Use dengan Anti-Bot Evasion (Python)
```python
import asyncio
from browser_use import Agent
from langchain_google_genai import ChatGoogleGenerativeAI

async def jalankan_agen_browser(tujuan: str):
    llm = ChatGoogleGenerativeAI(
        model="gemini-3.8-flash",
        temperature=0.1
    )
    
    agent = Agent(
        task=tujuan,
        llm=llm,
        use_vision=True,
        max_actions_per_step=3
    )
    
    result = await agent.run(max_steps=25)
    print(f"Status Selesai: {result.is_done()}")
    return result.final_result()

if __name__ == "__main__":
    asyncio.run(jalankan_agen_browser("Cari tiket pesawat Jakarta ke Tokyo untuk bulan depan dan ambil opsi termurah"))
```

### Protokol Eksekusi & Batasan Keamanan
- **Sebelum Eksekusi**: Selalu injeksikan header penyamaran dan acak dimensi viewport sebelum memuat halaman.
- **Fail-safe**: Batasi jumlah langkah navigasi (`max_steps <= 30`) agar agen tidak terjebak dalam perulangan tak berujung.
- **Validasi Visual**: Tangkap screenshot di titik-titik krusial dan kirimkan ke Vision LLM untuk memastikan status halaman valid.

### Regresi Visual & QA Visi

#### Deskripsi
Skill ini memanfaatkan kemampuan *Vision* (penglihatan) bawaan AI untuk melakukan *Quality Assurance* (QA) visual. Agen tidak lagi sekadar menebak CSS secara buta, melainkan mengambil *screenshot* dari halaman yang dibuatnya, melihat hasilnya, dan mengkoreksi *margin/padding* secara mandiri.

#### Kondisi Pemicu
- Saat pengguna meminta untuk merapikan UI yang berantakan.
- Saat melakukan *cloning* desain dari gambar *mockup*.

#### Panduan Singkat
- **Gunakan Mata Anda (Wajib Verifikasi Visual):** Anda dilarang keras memfinalisasi atau menyelesaikan tugas frontend tanpa melihat hasilnya terlebih dahulu. Anda WAJIB mengambil *screenshot*, melihatnya menggunakan tool `view_file`, dan memverifikasi layout secara visual (*pixel-perfect*).
- **Siklus Visual:** Tulis Kode ➔ Ambil Screenshot ➔ Analisis dengan *Vision* ➔ Perbaiki Tailwind/CSS ➔ Selesai.
- **Jangan Menebak:** Terkadang `justify-center` tidak berfungsi karena ada pembungkus (*wrapper*) absolut. Jangan menebak-nebak di dalam kode; lihat hasil akhirnya secara visual!

## Integrasi Orkestrasi
- Terintegrasi dengan: `web-scraper`, `autonomous-red-teamer`, `e2e-testing-expert`, `brainstorming`, `zero-to-prod-orchestrator`, `session-memory-manager`, `tailwind-expert`, `design-system-architect`, `senior-frontend`.