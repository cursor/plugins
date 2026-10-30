---
name: pydantic-ai-expert
description: "Expert guide for type-safe Python AI agent development with Pydantic AI — dependency injection, structured outputs, model-agnostic routing, and graph workflows / Panduan ahli pengembangan agen AI Python type-safe dengan Pydantic AI."
author: "Roedy Rustam"
version: "4.3.0"
---

# Pydantic AI Expert (Type-Safe Python Agent Engineering)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with domain skills like `python-programming-expert`, `multi-agent-orchestration`, `ai-llm-integration-expert`, `ai-prompt-engineering-expert`, and `database-orm-expert` to engineer type-safe, resilient backend AI agents.

### Description
Production-grade guide for building enterprise AI agents using **Pydantic AI** (from the creators of Pydantic). Unlike untyped or fragile agent libraries, Pydantic AI provides strict static typing (`Agent[DepsType, ReturnType]`), first-class dependency injection (`RunContext[Deps]`), automatic tool parameter validation via Pydantic v2 schemas, model-agnostic provider switching (Anthropic, OpenAI, Gemini, Groq, Ollama), dynamic system prompts, and deterministic structured outputs.

**Swarm Synergy:** Within the **Backend & APIs Swarm**, this skill serves as the Lead Python Agent Engineer. It executes critical business operations, runs data pipelines, and integrates with SQL databases with compile-time type safety in Phase 4.

### Trigger Conditions
- Engineering Python-based autonomous agents requiring strict type safety and schema validation.
- Implementing dependency injection (passing database connections, API clients, or user sessions) into agent tools.
- Extracting guaranteed structured outputs from frontier reasoning models without JSON parsing errors.
- Designing multi-agent delegation or agent handoffs in Python microservices.
- Running unit tests and deterministic evals on agent logic using mock models (`TestModel`).

### Pydantic AI Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENT DEFINITION                         │
│  Agent[DatabaseDeps, AuditReport](                          │
│    model='anthropic:claude-3-7-sonnet-latest',              │
│    result_type=AuditReport,                                 │
│  )                                                          │
└──────────────────────────────┬──────────────────────────────┘
                               │
       ┌───────────────────────┴───────────────────────┐
       ▼                                               ▼
┌──────────────────────────────┐       ┌──────────────────────────────┐
│     DEPENDENCY INJECTION     │       │     TOOL EXECUTION LOOP      │
│  RunContext[DatabaseDeps]    │       │  @agent.tool                 │
│  • Async DB connection pool  │       │  • Auto Pydantic validation  │
│  • Tenant & session auth     │       │  • Structured error return   │
└──────────────────────────────┘       └──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             DETERMINISTIC STRUCTURED RESULT                 │
│  result.data -> Pydantic BaseModel instance (Validated)     │
└─────────────────────────────────────────────────────────────┘
```

### Core Implementation Guidelines

#### 1. Type-Safe Agent with Dependency Injection
Pass database pools or HTTP clients directly into tools without global state:
```python
from dataclasses import dataclass
import asyncpg
from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext

@dataclass
class DatabaseDeps:
    pool: asyncpg.Pool
    tenant_id: str

class UserAnomalyReport(BaseModel):
    user_id: str
    risk_score: float = Field(ge=0.0, le=1.0)
    anomalous_events: list[str]
    action_recommended: str

# Typed agent: Agent[DependencyType, ResultType]
security_agent = Agent[DatabaseDeps, UserAnomalyReport](
    model='google-gla:gemini-2.5-flash',
    result_type=UserAnomalyReport,
    system_prompt=(
        "You are an automated SecOps auditor. Analyze the user access logs provided "
        "and generate a strictly structured anomaly assessment."
    ),
)

@security_agent.system_prompt
async def add_tenant_context(ctx: RunContext[DatabaseDeps]) -> str:
    return f"Active Tenant ID: {ctx.deps.tenant_id}. Only audit records matching this tenant."

@security_agent.tool
async def query_audit_logs(ctx: RunContext[DatabaseDeps], user_id: str, limit: int = 50) -> list[dict]:
    """Retrieve raw authentication events for a given user from the audit store."""
    async with ctx.deps.pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT event_time, ip_address, action, status FROM audit_logs "
            "WHERE tenant_id = $1 AND user_id = $2 ORDER BY event_time DESC LIMIT $3",
            ctx.deps.tenant_id, user_id, limit
        )
        return [dict(r) for r in rows]

# Execution:
async def run_audit(pool: asyncpg.Pool, tenant_id: str, target_user: str) -> UserAnomalyReport:
    deps = DatabaseDeps(pool=pool, tenant_id=tenant_id)
    result = await security_agent.run(f"Audit user activity for {target_user}", deps=deps)
    return result.data  # Guaranteed instance of UserAnomalyReport
```

#### 2. Model-Agnostic Switching & Local SLM Fallback
Pydantic AI allows switching between cloud APIs and local Ollama models effortlessly:
```python
import os
from pydantic_ai.models.anthropic import AnthropicModel
from pydantic_ai.models.ollama import OllamaModel

def get_agent_model():
    if os.getenv("ENV") == "production":
        return AnthropicModel('claude-3-7-sonnet-20250219')
    else:
        # Zero cost local development with Ollama
        return OllamaModel(model_name='qwen2.5-coder:7b')
```

#### 3. Deterministic Testing with `TestModel`
Write unit tests that verify tool invocations and structured output parsing without calling live LLMs:
```python
import pytest
from pydantic_ai.models.test import TestModel

@pytest.mark.asyncio
async def test_security_agent_tool_dispatch():
    # TestModel can simulate deterministic responses or tool calls
    test_model = TestModel(call_tools=['query_audit_logs'])
    
    with security_agent.override(model=test_model):
        deps = DatabaseDeps(pool=mock_pool, tenant_id="tenant_123")
        result = await security_agent.run("Audit user 456", deps=deps)
        assert result.data is not None
```

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `python-programming-expert`, `multi-agent-orchestration`, `ai-llm-integration-expert`, `ai-prompt-engineering-expert`, dan `database-orm-expert` untuk membangun agen AI backend yang aman secara tipe (*type-safe*) dan tangguh.

### Deskripsi
Panduan produksi untuk membangun agen AI kelas perusahaan menggunakan **Pydantic AI** (dari pembuat library Pydantic). Tidak seperti library agen yang tidak bertipe statis atau mudah mengalami galat runtime, Pydantic AI menyediakan sistem tipe statis yang ketat (`Agent[DepsType, ReturnType]`), *dependency injection* bawaan kelas satu (`RunContext[Deps]`), validasi parameter tool otomatis melalui skema Pydantic v2, fleksibilitas pergantian model (*model-agnostic*), dan hasil output terstruktur yang terjamin validitasnya.

**Sinergi Swarm:** Di dalam **Backend & APIs Swarm**, skill ini bertindak sebagai Insinyur Agen AI Python Utama. Bertanggung jawab atas eksekusi logika bisnis kritis, orkestrasi pipeline data, dan query database SQL dengan keamanan tipe kompilasi pada Fase 4.

### Kondisi Pemicu
- Membangun agen otonom Python yang menuntut keamanan tipe statis dan validasi skema data ketat.
- Menerapkan injeksi dependensi (koneksi database, klien HTTP, session user) ke dalam tool agen tanpa variabel global.
- Mengekstrak data terstruktur yang dijamin valid dari model penalaran tanpa kegagalan parsing JSON.
- Menjalankan unit test dan evaluasi deterministik pada agen menggunakan model tiruan (`TestModel`).

---

### Implementasi Pola Kunci (Python 3.13+)

#### 1. Agen Type-Safe dengan Injeksi Dependensi Database
```python
from dataclasses import dataclass
import asyncpg
from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext

@dataclass
class DependensiDatabase:
    pool: asyncpg.Pool
    tenant_id: str

class LaporanAnomali(BaseModel):
    user_id: str
    skor_risiko: float = Field(ge=0.0, le=1.0)
    peristiwa_anomali: list[str]
    tindakan_disarankan: str

# Agen dengan tipe statis ketat: Agent[TipeDependensi, TipeHasil]
agen_keamanan = Agent[DependensiDatabase, LaporanAnomali](
    model='google-gla:gemini-2.5-flash',
    result_type=LaporanAnomali,
    system_prompt=(
        "Anda adalah auditor keamanan SecOps otomatis. Analisis log aktivitas "
        "dan hasilkan evaluasi anomali terstruktur."
    ),
)

@agen_keamanan.system_prompt
async def tambahkan_konteks_tenant(ctx: RunContext[DependensiDatabase]) -> str:
    return f"Tenant ID Aktif: {ctx.deps.tenant_id}. Hanya audit catatan milik tenant ini."

@agen_keamanan.tool
async def query_log_audit(ctx: RunContext[DependensiDatabase], user_id: str, batas: int = 50) -> list[dict]:
    """Mengambil riwayat autentikasi pengguna dari database audit."""
    async with ctx.deps.pool.acquire() as conn:
        baris = await conn.fetch(
            "SELECT event_time, ip_address, action, status FROM audit_logs "
            "WHERE tenant_id = $1 AND user_id = $2 ORDER BY event_time DESC LIMIT $3",
            ctx.deps.tenant_id, user_id, batas
        )
        return [dict(b) for b in baris]

# Eksekusi agen secara aman:
async def jalankan_audit(pool: asyncpg.Pool, tenant_id: str, target_user: str) -> LaporanAnomali:
    deps = DependensiDatabase(pool=pool, tenant_id=tenant_id)
    hasil = await agen_keamanan.run(f"Audit aktivitas user {target_user}", deps=deps)
    return hasil.data  # Dijamin merupakan instance tervalidasi dari LaporanAnomali
```

#### 2. Pengujian Unit Deterministik Menggunakan `TestModel`
```python
import pytest
from pydantic_ai.models.test import TestModel

@pytest.mark.asyncio
async def test_eksekusi_tool_agen():
    model_tes = TestModel(call_tools=['query_log_audit'])
    with agen_keamanan.override(model=model_tes):
        deps = DependensiDatabase(pool=mock_pool, tenant_id="tenant_123")
        hasil = await agen_keamanan.run("Audit user 456", deps=deps)
        assert hasil.data is not None
```