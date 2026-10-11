import test from "node:test";
import assert from "node:assert/strict";
import { handle, normalizeTask } from "../server.mjs";

test("MCP advertises the generation and same-task query tools", async () => {
  const init = await handle({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
  assert.equal(init.result.serverInfo.name, "qwen-image-acedatacloud");
  assert.deepEqual(init.result.capabilities, { tools: {} });
  const list = await handle({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
  assert.deepEqual(list.result.tools.map((item) => item.name), [
    "qwen_image_generate",
    "qwen_image_get_task"
  ]);
});

test("unfinished tasks stay pending even with an intermediate response", () => {
  const task = normalizeTask({
    id: "same-task",
    finished_at: null,
    response: { success: false, data: [{ image_url: "https://example.com/intermediate.png" }] }
  });
  assert.equal(task.status, "pending");
  assert.equal(task.task_id, "same-task");
  assert.deepEqual(task.media_urls, []);
});

test("terminal success exposes only completed HTTPS images", () => {
  const task = normalizeTask({
    id: "same-task",
    finished_at: 1,
    trace_id: "trace",
    response: {
      success: true,
      data: [{ image_url: "https://example.com/final.png" }, { image_url: "http://example.com/unsafe.png" }]
    }
  });
  assert.equal(task.status, "succeeded");
  assert.equal(task.trace_id, "trace");
  assert.deepEqual(task.media_urls, ["https://example.com/final.png"]);
});

test("terminal failure is not reported as pending or successful", () => {
  const task = normalizeTask({ id: "same-task", finished_at: 1, response: { success: false } });
  assert.equal(task.status, "failed");
  assert.equal(task.success, false);
  assert.deepEqual(task.media_urls, []);
});
