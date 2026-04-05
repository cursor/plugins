# Cursor Rules Pack

Production-tested Cursor Rules for TypeScript projects — covers the patterns that matter most when building real software.

## Rules Included

### Core (`rules/core.mdc`)
- Dependency Discipline — evaluate packages before installing
- Explicit Error Handling — typed errors, no silent failures
- Comments Policy — explain WHY not WHAT
- Naming Conventions — consistent, self-documenting
- File Size Discipline — co-location and modularity

### Next.js App Router (`rules/nextjs.mdc`)
- Server Components First
- State Management Hierarchy (URL → React → Zustand → React Query)
- Parallel Data Fetching
- Loading & Error States

### Database & Backend (`rules/database.mdc`)
- Database Query Safety — always use select
- API Route Security — auth, validate, authorize, respond
- Webhook Security — signatures, idempotency, async processing
- Prisma Best Practices

## Installation

These rules are automatically available when you install this plugin in Cursor.

Or copy individual `.mdc` files to your `.cursor/rules/` directory.

## Full Pack

This plugin includes a curated subset. The complete **Cursor Rules Pack v2** (50 rules with before/after examples) is available at:

→ https://github.com/oliviacraft/cursor-rules-pack-sample  
→ https://oliviacraftlat.gumroad.com/l/wyaeil ($27)

## License

MIT
