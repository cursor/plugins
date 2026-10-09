### Feature (Dylan overlay)

Read the shared playbook first: pstack `poteto-mode/playbooks/feature.md`.

Then apply these gates. They win on conflict.

1. UI changes only: read the repo's UI or styling guidance before editing. Skip it otherwise.
2. Reuse the existing source of truth for UI, data, and tokens. No parallel registries or one-off shells.
3. Flag-gated work: the flag-off path stays unchanged. Shared-library edits stay additive with inert defaults; prefer surface-local when possible.
4. UI verification is live proof on the running app via `control-ui`, not compile-only.
5. Prefer CSS/GPU-driven animation. Drop animations that cannot be made smooth rather than shipping lag.
6. If something breaks mid-build, the **Root cause, not symptom** gate fires before you patch it.
