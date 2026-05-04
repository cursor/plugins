import { describe, expect, test } from "bun:test";

import {
  applyMeasurementParser,
  buildMeasurementEnv,
  compareMeasurement,
  type MeasurementClaim,
} from "../measurements.ts";
import type { MeasurementSpec } from "../schemas.ts";

const baseSpec: MeasurementSpec = {
  name: "LOC(file.ts)",
  command: "wc -l file.ts",
};

function claim(
  after: string,
  before = "0",
  op: MeasurementClaim["op"] = "→"
): MeasurementClaim {
  return { name: baseSpec.name, before, op, after };
}

describe("compareMeasurement / applyMeasurementParser / buildMeasurementEnv", () => {
  test("Numeric within default tolerance counts as match", () => {
    const result = compareMeasurement({
      spec: baseSpec,
      measured: "108",
      claim: claim("100"),
    });
    expect(result.outcome).toBe("match");
    expect((result.driftFraction ?? 0) > 0).toBeTruthy();
    expect((result.driftFraction ?? 0) <= 0.1).toBeTruthy();
  });

  test("Numeric outside tolerance flags value-mismatch", () => {
    const result = compareMeasurement({
      spec: baseSpec,
      measured: "122",
      claim: claim("17"),
    });
    expect(result.outcome).toBe("value-mismatch");
    expect(result.detail).toMatch(/numeric drift/);
    expect((result.driftFraction ?? 0) > 1).toBeTruthy();
  });

  test("Custom tolerance widens matching window", () => {
    const result = compareMeasurement({
      spec: { ...baseSpec, toleranceFraction: 0.5 },
      measured: "140",
      claim: claim("100"),
    });
    expect(result.outcome).toBe("match");
  });

  test("Matching unit suffixes compare numerically", () => {
    const result = compareMeasurement({
      spec: baseSpec,
      measured: "2.45 MB",
      claim: claim("2.39 MB"),
    });
    expect(result.outcome).toBe("match");
  });

  test("Mismatched units do not pass", () => {
    const result = compareMeasurement({
      spec: baseSpec,
      measured: "2.41 KB",
      claim: claim("2.39 MB"),
    });
    expect(result.outcome).toBe("value-mismatch");
    expect(result.detail).toMatch(/unit mismatch/);
    expect(result.detail).toMatch(/MB/);
    expect(result.detail).toMatch(/KB/);
  });

  test("Measured bare numeric with claimed unit flags inconsistency", () => {
    const result = compareMeasurement({
      spec: baseSpec,
      measured: "2.41",
      claim: claim("2.39 MB"),
    });
    expect(result.outcome).toBe("value-mismatch");
    expect(result.detail).toMatch(/unit inconsistency/);
  });

  test("Measured unit with claimed bare numeric flags inconsistency", () => {
    const result = compareMeasurement({
      spec: baseSpec,
      measured: "2.41 MB",
      claim: claim("2.39"),
    });
    expect(result.outcome).toBe("value-mismatch");
    expect(result.detail).toMatch(/unit inconsistency/);
  });

  test("Strings collapse whitespace for equality", () => {
    const result = compareMeasurement({
      spec: baseSpec,
      measured: "84  passing",
      claim: claim("84 passing"),
    });
    expect(result.outcome).toBe("match");
  });

  test("String mismatch when neither side parses as number", () => {
    const result = compareMeasurement({
      spec: baseSpec,
      measured: "fail",
      claim: claim("pass"),
    });
    expect(result.outcome).toBe("value-mismatch");
    expect(result.detail).toMatch(/string mismatch/);
  });

  test("No claim line returns claim-missing", () => {
    const result = compareMeasurement({
      spec: baseSpec,
      measured: "42",
      claim: null,
    });
    expect(result.outcome).toBe("claim-missing");
  });

  test("wc-l parser counts non-empty lines", () => {
    const result = applyMeasurementParser({ kind: "wc-l" }, "a\nb\nc\n");
    expect(result).toEqual({ ok: true, value: "3" });

    const trailingNewline = applyMeasurementParser({ kind: "wc-l" }, "a\nb");
    expect(trailingNewline).toEqual({ ok: true, value: "2" });

    const empty = applyMeasurementParser({ kind: "wc-l" }, "\n\n");
    expect(empty).toEqual({ ok: true, value: "0" });
  });

  test("regex parser extracts capture group 1", () => {
    const result = applyMeasurementParser(
      { kind: "regex", pattern: "^(\\d+)\\s+passing", flags: "m" },
      "ok\n84 passing (3 skipped)\n"
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe("84");
  });

  test("regex parser with no group captures whole match", () => {
    const result = applyMeasurementParser(
      { kind: "regex", pattern: "[a-z]+" },
      "BUNDLE 412 bytes"
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe("bytes");
  });

  test("regex parser without match returns ok false", () => {
    const result = applyMeasurementParser(
      { kind: "regex", pattern: "totally-not-here" },
      "stdout"
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/did not match/);
  });

  test("Parser default is wc-l", () => {
    const result = applyMeasurementParser(undefined, "one\ntwo\n");
    expect(result).toEqual({ ok: true, value: "2" });
  });

  test("Allowlist plus scratch HOME override drops unsafe env", () => {
    const env = buildMeasurementEnv({
      source: {
        PATH: "/usr/bin",
        HOME: "/Users/example",
        LANG: "en_US.UTF-8",
        USER: "operator",
        SHELL: "/bin/zsh",
        CURSOR_API_KEY: "sk-cursor-redacted",
        GITHUB_TOKEN: "ghp_redacted",
        DB_PASSWORD: "redacted",
        AWS_SECRET_ACCESS_KEY: "redacted",
        AWS_PROFILE: "default",
        NPM_CONFIG_USERCONFIG: "/Users/example/.npmrc",
        GH_HOST: "github.com",
        EMPTY: undefined,
      },
      homeDir: "/tmp/orch-measure-home-abc",
    });
    expect(env.HOME).toBe("/tmp/orch-measure-home-abc");
    expect(env.PATH).toBe("/usr/bin");
    expect(env.LANG).toBe("en_US.UTF-8");
    expect(env.USER).toBe("operator");
    expect(env.SHELL).toBe("/bin/zsh");
    expect(env.CURSOR_API_KEY).toBe(undefined);
    expect(env.GITHUB_TOKEN).toBe(undefined);
    expect(env.DB_PASSWORD).toBe(undefined);
    expect(env.AWS_SECRET_ACCESS_KEY).toBe(undefined);
    expect(env.AWS_PROFILE).toBe(undefined);
    expect(env.NPM_CONFIG_USERCONFIG).toBe(undefined);
    expect(env.GH_HOST).toBe(undefined);
    expect(env.EMPTY).toBe(undefined);
  });
});
