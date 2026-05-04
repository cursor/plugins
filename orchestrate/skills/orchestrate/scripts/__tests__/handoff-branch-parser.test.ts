import { describe, expect, test } from "bun:test";

import { parseHandoffBranch, resolveRunBranch } from "../core/handoff.ts";

describe("parseHandoffBranch / resolveRunBranch", () => {
  test("Worker template wraps branch value in single backticks", () => {
    const body = [
      "## Status",
      "success",
      "## Branch",
      "`agent/foo-abc1`",
      "## What I did",
      "- stuff",
    ].join("\n");
    expect(parseHandoffBranch(body)).toBe("agent/foo-abc1");
  });

  // Bare branch name without backticks is tolerated.
  test("Bare branch name is tolerated", () => {
    const body = ["## Branch", "agent/no-backticks", "## Notes"].join("\n");
    expect(parseHandoffBranch(body)).toBe("agent/no-backticks");
  });

  // `(no branch)` sentinel from a code-less handoff → null so callers can
  // preserve the placeholder rather than overwrite it with a literal sentinel.
  test("(no branch) sentinel returns null", () => {
    const body = ["## Branch", "(no branch)", ""].join("\n");
    expect(parseHandoffBranch(body)).toBe(null);
  });

  // Whitespace around the value is stripped.
  test("Whitespace around the value is stripped", () => {
    const body = ["## Branch", "  `agent/spaces-around`  ", ""].join("\n");
    expect(parseHandoffBranch(body)).toBe("agent/spaces-around");
  });

  // Section absent → null.
  test("Section absent returns null", () => {
    const body = ["## Status", "success", "## What I did", "- stuff"].join(
      "\n"
    );
    expect(parseHandoffBranch(body)).toBe(null);
  });

  // CRLF line endings (some clients normalize to CRLF on copy/paste).
  test("CRLF line endings parse", () => {
    const body = ["## Branch", "`agent/crlf-branch`", ""].join("\r\n");
    expect(parseHandoffBranch(body)).toBe("agent/crlf-branch");
  });

  // Empty `## Branch` body line → null (degenerate; callers fall back).
  test("Empty Branch body line returns null", () => {
    const body = "## Branch\n\n## Notes\n";
    expect(parseHandoffBranch(body)).toBe(null);
  });

  // Section appears mid-document; only the first matching block is honored.
  // (Worker handoffs always have one Branch section; resilience-only test.)
  test("Section appears mid-document", () => {
    const body = [
      "## What I did",
      "- ok",
      "## Branch",
      "`agent/midbody-branch`",
      "## Notes",
      "- ok",
    ].join("\n");
    expect(parseHandoffBranch(body)).toBe("agent/midbody-branch");
  });

  // §7.1 regression: drives the precedence rule that `waitAndHandoff` uses
  // to feed `reconcileVerifierStartingRefs`. The pre-fix flow had no body
  // parse and would have returned the fallback (the still-placeholder
  // `s.branch`); reverting `resolveRunBranch` to skip the body parse breaks
  // this assertion.
  test("Handoff body branch takes precedence over fallback", () => {
    const result = resolveRunBranch({
      handoffBody: "## Branch\n`agent/foo-abc1`\n",
      runBranches: [{ branch: undefined }, { branch: null }],
      fallback: "orch/x/foo",
    });
    expect(result).toBe("agent/foo-abc1");
  });

  // runBranches takes second priority when the handoff body lacks a Branch
  // section (e.g. legacy handoffs).
  test("runBranches takes second priority without Branch section", () => {
    const result = resolveRunBranch({
      handoffBody: "## Status\nsuccess\n",
      runBranches: [{ branch: "agent/from-sdk" }],
      fallback: "orch/x/foo",
    });
    expect(result).toBe("agent/from-sdk");
  });

  // Both empty → the recorded fallback wins (the planner-side placeholder
  // until something better is observed).
  test("Fallback wins when body and runBranches are empty", () => {
    const result = resolveRunBranch({
      handoffBody: "## Status\nsuccess\n",
      runBranches: [{ branch: undefined }],
      fallback: "orch/x/foo",
    });
    expect(result).toBe("orch/x/foo");
  });
});
