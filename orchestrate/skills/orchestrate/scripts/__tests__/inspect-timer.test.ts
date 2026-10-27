import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("completed stream inspection releases its deadline timers", () => {
  const child = spawnSync(
    process.execPath,
    [
      "-e",
      `
    import { inspectRunStream } from "./core/agent-manager.ts";
    const run = { stream: async function* () {
      yield { type: "assistant", message: { content: [{ type:"text", text:"done" }] } };
    } };
    const result = await inspectRunStream({ run, task:"one", agentId:"a", runId:"r", timeoutMs:30000 });
    console.log(JSON.stringify(result));
  `,
    ],
    {
      cwd: fileURLToPath(new URL("../", import.meta.url)),
      encoding: "utf8",
      timeout: 2000,
    }
  );
  expect(child.stdout).toContain('"last_assistant_text_snippet":"done"');
  expect(child.error).toBeUndefined();
  expect(child.status).toBe(0);
});

test("silent inspection still reaches its deadline and closes the iterator", async () => {
  const { inspectRunStream } = await import("../core/agent-manager.ts");
  let returned = false;
  const iterator = {
    next: () => new Promise<IteratorResult<never>>(() => {}),
    return: async () => {
      returned = true;
      return { done: true as const, value: undefined };
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
  const result = await inspectRunStream({
    run: { stream: () => iterator } as never,
    task: "silent",
    agentId: "a",
    runId: "r",
    timeoutMs: 25,
  });
  expect(returned).toBe(true);
  expect(result.tool_calls_total).toBe(0);
  expect(result.drainedMs).toBeGreaterThanOrEqual(20);
  expect(result.drainedMs).toBeLessThan(1000);
});

test("stream rejection is preserved and the iterator is closed", async () => {
  const { inspectRunStream } = await import("../core/agent-manager.ts");
  let returned = false;
  const iterator = {
    next: async () => {
      throw new Error("stream failed");
    },
    return: async () => {
      returned = true;
      return { done: true as const, value: undefined };
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
  await expect(
    inspectRunStream({
      run: { stream: () => iterator } as never,
      task: "failed",
      agentId: "a",
      runId: "r",
      timeoutMs: 30000,
    })
  ).rejects.toThrow("stream failed");
  expect(returned).toBe(true);
});
