import { expect, test } from "bun:test";
import { compareMeasurement } from "../measurements.ts";

function check(measured: string, claimed: string) {
  return compareMeasurement({
    spec: { name: "bytes", command: "printf metric" },
    measured,
    claim: { name: "bytes", before: "0", op: "→", after: claimed },
  });
}

test("native large-number output uses numeric tolerance", () => {
  const result = check(String(1.05e21), String(1e21));
  expect(result.outcome).toBe("match");
  expect(result.measuredNumeric).toBe(1.05e21);
});

test("native small-number output reports its full numeric value", () => {
  const result = check(String(1e-7), String(1e-7));
  expect(result.outcome).toBe("match");
  expect(result.measuredNumeric).toBe(1e-7);
});

test("equivalent decimal and exponent output compare equally with units", () => {
  expect(check("1e3 MB", "1000 MB").outcome).toBe("match");
});

test("out-of-tolerance, unit mismatch, and nonnumeric strings remain rejected", () => {
  expect(check("2e21", "1e21").outcome).toBe("value-mismatch");
  expect(check("1e3 KB", "1000 MB").outcome).toBe("value-mismatch");
  expect(check("answer", "other").outcome).toBe("value-mismatch");
});

test("subunit exponents respect relative drift", () => {
  expect(check("1e-6", "1e-7").outcome).toBe("value-mismatch");
  expect(check("1.05e-7", "1e-7").outcome).toBe("match");
});
