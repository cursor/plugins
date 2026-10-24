# Production Readiness Checklist

## Overview
This is a condensed, actionable checklist for production readiness validation. Use this as a quick-reference during the final review before deployment.

---

## 🔴 Critical Blockers (Must Fix)

These items are **deployment blockers**. Do NOT deploy if any of these fail.

### Security
- [ ] **RLS enabled on all public tables** (Supabase/PostgreSQL)
- [ ] **Firebase Security Rules are strict** (no `allow read, write: if true`)
- [ ] **No secrets in source code** — grep for API keys, passwords, tokens
- [ ] **`.env` in `.gitignore`** — verified not committed
- [ ] **HTTPS enforced** — HSTS header active
- [ ] **Authentication on all protected routes** — verified with unauthenticated requests
- [ ] **SQL injection prevention** — all queries parameterized
- [ ] **CORS allow-list configured** — no wildcard `*` in production

### Data Integrity
- [ ] **Database backups configured** — verified restore procedure works
- [ ] **Migration files in sync** — no pending migrations
- [ ] **Foreign key constraints** — referential integrity enforced
- [ ] **Input validation** — all API endpoints validate request bodies

### Reliability
- [ ] **Health check endpoints** respond correctly (`/healthz`, `/readyz`)
- [ ] **Error handling** — all endpoints return structured errors (not stack traces)
- [ ] **Graceful shutdown** — SIGTERM handled, connections drained
- [ ] **Circuit breakers** on external service calls (payment, email, etc.)

---

## 🟡 High Priority (Should Fix)

### Frontend
- [ ] **Error boundaries** on all page segments
- [ ] **Loading states** — Suspense with skeleton UIs
- [ ] **Mobile responsive** — tested on 320px, 768px, 1024px, 1440px
- [ ] **Accessibility** — keyboard navigation, screen reader tested
- [ ] **SEO meta tags** — title, description, OG tags on all pages
- [ ] **Image optimization** — WebP/AVIF, lazy loading, proper sizes

### Backend
- [ ] **Rate limiting** active on public API endpoints
- [ ] **Connection pooling** configured for database
- [ ] **Request timeouts** set on all external calls
- [ ] **Structured logging** — JSON format with correlation IDs
- [ ] **Background job queues** for heavy operations

### Testing
- [ ] **Unit test coverage ≥ 80%**
- [ ] **E2E tests** pass for critical flows
- [ ] **CI pipeline** runs on every PR
- [ ] **No TypeScript errors** — `tsc --noEmit` passes

### DevOps
- [ ] **CI/CD pipeline** — automated lint → test → build → deploy
- [ ] **Docker multi-stage build** — optimized image size
- [ ] **Zero-downtime deployment** strategy configured
- [ ] **Monitoring** — error tracking (Sentry) configured
- [ ] **Rollback** — ability to revert within 5 minutes

---

## 🔵 Recommended (Nice to Have)

### Performance
- [ ] **Lighthouse score ≥ 90** on all key pages
- [ ] **CDN** for static assets
- [ ] **Multi-tier caching** — Redis cache layer
- [ ] **Database read replicas** for read-heavy workloads
- [ ] **Bundle analysis** — no unused large dependencies

### Quality
- [ ] **CodeRabbit** configured on repository
- [ ] **Fuzz testing** on parsers and validators
- [ ] **Visual regression testing** configured
- [ ] **Load testing** — k6/Artillery baseline established

### Documentation
- [ ] **CHANGELOG.md** up-to-date
- [ ] **BLUEPRINT.md** with architecture diagram
- [ ] **README.md** — setup, deployment, and architecture guide
- [ ] **Runbook** — incident response procedures documented
- [ ] **API documentation** — OpenAPI spec or equivalent

---

## Quick Verification Commands

### Security Scan
```bash
# JavaScript/TypeScript
npm audit --production
npx audit-ci --config audit-ci.json

# Python
pip audit
safety check

# Rust
cargo audit

# Go
govulncheck ./...

# Search for hardcoded secrets
grep -rn "sk_live\|sk_test\|password\|secret\|api_key" src/ --include="*.ts" --include="*.tsx" --include="*.js"
```

### Build & Type Check
```bash
# TypeScript
npx tsc --noEmit
npm run build

# Lint
npm run lint -- --max-warnings 0

# Test
npm run test -- --coverage --watchAll=false
```

### Docker
```bash
# Build and verify
docker build -t app:latest .
docker run --rm app:latest node -e "console.log('OK')"

# Check image size
docker images app:latest --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
```

### Database
```bash
# Check pending migrations
npx drizzle-kit check  # or npx prisma migrate status

# Verify RLS (Supabase/PostgreSQL)
psql -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';"
```

---

## Go/No-Go Decision Matrix

| Category | Critical Issues | Decision |
|----------|----------------|----------|
| Security | 0 | ✅ GO |
| Security | 1+ | 🔴 NO-GO |
| Data Integrity | 0 | ✅ GO |
| Data Integrity | 1+ | 🔴 NO-GO |
| Reliability | 0 | ✅ GO |
| Reliability | 1+ | 🟡 Conditional (with risk acceptance) |
| Performance | Any | ✅ GO (fix in next sprint) |
| Documentation | Any | ✅ GO (fix within 1 week) |

**Rule: Zero critical security and data integrity issues = GO. Everything else is negotiable with documented risk acceptance.**
