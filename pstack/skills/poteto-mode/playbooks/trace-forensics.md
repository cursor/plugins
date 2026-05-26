### Trace forensics

**You own the diagnosis from the artifact. Load it, shape it for analysis, narrow to the cause, attribute to source.** For a dropped `.cpuprofile`, `Trace-*.json.gz`, `Spindump.txt`, or `.heapsnapshot` paired with "why is this slow / unresponsive / leaking / crashing".

Distinct from **Runtime forensics**, which instruments the live process. Here the capture already exists and the live system may be gone; the artifact is a fixed dataset and your job is to read it, not to re-run it. Keep tooling references generic. Use the right tool for the format (a DevTools or trace parser for cpuprofile and `.json.gz`, a text editor for a spindump, your heap tooling for a heapsnapshot), so the playbook stays portable across surfaces.

1. Identify the format and load it with the right tool for that format. Parse large artifacts in a subagent (the **principle-guard-the-context-window** skill) and keep the reduced finding in the main thread; a multi-megabyte trace inlined into your context is the failure mode.
2. Transform the raw artifact into a form you can query. Dump the trace or heap snapshot into sqlite, one row per sample, frame, or node, so you can aggregate and sort instead of scrolling a huge file by eye. Get to the queryable shape before you start reading.
3. Narrow to the cause. Query for the frames that hold the most time and walk the call tree down to the hot path. For a leak, follow the retainer chain from the leaked object to a GC root. For a spindump, find the thread stuck on-CPU or blocked and its wait reason.
4. Attribute to source. Map the hot frame to file, symbol, and line via the artifact's own symbols. A frame with no source mapping is not yet a diagnosis; resolve the symbols, or say plainly the artifact does not carry them.
5. Confirm against a paired capture when you have one. Diff a before and after artifact so the attribution is the real regression, not background noise. Without a paired capture, mark the finding as the strongest hypothesis the artifact supports, not a confirmed cause.
6. Hand back a cited diagnosis, no fix unless asked. Route to Bug fix or Perf issue once the cause is known. The throughput checkpoint stays one line: `throughput checkpoint: n/a, read-only forensics`.

**Reply:** the artifact and format, the reduced finding, the source location, the artifact paths, and whether a paired capture confirmed it.
