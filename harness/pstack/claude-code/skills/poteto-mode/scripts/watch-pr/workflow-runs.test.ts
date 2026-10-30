import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const head = "a".repeat(40);
const run = (
  id: number,
  conclusion: string | null = "success",
  overrides = {},
) => ({
  id,
  workflow_id: 200,
  run_number: id,
  run_attempt: 1,
  event: "pull_request",
  head_repository: { id: 300 },
  head_branch: "feature",
  pull_requests: [{ number: 1, base: { ref: "main", repo: { id: 400 } } }],
  name: "CI",
  head_sha: head,
  status: conclusion === null ? "queued" : "completed",
  conclusion,
  html_url: `https://github.com/example/fixture/actions/runs/${id}`,
  ...overrides,
});
const page = (runs: readonly unknown[], total = runs.length) => ({
  total_count: total,
  workflow_runs: runs,
});
const first = Array.from({ length: 100 }, (_, i) => run(i + 1));
const cases = [
  {
    name: "obsolete cancellation replaced by success",
    pages: [page([run(101), run(100, "cancelled")])],
    code: 0,
  },
  {
    name: "obsolete failure replaced by success",
    pages: [page([run(100, "failure"), run(101)])],
    code: 0,
  },
  {
    name: "current failure",
    pages: [page([run(100), run(101, "failure")])],
    code: 4,
  },
  {
    name: "queued replacement of failed execution",
    pages: [page([run(100, "failure"), run(101, null)])],
    code: 5,
  },
  {
    name: "running replacement",
    pages: [
      page([run(100, "cancelled"), run(101, null, { status: "in_progress" })]),
    ],
    code: 5,
  },
  {
    name: "new execution supersedes older rerun attempt",
    pages: [page([run(100, "failure", { run_attempt: 5 }), run(101)])],
    code: 0,
  },
  {
    name: "latest attempt fails",
    pages: [page([run(100, "failure", { run_attempt: 2 })])],
    code: 4,
  },
  {
    name: "latest attempt succeeds",
    pages: [page([run(100, "success", { run_attempt: 2 })])],
    code: 0,
  },
  {
    name: "latest attempt is queued",
    pages: [page([run(100, null, { run_attempt: 2 })])],
    code: 5,
  },
  {
    name: "workflow run number orders replacements",
    pages: [
      page([
        run(101, "failure", { run_number: 1 }),
        run(100, "success", { run_number: 2 }),
      ]),
    ],
    code: 0,
  },
  {
    name: "push replacement without PR associations",
    pages: [
      page([
        run(100, "failure", { event: "push", pull_requests: [] }),
        run(101, "success", { event: "push", pull_requests: [] }),
      ]),
    ],
    code: 0,
  },
  {
    name: "same name independent workflow",
    pages: [
      page([run(100, "failure"), run(101, "success", { workflow_id: 201 })]),
    ],
    code: 4,
  },
  {
    name: "independent event",
    pages: [
      page([run(100, "failure"), run(101, "success", { event: "push" })]),
    ],
    code: 4,
  },
  {
    name: "independent head repository",
    pages: [
      page([
        run(100, "failure"),
        run(101, "success", { head_repository: { id: 301 } }),
      ]),
    ],
    code: 4,
  },
  {
    name: "independent branch",
    pages: [
      page([
        run(100, "failure"),
        run(101, "success", { head_branch: "other" }),
      ]),
    ],
    code: 4,
  },
  {
    name: "independent PR association",
    pages: [
      page([
        run(100, "failure"),
        run(101, "success", {
          pull_requests: [
            { number: 2, base: { ref: "main", repo: { id: 400 } } },
          ],
        }),
      ]),
    ],
    code: 4,
  },
  {
    name: "independent PR base",
    pages: [
      page([
        run(100, "failure"),
        run(101, "success", {
          pull_requests: [
            { number: 1, base: { ref: "release", repo: { id: 400 } } },
          ],
        }),
      ]),
    ],
    code: 4,
  },
  {
    name: "manual dispatch inputs cannot be reconciled",
    pages: [
      page([
        run(100, "failure", { event: "workflow_dispatch" }),
        run(101, "success", { event: "workflow_dispatch" }),
      ]),
    ],
    code: 4,
  },
  {
    name: "ambiguous multiple PR associations",
    pages: [
      page([
        run(100, "failure", {
          pull_requests: [
            { number: 1, base: { ref: "main", repo: { id: 400 } } },
            { number: 2, base: { ref: "main", repo: { id: 400 } } },
          ],
        }),
        run(101, "success", {
          pull_requests: [
            { number: 1, base: { ref: "main", repo: { id: 400 } } },
            { number: 2, base: { ref: "main", repo: { id: 400 } } },
          ],
        }),
      ]),
    ],
    code: 4,
  },
  {
    name: "repository dispatch inputs cannot be reconciled",
    pages: [
      page([
        run(100, "failure", { event: "repository_dispatch" }),
        run(101, "success", { event: "repository_dispatch" }),
      ]),
    ],
    code: 4,
  },
  {
    name: "unknown PR associations",
    pages: [
      page([
        run(100, "failure", { pull_requests: null }),
        run(101, "success", { pull_requests: null }),
      ]),
    ],
    code: 4,
  },
  {
    name: "unknown head branch",
    pages: [
      page([
        run(100, "failure", { head_branch: null }),
        run(101, "success", { head_branch: null }),
      ]),
    ],
    code: 4,
  },
  {
    name: "current registered failure remains authoritative",
    pages: [page([run(101)])],
    checkState: "FAILURE",
    code: 4,
  },
  {
    name: "complete pagination",
    pages: [page(first, 101), page([run(101)], 101)],
    code: 0,
  },
  {
    name: "maximum complete observation below cap",
    pages: Array.from({ length: 10 }, (_, p) =>
      page(
        Array.from({ length: p === 9 ? 99 : 100 }, (_, i) =>
          run(p * 100 + i + 1),
        ),
        999,
      ),
    ),
    code: 0,
  },
  {
    name: "duplicate attempts cannot prove complete observation",
    pages: [page([run(100), run(100, "failure", { run_attempt: 2 })])],
    code: 7,
  },
  {
    name: "duplicate row cannot satisfy total",
    pages: [page(first, 101), page([run(100)], 101)],
    code: 7,
  },
  {
    name: "increasing total",
    pages: [page(first, 101), page([run(101)], 102)],
    code: 7,
  },
  {
    name: "shrinking total",
    pages: [page(first, 101), page([], 100)],
    code: 7,
  },
  {
    name: "empty page before completion",
    pages: [page(first, 101), page([], 101)],
    code: 7,
  },
  {
    name: "short page before completion",
    pages: [page([run(100)], 2)],
    code: 7,
  },
  {
    name: "rows exceed total",
    pages: [page([run(100), run(101)], 1)],
    code: 7,
  },
  { name: "filtered result at API cap", pages: [page(first, 1000)], code: 7 },
  {
    name: "filtered result above API cap",
    pages: [page(first, 1001)],
    code: 7,
  },
  {
    name: "hostile changing totals are bounded",
    pages: [page(first, 1000000)],
    code: 7,
  },
  {
    name: "missing execution identity",
    pages: [page([run(100, "success", { workflow_id: null })])],
    code: 7,
  },
  { name: "no Actions with external checks", pages: [page([])], code: 0 },
] as const;

describe("effective Actions executions through the source CLI", () => {
  for (const fixture of cases) {
    it(fixture.name, () => {
      const directory = mkdtempSync(join(tmpdir(), "watch-pr-executions-"));
      try {
        const calls = join(directory, "calls.ndjson");
        writeFileSync(join(directory, "fixture.json"), JSON.stringify(fixture));
        writeFileSync(
          join(directory, "gh"),
          `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.CALLS, JSON.stringify(args) + "\\n");
const fixture = JSON.parse(fs.readFileSync(process.env.FIXTURE, "utf8"));
const head = "a".repeat(40);
let value;
if (args[0] === "pr" && args[1] === "view")
  value = { mergeable: "MERGEABLE", mergeStateStatus: "UNSTABLE", reviewDecision: "APPROVED", headRefOid: head, headRefName: "feature", baseRefName: "main", state: "OPEN", mergedAt: null, isDraft: false };
else if (args[0] === "pr" && args[1] === "checks")
  value = [{ name: "CI", state: fixture.checkState || "SUCCESS", bucket: fixture.checkState ? "fail" : "pass", description: "", link: "", workflow: "CI" }];
else if (args.includes("graphql")) {
  const query = args.find(arg => arg.startsWith("query="));
  const pullRequest = query.includes("ReviewThreads")
    ? { reviewThreads: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } } }
    : { commits: { nodes: [{ commit: { oid: head, statusCheckRollup: { state: "SUCCESS" } } }] } };
  value = { data: { repository: { pullRequest } } };
} else if (args.some(arg => arg.includes("/actions/runs"))) {
  const page = Number(args.find(arg => arg.startsWith("page=")).slice(5));
  value = fixture.pages[page - 1] || fixture.pages[fixture.pages.length - 1];
} else process.exit(2);
console.log(JSON.stringify(value));
`,
        );
        chmodSync(join(directory, "gh"), 0o755);
        const result = spawnSync(
          process.execPath,
          [
            join(import.meta.dir, "watch-pr"),
            "--owner",
            "example",
            "--repo",
            "fixture",
            "--pr",
            "1",
            "--timeout",
            ".01",
            "--interval",
            ".001",
            "--max-query-errors",
            "1",
          ],
          {
            encoding: "utf8",
            timeout: 10000,
            env: {
              ...process.env,
              PATH: `${directory}:${process.env.PATH}`,
              CALLS: calls,
              FIXTURE: join(directory, "fixture.json"),
            },
          },
        );
        expect(result.error).toBeUndefined();
        expect(result.status).toBe(fixture.code);
        const events = result.stdout
          .trim()
          .split("\n")
          .map((line) => JSON.parse(line));
        expect(events.at(-1).kind).toBe(
          fixture.code === 0
            ? "READY"
            : fixture.code === 5
              ? "TIMEOUT"
              : "BLOCKER",
        );
        if (fixture.code !== 0)
          expect(events.some((event) => event.kind === "READY")).toBe(false);
        if (fixture.code === 5) expect(events[0].kind).toBe("WAITING");
        const queries: string[][] = readFileSync(calls, "utf8")
          .trim()
          .split("\n")
          .map((line) => JSON.parse(line));
        const actions = queries.filter((args) =>
          args.some((arg) => arg.includes("/actions/runs")),
        );
        expect(actions.every((args) => args.includes(`head_sha=${head}`))).toBe(
          true,
        );
        expect(actions.length).toBeGreaterThan(0);
        expect(actions.length).toBeLessThanOrEqual(10);
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    });
  }
});
