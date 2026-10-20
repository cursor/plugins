---
name: web-scraper
description: "Smart agentic web data extraction with multi-strategy scraping (Crawl4AI v4, Firecrawl), LLM extraction loops, anti-bot bypass, and structured export / Ekstraksi data web cerdas dan agentic dengan scraping multi-strategi (Crawl4AI v4, Firecrawl), ekstraksi LLM, bypass anti-bot, dan ekspor terstruktur."
author: "Roedy Rustam"
version: "4.3.0"
---

# Agentic Web Scraper Expert (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills like `browser-automation-expert`, `ai-llm-integration-expert`, `brainstorming`, and `zero-to-prod-orchestrator` to ensure cohesive agentic execution.

### Description
Advanced Agentic Web Scraping utilizing modern multi-strategy data extraction. Leverages **Crawl4AI v4** and **Firecrawl** to convert raw DOMs into LLM-friendly Markdown. Implements Agentic Extraction loops where the LLM guides the scraper dynamically based on page state. Incorporates strategies for bypassing anti-bot measures (Cloudflare Turnstile, Datadome) and navigating dynamic Shadow DOMs.

### Trigger Conditions
- Extracting structured data from websites for analysis, training data, or content pipelines.
- Scraping dynamic JavaScript-rendered pages and complex SPAs.
- Converting web pages to clean Markdown for LLM context or RAG pipelines.
- Dealing with anti-bot protections or complex Shadow DOM architectures during scraping.
- Implementing an automated agentic data extraction loop.

### Extracting DOM into LLM-Friendly Markdown
Use **Crawl4AI v4** for high-performance async extraction and **Firecrawl** for seamless LLM-ready conversion.

**Crawl4AI v4 (Async Python):**
```python
import asyncio
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode

async def extract_markdown(url: str):
    config = BrowserConfig(headless=True, bypass_csp=True)
    run_config = CrawlerRunConfig(
        cache_mode=CacheMode.ENABLED,
        remove_overlay_elements=True,
        word_count_threshold=50
    )
    
    async with AsyncWebCrawler(config=config) as crawler:
        result = await crawler.arun(url=url, config=run_config)
        # Returns clean, AI-optimized markdown ready for LLM consumption
        return result.markdown.fit_markdown
```

**Firecrawl (Managed API):**
```python
from firecrawl import FirecrawlApp
from pydantic import BaseModel

app = FirecrawlApp(api_key="fc-xxxx")

class ExtractionSchema(BaseModel):
    title: str
    content: str
    key_metrics: list[str]

# Single API call to extract structured data based on JSON schema
result = app.scrape_url(
    "https://example.com/data",
    formats=["extract", "markdown"],
    extract={"schema": ExtractionSchema.model_json_schema()}
)
print(result.markdown) # Clean markdown
print(result.extract)  # Structured JSON
```

### Anti-Bot Bypass & Shadow DOMs
Scraping modern web apps requires bypassing anti-bot measures like Cloudflare Turnstile and Datadome, as well as accessing deeply nested elements.

1. **Anti-Bot Bypass (Cloudflare Turnstile, Datadome):**
   - **Residential Proxies:** Rotate high-quality residential IPs to avoid datacenter IP bans.
   - **Browser Fingerprinting:** Use tools like `playwright-stealth` or specialized stealth browsers (e.g., Undetected ChromeDriver, Curl-Impersonate) to mask automated fingerprints (WebGL, Canvas, User-Agent).
   - **Human-like Interaction:** Introduce random delays, simulate realistic mouse movements, and handle CAPTCHAs via third-party solving services only when necessary.
2. **Dynamic Shadow DOMs:**
   - Use CSS piercing selectors or JavaScript execution to penetrate the Shadow Root.
   - Example (Playwright): `await page.locator('my-web-component >> css=.internal-element').text_content()`
   - Recursively traverse the DOM tree injecting scripts to extract content from encapsulated components.

### Agentic Extraction Loops
Implement an autonomous loop where an LLM guides the scraper based on the current page state, rather than relying on brittle CSS selectors.

1. **Observe:** The scraper extracts the current DOM into clean Markdown.
2. **Analyze:** The LLM analyzes the Markdown to identify necessary data or the next interaction step (e.g., "Click the 'Load More' button").
3. **Act:** The LLM issues a command (extract data, navigate, click, fill form).
4. **Loop:** Repeat until the extraction goal is met.

```python
async def agentic_scrape_loop(url: str, goal: str):
    current_url = url
    while True:
        markdown_content = await extract_markdown(current_url)
        # LLM analyzes state and decides next action
        action = await llm_decide_action(markdown_content, goal)
        
        if action.type == "COMPLETE":
            return action.extracted_data
        elif action.type == "CLICK":
            await click_element(action.target_selector)
        elif action.type == "NAVIGATE":
            current_url = action.new_url
```

### Ethical Scraping Checklist
- [ ] Check `robots.txt` and respect `Disallow` rules.
- [ ] Implement rate limiting.
- [ ] Use descriptive `User-Agent` headers.
- [ ] Do not scrape personal/private data without consent.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `browser-automation-expert`, `ai-llm-integration-expert`, `brainstorming`, dan `zero-to-prod-orchestrator` untuk memastikan eksekusi agentic yang kohesif.

### Deskripsi
Scraping Web Agentic tingkat lanjut menggunakan ekstraksi data multi-strategi modern. Memanfaatkan **Crawl4AI v4** dan **Firecrawl** untuk mengubah DOM mentah menjadi Markdown yang ramah LLM. Mengimplementasikan loop Ekstraksi Agentic di mana LLM memandu scraper secara dinamis berdasarkan status halaman. Menggabungkan strategi untuk melewati tindakan anti-bot (Cloudflare Turnstile, Datadome) dan menavigasi Shadow DOM yang dinamis.

### Kondisi Pemicu
- Mengekstrak data terstruktur dari situs web untuk analisis, data pelatihan, atau pipeline konten.
- Scraping halaman yang dirender JavaScript secara dinamis dan SPA kompleks.
- Mengonversi halaman web menjadi Markdown bersih untuk konteks LLM atau pipeline RAG.
- Menghadapi perlindungan anti-bot atau arsitektur Shadow DOM yang kompleks saat scraping.
- Mengimplementasikan loop ekstraksi data agentic otomatis.

### Mengekstrak DOM menjadi Markdown Ramah LLM
Gunakan **Crawl4AI v4** untuk ekstraksi async berperforma tinggi dan **Firecrawl** untuk konversi siap LLM yang mulus. (Lihat contoh kode di bagian bahasa Inggris).

### Bypass Anti-Bot & Shadow DOM
1. **Bypass Anti-Bot (Cloudflare Turnstile, Datadome):**
   - **Proxy Residensial:** Rotasi IP residensial berkualitas tinggi untuk menghindari pemblokiran IP datacenter.
   - **Browser Fingerprinting:** Gunakan alat seperti `playwright-stealth` atau browser stealth khusus untuk menyembunyikan sidik jari otomatis.
   - **Interaksi Mirip Manusia:** Tambahkan penundaan acak, simulasikan gerakan mouse yang realistis.
2. **Shadow DOM Dinamis:**
   - Gunakan selektor penembus CSS atau eksekusi JavaScript untuk menembus Shadow Root.
   - Telusuri pohon DOM secara rekursif dengan menyuntikkan skrip untuk mengekstrak konten.

### Loop Ekstraksi Agentic
Implementasikan loop otonom di mana LLM memandu scraper berdasarkan status halaman saat ini, bukan bergantung pada selektor CSS yang rentan rusak.

1. **Observasi:** Scraper mengekstrak DOM saat ini menjadi Markdown yang bersih.
2. **Analisis:** LLM menganalisis Markdown untuk mengidentifikasi data yang diperlukan atau langkah interaksi selanjutnya (misal: "Klik tombol 'Muat Lebih Banyak'").
3. **Aksi:** LLM mengeluarkan perintah (ekstrak data, navigasi, klik, isi form).
4. **Loop:** Ulangi hingga tujuan ekstraksi tercapai.

### Checklist Scraping Etis
- [ ] Periksa `robots.txt` dan hormati aturan `Disallow`.
- [ ] Implementasikan rate limiting.
- [ ] Gunakan header `User-Agent` yang deskriptif.
- [ ] Jangan scraping data pribadi/privat tanpa izin.