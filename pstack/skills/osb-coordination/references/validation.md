# Source-only validation status

Status: **notexecuted**. No imports, builds, tests, lint, installs or hooks ran on Mac/Optimus. Independent source review is separate evidence. The extension is a draft and no live enforcement or installed harness compatibility is claimed.

`tests/acceptance.py` requires explicit `OSB_TEST_OWNER_SOURCE` and `OSB_TEST_OWNER_COMMIT` on the parent-approved disposable Linux executor, verifies exact clean source, and runs only a synthetic DB through real supplied endpoint subprocesses. The compatible endpoint is not bundled/downloaded; absence exits 2 as notexecuted, not a green test. No unpublished source is required to use ordinary PStack or inspect the proposal.

Five bounded fixtures cover: barrier contention between two independent coordinator clients with separate journals; historical denied/granted replay, wrong-holder release and successor progress; dropped claim reply and same-key retry, session invalidation; base/head mismatch and positive cooperative checkpoint, unavailable authority and no extra mock effects; an accepted near-limit request whose saved receipt exceeds the input-file bound and must still retry; and rejection of an input below the file bound that exceeds the contextualized wire bound, without creating a mutation journal entry, followed by corrected same-key submission. Each helper invocation restarts its process. A local append-only JSONL mock effect sink records only positive checkpoint observations; it does not execute Git/CI and is not an atomic external fence. Provider source tests govern ownership, migrations, wrapper settlement and CI admission. Real installed PStack/OSB/SSH integration remains manual and unverified.

On an approved executor with Python3/SQLite/bash/git and exact clean compatible owner source already supplied:

```sh
python3 -m py_compile pstack/skills/osb-coordination/scripts/osb.py pstack/skills/osb-coordination/tests/acceptance.py pstack/skills/osb-coordination/tests/drop_reply.py
OSB_TEST_OWNER_SOURCE=/approved/source OSB_TEST_OWNER_COMMIT=VERIFIED_COMMIT python3 pstack/skills/osb-coordination/tests/acceptance.py
```

Estimate 5–10 minutes on the same approved 2-vCPU/4–8-GiB Linux allocation, unmeasured, without new infrastructure or provider calls. Existing authentication/credit/capacity blockage remains; no budget increase follows. Retain setupfailed/cancelled/behaviorfailure/pass distinctly in the supervisor's evidence. Missing source/fixture failure cannot count as pass. Repository plugin validation remains normal upstream CI if relevant; this proposal changes no manifest. No merge, deploy or installation follows from a draft PR.
