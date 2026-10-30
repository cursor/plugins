# SaaS Transformation Checklist

Detailed verification checkpoints and implementation patterns for converting a single-tenant application to a multi-tenant SaaS platform.

---

## Phase 1: Discovery & Analysis

- [ ] **Data Model Mapping**: Extract all relationships. Identify which tables are "global" (shared reference data, e.g., plan configurations, country list) and which are "tenant-specific" (user data, posts, transactions).
- [ ] **Auth Audit**: Check if the app uses native session storage, custom cookies, or third-party auth. Identify where users are created and stored.
- [ ] **API Access Points**: Audit all public and internal route files. Note down endpoints that lack authentication.
- [ ] **Pricing Strategy Fit**: Document the exact plan rules.
  - *Example*: Free Plan has 1 project limit. Pro Plan has unlimited projects.

---

## Phase 2: Multi-Tenancy Foundation

### PostgreSQL Row-Level Security (RLS) Pattern
When using a shared-schema model, configure your tables to automatically isolate data.

```sql
-- 1. Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 2. Create helper function to retrieve current tenant from session context
CREATE OR REPLACE FUNCTION auth.current_tenant_id()
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
$$ LANGUAGE sql STABLE;

-- 3. Apply policies using membership lookup
CREATE POLICY tenant_isolation_policy ON projects
  AS RESTRICTIVE
  USING (
    workspace_id = auth.current_tenant_id()
  );
```

### Middleware Connection Context Setting (Node.js/Express Example)
Ensure every database transaction or connection sets the `app.current_tenant_id` session configuration.

```typescript
import { Request, Response, NextFunction } from 'express';
import { db } from '../lib/db';

export async function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  const tenantId = req.headers['x-tenant-id'] || req.user?.workspaceId;
  
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant context missing' });
  }

  // Inject session variable inside transaction wrapper or pool client
  await db.execute(sql`SET LOCAL app.current_tenant_id = ${tenantId}`);
  next();
}
```

---

## Phase 3: Authentication & Authorization

- [ ] **Workspace Member Resolution**: Ensure a user is mapped to multiple workspaces via a join table (`workspace_members`).
- [ ] **Role-Based Checkpoint**:
  ```typescript
  export function requireRole(allowedRoles: ('owner' | 'admin' | 'member')[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      const userRole = req.user?.role;
      if (!userRole || !allowedRoles.includes(userRole)) {
        return res.status(403).json({ error: 'Permission denied' });
      }
      next();
    };
  }
  ```

---

## Phase 4: Billing & Subscription

- [ ] **Stripe Event Handling Idempotency**: Save all processed Stripe Event IDs to a database log table to prevent processing webhooks twice.
- [ ] **Dunning Flow**: Set up Stripe triggers for `invoice.payment_failed` to send a dynamic link allowing the user to update their payment card in one click.

---

## Phase 5: Workspace & Team Management

- [ ] **Invitation Tokens**: Generate cryptographically secure invite tokens using standard library utilities:
  ```typescript
  import crypto from 'crypto';
  const token = crypto.randomBytes(32).toString('hex');
  ```
- [ ] **Workspace Switcher Logic**: When changing workspaces, update the session token (or JWT) and redirect the user back to the application dashboard to force frontend hydration with new data.

---

## Phase 6: SaaS Frontend & Landing

- [ ] **Responsive Navigation**: Use dynamic dashboard layouts that collapse sidebars on mobile touchpoints.
- [ ] **SEO Configuration**: Output unique structured data per landing section.

---

## Phase 7: API Layer & Feature Gating

- [ ] **Feature Flags**: Guard pages and controls using a hook pattern:
  ```typescript
  const { hasFeature } = useSubscription();
  if (!hasFeature('advanced-export')) {
    return <UpgradeBanner featureName="Advanced Export" />;
  }
  ```

---

## Phase 8: Production Hardening & Launch

- [ ] **Rollback Runbook**: Create rollback scripts for DB migrations.
- [ ] **Cascade Deletion Tests**: Ensure deleting a workspace cleans up all child tables cleanly without foreign-key orphan exceptions.
