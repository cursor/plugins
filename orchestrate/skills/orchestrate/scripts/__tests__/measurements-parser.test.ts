import { describe, expect, test } from "bun:test";

import { parseHandoffMeasurements } from "../measurements.ts";

describe("parseHandoffMeasurements", () => {
  test("Section absent returns null", () => {
    const result = parseHandoffMeasurements(
      [
        "## Status",
        "success",
        "## Branch",
        "`agent/foo-1`",
        "## What I did",
        "- stuff",
      ].join("\n")
    );
    expect(result).toBe(null);
  });

  test("(none) on its own line returns empty claims", () => {
    const result = parseHandoffMeasurements(
      [
        "## What I did",
        "- stuff",
        "",
        "## Measurements",
        "(none)",
        "",
        "## Notes",
        "- whatever",
      ].join("\n")
    );
    expect(result).toBeTruthy();
    expect(result?.none).toBe(true);
    expect(result?.claims).toEqual([]);
    expect(result?.unparsed).toEqual([]);
  });

  test("Mixed operators and optional bullet prefix parse", () => {
    const result = parseHandoffMeasurements(
      [
        "## Measurements",
        "- LOC(packages/ui/src/Settings.tsx): 412 → 354",
        "pnpm test --filter @example/foo: 84 passing → 84 passing",
        "* bundle size: 2.41 MB → 2.39 MB",
        "  - cold start: 1200ms <= 900ms",
        "",
        "## Notes",
        "- nothing else",
      ].join("\n")
    );
    expect(result).toBeTruthy();
    expect(result?.none).toBe(false);
    expect(result?.claims.length).toBe(4);
    expect(result?.claims[0]).toEqual({
      name: "LOC(packages/ui/src/Settings.tsx)",
      before: "412",
      op: "→",
      after: "354",
    });
    expect(result?.claims[1]).toEqual({
      name: "pnpm test --filter @example/foo",
      before: "84 passing",
      op: "→",
      after: "84 passing",
    });
    expect(result?.claims[2]).toEqual({
      name: "bundle size",
      before: "2.41 MB",
      op: "→",
      after: "2.39 MB",
    });
    expect(result?.claims[3]).toEqual({
      name: "cold start",
      before: "1200ms",
      op: "<=",
      after: "900ms",
    });
  });

  test("Unparseable lines land in unparsed", () => {
    const result = parseHandoffMeasurements(
      [
        "## Measurements",
        "- LOC: 412 → 354",
        "this line is just prose, no operator",
        "another: missing-op-with-newlines",
      ].join("\n")
    );
    expect(result).toBeTruthy();
    expect(result?.claims.length).toBe(1);
    expect(result?.unparsed.length).toBe(2);
    expect(result?.unparsed[0]).toMatch(/this line is just prose/);
  });

  test("Final Measurements section terminates at end-of-string", () => {
    const result = parseHandoffMeasurements(
      ["## Measurements", "LOC: 100 → 80"].join("\n")
    );
    expect(result).toBeTruthy();
    expect(result?.claims.length).toBe(1);
    expect(result?.claims[0]?.after).toBe("80");
  });

  test("Less-than-or-equal operator does not collide with less-than", () => {
    const result = parseHandoffMeasurements(
      ["## Measurements", "p99 latency: 410ms <= 350ms"].join("\n")
    );
    expect(result).toBeTruthy();
    expect(result?.claims[0]?.op).toBe("<=");
    expect(result?.claims[0]?.after).toBe("350ms");
  });
});
