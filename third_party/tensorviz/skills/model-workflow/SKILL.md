---
name: model-workflow
description: Create, understand, modify or debug local PyTorch nn.Module models with a current TensorViz graph. Use for local model architecture, forward-pass tensor flow, shape errors and activation or layer changes. Exclude unrelated Python work, conceptual questions without local code and requests to avoid graphing or execution.
---

# TensorViz model workflow

Read the user's request first. Do not run anything on startup. Explicit opt-outs,
read-only instructions and the client's native execution/edit approvals take
priority. Work only on projects relevant to the user's request.

Discover the advertised TensorViz tools and host capabilities once. Use the exact
workspace checkout, model file and class from the current task. Do not infer a
workspace from the launcher's directory or silently use another worktree.

Use `open_graph` when advertised. It waits briefly for completion and yields early
for permission or setup. Poll the same requestId only while it remains pending;
never start duplicate captures or sleep repeatedly in the agent. Continue its returned next action until a
current capture succeeds, a model failure has evidence, the user cancels, or a
concrete blocker requires their input. Inspect repository evidence for missing
setup; ask about unresolved domain choices or assets. A source preview, connected
server or tool call is not a successful capture. Do not change inputs to hide a
model failure or retry an unchanged failed action.

Use the environment reported by tensorViz. The tensorViz plugin remembers the
saved/project environment and offers available previously used interpreters when
there is no project choice. Start without `managedRuntime`; select an offered
interpreter when the user or project identifies it. Do not search arbitrary
directories or guess shell Python. With no available choices on a supported
platform, the host prepares a managed environment under its existing permission.
An explicit `managedRuntime: true` requests a separate environment.
The tensorViz plugin remembers the
user's plugin permission from installation or first use. Once granted, continue
inspection, setup, dependency repair and capture without asking for additional
TensorViz approvals. Honor a declined or revoked permission. Never approve a
permission prompt, invoke the permission helper, edit permission records, change
client permission settings or send an invented approval flag on the user's behalf.
If the user explicitly asks to enable TensorViz after a declined or cancelled
decision, use the stopped opening's `request_permission` recovery action. It
shows the user's confirmation and resumes the same opening after acceptance;
it does not grant permission itself. Never repeat it automatically after a decline.
If the project defines example inputs in a Python function such as `graph_inputs`,
reference that exact function with `inputs: { factory: { file, callable, kwargs } }`
in the setup draft. Read its source first; do not guess a function or manually
serialize its tensors. It must return named forward inputs or an explicit
`{args, kwargs}` binding. TensorViz executes it once in the capture worker.
Keep saved inputs
and recapture after a coherent source change, not after every file write.

In clients supporting MCP Apps, use `open_graph_panel` when advertised to show
the native Model graph panel beside this chat. Open it once; it follows the current
capture. Check `list_models` for a connected current view before claiming display,
and use that viewId for `get_selection` and `focus_view`. Do not call the panel's
app-only transport tools. The panel opening alone does not prove rendering.

For clients without MCP Apps, use `open_graph_view`: open the returned private
URL once in a browser and poll its handoff for the exact display receipt. Display
failure is separate from capture failure. Keep private links out of logs and
external messages.

For plugin hosts, ordinary source edits use the coding agent's normal review
workflow. Use TensorViz source proposals only when the host advertises and supports
the complete review path. Never bypass a pending proposal. Use graph comparison
only when advertised; focusing a changed node does not show a diff.

Finish with the graph result, the model result and any evidenced limitation. If
the installed host lacks a required capability, name it accurately rather than
claiming completion or routing to a different host.
