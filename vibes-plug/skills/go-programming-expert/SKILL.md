---
name: go-programming-expert
description: "Expert-level skill for Go programming (Go 1.25+). Covers high-performance microservices, concurrency patterns, sqlc, net/http, Gin/Echo/Fiber, gRPC, and testing in English and Indonesian."
author: "Roedy Rustam"
version: "4.3.0"
---

# Go Programming Expert (Go 1.25 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills like `brainstorming`, `zero-to-prod-orchestrator`, and `session-memory-manager` to ensure cohesive execution.

### Description
Expert-level Go development for building high-performance microservices, APIs, and CLI tools. Covers **Go 1.25** features (range-over-func iterators, generic type aliases, weak pointers), structured logging with `slog`, `net/http` with the new ServeMux patterns, Gin/Echo/Fiber frameworks, sqlc for type-safe SQL, gRPC, and production testing patterns.

### Trigger Conditions
- Writing Go 1.24+ / 1.25+ microservices or APIs.
- Implementing concurrency patterns with goroutines, channels, and `sync` primitives.
- Using structured logging with `log/slog`.
- Building HTTP servers with `net/http` ServeMux (Go 1.22+) or Gin/Echo/Fiber.
- Writing type-safe SQL with **sqlc** or using **GORM**.
- Implementing gRPC services with protobuf.
- Writing Go tests with the standard `testing` package + `testify`.

### Go 1.25 — Key Features

#### Range-Over-Func (Go 1.22 → Stable in 1.24/1.25)
Range over custom iterators — enables functional-style collection operations:
```go
// Define an iterator function
func Fibonacci() iter.Seq[int] {
    return func(yield func(int) bool) {
        a, b := 0, 1
        for {
            if !yield(a) {
                return
            }
            a, b = b, a+b
        }
    }
}

// Range over it naturally
for n := range Fibonacci() {
    if n > 100 {
        break
    }
    fmt.Println(n)
}
```

#### Generic Type Aliases (Go 1.24/1.25)
```go
// Type alias with generic parameters
type Set[T comparable] = map[T]struct{}
type Result[T any] = struct{ Value T; Err error }

// Usage
var s Set[string] = make(map[string]struct{})
```

#### Weak Pointers (Go 1.24/1.25)
```go
import "weak"

// Weak pointer — does not prevent GC collection
ptr := weak.Make(&myStruct{})
if val := ptr.Value(); val != nil {
    // Still alive
}
```

### Structured Logging with `log/slog`
```go
package main

import (
    "log/slog"
    "os"
)

func main() {
    // Production JSON logger
    logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelInfo,
        AddSource: true, // include file:line
    }))
    slog.SetDefault(logger)

    slog.Info("server started", "port", 8080, "env", "production")
    slog.Error("database connection failed", "error", err, "host", dbHost)
    
    // Grouped context
    reqLogger := logger.WithGroup("request").With(
        "trace_id", traceID,
        "user_id", userID,
    )
    reqLogger.Info("handler called", "method", r.Method, "path", r.URL.Path)
}
```

### HTTP Server — net/http ServeMux (Go 1.22+)
Go 1.22 upgraded the standard ServeMux with method-based routing and path parameters — reducing the need for external routers:
```go
package main

import (
    "encoding/json"
    "net/http"
    "log/slog"
)

func main() {
    mux := http.NewServeMux()

    // Method + path pattern matching (Go 1.22+)
    mux.HandleFunc("GET /api/users", listUsers)
    mux.HandleFunc("POST /api/users", createUser)
    mux.HandleFunc("GET /api/users/{id}", getUser)  // path params
    mux.HandleFunc("DELETE /api/users/{id}", deleteUser)

    slog.Info("starting server", "addr", ":8080")
    http.ListenAndServe(":8080", mux)
}

func getUser(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")  // Extract path parameter
    // ...
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(user)
}
```

### Type-Safe SQL with sqlc
```bash
# Install sqlc
go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest

# sqlc.yaml
version: "2"
sql:
  - engine: "postgresql"
    queries: "queries/"
    schema: "schema/"
    gen:
      go:
        package: "db"
        out: "internal/db"
        emit_json_tags: true
        emit_interface: true
```

```sql
-- queries/users.sql
-- name: GetUser :one
SELECT * FROM users WHERE id = $1 LIMIT 1;

-- name: ListUsers :many
SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2;

-- name: CreateUser :one
INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *;
```

```go
// Generated type-safe Go code (used in handlers)
user, err := queries.GetUser(ctx, userID) // Fully typed!
users, err := queries.ListUsers(ctx, db.ListUsersParams{Limit: 20, Offset: 0})
```

### Concurrency Patterns

#### errgroup for Parallel Work
```go
import "golang.org/x/sync/errgroup"

g, ctx := errgroup.WithContext(context.Background())

g.Go(func() error { return fetchA(ctx) })
g.Go(func() error { return fetchB(ctx) })

if err := g.Wait(); err != nil {
    // First error from any goroutine
    return fmt.Errorf("parallel fetch: %w", err)
}
```

#### Worker Pool Pattern
```go
func workerPool(jobs <-chan Job, results chan<- Result, numWorkers int) {
    var wg sync.WaitGroup
    for range numWorkers {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for job := range jobs {
                results <- process(job)
            }
        }()
    }
    wg.Wait()
    close(results)
}
```

### Testing Best Practices
```go
package user_test

import (
    "testing"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestGetUser(t *testing.T) {
    t.Parallel() // Always parallelize independent tests

    // Table-driven tests
    tests := []struct{
        name   string
        userID string
        want   *User
        wantErr bool
    }{
        {"valid user", "user-123", &User{ID: "user-123"}, false},
        {"not found", "missing", nil, true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel()
            got, err := GetUser(context.Background(), tt.userID)
            if tt.wantErr {
                require.Error(t, err)
                return
            }
            require.NoError(t, err)
            assert.Equal(t, tt.want.ID, got.ID)
        })
    }
}
```

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `brainstorming`, `zero-to-prod-orchestrator`, dan `session-memory-manager` untuk memastikan eksekusi yang kohesif.

### Deskripsi
Panduan Go tingkat ahli untuk membangun microservices, API, dan CLI tool berkinerja tinggi. Mencakup fitur **Go 1.25** (range-over-func, generic type alias, weak pointer), structured logging dengan `slog`, ServeMux `net/http` dengan pola baru (Go 1.22+), framework Gin/Echo/Fiber, sqlc untuk SQL type-safe, gRPC, dan pola pengujian produksi.

### Kondisi Pemicu
- Menulis microservices atau API Go 1.24+/1.25+.
- Mengimplementasikan pola konkurensi dengan goroutine, channel, dan primitif `sync`.
- Menggunakan structured logging dengan `log/slog`.
- Membangun HTTP server dengan ServeMux `net/http` (Go 1.22+) atau Gin/Echo/Fiber.
- Menulis SQL type-safe dengan **sqlc** atau GORM.
- Mengimplementasikan layanan gRPC dengan protobuf.

### Go 1.25 — Fitur Utama

#### Range-Over-Func (Stabil di 1.24/1.25)
Go 1.24/1.25 menstabilkan range over iterator function — memungkinkan koleksi gaya fungsional yang idiomatis tanpa mengekspos slice internal.

#### Generic Type Alias
Go 1.24/1.25 memungkinkan alias tipe dengan parameter generic, meningkatkan komposibilitas tipe.

#### Weak Pointer
`weak.Make()` membuat pointer lemah yang tidak mencegah GC mengumpulkan objek — berguna untuk cache.

### Structured Logging dengan `log/slog`
Paket `log/slog` bawaan Go (sejak 1.21) mendukung output JSON terstruktur, level log, dan pengelompokan atribut. Gunakan sebagai standar logging di semua proyek Go baru.

### HTTP Server — net/http ServeMux (Go 1.22+)
ServeMux Go 1.22 mendukung pencocokan berdasarkan metode HTTP dan parameter path — mengurangi kebutuhan router eksternal untuk API sederhana.

### SQL Type-Safe dengan sqlc
`sqlc` menghasilkan kode Go yang fully typed dari query SQL dan skema database — menghilangkan kebutuhan ORM untuk sebagian besar kasus.

### Pola Konkurensi

#### errgroup
Gunakan `errgroup.WithContext()` dari `golang.org/x/sync/errgroup` untuk menjalankan goroutine paralel dan mengumpulkan error pertama secara aman.

#### Worker Pool
Gunakan pola worker pool dengan channel untuk memproses pekerjaan secara paralel dengan jumlah goroutine yang terkendali.

### Best Practices Pengujian
- Gunakan `t.Parallel()` untuk semua test independen.
- Gunakan table-driven tests untuk menguji banyak skenario dengan kode minimal.
- Gunakan `testify/assert` dan `testify/require` untuk assertion yang ekspresif.