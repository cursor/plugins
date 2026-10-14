# pstack observe: the contract

`pstack serve` shows every agent session on this machine, live: what was prompted, what each agent
and subagent is doing, and which playbook phase the run is in. It is local only. It binds
`127.0.0.1`, reads host session stores and pstack run records, writes nothing into them, and never
sends anything off the machine.

Three parts meet at this contract. Each part may assume the others honor it exactly.

| part | files | owns |
|---|---|---|
| readers | `observe/model.py`, `observe/readers/*.py` | turning each host's session store into normalized events, and liveness |
| server | `observe/server.py`, `observe/runs.py`, `observe/routes.py`, `cli.py` | discovery loop, run-record linkage, phase state, HTTP + SSE |
| page | `observe/ui/index.html` | the whole UI, one self-contained file |

Standard library only, Python 3.9+. The page loads nothing from the network: no CDN, no fonts.

## 1. Normalized events

An event is a dict. Every event has these keys:

| key | type | meaning |
|---|---|---|
| `ts` | str | ISO 8601 UTC with `Z`, from the host record. Never the time we read it. |
| `agent` | str | `"main"` for the session's top-level agent, else the subagent id |
| `kind` | str | one of the kinds below |
| `seq` | int | assigned by the server per session, strictly increasing. Readers leave it out. |

Kinds and their extra keys:

| kind | extra keys | emitted when |
|---|---|---|
| `session_start` | `cwd`, `branch`, `model`, `title` (each may be null) | the first record of a session is read |
| `prompt` | `text` | the human sent a message. Tool results and injected system text are not prompts. |
| `message` | `text` | the agent wrote visible text |
| `tool_start` | `id`, `tool`, `summary`, `input` | the agent called a tool |
| `tool_end` | `id`, `ok` (bool), `summary` | that tool call returned |
| `agent_start` | `agent_id`, `parent`, `type`, `model`, `description`, `background` (bool), `tool_id` | a subagent was spawned |
| `agent_end` | `agent_id`, `ok` (bool), `summary` | the subagent finished, failed, or was stopped |
| `turn_end` | `reason` | the agent finished its turn and is waiting (for the human, for main) |
| `usage` | `input_tokens`, `output_tokens`, `cost_usd` (may be null) | the host recorded usage |
| `notice` | `level` (`info`, `warn`, `error`), `text` | interrupt, API error, compaction, permission denial |

Size limits, applied by readers: `text` and `summary` at most 2000 characters, `input` a dict whose
string values are at most 2000 characters each. Truncation appends `…`.

`summary` for `tool_start` is one line a human reads in a timeline: the Bash command, the file path
for Read/Edit/Write, the pattern for Grep, the description for an Agent spawn.

`tool_end.ok` is false when the host marks the result an error.

Tool results also carry `pstack: {run_ids, record_paths, truncated}`. Readers extract these arrays
from complete output before shortening `summary`, including nested JSON output envelopes. Each array
contains at most 64 distinct entries. IDs use at most 128 characters and absolute record paths use
at most 4096 characters. `truncated` marks output beyond the entry, ID, path, or eight-level nesting bound.
The server retains distinct references for the session lifetime, independently of timeline eviction.
Readers cannot recover terminal output absent from a host snapshot.

Codex collaboration messages stored as encrypted tokens appear as `[encrypted message]` in tool
inputs. Spawned agents use their task name as the description when the message is encrypted.

A subagent's own events carry `agent: <agent_id>`. Its `agent_start` carries `agent: <parent>`.

## 2. Readers

```python
class Reader:
    host = "claude"            # claude | codex | copilot | vscode-copilot

    def __init__(self, home: Path): ...

    def discover(self) -> list[SessionRef]:
        """Every session on disk. Cheap: stat only, no parsing of whole files."""

    def read(self, ref: SessionRef, cursor) -> tuple[list[dict], object]:
        """New events since `cursor` (None = from the start), and the cursor to pass next time.
        Must be incremental: a second call with the returned cursor and no new data returns [].
        A partial last line is not consumed; it is read on a later call once complete.
        Never raises on malformed data: skip the record and emit a `notice` with level warn."""
```

`SessionRef` is a dataclass in `model.py`:

```python
@dataclass(frozen=True)
class SessionRef:
    host: str
    id: str
    paths: tuple            # every file this session's events come from, main first
    mtime: float            # newest mtime across paths
    cwd: Optional[str]      # when discover can know it cheaply, else None
```

The session key everywhere else is `f"{host}:{id}"`.

`observe/readers/__init__.py` exports `READERS = {host: ReaderClass}` for every reader.

## 3. Liveness

`model.py` exports `SessionState`, a reducer:

```python
state = SessionState(key, host)
state.apply(event)          # in seq order
state.summary(now) -> dict  # section 5, SessionSummary
state.agents(now) -> list   # section 5, AgentView
```

Rules, with `now` passed in so they are testable:

- An agent is `working` while it has a `tool_start` with no matching `tool_end`, or while its last
  event is anything but `turn_end` or `agent_end` and is less than 90 seconds old.
- An agent is `waiting` when its last event is `turn_end`. The main agent waits for the human.
- A subagent is `done` after `agent_end` with ok true, `failed` after `agent_end` with ok false.
- An agent that would be `working` but has had no event for 10 minutes is `stalled`.
- A background subagent whose spawn returned immediately is still `working` until its own
  `agent_end`, or until its transcript shows a final turn.
- Session state: `working` if any agent is working, else `stalled` if any is stalled, else
  `waiting` if main is waiting and the last event is under 1 hour old, else `idle`.

## 4. Run records and phases

The server reads `.pstack/runs/*.json` (the format written by
`core/skills/poteto-mode/scripts/run-record.py`) from every directory that run-record.py's
`record_dirs()` names for the session's checkout: the checkout itself, the repository's record home
(its main checkout), and each worktree, using the run-record.py that checkout loads. A run links to a
session when a `tool_end` in that session contains `run <run-id> started`, or, failing that, when the
run's recorded workspace (`workspace.path`) is the session's checkout and the run was created while
the session was active. A record from before workspaces were recorded uses the checkout holding it. A run whose record stores the host session id
(`"session": {"host", "id"}`, which run-record.py writes on hosts that expose one) links to that
session exactly. The link says which: `"linked_by": "session"`, `"output"` or `"time"`, strongest first.

An explicit host/session ID determines ownership even when the session started in another project.
The server also discovers run directories from `Record: <absolute-path>` in init output. Completion
checks and route definitions use the record's project. Time-based fallback stays within that project.

Phase graphs come from `routes.json`, generated at build time from the playbooks. New run records
store a `graph` snapshot at init; this snapshot wins over installed or bundled definitions. Each route:

```json
{ "title": "Bug fix", "phases": [{"id": "reproduce", "label": "1. Reproduce", "step": 1}],
  "edges": [{"from": "reproduce", "to": "root-cause", "kind": "next"},
            {"from": "verify", "to": "root-cause", "kind": "back", "label": "fail or inconclusive"}],
  "version": 1,
  "steps": [{"id": "root-cause/how", "parent": "root-cause", "label": "How", "row": 0, "lane": 0}],
  "step_edges": [{"from": "root-cause", "to": "root-cause/how", "kind": "branch"}] }
```

Phase state, computed by the server from the run's phase marks in `seq` order:

| state | when |
|---|---|
| `done` | its latest mark is done |
| `skipped` | its latest mark is a skip |
| `active` | its latest mark is `started`, and the run is not paused |
| `failed` | its latest mark is `failed` |
| `blocked` | its latest mark is `blocked` |
| `paused` | its latest mark is `started`, and the run is paused |
| `revisited` | marked done more than once |
| `pending` | not marked |

Started, blocked, failed, done and skip marks carry an `attempt`, `instance`, `agent`, optional
`parent_instance`, evidence sequence numbers, and tool ids. Every reopened step gets a new
instance; resuming a blocked step retains its instance. A child belongs to a specific parent attempt.
Its old marks remain visible after a parent retry, but do not determine the new attempt's state.
Concurrent mutations are serialized under a project record lock. Writers must use `--run <id>`
to avoid the shared current-run pointer when sessions overlap.

`active` is a list; parallel steps and their parent may all be active. This is workflow state,
independent of host liveness. A turn ending does not complete an attempt. Completion checks reject
open or failed attempts. States are never guessed from the last completed step.

`path` lists top-level phase attempts in first-mark order. `tracking: "completion-only"` labels
records without starts, where connecting marks shows their order without proving a transition.
For `tracking: "explicit"`, only `transitions` determine taken arrows. A transition stores
`seq`, `at`, `from`, `to`, `from_instance`, `to_instance`, `reason`, `evidence`, and `agent`.
Repeated `--from` options record each input to a parallel join. `--from` may also name an active
parent for a branch. Recorded evidence and delegate entries can link to a phase `instance`;
tool ids reference events in the host session. Missing links and unavailable history stay unknown.

## 5. HTTP API

All responses are JSON unless noted. Keys not listed here may be added; the page must ignore them.

`GET /` serves `ui/index.html`.

`POST /api/shutdown` is reserved for `pstack serve stop`. It requires the instance's
private bearer token, rejects browser Origin headers and unexpected Host headers,
and closes the listener before removing its registration. Without `--port`, the
command stops all registered servers owned by the current user, across project
directories. It never signals a process based on a potentially reused PID.

The page opens a session overview when no session is selected. Every session
opens Story, with Map and Activity alongside it and secondary views under
Session details. Raw action inputs and outputs are disclosed on demand.

Session replay uses one captured position across Story, Map, Activity, agents,
and timestamped run evidence. It requires no phase record. Host records retain
their sequence order and each run retains its own record order; timestamps
align these separate streams (their sequence numbers are not interchangeable).
Tied timestamps use source order, not an inferred causal relationship. Playback
advances by record, skips idle gaps, and stops at the final captured record.
Only observed events through the cursor derive replayed agent states and tool
results. Reopened parent attempts reset the visible state of their child steps.
Switching views preserves the cursor. Incoming SSE activity continues updating
the live model without changing a paused snapshot; Return to live restores it.
The server connection and session browser remain live throughout replay.

Replay is limited to the available event window and timestamped run records;
a truncated window is labeled Recent history. Missing history, unknown phase
times, historical files, and unrecorded state changes are not invented. Original
source logs and artifact previews retain their current-file semantics. The
Playbook map is a static definition and does not expose replay controls.

`GET /api/sessions` returns `{"sessions": [SessionSummary], "now": iso}`, newest activity first.

```
SessionSummary = {
  key, host, id, title, cwd, branch, model,
  started, updated,                       // iso
  state,                                  // working | waiting | stalled | idle
  last_prompt,                            // text, 200 chars max, or null
  agents_total, agents_working,
  run: null | {id, route, route_title, current, done, total, complete}
}
```

`GET /api/sessions/<key>` returns

```
{ session: SessionSummary,
  agents: [AgentView],
  events: [Event],                        // newest 3000, oldest first
  runs: [RunView], trace: {references, artifacts, diagnostics, coverage, title, title_source},
  sources: [{id, name, path, size}] }

AgentView = { id, parent, type, model, description, background,
              state, started, ended, events, last_activity, current }   // current: tool summary or null

RunView = { id, route, route_title, task, created, linked_by,
            phases: [{id, label, step, state, attempt, agent,
                      marks: [{seq, at, status, note, attempt, instance, agent, parent_instance, evidence, tool_ids}]}],
            steps: [{id, label, parent, row, lane, state, attempt, agent, marks}],
            edges, step_edges, path, current, active, tracking, transitions,
            check: {complete: bool, problems: [str], checked_at},
            evidence: [...], delegates: [...], findings: [...], pause: null | {...} }
```

`GET /api/sessions/<key>/trace` returns `{trace, sources}` without the event window.
The session detail also includes these fields. `trace` contains observed instruction
references (kind, name, agent, source tool accesses), project-local artifact references,
and recording coverage diagnostics. References never establish phase execution or completion.
A title may come from the heading of a referenced manual run note; `title_source` identifies it.

`GET /api/sessions/<key>/sources/<index>?offset=N` reads a 64 KiB page of a known
session source file, returning `{name, offset, next, size, text, more}`. Indexes come
from `sources` in session detail. UTF-8 decoding replaces invalid or split bytes;
encrypted host fields are not decrypted. Original logs may include information
omitted from normalized events.

`GET /api/sessions/<key>/artifacts/<id>` previews a referenced file within the
session workspace, up to 32 MiB. IDs come from `trace.artifacts`; arbitrary paths
are not accepted, and resolved paths must remain inside the workspace. Text files
are served as plain text, images with their media type, and SVGs with a sandbox CSP.
Artifacts reflect the current file on disk, not a historical snapshot.

`GET /api/routes` returns the whole `routes.json`.

`GET /api/stream` is Server-Sent Events. Each message is `event: <name>` and `data: <json>`:

| name | data | sent |
|---|---|---|
| `sessions` | `{"sessions": [SessionSummary], "now": iso}` | at connect, then whenever any summary changes |
| `event` | `{"session": key, "event": Event}` | each new event, only to clients subscribed to that key |
| `run` | `{"session": key, "run": RunView}` | when a run record linked to a subscribed session changes |
| `agents` | `{"session": key, "agents": [AgentView]}` | when an agent's state changes in a subscribed session |
| `ping` | `{"now": iso}` | every 15 seconds |

Subscribe with `GET /api/stream?session=<key>`. Without the parameter the client gets only
`sessions` and `ping`.

## 6. Privacy

Session stores hold code, prompts and sometimes secrets. The server binds `127.0.0.1` unless the
operator passes another address explicitly and confirms it, holds session data in memory, and logs no
event content. The page makes no request to anything but its own origin.

Server lifecycle records contain only the PID, address, port, and shutdown token.
They live in `$XDG_CACHE_HOME/pstack/serve` (default `~/.cache/pstack/serve`) with
directory mode 0700 and file mode 0600. Normal shutdown removes the record; the
stop command removes stale records when the listener refuses connections.
