import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("open pull request discovery", () => {
  it("keeps a stack parent that is older than the first 300 open PRs", () => {
    const directory = mkdtempSync(join(tmpdir(), "watch-pr-open-pulls-"));
    try {
      // Like gh, the fake returns the newest open PRs first and stops at --limit.
      writeFileSync(
        join(directory, "gh"),
        `#!${process.execPath}
const args = process.argv.slice(2);
const limit = Number(args[args.indexOf("--limit") + 1]);
const rows = [];
for (let number = 400; number > 1; number -= 1)
  rows.push({ number, headRefName: "other-" + number, baseRefName: "main", isCrossRepository: false });
rows[0] = { number: 400, headRefName: "feature", baseRefName: "base-feature", isCrossRepository: false };
rows.push({ number: 1, headRefName: "base-feature", baseRefName: "main", isCrossRepository: false });
console.log(JSON.stringify(rows.slice(0, limit)));
`,
        { mode: 0o755 }
      );
      const program = `import { GhGitHubReader, discoverStack } from ${JSON.stringify(import.meta.dir + "/github.ts")};
        const stack = await discoverStack(new GhGitHubReader(), { owner: "owner", repo: "repo", number: 400 });
        console.log(JSON.stringify(stack.map((item) => item.number)));`;
      const child = spawnSync(process.execPath, ["-e", program], {
        encoding: "utf8",
        timeout: 5000,
        env: { ...process.env, PATH: directory + ":" + process.env.PATH },
      });
      expect(child.error).toBeUndefined();
      expect(child.status).toBe(0);
      expect(JSON.parse(child.stdout)).toEqual([1, 400]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
