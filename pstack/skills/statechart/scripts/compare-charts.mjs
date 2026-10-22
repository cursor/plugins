#!/usr/bin/env node
import fs from "node:fs";
import process from "node:process";
import { FULL_LABELS, LEGEND_ID, compareCharts, parseMermaid } from "./lib.mjs";

const USAGE = "Usage: node compare-charts.mjs EXPECTED.mmd ACTUAL.mmd";
const HELP = `${USAGE}

Compares two Mermaid stateDiagram-v2 charts: reachable states, start states, and labeled
transitions. statechart.mjs from-chart runs it to check that the spec still draws the chart that
the reader agreed to.

EXPECTED is the agreed chart. ACTUAL is what tlc-to-chart.mjs drew from the spec in the customer
view with --highlight 0 --full-labels --flat, without --cover, --fixed-dot, or --against-dot. Each
chart compares as the
machine that its steps reach from its start states. A chart with parallel regions compares as its
combined machine, so a guard that blocks a step in only some combinations of regions shows as a
difference. A "%% when ID, ID" or "%% when not ID, ID" line right after a transition is its guard:
the step happens only while another region is in, or not in, one of those states. The label ends
with the guard's words in [ ], which are not part of the label. A combined state is the region
states joined by " | " in region order, which is what chart-to-tla.mjs's mapping writes. A step that does not change the state is not compared, because
tlc-to-chart.mjs does not draw it. An edge label "a or b" counts as two labels. An unlabeled edge
counts only when no labeled edge joins the same two states, because tlc-to-chart.mjs draws only
the labels.

  -h, --help  Print this help, and exit 0.

Prints each difference and then "N difference(s)", or prints "same". Writes no file.

Exit codes
  0  The charts are the same.
  1  The charts differ.
  2  A bad argument, a chart that it cannot read, or an ACTUAL chart that is not drawn for
     comparison.`;
const more = "Run node compare-charts.mjs --help for the flags.";

const files = [];
for (const a of process.argv.slice(2)) {
  if (a === "-h" || a === "--help") {
    console.log(HELP);
    process.exit(0);
  } else if (a.startsWith("-") || files.length === 2) {
    console.error(`unknown argument ${a}. ${more}`);
    process.exit(2);
  } else files.push(a);
}
if (files.length < 2) {
  console.error(`${USAGE}\n${more}`);
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
const drawn = Object.values(actualRegions).flatMap((r) => r.transitions);

const refusals = [
  [
    (l) => /^\d+(, \d+)*\. /.test(l),
    "an edge label is a numbered path step; draw ACTUAL with --highlight 0",
  ],
];
for (const [bad, why] of refusals) {
  if (drawn.some((t) => bad(t.label))) {
    console.error(`${actualFile}: ${why}`);
    process.exit(2);
  }
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
