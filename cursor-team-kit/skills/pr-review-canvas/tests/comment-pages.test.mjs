import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const skillPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "SKILL.md"
);

function commentCommand() {
  const text = readFileSync(skillPath, "utf8");
  const match = text.match(/^gh api .*\/comments .*$/m);
  assert.ok(match, "skill should fetch pull review comments");
  return match[0];
}

// `gh api --paginate --jq` runs the jq program once per page and prints
// every page. Without --paginate, only the first page is requested.
function fetchComments(pages) {
  const command = commentCommand();
  const expression = command.match(/--jq '([^']*)'/)[1];
  const selected = command.includes("--paginate") ? pages : pages.slice(0, 1);
  const comments = [];
  for (const page of selected) {
    const result = spawnSync("jq", ["-c", expression], {
      input: JSON.stringify(page),
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    for (const line of result.stdout.split("\n")) {
      if (line.trim()) comments.push(JSON.parse(line));
    }
  }
  return comments;
}

test("review comments past the first page are included, and an outdated thread keeps its line", () => {
  const firstPage = [
    { user: { login: "ada" }, body: "first", path: "a.ts", line: 3, original_line: 3 },
  ];
  const secondPage = [
    {
      user: { login: "bea" },
      body: "this line moved",
      path: "b.ts",
      line: null,
      original_line: 44,
    },
  ];
  const comments = fetchComments([firstPage, secondPage]);
  assert.deepEqual(
    comments.map((comment) => [comment.user, comment.path, comment.line, comment.body]),
    [
      ["ada", "a.ts", 3, "first"],
      ["bea", "b.ts", 44, "this line moved"],
    ]
  );
});
