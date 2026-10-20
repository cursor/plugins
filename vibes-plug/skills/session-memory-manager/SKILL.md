---
name: session-memory-manager
description: "Manages the entire session lifecycle: from context loading (PRD, Tech Stack) at startup, to maintaining project memory during active sessions, and creating ultra-compact checkpoints for handoff. / Mengelola siklus hidup sesi: dari pemuatan konteks awal, pemeliharaan memori proyek, hingga pembuatan checkpoint ringkas untuk handoff."
author: "Roedy Rustam"
version: "4.3.0"
---

# Session Memory Manager

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills like `brainstorming` and `zero-to-prod-orchestrator` to ensure cohesive execution across the entire session lifecycle.

### Description
This skill acts as the agent's memory controller. It handles loading project context at session startup, dynamically updating the context map and learning graph during the session, and seamlessly generating ultra-compact handoff checkpoints at session end.

### 1. Session Start (Ingestion)
Activate this phase IMMEDIATELY on a new session, or when the user says "start session" or "load context". Do not answer primary requests until complete.

**Workflow:**
1. **Discover Files**: Search the root or `.docs/` using `list_dir`, `grep_search`, or `view_file` for: `CONTEXT_MAP.md`, `LEARNING_GRAPH.md`, `PRD.md`, `BLUEPRINT.md` (or `ARCHITECTURE.md`), and `CHECKPOINT.md`. Also read tech stack identifiers (`TECH_STACK.md`, `package.json`, `go.mod`, etc.).
2. **Internalize**: Read the contents. Grasp the architectural constraints, user stylistic preferences, hard-learned lessons, and the current goal/milestone.
3. **Acknowledge**: Briefly confirm to the user what context was loaded, stating the Tech Stack and immediate goal. Proceed to address the actual request.

### 2. Active Session (Run)
Maintain project memory actively to prevent context exhaustion and hallucination.

**Maintain Context Map (`CONTEXT_MAP.md`)**
- A highly compressed index (bullet points) of architecture, dependency graphs, and state locations.
- **Rules**: Do not store full code; use only file paths and 1-sentence responsibilities. Use BM25/`grep_search` before modifying. Append new major components/routes immediately upon creation.

**Maintain Learning Graph (`LEARNING_GRAPH.md`)**
- **Triggers**: When the user corrects code style, states a strong preference, or after resolving a complex bug. 
- **Rules**: Physically write lessons to the memory file under categories: User Stylistic Preferences, Hard-Learned Lessons, Architectural Decisions. Do not just promise to remember.
- **Global Memory**: For issues spanning multiple projects, document the root cause/solution into a global context directory (e.g., `<appDataDir>/knowledge`). Inject this historical context proactively in future tasks.

### 3. Session End (Handoff)
**Triggers**: Session is very long (>30 messages or >70% context used), major milestone reached, or user says "save checkpoint" / "handoff".

**Action**: Generate an ultra-compact YAML checkpoint block (<200 tokens).

**Checkpoint Format**:
```yaml
# CHECKPOINT — [Project Name] — [Date]
project: "[Name]"
goal: "[One-line goal]"
status: "[e.g., 60% — backend API done]"
stack: "[Tech Stack]"
last_completed:
  - "[Most recent task]"
next_tasks:
  - "[Immediate next task]"
blockers: "[Blockers or 'none']"
key_files:
  - "[path/to/critical.ts]"
env_needed: "[List of vars]"
notes: "[Critical context]"
```

**Cross-Model Handoff Prompt**:
Use this universal template when moving across models (Gemini, Claude, GPT):
```markdown
## RESUME CONTEXT — [Project Name]
**Goal**: [One-sentence goal]
**Current Status**: [Status]
**Tech Stack**: [Stack]
**Completed**: [Done items]
**Next Tasks**: 1. [Task 1] 2. [Task 2]
**Critical Files to Read First**: [File paths & reasons]
**Known Constraints**: [Constraints]
**Do NOT**: [Anti-patterns to avoid]
Start by reading the critical files, then confirm understanding before proceeding.
```

**Checkpoint Storage Hierarchy**:
1. `CHECKPOINT.md` in project root (Primary).
2. `.agents/CHECKPOINT.md` (Alternative).
3. Clipboard or Supabase notes table (Cross-device).

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain seperti `brainstorming` dan `zero-to-prod-orchestrator` untuk memastikan eksekusi kohesif selama siklus hidup sesi.

### Deskripsi
Skill ini mengatur memori agen: memuat konteks di awal sesi, memperbarui peta proyek dan grafik pembelajaran selama sesi berjalan, dan membuat checkpoint ringkas untuk perpindahan sesi (handoff).

### 1. Awal Sesi (Ingestion)
Aktifkan SEGERA pada sesi baru, atau saat diminta "mulai sesi" / "muat konteks". 

**Alur Kerja:**
1. **Temukan File**: Cari di root atau `.docs/`: `CONTEXT_MAP.md`, `LEARNING_GRAPH.md`, `PRD.md`, `BLUEPRINT.md`, `CHECKPOINT.md`, dan file identifikasi tech stack (`package.json`, dsb).
2. **Pahami**: Baca isinya. Pahami batasan arsitektur, preferensi pengguna, pelajaran penting, dan tujuan/milestone saat ini.
3. **Konfirmasi**: Beritahu pengguna secara singkat bahwa konteks dimuat, sebutkan Tech Stack dan tujuan langsung, lalu proses permintaan utama.

### 2. Sesi Berjalan (Run)
Pertahankan memori proyek agar tidak terjadi halusinasi dan hemat token.

**Pelihara Peta Konteks (`CONTEXT_MAP.md`)**
- Indeks super padat berisi arsitektur, lokasi file penting, dan graf dependensi.
- **Aturan**: Jangan simpan kode lengkap, hanya path dan tanggung jawab singkat. Gunakan BM25/`grep_search` sebelum mengedit. Tambahkan entri baru saat membuat komponen/rute besar.

**Pelihara Grafik Pembelajaran (`LEARNING_GRAPH.md`)**
- **Pemicu**: Pengguna mengoreksi gaya koding, menyatakan preferensi, atau setelah mengatasi bug rumit.
- **Aturan**: Catat langsung ke file dalam kategori: Preferensi Gaya, Pelajaran Berharga, Keputusan Arsitektur. 
- **Memori Global**: Ekstrak solusi masalah lintas-proyek ke direktori pengetahuan global (`<appDataDir>/knowledge`). Gunakan pengetahuan masa lalu secara proaktif dengan menyebutkannya.

### 3. Akhir Sesi (Handoff)
**Pemicu**: Pesan > 30, jendela konteks > 70% terpakai, milestone tercapai, atau pengguna berkata "simpan checkpoint".

**Tindakan**: Hasilkan blok YAML super ringkas (<200 token) berisi: `project`, `goal`, `status`, `stack`, `last_completed`, `next_tasks`, `blockers`, `key_files`, `env_needed`, dan `notes`.

**Prompt Handoff Lintas-Model**:
Gunakan template universal saat berpindah model:
Berikan konteks proyek (Tujuan, Status, Stack, Tugas Selesai, Tugas Berikutnya), daftar file kritis untuk dibaca pertama kali, batasan, dan apa yang JANGAN dilakukan. Minta konfirmasi sebelum lanjut.

**Hierarki Penyimpanan Checkpoint**:
1. `CHECKPOINT.md` di root proyek (Utama).
2. `.agents/CHECKPOINT.md` (Alternatif).
3. Clipboard / Catatan Supabase (Lintas perangkat).