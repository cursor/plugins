---
name: rust-programming-expert
description: "Expert-level skill for Rust programming (Rust 2024 / v1.85+). Covers memory safety, async, Axum/SQLx, CLI, and optimization in English and Indonesian."
author: "Roedy Rustam"
version: "4.3.0"
---

# Rust Programming Expert (2024 Edition / v1.88+)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills like `brainstorming`, `zero-to-prod-orchestrator`, and `session-memory-manager` to ensure cohesive execution.

### Description
Expert-level Rust development for building memory-safe, high-performance systems, APIs, CLI tools, and WebAssembly. Covers the **Rust 2024 edition**, async/await with Tokio, Axum 0.8 web framework, SQLx for async database access, and modern Rust idioms.

### Trigger Conditions
- Writing systems-level code requiring memory safety and zero-cost abstractions.
- Building high-performance HTTP APIs with **Axum 0.8**.
- Implementing async services with **Tokio** runtime.
- Interacting with databases using **SQLx** or **SeaORM**.
- Building CLI tools with **Clap v4**.
- Compiling to **WebAssembly (WASM)** for browser or edge deployment.
- Writing Rust for **Tauri v2** desktop application backends.

### Rust 2024 Edition Highlights
The Rust 2024 edition (stabilized in 1.85) introduces:
- **`gen` blocks**: Generators for lazy sequence production.
- **Lifetime capture rules**: More precise lifetime inference in `impl Trait`.
- **Unsafe extern blocks**: Clearer unsafe boundary declarations.
- **`if let` chains**: `if let Some(x) = opt && x > 0` now works cleanly.
- **`async fn` in traits**: Now stable — no more `async-trait` macro needed.

### Async `fn` in Traits (Stable in Rust 2024)
```rust
// No longer need #[async_trait] macro!
trait DataStore {
    async fn get(&self, id: &str) -> Result<Data, Error>;
    async fn set(&self, id: &str, data: Data) -> Result<(), Error>;
}

impl DataStore for PostgresStore {
    async fn get(&self, id: &str) -> Result<Data, Error> {
        sqlx::query_as("SELECT * FROM data WHERE id = $1")
            .bind(id)
            .fetch_one(&self.pool)
            .await
            .map_err(Into::into)
    }
    async fn set(&self, id: &str, data: Data) -> Result<(), Error> {
        sqlx::query("INSERT INTO data (id, value) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET value = $2")
            .bind(id)
            .bind(&data.value)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}
```

### Axum 0.8 — HTTP API Framework
```rust
use axum::{
    extract::{Path, State},
    response::Json,
    routing::{get, post},
    Router,
};
use sqlx::PgPool;
use serde::{Deserialize, Serialize};

#[derive(Clone)]
struct AppState {
    db: PgPool,
}

#[derive(Serialize, Deserialize)]
struct User {
    id: String,
    name: String,
    email: String,
}

async fn get_user(
    Path(user_id): Path<String>,
    State(state): State<AppState>,
) -> Result<Json<User>, StatusCode> {
    let user = sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", user_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(user))
}

#[tokio::main]
async fn main() {
    let db = PgPool::connect(&std::env::var("DATABASE_URL").unwrap())
        .await
        .expect("Failed to connect to database");

    let state = AppState { db };

    let app = Router::new()
        .route("/users/:id", get(get_user))
        .route("/users", post(create_user))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await.unwrap();
    println!("Listening on :8080");
    axum::serve(listener, app).await.unwrap();
}
```

### SQLx — Compile-Time Verified SQL
```rust
// Compile-time SQL checking (requires DATABASE_URL at build time)
let users = sqlx::query_as!(
    User,
    r#"SELECT id, name, email FROM users WHERE created_at > $1 ORDER BY created_at DESC LIMIT $2"#,
    since,
    limit as i64
)
.fetch_all(&pool)
.await?;
```

### Error Handling — thiserror + anyhow
```rust
use thiserror::Error;

// Library errors: use thiserror for typed errors
#[derive(Debug, Error)]
pub enum AppError {
    #[error("User not found: {id}")]
    UserNotFound { id: String },
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("Validation failed: {message}")]
    Validation { message: String },
}

// Application code: use anyhow for ergonomic error propagation
use anyhow::{Context, Result};

fn process() -> Result<()> {
    let config = load_config().context("Failed to load configuration")?;
    let db = connect_db(&config).context("Failed to connect to database")?;
    Ok(())
}
```

### CLI Tools with Clap v4
```rust
use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "myapp", version, about = "My CLI tool")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Start the server
    Serve {
        #[arg(short, long, default_value = "8080")]
        port: u16,
    },
    /// Run migrations
    Migrate,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();
    match cli.command {
        Commands::Serve { port } => serve(port).await,
        Commands::Migrate => run_migrations().await,
    }
}
```

### Performance Best Practices
- **Zero-cost abstractions**: Use iterators (`map`, `filter`, `collect`) — compiled to the same code as hand-written loops.
- **Avoid unnecessary cloning**: Use references (`&T`) and lifetimes where possible.
- **`Arc<T>` for shared state**: Use `Arc<Mutex<T>>` or `Arc<RwLock<T>>` for shared mutable state across threads.
- **SIMD**: Use `std::simd` (stable in 1.88) for data-parallel operations.
- **Profile before optimizing**: Use `cargo flamegraph` or `perf` to find actual bottlenecks.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `brainstorming`, `zero-to-prod-orchestrator`, dan `session-memory-manager` untuk memastikan eksekusi yang kohesif.

### Deskripsi
Pengembangan Rust tingkat ahli untuk membangun sistem, API, CLI tool, dan WebAssembly yang aman di memori dan berkinerja tinggi. Mencakup **edisi Rust 2024**, async/await dengan Tokio, framework web Axum 0.8, SQLx untuk akses database async, dan idiom Rust modern.

### Kondisi Pemicu
- Menulis kode sistem yang membutuhkan keamanan memori dan zero-cost abstraction.
- Membangun HTTP API berkinerja tinggi dengan **Axum 0.8**.
- Mengimplementasikan layanan async dengan runtime **Tokio**.
- Berinteraksi dengan database menggunakan **SQLx** atau SeaORM.
- Membangun CLI tool dengan **Clap v4**.
- Mengkompilasi ke **WebAssembly (WASM)** untuk browser atau edge.
- Menulis backend Rust untuk aplikasi desktop **Tauri v2**.

### Sorotan Edisi Rust 2024
- **`async fn` dalam trait**: Kini stabil — tidak perlu lagi macro `#[async_trait]`.
- **`if let` chains**: `if let Some(x) = opt && x > 0` kini berfungsi secara bersih.
- **`gen` blocks**: Generator untuk produksi urutan yang malas.
- **Aturan lifetime capture**: Inferensi lifetime yang lebih presisi di `impl Trait`.

### Axum 0.8 — Framework HTTP API
Gunakan Axum untuk HTTP API yang idiomatis dan berkinerja tinggi dibangun di atas Tokio. Manfaatkan extractor (`Path`, `State`, `Json`, `Query`) untuk parameter handler yang type-safe.

### SQLx — SQL Terverifikasi Waktu Kompilasi
SQLx memverifikasi query SQL Anda terhadap database nyata saat kompilasi — menghilangkan seluruh kelas bug runtime.

### Penanganan Error — thiserror + anyhow
- Gunakan `thiserror` untuk error bertipe di library code.
- Gunakan `anyhow` untuk propagasi error yang ergonomis di application code.

### CLI Tool dengan Clap v4
Clap v4 menggunakan derive macro untuk mendefinisikan antarmuka CLI secara deklaratif — perintah, subperintah, argumen, dan flag dengan parsing bawaan.

### Praktik Terbaik Performa
- Gunakan iterator (`map`, `filter`, `collect`) — dikompilasi setara dengan loop manual.
- Hindari cloning yang tidak perlu — gunakan referensi dan lifetime.
- Gunakan `Arc<Mutex<T>>` untuk state bersama yang dapat dimutasi di antara thread.
- Profiling terlebih dahulu dengan `cargo flamegraph` sebelum mengoptimalkan.