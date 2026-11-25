import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import fc from "fast-check";
import { drawnEdges } from "../backends/mermaid.ts";
import type { ChartState, Region } from "../ir.ts";
import { joined } from "../run.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const scripts = path.join(here, "..");
const corpus = path.join(here, "corpus");

// ---------------------------------------------------------------------------
// Item 1, janitor half: the janitor must not signal a process group after
// the worker has exited, because the OS can hand that group id to a new
// group. The janitor kills long after the worker exits (it wakes when the
// parent dies), so that is where the reuse hazard is real. Its "exited"
// message on stdin is the running signal: with it, the worker is done and
// the parent already stopped the group; without it, the worker may still
// run and the group still needs stopping.
// The parent half is deliberately NOT changed: statechart.ts kills the
// group promptly on the worker's exit event, while the group still has the
// worker's descendants in it (a group id cannot be recycled while the
// group is non-empty), and the repo's own cli.test.ts ("a view that ends
// the check while TLC runs stops TLC") requires those descendants to be
// stopped. See the PR body.
// ---------------------------------------------------------------------------

const janitor = path.join(scripts, "janitor.ts");

async function runJanitor(pid: number, dir: string, input: string) {
  const child = spawn(process.execPath, [janitor, String(pid), dir], {
    stdio: ["pipe", "ignore", "ignore"],
  });
  const exited = once(child, "exit");
  child.stdin.end(input);
  await exited;
}

async function sleeperAlive(sleeper: ReturnType<typeof spawn>, exited: Promise<unknown[]>) {
  return Promise.race([
    exited.then(() => false),
    sleep(1000).then(() => true),
  ]);
}

test("janitor does not kill a finished worker's process group", async () => {
  const sleeper = spawn(process.execPath, ["-e", "setTimeout(() => {}, 30000)"],
    { detached: true, stdio: "ignore" });
  // Attach before the janitor runs: a process that already exited never
  // fires "exit" again, so a listener added afterwards would hang.
  const exited = once(sleeper, "exit");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "statechart-janitor-"));
  try {
    await runJanitor(sleeper.pid!, dir, "exited\n");
    assert.equal(await sleeperAlive(sleeper, exited), true, "the sleeper survives");
    assert.equal(fs.existsSync(dir), false, "the janitor still removes its dirs");
  } finally {
    sleeper.kill("SIGKILL");
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("janitor kills a running worker's process group", async () => {
  const sleeper = spawn(process.execPath, ["-e", "setTimeout(() => {}, 30000)"],
    { detached: true, stdio: "ignore" });
  const exited = once(sleeper, "exit");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "statechart-janitor-"));
  try {
    await runJanitor(sleeper.pid!, dir, "");
    await exited;
    assert.equal(sleeper.signalCode, "SIGKILL");
    assert.equal(fs.existsSync(dir), false, "the janitor still removes its dirs");
  } finally {
    sleeper.kill("SIGKILL");
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Item 3: when drawnEdges joins entry arrows into a composite state, the
// outer arrow keeps the label when every joined arrow shares one non-empty
// label; otherwise the old behaviour (outer unlabeled, inner arrows labeled)
// stays.
// ---------------------------------------------------------------------------

const state = (p: string[]): ChartState => ({
  path: p,
  start: false,
  members: [],
  works: true,
  lead: false,
  repeats: false,
  breaks: [],
  group: undefined,
});

const regionWithEntries = (labels: string[]): Region => ({
  name: "r",
  states: [state(["S0"]), ...labels.map((_, i) => state(["P", `C${i}`]))],
  steps: labels.map((label, i) => ({
    from: ["S0"],
    to: ["P", `C${i}`],
    label,
    when: undefined,
  })),
  arrows: [],
});

const edgesInto = (region: Region) => {
  const drawn = drawnEdges(region);
  const outer = drawn.find((e) => !e.start && e.from.join() === "S0" && e.to.join() === "P");
  const inner = drawn.filter((e) => e.start && e.from.join() === "P");
  return { outer, inner };
};

test("equal entry labels survive merging onto the outer arrow", () => {
  const { outer, inner } = edgesInto(regionWithEntries(["go", "go"]));
  assert.equal(outer?.label, "go");
  assert.deepEqual(inner.map((e) => e.label), [undefined, undefined]);
});

test("different entry labels do not produce a false common label", () => {
  const { outer, inner } = edgesInto(regionWithEntries(["go", "alt"]));
  assert.equal(outer?.label, undefined);
  assert.deepEqual(inner.map((e) => e.label), ["go", "alt"]);
});

test("a labeled and an unlabeled entry keep the outer arrow unlabeled", () => {
  const { outer, inner } = edgesInto(regionWithEntries(["go", ""]));
  assert.equal(outer?.label, undefined);
  assert.deepEqual(inner.map((e) => e.label), ["go", ""]);
});

test("a single entry arrow keeps its label on the outer arrow", () => {
  const { outer, inner } = edgesInto(regionWithEntries(["go"]));
  assert.equal(outer?.label, "go");
  assert.deepEqual(inner.map((e) => e.label), [undefined]);
});

test("start arrows into a composite stay unlabeled", () => {
  const region: Region = {
    name: "r",
    states: [
      { ...state(["P", "C0"]), start: true },
      { ...state(["P", "C1"]), start: true },
    ],
    steps: [],
    arrows: [],
  };
  const drawn = drawnEdges(region);
  const outer = drawn.find((e) => e.start && e.from.length === 0 && e.to.join() === "P");
  assert.equal(outer?.label, undefined);
});

test("drawnEdges hoists a label exactly when all entries share one non-empty label", () => {
  fc.assert(
    fc.property(
      fc.array(fc.constantFrom("go", "alt", "", "start"), { minLength: 2, maxLength: 6 }),
      (labels) => {
        const { outer, inner } = edgesInto(regionWithEntries(labels));
        const common = labels.every((l) => l === labels[0]) ? labels[0] : undefined;
        const hoisted = common !== undefined && common !== "";
        assert.equal(outer?.label, hoisted ? common : undefined);
        assert.deepEqual(
          inner.map((e) => e.label),
          hoisted ? labels.map(() => undefined) : labels,
        );
      },
    ),
  );
});

// ---------------------------------------------------------------------------
// Item 7: joined() opens one descriptor per log and must close each one,
// on a full read, on a read error, and when the consumer stops early.
// ---------------------------------------------------------------------------

const fdCount = () => fs.readdirSync("/proc/self/fd").length;
const onLinux = process.platform === "linux";

function spyOnCloses() {
  const opened: number[] = [];
  const closed: number[] = [];
  const origOpen = fs.openSync;
  const origClose = fs.closeSync;
  // @ts-expect-error monkey-patching for the test
  fs.openSync = (...args: Parameters<typeof fs.openSync>) => {
    const fd = origOpen(...args);
    opened.push(fd);
    return fd;
  };
  // @ts-expect-error monkey-patching for the test
  fs.closeSync = (fd: number) => {
    closed.push(fd);
    return origClose(fd);
  };
  return {
    opened,
    closed,
    restore() {
      fs.openSync = origOpen;
      fs.closeSync = origClose;
    },
  };
}

function logFiles(dir: string, contents: string[]) {
  return contents.map((text, i) => {
    const file = path.join(dir, `log${i}`);
    fs.writeFileSync(file, text);
    return file;
  });
}

test("joined closes every descriptor after a full read", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "statechart-joined-"));
  try {
    const files = logFiles(dir, ["one\ntwo\n", "three\n", "four\nfive\nsix\n"]);
    const before = onLinux ? fdCount() : 0;
    const spy = spyOnCloses();
    let text = "";
    try {
      for (const chunk of joined(files)) text += Buffer.from(chunk).toString("utf8");
    } finally {
      spy.restore();
    }
    assert.equal(text, "one\ntwo\nthree\nfour\nfive\nsix\n");
    assert.equal(spy.closed.length, spy.opened.length);
    assert.deepEqual([...spy.closed].sort(), [...spy.opened].sort());
    if (onLinux) assert.equal(fdCount(), before);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("joined closes every descriptor when the consumer stops early", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "statechart-joined-"));
  try {
    const files = logFiles(dir, ["one\ntwo\n", "three\n", "four\n"]);
    const before = onLinux ? fdCount() : 0;
    const spy = spyOnCloses();
    try {
      for (const chunk of joined(files)) {
        assert.match(Buffer.from(chunk).toString("utf8"), /one/);
        break;
      }
    } finally {
      spy.restore();
    }
    assert.equal(spy.closed.length, spy.opened.length);
    if (onLinux) assert.equal(fdCount(), before);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("joined closes every descriptor when a read fails", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "statechart-joined-"));
  try {
    const good = logFiles(dir, ["one\n"]);
    const unreadable = path.join(dir, "unreadable");
    fs.mkdirSync(unreadable);
    const files = [...good, unreadable];
    const spy = spyOnCloses();
    try {
      assert.throws(() => {
        for (const _chunk of joined(files)) { /* consume until it throws */ }
      }, /EISDIR/);
    } finally {
      spy.restore();
    }
    assert.equal(spy.closed.length, spy.opened.length);
    assert.ok(spy.opened.length >= 2, "both files were opened before the failure");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Items 5 and 6: the CLI must not print "Wrote <out>" before the tmp folder
// is gone (item 5), and a stage removal that fails must not skip the tmp
// removal (item 6). A tmpfs mount inside the folder under test makes its
// removal fail with EBUSY even as root, so the failure is deterministic.
// Both tests skip where mounts are unavailable (for example CI runners
// without mount privileges).
// ---------------------------------------------------------------------------

const canMount = (() => {
  if (process.platform !== "linux") return false;
  const probe = fs.mkdtempSync(path.join(os.tmpdir(), "statechart-mount-probe-"));
  try {
    const inner = path.join(probe, "inner");
    fs.mkdirSync(inner);
    if (spawnSync("mount", ["-t", "tmpfs", "tmpfs", inner]).status !== 0) return false;
    spawnSync("umount", [inner]);
    return true;
  } catch {
    return false;
  } finally {
    fs.rmSync(probe, { recursive: true, force: true });
  }
})();

const mountInside = (target: string) => {
  const lock = path.join(target, "lock");
  fs.mkdirSync(lock);
  return spawnSync("mount", ["-t", "tmpfs", "tmpfs", lock]).status === 0;
};

const unmountInside = (target: string) => {
  spawnSync("umount", [path.join(target, "lock")]);
};

async function waitForDir(parent: string, pattern: RegExp) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const hit = fs.readdirSync(parent).find((n) => pattern.test(n));
    if (hit) return path.join(parent, hit);
    await sleep(5);
  }
  return undefined;
}

function runCli(env: NodeJS.ProcessEnv, out: string) {
  const child = spawn(
    process.execPath,
    [path.join(scripts, "statechart.ts"), path.join(corpus, "Counter", "Counter.tla"), "--out", out],
    {
      env: {
        ...process.env,
        JAVA: path.join(here, "java.ts"),
        TLA2TOOLS: "tla2tools.jar",
        STATECHART_REPLAY: path.join(corpus, "Counter"),
        STATECHART_LOG: path.join(os.tmpdir(), `statechart-1338-${process.pid}.log`),
        ...env,
      },
    },
  );
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (d: Buffer) => (stdout += d.toString("utf8")));
  child.stderr.on("data", (d: Buffer) => (stderr += d.toString("utf8")));
  return {
    child,
    done: once(child, "exit").then(([code]) => ({ code, stdout, stderr })),
  };
}

test(
  "a failed tmp removal reports no success",
  { skip: !canMount && "mounts are unavailable, so the removal cannot be made to fail" },
  async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "statechart-tmp-"));
    const outParent = fs.mkdtempSync(path.join(os.tmpdir(), "statechart-out-"));
    const out = path.join(outParent, "out");
    const { done } = runCli({ TMPDIR: tmpRoot }, out);
    const tmp = await waitForDir(tmpRoot, /^statechart-/);
    assert.ok(tmp, "the run created its tmp folder");
    assert.equal(mountInside(tmp), true, "the mount went in before the run finished");
    const { code, stdout } = await done;
    try {
      assert.equal(code, 2, "a failed tmp removal fails the run");
      assert.doesNotMatch(stdout, /Wrote /, "no success is reported");
      assert.equal(
        fs.existsSync(path.join(out, "chart.mmd")),
        true,
        "the chart is on disk; only the message is withheld",
      );
    } finally {
      unmountInside(tmp);
      fs.rmSync(tmpRoot, { recursive: true, force: true });
      fs.rmSync(outParent, { recursive: true, force: true });
    }
  },
);

test(
  "a failed stage removal still removes tmp",
  { skip: !canMount && "mounts are unavailable, so the removal cannot be made to fail" },
  async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "statechart-tmp-"));
    const outParent = fs.mkdtempSync(path.join(os.tmpdir(), "statechart-out-"));
    const out = path.join(outParent, "out");
    const { done } = runCli({ TMPDIR: tmpRoot }, out);
    const stage = await waitForDir(outParent, /^\.out\.statechart-/);
    assert.ok(stage, "the run created its stage folder");
    assert.equal(mountInside(stage), true, "the mount went in before the run finished");
    const { code, stdout } = await done;
    try {
      assert.equal(code, 0, "a failed stage removal does not fail the run");
      assert.match(stdout, /Wrote /, "success is still reported");
      assert.deepEqual(
        fs.readdirSync(tmpRoot).filter((n) => n.startsWith("statechart-")),
        [],
        "tmp is gone even though the stage removal failed",
      );
    } finally {
      unmountInside(stage);
      fs.rmSync(tmpRoot, { recursive: true, force: true });
      fs.rmSync(outParent, { recursive: true, force: true });
    }
  },
);
