# T2 — Marketplace validation green (incl. pstack-generic manifest)

**Status:** done · **Labels:** ready-for-agent · **Spec:** SPEC.md AC2

First real run of `node scripts/validate-plugins.mjs` after T1:
`All plugins validated successfully.` — the merged pstack-generic manifest
(`pstack/.cursor-plugin/plugin.json`, name `pstack-generic`) passes the upstream
plugin schema, and every marketplace entry name-matches its plugin manifest.

Evidence: `.agent/evidence/gate-validate-plugins.log`.
