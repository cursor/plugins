# Opt-in protected local verifier path

This entry point runs one operator-approved foreground command and records its successful verdict through the existing PStack `orch ledger record PR SHA VERDICT --evidence PATH` interface. It is usable source wiring for that path, separate from Cursor's native Task tool. Ordinary PStack entry points are unchanged. All source and fixtures remain unexecuted; installed PStack behavior requires the separate authorized Linux check below.

## Setup

Provision the compatible authenticated authority route, scope membership, immutable GitHub repository ID, independent home and private client journal using [the contract](contract.md). Explicitly enroll and start that home's session once; put its returned generation in config. Setup/session is never repeated by the runner. The operator retains the primary/integration owner and named stacker. No permissions are granted by a config or claim capsule.

Extend the existing private client config with these fields (illustrative paths, no runnable endpoint or credentials):

```json
{
  "local_verifier_enabled": true,
  "generation": 1,
  "local_verifier": ["/approved/bin/python3", "/approved/verifiers/project_check.py"],
  "success_verdict": "unit-test-verified",
  "worker_timeout_seconds": 120,
  "orch_route": ["/approved/bin/bun", "/approved/pstack/skills/poteto-mode/scripts/orch/orch.ts"],
  "orch_store": "/private/pstack-store",
  "run_directory": "/private/pstack-osb-runs"
}
```

Use a preinstalled, reviewed PStack/Bun route with dependencies already provisioned; PStack's existing bootstrap may otherwise install dependencies. This runner does not bypass that bootstrap or authorize an installation. `local_verifier` and `success_verdict` are operator-owned, fixed together; command arguments and verdict cannot be selected by a unit spec. The command must be read-only with respect to the checkout, foreground, and must not escape its new process group or launch remote work. Reserve one writer for the local orch store under PStack's existing policy. These are trusted-process requirements, not a sandbox. All configured paths are absolute. Run/store directories must be owned by the current user with no group/other access and outside the worktree; they must not contain one another's attempt state. A private quota-limited filesystem is appropriate for command logs; the runner checks a 1 MiB per-stream bound during and after execution but cannot hard-limit burst disk writes.

The orch store must already be initialized through ordinary PStack setup before this path is enabled; creating its directory alone is insufficient. The runner refuses a missing store without creating it and, under the attempt lock, invokes the fixed native `orch --store DIR ledger summary` before creating a client or acquiring a claim. That read validates the verification ledger through PStack's existing header/row parser rather than duplicating the store format. A missing/malformed ledger or unavailable command fails preflight without a durable attempt binding, worker launch or claim; repairing setup permits the same unchanged attempt. Other store components still follow ordinary PStack setup. A successful read cannot guarantee later availability or atomically reserve the store. Prelaunch guard failures report setupfailed; worker/publication failures report behaviorfailure, retaining effect and release status separately.

Create a private durable spec before dispatch:

```json
{
  "attempt": "unit-42-check-1",
  "unit": "unit-42",
  "pr": 42,
  "worktree": "/approved/worktrees/unit-42",
  "branch": "feature/unit-42",
  "base": "refs/remotes/origin/main",
  "base_oid": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "head_oid": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  "resources": [{"type": "file", "name": "src/shared.py"}]
}
```

Replace synthetic revisions with approved full OIDs. The operator binds the actual numeric GitHub repo ID in the client config; the runner also checks the local origin spelling (GitHub HTTPS without credentials or `git@github.com:`), branch, clean checkout, local base ref and head. It does not independently resolve the immutable repo ID or fetch current forge refs. Resource coverage is declared by the supervisor, not inferred by a verifier; incomplete declarations allow undeclared overlap.

```sh
python3 scripts/run_local_verifier.py --config /private/project-osb.json --spec /private/unit-42-check-1.json
```

## What the path gates

Submit and claim use deterministic request keys derived from the immutable attempt. A claim conflicts before either worker or publisher starts. The runner journals the exact claim/fence/generation, publishes the declared head to the authority, checks live ownership and submitted base/head before spawning, then renews every 30 seconds while its worker runs (240 seconds maximum). A non-secret `PSTACK_OSB_CLAIM_FILE` and `PSTACK_OSB_UNIT` identify the attempt for the worker; they carry no auth authority. A second revision and live ownership checkpoint immediately precedes the fixed `orch ledger record` invocation. Evidence contains actual command exit, stream hashes, revision, claim and operator-selected verdict. Exit zero requires successful work, acknowledged verdict recording and acknowledged fenced release.

On SIGINT/SIGTERM, timeout, denied renewal, failed/dirty verifier or unavailable authority, the runner stops only its own worker/publisher process groups. It releases only after both groups are observed quiescent. No foreign process/worktree cleanup is attempted. A failed or timed-out publisher may already have recorded a verdict: `effect: unknown` is retained, never retried automatically and never converted to a successful verification result.

Request keys additionally include the configured home binding, avoiding collisions between two homes that use the same attempt spelling. Cancellation is checked at explicit boundaries and after process handles are assigned; bounded authority calls or publication waits can delay it. A cancellation during publication can leave an unknown effect and needs reconciliation.

Signal handlers and cleanup now cover submit/claim and the first durable `bound` write. Once a claim receipt is known, a persistence failure or handled signal releases that exact claim after confirming no owned processes remain. A lost claim response has no known capsule: cleanup retains `acquiring`, never guesses a release, and allows only identical acquisition replay or explicit reconciliation. If SIGKILL/machine loss bypasses cleanup, inspect the durable phase and client journal before deciding how to recover. Disk failures can prevent a terminal record even after confirmed release; the journal and native inspection remain necessary evidence.

## Resume and reconcile

Only `acquiring` can replay automatically, using unchanged config/spec/attempt and the existing client journal. This recovers a lost claim response; it still performs live checks before work. Any saved `bound`, `starting`, `running`, `publishing` or `terminal` phase refuses relaunch. A SIGKILL or lost machine can leave an occupied claim and an uncertain process/effect; the lease is not proof that the old process stopped. Preserve state and journal, establish quiescence using supervisor evidence, inspect the exact current claim and local ledger, then replay only the original release request via `osb.py` if appropriate. A stale generation/fence cannot release a successor. Do not delete state or reset a session to make a retry pass. A new approved verification uses a new attempt only after reconciliation of the previous attempt. No generic completion or atomic handoff operation is invented.

## Enforcement boundary and validation

The actual protected effect is a local PStack verdict record. Check-and-effect remains cooperative with a TOCTOU window: the existing store cannot atomically consume the service fence. A revoked worker can run briefly until the next renewal, and a rogue trusted process can bypass this entry point, escape its process group, write directly or publish remotely. Git pushes, CI, Task dispatch, stacker merge/deploy, arbitrary writer commands and authority setup remain outside this path. Strong enforcement needs a reviewed fence-consuming effect gateway and constrained credentials, not more labels or a local wrapper.

The source fixtures use the supplied real authority with a synthetic Git worktree and a mock fixed verifier/publisher. They verify gate/recovery orchestration only. For installed-path acceptance, separately provision exact clean PStack, Bun and dependencies on an authorized Linux executor; use a disposable orch store and a harmless approved foreground verifier. Capture native lease/check/release receipts plus `orch ledger check` for the actual PR/head, test cancellation/revocation and unavailable-route refusal, and inspect unknown-effect recovery. Do not substitute mock results for this check or make live forge/merge calls. Budget and VM access require the parent's existing allocation decision.
