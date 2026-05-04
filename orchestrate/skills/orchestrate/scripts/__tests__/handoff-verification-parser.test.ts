import { describe, expect, test } from "bun:test";

import {
  parseHandoffFailureMode,
  parseHandoffPrNumber,
  parseHandoffVerification,
} from "../core/handoff.ts";

describe("parseHandoffVerification", () => {
  test("Reads canonical ## Verification value", () => {
    const body = [
      "## Verification",
      "live-ui-verified",
      "## Target",
      "`x`",
    ].join("\n");
    expect(parseHandoffVerification(body)).toBe("live-ui-verified");
  });

  test("Backticks around the value are stripped", () => {
    const body = ["## Verification", "`unit-test-verified`", ""].join("\n");
    expect(parseHandoffVerification(body)).toBe("unit-test-verified");
  });

  test("Whitespace and CRLF are tolerated", () => {
    const body = ["## Verification", "  type-check-only  ", ""].join("\r\n");
    expect(parseHandoffVerification(body)).toBe("type-check-only");
  });

  test("Underscores or spaces normalize to dashes", () => {
    const body = ["## Verification", "verifier_blocked", ""].join("\n");
    expect(parseHandoffVerification(body)).toBe("verifier-blocked");
  });

  test("Mixed-case enum value is accepted", () => {
    const body = ["## Verification", "Verifier-Failed", ""].join("\n");
    expect(parseHandoffVerification(body)).toBe("verifier-failed");
  });

  test("Unknown value returns null without falling through to legacy", () => {
    const body = ["## Verification", "totally-made-up", ""].join("\n");
    expect(parseHandoffVerification(body)).toBe(null);
  });

  test("Empty value returns null", () => {
    const body = ["## Verification", "", "## Notes"].join("\n");
    expect(parseHandoffVerification(body)).toBe(null);
  });

  test("Section absent returns null", () => {
    const body = ["## Status", "success", "## Branch", "`x`"].join("\n");
    expect(parseHandoffVerification(body)).toBe(null);
  });

  test("Legacy ## Verdict pass migrates to type-check-only", () => {
    const body = ["## Verdict", "pass", "## Target", "`x`"].join("\n");
    expect(parseHandoffVerification(body)).toBe("type-check-only");
  });

  test("Legacy ## Verdict fail migrates to verifier-failed", () => {
    const body = ["## Verdict", "fail", ""].join("\n");
    expect(parseHandoffVerification(body)).toBe("verifier-failed");
  });

  test("Legacy ## Verdict inconclusive migrates to verifier-blocked", () => {
    const body = ["## Verdict", "inconclusive", ""].join("\n");
    expect(parseHandoffVerification(body)).toBe("verifier-blocked");
  });

  test("Legacy ## Verdict unknown returns null", () => {
    const body = ["## Verdict", "maybe?", ""].join("\n");
    expect(parseHandoffVerification(body)).toBe(null);
  });

  test("Canonical ## Verification wins when both sections appear", () => {
    const body = [
      "## Verification",
      "live-ui-verified",
      "## Verdict",
      "fail",
    ].join("\n");
    expect(parseHandoffVerification(body)).toBe("live-ui-verified");
  });
});

describe("parseHandoffFailureMode", () => {
  test("Reads canonical failure mode section", () => {
    const body = ["## Failure Mode", "oom", ""].join("\n");
    expect(parseHandoffFailureMode(body)).toBe("oom");
  });

  test("Reads failureMode key value", () => {
    const body = ["Cloud run failed.", "failureMode: network_drop"].join("\n");
    expect(parseHandoffFailureMode(body)).toBe("network-drop");
  });

  test("Unknown failure mode returns null", () => {
    const body = ["## Failure Mode", "something-else", ""].join("\n");
    expect(parseHandoffFailureMode(body)).toBe(null);
  });
});

describe("parseHandoffPrNumber", () => {
  test("Reads GitHub pull request URLs", () => {
    const body =
      "Opened https://github.com/example-org/example-repo/pull/109301";
    expect(parseHandoffPrNumber(body)).toBe(109301);
  });

  test("Reads review.cursor.com pull request URLs", () => {
    const body =
      "Opened <https://review.cursor.com/github/example-org/example-repo/pull/109301|#109301>";
    expect(parseHandoffPrNumber(body)).toBe(109301);
  });

  test("Reads PR section shorthand", () => {
    const body = ["## PR", "#109301"].join("\n");
    expect(parseHandoffPrNumber(body)).toBe(109301);
  });
});
