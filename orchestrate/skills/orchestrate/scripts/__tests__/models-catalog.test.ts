import { describe, expect, test } from "bun:test";

import {
  defaultModelForType,
  isKnownModel,
  MODEL_CATALOG,
  resolveModelSelection,
} from "../models.ts";

describe("MODEL_CATALOG", () => {
  test("every catalog entry passes isKnownModel", () => {
    for (const profile of MODEL_CATALOG) {
      expect(isKnownModel(profile.slug)).toBe(true);
    }
  });

  test("slugs are unique", () => {
    const slugs = MODEL_CATALOG.map(m => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  test("defaultModelForType resolves to a catalog slug for every TaskType", () => {
    for (const type of ["worker", "subplanner", "verifier"] as const) {
      const slug = defaultModelForType(type);
      expect(isKnownModel(slug)).toBe(true);
    }
  });

  // Verifiers do focused acceptance-criteria checks; xhigh is overkill there.
  test("defaultModelForType('verifier') returns opus high (not xhigh)", () => {
    expect(defaultModelForType("verifier")).toBe("claude-opus-4-7");
  });

  // Subplanners decompose, route, and synthesize; reserve xhigh for them.
  // (Root planners pick their own model in their prompt, not via this helper;
  // there is no "planner" TaskType.)
  test("defaultModelForType('subplanner') returns opus xhigh", () => {
    expect(defaultModelForType("subplanner")).toBe(
      "claude-opus-4-7-thinking-xhigh"
    );
  });

  test("gpt-5.5-high binds reasoning=high and fast=false", () => {
    expect(isKnownModel("gpt-5.5-high")).toBe(true);
    const sel = resolveModelSelection("gpt-5.5-high");
    expect(sel.id).toBe("gpt-5.5");
    const params = new Map((sel.params ?? []).map(p => [p.id, p.value]));
    expect(params.get("reasoning")).toBe("high");
    expect(params.get("fast")).toBe("false");
  });

  test("resolveModelSelection round-trips every catalog slug", () => {
    for (const profile of MODEL_CATALOG) {
      expect(resolveModelSelection(profile.slug)).toEqual(profile.selection);
    }
  });

  test("unknown slug falls through to a bare { id } selection", () => {
    expect(resolveModelSelection("not-a-real-model")).toEqual({
      id: "not-a-real-model",
    });
  });

  // /v1/models lists `gpt-5.5` with `reasoning` and `fast` parameters; this
  // guards against re-introducing the stale "gpt-5.5 absent from /v1/models"
  // workaround that left the slug bound to a bare `{ id: "gpt-5.5" }`.
  test("gpt-5.5-high-fast binds reasoning=high and fast=true", () => {
    const sel = resolveModelSelection("gpt-5.5-high-fast");
    expect(sel.id).toBe("gpt-5.5");
    const params = new Map((sel.params ?? []).map(p => [p.id, p.value]));
    expect(params.get("reasoning")).toBe("high");
    expect(params.get("fast")).toBe("true");
  });

  // Planners pass this slug straight through
  // `Task({ model })`. Without an entry, `resolveModelSelection` falls back to
  // `{ id: "claude-opus-4-7-thinking-xhigh" }`, which the backend rejects as
  // `invalid_model`.
  test("claude-opus-4-7-thinking-xhigh binds to opus with thinking + xhigh effort", () => {
    const sel = resolveModelSelection("claude-opus-4-7-thinking-xhigh");
    expect(sel.id).toBe("claude-opus-4-7");
    const params = new Map((sel.params ?? []).map(p => [p.id, p.value]));
    expect(params.get("thinking")).toBe("true");
    expect(params.get("effort")).toBe("xhigh");
  });

  test("gpt-5.3-codex-high-fast binds to codex with reasoning=high + fast=true", () => {
    const sel = resolveModelSelection("gpt-5.3-codex-high-fast");
    expect(sel.id).toBe("gpt-5.3-codex");
    const params = new Map((sel.params ?? []).map(p => [p.id, p.value]));
    expect(params.get("reasoning")).toBe("high");
    expect(params.get("fast")).toBe("true");
  });
});
