---
name: saas-multi-tenant
description: "Design and implement multi-tenant SaaS architectures with RLS, tenant isolation, and PostgreSQL / Desain dan implementasikan arsitektur SaaS multi-tenant dengan RLS, isolasi tenant, dan PostgreSQL."
author: "Roedy Rustam"
version: "4.3.0"
---

# SaaS Multi-Tenant Expert (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills like `brainstorming`, `zero-to-prod-orchestrator`, and `session-memory-manager` to ensure cohesive execution.

### Description
Expert guide for designing and implementing multi-tenant SaaS architectures with full tenant isolation, Supabase/PostgreSQL Row Level Security (RLS), schema-per-org patterns, RBAC, and Super Admin access controls.

### Trigger Conditions
- Building a SaaS application that serves multiple organizations (workspaces/tenants).
- Implementing Row Level Security (RLS) policies in Supabase or PostgreSQL.
- Designing a data model that isolates tenant data securely.
- Implementing role-based access control (RBAC) within a tenant.
- Building the Super Admin management panel for cross-tenant operations.
- Choosing between shared schema vs. schema-per-org isolation strategies.

### Tenant Isolation Strategies

| Strategy | Isolation Level | Cost | Complexity | Best For |
|---|---|---|---|---|
| **Shared Schema + RLS** | Row-level | Low | Medium | Standard SaaS (< 1M tenants) |
| **Schema per Org** | Table-level | Medium | High | Compliance-heavy (HIPAA, finance) |
| **DB per Org** | Database-level | High | Very High | Enterprise, regulated industries |

### Strategy 1: Shared Schema + RLS (Recommended for Most SaaS)

#### Core Schema Design
```sql
-- Central workspaces (tenants) table
CREATE TABLE workspaces (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    slug        TEXT UNIQUE NOT NULL,
    plan        TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users belong to multiple workspaces via memberships
CREATE TABLE workspace_members (
    workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role            TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (workspace_id, user_id)
);

-- All tenant data has workspace_id
CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    created_by      UUID REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### Row Level Security Policies
```sql
-- Enable RLS on all tenant tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see projects in their workspaces
CREATE POLICY "workspace members can view projects"
    ON projects FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Only admins and owners can create projects
CREATE POLICY "admins can create projects"
    ON projects FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id = auth.uid()
              AND role IN ('owner', 'admin')
        )
    );

-- Policy: Super Admin can bypass RLS (service role only)
-- ⚠️ NEVER expose service role key to frontend
```

#### Session Management & RLS Optimization
To avoid performance bottlenecks, embed `workspace_id` and `role` directly into the user's Session JWT (Custom Claims). This allows RLS policies to check the session token directly (`auth.jwt()->>'workspace_id'`) instead of joining the `workspace_members` table on every query.

#### RLS Helper Functions
```sql
-- Helper: Check if current user has a minimum role in a workspace
CREATE OR REPLACE FUNCTION user_has_role(
    p_workspace_id UUID,
    p_min_role TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    role_hierarchy TEXT[] := ARRAY['viewer', 'member', 'admin', 'owner'];
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = auth.uid();

    RETURN (
        array_position(role_hierarchy, user_role) >=
        array_position(role_hierarchy, p_min_role)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Strategy 2: Schema per Org (Compliance-Heavy)
For regulated industries requiring strict data separation:
```sql
-- Dynamically create a schema for each new tenant
CREATE OR REPLACE FUNCTION create_tenant_schema(p_slug TEXT) RETURNS VOID AS $$
BEGIN
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS tenant_%s', p_slug);
    
    -- Create all tenant tables in the new schema
    EXECUTE format('
        CREATE TABLE tenant_%s.projects (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )', p_slug);
END;
$$ LANGUAGE plpgsql;

-- Bypass pattern: set search_path per connection
SET search_path TO tenant_acme, public;
SELECT * FROM projects;  -- Reads from tenant_acme.projects only
```

### Super Admin Architecture

Super Admin is a separate system that operates **across all tenants** with elevated privileges:

```typescript
// Super Admin routes are ONLY accessible at admin.yourdomain.com
// Enforced at DNS + middleware level

// middleware.ts — verify super admin domain
if (hostname === 'admin.yourdomain.com') {
  const session = await verifyAdminSession(req);
  if (!session?.user.isSuperAdmin) {
    return NextResponse.redirect('https://yourdomain.com');
  }
}
```

```sql
-- Super Admin uses service role to bypass RLS
-- admin.sql — queries bypass all RLS policies when using service role key

-- Cross-tenant query (only accessible with service role)
SELECT w.name, COUNT(wm.user_id) as member_count, w.plan
FROM workspaces w
LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
GROUP BY w.id
ORDER BY member_count DESC;
```

### RBAC Implementation (TypeScript)
```typescript
type Role = 'owner' | 'admin' | 'member' | 'viewer';

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  owner: ['*'],  // All permissions
  admin: ['project:create', 'project:delete', 'member:invite', 'member:remove'],
  member: ['project:create', 'project:read', 'project:update'],
  viewer: ['project:read'],
};

function can(userRole: Role, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[userRole];
  return perms.includes('*') || perms.includes(permission);
}

// Usage in API handler
if (!can(currentMember.role, 'project:delete')) {
  throw new ForbiddenError('Insufficient permissions');
}
```

### Skill Orchestration & Handoff
- **Upstream Orchestrator**: Executes during **Phase 3** of `zero-to-prod-orchestrator` or SaaS design lock in `brainstorming`.
- **Database & Security**: Delegate database schema migrations to `database-orm-expert` and security audit / App Check rules to `supabase-security-expert`.
- **SaaS Billing & Monitization**: Delegate subscription state machines and Stripe/Polar integration to `saas-billing` and `payment-gateway-expert`.
- **Multi-Entry Points**: Delegate Super Admin domain isolation (`admin.yourdomain.com`) to `cloud-hosting-expert`.
- **Transformation Roadmap**: Coordinate with `saas-architect` when upgrading single-tenant apps to multi-tenant.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `brainstorming`, `zero-to-prod-orchestrator`, dan `session-memory-manager` untuk memastikan eksekusi yang kohesif.

### Deskripsi
Panduan ahli untuk merancang dan mengimplementasikan arsitektur SaaS multi-tenant dengan isolasi tenant penuh, Row Level Security (RLS) Supabase/PostgreSQL, pola schema-per-org, RBAC, dan kontrol akses Super Admin.

### Kondisi Pemicu
- Membangun aplikasi SaaS yang melayani beberapa organisasi (workspace/tenant).
- Mengimplementasikan kebijakan Row Level Security (RLS) di Supabase atau PostgreSQL.
- Merancang model data yang mengisolasi data tenant dengan aman.
- Mengimplementasikan role-based access control (RBAC) dalam tenant.
- Membangun panel manajemen Super Admin untuk operasi lintas tenant.
- Memilih antara shared schema vs. schema-per-org.

### Strategi Isolasi Tenant

| Strategi | Level Isolasi | Biaya | Kompleksitas | Terbaik Untuk |
|---|---|---|---|---|
| **Shared Schema + RLS** | Row-level | Rendah | Sedang | SaaS standar (< 1M tenant) |
| **Schema per Org** | Table-level | Sedang | Tinggi | Kepatuhan ketat (HIPAA, keuangan) |
| **DB per Org** | Database-level | Tinggi | Sangat Tinggi | Enterprise, industri teratur |

### Strategi 1: Shared Schema + RLS (Direkomendasikan)
Rancang tabel `workspaces` (tenant), `workspace_members` (keanggotaan + role), dan semua tabel data dengan kolom `workspace_id`. Terapkan RLS agar pengguna hanya dapat melihat data workspace mereka sendiri.

#### Optimasi Session Management & RLS
Untuk menghindari bottleneck performa, sematkan `workspace_id` dan `role` langsung ke dalam Session JWT pengguna (Custom Claims). Ini memungkinkan kebijakan RLS untuk memeriksa token sesi secara langsung (`auth.jwt()->>'workspace_id'`) daripada melakukan join ke tabel `workspace_members` pada setiap query.

#### Fungsi Helper RLS
Buat fungsi `user_has_role()` yang dapat digunakan kembali di seluruh kebijakan RLS untuk memeriksa apakah pengguna saat ini memiliki role minimum yang diperlukan dalam workspace tertentu.

### Strategi 2: Schema per Org
Untuk industri teratur yang membutuhkan pemisahan data ketat. Buat schema PostgreSQL terpisah untuk setiap tenant secara dinamis. Atur `search_path` per koneksi untuk mengarahkan query ke schema tenant yang benar.

### Arsitektur Super Admin
Super Admin adalah sistem terpisah yang beroperasi **di semua tenant** dengan hak istimewa yang ditingkatkan. Hanya dapat diakses di `admin.yourdomain.com` — diberlakukan di level DNS dan middleware. Menggunakan service role key Supabase untuk mem-bypass RLS dan melakukan query lintas tenant.

### Implementasi RBAC
Definisikan peta izin per role (`owner`, `admin`, `member`, `viewer`) dan fungsi `can()` helper untuk memeriksa izin dalam API handler.

### Orkestrasi Skill & Serah Terima
- **Orkestrator Utama**: Dieksekusi pada **Fase 3** dari `zero-to-prod-orchestrator` atau saat finalisasi SaaS di `brainstorming`.
- **Database & Keamanan**: Delegasikan migrasi skema ke `database-orm-expert` dan audit keamanan / RLS ke `supabase-security-expert`.
- **SaaS Billing & Monitisasi**: Delegasikan state machine langganan dan integrasi Stripe/Polar ke `saas-billing` dan `payment-gateway-expert`.
- **Multi-Entry Points**: Delegasikan isolasi domain Super Admin (`admin.domain.com`) ke `cloud-hosting-expert`.
- **Roadmap Transformasi**: Koordinasikan dengan `saas-architect` saat mentransformasi aplikasi single-tenant ke multi-tenant.