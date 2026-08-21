# T1 — Make validate-plugins.mjs runnable

**Status:** done · **Labels:** ready-for-agent · **Spec:** SPEC.md AC2

The marketplace validation gate imported `ajv`/`ajv-formats`, but the repo root had no
`package.json`, so `node scripts/validate-plugins.mjs` failed with `ERR_MODULE_NOT_FOUND`.

**Fix:** minimal root `package.json` pinning `ajv@^8.17.1` + `ajv-formats@^3.0.1`, plus
script aliases for both gates. Commit `77bcf32`.
