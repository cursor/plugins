import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, realpathSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  assessClassification,
  buildScannerCommands,
  evaluateScannerOutput,
  inspectRepositorySignals,
  runDeterministicScan,
} from "../skills/check-agent-compatibility/scripts/run-deterministic-scan.mjs";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const fixturesRoot = resolve(testDirectory, "fixtures/deterministic-scan");
const cloudflareWorkerRoot = realpathSync(
  resolve(fixturesRoot, "cloudflare-worker"),
);
const genuineCliRoot = realpathSync(resolve(fixturesRoot, "genuine-cli"));
const skillRoot = resolve(testDirectory, "../skills/check-agent-compatibility");

function scannerOutput(targetRoot, kind) {
  return {
    scannedPath: targetRoot,
    overallScore: 81,
    maturity: "Solid",
    classification: {
      kind,
      reasons: ["fixture classification"],
    },
    recommendations: [
      {
        title: "Add a validation command",
        remediation: "Expose validation from the repository root.",
        evidence: ["no validation command found"],
      },
    ],
  };
}

test("pins both scanner commands to agent-compatibility 0.1.7", () => {
  const commands = buildScannerCommands(genuineCliRoot);

  assert.deepEqual(commands.version, {
    command: "npx",
    args: ["-y", "agent-compatibility@0.1.7", "--version"],
  });
  assert.deepEqual(commands.scan, {
    command: "npx",
    args: ["-y", "agent-compatibility@0.1.7", "--json", genuineCliRoot],
  });
});

test("rejects a CLI classification for a Cloudflare Worker without a CLI entrypoint", () => {
  const signals = inspectRepositorySignals(cloudflareWorkerRoot);
  const assessment = assessClassification("cli", signals);

  assert.equal(signals.isCloudflareWorker, true);
  assert.equal(signals.hasCliEntrypoint, false);
  assert.equal(assessment.reliable, false);
  assert.match(assessment.reason, /Cloudflare Worker/i);
  assert.ok(assessment.evidence.includes("wrangler.toml"));
});

test("preserves a CLI classification backed by package bin metadata", () => {
  const signals = inspectRepositorySignals(genuineCliRoot);
  const assessment = assessClassification("cli", signals);

  assert.equal(signals.hasCliEntrypoint, true);
  assert.ok(signals.cli.includes("package.json#bin"));
  assert.equal(assessment.reliable, true);
  assert.equal(assessment.reason, null);
});

test("marks a mismatched scannedPath unreliable while retaining scanner evidence", () => {
  const signals = inspectRepositorySignals(genuineCliRoot);
  const result = evaluateScannerOutput({
    targetRoot: genuineCliRoot,
    scannerVersion: "0.1.7",
    scanOutput: scannerOutput(cloudflareWorkerRoot, "cli"),
    signals,
  });

  assert.equal(result.status, "unreliable");
  assert.equal(result.classificationReliable, false);
  assert.equal(result.score, 81);
  assert.equal(result.problems[0].title, "Add a validation command");
  assert.match(result.summary, /scannedPath/i);
});

test("returns a complete result for a matching, well-supported CLI scan", () => {
  const signals = inspectRepositorySignals(genuineCliRoot);
  const result = evaluateScannerOutput({
    targetRoot: genuineCliRoot,
    scannerVersion: "0.1.7",
    scanOutput: scannerOutput(genuineCliRoot, "cli"),
    signals,
  });

  assert.equal(result.status, "complete");
  assert.equal(result.classification, "cli");
  assert.equal(result.classificationReliable, true);
  assert.equal(result.scannedPath, genuineCliRoot);
});

test("runs the version check before the scan and returns structured JSON", async () => {
  const invocations = [];
  const executeCommand = async (command) => {
    invocations.push(command);
    if (command.args.at(-1) === "--version") {
      return { ok: true, stdout: "0.1.7\n", stderr: "", exitCode: 0 };
    }

    return {
      ok: true,
      stdout: JSON.stringify(scannerOutput(genuineCliRoot, "cli")),
      stderr: "",
      exitCode: 0,
    };
  };

  const result = await runDeterministicScan(genuineCliRoot, {
    executeCommand,
  });

  assert.deepEqual(
    invocations.map((command) => command.args),
    [
      ["-y", "agent-compatibility@0.1.7", "--version"],
      ["-y", "agent-compatibility@0.1.7", "--json", genuineCliRoot],
    ],
  );
  assert.equal(result.status, "complete");
  assert.deepEqual(
    result.commands.map((command) => command.outcome),
    ["passed", "passed"],
  );
  assert.doesNotThrow(() => JSON.stringify(result));
});

test("normalizes scanner execution failures instead of throwing", async () => {
  const executeCommand = async (command) => {
    if (command.args.at(-1) === "--version") {
      return { ok: true, stdout: "0.1.7\n", stderr: "", exitCode: 0 };
    }

    return {
      ok: false,
      stdout: "",
      stderr: "npm registry unavailable",
      exitCode: 1,
      error: "npm registry unavailable",
    };
  };

  const result = await runDeterministicScan(genuineCliRoot, {
    executeCommand,
  });

  assert.deepEqual(result, {
    status: "unavailable",
    scoreName: "Deterministic Compatibility Score",
    score: null,
    scannerVersion: "0.1.7",
    targetRoot: genuineCliRoot,
    scannedPath: null,
    classification: null,
    classificationReliable: false,
    classificationEvidence: [],
    summary: "Pinned scanner execution failed: npm registry unavailable",
    evidence: ["Pinned scanner execution failed: npm registry unavailable"],
    problems: [],
    commands: [
      {
        command: "npx -y agent-compatibility@0.1.7 --version",
        outcome: "passed",
      },
      {
        command: `npx -y agent-compatibility@0.1.7 --json ${genuineCliRoot}`,
        outcome: "failed",
        detail: "npm registry unavailable",
      },
    ],
  });
});

test("executes through the documented symlinked plugin install", (t) => {
  const temporaryDirectory = mkdtempSync(
    resolve(tmpdir(), "deterministic-scan-symlink-"),
  );
  const linkedSkillRoot = resolve(
    temporaryDirectory,
    "check-agent-compatibility",
  );
  t.after(() => rmSync(temporaryDirectory, { recursive: true, force: true }));
  symlinkSync(skillRoot, linkedSkillRoot, "dir");

  const run = spawnSync(
    process.execPath,
    [resolve(linkedSkillRoot, "scripts/run-deterministic-scan.mjs")],
    { encoding: "utf8" },
  );

  assert.equal(run.status, 1);
  assert.equal(run.stderr, "");
  assert.equal(JSON.parse(run.stdout).status, "unavailable");
});
