import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const corpus = path.join(here, "corpus");
const replayJava = path.join(here, "java.ts");
const cli = path.join(here, "../statechart.ts");

function writeFakeJava(file: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    `#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const args = process.argv.slice(2);
const cp = args[args.indexOf("-cp") + 1];
if (cp !== process.env.STATECHART_EXPECTED_CP) {
  console.error("unexpected classpath: " + cp);
  process.exit(91);
}
if (process.cwd() === process.env.STATECHART_CALLER) {
  console.error("Java must run in the isolated check directory");
  process.exit(92);
}
fs.appendFileSync(
  process.env.STATECHART_INVOCATIONS,
  JSON.stringify({ cwd: process.cwd(), cp }) + "\\n",
);
const result = spawnSync(
  process.execPath,
  [process.env.STATECHART_REPLAY_JAVA, ...args],
  { encoding: "utf8", env: process.env },
);
process.stdout.write(result.stdout ?? "");
process.stderr.write(result.stderr ?? "");
process.exit(result.status ?? 1);
`,
    { mode: 0o755 },
  );
}

function writeFakeMise(file: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    `#!/bin/sh
case "$1" in
  where) printf '%s\\n' "$STATECHART_MISE_ROOT" ;;
  which) printf '%s\\n' "$STATECHART_DISCOVERED_JAVA" ;;
  *) exit 1 ;;
esac
`,
    { mode: 0o755 },
  );
}

function runCase(useExplicitTlc: boolean) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "statechart-tool-paths-")));
  try {
    const fixture = path.join(root, "MediaPlayer");
    fs.cpSync(path.join(corpus, "MediaPlayer"), fixture, { recursive: true });

    const callerJar = path.join(root, "tools", "tla2tools.jar");
    const miseRoot = path.join(root, "mise-tools");
    const jar = useExplicitTlc ? callerJar : path.join(miseRoot, "tla2tools.jar");
    fs.mkdirSync(path.dirname(jar), { recursive: true });
    fs.writeFileSync(jar, "fake tla2tools jar");

    const fakeJava = path.join(root, "jdk", "bin", "java");
    const invocations = path.join(root, "java-invocations.jsonl");
    writeFakeJava(fakeJava);

    const bin = path.join(root, "bin");
    if (!useExplicitTlc) writeFakeMise(path.join(bin, "mise"));

    const out = path.join(root, "out");
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      JAVA: "./jdk/bin/java",
      STATECHART_CALLER: root,
      STATECHART_EXPECTED_CP: jar,
      STATECHART_INVOCATIONS: invocations,
      STATECHART_MISE_ROOT: miseRoot,
      STATECHART_DISCOVERED_JAVA: "/path/from/mise/java",
      STATECHART_REPLAY: fixture,
      STATECHART_REPLAY_JAVA: replayJava,
      PATH: useExplicitTlc
        ? process.env.PATH ?? ""
        : `${bin}${path.delimiter}${process.env.PATH ?? ""}`,
    };
    if (useExplicitTlc) env.TLA2TOOLS = path.relative(root, callerJar);
    else delete env.TLA2TOOLS;

    const result = spawnSync(
      process.execPath,
      [
        cli,
        path.join(fixture, "MediaPlayer.tla"),
        "--view",
        path.join(fixture, "view.mjs"),
        "--out",
        out,
      ],
      { cwd: root, encoding: "utf8", timeout: 60_000, env },
    );

    assert.equal(result.error, undefined, result.stderr);
    assert.equal(result.status, 1, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(
      fs.readFileSync(path.join(out, "chart.mmd"), "utf8"),
      fs.readFileSync(path.join(fixture, "chart.mmd"), "utf8"),
    );
    const calls = fs
      .readFileSync(invocations, "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as { cwd: string; cp: string });
    assert.ok(calls.length > 0, "the CLI did not spawn the configured Java");
    assert.ok(calls.every(({ cp }) => cp === jar));
    assert.ok(calls.every(({ cwd }) => cwd !== root));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("resolves relative TLC and Java paths from the caller with explicit TLA2TOOLS", () => {
  runCase(true);
});

test("resolves an explicit Java path from the caller after mise discovery", () => {
  runCase(false);
});
