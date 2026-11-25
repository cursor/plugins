import assert from "node:assert/strict";
import { test } from "node:test";
import { readSany } from "../frontends/spec.ts";

// SANY's XMLExporter wraps comments in CDATA. A comment with TLA+ sequence syntax
// (<<1, 2>>) must stay text: raw < and > there used to desync the tag scanner.
const xml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<modules>
  <RootModule>M</RootModule>
  <context>
    <entry>
      <UID>1</UID>
      <ModuleNode>
        <uniquename>M</uniquename>
        <pre-comments><![CDATA[(* x > y, then <<1, 2>> and a < b. *)]]></pre-comments>
        <OpDeclNodeRef><UID>2</UID></OpDeclNodeRef>
      </ModuleNode>
    </entry>
    <entry>
      <UID>2</UID>
      <OpDeclNode>
        <uniquename>x</uniquename>
        <kind>3</kind>
      </OpDeclNode>
    </entry>
  </context>
</modules>`;

test("readSany keeps CDATA comments out of the markup", () => {
  const sany = readSany(xml);
  assert.deepEqual(sany.variables, ["x"]);
  assert.ok(sany.definitions.has("x"));
});
