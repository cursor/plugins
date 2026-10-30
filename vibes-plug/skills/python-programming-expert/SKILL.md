---
name: python-programming-expert
description: "Expert-level skill for Python programming (Python 3.13/3.14+). Covers type safety, generic syntax (PEP 695), async/await TaskGroups, FastAPI 0.115+, Pydantic v2, uv package manager, Ruff, and pytest in English and Indonesian."
author: "Roedy Rustam"
version: "4.3.0"
---

# Python Programming Expert (3.14 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills like `brainstorming`, `zero-to-prod-orchestrator`, and `session-memory-manager` to ensure cohesive execution.

### Description
Expert-level Python development guidance for **Python 3.13 / 3.14+** covering JIT compilation, free-threaded (no-GIL) mode, modern type safety patterns, async architecture, and the full production stack: **FastAPI 0.115+**, **Pydantic v2**, **SQLAlchemy 2.x / SQLModel**, **uv**, **Ruff**, and **pytest-asyncio**.

### Trigger Conditions
- Writing Python 3.13+ / 3.14+ applications or services.
- Building **FastAPI 0.115+** REST APIs, **Django 5.x**, or **Litestar** web services.
- Managing Python projects with the **`uv`** package manager.
- Implementing async/await patterns with `asyncio.TaskGroup` or structured concurrency.
- Writing type-safe Python with **Pydantic v2** and modern generics (PEP 695/696).
- Setting up **Ruff** for linting + formatting; **pytest** with `pytest-asyncio` for testing.
- Building AI backends integrating with LLM APIs (OpenAI, Anthropic, Google GenAI).

---

### Python Version Matrix (2026)

| Version | Status | Key Feature |
|---|---|---|
| **Python 3.14** | Latest Stable | PEP 696 type defaults, PEP 749 deferred evaluation, Tier-2 JIT |
| **Python 3.13** | Stable LTS | JIT compiler, free-threaded mode (no GIL) |
| **Python 3.12** | Supported | PEP 695 generics, `type` alias statement |
| **Python 3.11** | Security only | `asyncio.TaskGroup`, `ExceptionGroup` |

---

### Modern Python Toolchain (2026)

#### uv — The Standard Package Manager
Replace `pip`, `pip-tools`, `virtualenv`, `pyenv`, and `poetry` entirely with **uv** (written in Rust — 10-100x faster):
```bash
# Create project
uv init my-api
cd my-api

# Add runtime dependencies
uv add fastapi pydantic httpx sqlalchemy[asyncio]

# Add dev dependencies
uv add --dev pytest pytest-asyncio ruff mypy httpx

# Run scripts (no activation needed)
uv run python main.py
uv run pytest
uv run fastapi dev main.py  # Hot reload dev server

# Pin exact Python version
uv python pin 3.13

# Sync all environments
uv sync
```

#### `pyproject.toml` — Single Config File
```toml
[project]
name = "my-api"
version = "0.1.0"
requires-python = ">=3.13"
dependencies = [
    "fastapi>=0.115",
    "pydantic>=2.9",
    "sqlalchemy[asyncio]>=2.0",
    "asyncpg>=0.30",
]

[tool.ruff]
line-length = 88
target-version = "py313"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "UP", "B", "SIM", "ANN", "ASYNC"]

[tool.ruff.lint.per-file-ignores]
"tests/**/*.py" = ["ANN"]  # No type annotations required in tests

[tool.pytest.ini_options]
asyncio_mode = "auto"   # pytest-asyncio auto mode
```

---

### Type Safety — Modern Patterns

#### PEP 695 — Generic Syntax (Python 3.12+)
```python
# Old way (verbose)
from typing import TypeVar, Generic
T = TypeVar('T')
class Stack(Generic[T]):
    def push(self, item: T) -> None: ...

# New way (Python 3.12+) — clean, no boilerplate
class Stack[T]:
    def __init__(self) -> None:
        self._items: list[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> T:
        return self._items.pop()

# Generic functions
def first[T](lst: list[T]) -> T:
    return lst[0]

# Type aliases (PEP 695)
type Vector = list[float]
type Matrix[T] = list[list[T]]
```

#### PEP 696 — TypeVar Defaults (Python 3.14+)
```python
# Default generic types — reduces boilerplate in libraries
class Response[T = dict]:  # T defaults to dict if not specified
    def __init__(self, data: T) -> None:
        self.data = data

response = Response({"key": "value"})  # T inferred as dict
```

#### Pydantic v2 — Production Data Validation
```python
from pydantic import BaseModel, Field, field_validator, model_validator
from pydantic import EmailStr, SecretStr
from typing import Annotated

# Annotated types for reusability
PositiveInt = Annotated[int, Field(gt=0)]
TrimmedStr = Annotated[str, Field(min_length=1, strip_whitespace=True)]

class UserCreate(BaseModel):
    model_config = {"str_strip_whitespace": True}

    name: TrimmedStr = Field(max_length=50)
    email: EmailStr
    age: PositiveInt
    passphrase: SecretStr = Field(min_length=8)

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v.replace(' ', '').isalpha():
            raise ValueError('Name must contain only letters')
        return v.title()

    @model_validator(mode='after')
    def check_adult_email(self) -> 'UserCreate':
        if self.age < 18 and 'kids' not in self.email:
            raise ValueError('Minors must use a kids account email')
        return self

# Usage
user = UserCreate(name="alice smith", email="alice@example.com", age=25, passphrase="sample_valid_token")
user.model_dump()           # {'name': 'Alice Smith', 'email': 'alice@example.com', 'age': 25}
user.model_dump(mode='json')  # JSON-serializable dict
```

---

### FastAPI 0.115+ — Production Patterns

#### Application Structure
```
my_api/
├── main.py             # FastAPI app + lifespan
├── routers/
│   ├── users.py        # APIRouter for /users
│   └── posts.py        # APIRouter for /posts
├── models/
│   ├── user.py         # Pydantic request/response models
│   └── post.py
├── db/
│   ├── database.py     # SQLAlchemy engine + session
│   └── models.py       # ORM models
├── services/
│   └── user_service.py # Business logic layer
└── core/
    ├── config.py       # Settings with Pydantic BaseSettings
    └── security.py     # JWT, hashing
```

#### Lifespan — Startup & Shutdown
```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_size=10)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database connected")
    yield
    # Shutdown
    await engine.dispose()
    print("✅ Database disconnected")

app = FastAPI(title="My API", version="1.0.0", lifespan=lifespan)
```

#### Dependency Injection Pattern
```python
from typing import Annotated
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

DbDep = Annotated[AsyncSession, Depends(get_db)]

# In routes
@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, db: DbDep):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user
```

#### Settings with Pydantic BaseSettings
```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    DATABASE_URL: str
    JWT_SIGNING_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    ENVIRONMENT: str = "development"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

settings = Settings()
```

#### Structured Error Handling (RFC 9457)
```python
from fastapi import Request
from fastapi.responses import JSONResponse

class AppException(Exception):
    def __init__(self, *, type: str, title: str, status: int, detail: str):
        self.type = type
        self.title = title
        self.status = status
        self.detail = detail

@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status,
        content={
            "type": exc.type,
            "title": exc.title,
            "status": exc.status,
            "detail": exc.detail,
        }
    )

# Usage in routes
raise AppException(
    type="https://myapi.com/errors/user-not-found",
    title="User Not Found",
    status=404,
    detail=f"User with id '{user_id}' does not exist",
)
```

---

### Async Patterns

#### asyncio.TaskGroup (Python 3.11+)
```python
import asyncio

async def main():
    # Better than asyncio.gather — propagates exceptions immediately
    async with asyncio.TaskGroup() as tg:
        task_users = tg.create_task(fetch_users())
        task_posts = tg.create_task(fetch_posts())
        task_stats = tg.create_task(fetch_stats())
    # All tasks complete here — exception in any task cancels all others
    return task_users.result(), task_posts.result(), task_stats.result()
```

#### Python 3.13 — JIT & Free-Threaded Mode
```bash
# JIT compiler — 10-20% speedup on CPU-bound code
PYTHON_JIT=1 python3.13 compute_heavy.py

# Free-threaded build (no GIL) — true CPU parallelism
uv python install 3.13t  # install free-threaded build
python3.13t -X gil=0 parallel_app.py
```

---

### Testing with pytest + pytest-asyncio
```python
# conftest.py
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture
async def db_session():
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with async_sessionmaker(engine)() as session:
        yield session
    await engine.dispose()

@pytest.fixture
async def client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

# test_users.py
async def test_create_user(client: AsyncClient):
    response = await client.post("/users", json={"name": "Alice", "email": "alice@test.com", "age": 25, "passphrase": "sample_valid_token"})
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "alice@test.com"
```

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `brainstorming`, `zero-to-prod-orchestrator`, dan `session-memory-manager` untuk memastikan eksekusi yang kohesif.

### Deskripsi
Panduan pengembangan Python tingkat ahli untuk **Python 3.13/3.14+** mencakup JIT compilation, mode free-threaded (tanpa GIL), pola keamanan tipe modern, arsitektur async, dan stack produksi lengkap: **FastAPI 0.115+**, **Pydantic v2**, **SQLAlchemy 2.x**, **uv**, **Ruff**, dan **pytest-asyncio**.

### Kondisi Pemicu
- Menulis aplikasi atau layanan Python 3.13+/3.14+.
- Membangun REST API FastAPI 0.115+, Django 5.x, atau Litestar.
- Mengelola proyek Python dengan manajer paket `uv`.
- Mengimplementasikan pola async/await dengan `asyncio.TaskGroup`.
- Menulis Python type-safe dengan Pydantic v2 dan generik modern (PEP 695/696).
- Menyiapkan Ruff untuk linting + formatting; pytest-asyncio untuk pengujian.

### Toolchain Modern (2026)

**`uv`** menggantikan `pip`, `pip-tools`, `virtualenv`, `pyenv`, dan `poetry` — ditulis dalam Rust, 10-100x lebih cepat. Gunakan satu file `pyproject.toml` untuk semua konfigurasi.

### Keamanan Tipe — Pola Modern

**PEP 695** (Python 3.12+): Sintaksis generic baru yang bersih tanpa boilerplate `TypeVar`. Gunakan `type` statement untuk alias tipe.

**PEP 696** (Python 3.14+): Default untuk TypeVar — mengurangi boilerplate lebih lanjut pada library dan class generic.

**Pydantic v2**: Gunakan `BaseModel`, `Field`, `@field_validator`, dan `@model_validator` untuk validasi data yang ketat. `model_dump()` dan `model_validate()` menggantikan metode v1.

### FastAPI 0.115+ — Pola Produksi

- **Lifespan**: Gunakan `@asynccontextmanager` dengan `lifespan=` di `FastAPI()` untuk startup/shutdown yang bersih.
- **Dependency Injection**: Gunakan `Depends()` dengan `Annotated` untuk sesi database, autentikasi, dll.
- **BaseSettings**: Gunakan `pydantic-settings` untuk konfigurasi dari environment variables dengan validasi tipe.
- **Error RFC 9457**: Format error yang konsisten dengan `type`, `title`, `status`, `detail`.

### Pola Async

Gunakan `asyncio.TaskGroup` (Python 3.11+) sebagai pengganti `asyncio.gather()` — lebih aman karena propagasi exception langsung dan membatalkan semua task lain saat ada yang gagal.

Python 3.13 JIT: Aktifkan dengan `PYTHON_JIT=1` untuk kode CPU-bound. Free-threaded mode (`python3.13t -X gil=0`) untuk paralelisme CPU sejati.

### Pengujian

Gunakan `pytest-asyncio` dengan `asyncio_mode = "auto"` di `pyproject.toml`. Gunakan `AsyncClient` dari `httpx` dengan `ASGITransport` untuk pengujian endpoint async yang bersih dan terisolasi tanpa perlu menjalankan server.