import assert from "node:assert/strict";
import { test } from "node:test";
import { readCoverage } from "../frontends/coverage.ts";
import { readMessages } from "../frontends/messages.ts";

const summary = (text: string, code = 2772) =>
  `@!@!@STARTMSG ${code}:0 @!@!@\n${text}\n@!@!@ENDMSG ${code} @!@!@\n`;

for (const newline of ["\n", "\r\n"])
  test(`coverage groups parameter instances and disjuncts by declaration with ${JSON.stringify(newline)} ends`, () => {
    const text = [
      summary("<Move line 4, col 1 to line 4, col 4 of module Lib>: 0:0"),
      summary("<Move line 4, col 1 to line 4, col 4 of module Lib>: 0:2"),
      summary("<Move line 4, col 1 to line 4, col 4 of module Lib (5 3 5 20)>: 0:0"),
      summary("<Move line 4, col 1 to line 4, col 4 of module Other>: 0:0"),
      summary("<Idle line 8, col 1 to line 8, col 4 of module Lib>: 0:1"),
      summary("<Init line 1, col 1 to line 1, col 4 of module Lib>: 0:0", 2773),
    ].join("").replaceAll("\n", newline);
    assert.deepEqual([...readCoverage(readMessages(text)).values()], [
      { name: "Move", module: "Lib", seen: true },
      { name: "Move", module: "Other", seen: false },
      { name: "Idle", module: "Lib", seen: true },
    ]);
  });

test("missing or malformed coverage is not an inventory", () => {
  assert.equal(readCoverage([]).size, 0);
  assert.equal(readCoverage(readMessages(summary("unexpected coverage format"))).size, 0);
});
