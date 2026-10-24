import { test, expect } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const patterns = readFileSync(new URL("../skills/cursor-sdk/references/patterns.md", import.meta.url), "utf8");
const example = patterns.match(/```typescript\n([\s\S]*?)\n```/)![1];

for (const [scenario, exitCode] of [
  ["finished", 0], ["error", 2], ["cancelled", 2],
  ["retryable", 75], ["permanent", 1], ["unexpected", 1],
] as const) {
  test(`review ${scenario} exits ${exitCode} after disposing its handle`, () => {
    const directory = mkdtempSync(join(tmpdir(), "sdk-review-disposal-"));
    try {
      const sentinel = join(directory, "disposed");
      writeFileSync(join(directory, "sdk.ts"), `
import { writeFile } from "node:fs/promises";
export class CursorAgentError extends Error {
  isRetryable = process.env.SCENARIO === "retryable";
}
export const Agent = {
  create() {
    return {
      agentId: "fixture-agent",
      async [Symbol.asyncDispose]() {
        await new Promise(resolve => setTimeout(resolve, 10));
        await writeFile(process.env.SENTINEL!, "disposed");
      },
      async send() {
        const scenario = process.env.SCENARIO;
        if (scenario === "unexpected") throw new Error("fixture unexpected");
        if (scenario === "retryable" || scenario === "permanent") throw new CursorAgentError("fixture startup");
        return {
          id: "fixture-run",
          async *stream() {},
          async wait() { return { id: "fixture-run", status: scenario, durationMs: 1 }; },
        };
      },
    };
  },
};
`);
      writeFileSync(join(directory, "review.ts"), example.replace('"@cursor/sdk"', '"./sdk.ts"'));
      const child = Bun.spawnSync([process.execPath, join(directory, "review.ts")], {
        env: { ...process.env, SCENARIO: scenario, SENTINEL: sentinel,
          CURSOR_API_KEY: "fixture", REPO_URL: "fixture", HEAD_REF: "fixture" },
      });
      expect(child.exitCode).toBe(exitCode);
      expect(existsSync(sentinel)).toBe(true);
      expect(readFileSync(sentinel, "utf8")).toBe("disposed");
      if (scenario === "error" || scenario === "cancelled") {
        expect(child.stdout.toString()).not.toContain("[review] done:");
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
