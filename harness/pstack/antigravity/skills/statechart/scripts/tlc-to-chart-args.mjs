import process from "node:process";

export const args = {
  traces: [],
  fixedTraces: [],
  againstTraces: [],
  fixedRules: [],
  againstRules: [],
  specs: [],
  next: [],
  view: "customer",
  highlight: 1,
};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  const next = () => process.argv[++i];
  if (a === "--dot") args.dot = next();
  else if (a === "--map") args.map = next();
  else if (a === "--traces") args.traces.push(next());
  else if (a === "--broken") args.broken = next();
  else if (a === "--fixed-dot") args.fixedDot = next();
  else if (a === "--fixed-traces") args.fixedTraces.push(next());
  else if (a === "--fixed-rules") args.fixedRules.push(...next().split(","));
  else if (a === "--fixed-broken") args.fixedBroken = next();
  else if (a === "--against-dot") args.againstDot = next();
  else if (a === "--against-traces") args.againstTraces.push(next());
  else if (a === "--against-broken") args.againstBroken = next();
  else if (a === "--against-rules") args.againstRules.push(...next().split(","));
  else if (a === "--listed") args.listed = next();
  else if (a === "--label") args.label = next();
  else if (a === "--spec") args.specs.push(next());
  else if (a === "--next") args.next.push(next());
  else if (a === "--view") args.view = next();
  else if (a === "--highlight") args.highlight = Number(next());
  else if (a === "--path-only") args.pathOnly = true;
  else if (a === "--full-labels") args.fullLabels = true;
  else if (a === "--flat") args.flat = true;
  else if (a === "--loops") args.loops = true;
  else if (a === "--regions") args.regions = true;
  else if (a === "--proof") args.proof = next();
  else if (a === "--regions-all") args.regionsAll = next();
  else if (a === "--cover") args.cover = true;
  else if (a === "--title") args.title = next();
  else if (a === "--out") args.out = next();
  else if (a === "--story") args.story = next();
  else if (a === "--summary") args.summary = next();
  else {
    console.error(`unknown argument ${a}.`);
    process.exit(2);
  }
}
if (args.listed !== undefined) args.listed = JSON.parse(args.listed);
