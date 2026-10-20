---
name: proactive-background-watcher
description: "Grants the AI the ability to act proactively using native cron/timer scheduling. The agent can monitor systems, poll APIs, or watch logs in the background and self-trigger without waiting for user prompts."
author: "Roedy Rustam"
version: "4.3.0"
---

# Proactive Background Watcher (Sentinel Daemon Protocol)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
Standard LLM chat sessions are strictly reactive—they remain dormant until the user submits a prompt. This skill unlocks proactive agency. Utilizing the runtime's native `schedule` tool (one-shot timers and recurring cron schedules), the agent can autonomously monitor background build pipelines, poll health endpoints, inspect server logs, or track deployment state machines. When an anomaly occurs or a long-running job finishes, the agent wakes up autonomously to diagnose, notify, or remediate without waiting for human prompting.

### Trigger Conditions
- User requests asynchronous monitoring: *"Let me know when the Vercel build succeeds"*, *"Watch the test runner"*, or *"Alert me if memory spikes"*.
- Running long-running database migrations or load tests in the background.
- Scheduled recurring health audits (e.g., periodic SSL expiry or API latency checks).
- Watchdog supervision over multi-agent swarm subtasks.

### Sentinel Execution Architecture

```
User Prompt: "Run migrations and alert me when complete"
       │
       ▼
1. Launch Background Task (run_command with WaitMsBeforeAsync=500)
       │
       ▼
2. Register Sentinel Timer via `schedule`
   (DurationSeconds=120, Prompt="Check migration task status", TimerCondition="task-id")
       │
       ▼
3. Agent Ends Turn (System enters reactive sleep state)
       │
       ▼
4. Autonomous Wakeup on Timer Expiration or Task Completion
       │
       ├─► Success ──► Synthesize artifact & notify user
       └─► Error   ──► Trigger `autonomous-tdd-debugger` or `self-healing-cloud-orchestrator`
```

### Production Tool Invocation Patterns

#### Pattern A: One-Shot Asynchronous Task Watcher
```json
// Schedule tool call arguments
{
  "DurationSeconds": "180",
  "Prompt": "Audit background migration task-42. Verify exit code and schema integrity.",
  "TimerCondition": "task-42",
  "toolSummary": "Migration watcher timer",
  "toolAction": "Scheduling watchdog timer"
}
```

#### Pattern B: Recurring Health Daemon (Cron Mode)
```json
// Schedule tool call arguments
{
  "CronExpression": "*/10 * * * *",
  "MaxIterations": "6",
  "IsDaemon": true,
  "Prompt": "Poll /api/health and report error budget violations > 0.5% in HEALTH_LOG.md",
  "toolSummary": "Health monitor cron",
  "toolAction": "Setting up 10-minute health check"
}
```

### The 4 Non-Negotiable Sentinel Rules
1. **Zero-Spam Silent Success**: If a periodic poll detects normal operation, the agent MUST NOT post conversational filler to the user. Maintain silence and sleep until an issue arises or a milestone completes.
2. **Deterministic Wakeup Prompt**: Always supply clear, high-information prompts in `schedule` so the awakened model has instant context without re-reading past history.
3. **KV-Cache Prefix Preservation**: Keep the recurring prompt byte-identical across iterations to trigger prompt caching and reduce inference billing by up to 90%.
4. **Lifecycle Cleanup**: Once a watched task terminates, cancel lingering timers using `manage_task` (`Action: 'kill'`).

## Orchestration & Integration
- **`cron-scheduler-expert`**: Provides application-level cron scheduling, while this skill manages agent-native runtime timers.
- **`self-healing-cloud-orchestrator`**: Awakens self-healing agents when crash metrics are discovered during background polling.
- **`ci-cd-devops-architect`**: Monitors deployment pipelines and automated release status.
- **`session-memory-manager`**: Persists sentinel status across extended multi-turn sessions.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Deskripsi
Sesi obrolan LLM standar bersifat sepenuhnya reaktif—hanya merespons saat pengguna mengetik instruksi. Skill ini memberikan kemampuan proaktif (Sentinel). Memanfaatkan tool `schedule` native (timer satu-kali atau cron berkala), agen dapat secara mandiri memantau proses build, melakukan polling pada *health check* API, memeriksa log server, atau memantau proses migrasi database di latar belakang. Jika terjadi error atau proses panjang selesai, agen akan "bangun" sendiri untuk menganalisis, melapor, atau melakukan perbaikan otomatis tanpa menunggu instruksi manual.

### Kondisi Pemicu
- Pengguna meminta pemantauan asinkron: *"Beri tahu saya jika deployment selesai"*, *"Pantau status server"*, atau *"Kabari jika ada error di background"*.
- Menjalankan migrasi database besar atau stress test di latar belakang.
- Pemantauan berkala (misal: cek masa berlaku sertifikat SSL atau latensi endpoint setiap 10 menit).
- Pengawasan terhadap subagent dalam eksekusi Swarm multi-domain.

### Alur Eksekusi Sentinel Proaktif

```
Instruksi: "Jalankan migrasi di background dan kabari jika selesai"
       │
       ▼
1. Jalankan Perintah Background (run_command dengan timeout pendek)
       │
       ▼
2. Pasang Alarm Timer Sentinel via tool `schedule`
   (DurationSeconds=120, Prompt="Cek status migrasi task-id", TimerCondition="task-id")
       │
       ▼
3. Agen Istirahat (Akhiri giliran tool, sistem masuk mode hemat sumber daya)
       │
       ▼
4. Agen Bangun Otomatis saat Alarm Berbunyi atau Task Selesai
       │
       ├─► Sukses ──► Tulis status di CHECKPOINT.md & beri tahu user
       └─► Gagal  ──► Picu `autonomous-tdd-debugger` untuk memperbaiki error
```

### Pola Pemanggilan Tool Produksi

```json
// Contoh konfigurasi tool schedule untuk memantau deployment
{
  "DurationSeconds": "300",
  "Prompt": "Periksa status deployment di Vercel. Jika gagal, baca log error dan siapkan hotfix.",
  "TimerCondition": "never",
  "toolSummary": "Pemantau deployment",
  "toolAction": "Menjadwalkan alarm sentinel"
}
```

### 4 Aturan Emas Sentinel
1. **Dilarang Spam (Zero-Spam)**: Jika pengecekan berkala mendapati sistem normal, agen **DILARANG** mengirim pesan obrolan kosong ke pengguna. Tetaplah diam dan kembali tidur.
2. **Prompt Bangun yang Jelas**: Selalu sertakan instruksi yang detail pada parameter `Prompt` di tool `schedule` agar agen yang terbangun langsung memahami tugas tanpa perlu membaca ulang seluruh riwayat.
3. **Efisiensi Token & KV-Cache**: Gunakan struktur teks yang seragam pada prompt cron agar prompt caching tetap aktif dan hemat token hingga 90%.
4. **Pembersihan Bersih (Clean Teardown)**: Segera matikan timer yang sudah tidak terpakai menggunakan `manage_task` (`Action: 'kill'`).

## Integrasi Orkestrasi
- **`cron-scheduler-expert`**: Mengatur cron pada level aplikasi, sedangkan skill ini mengatur timer pada level runtime agen AI.
- **`self-healing-cloud-orchestrator`**: Menerima eskalasi otomatis ketika watcher menemukan anomali pada log.
- **`ci-cd-devops-architect`**: Memantau kelulusan pipeline CI/CD di GitHub Actions atau Vercel.
- **`session-memory-manager`**: Mencatat status watcher ke dalam `CHECKPOINT.md`.