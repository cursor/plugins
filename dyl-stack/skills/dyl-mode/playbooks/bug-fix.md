### Bug fix (Dylan overlay)

Read the shared playbook first: pstack `poteto-mode/playbooks/bug-fix.md`.

Then apply these gates. They win on conflict.

1. Reproduce on the same surface the human uses (`control-ui` for browser or desktop apps, `control-cli` for CLIs and TUIs). Do not skip to a theory fix.
2. UI layout, scroll, or animation bugs: measure before coding. Capture before/after bounding boxes or a short recording.
3. Prove the fix on the live app (reload, screenshot or measure). Unit tests alone are not done.
4. Flag-gated surfaces: confirm the flag-off path is unchanged.
5. Keep the app running between iterations so the human can poke it.
