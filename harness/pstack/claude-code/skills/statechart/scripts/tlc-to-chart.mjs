#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import {
  FULL_LABELS,
  GROUP_PALETTE,
  LEGEND_ID,
  PLAIN_FILL,
  compareCharts,
  escapeMermaidQuotes,
  groupClassDef,
  groupColorProblem,
  isRecord,
  joinAnd,
  joinLabels,
  parseDot,
  parseMermaid,
  parseTraces,
  productOf,
  ruleSentences,
  stateKey,
  tlcOutputWarning,
  wrap,
  STATUS_CLASSES,
} from "./lib.mjs";

const USAGE = "Usage: node tlc-to-chart.mjs --dot FILE --map FILE [options]";
const HELP = `${USAGE}

Collapses a TLC state graph onto the reader's states and writes a Mermaid stateDiagram-v2.
statechart.mjs runs it once for the overview and once for each bug chart.

  --dot FILE             The state graph from TLC -dump dot,actionlabels FILE, for the current code.
                         Required.
  --map FILE             The mapping module. Required. It exports state(vars, facts), and
                         optionally detail(vars, facts), step(action, before, after),
                         guard(action, before, after), timer(action, before, after),
                         cause(vars, facts, invariant), group(vars, facts), groupColors,
                         regionNames, readerActions, and legend. guard is when the step
                         can happen, in plain words. An edge reads "step [words]" when every
                         model step behind it has words. timer is how many seconds the code waits
                         before a timer step, and the step reads "after N s, step".
                         cause is the hidden reason a bad state is bad: counterexamples with the
                         same invariant and cause are one bug. When cause returns nothing, the
                         end state stands in for it. readerActions are the actions the
                         reader takes. group is the group of a state, below. legend, such as
                         { works: "Works on main" }, gives the legend's words for the works,
                         wrong, and fixed statuses.
                         facts.enabled is the set of actions the state enables. facts.settled is
                         true when only reader actions are enabled, so nothing else happens until
                         the reader acts.
  --traces FILE          TLC output that holds counterexamples. Repeat it. TLC -continue gives one
                         per bad state. It refuses a file from a TLC run that stopped early or hit
                         an error other than a broken rule. When TLC found a rule broken and then
                         failed with a Java exception, it keeps the paths that TLC printed and
                         warns that the chart can miss states that break the rule.
  --fixed-dot FILE       The state graph of the model with the open fix. Each bug's steps replay
                         on it.
  --fixed-traces FILE    TLC output for the same invariants on the fixed model. Repeat it. It marks
                         states fixed or still wrong, and adds the bugs that only the fixed model
                         has after the current model's bugs.
  --fixed-rules LIST     The invariants that the fixed model's TLC runs check, as in A,B. It goes
                         with --fixed-traces. A rule that the fixed model does not check stays
                         as wrong as it is today, and its stories say "not checked".
  --against-dot FILE     The state graph of the spec that the current code must follow.
                         Each bug's steps replay on it. Do not use it with --fixed-dot.
  --against-traces FILE  TLC output for the spec. Repeat it. Its bugs are drawn wrong, and the
                         bugs that only the spec has number after the code's bugs.
  --against-rules LIST   The invariants that the spec's TLC runs check. It goes with
                         --against-traces. Stories of a rule that the spec does not check say
                         "not checked".
  --listed JSON          What the spec's configs expect, as in
                         {"spec":"Spec.tla","breaks":{"A.cfg":"Rule"}}: each config whose
                         "\\* expect:" line names a rule, and that rule. It goes with
                         --against-dot. Each story then says whether a config of the spec already
                         expects TLC to break its rule, and summary.json has second.listed and
                         each bug's listed configs.
  --label TEXT           The name of the second model in the chart and the stories. Default:
                         "the fix" with --fixed-dot, "the spec" with --against-dot.
  --spec FILE            A TLA+ file whose \\* comment lines above a rule are the rule's sentence in
                         the stories. Repeat it. The first file that has a sentence wins.
  --view NAME            customer (state labels, the default), developer (detail labels), or
                         layered (detail inside state).
  --cover                Keep only the shortest path to each settled reader state, plus the
                         counterexample paths.
  --highlight N          Draw bug N as a numbered path. Default 1. 0 draws none.
  --path-only            Draw only the highlighted path.
  --full-labels          Write each label on an edge in full, joined by " or ", and mark the chart
                         "${FULL_LABELS}". Default: write the leading words that the labels
                         share once, as in "you tap Pay or Back".
  --flat                 Draw every state on its own, with no boxes.
  --regions              When every state reads "context: progress", draw two parallel regions,
                         context and progress, when they are smaller and proved. They draw the
                         steps of the shortest way to each region state, of each bug path, and
                         the nearest step with each label.
                         Otherwise draw the chart the other flags ask for, and print why.
                         Customer view, --highlight 0, no --flat or --path-only.
  --proof FILE           With --regions, write the flat chart that the proof compares with.
  --regions-all FILE     With --regions, also write the regions with every step.
  --title TEXT           The chart title.
  --out FILE             The Mermaid chart. Default: stdout.
  --story FILE           The reader stories, one per bug. Each shows the fewest reader steps among
                         retained counterexamples, with model steps breaking ties. This need not
                         be the shortest reader path in the graph.
  --summary FILE         The counts for the chart and the bugs, as JSON. The counterexamples field
                         counts retained traces in each bug group, not graph routes.
  -h, --help             Print this help, and exit 0.

Each bug replays on the second model by its screens and step words, which are what the reader
sees. The replay takes the second model's steps that keep the screen and that the reader does not
take. A bug step that the reader does not see must keep the screen on the second model too, unless
the second model cannot take it. The replay stops at the first step that the second model shows
the reader differently. There the chart draws "with LABEL, STEP" (or "in LABEL, STEP" for
--against-dot) to where the second model goes, or a loop "... STEP cannot happen" when it cannot
take a step that the reader sees.

The second model may have other variables and actions than the current model. Variables and
record fields that one start state has and the other does not are left out when the two models
are compared. One mapping draws both models, so it may read only what both have. The command
stops when the mapping reads a variable or field of the current model on a state of the second
model that lacks it. Test "name" in v first to label such a state another way. A step of an
action that the second model does not have is skipped when it changes no shared variable, and
matches any step to the same shared state when it does.

In the customer view, states whose labels read "context: progress" with the same context sit in
one box named context, and each shows only its progress. A context with one state stays a plain
state. An arrow from a box's border stands for the same step from every state in the box: it is
drawn only when every state in the box takes that step, with the same labels, to the same state.
The layered view puts each detail state in a box named by its state label.

With --regions, each "context: progress" label is one state in the context region and one in the
progress region. A step that happens beside only some states of the other region gets a guard:
"[when A or B]" or "[unless A or B]", whichever is shorter, and a "%% when [not] ids" line under it.
The mapping's guard words, when the step has them, replace "when A or B" in the label.
The proof combines the regions with every step as compare-charts.mjs does, and needs exactly the
flat chart's states, start states, and labeled steps. Each state's color must be the worse color
of its two region states. Then the drawn arrows, combined, must make only steps of the flat chart:
a step that they make wrongly gets back every arrow that the full regions take there.
compare-charts.mjs on the --regions-all and --proof files repeats the first proof.
mapping.regionNames = [context, progress] names the two regions.

Outside regions, two states have at most one arrow. Its lines are the numbered steps, then the
current model's steps, then the second model's steps, with a blank line between each group.

Without group(), the legend shows only the statuses the chart uses. A chart with a second model
has the line "%% second model (fix|against): LABEL" right after stateDiagram-v2. Each chart
starts with front matter that keeps Mermaid from shrinking it to the page or rewrapping its labels.

Groups: group(vars, facts) returns the name of the group that a model state is in, such as
"Toast shown", or nothing. A chart state is in a group when all its model states are in it. A
region state is in a group when every state that it is part of is in it. Each group fills its
states with one color, and the legend lists only the groups that the chart draws: first the
groups in groupColors, in that order, then the others from A to Z. groupColors, such as
{ "Toast shown": "#d6eaf8" }, gives a group a light "#rgb" or "#rrggbb" color. A group with no
color, or null, takes the next free palette color: light blue, orange, purple, yellow, teal, tan,
then pink. A state in no group, or in more than one, is gray. summary.json counts the drawn
states of each group in chartGroups, and lists the chart states with more than one in mixedGroups.
TLC decides the status, and a group cannot change it. On top of the group color, a state that
breaks a rule has a thick red border, and a fixed state or a state only in the second model a
thick green border. The legend then shows that border. A thick blue border marks the bug path on
states that work. On other states of the path, the numbered arrows show it. A group cannot have
the name of a status, such as "Breaks a rule".

Writes only the files that --out, --story, and --summary name.

Exit codes
  0  It wrote the chart.
  1  It cannot use an input: a mapping without state(), a mapping that reads what the second
     model lacks, TLC output that it refuses, or a --highlight with no such bug. The error says
     why.
  2  A bad argument.`;
const more = "Run node tlc-to-chart.mjs --help for the flags.";

const args = {
  traces: [],
  fixedTraces: [],
  againstTraces: [],
  fixedRules: [],
  againstRules: [],
  specs: [],
  view: "customer",
  highlight: 1,
};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  const next = () => process.argv[++i];
  if (a === "-h" || a === "--help") {
    console.log(HELP);
    process.exit(0);
  } else if (a === "--dot") args.dot = next();
  else if (a === "--map") args.map = next();
  else if (a === "--traces") args.traces.push(next());
  else if (a === "--fixed-dot") args.fixedDot = next();
  else if (a === "--fixed-traces") args.fixedTraces.push(next());
  else if (a === "--fixed-rules") args.fixedRules.push(...next().split(","));
  else if (a === "--against-dot") args.againstDot = next();
  else if (a === "--against-traces") args.againstTraces.push(next());
  else if (a === "--against-rules") args.againstRules.push(...next().split(","));
  else if (a === "--listed") args.listed = next();
  else if (a === "--label") args.label = next();
  else if (a === "--spec") args.specs.push(next());
  else if (a === "--view") args.view = next();
  else if (a === "--highlight") args.highlight = Number(next());
  else if (a === "--path-only") args.pathOnly = true;
  else if (a === "--full-labels") args.fullLabels = true;
  else if (a === "--flat") args.flat = true;
  else if (a === "--regions") args.regions = true;
  else if (a === "--proof") args.proof = next();
  else if (a === "--regions-all") args.regionsAll = next();
  else if (a === "--cover") args.cover = true;
  else if (a === "--title") args.title = next();
  else if (a === "--out") args.out = next();
  else if (a === "--story") args.story = next();
  else if (a === "--summary") args.summary = next();
  else {
    console.error(`unknown argument ${a}. ${more}`);
    process.exit(2);
  }
}
const fail = (message) => {
  console.error(`${message} ${more}`);
  process.exit(2);
};
if (!args.dot || !args.map) fail(USAGE);
if (!["customer", "developer", "layered"].includes(args.view))
  fail(`--view must be customer, developer, or layered, not ${args.view}.`);
if (args.fixedDot && args.againstDot) fail("use --fixed-dot or --against-dot, not both.");
if (args.fixedTraces.length && !args.fixedDot) fail("--fixed-traces needs --fixed-dot.");
if (args.againstTraces.length && !args.againstDot) fail("--against-traces needs --against-dot.");
if (!args.fixedTraces.length !== !args.fixedRules.length)
  fail("--fixed-traces and --fixed-rules go together. The rules are what those TLC runs check.");
if (!args.againstTraces.length !== !args.againstRules.length)
  fail(
    "--against-traces and --against-rules go together. The rules are what those TLC runs check.",
  );
if (args.listed !== undefined) {
  if (!args.againstDot)
    fail("--listed says what the spec's configs expect; it needs --against-dot.");
  const shape = `--listed must be JSON such as {"spec":"Spec.tla","breaks":{"A.cfg":"Rule"}}`;
  try {
    args.listed = JSON.parse(args.listed);
  } catch (e) {
    fail(`${shape}: ${e.message}.`);
  }
  const { spec, breaks } = isRecord(args.listed) ? args.listed : {};
  if (
    typeof spec !== "string" ||
    !isRecord(breaks) ||
    Object.values(breaks).some((r) => typeof r !== "string")
  )
    fail(`${shape}.`);
}
if (args.label !== undefined && !args.fixedDot && !args.againstDot)
  fail("--label names the second model; it needs --fixed-dot or --against-dot.");
if (args.proof && !args.regions) fail("--proof writes the regions proof; it needs --regions.");
if (args.regionsAll && !args.regions)
  fail("--regions-all writes every regions arrow; it needs --regions.");
if (
  args.regions &&
  (args.view !== "customer" || args.flat || args.pathOnly || args.highlight !== 0)
)
  fail(
    "--regions draws the whole customer chart: use --highlight 0, without --flat or --path-only.",
  );

const role = args.fixedDot ? "fix" : args.againstDot ? "against" : null;
const L = args.label ?? (role === "fix" ? "the fix" : "the spec");
const within = role === "fix" ? "with" : "in";
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const mapping = await import(pathToFileURL(path.resolve(args.map)).href);
if (typeof mapping.state !== "function")
  throw new Error("the mapping module must export state(vars)");
if (args.view !== "customer" && typeof mapping.detail !== "function")
  throw new Error(`--view ${args.view} needs detail(vars) in the mapping module`);
const SEP = "\u0000";
const edgeId = (from, to) => `${from}${SEP}${SEP}${to}`;

const rules = new Map();
for (const f of args.specs)
  for (const [name, sentence] of ruleSentences(fs.readFileSync(f, "utf8")))
    if (!rules.has(name)) rules.set(name, sentence);

const readerActions = new Set(mapping.readerActions ?? []);
const factsFrom = (enabled) => ({
  enabled,
  settled: [...enabled].every((a) => readerActions.has(a)),
});
function keyOf(vars, facts) {
  if (args.view === "developer") return String(mapping.detail(vars, facts));
  const outer = mapping.state(vars, facts);
  if (typeof outer !== "string")
    throw new Error(`state() must return a string; got ${JSON.stringify(outer)}`);
  return args.view === "layered" ? `${outer}${SEP}${mapping.detail(vars, facts)}` : outer;
}
function stepLabel(action, before, after, view = args.view) {
  const said = typeof mapping.step === "function" ? mapping.step(action, before, after) : action;
  const named = view === "customer" || said === action ? said : `${said} [${action}]`;
  const seconds = typeof mapping.timer === "function" ? mapping.timer(action, before, after) : null;
  if (seconds === undefined || seconds === null || seconds === "" || !named) return named;
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0)
    throw new Error(
      `timer() must return a number of seconds above 0, or nothing; got ${JSON.stringify(seconds)} for ${action}`,
    );
  return `after ${seconds} s, ${named}`;
}
function stepGuard(action, before, after) {
  if (typeof mapping.guard !== "function") return "";
  return String(mapping.guard(action, before, after) ?? "")
    .replace(/[[\]]/g, "")
    .trim();
}
function guarded(guards, label) {
  const words = guards?.get(label);
  return words && !words.has("") ? `${label} [${[...words].sort().join(" or ")}]` : label;
}
const addGuard = (guards, label, words) => {
  if (!guards.has(label)) guards.set(label, new Set());
  guards.get(label).add(words);
};

function lacking(a, b, prefix = []) {
  return Object.keys(a).flatMap((k) =>
    !(k in b)
      ? [[...prefix, k]]
      : isRecord(a[k]) && isRecord(b[k])
        ? lacking(a[k], b[k], [...prefix, k])
        : [],
  );
}
const holder = (o, p) => p.slice(0, -1).reduce((x, k) => (isRecord(x?.[k]) ? x[k] : null), o);
function omit(vars, paths) {
  if (!paths.length) return vars;
  const out = structuredClone(vars);
  for (const p of paths) {
    const o = holder(out, p);
    if (o) delete o[p.at(-1)];
  }
  return out;
}
function guard(vars, paths, at = "v") {
  if (!paths.length || !isRecord(vars)) return vars;
  const missing = new Set();
  const deeper = new Map();
  for (const [k, ...rest] of paths)
    if (!rest.length) missing.add(k);
    else deeper.set(k, [...(deeper.get(k) ?? []), rest]);
  return new Proxy(vars, {
    get(target, k) {
      if (missing.has(k) && !(k in target)) {
        const name = `${at}.${k}`.slice(2);
        throw new Error(
          `${L} has no ${name}, and the mapping reads ${at}.${k} on its states. Label states and steps only from what both models have, or test "${k}" in ${at} first.`,
        );
      }
      return deeper.has(k) ? guard(target[k], deeper.get(k), `${at}.${k}`) : target[k];
    },
  });
}

function modelOf(graph) {
  const byId = new Map([...graph.nodes.keys()].map((id) => [id, new Set()]));
  for (const e of [...graph.edges, ...graph.loops]) byId.get(e.from).add(e.action);
  const index = new Map([...graph.nodes.values()].map((n) => [stateKey(n.vars), byId.get(n.id)]));
  const facts = (vars) => factsFrom(index.get(stateKey(vars)) ?? new Set());
  return {
    graph,
    facts,
    key: (vars) => keyOf(vars, facts(vars)),
    customer: (vars) => String(mapping.state(vars, facts(vars))),
  };
}

function quotient(m) {
  const { graph } = m;
  const keys = new Map();
  for (const n of graph.nodes.values()) keys.set(n.id, m.key(n.vars));
  const nodes = new Set(keys.values());
  const initial = new Set(
    [...graph.nodes.values()].filter((n) => n.init).map((n) => keys.get(n.id)),
  );
  const edges = new Map();
  for (const e of graph.edges) {
    const from = keys.get(e.from);
    const to = keys.get(e.to);
    if (from === to) continue;
    const id = edgeId(from, to);
    if (!edges.has(id)) edges.set(id, { from, to, counts: new Map(), guards: new Map() });
    const [before, after] = [graph.nodes.get(e.from).vars, graph.nodes.get(e.to).vars];
    const label = stepLabel(e.action, before, after);
    if (!label) continue;
    edges.get(id).counts.set(label, (edges.get(id).counts.get(label) ?? 0) + 1);
    addGuard(edges.get(id).guards, label, stepGuard(e.action, before, after));
  }
  for (const e of edges.values())
    e.labels = new Set([...e.counts].sort((a, b) => b[1] - a[1]).map(([l]) => l));
  const settled = new Set(
    [...graph.nodes.values()].filter((n) => m.facts(n.vars).settled).map((n) => keys.get(n.id)),
  );
  return { nodes, initial, edges, keys, settled };
}

const graph = parseDot(fs.readFileSync(args.dot, "utf8"));
const main = modelOf(graph);
const now = quotient(main);
const mainInit = [...graph.nodes.values()].find((n) => n.init).vars;

const secondDot = args.fixedDot ?? args.againstDot;
const secondGraph = secondDot ? parseDot(fs.readFileSync(secondDot, "utf8")) : null;
const secondInit = secondGraph && [...secondGraph.nodes.values()].find((n) => n.init).vars;
const lacks = secondGraph ? lacking(mainInit, secondInit) : [];
const extra = secondGraph ? lacking(secondInit, mainInit) : [];
const second =
  secondGraph &&
  modelOf({
    ...secondGraph,
    nodes: new Map(
      [...secondGraph.nodes].map(([id, n]) => [
        id,
        { ...n, raw: n.vars, vars: guard(n.vars, lacks) },
      ]),
    ),
  });
const secondQ = second && quotient(second);

function readerPath(trace, key, labelOf = stepLabel) {
  const out = [{ key: key(trace.steps[0].vars), label: null, modelStep: 0 }];
  for (let i = 1; i < trace.steps.length; i++) {
    const { action } = trace.steps[i];
    const k = key(trace.steps[i].vars);
    if (k === out[out.length - 1].key && !readerActions.has(action)) continue;
    const [before, after] = [trace.steps[i - 1].vars, trace.steps[i].vars];
    const label = labelOf(action, before, after) || action;
    const guard = stepGuard(action, before, after);
    out.push({ key: k, label, guard, action, modelStep: i });
  }
  return out;
}

const readerLabel = (action, before, after) => stepLabel(action, before, after, "customer");
function replaySecond(trace) {
  if (!second) return null;
  const shared = (vars) => stateKey(omit(vars, lacks));
  const sharedOf = (n) => stateKey(omit(n.raw, extra));
  const out = new Map();
  for (const e of [...second.graph.edges, ...second.graph.loops]) {
    if (!out.has(e.from)) out.set(e.from, []);
    out.get(e.from).push(e);
  }
  const actions = new Set([...second.graph.edges, ...second.graph.loops].map((e) => e.action));
  const nodeOf = (id) => second.graph.nodes.get(id);
  const screen = new Map(
    [...second.graph.nodes.values()].map((n) => [n.id, second.customer(n.vars)]),
  );
  const words = (e) => readerLabel(e.action, nodeOf(e.from).vars, nodeOf(e.to).vars) || e.action;
  const settle = (ids) => {
    const all = new Set(ids);
    for (const id of all)
      for (const e of out.get(id) ?? [])
        if (!readerActions.has(e.action) && screen.get(e.to) === screen.get(id)) all.add(e.to);
    return all;
  };
  const seen = readerPath(trace, main.customer, readerLabel);
  const shownAt = new Map(seen.map((p, j) => [p.modelStep, j]));
  let here = settle(
    [...second.graph.nodes.values()]
      .filter((n) => n.init && screen.get(n.id) === seen[0].key)
      .map((n) => n.id),
  );
  if (here.size === 0) return { reason: "starts on another screen" };
  const passed = new Set(here);
  let j = 0;
  for (let i = 1; i < trace.steps.length; i++) {
    const { action } = trace.steps[i];
    const hidden = !shownAt.has(i);
    if (!hidden) j = shownAt.get(i);
    const want = seen[j];
    const [before, after] = [trace.steps[i - 1].vars, trace.steps[i].vars];
    const known = actions.has(action);
    if (!known && (hidden || shared(before) === shared(after))) continue;
    const tries = [...here].flatMap((id) =>
      (out.get(id) ?? []).filter((e) =>
        known ? e.action === action : sharedOf(nodeOf(e.to)) === shared(after),
      ),
    );
    if (hidden && tries.length === 0) continue;
    const same = known
      ? tries.filter((e) => screen.get(e.to) === want.key && (hidden || words(e) === want.label))
      : tries;
    if (same.length) {
      here = settle(same.map((e) => e.to));
      for (const id of here) passed.add(id);
      continue;
    }
    const outcomes = new Map();
    for (const e of tries) {
      const id = `${screen.get(e.to)}${SEP}${words(e)}`;
      outcomes.set(id, [...(outcomes.get(id) ?? []), e]);
    }
    const taken = [...outcomes.values()].sort((a, b) => b.length - a.length)[0]?.[0];
    const from = main.key(before);
    const said = hidden ? readerLabel(action, before, after) || action : want.label;
    const at = { step: j, said, from, hidden };
    if (!taken)
      return {
        ...at,
        key: from,
        label: stepLabel(action, before, after) || action,
        disabled: true,
      };
    const [b, a] = [nodeOf(taken.from).vars, nodeOf(taken.to).vars];
    return { ...at, key: second.key(a), label: stepLabel(taken.action, b, a) || taken.action };
  }
  const bad = new Set(
    rawSecondTraces
      .filter((t) => t.invariant === trace.invariant)
      .map((t) => stateKey(t.steps[t.steps.length - 1].vars)),
  );
  const checked = secondRules.has(trace.invariant);
  const ruleHolds = checked && ![...passed].some((id) => bad.has(stateKey(nodeOf(id).vars)));
  return { sameEnd: true, checked, ruleHolds };
}

function readTraces(files, paths = []) {
  return files.flatMap((f) => {
    const text = fs.readFileSync(f, "utf8");
    const warning = tlcOutputWarning(text, f);
    if (warning) console.error(`${f}: ${warning}`);
    return parseTraces(text).map((t) => ({
      ...t,
      steps: t.steps.map((s) => ({ ...s, vars: guard(s.vars, paths) })),
    }));
  });
}
function firstBad(raw) {
  const badStates = new Map();
  for (const t of raw) {
    if (!badStates.has(t.invariant)) badStates.set(t.invariant, new Set());
    badStates.get(t.invariant).add(stateKey(t.steps[t.steps.length - 1].vars));
  }
  const cuts = [];
  const seen = new Set();
  for (const t of raw) {
    const first = t.steps.findIndex((s) => badStates.get(t.invariant).has(stateKey(s.vars)));
    const cut = { invariant: t.invariant, steps: t.steps.slice(0, first + 1) };
    const id = `${t.invariant}${SEP}${stateKey(cut.steps[cut.steps.length - 1].vars)}`;
    if (seen.has(id)) continue;
    seen.add(id);
    cuts.push(cut);
  }
  return cuts;
}
const rawTraces = readTraces(args.traces);
const secondTraceFiles = role === "fix" ? args.fixedTraces : args.againstTraces;
const secondRules = new Set(role === "fix" ? args.fixedRules : args.againstRules);
const rawSecondTraces = readTraces(secondTraceFiles, lacks);
const traces = firstBad(rawTraces);
const secondTraces = firstBad(rawSecondTraces);
function group(cuts, m) {
  const byId = new Map();
  for (const trace of cuts) {
    const rp = readerPath(trace, m.customer);
    const last = trace.steps[trace.steps.length - 1].vars;
    const said =
      typeof mapping.cause === "function"
        ? mapping.cause(last, m.facts(last), trace.invariant)
        : null;
    const cause = said === undefined || said === null ? null : String(said);
    const id = `${trace.invariant}${SEP}${cause ?? rp[rp.length - 1].key}`;
    const prev = byId.get(id);
    if (
      !prev ||
      rp.length < prev.steps ||
      (rp.length === prev.steps && trace.steps.length < prev.trace.steps.length)
    ) {
      byId.set(id, {
        id,
        cause,
        steps: rp.length,
        trace,
        invariant: trace.invariant,
        count: (prev?.count ?? 0) + 1,
      });
    } else prev.count++;
  }
  return byId;
}
const byOrder = (a, b) =>
  a.steps - b.steps ||
  a.trace.steps.length - b.trace.steps.length ||
  (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const inSecond = (l) => `${within} ${L}, ${l}`;
const modelEdges = new Map(now.edges);
if (secondQ)
  for (const [id, e] of secondQ.edges)
    if (!modelEdges.has(id))
      modelEdges.set(id, {
        ...e,
        labels: new Set([...e.labels].map(inSecond)),
        guards: new Map([...e.guards].map(([l, words]) => [inSecond(l), words])),
        secondOnly: true,
      });
function divergence(s) {
  if (s?.key === undefined) return s;
  const plain = edgeId(s.from, s.key);
  const text = inSecond(`${s.label}${s.disabled ? " cannot happen" : ""}`);
  const drawn = !s.disabled && [s.label, text].some((l) => modelEdges.get(plain)?.labels.has(l));
  return { ...s, text, edge: drawn ? plain : `${plain}${SEP}second` };
}
const withPath = (c, m) => {
  const path = readerPath(c.trace, m.key);
  return { ...c, path, end: path[path.length - 1].key };
};
const classesById = group(traces, main);
const mainClasses = [...classesById.values()]
  .sort(byOrder)
  .map((c) => ({ ...withPath(c, main), second: divergence(replaySecond(c.trace)) }));
const introduced = second
  ? [...group(secondTraces, second).values()]
      .filter((c) => !classesById.has(c.id))
      .sort(byOrder)
      .map((c) => ({ ...withPath(c, second), second: null, introduced: true }))
  : [];
const classes = [...mainClasses, ...introduced];

const diverges = (c) => c.second?.key !== undefined;
function badKeys(m, keys, raw) {
  const g = m.graph;
  const bad = new Set(raw.map((t) => stateKey(t.steps[t.steps.length - 1].vars)));
  const out = new Set(raw.map((t) => m.key(t.steps[t.steps.length - 1].vars)));
  const ok = (id) => !bad.has(stateKey(g.nodes.get(id).vars));
  const next = new Map();
  for (const e of g.edges) {
    if (!next.has(e.from)) next.set(e.from, []);
    next.get(e.from).push(e.to);
  }
  const clean = new Set([...g.nodes.values()].filter((n) => n.init && ok(n.id)).map((n) => n.id));
  const queue = [...clean];
  while (queue.length) {
    for (const to of next.get(queue.shift()) ?? []) {
      if (clean.has(to) || !ok(to)) continue;
      clean.add(to);
      queue.push(to);
    }
  }
  const reached = new Set([...clean].map((id) => keys.get(id)));
  for (const k of keys.values()) if (!reached.has(k)) out.add(k);
  return out;
}
const badNow = badKeys(main, now.keys, rawTraces);
const uncheckedTraces = rawTraces.filter((t) => !secondRules.has(t.invariant));
const badSecond = second
  ? new Set([
      ...badKeys(second, secondQ.keys, rawSecondTraces),
      ...(role === "fix" ? badKeys(main, now.keys, uncheckedTraces) : []),
    ])
  : new Set();
const allNodes = new Set([...now.nodes, ...(secondQ?.nodes ?? [])]);
const initial = new Set([...now.initial, ...(secondQ?.initial ?? [])]);
const onlySecond = (k) => second && !now.nodes.has(k);
const status = (k) => {
  if (role === "against")
    return badNow.has(k) || badSecond.has(k) ? "wrong" : onlySecond(k) ? "fixed" : "works";
  if (role === "fix")
    return badSecond.has(k) ? "wrong" : badNow.has(k) || onlySecond(k) ? "fixed" : "works";
  return badNow.has(k) ? "wrong" : "works";
};

const chosen = args.highlight > 0 ? classes[args.highlight - 1] : null;
if (args.highlight > 0 && classes.length > 0 && !chosen)
  throw new Error(`--highlight ${args.highlight}: only ${classes.length} classes`);
const onPath = new Set(chosen ? chosen.path.map((p) => p.key) : []);
if (chosen && diverges(chosen)) onPath.add(chosen.second.key);

const edgesAlong = (c) =>
  c.path.slice(1).map((p, i) => ({
    id: edgeId(c.path[i].key, p.key),
    from: c.path[i].key,
    to: p.key,
    label: p.label,
    guard: p.guard,
  }));
function chartEdges() {
  const edges = new Map(modelEdges);
  for (const { second: s } of classes.filter(diverges)) {
    if (modelEdges.has(s.edge)) continue;
    if (!edges.has(s.edge))
      edges.set(s.edge, { from: s.from, to: s.key, labels: new Set(), secondOnly: true });
    edges.get(s.edge).labels.add(s.text);
  }
  const pathNumbers = new Map();
  (chosen ? edgesAlong(chosen) : []).forEach((step, i) => {
    if (!pathNumbers.has(step.id)) pathNumbers.set(step.id, []);
    const shown = step.guard ? `${step.label} [${step.guard}]` : step.label;
    pathNumbers.get(step.id).push({ n: i + 1, label: step.label, shown });
    if (!edges.has(step.id))
      edges.set(step.id, { from: step.from, to: step.to, labels: new Set([step.label]) });
  });
  if (!args.cover) return { edges, pathNumbers, coverEdges: null };

  const coverEdges = new Set();
  const bfs = (q, targets) => {
    const parent = new Map([...q.initial].map((k) => [k, null]));
    const queue = [...q.initial];
    const outEdges = new Map();
    for (const [id, e] of q.edges) {
      if (!outEdges.has(e.from)) outEdges.set(e.from, []);
      outEdges.get(e.from).push([id, e]);
    }
    while (queue.length) {
      const k = queue.shift();
      for (const [id, e] of outEdges.get(k) ?? []) {
        if (parent.has(e.to)) continue;
        parent.set(e.to, id);
        queue.push(e.to);
      }
    }
    for (const t of targets) {
      for (let id = parent.get(t); id; id = parent.get(q.edges.get(id).from)) coverEdges.add(id);
    }
  };
  bfs(now, now.settled);
  if (secondQ)
    bfs(
      secondQ,
      [...secondQ.settled].filter((k) => !now.nodes.has(k)),
    );
  const pathLabels = new Map();
  for (const c of classes) {
    for (const step of edgesAlong(c)) {
      coverEdges.add(step.id);
      pathLabels.set(step.id, (pathLabels.get(step.id) ?? new Set()).add(step.label));
    }
    if (diverges(c)) coverEdges.add(c.second.edge);
  }
  for (const id of coverEdges) {
    if (edges.has(id)) continue;
    const [from, to] = id.split(`${SEP}${SEP}`);
    edges.set(id, { from, to, labels: pathLabels.get(id) });
  }
  return { edges, pathNumbers, coverEdges };
}
const { edges, pathNumbers, coverEdges } = chartEdges();

const LEGEND = {
  works: ["legendWorks", mapping.legend?.works ?? (role === "fix" ? "Works today" : "Works")],
  wrong: [
    "legendWrong",
    mapping.legend?.wrong ?? (role === "fix" ? `Still wrong with ${L}` : "Breaks a rule"),
  ],
  fixed: [
    "legendFixed",
    mapping.legend?.fixed ?? (role === "fix" ? `Fixed or new with ${L}` : `Only in ${L}`),
  ],
};

const grouping = typeof mapping.group === "function";
const groupsOf = new Map();
const groupOf = (k) => (groupsOf.get(k)?.size === 1 ? [...groupsOf.get(k)][0] : "");
const groupNames = [];
const fills = new Map();
if (grouping) {
  const add = (k, vars, m) => {
    const g = mapping.group(vars, m.facts(vars));
    if (g !== undefined && g !== null && typeof g !== "string")
      throw new Error(`group() must return a group name or nothing; got ${JSON.stringify(g)}`);
    if (!groupsOf.has(k)) groupsOf.set(k, new Set());
    groupsOf.get(k).add((g ?? "").replace(/\s+/g, " ").trim());
  };
  for (const n of graph.nodes.values()) add(now.keys.get(n.id), n.vars, main);
  if (second)
    for (const n of second.graph.nodes.values()) add(secondQ.keys.get(n.id), n.vars, second);

  const given = mapping.groupColors ?? {};
  if (!isRecord(given))
    throw new Error("groupColors must be an object from a group name to a color such as #d6eaf8");
  const statusNames = new Set(
    [
      "Works",
      "Works today",
      "Breaks a rule",
      "Still wrong",
      "Fixed",
      ...Object.values(LEGEND).map(([, t]) => t),
    ].map((t) => t.toLowerCase()),
  );
  const found = new Set([...groupsOf.values()].flatMap((gs) => [...gs]).filter(Boolean));
  for (const g of found)
    if (statusNames.has(g.toLowerCase()))
      throw new Error(
        `group "${g}" has the name of a status; TLC decides the status, so name the group for what the reader sees`,
      );
  groupNames.push(
    ...Object.keys(given).filter((g) => found.has(g)),
    ...[...found].filter((g) => !Object.hasOwn(given, g)).sort(),
  );
  for (const [g, color] of Object.entries(given)) {
    if (color === undefined || color === null || color === "") continue;
    const why = groupColorProblem(color);
    if (why) throw new Error(`groupColors["${g}"] ${JSON.stringify(color)} ${why}`);
    if (found.has(g)) fills.set(g, color.toLowerCase());
  }
  const free = GROUP_PALETTE.filter((c) => ![...fills.values()].includes(c));
  for (const g of groupNames) {
    if (fills.has(g)) continue;
    if (!free.length)
      throw new Error(
        `the mapping has ${groupNames.length} groups, more than the ${GROUP_PALETTE.length} colors of the palette; give the others a color in groupColors`,
      );
    fills.set(g, free.shift());
  }
}
const mixedGroups = [...groupsOf].filter(([, gs]) => gs.size > 1).map(([k]) => k);

const BORDER = { works: "", wrong: "Wrong", fixed: "Fixed" };
const classFor = (g, s, path) =>
  grouping
    ? `${g ? `group${groupNames.indexOf(g)}` : "plain"}${BORDER[s] || (path ? "Path" : "")}`
    : `${s}${path ? "Path" : ""}`;
const drawnState = (g, s, path = false) => ({ group: g, status: s, cls: classFor(g, s, path) });
const groupCounts = (drawn) =>
  groupNames
    .map((g) => ({
      name: g,
      color: fills.get(g),
      states: drawn.filter((d) => d.group === g).length,
    }))
    .filter((g) => g.states > 0);

const frontMatter = (title) => [
  "---",
  ...(title ? [`title: ${JSON.stringify(title)}`] : []),
  "config:",
  "  markdownAutoWrap: false",
  "  state:",
  "    useMaxWidth: false",
  "---",
];
function head(drawn) {
  const out = [...frontMatter(args.title), "stateDiagram-v2"];
  if (role) out.push(`  %% second model (${role}): ${L}`);
  if (args.fullLabels) out.push(`  ${FULL_LABELS}`);
  const used = Object.keys(LEGEND).filter((s) => drawn.some((d) => d.status === s));
  const legend = grouping
    ? [
        ...groupCounts(drawn).map(({ name }) => {
          const i = groupNames.indexOf(name);
          return [`legendGroup${i}`, name, `group${i}`];
        }),
        ...used.filter((s) => BORDER[s]).map((s) => [...LEGEND[s], `plain${BORDER[s]}`]),
      ]
    : used.map((s) => [...LEGEND[s], s]);
  if (grouping) {
    const styleClasses = new Set([...drawn.map((d) => d.cls), ...legend.map(([, , c]) => c)]);
    const bases = [["plain", PLAIN_FILL], ...groupNames.map((g, i) => [`group${i}`, fills.get(g)])];
    for (const [base, fill] of bases)
      for (const border of ["", "Wrong", "Fixed", "Path"])
        if (styleClasses.has(base + border)) out.push(`  ${groupClassDef(base, fill, border)}`);
  } else for (const c of STATUS_CLASSES) out.push(`  ${c}`);
  if (legend.length) {
    out.push(`  state "Legend" as ${LEGEND_ID} {`);
    for (const [id, text] of legend) out.push(`    state "${escapeMermaidQuotes(text)}" as ${id}`);
    out.push("  }");
    for (const [id, , c] of legend) out.push(`  class ${id} ${c}`);
  }
  return out;
}

function regionsChart({ states, starts, edges, classes, proofPath, allPath }) {
  const norm = (s) => s.replaceAll(";", ",").replace(/\s+/g, " ").trim();
  const split = (k) => {
    const at = k.indexOf(": ");
    return at > 0 && at + 2 < k.length ? [norm(k.slice(0, at)), norm(k.slice(at + 2))] : null;
  };
  const nodes = [...states].sort();
  if (!nodes.every(split)) return null;
  const steps = [];
  for (const e of edges.values()) {
    if (e.labels.size === 0) return { why: "a step has no label" };
    for (const l of e.labels)
      steps.push({
        from: split(e.from),
        to: split(e.to),
        label: norm(l),
        words: e.guards?.get(l) ?? new Set([""]),
      });
  }
  const bar = (p) => p.join(" | ");
  const flat = {
    Main: {
      states: new Set(nodes.map((k) => bar(split(k)))),
      initial: new Set(starts.map((k) => bar(split(k)))),
      transitions: steps.map((s) => ({ from: bar(s.from), to: bar(s.to), label: s.label })),
    },
  };
  const ids = new Map([...flat.Main.states].map((s, i) => [s, `p${i}`]));
  const proof = [
    ...frontMatter(),
    "stateDiagram-v2",
    ...[...ids].map(([s, id]) => `  state "${escapeMermaidQuotes(s)}" as ${id}`),
    ...[...flat.Main.initial].map((s) => `  [*] --> ${ids.get(s)}`),
    ...steps.map((s) => `  ${ids.get(bar(s.from))} --> ${ids.get(bar(s.to))} : ${s.label}`),
  ];
  if (proofPath) fs.writeFileSync(proofPath, proof.join("\n") + "\n");

  const beside = [new Map(), new Map()];
  for (const k of nodes) {
    const p = split(k);
    for (const i of [0, 1]) {
      if (!beside[i].has(p[i])) beside[i].set(p[i], new Set());
      beside[i].get(p[i]).add(p[1 - i]);
    }
  }
  const size = beside[0].size + beside[1].size;
  if (size >= nodes.length)
    return { why: `${size} region states are not fewer than the ${nodes.length} flat states` };

  const rank = ["works", "fixed", "wrong"];
  const regionStatus = [new Map(), new Map()];
  for (const k of nodes) {
    const p = split(k);
    for (const i of [0, 1]) {
      const prev = regionStatus[i].get(p[i]);
      if (!prev || rank.indexOf(status(k)) < rank.indexOf(prev))
        regionStatus[i].set(p[i], status(k));
    }
  }
  for (const k of nodes) {
    const p = split(k);
    const shown = rank[Math.max(...[0, 1].map((i) => rank.indexOf(regionStatus[i].get(p[i]))))];
    if (shown !== status(k))
      return {
        why: `"${k}" is "${LEGEND[status(k)][1]}", and its two region states would show "${LEGEND[shown][1]}"`,
      };
  }

  const moves = [new Map(), new Map()];
  for (const s of steps)
    for (const i of [0, 1]) {
      const id = [s.from[i], s.label, s.to[i]].join(SEP);
      if (!moves[i].has(id))
        moves[i].set(id, {
          from: s.from[i],
          label: s.label,
          to: s.to[i],
          beside: new Set(),
          guards: new Map(),
        });
      moves[i].get(id).beside.add(s.from[1 - i]);
      for (const w of s.words) addGuard(moves[i].get(id).guards, s.label, norm(w));
    }
  for (const m of moves)
    for (const [id, x] of m)
      if (
        x.from === x.to &&
        ![...m.values()].some((y) => y.from === x.from && y.label === x.label && y.to !== x.from)
      )
        m.delete(id);
  const rid = beside.map((m, i) => new Map([...m.keys()].sort().map((s, j) => [s, `r${i}s${j}`])));
  const regionGroup = [new Map(), new Map()];
  for (const k of nodes) {
    const p = split(k);
    for (const i of [0, 1]) {
      const prev = regionGroup[i].get(p[i]);
      regionGroup[i].set(p[i], prev === undefined || prev === groupOf(k) ? groupOf(k) : "");
    }
  }
  const drawn = rid.map((m, i) =>
    [...m.keys()].map((s) => drawnState(regionGroup[i].get(s), regionStatus[i].get(s))),
  );
  const draw = (only) => {
    const out = head(drawn.flat());
    out.push(`  state "At the same time" as regions {`);
    let count = 0;
    for (const i of [0, 1]) {
      if (i) out.push("    --");
      const name = mapping.regionNames?.[i];
      const pad = name ? "      " : "    ";
      if (name) out.push(`    state "${escapeMermaidQuotes(wrap(name))}" as region${i} {`);
      for (const s of new Set(starts.map((k) => split(k)[i])))
        out.push(`${pad}[*] --> ${rid[i].get(s)}`);
      for (const [s, id] of rid[i])
        out.push(`${pad}state "${escapeMermaidQuotes(wrap(s))}" as ${id}`);
      const shownMoves = [...moves[i]]
        .filter(([id]) => !only || only[i].has(id))
        .map(([, m]) => m)
        .sort((a, b) => a.from.localeCompare(b.from) || a.label.localeCompare(b.label));
      for (const m of shownMoves) {
        const all = beside[i].get(m.from);
        const not = [...all].filter((s) => !m.beside.has(s)).sort();
        const yes = [...m.beside].sort();
        const unless = not.length > 0 && not.length < yes.length;
        const guard = not.length === 0 ? null : unless ? not : yes;
        const worded = guarded(m.guards, m.label);
        const text =
          worded !== m.label || !guard
            ? worded
            : `${m.label} [${unless ? "unless" : "when"} ${guard.join(" or ")}]`;
        out.push(`${pad}${rid[i].get(m.from)} --> ${rid[i].get(m.to)} : ${wrap(text, 30)}`);
        if (guard)
          out.push(
            `${pad}%% when ${unless ? "not " : ""}${guard.map((s) => rid[1 - i].get(s)).join(", ")}`,
          );
        count++;
      }
      if (name) out.push("    }");
    }
    out.push("  }");
    for (const i of [0, 1])
      [...rid[i].values()].forEach((id, j) => out.push(`  class ${id} ${drawn[i][j].cls}`));
    return { mermaid: out.join("\n") + "\n", count };
  };

  const all = draw(null);
  const differences = compareCharts(parseMermaid(all.mermaid).regions, flat);
  if (differences.length) {
    const n = differences.reduce((sum, [, xs]) => sum + xs.length, 0);
    return {
      why: `the regions do not combine into the flat chart, with ${n} difference(s), such as ${differences[0][0]}: ${differences[0][1][0]}`,
    };
  }
  if (allPath) fs.writeFileSync(allPath, all.mermaid);

  const parts = new Map(nodes.map((k) => [bar(split(k)), split(k)]));
  const key = (from, label, to) => `${from} --> ${to} : ${label}`;
  const real = new Set(steps.map((s) => key(bar(s.from), s.label, bar(s.to))));
  const next = new Map();
  for (const s of steps) {
    if (!next.has(bar(s.from))) next.set(bar(s.from), []);
    next.get(bar(s.from)).push(s);
  }
  const keep = [new Set(), new Set()];
  const movesOf = (s) =>
    [0, 1]
      .filter((i) => s.from[i] !== s.to[i])
      .map((i) => [i, [s.from[i], s.label, s.to[i]].join(SEP)]);
  const price = (s) => movesOf(s).filter(([i, id]) => !keep[i].has(id)).length * nodes.length + 1;
  const wanted = [];
  const want = (s) => {
    wanted.push(s);
    for (const [i, id] of movesOf(s)) keep[i].add(id);
  };
  const stepsOf = (e, said) => {
    const labels = [...e.labels].map(norm);
    return (labels.includes(said) ? [said] : labels).map((label) => ({
      from: split(e.from),
      to: split(e.to),
      label,
    }));
  };
  for (const c of classes) {
    for (const step of edgesAlong(c)) {
      const e = edges.get(step.id);
      if (e) stepsOf(e, norm(step.label)).forEach(want);
    }
    if (diverges(c)) stepsOf(edges.get(c.second.edge), "").forEach(want);
  }
  const cheapest = () => {
    const cost = new Map(starts.map((k) => [bar(split(k)), 0]));
    const parent = new Map();
    const open = new Set(cost.keys());
    while (open.size) {
      const k = [...open].reduce((a, b) => (cost.get(b) < cost.get(a) ? b : a));
      open.delete(k);
      for (const s of next.get(k) ?? []) {
        const c = cost.get(k) + price(s);
        if (c < (cost.get(bar(s.to)) ?? Infinity)) {
          cost.set(bar(s.to), c);
          parent.set(bar(s.to), s);
          open.add(bar(s.to));
        }
      }
    }
    return { cost, parent };
  };
  const targets = [
    ...[0, 1].flatMap((i) =>
      [...beside[i].keys()].sort().map((r) => ({ at: (k) => parts.get(k)[i] === r })),
    ),
    ...[...new Set(steps.map((s) => s.label))]
      .filter((l) => !wanted.some((s) => s.label === l))
      .sort()
      .map((l) => ({ ends: (s) => s.label === l })),
  ];
  while (targets.length) {
    const { cost, parent } = cheapest();
    let best = null;
    targets.forEach((t, n) => {
      const ways = t.at
        ? [...cost.keys()].filter(t.at).map((k) => ({ k, c: cost.get(k), last: null }))
        : steps
            .filter(t.ends)
            .filter((s) => cost.has(bar(s.from)))
            .map((s) => ({ k: bar(s.from), c: cost.get(bar(s.from)) + price(s), last: s }));
      for (const w of ways) if (!best || w.c < best.c) best = { ...w, n };
    });
    if (!best) break;
    targets.splice(best.n, 1);
    const path = best.last ? [best.last] : [];
    for (let s = parent.get(best.k); s; s = parent.get(bar(s.from))) path.push(s);
    path.forEach(want);
  }
  const takes = (x, label) =>
    [0, 1].flatMap((i) =>
      [...moves[i]]
        .filter(([, m]) => m.from === x[i] && m.label === label && m.beside.has(x[1 - i]))
        .map(([id]) => [i, id]),
    );
  let scoped;
  let made;
  for (;;) {
    scoped = draw(keep);
    made = productOf(parseMermaid(scoped.mermaid).regions);
    const madeKeys = new Set(made.transitions.map((t) => key(t.from, t.label, t.to)));
    const redo = [
      ...made.transitions
        .filter((t) => parts.has(t.from) && !real.has(key(t.from, t.label, t.to)))
        .map((t) => [parts.get(t.from), t.label]),
      ...wanted
        .filter((s) => made.states.has(bar(s.from)))
        .filter((s) => !madeKeys.has(key(bar(s.from), s.label, bar(s.to))))
        .map((s) => [s.from, s.label]),
    ];
    const before = keep[0].size + keep[1].size;
    for (const [x, label] of redo) for (const [i, id] of takes(x, label)) keep[i].add(id);
    if (keep[0].size + keep[1].size === before) break;
  }
  const sound =
    [...made.states].every((s) => parts.has(s)) &&
    made.transitions.every((t) => real.has(key(t.from, t.label, t.to)));
  if (!sound) scoped = all;

  return {
    mermaid: scoped.mermaid,
    states: [beside[0].size, beside[1].size],
    transitions: scoped.count,
    all: all.count,
    flat: { states: nodes.length, transitions: steps.length },
    status: Object.fromEntries(
      rank.map((s) => [
        s,
        regionStatus.reduce((n, m) => n + [...m.values()].filter((x) => x === s).length, 0),
      ]),
    ),
    groups: groupCounts(drawn.flat()),
  };
}
const regions = args.regions
  ? regionsChart({
      states: allNodes,
      starts: [...initial],
      edges,
      classes,
      proofPath: args.proof,
      allPath: args.regionsAll,
    })
  : null;
if (regions?.why) console.error(`regions: not drawn, because ${regions.why}`);

const flatStates =
  args.pathOnly && chosen
    ? onPath
    : coverEdges
      ? new Set([
          ...initial,
          ...[...coverEdges].flatMap((id) => [edges.get(id).from, edges.get(id).to]),
        ])
      : allNodes;
const sorted = [...flatStates].sort();
const drawn = sorted.map((k) => drawnState(groupOf(k), status(k), onPath.has(k)));

const boxes = new Map();
const boxOf = new Map();
const inBox = (k, box) => {
  if (!boxes.has(box)) boxes.set(box, []);
  boxes.get(box).push(k);
};
if (args.view === "layered") for (const k of sorted) inBox(k, k.split(SEP)[0]);
else if (args.view === "customer" && !args.flat) {
  for (const k of sorted) {
    const at = k.indexOf(": ");
    if (at > 0 && at + 2 < k.length) inBox(k, k.slice(0, at));
  }
  for (const [box, members] of boxes) if (members.length < 2) boxes.delete(box);
}
const boxIds = new Map([...boxes.keys()].map((box, i) => [box, `g${i}`]));
for (const [box, members] of boxes) for (const k of members) boxOf.set(k, box);
const declared = [...[...boxes.values()].flat(), ...sorted.filter((k) => !boxOf.has(k))];
const stateIds = new Map(declared.map((k, i) => [k, `s${i}`]));
const idOf = (k) => stateIds.get(k);
const caption = (k) =>
  args.view === "layered" ? k.split(SEP)[1] : boxOf.has(k) ? k.slice(boxOf.get(k).length + 2) : k;

function numbered(steps) {
  const runs = [];
  for (const { n, shown } of steps) {
    const last = runs.at(-1);
    if (last?.shown === shown && last.n.at(-1) === n - 1) last.n.push(n);
    else runs.push({ shown, n: [n] });
  }
  return runs.map(({ shown, n }) => `${n.join(", ")}. ${shown}`);
}
const drawnLabels = new Set();
const arrows = new Map();
for (const [id, e] of edges) {
  if (!flatStates.has(e.from) || !flatStates.has(e.to)) continue;
  if (args.pathOnly && chosen && !pathNumbers.has(id) && id !== chosen.second?.edge) continue;
  if (coverEdges && !coverEdges.has(id)) continue;
  const pair = edgeId(e.from, e.to);
  if (!arrows.has(pair))
    arrows.set(pair, { from: e.from, to: e.to, groups: [[], [], []], plain: true, labels: [] });
  const a = arrows.get(pair);
  const [numbers, current, other] = a.groups;
  const all = [...e.labels];
  const shown = all.map((l) => guarded(e.guards, l));
  const said = args.fullLabels ? shown.join(" or ") : joinLabels(shown);
  const p = pathNumbers.get(id);
  const chosenStep = chosen?.second && id === chosen.second.edge;
  if (p) numbers.push(...numbered(p));
  else if (!e.secondOnly) current.push(said);
  else other.push(args.pathOnly && chosenStep ? chosen.second.text : said);
  if (chosenStep && !e.secondOnly) other.push(chosen.second.text);
  if (p || chosenStep || id.endsWith(`${SEP}second`)) a.plain = false;
  a.labels.push(...all);
  for (const l of p ? p.map((s) => s.label) : all) drawnLabels.add(l);
}
const transitions = [...arrows.values()].map(({ from, to, groups, plain, labels }) => ({
  from,
  to,
  // ";" ends a Mermaid statement, even inside a transition label.
  text: groups
    .map((g) =>
      g
        .filter(Boolean)
        .map((l) => wrap(l.replaceAll(";", ","), 30))
        .join("<br/>"),
    )
    .filter(Boolean)
    .join("<br/>#160;<br/>"),
  plain,
  labels: labels.sort(),
}));
const fromBox = [];
const folded = new Set();
for (const [box, members] of boxes) {
  const mine = new Set(members);
  const byStep = new Map();
  for (const l of transitions) {
    if (!l.plain || !mine.has(l.from) || mine.has(l.to)) continue;
    const step = `${l.to}${SEP}${l.text}${SEP}${l.labels.join(SEP)}`;
    if (!byStep.has(step)) byStep.set(step, []);
    byStep.get(step).push(l);
  }
  for (const same of byStep.values()) {
    if (new Set(same.map((l) => l.from)).size !== members.length) continue;
    for (const l of same) folded.add(l);
    fromBox.push({ ...same[0], box });
  }
}

const out = head(drawn);
for (const [box, members] of boxes) {
  out.push(`  state "${escapeMermaidQuotes(wrap(box))}" as ${boxIds.get(box)} {`);
  for (const k of members)
    out.push(`    state "${escapeMermaidQuotes(wrap(caption(k)))}" as ${idOf(k)}`);
  out.push("  }");
}
for (const k of sorted)
  if (!boxOf.has(k)) out.push(`  state "${escapeMermaidQuotes(wrap(caption(k)))}" as ${idOf(k)}`);
for (const k of sorted)
  if (initial.has(k) && (!args.pathOnly || k === chosen?.path[0].key))
    out.push(`  [*] --> ${idOf(k)}`);
const arrow = (from, l) => `  ${from} --> ${idOf(l.to)}${l.text ? ` : ${l.text}` : ""}`;
for (const l of fromBox) out.push(arrow(boxIds.get(l.box), l));
for (const l of transitions) if (!folded.has(l)) out.push(arrow(idOf(l.from), l));
sorted.forEach((k, i) => out.push(`  class ${idOf(k)} ${drawn[i].cls}`));
const mermaid = regions?.mermaid ?? out.join("\n") + "\n";
if (args.out) fs.writeFileSync(args.out, mermaid);
else process.stdout.write(mermaid);

const show = (k) => (args.view === "layered" ? k.replace(SEP, ": ") : k);
const ruleOf = (c) => rules.get(c.invariant) ?? `\`${c.invariant}\``;
function secondLine(c) {
  const W = cap(within);
  if (c.introduced) return `Only ${L} has this bug. The steps above happen ${within} ${L}.`;
  const s = c.second;
  if (!s) return null;
  if (s.sameEnd)
    return !s.checked
      ? `${W} ${L} you see the same screens and steps, but ${L} does not check this rule.`
      : s.ruleHolds
        ? `${W} ${L} you see the same screens and steps, yet the rule holds, so the state labels do not show what ${L} changes.`
        : `${W} ${L} you see the same screens and steps, so ${L} does not change this path.`;
  if (s.reason) return `${cap(L)} cannot take these steps: it ${s.reason}.`;
  const outcome = s.disabled
    ? "cannot happen, so you stay at"
    : s.key === s.from
      ? "keeps you at"
      : "takes you to";
  if (s.hidden) {
    const when = s.step ? `after step ${s.step}` : "before your first step";
    return `${W} ${L}, ${when}, "${s.said}" happens and ${outcome}: ${show(s.key)}.`;
  }
  return `${W} ${L}, step ${s.step} (${s.said}) ${outcome}: ${show(s.key)}.`;
}
const listedIn = (c) =>
  Object.keys(args.listed.breaks).filter((cfg) => args.listed.breaks[cfg] === c.invariant);
function listedLine(c) {
  const { spec, breaks } = args.listed;
  const cfgs = listedIn(c);
  if (cfgs.length)
    return `Listed: ${joinAnd(cfgs)}, ${cfgs.length === 1 ? "a config" : "configs"} of ${spec}, expect${cfgs.length === 1 ? "s" : ""} TLC to break this rule.`;
  const others = [...new Set(Object.values(breaks))].sort().map((r) => `\`${r}\``);
  return `Not listed: no config of ${spec} expects TLC to break this rule. ${others.length ? `Its configs expect TLC to break ${joinAnd(others)}.` : "None of its configs expects TLC to break a rule."}`;
}
if (args.story) {
  const lines = [];
  const header = role === "fix" ? `New with ${L}: ` : `Only in ${L}: `;
  classes.forEach((c, i) => {
    lines.push(`## ${i + 1}. ${c.introduced ? header : ""}${show(c.end)}`, "");
    lines.push(`Rule broken: ${ruleOf(c)}`);
    if (c.cause) lines.push(`Why: ${c.cause.replace(/\.$/, "")}.`);
    if (args.listed) lines.push(listedLine(c));
    lines.push("This path breaks the rule.", "");
    c.path.forEach((p, j) =>
      lines.push(
        j === 0 ? `0. Start: ${show(p.key)}` : `${j}. ${cap(p.label)}. Now: ${show(p.key)}`,
      ),
    );
    lines.push("");
    const said = secondLine(c);
    if (said) lines.push(said, "");
  });
  fs.writeFileSync(args.story, lines.join("\n"));
}
const CODE_LIKE = /\b[a-z]{2,}[A-Z][a-z]|\b\w+_\w+\b|\b[A-Za-z_]\w*\(|\b[A-Z][a-z]+[A-Z][a-z]/;
const codeLike = [
  ...new Set([
    ...(args.view === "customer" ? [...sorted, ...drawnLabels] : []),
    ...classes.map((c) => c.cause).filter(Boolean),
  ]),
].filter((t) => CODE_LIKE.test(t));
const secondOf = (c) =>
  c.introduced
    ? role === "fix"
      ? `new with ${L}`
      : `only in ${L}`
    : c.second
      ? c.second.sameEnd
        ? !c.second.checked
          ? "same screens, rule not checked"
          : c.second.ruleHolds
            ? "same screens, but the rule holds"
            : "unchanged"
        : (c.second.reason ?? show(c.second.key))
      : null;
const summary = {
  view: args.view,
  ...(role
    ? {
        second: {
          role,
          label: L,
          lacks: lacks.map((p) => p.join(".")),
          ...(args.listed ? { listed: args.listed } : {}),
        },
      }
    : {}),
  modelStates: graph.nodes.size,
  modelTransitions: graph.edges.length,
  chartStates: regions?.mermaid ? regions.states[0] + regions.states[1] : flatStates.size,
  chartTransitions: regions?.mermaid ? regions.transitions : transitions.length,
  chartStatus: regions?.mermaid
    ? regions.status
    : Object.fromEntries(
        ["works", "wrong", "fixed"].map((s) => [
          s,
          [...flatStates].filter((k) => status(k) === s).length,
        ]),
      ),
  ...(grouping
    ? {
        chartGroups: regions?.mermaid ? regions.groups : groupCounts(drawn),
        mixedGroups: mixedGroups.map(show).sort(),
      }
    : {}),
  ...(regions
    ? {
        regions: regions.mermaid
          ? {
              drawn: true,
              states: regions.states,
              transitions: regions.transitions,
              all: regions.all,
              flat: regions.flat,
            }
          : { drawn: false, why: regions.why },
      }
    : {}),
  classes: classes.map((c, i) => ({
    n: i + 1,
    end: show(c.end),
    invariant: c.invariant,
    rule: rules.get(c.invariant) ?? null,
    cause: c.cause,
    readerSteps: c.path.length - 1,
    modelSteps: c.trace.steps.length,
    counterexamples: c.count,
    [role ?? "fix"]: secondOf(c),
    ...(args.listed ? { listed: listedIn(c) } : {}),
  })),
  codeLike,
};
if (args.summary) fs.writeFileSync(args.summary, JSON.stringify(summary, null, 2) + "\n");
const extraBugs = introduced.length
  ? `, ${introduced.length} ${role === "fix" ? `new with ${L}` : `only in ${L}`}`
  : "";
const drawnAs = regions?.mermaid
  ? ` of ${regions.all} in 2 regions (proved against ${regions.flat.states} states, ${regions.flat.transitions} transitions)`
  : "";
console.error(
  `chart: ${summary.chartStates} states, ${summary.chartTransitions} transitions${drawnAs} from ${summary.modelStates} model states; ` +
    `${mainClasses.length} bug(s)${extraBugs}`,
);
