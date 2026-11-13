import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const opensh = fileURLToPath(new URL("../open.sh", import.meta.url));
const logsh = fileURLToPath(new URL("../log.sh", import.meta.url));
const HEADER = "ts\tphase\tdecision\twhy\tevidence\tresult";

// A log in the shape log.sh writes: header plus six-cell rows.
function log(dir, rows, name = "decisions.tsv") {
  const file = join(dir, name);
  writeFileSync(file, [HEADER, ...rows].join("\n") + "\n", "utf8");
  return file;
}

const row = (ts, phase, decision, result, why = "why", evidence = "evidence") =>
  [ts, phase, decision, why, evidence, result].join("\t");

function append(file, cells) {
  const result = spawnSync(logsh, [file, ...cells], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
}

function open(file) {
  const result = spawnSync(opensh, [file], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return { rows: result.stdout.split("\n").filter((line) => line.length > 0), stderr: result.stderr };
}

test("lists the rows still open, and nothing the log already settled", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "open-rows-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = log(dir, [
    row("2026-01-01T00:05:00Z", "frame", "counted the work first", "found 5 things to sort out"),
    row("2026-01-01T00:10:00Z", "deletion", "delete the old records", "open"),
    row("2026-01-01T00:12:00Z", "signout", "remind the user to sign out", "open"),
    row("2026-01-01T00:20:00Z", "widget", "threw out the helper's work", "reverted"),
    // A new row that repeats the same phase and decision settles the deletion.
    row("2026-01-01T00:40:00Z", "deletion", "delete the old records", "tests green"),
  ]);
  const { rows } = open(file);
  assert.deepEqual(rows, [
    HEADER,
    row("2026-01-01T00:12:00Z", "signout", "remind the user to sign out", "open"),
  ]);
});

test("an open row from an earlier run is still listed after another run's start row", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "open-rows-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = log(dir, [
    row("2026-01-01T00:10:00Z", "deletion", "delete the old records", "open"),
    row("2026-01-02T00:00:00Z", "start", "rows before this are not from this run", "continued", "pickup", "agent 9f"),
    row("2026-01-02T00:05:00Z", "handoff", "leave the migration pending the owner", "open"),
    row("2026-01-03T00:00:00Z", "start", "rows before this are not from this run", "continued", "pickup", "agent 2c"),
  ]);
  const { rows } = open(file);
  assert.deepEqual(rows.slice(1), [
    row("2026-01-01T00:10:00Z", "deletion", "delete the old records", "open"),
    row("2026-01-02T00:05:00Z", "handoff", "leave the migration pending the owner", "open"),
  ]);
});

test("prints nothing when no row is open", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "open-rows-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = log(dir, [row("2026-01-01T00:10:00Z", "frame", "counted the work first", "tests green")]);
  const result = spawnSync(opensh, [file], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "");
});

test("a decision open in two rows is listed once, as its latest row", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "open-rows-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = log(dir, [
    row("2026-01-01T00:10:00Z", "deletion", "delete the old records", "open", "the account closed", "ticket 42"),
    row("2026-01-01T00:30:00Z", "deletion", "delete the old records", "open", "owner asked for a backup first", "ticket 45"),
  ]);
  const { rows } = open(file);
  assert.deepEqual(rows, [
    HEADER,
    row("2026-01-01T00:30:00Z", "deletion", "delete the old records", "open", "owner asked for a backup first", "ticket 45"),
  ]);
});

test("only the exact result `open` counts, around padding and a compound result", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "open-rows-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = log(dir, [
    row("2026-01-01T00:10:00Z", "one", "padded result", "  open  "),
    row("2026-01-01T00:11:00Z", "two", "compound result", "open, waiting on owner"),
    row("2026-01-01T00:12:00Z", "three", "reopened", "OPEN"),
  ]);
  const { rows } = open(file);
  assert.deepEqual(rows.slice(1), [row("2026-01-01T00:10:00Z", "one", "padded result", "  open  ")]);
});

test("a cell holding a Unicode line separator or a formula prefix stays one row", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "open-rows-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = log(dir, [
    row("2026-01-01T00:10:00Z", "flaky", "retry\u2028the flaky test\u2029twice", "open"),
    row("2026-01-01T00:11:00Z", "=formula", "'-already quoted", "open", "+why", "@evidence"),
  ]);
  const { rows, stderr } = open(file);
  assert.equal(stderr, "");
  assert.deepEqual(rows.slice(1), [
    row("2026-01-01T00:10:00Z", "flaky", "retry\u2028the flaky test\u2029twice", "open"),
    row("2026-01-01T00:11:00Z", "=formula", "'-already quoted", "open", "+why", "@evidence"),
  ]);
});

test("a row split over two lines is not listed, and is counted on stderr", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "open-rows-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = log(dir, [row("2026-01-01T00:10:00Z", "signout", "sign out of the demo account", "open")]);
  // What a hand-made printf can write: one row across two lines, neither a row.
  appendFileSync(file, "2026-01-01T00:20:00Z\tbroken\twritten by hand\nwith a raw newline\tshortcut\tbad printf\topen\n", "utf8");
  const { rows, stderr } = open(file);
  assert.equal(rows.length, 2);
  assert.match(rows[1], /sign out of the demo account/);
  assert.match(stderr, /^2 lines are not rows and were skipped/m);
});

test("a CRLF log and a stray header line in the middle are read", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "open-rows-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, "crlf.tsv");
  writeFileSync(file, [HEADER, row("2026-01-01T00:10:00Z", "deletion", "delete the old records", "open"), HEADER].join("\r\n") + "\r\n", "utf8");
  const { rows, stderr } = open(file);
  assert.equal(stderr, "");
  assert.deepEqual(rows, [HEADER, row("2026-01-01T00:10:00Z", "deletion", "delete the old records", "open")]);
});

test("the log on disk is not written, and its rows come back in first-appearance order", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "open-rows-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = log(dir, [
    row("2026-01-01T00:10:00Z", "second", "later decision first logged", "open"),
    row("2026-01-01T00:20:00Z", "first", "earliest open decision", "open"),
  ]);
  const before = readFileSync(file);
  const { rows } = open(file);
  assert.deepEqual(rows.slice(1), [
    row("2026-01-01T00:10:00Z", "second", "later decision first logged", "open"),
    row("2026-01-01T00:20:00Z", "first", "earliest open decision", "open"),
  ]);
  assert.deepEqual(readFileSync(file), before);
});

for (const [name, args, want] of [
  ["no argument", [], "usage: open.sh <logfile>"],
  ["two arguments", ["a", "b"], "usage: open.sh <logfile>"],
  ["a missing file", ["/no/such/log.tsv"], "error: not a log file: /no/such/log.tsv"],
]) {
  test(`exits 2 on ${name}`, () => {
    const result = spawnSync(opensh, args, { encoding: "utf8" });
    assert.equal(result.status, 2);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, new RegExp(`^${want.replace(/[[\]/]/g, (c) => `\\${c}`).replace(/\./g, "\\.")}`, "m"));
  });
}

test("an empty log lists nothing", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "open-rows-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, "empty.tsv");
  writeFileSync(file, "", "utf8");
  const result = spawnSync(opensh, [file], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "");
});

test("--help prints the usage and exits 0", () => {
  const result = spawnSync(opensh, ["--help"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^Usage: open\.sh \[-h\|--help\] <logfile>/m);
});

test("rows that log.sh wrote come back, including a quoted formula cell", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "open-rows-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, "written-by-log-sh.tsv");
  append(file, ["deletion", "-delete the old records", "the account closed", "=ticket 42", "open"]);
  append(file, ["deletion", "-delete the old records", "the user said keep them", "ticket 43", "reverted"]);
  append(file, ["signout", "remind the user to sign out", "handed off mid-run", "=chat transcript", "open"]);
  const { rows, stderr } = open(file);
  assert.equal(stderr, "");
  assert.equal(rows.length, 2);
  assert.equal(rows[0], HEADER);
  assert.match(rows[1], /\tsignout\tremind the user to sign out\t/);
  assert.match(rows[1], /\t'=chat transcript\topen$/);
});
