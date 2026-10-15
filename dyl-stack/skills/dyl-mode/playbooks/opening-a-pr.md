### Opening a PR (Dylan overlay)

Read the shared playbook first: pstack `poteto-mode/playbooks/opening-a-pr.md`.

Then apply these gates. They win on conflict.

1. Use the repo's PR forge. `origin pr` when the repo lives on Origin, `gh pr` otherwise. Never open the same branch on both.
2. Update the existing PR when this is follow-up work. Do not open a duplicate.
3. Never merge or enable auto-merge unless the human authorized it in this turn.
4. Opening a PR does not start babysit. Post the URL and stop unless asked.
5. Do not commit scratch artifacts (temp dirs, audit output, local screenshots, throwaway scripts).
