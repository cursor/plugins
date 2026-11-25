import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { verifyPlugin } from "../scripts/verify-plugin.mjs";

test("the Global Cursor plugin satisfies its package contract", () => {
  const result = verifyPlugin();

  assert.deepEqual(result, {
    name: "kling-ai",
    endpoint: "https://kling.ai/mcp/plugin",
    version: "1.4.2"
  });
});

test("suggested prompts cover Image 4.0, both 4.0 video models, HDR, motions, and Elements in both languages", () => {
  const examples = readFileSync(new URL("../skills/kling-ai/references/prompt-examples.md", import.meta.url), "utf8");

  for (const [heading, expected] of [
    ["Suggested prompts", [
      /Kling Image 4\.0.*series of three 8K images in one request/,
      /Kling 4\.0 to generate a 20.*1080p with HDR output/,
      /Kling 4\.0 Flash.*20-second, 720p/,
      /motion library/,
      /reusable Element/
    ]],
    ["推荐提示词", [
      /可灵图片 4\.0 一次生成 3 张 8K 连续组图/,
      /可灵 4\.0 生成一段 20 秒、1080p 的 HDR/,
      /可灵 4\.0 Flash.*首帧.*20 秒、720p/,
      /动作库/,
      /可复用主体/
    ]]
  ]) {
    const section = examples.split(`## ${heading}\n\n`)[1]?.split("\n## ")[0];
    assert.ok(section, `Missing section: ${heading}`);
    const prompts = section.trim().split("\n");
    assert.equal(prompts.length, expected.length);
    for (const [index, prompt] of prompts.entries()) {
      assert.ok(prompt.startsWith("- "));
      assert.match(prompt, expected[index]);
      assert.doesNotMatch(prompt, /最新|latest|V4/i);
    }
  }
});
