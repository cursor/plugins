import { describe, expect, test } from "bun:test";

import type { ModelProfile } from "../models.ts";
import { printProbeResults, probeModelCatalog } from "../tools/probe-models.ts";

describe("models --check", () => {
  test("reports invalid_model failures from the SDK", async () => {
    const catalog = [
      profile("good-model", { id: "good" }),
      profile("bad-model", { id: "bad" }),
    ];
    const results = await probeModelCatalog("test-key", {
      catalog,
      agentApi: {
        create: async opts => {
          const model = (opts as { model: { id: string } }).model;
          if (model.id === "bad") {
            throw new Error("[invalid_model] bad");
          }
          return {
            agentId: "bc-good",
            send: async () => ({ id: "run-good" }),
          };
        },
        getRun: async () => ({
          cancel: async () => {},
        }),
      },
    });

    expect(results).toEqual([
      { profile: catalog[0], ok: true },
      { profile: catalog[1], ok: false, error: "[invalid_model] bad" },
    ]);
  });

  test("printProbeResults returns nonzero failure count", () => {
    const catalog = [profile("bad-model", { id: "bad" })];
    const priorLog = console.log;
    const priorError = console.error;
    const lines: string[] = [];
    console.log = (line?: unknown) => {
      lines.push(String(line ?? ""));
    };
    console.error = (line?: unknown) => {
      lines.push(String(line ?? ""));
    };
    try {
      expect(
        printProbeResults([
          { profile: catalog[0], ok: false, error: "[invalid_model] bad" },
        ])
      ).toBe(1);
      expect(lines.join("\n")).toContain("[invalid_model] bad");
    } finally {
      console.log = priorLog;
      console.error = priorError;
    }
  });
});

function profile(slug: string, selection: ModelProfile["selection"]): ModelProfile {
  return {
    slug,
    selection,
    summary: slug,
    strengths: [],
    speed: "fast",
    use: slug,
  };
}
