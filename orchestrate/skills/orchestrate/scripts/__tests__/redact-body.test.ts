import { describe, expect, test } from "bun:test";

import { redactBody } from "../core/redact-body.ts";

describe("redactBody", () => {
  test("refuses filepath-shaped bodies", () => {
    const result = redactBody(
      "/workspace/app/src/foo.ts\n/Users/example/repo/package.json\nerror at node_modules/.pnpm/pkg/index.ts"
    );

    expect(result.reasons).toContain("contains /workspace path");
    expect(result.reasons).toContain("contains /Users path");
    expect(result.reasons).toContain("contains .pnpm path");
    expect(result.text).toContain("[redacted-path]");
  });

  test("refuses log dumps", () => {
    const result = redactBody(
      [
        "@example/proto:generate: a",
        "@example/proto:generate: b",
        "@example/proto:generate: c",
        "@example/proto:generate: d",
        "@example/proto:generate: e",
      ].join("\n")
    );

    expect(result.reasons).toContain("looks like a log dump");
  });

  test("refuses oversized bodies", () => {
    const result = redactBody("x".repeat(2_049));

    expect(result.reasons).toContain("exceeds 2048 character limit");
  });

  test("refuses bare SHAs but allows backticked SHAs", () => {
    const sha = "0123456789abcdef0123456789abcdef01234567";

    expect(redactBody(sha).reasons).toContain("contains bare 40-char SHA");
    expect(redactBody(`\`${sha}\``).reasons).toEqual([]);
  });

  test("allows concise operational context", () => {
    const result = redactBody("blocked: docker rate-limit on redis:7");

    expect(result).toEqual({
      text: "blocked: docker rate-limit on redis:7",
      reasons: [],
    });
  });
});
