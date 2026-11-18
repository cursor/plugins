/**
 * sop-await — pi adapter for the SOP sentinel contract (see adapters/README.md).
 *
 * Announces a background agent the moment it settles, so an idle pi wakes up and
 * a busy pi is told at its next safe boundary.
 *
 * Install once:
 *   ln -s <skill>/adapters/pi/sop-await.ts ~/.pi/agent/extensions/sop-await.ts
 *
 * There is exactly one way in: the arm. Arming a wait already names the task
 * directory, so this watches whatever the orchestrator arms —
 *
 *   await.sh arm --dir /abs/task-dir --slot reviewer-r1 ... -- <wait cmd>
 *                      ^ read here, before the command executes
 *
 * — and appends to that arm's own result whether the watch is live, so the
 * orchestrator learns in the same tool call that the next step is to end its
 * turn. There is no tool, flag, or environment variable that starts a watch:
 * every extra way in was one more thing to call, forget, or call wrongly.
 * Re-running the same arm is idempotent (ALREADY_ARMED / ALREADY_SETTLED) and
 * re-establishes the watch. Watches survive /reload and resume: they are kept as
 * session entries and restored at session_start.
 *
 * `/sop-watch` (human only) lists what is watched; `/sop-watch off` silences it.
 * `await.sh join` is refused: on pi the push is the wait, and a blocked join is
 * exactly what keeps the push from being delivered.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// Overridable so tests and slow filesystems can tune it; nothing in this
// adapter depends on the default value being 30s.
const BACKSTOP_MS = Number(process.env.SOP_AWAIT_BACKSTOP_MS) || 30_000;
// macOS backs fs.watch on a directory with FSEvents, and a freshly created
// stream is not reliably delivering for some time after fs.watch() returns —
// measurably so once a process has churned through watchers. A sentinel landing
// in that window is invisible until the 30s backstop, which for an orchestrator
// waiting on an agent is indistinguishable from the mechanism not working.
// Scan densely for the first few seconds of every watch instead; a readdir over
// a handful of files costs nothing. Measured necessary — see the ablation record.
const WARMUP_MS = 200;
const WARMUP_SCANS = 15;
const MAX_PER_SCAN = 5;
// Soft cap: only a directory with nothing pending is ever evicted to make room.
// Evicting one with a live wait would drop its settle on the floor.
const MAX_WATCHED = 8;
// A `--dir` value that still carries shell syntax means the shell had not
// expanded it when the command text was read — `--dir "$TASK"` is the shape
// that hid a live arm on 2026-09-28. Such a value is only trusted when the path
// genuinely exists (a directory may legitimately contain a `$`).
const UNEXPANDED = /[$`]/;
// Session entries: durable across /reload and resume, excluded from the model's
// context. Rebuilt from the active branch at session_start.
const ENTRY_WATCH = "sop-await-watch";
const ENTRY_ANNOUNCED = "sop-await-announced";
const ENTRY_OFF = "sop-await-off";

type Watch = {
  watcher?: fs.FSWatcher;
  backstop: ReturnType<typeof setInterval>;
  warmup?: ReturnType<typeof setInterval>;
};

export default async function (pi: any) {
  // Module scope, not per-handler: a /reload replaces the extension without a
  // new session, and we must not leak watchers.
  const watched = new Map<string, Watch>();
  // Keyed by absolute path PLUS the sentinel's own started/settled stamps.
  // Path alone is not enough in either direction: every task directory contains
  // a `writer-a.settled` (so the bare filename collides across tasks), and a
  // slot that is re-armed writes a *new* sentinel at the *same* path (so the
  // path collides across rounds — measured live: a round-2 timeout on
  // `writer-coldstart` was silently swallowed as a duplicate of round 1).
  const announced = new Set<string>();
  function identity(file: string, body: string): string {
    const started = /^started=(\d+)$/m.exec(body)?.[1] ?? "?";
    const settled = /^settled=(\d+)$/m.exec(body)?.[1] ?? "?";
    return `${file}#${started}:${settled}`;
  }

  function remember(customType: string, data: unknown) {
    try { pi.appendEntry?.(customType, data); } catch { /* persistence is best effort */ }
  }

  function stop(dir: string): boolean {
    const w = watched.get(dir);
    if (!w) return false;
    try { w.watcher?.close(); } catch { /* already closed */ }
    clearInterval(w.backstop);
    if (w.warmup) clearInterval(w.warmup);
    watched.delete(dir);
    return true;
  }

  function stopAll() {
    for (const dir of [...watched.keys()]) stop(dir);
  }

  function resolveDir(input: string, cwd: string): string | null {
    const raw = input.trim();
    let p = raw.replace(/^~(?=$|\/)/, os.homedir());
    p = path.isAbsolute(p) ? p : path.resolve(cwd, p);
    // Accept the task dir or its waits/ subdirectory. `await.sh --dir` takes the
    // task dir, so this is the common case.
    if (path.basename(p) !== "waits") p = path.join(p, "waits");
    // Never invent the unexpanded path: `<cwd>/$TASK/waits` does not exist, and
    // creating it hides the arm — the runner writes its sentinel under the
    // expanded task directory while the watcher sits on the literal one, so the
    // settle is never announced. The arm's own output names the real directory,
    // and the tool_result handler registers from there.
    if (UNEXPANDED.test(raw) && !fs.existsSync(p)) return null;
    return p;
  }

  function hasPending(dir: string): boolean {
    try {
      const files = new Set(fs.readdirSync(dir));
      for (const f of files) {
        if (f.endsWith(".armed") && !files.has(f.replace(/\.armed$/, ".settled"))) return true;
      }
    } catch { /* unreadable: nothing we can protect */ }
    return false;
  }

  // What the orchestrator must do next, by outcome. The push exists to remove
  // the wait, so every message ends in an action, never in "wait a bit".
  function describe(rc: string, reason: string | undefined, body: string): { head: string; next: string } {
    if (rc === "0") {
      return { head: "settled (rc=0)",
               next: "Read its output and its artifact now. Do not sleep first — the result is already on disk. " +
                     "A settle means the session stopped; the artifact says whether the work is done." };
    }
    if (rc === "3" || reason === "artifact-not-fresh") {
      const fresh = /^fresh=(.*)$/m.exec(body)?.[1] ?? "its artifact";
      return { head: "went quiet WITHOUT its artifact (rc=3)",
               next: `The dispatch is incomplete: the agent stopped but ${fresh} was not written. Read the output, ` +
                     `check the agent's live state, and send it back for the artifact with a new arm. This is not a finished round.` };
    }
    if (rc === "124" || reason === "timeout") {
      return { head: "hit its deadline (rc=124)",
               next: "The wait failed; the agent did not succeed. Check the agent's live state: still working → arm a " +
                     "continuation wait under a new slot label; otherwise handle it as a stall." };
    }
    return { head: `wait FAILED (rc=${rc})`,
             next: "The wait command itself failed (for example the prompt was rejected). Read the output before acting; " +
                   "do not assume the agent ran." };
  }

  function scan(dir: string, ctx?: any) {
    let files: string[];
    try { files = fs.readdirSync(dir); } catch { return; }

    let sent = 0;
    for (const file of files.sort()) {
      if (sent >= MAX_PER_SCAN) break;
      if (file.startsWith(".") || !file.endsWith(".settled")) continue;

      const file_path = path.join(dir, file);

      let body: string;
      try { body = fs.readFileSync(file_path, "utf-8").trim(); } catch { continue; }
      if (!body) continue;

      // Only actionable once every key is present. A producer that writes in
      // place rather than renaming into place can be observed half-written, and
      // announcing that is permanent: the file is marked seen and never re-read.
      if (!/^rc=\S+$/m.test(body) || !/^duration_s=\d+$/m.test(body)) continue;
      if (!/^started=\d+$/m.test(body) || !/^settled=\d+$/m.test(body)) continue;

      const key = identity(file_path, body);
      if (announced.has(key)) continue;
      announced.add(key);
      remember(ENTRY_ANNOUNCED, { key });
      sent += 1;

      const slot = file.replace(/\.settled$/, "");
      const rc = /^rc=(\S+)$/m.exec(body)?.[1] ?? "?";
      const reason = /^reason=(\S+)$/m.exec(body)?.[1];
      const { head, next } = describe(rc, reason, body);

      pi.sendMessage(
        {
          customType: "sop-await",
          content: `[sop] ${slot} ${head}\n\n${body}\n\n${next}`,
          display: true,
        },
        // triggerTurn wakes an idle pi. "steer" handles the busy case: it is an
        // interrupt, but a bounded one — delivered at a tool-call boundary, never
        // mid-token or mid-tool, though still before the next LLM call, so it does
        // change what the orchestrator does next. That is the intent: learning a
        // parallel agent finished is only useful while other work is in flight.
        { triggerTurn: true, deliverAs: "steer" },
      );

      ctx?.ui?.notify?.(`[sop] ${slot} ${head}`, rc === "0" ? "info" : "warn");
    }
  }

  function start(dir: string, ctx: any, { seed = false, persist = true } = {}): string {
    if (watched.has(dir)) return `[sop] already watching ${dir}`;
    try { fs.mkdirSync(dir, { recursive: true }); } catch { return `[sop] cannot use ${dir}`; }

    if (watched.size >= MAX_WATCHED) {
      const idle = [...watched.keys()].find((d) => !hasPending(d));
      if (idle) stop(idle);
    }

    // Sentinels already on disk when a watch is registered *late* (from an
    // arm's output) predate that arm; replaying them would be a stale wake.
    if (seed) {
      try {
        for (const f of fs.readdirSync(dir)) {
          if (!f.endsWith(".settled")) continue;
          const fp = path.join(dir, f);
          try { announced.add(identity(fp, fs.readFileSync(fp, "utf-8").trim())); } catch { /* unreadable: not seen */ }
        }
      } catch { /* nothing to seed */ }
    }

    let watcher: fs.FSWatcher | undefined;
    try {
      watcher = fs.watch(dir, () => scan(dir, ctx));
    } catch {
      // Watch unavailable (some network filesystems). The backstop covers it.
    }
    const backstop = setInterval(() => scan(dir, ctx), BACKSTOP_MS);
    backstop.unref?.();

    let n = 0;
    const warmup = setInterval(() => {
      scan(dir, ctx);
      if (++n >= WARMUP_SCANS) {
        clearInterval(warmup);
        const w = watched.get(dir);
        if (w) w.warmup = undefined;
      }
    }, WARMUP_MS);
    warmup.unref?.();

    watched.set(dir, { watcher, backstop, warmup });
    if (persist) remember(ENTRY_WATCH, { dir });

    scan(dir, ctx); // anything that settled before we started watching
    return `[sop] watching ${dir}`;
  }

  function status(): string {
    if (watched.size === 0) return "[sop] not watching anything";
    return `[sop] watching ${watched.size}:\n` + [...watched.keys()].map((d) => `  ${d}`).join("\n");
  }

  // --- the arm is the only way in -------------------------------------------
  // Requiring a human or the model to run a separate command is the step that
  // gets forgotten. `await.sh arm --dir X` carries X, and tool_call fires before
  // the command executes, so the watcher is in place before a sentinel can land.
  function segments(command: string): string[] {
    // Join backslash continuations first so multiline commands don't split --dir across lines
    return command.replace(/\\\r?\n/g, " ").split(/\n|&&|\|\||;|\|/);
  }

  function armedDirs(command: string): string[] {
    const found: string[] = [];
    for (const seg of segments(command)) {
      if (!/await\.sh["']?\s+arm\b/.test(seg)) continue;
      const m = /--dir[=\s]+(?:"([^"]*)"|'([^']*)'|(\S+))/.exec(seg);
      const v = m?.[1] ?? m?.[2] ?? m?.[3];
      if (v) found.push(v);
    }
    return found;
  }

  const isJoin = (command: string) => segments(command).some((seg) => /await\.sh["']?\s+join\b/.test(seg));
  const isArm = (command: string) => segments(command).some((seg) => /await\.sh["']?\s+arm\b/.test(seg));

  pi.on("tool_call", async (event: any, ctx: any) => {
    try {
      if (event?.toolName !== "bash") return;
      const cmd = event?.input?.command;
      if (typeof cmd !== "string") return;
      if (isJoin(cmd)) {
        // Blocking here is the rule, not a preference: pi delivers the settle
        // only after the current turn's tool calls return, so a join blocks the
        // very notification that replaces it.
        return {
          block: true,
          reason:
            "[sop] await.sh join is not used on pi: this adapter pushes the settle to you. End your turn; the " +
            "sentinel wakes you. For a one-off look at progress run `await.sh poll --dir <task-dir>` (it returns at once).",
        };
      }
      for (const raw of armedDirs(cmd)) {
        const dir = resolveDir(raw, ctx?.cwd ?? process.cwd());
        if (!dir) continue; // reported on the result, where the model reads it
        if (!watched.has(dir)) ctx?.ui?.notify?.(start(dir, ctx), "info");
      }
    } catch { /* observation must never break a tool call */ }
  });

  // --- the arm's result says whether the watch is live ----------------------
  // tool_call reads the command text, so an unexpanded --dir is a guess; the
  // arm's stdout is not. Register from the printed sentinel (seeded: sentinels
  // already on disk predate this arm), then tell the model, in the same result
  // it is reading, what it must do next.
  pi.on("tool_result", async (event: any, ctx: any) => {
    try {
      if (event?.toolName !== "bash") return;
      const cmd = event?.input?.command;
      if (typeof cmd !== "string" || !isArm(cmd)) return;
      const content = Array.isArray(event?.content) ? event.content : [];
      const text = content
        .filter((c: any) => c?.type === "text" && typeof c.text === "string")
        .map((c: any) => c.text)
        .join("\n");

      const notes: string[] = [];
      let armed = 0;
      for (const m of text.matchAll(/^(ARMED|ALREADY_ARMED|ALREADY_SETTLED) (\S+)\b.*?\bsentinel=(\/\S+)/gm)) {
        const [, kind, slot, sentinel] = m;
        const dir = path.dirname(sentinel);
        if (!watched.has(dir)) ctx?.ui?.notify?.(start(dir, ctx, { seed: true }), "info");
        if (kind === "ALREADY_SETTLED") {
          const out = /\boutput=(\S+)/.exec(m[0])?.[1] ?? sentinel.replace(/\.settled$/, ".out");
          notes.push(`[sop] ${slot} had already settled before this arm — nothing new will wake you for it. Read ${out} now.`);
        } else {
          armed += 1;
          notes.push(`[sop] watching ${dir} — ${slot} will wake you when it settles.`);
        }
      }
      if (armed > 0) {
        notes.push("[sop] End your turn now. Do not join, poll in a loop, sleep, or run a foreground agent wait.");
      }
      if (notes.length === 0) {
        notes.push(
          "[sop] No wait was armed (see the output above), so nothing will wake you for this dispatch. " +
          "Fix the command — a literal absolute --dir, await.sh options before `--` — and run the arm again.",
        );
      }
      return { content: [...content, { type: "text", text: "\n" + notes.join("\n") }] };
    } catch { /* observation must never break a tool result */ }
  });

  // --- human view -----------------------------------------------------------
  pi.registerCommand("sop-watch", {
    description: "List the SOP task directories being watched (`off` silences them all)",
    handler: async (args: string, ctx: any) => {
      const arg = (args ?? "").trim();
      if (!arg) return void ctx.ui.notify(status(), "info");
      if (arg === "off") {
        stopAll();
        remember(ENTRY_OFF, {});
        return void ctx.ui.notify("[sop] stopped watching everything", "info");
      }
      ctx.ui.notify(
        "[sop] watches start only from `await.sh arm --dir <abs task-dir>`; re-run that arm (it is idempotent) " +
        "to re-establish one. `/sop-watch` lists, `/sop-watch off` stops.",
        "warn",
      );
    },
  });

  // --- restore across /reload and resume --------------------------------------
  pi.on("session_start", async (_event: any, ctx: any) => {
    stopAll();
    announced.clear();
    let entries: any[] = [];
    try { entries = ctx?.sessionManager?.getBranch?.() ?? []; } catch { entries = []; }
    let dirs: string[] = [];
    for (const e of entries) {
      if (e?.type !== "custom") continue;
      if (e.customType === ENTRY_ANNOUNCED && typeof e.data?.key === "string") announced.add(e.data.key);
      else if (e.customType === ENTRY_WATCH && typeof e.data?.dir === "string") {
        dirs = dirs.filter((d) => d !== e.data.dir).concat(e.data.dir);
      } else if (e.customType === ENTRY_OFF) dirs = [];
    }
    // Not seeded: the restored announced set already knows what this session
    // saw, so only settles that landed while nobody was watching are delivered.
    for (const dir of dirs.slice(-MAX_WATCHED)) {
      if (!fs.existsSync(dir)) continue;
      const msg = start(dir, ctx, { persist: false });
      if (ctx?.hasUI) ctx.ui.notify(msg, "info");
    }
  });

  pi.on("session_shutdown", stopAll);
}
