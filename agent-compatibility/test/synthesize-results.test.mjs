import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  synthesizeResults,
  validateResults,
} from "../skills/check-agent-compatibility/scripts/synthesize-results.mjs";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const scriptPath = resolve(
  testDirectory,
  "../skills/check-agent-compatibility/scripts/synthesize-results.mjs",
);

const scoreNames = {
  deterministic: "Deterministic Compatibility Score",
  startup: "Startup Compatibility Score",
  validation: "Validation Loop Score",
  docs: "Docs Reliability Score",
};
const targetRoot = "/workspace/target-repository";

function completeResults(overrides = {}) {
  const results = {
    deterministic: {
      status: "complete",
      scoreName: scoreNames.deterministic,
      score: 81,
      classificationReliable: true,
      targetRoot,
      summary: "Pinned scan completed.",
      evidence: ["scanner 0.1.7 scanned the canonical target"],
      problems: [],
      commands: [{ command: "pinned scan", outcome: "passed" }],
    },
    startup: {
      status: "complete",
      scoreName: scoreNames.startup,
      score: 90,
      targetRoot,
      executionRoot: "/tmp/startup-isolated-copy",
      isolation: "isolated-copy",
      summary: "Startup completed in isolation.",
      evidence: ["startup command passed"],
      problems: [],
      commands: [{ command: "startup", outcome: "passed" }],
    },
    validation: {
      status: "complete",
      scoreName: scoreNames.validation,
      score: 80,
      targetRoot,
      executionRoot: "/tmp/validation-isolated-copy",
      isolation: "isolated-copy",
      summary: "Validation completed in isolation.",
      evidence: ["validation command passed"],
      problems: [],
      commands: [{ command: "validate", outcome: "passed" }],
    },
    docs: {
      status: "complete",
      scoreName: scoreNames.docs,
      score: 70,
      targetRoot,
      summary: "Documentation was traced to repository interfaces.",
      evidence: ["README.md:10 maps to package.json#scripts.test"],
      problems: [],
      commands: [],
    },
  };

  for (const [lane, values] of Object.entries(overrides)) {
    results[lane] = { ...results[lane], ...values };
  }

  return results;
}

test("computes the workflow average and eligible 70/30 aggregate", () => {
  const input = completeResults();
  const before = structuredClone(input);

  assert.deepEqual(synthesizeResults(input), {
    schemaVersion: 1,
    status: "complete",
    agentCompatibilityScore: 81,
    workflowCompatibilityScore: 80,
    components: before,
    unavailableWorkflowLanes: [],
    reason: null,
  });
  assert.deepEqual(
    input,
    before,
    "synthesis must not mutate specialist results",
  );
});

test("rounds the workflow score before applying the 70/30 blend", () => {
  const result = synthesizeResults(
    completeResults({
      deterministic: { score: 0 },
      startup: { score: 0 },
      validation: { score: 14 },
      docs: { score: 0 },
    }),
  );

  assert.equal(result.workflowCompatibilityScore, 5);
  assert.equal(result.agentCompatibilityScore, 2);
});

test("returns workflow-only evidence when deterministic classification is unreliable", () => {
  const result = synthesizeResults(
    completeResults({
      deterministic: {
        status: "unreliable",
        classificationReliable: false,
      },
    }),
  );

  assert.equal(result.status, "degraded");
  assert.equal(result.agentCompatibilityScore, null);
  assert.equal(result.workflowCompatibilityScore, 80);
  assert.deepEqual(result.reason, {
    code: "DETERMINISTIC_UNRELIABLE",
    message:
      "The deterministic classification is unreliable; only workflow evidence was aggregated.",
  });
});

test("returns workflow-only evidence when the deterministic scan is unavailable", () => {
  const result = synthesizeResults(
    completeResults({
      deterministic: {
        status: "unavailable",
        score: null,
        classificationReliable: false,
      },
    }),
  );

  assert.equal(result.status, "degraded");
  assert.equal(result.agentCompatibilityScore, null);
  assert.equal(result.workflowCompatibilityScore, 80);
  assert.equal(result.reason.code, "DETERMINISTIC_UNAVAILABLE");
});

test("returns no aggregate when any workflow lane is unavailable", () => {
  const result = synthesizeResults(
    completeResults({
      startup: { status: "unavailable", score: null },
      docs: { status: "unavailable", score: null },
    }),
  );

  assert.equal(result.status, "unavailable");
  assert.equal(result.agentCompatibilityScore, null);
  assert.equal(result.workflowCompatibilityScore, null);
  assert.deepEqual(result.unavailableWorkflowLanes, ["startup", "docs"]);
  assert.deepEqual(result.reason, {
    code: "WORKFLOW_LANES_UNAVAILABLE",
    message:
      "No aggregate was computed because workflow lanes are unavailable: startup, docs.",
  });
});

test("validates exact lane names, statuses, and score bounds", () => {
  assert.throws(
    () => validateResults({ ...completeResults(), surprise: {} }),
    /unexpected lane "surprise"/,
  );
  assert.throws(
    () =>
      validateResults(
        completeResults({ startup: { scoreName: "Startup-ish Score" } }),
      ),
    /startup\.scoreName/,
  );
  assert.throws(
    () =>
      validateResults(completeResults({ validation: { status: "failed" } })),
    /validation\.status/,
  );
  assert.throws(
    () => validateResults(completeResults({ docs: { score: 101 } })),
    /docs\.score/,
  );
  assert.throws(
    () => validateResults(completeResults({ startup: { score: "90" } })),
    /startup\.score/,
  );
});

test("rejects inconsistent unavailable and deterministic states", () => {
  assert.throws(
    () =>
      validateResults(
        completeResults({ startup: { status: "unavailable", score: 0 } }),
      ),
    /startup\.score must be null/,
  );
  assert.throws(
    () =>
      validateResults(
        completeResults({
          deterministic: {
            status: "unreliable",
            classificationReliable: true,
          },
        }),
      ),
    /deterministic\.classificationReliable must be false/,
  );
  assert.throws(
    () =>
      validateResults(
        completeResults({
          deterministic: {
            status: "complete",
            classificationReliable: false,
          },
        }),
      ),
    /deterministic\.classificationReliable must be true/,
  );
});

test("rejects evidence-free, wrong-target, and non-isolated results", () => {
  const bare = {
    deterministic: {
      status: "complete",
      scoreName: scoreNames.deterministic,
      score: 81,
      classificationReliable: true,
    },
    startup: {
      status: "complete",
      scoreName: scoreNames.startup,
      score: 90,
    },
    validation: {
      status: "complete",
      scoreName: scoreNames.validation,
      score: 80,
    },
    docs: {
      status: "complete",
      scoreName: scoreNames.docs,
      score: 70,
    },
  };

  assert.throws(() => validateResults(bare), /targetRoot|summary|evidence/);
  assert.throws(
    () =>
      validateResults(
        completeResults({ docs: { targetRoot: "/workspace/wrong-target" } }),
      ),
    /same targetRoot/,
  );
  assert.throws(
    () =>
      validateResults(
        completeResults({ startup: { executionRoot: targetRoot } }),
      ),
    /executionRoot/,
  );
  assert.throws(
    () =>
      validateResults(
        completeResults({ startup: { executionRoot: `${targetRoot}/.` } }),
      ),
    /executionRoot/,
  );
  assert.throws(
    () =>
      validateResults(
        completeResults({
          startup: { executionRoot: "/tmp/shared-isolated-copy" },
          validation: { executionRoot: "/tmp/shared-isolated-copy/." },
        }),
      ),
    /separate executionRoot/,
  );
  assert.throws(
    () => validateResults(completeResults({ validation: { evidence: [] } })),
    /evidence/,
  );
});

test("retains validated target, evidence, and isolation provenance", () => {
  const result = synthesizeResults(completeResults());

  assert.equal(result.components.docs.targetRoot, targetRoot);
  assert.deepEqual(result.components.docs.evidence, [
    "README.md:10 maps to package.json#scripts.test",
  ]);
  assert.equal(
    result.components.startup.executionRoot,
    "/tmp/startup-isolated-copy",
  );
  assert.equal(result.components.startup.isolation, "isolated-copy");
});

test("CLI reads valid JSON from stdin and emits structured JSON", () => {
  const run = spawnSync(process.execPath, [scriptPath], {
    encoding: "utf8",
    input: JSON.stringify(completeResults()),
  });

  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stderr, "");
  assert.deepEqual(
    JSON.parse(run.stdout),
    synthesizeResults(completeResults()),
  );
});

test("CLI reads one JSON file path", (t) => {
  const temporaryDirectory = mkdtempSync(
    resolve(tmpdir(), "synthesize-results-"),
  );
  const inputPath = resolve(temporaryDirectory, "results.json");
  t.after(() => rmSync(temporaryDirectory, { recursive: true, force: true }));
  writeFileSync(inputPath, JSON.stringify(completeResults()));

  const run = spawnSync(process.execPath, [scriptPath, inputPath], {
    encoding: "utf8",
  });

  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(
    JSON.parse(run.stdout),
    synthesizeResults(completeResults()),
  );
});

test("CLI fails closed with structured errors for malformed input", () => {
  const run = spawnSync(process.execPath, [scriptPath, "-"], {
    encoding: "utf8",
    input: "{not json",
  });

  assert.equal(run.status, 1);
  assert.equal(run.stdout, "");
  assert.deepEqual(JSON.parse(run.stderr), {
    status: "invalid",
    error: {
      code: "INVALID_JSON",
      message: "Input is not valid JSON.",
    },
  });
});

test("CLI fails closed with structured errors for invalid result data", () => {
  const run = spawnSync(process.execPath, [scriptPath], {
    encoding: "utf8",
    input: JSON.stringify(
      completeResults({ validation: { status: "failed" } }),
    ),
  });

  assert.equal(run.status, 1);
  assert.equal(run.stdout, "");
  const error = JSON.parse(run.stderr);
  assert.equal(error.status, "invalid");
  assert.equal(error.error.code, "INVALID_RESULTS");
  assert.match(error.error.message, /validation\.status/);
});

test("CLI executes through the documented symlinked plugin install", (t) => {
  const temporaryDirectory = mkdtempSync(
    resolve(tmpdir(), "synthesize-results-symlink-"),
  );
  const skillRoot = resolve(scriptPath, "../..");
  const linkedSkillRoot = resolve(
    temporaryDirectory,
    "check-agent-compatibility",
  );
  t.after(() => rmSync(temporaryDirectory, { recursive: true, force: true }));
  symlinkSync(
    skillRoot,
    linkedSkillRoot,
    process.platform === "win32" ? "junction" : "dir",
  );

  const run = spawnSync(
    process.execPath,
    [resolve(linkedSkillRoot, "scripts/synthesize-results.mjs")],
    { encoding: "utf8", input: JSON.stringify(completeResults()) },
  );

  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(
    JSON.parse(run.stdout),
    synthesizeResults(completeResults()),
  );
});
