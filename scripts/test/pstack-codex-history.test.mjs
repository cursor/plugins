import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, unlinkSync, utimesSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test } from "node:test";
import { zstdCompressSync } from "node:zlib";
import { readSessions } from "../../pstack/docs/harness/codex/sessions.mjs";
import { includeCodexActivity } from "../../pstack/docs/harness/codex/worktree-audit.mjs";

// Expected last-chat dates are UTC days. The local-time test sets its own TZ.
process.env.TZ = "UTC";

const pstack = fileURLToPath(new URL("../../pstack", import.meta.url));
const cli = join(pstack, "docs/harness/codex/sessions.mjs");
const auditCli = join(pstack, "docs/harness/codex/worktree-audit.mjs");
const helpFooter = /\S[\s\S]*\nCodex history: --home <codex-home> overrides CODEX_HOME\.\n$/;

function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "pstack-codex-history-")));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const workspace = join(root, "workspace with spaces");
  const rollout = (relative, id, cwd, modifiedAt, { body = "not JSON; message bodies must not be parsed\n", source = "cli", meta = {} } = {}) => {
    const path = join(root, relative);
    mkdirSync(dirname(path), { recursive: true });
    const content = JSON.stringify({ type: "session_meta", payload: { id, cwd, source, ...meta } }) + "\n" + body;
    writeFileSync(path, path.endsWith(".zst") ? zstdCompressSync(content) : content);
    utimesSync(path, modifiedAt / 1000, modifiedAt / 1000);
    return path;
  };
  const run = (...args) => spawnSync(process.execPath, [cli, "--home", root, ...args], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
  return { root, workspace, rollout, run };
}

test("session lookup scopes active and archived history to the exact workspace", (t) => {
  const f = fixture(t);
  const active = f.rollout("sessions/2026/10/01/active.jsonl", "active", f.workspace, 1000);
  const archived = f.rollout("archived_sessions/archived.jsonl", "archived", f.workspace, 2000);
  f.rollout("sessions/unrelated.jsonl", "unrelated", f.workspace + "-other", 3000);
  f.rollout("sessions/subfolder.jsonl", "subfolder", join(f.workspace, "nested-project"), 4000);
  const result = f.run("--cwd", f.workspace);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).map(({ id, path }) => ({ id, path })), [
    { id: "archived", path: archived }, { id: "active", path: active },
  ]);
  assert.deepEqual(JSON.parse(f.run("--cwd", f.workspace, "--id", "active").stdout).map(({ id }) => id), ["active"]);
  assert.deepEqual(JSON.parse(f.run("--cwd", f.workspace, "--id", "unrelated").stdout), []);
});

test("missing history is empty but malformed metadata fails the lookup", async (t) => {
  const f = fixture(t);
  assert.deepEqual(await readSessions(f.root), []);
  const path = f.rollout("sessions/broken.jsonl", "broken", f.workspace, 1000);
  writeFileSync(path, JSON.stringify({ type: "session_meta", payload: { id: "broken" } }) + "\n");
  const result = f.run("--cwd", f.workspace);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Invalid Codex session metadata/);
  assert.equal(result.stdout, "");
  assert.equal(f.run("--cwd", "relative/path").status, 1);
});

test("both CLIs run when invoked through a symlinked install path", (t) => {
  const f = fixture(t);
  const link = join(f.root, "pstack-link");
  symlinkSync(pstack, link);
  const via = (script, ...args) =>
    spawnSync(process.execPath, [join(link, "docs/harness/codex", script), ...args], { encoding: "utf8" });
  const rejected = via("sessions.mjs", "--cwd", "relative");
  assert.equal(rejected.status, 1);
  assert.match(rejected.stderr, /--cwd requires an absolute workspace path/);
  f.rollout("sessions/linked.jsonl", "linked", f.workspace, 1000);
  const listed = via("sessions.mjs", "--home", f.root, "--cwd", f.workspace);
  assert.equal(listed.status, 0, listed.stderr);
  assert.deepEqual(JSON.parse(listed.stdout).map(({ id }) => id), ["linked"]);
  const help = via("worktree-audit.mjs", "--help");
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, helpFooter);
});

test("both helpers import as libraries when the process argument is not a file", () => {
  const source = `const { readSessions } = await import(${JSON.stringify(pathToFileURL(cli).href)});
const { includeCodexActivity } = await import(${JSON.stringify(pathToFileURL(auditCli).href)});
console.log(typeof readSessions, typeof includeCodexActivity);`;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", source, "missing-argument"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "function function\n");
});

test("history defaults to CODEX_HOME when --home is absent", (t) => {
  const f = fixture(t);
  f.rollout("sessions/home.jsonl", "home", f.workspace, 1000);
  const run = (env, ...args) =>
    spawnSync(process.execPath, [cli, "--cwd", f.workspace, ...args], { encoding: "utf8", env: { ...process.env, ...env } });
  const defaulted = run({ CODEX_HOME: f.root });
  assert.equal(defaulted.status, 0, defaulted.stderr);
  assert.deepEqual(JSON.parse(defaulted.stdout).map(({ id }) => id), ["home"]);
  assert.deepEqual(JSON.parse(run({ CODEX_HOME: join(f.root, "elsewhere") }).stdout), []);
  assert.deepEqual(JSON.parse(run({ CODEX_HOME: join(f.root, "elsewhere") }, "--home", f.root).stdout).map(({ id }) => id), ["home"]);
});

test("compressed active and archived rollouts are listed and read only after exact workspace selection", (t) => {
  const f = fixture(t);
  const body = JSON.stringify({ type: "event_msg", payload: { message: "selected transcript" } }) + "\n";
  f.rollout("sessions/active.jsonl.zst", "active", f.workspace, 1000, { body });
  f.rollout("archived_sessions/archived.jsonl.zst", "archived", f.workspace, 2000, { body });
  f.rollout("sessions/other.jsonl.zst", "other", f.workspace + "-other", 3000, { body: "private-unrelated-sentinel\n" });
  const listed = f.run("--cwd", f.workspace);
  assert.equal(listed.status, 0, listed.stderr);
  assert.deepEqual(JSON.parse(listed.stdout).map(({ id }) => id), ["archived", "active"]);
  const selected = f.run("--cwd", f.workspace, "--id", "active", "--read");
  assert.equal(selected.status, 0, selected.stderr);
  assert.equal(JSON.parse(selected.stdout.split("\n")[0]).payload.id, "active");
  assert.ok(selected.stdout.endsWith(body));
  assert.ok(!selected.stdout.includes("private-unrelated-sentinel"));
  const denied = f.run("--cwd", f.workspace, "--id", "other", "--read");
  assert.equal(denied.status, 1);
  assert.equal(denied.stdout, "");
  assert.match(denied.stderr, /No matching Codex session/);
  assert.equal(f.run("--cwd", f.workspace, "--read").status, 1);
});

test("reading concatenated Zstd frames returns the complete selected transcript exactly", (t) => {
  const f = fixture(t);
  const path = f.rollout("sessions/frames.jsonl.zst", "frames", f.workspace, 1000);
  const first = JSON.stringify({ type: "session_meta", payload: { id: "frames", cwd: f.workspace } }) + "\n";
  const second = JSON.stringify({ type: "event_msg", payload: { message: "second frame" } }) + "\n";
  const third = JSON.stringify({ type: "event_msg", payload: { message: "third frame" } }) + "\n";
  writeFileSync(path, Buffer.concat([first, second, third].map((content) => zstdCompressSync(content))));
  const result = f.run("--cwd", f.workspace, "--id", "frames", "--read");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, first + second + third);
});

const spawnedBy = (parentId) => ({ subagent: { thread_spawn: { parent_thread_id: parentId, depth: 1 } } });

test("history lists omit subagents by default while explicit inclusion and id selection preserve lineage", (t) => {
  const f = fixture(t);
  f.rollout("sessions/parent.jsonl", "parent", f.workspace, 1000);
  f.rollout("sessions/child.jsonl.zst", "child", f.workspace, 2000, { source: spawnedBy("parent"), body: "child transcript\n" });
  f.rollout("sessions/guardian.jsonl", "guardian", f.workspace, 3000, {
    source: { subagent: { other: "guardian" } }, meta: { parent_thread_id: "parent" },
  });
  assert.deepEqual(JSON.parse(f.run("--cwd", f.workspace).stdout).map(({ id }) => id), ["parent"]);
  const all = JSON.parse(f.run("--cwd", f.workspace, "--include-subagents").stdout);
  assert.deepEqual(all.map(({ id, isSubagent, parentId }) => ({ id, isSubagent, parentId })), [
    { id: "guardian", isSubagent: true, parentId: "parent" },
    { id: "child", isSubagent: true, parentId: "parent" },
    { id: "parent", isSubagent: false, parentId: null },
  ]);
  const child = f.run("--cwd", f.workspace, "--id", "child", "--read");
  assert.equal(child.status, 0, child.stderr);
  assert.ok(child.stdout.endsWith("child transcript\n"));
});

test("corrupt and truncated compressed history fails visibly without unhandled stream errors", (t) => {
  const f = fixture(t);
  const path = f.rollout("sessions/broken.jsonl.zst", "broken", f.workspace, 1000);
  writeFileSync(path, "not a zstd stream");
  const corrupt = f.run("--cwd", f.workspace);
  assert.equal(corrupt.status, 1);
  assert.equal(corrupt.stdout, "");
  assert.match(corrupt.stderr, /Cannot read Codex rollout/);
  assert.doesNotMatch(corrupt.stderr, /Unhandled|unhandled|node:events/);
  const content = JSON.stringify({ type: "session_meta", payload: { id: "broken", cwd: f.workspace } }) + "\n" +
    JSON.stringify({ type: "event_msg", payload: { message: randomBytes(200000).toString("hex") } }) + "\n";
  writeFileSync(path, zstdCompressSync(content).subarray(0, -10));
  const truncated = f.run("--cwd", f.workspace, "--id", "broken", "--read");
  assert.equal(truncated.status, 1);
  assert.match(truncated.stderr, /Cannot read Codex rollout/);
  assert.doesNotMatch(truncated.stderr, /Unhandled|unhandled|node:events/);
});

test("compressed transcript reads reject incomplete later frames and short trailing input", (t) => {
  const f = fixture(t);
  const path = f.rollout("sessions/trailing.jsonl.zst", "trailing", f.workspace, 1000);
  const first = zstdCompressSync(JSON.stringify({ type: "session_meta", payload: { id: "trailing", cwd: f.workspace } }) + "\n");
  const second = zstdCompressSync(JSON.stringify({ type: "event_msg", payload: { message: "unfinished frame" } }) + "\n");
  const cases = [
    { label: "incomplete frame header", tail: second.subarray(0, 5) },
    { label: "incomplete frame content", tail: second.subarray(0, -1) },
    ...[1, 2, 3].flatMap((length) => [
      { label: `garbage tail length ${length}`, tail: Buffer.alloc(length, 0x7f) },
      { label: `partial frame magic length ${length}`, tail: second.subarray(0, length) },
    ]),
  ];
  for (const { label, tail } of cases) {
    writeFileSync(path, Buffer.concat([first, tail]));
    const result = f.run("--cwd", f.workspace, "--id", "trailing", "--read");
    assert.equal(result.status, 1, label);
    assert.match(result.stderr, /Cannot read Codex rollout/, label);
    assert.doesNotMatch(result.stderr, /Unhandled|unhandled|node:events/, label);
  }
});

test("unsupported native runtimes reject compressed history before reading while plain history remains readable", (t) => {
  const f = fixture(t);
  const path = f.rollout("sessions/plain.jsonl", "plain", f.workspace, 1000, { body: "plain history\n" });
  const versions = ["22.15.0", "22.23.4", "23.11.0", "24.19.0", "24.20.0", "24.21.0", "25.9.0", "26.5.0", "26.6.0", "26.9.0"];
  const code = `import { readRollout } from ${JSON.stringify(new URL("../../pstack/docs/harness/codex/sessions.mjs", import.meta.url).href)};
    const results = [];
    for (const version of ${JSON.stringify(versions)}) {
      Object.defineProperty(process.versions, 'node', {value:version,configurable:true});
      let plain = '';
      for await (const chunk of readRollout(${JSON.stringify(path)})) plain += chunk;
      let error;
      try {
        for await (const chunk of readRollout(${JSON.stringify(join(f.root, "must-not-be-opened.jsonl.zst"))})) {}
      } catch (caught) { error = caught.message; }
      results.push({version,plain,error});
    }
    console.log(JSON.stringify(results));`;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", code], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const results = JSON.parse(result.stdout);
  assert.deepEqual(results.map(({ version }) => version), versions);
  for (const { plain, error } of results) {
    assert.ok(plain.endsWith("plain history\n"));
    assert.match(error, /requires Node\.js 24\.22\+ \(24\.x\) or 26\.10\+/);
    assert.doesNotMatch(error, /ENOENT/);
  }
});

const row = (path, bucket = "safe", last = "-") => `1M\t9d\tYES\tclean\tpushed\t#1/merged\t${last}\t${bucket}\t${path}`;

test("recent Codex activity prevents cleanup without overriding work or PR holds", async (t) => {
  const f = fixture(t);
  const now = Date.parse("2026-10-30T12:00:00Z");
  const paths = ["/work/safe", "/work/review", "/work/wip", "/work/pr", "/work/old", "/work/unknown"];
  const buckets = ["safe", "review", "hold-wip", "hold-open-pr", "safe", "safe"];
  const output = "# base: main\nSIZE\tAGE\tMERGED\tDIRTY\tREMOTE\tPR\tLAST_CHAT\tBUCKET\tWORKTREE\n" +
    paths.map((path, i) => row(path, buckets[i])).join("\n") + "\n";
  paths.slice(0, 5).forEach((cwd, i) => f.rollout(`sessions/${i}.jsonl`, String(i), cwd,
    now - (i === 4 ? 5 : 1) * 86400000, { body: "" }));
  const result = (await includeCodexActivity(output, await readSessions(f.root), now))
    .trimEnd().split("\n").slice(2).map((line) => line.split("\t"));
  assert.deepEqual(result.map((fields) => fields[7]), ["verify-recent-chat", "verify-recent-chat", "hold-wip", "hold-open-pr", "safe", "safe"]);
  assert.deepEqual(result.map((fields) => fields[6]), ["2026-10-29", "2026-10-29", "2026-10-29", "2026-10-29", "2026-10-25", "-"]);
  assert.deepEqual(result.map((fields) => fields[8]), paths);
});

test("activity uses the newest matching session and the shared audit five-day cutoff", async () => {
  const now = Date.parse("2026-10-30T12:00:00Z");
  const sessions = [
    { cwd: "/work/repo", modifiedAt: now - 9 * 86400000 },
    { cwd: "/work/repo", modifiedAt: now - 5 * 86400000 + 1000 },
    { cwd: "/work/older", modifiedAt: now - 5 * 86400000 },
  ];
  assert.match(await includeCodexActivity(row("/work/repo"), sessions, now), /\tverify-recent-chat\t/);
  assert.match(await includeCodexActivity(row("/work/older"), sessions, now), /\tsafe\t/);
  assert.match(await includeCodexActivity(row("/work/repo", "safe", "2026-10-30"), sessions, now), /\t2026-10-30\tverify-recent-chat\t/);
  assert.match(await includeCodexActivity(row("/work/repo"), [{ cwd: "/work/repo", modifiedAt: now - 4.5 * 86400000 }], now), /\tverify-recent-chat\t/);
  await assert.rejects(includeCodexActivity("unexpected output", sessions, now), /cleanup is unverified/);
});

test("activity in a worktree subdirectory protects its root without matching sibling prefixes", async (t) => {
  const f = fixture(t);
  const now = Date.parse("2026-10-30T12:00:00Z");
  const metadata = [
    { cwd: "/work/feature", modifiedAt: now - 9 * 86400000 },
    { cwd: "/work/feature/apps/web", modifiedAt: now - 86400000 },
    { cwd: "/work/feature-other", modifiedAt: now },
    { cwd: "/work/sibling-other/apps", modifiedAt: now },
  ];
  metadata.forEach(({ cwd, modifiedAt }, i) => f.rollout(`sessions/${i}.jsonl`, String(i), cwd, modifiedAt, { body: "" }));
  const output = [row("/work/feature"), row("/work/sibling")].join("\n");
  const result = (await includeCodexActivity(output, await readSessions(f.root), now)).split("\n");
  assert.equal(result[0], row("/work/feature", "verify-recent-chat", "2026-10-29"));
  assert.equal(result[1], row("/work/sibling"));
});

test("recent repository and delegated sessions protect mentioned worktrees without reading unrelated or old bodies", async (t) => {
  const f = fixture(t);
  const now = Date.parse("2026-10-30T12:00:00Z");
  const worktree = '/work/feature "quoted" \\ literal';
  const sibling = "/work/sibling";
  const childWorktree = "/work/child";
  const body = JSON.stringify({ type: "response_item", payload: {
    type: "function_call", name: "exec_command",
    arguments: JSON.stringify({ workdir: worktree, cmd: `echo ${sibling}-other/file` }),
  } }) + "\n";
  f.rollout("sessions/parent.jsonl.zst", "parent", f.workspace, now - 86400000, { body });
  f.rollout("sessions/child.jsonl", "child", "/elsewhere", now - 1000, {
    source: spawnedBy("parent"), body: JSON.stringify({ payload: { cwd: childWorktree } }) + "\n",
  });
  f.rollout("sessions/unrelated.jsonl", "unrelated", "/unrelated", now);
  f.rollout("sessions/old.jsonl", "old", f.workspace, now - 5 * 86400000);
  const output = [row(worktree), row(childWorktree), row(sibling)].join("\n");
  const result = (await includeCodexActivity(output, await readSessions(f.root), now, f.workspace)).split("\n");
  assert.equal(result[0], row(worktree, "verify-recent-chat", "2026-10-29"));
  assert.equal(result[1], row(childWorktree, "verify-recent-chat", "2026-10-30"));
  assert.equal(result[2], row(sibling));
});

test("custom tool JavaScript inputs protect literal and escaped paths without matching sibling prefixes", async (t) => {
  const f = fixture(t);
  const now = Date.parse("2026-10-30T12:00:00Z");
  const plain = "/work/plain";
  const escaped = '/work/feature "quoted" \\ literal';
  const sibling = '/work/sibling "quoted" \\ literal';
  const body = [plain, escaped, sibling + "-other"].map((workdir) => JSON.stringify({
    type: "response_item", payload: {
      type: "custom_tool_call", name: "functions.exec",
      input: "const result = await tools.exec_command(" + JSON.stringify({ workdir, cmd: "pwd" }) + ");",
    },
  })).join("\n") + "\n";
  f.rollout("sessions/parent.jsonl", "parent", f.workspace, now, { body });
  const output = [row(plain), row(escaped), row(sibling)].join("\n");
  const result = (await includeCodexActivity(output, await readSessions(f.root), now, f.workspace)).split("\n");
  assert.equal(result[0], row(plain, "verify-recent-chat", "2026-10-30"));
  assert.equal(result[1], row(escaped, "verify-recent-chat", "2026-10-30"));
  assert.equal(result[2], row(sibling));
});

test("escaped newlines and tabs after a worktree path count as mentions without matching sibling prefixes", async (t) => {
  const f = fixture(t);
  const now = Date.parse("2026-10-30T12:00:00Z");
  const body = JSON.stringify({ type: "response_item", payload: {
    type: "function_call", name: "exec_command",
    arguments: JSON.stringify({ cmd: "cd /work/newline\nnpm test\ncd /work/tab\tls\ncd /work/sibling-other\nls" }),
  } }) + "\n";
  f.rollout("sessions/parent.jsonl", "parent", f.workspace, now, { body });
  const output = [row("/work/newline"), row("/work/tab"), row("/work/sibling")].join("\n");
  const result = (await includeCodexActivity(output, await readSessions(f.root), now, f.workspace)).split("\n");
  assert.equal(result[0], row("/work/newline", "verify-recent-chat", "2026-10-30"));
  assert.equal(result[1], row("/work/tab", "verify-recent-chat", "2026-10-30"));
  assert.equal(result[2], row("/work/sibling"));
});

test("audit canonicalizes existing cwd aliases and repository scope without changing output or history selection", async (t) => {
  const f = fixture(t);
  const now = Date.parse("2026-10-30T12:00:00Z");
  const repository = join(f.root, "repo");
  const worktree = join(f.root, "worktree");
  const mentioned = join(f.root, "mentioned-worktree");
  const repositoryAlias = join(f.root, "repo-alias");
  const worktreeAlias = join(f.root, "worktree-alias");
  for (const path of [repository, worktree, mentioned]) mkdirSync(path);
  symlinkSync(repository, repositoryAlias);
  symlinkSync(worktree, worktreeAlias);
  f.rollout("sessions/direct.jsonl", "direct", worktreeAlias, now - 86400000, { body: "" });
  f.rollout("sessions/parent.jsonl", "parent", repositoryAlias, now, {
    body: JSON.stringify({ payload: { workdir: mentioned } }) + "\n",
  });
  const sessions = await readSessions(f.root);
  const output = [row(worktree), row(mentioned)].join("\n");
  const result = (await includeCodexActivity(output, sessions, now, repository)).split("\n");
  assert.equal(result[0], row(worktree, "verify-recent-chat", "2026-10-29"));
  assert.equal(result[1], row(mentioned, "verify-recent-chat", "2026-10-30"));
  assert.equal(await includeCodexActivity(row(worktreeAlias), sessions, now, repository),
    row(worktreeAlias, "verify-recent-chat", "2026-10-29"));
  assert.deepEqual(JSON.parse(f.run("--cwd", worktree).stdout), []);
  assert.deepEqual(JSON.parse(f.run("--cwd", worktreeAlias).stdout).map(({ id }) => id), ["direct"]);
});

test("audit retains missing historical paths but propagates other canonicalization failures", async (t) => {
  const f = fixture(t);
  const now = Date.now();
  const missing = join(f.root, "removed-worktree");
  assert.match(await includeCodexActivity(row(missing), [{ cwd: missing, modifiedAt: now }], now), /\tverify-recent-chat\t/);
  const loop = join(f.root, "symlink-loop");
  symlinkSync(loop, loop);
  await assert.rejects(includeCodexActivity(row(missing), [{ cwd: loop, modifiedAt: now }], now), { code: "ELOOP" });
});

test("unreadable and malformed recent scoped rollouts leave worktree cleanup unverified", async (t) => {
  const f = fixture(t);
  const now = Date.now();
  const path = f.rollout("sessions/recent.jsonl", "recent", f.workspace, now);
  const sessions = await readSessions(f.root);
  await assert.rejects(includeCodexActivity(row("/work/feature"), sessions, now, f.workspace), /Invalid Codex rollout during worktree audit/);
  unlinkSync(path);
  await assert.rejects(includeCodexActivity(row("/work/feature"), sessions, now, f.workspace), /Cannot read Codex rollout/);
});

test("needed audit scans reject incomplete event frames instead of reporting a safe worktree", async (t) => {
  const f = fixture(t);
  const now = Date.now();
  const worktree = "/work/feature";
  const path = f.rollout("sessions/incomplete.jsonl.zst", "incomplete", f.workspace, now);
  const metadata = zstdCompressSync(JSON.stringify({ type: "session_meta", payload: { id: "incomplete", cwd: f.workspace } }) + "\n");
  const event = zstdCompressSync(JSON.stringify({ type: "response_item", payload: { workdir: worktree } }) + "\n");
  writeFileSync(path, Buffer.concat([metadata, event.subarray(0, 5)]));
  const sessions = [{ id: "incomplete", cwd: f.workspace, path, modifiedAt: now }];
  await assert.rejects(includeCodexActivity(row(worktree), sessions, now, f.workspace), /Cannot read Codex rollout/);
});

test("last-chat dates use the same local timezone as the shared shell audit", () => {
  const code = `import { includeCodexActivity } from ${JSON.stringify(new URL("../../pstack/docs/harness/codex/worktree-audit.mjs", import.meta.url).href)};
    console.log(await includeCodexActivity(${JSON.stringify(row("/work/repo"))}, [{cwd:'/work/repo',modifiedAt:Date.parse('2026-10-29T23:30:00Z')}], Date.parse('2026-10-30T12:00:00Z')));`;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", code], {
    encoding: "utf8", env: { ...process.env, TZ: "Europe/Zurich" },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), row("/work/repo", "verify-recent-chat", "2026-10-30"));
});

test("worktree audit CLI uses injected history and protects delegated work in a real repository", (t) => {
  const f = fixture(t);
  const repository = join(f.root, "repo");
  const worktree = join(f.root, "feature");
  const bin = join(f.root, "bin");
  mkdirSync(repository);
  mkdirSync(bin);
  for (const name of ["gh", "origin"]) writeFileSync(join(bin, name), "#!/bin/sh\nexit 1\n", { mode: 0o755 });
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" };
  const git = (...args) => {
    const result = spawnSync("git", ["-C", repository, ...args], { env, encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  };
  git("init", "--initial-branch=main");
  git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "-c", "core.hooksPath=/dev/null", "commit", "--allow-empty", "-m", "fixture");
  git("worktree", "add", "--detach", worktree, "main");
  const body = JSON.stringify({ type: "response_item", payload: {
    type: "function_call", arguments: JSON.stringify({ workdir: worktree, cmd: "pwd" }),
  } }) + "\n";
  f.rollout("sessions/delegated.jsonl.zst", "delegated", repository, Date.now(), { source: spawnedBy("parent"), body });
  const run = (...args) => spawnSync(process.execPath, [auditCli, "--home", f.root, ...args], { env, encoding: "utf8" });
  const result = run("-b", "main", repository);
  assert.equal(result.status, 0, result.stderr);
  const fields = result.stdout.trim().split("\n").at(-1).split("\t");
  assert.equal(fields[7], "verify-recent-chat");
  assert.equal(fields[8], worktree);
  const help = run("--help");
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, helpFooter);
  const bad = f.rollout("sessions/broken.jsonl.zst", "broken", repository, Date.now());
  writeFileSync(bad, "bad compressed data");
  const failed = run("-b", "main", repository);
  assert.equal(failed.status, 1);
  assert.equal(failed.stdout, "");
  assert.match(failed.stderr, /Cannot read Codex rollout/);
});
