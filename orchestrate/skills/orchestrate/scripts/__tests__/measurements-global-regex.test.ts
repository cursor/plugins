import { expect, test } from "bun:test";
import { applyMeasurementParser } from "../measurements.ts";

test("global regex returns the first capture, including with multiple matches", () => {
  for (const stdout of ["size=42", "size=42 size=84"]) {
    expect(applyMeasurementParser({ kind: "regex", pattern: "size=(\\d+)", flags: "g" }, stdout)).toEqual({ ok: true, value: "42" });
  }
});

test("global regex without captures returns the first full match", () => {
  expect(applyMeasurementParser({ kind: "regex", pattern: "size=\\d+", flags: "g" }, "size=42 size=84")).toEqual({ ok: true, value: "size=42" });
});

test("global regex reports an absent match", () => {
  expect(applyMeasurementParser({ kind: "regex", pattern: "size=(\\d+)", flags: "g" }, "no measurements").ok).toBe(false);
});
