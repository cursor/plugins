#!/usr/bin/env node
import fs from "node:fs";
import process from "node:process";
import { FULL_LABELS, LEGEND_ID, compareCharts, parseMermaid } from "./lib.mjs";

const USAGE = "Usage: node compare-charts.mjs EXPECTED.mmd ACTUAL.mmd";

const files = [];
for (const a of process.argv.slice(2)) {
  if (a.startsWith("-") || files.length === 2) {
    console.error(`unknown argument ${a}.`);
    process.exit(2);
  } else files.push(a);
}
if (files.length < 2) {
  console.error(USAGE);
  process.exit(2);
}
const [expectedFile, actualFile] = files;

const orExit = (file, f) => {
  try {
    return f();
  } catch (e) {
    console.error(`${file}: ${e.message}`);
    process.exit(2);
  }
};
const [expectedText, actualText] = files.map((f) => orExit(f, () => fs.readFileSync(f, "utf8")));
const has = (re) => re.test(actualText);
const textRefusals = [
  [
    has(/^\s*%% second model/m),
    "it has a second model; draw ACTUAL without --fixed-dot or --against-dot",
  ],
  [
    has(new RegExp(`^\\s*state\\s+"[^"]*"\\s+as\\s+(?!${LEGEND_ID}\\b)\\w+\\s*\\{`, "m")),
    "it has boxes; draw ACTUAL with --flat",
  ],
  [
    has(new RegExp(`^\\s*state\\s+"[^"]*"\\s+as\\s+${LEGEND_ID}\\s*\\{`, "m")) &&
      !actualText.includes(FULL_LABELS),
    "edge labels write shared words once; draw ACTUAL with --full-labels",
  ],
];
for (const [bad, why] of textRefusals) {
  if (bad) {
    console.error(`${actualFile}: ${why}`);
    process.exit(2);
  }
}
const expectedRegions = orExit(expectedFile, () => parseMermaid(expectedText).regions);
const actualRegions = orExit(actualFile, () => parseMermaid(actualText).regions);
const numbered = Object.values(actualRegions)
  .flatMap((r) => r.transitions)
  .some((t) => /^\d+(, \d+)*\. /.test(t.label));
if (numbered) {
  console.error(
    `${actualFile}: an edge label is a numbered path step; draw ACTUAL with --highlight 0`,
  );
  process.exit(2);
}

const rows = compareCharts(expectedRegions, actualRegions);
let differences = 0;
for (const [title, xs] of rows) {
  console.log(`${title}:`);
  for (const x of xs) console.log(`  ${x}`);
  differences += xs.length;
}
console.log(differences === 0 ? "same" : `${differences} difference(s)`);
process.exit(differences === 0 ? 0 : 1);
