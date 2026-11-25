import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { PlanValidationError } from "../errors.ts";
import {
  assertModelEnvConfig,
  defaultModelForType,
  effectiveModelCatalog,
  isKnownModel,
  MODEL_CATALOG,
  MODEL_ENV_CATALOG,
  renderModelCatalog,
  resolveModelSelection,
} from "../models.ts";

let saved: string | undefined;

/** A minimally complete entry; every field the schema requires. */
function entry(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    slug: "house-worker",
    selection: { id: "composer-2.5" },
    summary: "House worker model.",
    strengths: ["throughput"],
    speed: "fast",
    use: "Use for all bounded implementation work.",
    ...overrides,
  };
}

function setCatalog(entries: unknown): void {
  process.env[MODEL_ENV_CATALOG] = JSON.stringify(entries);
}

beforeEach(() => {
  saved = process.env[MODEL_ENV_CATALOG];
  delete process.env[MODEL_ENV_CATALOG];
});

afterEach(() => {
  if (saved === undefined) delete process.env[MODEL_ENV_CATALOG];
  else process.env[MODEL_ENV_CATALOG] = saved;
});

describe("ORCHESTRATE_MODEL_CATALOG unset", () => {
  test("the built-in catalog is in effect", () => {
    expect(effectiveModelCatalog()).toBe(MODEL_CATALOG);
    expect(defaultModelForType("worker")).toBe("gpt-5.5-high-fast");
    expect(renderModelCatalog()).not.toContain("exact model menu");
  });

  test("whitespace-only value is treated as unset", () => {
    process.env[MODEL_ENV_CATALOG] = "   ";
    expect(effectiveModelCatalog()).toBe(MODEL_CATALOG);
  });
});

describe("ORCHESTRATE_MODEL_CATALOG replaces the built-in catalog", () => {
  test("only the listed models are published", () => {
    setCatalog([entry({ defaultFor: ["worker", "subplanner", "verifier"] })]);
    expect(effectiveModelCatalog().map(m => m.slug)).toEqual(["house-worker"]);
    expect(isKnownModel("gpt-5.5-high-fast")).toBe(false);
    expect(isKnownModel("house-worker")).toBe(true);
  });

  test("entries supply every task type's default", () => {
    setCatalog([
      entry({ defaultFor: ["worker"] }),
      entry({
        slug: "house-planner",
        selection: { id: "claude-opus-4-8" },
        defaultFor: ["subplanner", "verifier"],
      }),
    ]);
    expect(defaultModelForType("worker")).toBe("house-worker");
    expect(defaultModelForType("subplanner")).toBe("house-planner");
    expect(defaultModelForType("verifier")).toBe("house-planner");
  });

  test("a slug resolves to its full selection, params included", () => {
    setCatalog([
      entry({
        selection: {
          id: "composer-2.5",
          params: [{ id: "fast", value: "true" }],
        },
        defaultFor: ["worker", "subplanner", "verifier"],
      }),
    ]);
    expect(resolveModelSelection("house-worker")).toEqual({
      id: "composer-2.5",
      params: [{ id: "fast", value: "true" }],
    });
  });

  test("a model outside the catalog still passes through as a bare id", () => {
    setCatalog([entry({ defaultFor: ["worker", "subplanner", "verifier"] })]);
    expect(resolveModelSelection("gpt-5.5")).toEqual({ id: "gpt-5.5" });
  });

  test("the rendered catalog is what planners see", () => {
    setCatalog([entry({ defaultFor: ["worker"] })]);
    const text = renderModelCatalog();
    expect(text).toContain("exact model menu");
    expect(text).toContain("`house-worker` — House worker model.");
    expect(text).toContain("(default for worker)");
    expect(text).toContain("speed: fast; strengths: throughput");
  });

  // `speed` is a free-form string so new model vocabulary doesn't require a
  // plugin release.
  test("unrecognized speed values are passed through", () => {
    setCatalog([
      entry({
        speed: "blistering",
        defaultFor: ["worker", "subplanner", "verifier"],
      }),
    ]);
    expect(renderModelCatalog()).toContain("speed: blistering");
    expect(() => assertModelEnvConfig()).not.toThrow();
  });

  test("the built-in catalog round-trips through the schema", () => {
    // `bun cli.ts models --json` is documented as a starting point, so its
    // output has to be valid input.
    setCatalog(MODEL_CATALOG);
    expect(effectiveModelCatalog()).toEqual(MODEL_CATALOG);
    expect(() => assertModelEnvConfig()).not.toThrow();
  });
});

describe("catalog config errors", () => {
  test("a missing task-type default fails fast at startup", () => {
    setCatalog([entry({ defaultFor: ["worker"] })]);
    expect(() => assertModelEnvConfig()).toThrow(PlanValidationError);
    expect(() => assertModelEnvConfig()).toThrow(
      /no subplanner default.*"defaultFor": \["subplanner"\]/s
    );
  });

  test("assertModelEnvConfig passes when every task type resolves", () => {
    setCatalog([entry({ defaultFor: ["worker", "subplanner", "verifier"] })]);
    expect(() => assertModelEnvConfig()).not.toThrow();
  });

  test("malformed JSON is rejected", () => {
    process.env[MODEL_ENV_CATALOG] = "[{slug:}]";
    expect(() => effectiveModelCatalog()).toThrow(/is not valid JSON/);
  });

  test("an incomplete entry is rejected with the offending field", () => {
    const { summary, ...withoutSummary } = entry();
    expect(summary).toBeDefined();
    setCatalog([withoutSummary]);
    expect(() => effectiveModelCatalog()).toThrow(PlanValidationError);
    expect(() => effectiveModelCatalog()).toThrow(/\[0\]\.summary/);
  });

  test("a bad selection or defaultFor is rejected", () => {
    setCatalog([entry({ selection: { id: "" } })]);
    expect(() => effectiveModelCatalog()).toThrow(/\[0\]\.selection\.id/);

    setCatalog([entry({ defaultFor: ["planner"] })]);
    expect(() => effectiveModelCatalog()).toThrow(/\[0\]\.defaultFor/);
  });

  test("a non-array value is rejected", () => {
    process.env[MODEL_ENV_CATALOG] = '{"slug":"x"}';
    expect(() => effectiveModelCatalog()).toThrow(PlanValidationError);
  });
});
