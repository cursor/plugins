---
name: principle-migrate-callers-then-delete-legacy-apis
description: "Explicitly invoked skill: activate ONLY when the user explicitly writes /principle-migrate-callers-then-delete-legacy-apis (or names 'principle-migrate-callers-then-delete-legacy-apis') in their message, or when another pstack skill routes to it; never auto-activate on ordinary prompts. Apply when introducing a new internal API while old callers still exist. Migrate callers and delete the old API in the same wave instead of preserving compatibility layers."
---

# Migrate Callers Then Delete Legacy APIs

- Update tests to assert the new contract, and delete tests that only protect pre-refactor implementation details

**When this applies:**
- No external users depend on backward compatibility
- The project can absorb coordinated breaking changes
- The new API is part of a simplification or refactor initiative
