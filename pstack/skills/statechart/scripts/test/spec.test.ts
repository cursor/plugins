import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { readSany } from "../frontends/spec.ts";

const here = path.dirname(fileURLToPath(import.meta.url));

test("SANY output with a comment in a CDATA section keeps its definitions", () => {
  const sany = readSany(fs.readFileSync(path.join(here, "cdata", "sany.out"), "utf8"));
  assert.deepEqual(sany.variables, ["x"]);
  assert.deepEqual([...sany.definitions.keys()], ["x", "Init", "Next"]);
});
