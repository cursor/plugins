# pstack behavioral evals

The harness tests now use the bundled `tasks/webhook-portable.json` fixture. It needs no
`~/testpstack` checkout and runs both oracle controls and preparation of both arms. Its task ID is
`webhook-durable-idempotence-portable-v1`; the process-local baseline was written for this fixture
and is not the historical `f13dd84` commit. Keep results for those two baselines separate.
Use `--task evals/tasks/webhook-portable.json` with the run commands below for a portable run.
The historical task file is retained for exact replays when its original repository is available.

The tests still make no model calls. Passing them proves the harness can distinguish the broken
fixture from its reference fix, not that poteto-mode follows every playbook on every host.

Static checks (`build/check-routing.mjs`) prove the pstack instructions are installed. This harness
measures what an agent does with them. It runs one task twice on a host, once with pstack
(`/poteto-mode <prompt>`) and once without (the same prompt, plain), then scores each run on:

- whether the code is correct, judged by hidden checks the agent never sees;
- whether the run followed the playbook's phase order;
- what the run cost.

```
evals/
  run.py                      run one arm on one host; captures transcript, final tree, git bundle
  analyze.py                  transcript + tree -> result.json + summary.md (runs the oracle)
  compare.py                  table across result.json files
  tasks/webhook-durable-idempotence.json
  oracle/webhook/oracle.py    the hidden checks (worker.py drives real processes)
  oracle/webhook/reference/   a reference fix, used only to prove the oracle can be passed
  fixtures/                   one real Claude stream-json transcript + synthetic ones for tests
  test_harness.py             tests for all of the above, no model calls
```

## The task

`webhook-durable-idempotence` is the rerun that the bug-fix audit (in git history: `git show 30b9dfb:audits/2026-09-10-bugfix-run-736701de.md`) asks
for. It uses the `~/testpstack` fixture at `f13dd84` and the audited prompt:

> _claimed is process memory, so a restart or a second worker re-welcomes every purchase it has not seen. Fix it so idempotence survives a restart and holds across workers.

`run.py` clones the fixture into a fresh temp dir with `git clone --no-hardlinks`, checks out the
commit as `main` and removes the `origin` remote, so the agent cannot push into `~/testpstack`.
Commit `f13dd84` has an old pstack install committed in it, so both arms first remove it (the files
listed in `.pstack/receipt.json`, plus `CLAUDE.md` and `.pstack/`) and commit that as
`eval: strip committed pstack install`. That leaves the baseline as a plain agent. The pstack arm
then runs `pstack init --host <host>` and `pstack on`, and commits that as `eval: install pstack`.
The agent therefore starts from a clean tree, and `base_commit` in `run.json` marks where the
agent's own commits begin.

## Running

Each run needs an explicit `--permission`. Nothing defaults to bypassing permissions. For Claude
the value is passed as `--permission-mode`. A bug-fix run needs Bash (tests, git, run-record), and
`-p` mode denies any tool call that the mode does not allow. In practice that means
`bypassPermissions`, or `auto` if your account has the auto-mode classifier. Use them only in the
throwaway clone `run.py` creates.

One arm:

```sh
python3 evals/run.py --task evals/tasks/webhook-durable-idempotence.json \
  --host claude --arm pstack --permission bypassPermissions --out runs/claude-pstack-1

python3 evals/run.py --task evals/tasks/webhook-durable-idempotence.json \
  --host claude --arm baseline --permission bypassPermissions --out runs/claude-baseline-1
```

Both arms, every host (hosts without a CLI report `skipped: <host> CLI not installed` and exit 0):

```sh
T=evals/tasks/webhook-durable-idempotence.json
for arm in pstack baseline; do
  python3 evals/run.py --task $T --host claude  --arm $arm --permission bypassPermissions  --out runs/claude-$arm
  python3 evals/run.py --task $T --host codex   --arm $arm --permission workspace-write    --out runs/codex-$arm
  python3 evals/run.py --task $T --host copilot --arm $arm --permission allow-all-tools    --out runs/copilot-$arm
done
python3 evals/compare.py runs/*
```

Useful options: `--model`, `--timeout` (default is the task's `time_budget_seconds`, 3600),
`--host-arg` (repeatable, passed through, for example `--host-arg=--max-budget-usd --host-arg=40`),
`--dry-run` (prepares the clone and prints the exact command without calling a model),
`--no-analyze`, `--cleanup`. The arms run one after another. Runs are independent, so you can
also launch them in parallel shells.

To re-score an existing run: `python3 evals/analyze.py runs/claude-pstack-1`. To judge any tree
directly: `python3 evals/oracle/webhook/oracle.py --tree DIR`. `oracle.py --list` prints what each
check proves.

## Cost and time (estimates, not measurements)

- **pstack arm on Claude (Opus parent):** the audited run took 39 minutes with 8 delegates. The
  audit puts the floor for this playbook at about 25 minutes. Expect 25–45 minutes. The audit gives
  no dollar figure. As a guess from its token breakdown, where delegates were 60% of the cost,
  budget $15–60. Treat that range as unmeasured until the first run reports `total_cost_usd`.
- **Baseline arm:** no playbook and no fan-out. Expect 5–15 minutes, and probably a few dollars.
  This is also unmeasured.
- **The one real call made while building this** (`claude -p "reply with ok"`, one turn) cost
  $0.098, almost all of it cache creation for the system prompt. That is the fixed floor per session.
- **The oracle:** about 40 s for a fix that recovers from a crash immediately. A lease-based fix
  makes the provider wait out the lease in `crash_recovery`, `mark_sent_outage` and
  `release_outage`. With a 300 s lease that is about 15 minutes, and the task allows 1800 s.
- **`test_harness.py`:** about 1 minute, no model calls.

## What the result reports

`result.json` and `summary.md` in the run dir contain:

| field | meaning |
|---|---|
| `wall_clock_seconds` | measured by run.py around the host process, setup excluded |
| `cost_usd`, `tokens`, `tokens_by_model` | from the Claude `result` event (`total_cost_usd`, `usage`, `modelUsage`). Codex reports tokens only. Copilot is not parsed |
| `tool_calls`, `tool_call_counts` | every tool call in order, with actor (`parent` or `delegate:…`), a summary, the paths it wrote, whether it was a test run and its outcome, and whether it committed |
| `pstack_reads` | pstack skill/playbook/runtime files read, in order, and how: a `Read` call, a `Skill` call, a path in a Bash command (`partial` when it was `sed -n`/`head`/`tail`), or a slash-command expansion |
| `delegates` | every `Agent` call: `subagent_type`, `model`, `description`, `run_in_background`, `isolation`, prompt size, first lines of the result |
| `run_record` | every `run-record.py` invocation, the last `rr check` with its exit code and output, and the `.pstack/runs` record from the final tree, with `rr check` rerun there |
| `git` | the base commit, each commit made after it, with the files it touched, which tree was judged and why, and a replay of `run_tests.py` at the first test-only commit and the first fix commit |
| `oracle` | pass/fail/error for each hidden check |
| `phase_order` | five findings against the bug-fix playbook. Each has a status and the evidence it rests on |

The phase-order findings:

1. `repro_before_fix`: a test or harness file was written, a test run failed, and a `git commit`
   ran, all before the first edit to `src/`. It fails if the only failing runs before the fix died
   with ImportError, AttributeError or NameError rather than an assertion.
2. `implementation_delegated`: a write-capable delegate got an implementation brief, and the
   parent made no edit to `src/`.
3. `no_comments_before_review`: the no-comments skill (a read, a Skill call, or a `comment-sicko`
   delegate) ran after the first fix edit and before the first review after it. A review is an
   interrogate read, a review/operator/judge delegate, or `rr evidence --kind review`.
4. `verify_after_last_change`: a passing test run, or `rr evidence --kind verify --result pass`,
   came after the last visible edit to code or tests.
5. `test_commit_before_fix_commit`: in git history after the base, a commit that touches only
   tests lands before the first commit that touches `src/`, and replaying `run_tests.py` at that
   test-only commit fails.

## The oracle

`oracle/webhook/oracle.py` deploys a copy of the judged tree into a sandbox for each check. Each
sandbox has its own `HOME`, `TMPDIR`, XDG dirs and working dir, and a clean environment. The
checks drive real worker processes the way a payment provider drives the webhook:

- deliveries are at-least-once;
- a delivery that raised, or got no response, is retried in a fresh process with backoff;
- a delivery that returned is never retried.

Sends are counted through `webhook.send_welcome_email`, the seam the project's own tests patch.
A fix that sends some other way is reported as an error, not a pass.

Every check fails on `f13dd84`. `test_harness.py` asserts 0/10 there and 10/10 on the reference
fix. The same oracle run against the audited fix `928df70` scores 4/10. It reproduces O1 in
`crash_recovery`, O3 in `clock_step`, O4 in `mark_sent_outage` and `release_outage`, and O5 in
`redeploy` and `read_only_install`.

| check | proves | on f13dd84 |
|---|---|---|
| `restart` | a new process does not re-welcome a welcomed purchase; still per purchase; unrelated events send nothing | 3 emails, expected 2 |
| `workers` | 8 concurrent processes, both events of one purchase: 1 email, all deliveries eventually acked | 8 emails |
| `crash_recovery` | O1: a worker killed between claim and send loses nothing. No retry is acked while nothing was sent, exactly one email arrives within the recovery window, and a later redelivery sends nothing | retry sends, then redelivery sends again: 2 |
| `slow_send` | O3: redeliveries during a live 20 s send do not duplicate it | 3 emails |
| `clock_step` | O3: a worker whose Python clock reads +1 h does not take over a live send | 2 emails |
| `mark_sent_outage` | O4: storage unwritable for 2 s right after the send leads to no second email, including on a redelivery after the takeover time measured in `crash_recovery` | 2 emails |
| `release_outage` | O4: a failed send during a storage outage is not acked, and the retry sends exactly once | 2 emails |
| `failed_send_retry` | a failed send raises, another worker sends it, a third sends nothing | 2 emails |
| `redeploy` | O5: the ledger survives a new release directory replacing the old one | 2 emails |
| `read_only_install` | O5: with a read-only code directory, deliveries ack and still dedupe | 2 emails |

## What these numbers cannot prove

- **One run is an anecdote.** Model runs vary. Compare arms over several runs per arm before
  claiming a difference.
- **The oracle judges outcomes on one host.** It does not prove multi-host correctness. It does
  not cover sends slower than `--slow-send`, or outages longer than 2 s.
- **`clock_step` only moves Python's `time.time`/`time_ns`.** A fix that reads time elsewhere,
  such as SQLite's `now`, is not stepped, so a pass there is not proof of clock safety.
- **The storage-outage checks find the store by the files that changed under the sandbox,** then
  make those roots read-only with chmod. A store kept open across calls, or kept outside the
  sandbox, escapes the fault. `mark_sent_outage` and `release_outage` report `error` when they
  find no store.
- **An exactly-once email is impossible when a worker dies after the provider accepted but before
  the send is recorded.** No check asks for it.
- **Phase order is read from the transcript, and edits made through Bash are inferred** from
  redirections, `tee`, `sed -i`, `cp`/`mv` and Python `open(...,'w')`. An edit done any other way
  is missed.
- **Delegate tool calls count only if they appear.** They are counted when the stream carries them
  (`parent_tool_use_id`), or when run.py found Claude Code's subagent transcripts under
  `~/.claude/projects/*/<session>/subagents/`. When neither holds, a delegate's edits are
  invisible, and the verification finding says so.
- **Passing phase order means the steps happened in order,** not that each was done well. The
  audit's point about loosely executed steps still applies.
- **Cost is what the host reports.** Claude's `total_cost_usd` is an API-price estimate, not a
  subscription bill.
- **The baseline is scored against the bug-fix playbook too.** Its phase-order score shows what
  pstack's structure adds. It is not a judgement of the baseline.

## Host adapters

| host | command | status |
|---|---|---|
| claude | `claude -p <prompt> --output-format stream-json --verbose --permission-mode <permission> [--model M]` | **verified** on Claude Code 2.1.238: flags from `claude --help`, event shapes from one real call. A slash command inside `-p` (`/poteto-mode …`) was not exercised, because that needs a full run |
| codex | `codex exec --json -C <dir> --sandbox <permission> [--model M] <prompt>` | **unverified**: codex is not installed here. The flags and the `item.*` / `turn.completed` event shapes come from the Codex non-interactive docs. `$poteto-mode` is the invocation |
| copilot | `copilot -p <prompt> --allow-all-tools --log-dir <out>/copilot-logs --log-level all [--model M]` | **unverified**: the Copilot CLI is not installed here. Its stdout format was not confirmed, so analyze.py does not parse it. Pass `--host-arg` if your version has a JSON output flag |

The Claude event shapes relied on are listed below. They are taken from the real call in
`fixtures/claude-trivial.stream.jsonl`, and from a real session transcript for `tool_result` and
`Agent` inputs.

- `{"type":"system","subtype":"init","session_id","cwd","model","permissionMode","claude_code_version","tools",…}`
- `{"type":"assistant","message":{"content":[{"type":"text"|"tool_use",…}],"usage":{…}},"parent_tool_use_id","session_id","timestamp",…}`
- `{"type":"user","message":{"content":[{"type":"tool_result","tool_use_id","content","is_error"}]},"parent_tool_use_id",…}`
- `{"type":"result","subtype":"success","duration_ms","num_turns","total_cost_usd","usage","modelUsage","subagent_stats","permission_denials","result",…}`
- `{"type":"rate_limit_event",…}` is ignored.

## Tests

```sh
python3 evals/test_harness.py
```

The suite covers:

- parsing of the real transcript and the synthetic ones;
- inference of file writes from Bash commands;
- delegate extraction;
- phase order on one conforming and one violating synthetic transcript;
- git-history ordering;
- analyze and compare end to end;
- the oracle failing all 10 checks on `f13dd84` and passing all 10 on the reference fix;
- run.py skipping a missing CLI for each host;
- run.py refusing to run without an explicit `--permission`;
- run.py dry runs preparing both arms, with the fixture repo left untouched.

`fixtures/make_synthetic.py` regenerates the synthetic transcripts.
