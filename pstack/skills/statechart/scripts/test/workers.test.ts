import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const skip = !process.env.TLA2TOOLS && "set TLA2TOOLS to the path of tla2tools.jar to run TLC";
const read = (file: string) => fs.readFileSync(file, "utf8");

const distinct = (text: string) => {
  let n = 0;
  for (const m of text.matchAll(/(\d[\d,]*) distinct states found/g))
    n = Math.max(n, Number(m[1].replaceAll(",", "")));
  return n;
};

const holds = (report: string) => report.match(/^## Rules that hold\n(.*)$/m)?.[1];
const reached = (report: string) => report.match(/^TLC reached ([\d,]+) states,/m)?.[1];
const shortest = (report: string) => report.match(/^## \S+ breaks\n[\s\S]*?(?=\n## |$)/m)?.[0];

function writeModel(name: string, limit: number, rule: string, cfg: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "statechart-workers-"));
  fs.writeFileSync(
    path.join(dir, `${name}.tla`),
    [
      `---- MODULE ${name} ----`,
      "EXTENDS Naturals",
      "VARIABLES a, b",
      "Init == a = 0 /\\ b = 0",
      `IncA == a < ${limit} /\\ a' = a + 1 /\\ UNCHANGED b`,
      `IncB == b < ${limit} /\\ b' = b + 1 /\\ UNCHANGED a`,
      `Rest == a = ${limit} /\\ b = ${limit} /\\ UNCHANGED <<a, b>>`,
      "Next == IncA \\/ IncB \\/ Rest",
      rule,
      "====",
      "",
    ].join("\n"),
  );
  fs.writeFileSync(path.join(dir, `${name}.cfg`), cfg);
  return dir;
}

function check(dir: string, name: string, workers: string) {
  const out = path.join(dir, `out-${workers}`);
  const r = spawnSync(
    process.execPath,
    [
      path.join(here, "../statechart.ts"),
      path.join(dir, `${name}.tla`),
      "--config",
      path.join(dir, `${name}.cfg`),
      "--out",
      out,
    ],
    {
      encoding: "utf8",
      env: { ...process.env, STATECHART_WORKERS: workers },
    },
  );
  assert.equal(r.stderr, "");
  return {
    status: r.status,
    report: read(path.join(out, "report.md")),
    tlc: read(path.join(out, "tlc.out")),
  };
}

test(
  "a model above 100,000 states that holds matches one worker and records two",
  { skip, timeout: 1_200_000 },
  () => {
    const dir = writeModel(
      "WideHold",
      330,
      "Room == a \\in 0..330 /\\ b \\in 0..330",
      "INIT Init\nNEXT Next\nINVARIANT Room\n",
    );
    const one = check(dir, "WideHold", "1");
    const two = check(dir, "WideHold", "2");
    assert.equal(one.status, 0);
    assert.equal(two.status, 0);
    assert.equal(holds(two.report), holds(one.report));
    assert.equal(reached(two.report), reached(one.report));
    assert.ok(distinct(one.tlc) > 100_000);
    assert.equal(distinct(two.tlc), distinct(one.tlc));
    assert.match(two.tlc, /with 2 workers/);
  },
);

test(
  "a model above 100,000 states keeps the one-worker shortest path when an invariant breaks",
  { skip, timeout: 1_200_000 },
  () => {
    const dir = writeModel(
      "WideBreak",
      460,
      "Below == a < 460",
      "INIT Init\nNEXT Next\nINVARIANT Below\nCHECK_DEADLOCK FALSE\n",
    );
    const one = check(dir, "WideBreak", "1");
    const two = check(dir, "WideBreak", "2");
    assert.equal(one.status, 1);
    assert.equal(two.status, 1);
    assert.ok(distinct(one.tlc) > 100_000);
    assert.equal(shortest(two.report), shortest(one.report));
    assert.match(shortest(one.report) ?? "", /The shortest path has 460 steps:/);
  },
);
