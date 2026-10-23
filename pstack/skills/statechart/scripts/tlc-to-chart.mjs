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
  escapeMermaidQuotes,
  groupClassDef,
  groupColorProblem,
  isRecord,
  joinAnd,
  joinLabels,
  parseDot,
  parseTraces,
  stateKey,
  tlcOutputWarning,
  wrap,
  STATUS_CLASSES,
} from "./lib.mjs";
import { args } from "./tlc-to-chart-args.mjs";
import { ruleBook } from "./rule-book.mjs";
import { SEP, addGuard, edgeId, frontMatter, guarded } from "./chart-parts.mjs";
import {
  badStates,
  byOrder,
  diverges,
  firstBad,
  labelStatus,
  readBroken,
  worst,
} from "./bug-states.mjs";
import { chartEdges } from "./chart-edges.mjs";
import { regionsChart } from "./regions-chart.mjs";
import { mapView } from "./map-view.mjs";
import { stepsIntoBugs, waysLine } from "./ways-in.mjs";
import { divergence, replaySecond } from "./second-replay.mjs";
import { readCheck } from "./read-check.mjs";

const role = args.fixedDot ? "fix" : args.againstDot ? "against" : null;
const L = args.label ?? (role === "fix" ? "the fix" : "the spec");
const within = role === "fix" ? "with" : "in";
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const mapping = await import(pathToFileURL(path.resolve(args.map)).href);
if (typeof mapping.state !== "function")
  throw new Error("the mapping module must export state(vars)");
if (args.view !== "customer" && typeof mapping.detail !== "function")
  throw new Error(`--view ${args.view} needs detail(vars) in the mapping module`);

const rules = new Map();
const ruleReads = new Map();
for (const spec of args.specs)
  for (const [name, { sentence, reads }] of ruleBook(spec)) {
    if (sentence && !rules.has(name)) rules.set(name, sentence);
    ruleReads.set(name, new Set([...(ruleReads.get(name) ?? []), ...reads]));
  }

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
  if (args.view !== "layered") return outer;
  return [outer, String(mapping.detail(vars, facts))]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(SEP);
}
function stepLabel(action, before, after, view = args.view) {
  const said = typeof mapping.step === "function" ? mapping.step(action, before, after) : action;
  const named =
    view === "customer" || said === action ? said : said ? `${said} [${action}]` : action;
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

const definedLabel = (label, what) => {
  if (typeof label !== "string" || !/\bundefined\b/.test(label)) return label;
  const does = what === "group" ? `puts a state of ${L} in group` : `labels a ${what} of ${L}`;
  throw new Error(
    `the mapping ${does} "${label.replaceAll(SEP, " ")}", so it reads a field ${L} does not have there. Label states and steps only from what both models have.`,
  );
};

function modelOf(graph, guarded = (vars) => vars, checked = (label) => label) {
  const byId = new Map([...graph.nodes.keys()].map((id) => [id, new Set()]));
  for (const e of [...graph.edges, ...graph.loops]) byId.get(e.from).add(e.action);
  const stateKeys = new Map([...graph.nodes.values()].map((n) => [n.id, stateKey(n.vars)]));
  const index = new Map([...stateKeys].map(([id, k]) => [k, byId.get(id)]));
  const facts = (vars) => factsFrom(index.get(stateKey(vars)) ?? new Set());
  const forMap = (vars) => guarded(mapView(vars));
  return {
    graph,
    stateKeys,
    facts,
    key: (vars) => checked(keyOf(forMap(vars), facts(vars)), "state"),
    customer: (vars) => checked(String(mapping.state(forMap(vars), facts(vars))), "state"),
    step: (action, before, after, view) =>
      checked(stepLabel(action, forMap(before), forMap(after), view), "step"),
    guard: (action, before, after) =>
      checked(stepGuard(action, forMap(before), forMap(after)), "step"),
    cause: (vars, invariant) => {
      const why =
        typeof mapping.cause === "function"
          ? mapping.cause(forMap(vars), facts(vars), invariant)
          : null;
      return why === undefined || why === null ? null : checked(String(why), "bug");
    },
    group: (vars) => checked(mapping.group(forMap(vars), facts(vars)), "group"),
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
  for (const e of [...graph.edges, ...graph.loops]) {
    const from = keys.get(e.from);
    const to = keys.get(e.to);
    if (from === to && !args.loops) continue;
    const id = edgeId(from, to);
    if (!edges.has(id)) edges.set(id, { from, to, counts: new Map(), guards: new Map() });
    const [before, after] = [graph.nodes.get(e.from).vars, graph.nodes.get(e.to).vars];
    const label = m.step(e.action, before, after);
    if (!label) continue;
    edges.get(id).counts.set(label, (edges.get(id).counts.get(label) ?? 0) + 1);
    addGuard(edges.get(id).guards, label, m.guard(e.action, before, after));
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

const secondDot = args.fixedDot ?? args.againstDot;
const secondGraph = secondDot ? parseDot(fs.readFileSync(secondDot, "utf8")) : null;
const rawTraces = readTraces(args.traces);
const secondTraceFiles = role === "fix" ? args.fixedTraces : args.againstTraces;
const secondRules = new Set(role === "fix" ? args.fixedRules : args.againstRules);
const rawSecondTraces = readTraces(secondTraceFiles);
const traces = firstBad(rawTraces);
const secondTraces = firstBad(rawSecondTraces);
const { lacks, extra, guard } = secondGraph
  ? readCheck({ graph, rawTraces, secondGraph, rawSecondTraces, L })
  : {};
const second = secondGraph && modelOf(secondGraph, guard, definedLabel);
const secondQ = second && quotient(second);

const hiddenStep = (rule, sameLabel, action, before, after) =>
  sameLabel &&
  !readerActions.has(action) &&
  ![...(ruleReads.get(rule) ?? [])].some(
    (v) => v in before && stateKey(before[v]) !== stateKey(after[v]),
  );

function readerPath(trace, m, key, view) {
  const last = trace.steps.length - 1;
  const out = [{ key: key(trace.steps[0].vars), label: null, modelStep: 0 }];
  for (let i = 1; i < trace.steps.length; i++) {
    const { action } = trace.steps[i];
    const k = key(trace.steps[i].vars);
    const [before, after] = [trace.steps[i - 1].vars, trace.steps[i].vars];
    const sameLabel = k === out[out.length - 1].key;
    if (i < last && hiddenStep(trace.invariant, sameLabel, action, before, after)) continue;
    const label = m.step(action, before, after, view) || action;
    const guard = m.guard(action, before, after);
    out.push({ key: k, label, guard, action, modelStep: i });
  }
  return out;
}

const mainActions = new Set([...graph.edges, ...graph.loops].map((e) => e.action));

function readTraces(files) {
  return files.flatMap((f) => {
    const text = fs.readFileSync(f, "utf8");
    const warning = tlcOutputWarning(text, f);
    if (warning) console.error(`${f}: ${warning}`);
    return parseTraces(text);
  });
}
function group(cuts, m) {
  const byId = new Map();
  for (const trace of cuts) {
    const rp = readerPath(trace, m, m.customer);
    const last = trace.steps[trace.steps.length - 1].vars;
    const cause = m.cause(last, trace.invariant);
    const id = `${trace.invariant}${SEP}${cause ?? rp[rp.length - 1].key}`;
    const prev = byId.get(id);
    const ends = new Set([...(prev?.ends ?? []), stateKey(last)]);
    if (
      !prev ||
      rp.length < prev.steps ||
      (rp.length === prev.steps && trace.steps.length < prev.trace.steps.length)
    ) {
      byId.set(id, { id, cause, steps: rp.length, trace, invariant: trace.invariant, ends });
    } else prev.ends = ends;
  }
  return byId;
}
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
const withPath = (c, m) => {
  const path = readerPath(c.trace, m, m.key);
  return { ...c, path, end: path[path.length - 1].key };
};
const classesById = group(traces, main);
const mainClasses = [...classesById.values()].sort(byOrder).map((c, i) => {
  const bug = withPath(c, main);
  return {
    ...bug,
    second: divergence(
      replaySecond(c.trace, {
        main,
        lacks,
        extra,
        second,
        hiddenStep,
        readerPath,
        mainActions,
        secondRules,
        rawSecondTraces,
      }),
      bug.path,
      i + 1,
      { inSecond, modelEdges },
    ),
  };
});
const introduced = second
  ? [...group(secondTraces, second).values()]
      .filter((c) => !classesById.has(c.id))
      .sort(byOrder)
      .map((c) => ({ ...withPath(c, second), second: null, introduced: true }))
  : [];
const classes = [
  ...stepsIntoBugs(mainClasses, main, rawTraces, args),
  ...stepsIntoBugs(introduced, second, rawSecondTraces, args),
];

const brokenNow = readBroken(args.broken);
const statusNow = labelStatus(main, now.keys, badStates(rawTraces, brokenNow));
const statusSecond = second
  ? labelStatus(
      second,
      secondQ.keys,
      badStates(rawSecondTraces, readBroken(args.fixedBroken ?? args.againstBroken)),
    )
  : () => undefined;
const statusUnchecked =
  role === "fix"
    ? labelStatus(
        main,
        now.keys,
        badStates(rawTraces, brokenNow, (r) => !secondRules.has(r)),
      )
    : () => undefined;
const allNodes = new Set([...now.nodes, ...(secondQ?.nodes ?? [])]);
const initial = new Set([...now.initial, ...(secondQ?.initial ?? [])]);
const status = (k) => {
  if (role === "against") {
    const s = worst(statusNow(k), statusSecond(k));
    return s === "works" && !now.nodes.has(k) ? "fixed" : s;
  }
  if (role === "fix") {
    const s = worst(statusSecond(k), statusUnchecked(k));
    if (s === "wrong" && !["wrong", "mixed"].includes(statusNow(k))) return "worse";
    return s === "works" && statusNow(k) !== "works" ? "fixed" : s;
  }
  return statusNow(k);
};

const chosen = args.highlight > 0 ? classes[args.highlight - 1] : null;
if (args.highlight > 0 && classes.length > 0 && !chosen)
  throw new Error(`--highlight ${args.highlight}: only ${classes.length} classes`);
const onPath = new Set(chosen ? chosen.path.map((p) => p.key) : []);
if (chosen && diverges(chosen)) onPath.add(chosen.second.key);

const coverOff =
  args.cover &&
  ![graph, secondGraph]
    .filter(Boolean)
    .some((g) => [...g.edges, ...g.loops].some((e) => readerActions.has(e.action)))
    ? "no step in TLC's graph is a reader action"
    : null;
if (coverOff && !args.pathOnly) console.error(`--cover: drew every state, because ${coverOff}`);
const { edges, pathNumbers, coverEdges } = chartEdges({
  args,
  now,
  secondQ,
  modelEdges,
  classes,
  chosen,
  coverOff,
});

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
  mixed: [
    "legendMixed",
    mapping.legend?.mixed ?? `Breaks a rule in some cases${role === "fix" ? ` with ${L}` : ""}`,
  ],
  after: [
    "legendAfter",
    mapping.legend?.after ?? `Reached only after a bug${role === "fix" ? ` with ${L}` : ""}`,
  ],
  ...(role === "fix"
    ? { worse: ["legendWorse", mapping.legend?.worse ?? `Breaks a rule only with ${L}`] }
    : {}),
};

const grouping = typeof mapping.group === "function";
const groupsOf = new Map();
const groupOf = (k) => (groupsOf.get(k)?.size === 1 ? [...groupsOf.get(k)][0] : "");
const groupNames = [];
const fills = new Map();
if (grouping) {
  const add = (k, vars, m) => {
    const g = m.group(vars);
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

const BORDER = {
  works: "",
  wrong: "Wrong",
  fixed: "Fixed",
  mixed: "Mixed",
  after: "After",
  worse: "Worse",
};
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
      for (const border of [...Object.values(BORDER), "Path"])
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

const regions = args.regions
  ? regionsChart({
      states: allNodes,
      starts: [...initial],
      edges,
      loops: Boolean(args.loops),
      classes,
      proofPath: args.proof,
      allPath: args.regionsAll,
      mapping,
      status,
      LEGEND,
      groupOf,
      drawnState,
      groupCounts,
      head,
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
if (args.view === "layered" && !args.flat) {
  for (const k of sorted) if (k.includes(SEP)) inBox(k, k.slice(0, k.indexOf(SEP)));
} else if (args.view === "customer" && !args.flat) {
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
const show = (k) => (args.view === "layered" ? k.replace(SEP, ": ") : k);
const caption = (k) => (boxOf.has(k) ? show(k).slice(boxOf.get(k).length + 2) : show(k));

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
  const pair = e.apart ? id : edgeId(e.from, e.to);
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
const plainNames = new Set(sorted.filter((k) => !boxOf.has(k)).map(caption));
for (const [box, members] of boxes) {
  if (plainNames.has(box)) continue;
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

const ruleOf = (c) => rules.get(c.invariant) ?? `\`${c.invariant}\``;
function secondLine(c) {
  const W = cap(within);
  if (c.introduced) return `Only ${L} has this bug. The steps above happen ${within} ${L}.`;
  const s = c.second;
  if (!s) return null;
  if (s.sameEnd)
    return !s.checked
      ? `${W} ${L} you see the same states and steps, but ${L} does not check this rule.`
      : s.ruleHolds
        ? `${W} ${L} you see the same states and steps, yet the rule holds, so the state labels do not show what ${L} changes.`
        : `${W} ${L} you see the same states and steps, so ${L} does not change this path.`;
  if (s.reason) return `${cap(L)} cannot take these steps: it ${s.reason}.`;
  const outcome = s.disabled
    ? "cannot happen, so you stay at"
    : s.key === s.from
      ? "keeps you at"
      : "takes you to";
  const as = s.own && s.own !== s.said ? ` as "${s.own}"` : "";
  if (s.hidden) {
    const when = s.step ? `after step ${s.step}` : "before your first step";
    return `${W} ${L}, ${when}, "${s.said}" happens${as} and ${outcome}: ${show(s.key)}.`;
  }
  const happens = as ? `happens${as} and ` : "";
  return `${W} ${L}, step ${s.step} (${s.said}) ${happens}${outcome}: ${show(s.key)}.`;
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
    const ways = waysLine(c);
    lines.push(...(ways ? [ways] : []), "");
    lines.push(`0. Start: ${show(c.path[0].key)}`);
    const m = c.introduced ? second : main;
    c.path.slice(1).forEach((p, j) => {
      const from = c.path[j].modelStep + 1;
      const hidden = c.trace.steps
        .slice(from, p.modelStep)
        .map(
          (s, h) =>
            m.step(s.action, c.trace.steps[from + h - 1].vars, s.vars, "customer") || s.action,
        );
      if (hidden.length)
        lines.push(
          `   (${hidden.length} hidden step${hidden.length === 1 ? "" : "s"}: ${[...new Set(hidden)].join(", ")})`,
        );
      lines.push(`${j + 1}. ${cap(p.label)}. Now: ${show(p.key)}`);
    });
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
          ? "same states, rule not checked"
          : c.second.ruleHolds
            ? "same states, but the rule holds"
            : "unchanged"
        : (c.second.reason ?? show(c.second.key))
      : null;
function coverSummary() {
  if (coverOff || regions?.mermaid)
    return { drawn: false, why: coverOff ?? "the overview has parallel regions" };
  const pairs = new Set();
  const missed = new Map();
  for (const [id, e] of edges) {
    const pair = e.apart ? id : edgeId(e.from, e.to);
    pairs.add(pair);
    if (coverEdges.has(id)) continue;
    if (!missed.has(pair)) missed.set(pair, { from: e.from, to: e.to, labels: [] });
    missed.get(pair).labels.push(...[...e.labels].map((l) => guarded(e.guards, l)));
  }
  return {
    drawn: true,
    states: allNodes.size,
    transitions: pairs.size,
    leftOutStates: [...allNodes]
      .filter((k) => !flatStates.has(k))
      .map(show)
      .sort(),
    leftOutTransitions: [...missed.values()]
      .map((m) => `${show(m.from)} --> ${show(m.to)}: ${joinLabels(m.labels)}`)
      .sort(),
  };
}
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
        Object.keys(LEGEND).map((s) => [
          s,
          [...(args.pathOnly && chosen ? onPath : allNodes)].filter((k) => status(k) === s).length,
        ]),
      ),
  mixedStatus: [...allNodes]
    .filter((k) => status(k) === "mixed")
    .map(show)
    .sort(),
  ...(args.cover ? { cover: coverSummary() } : {}),
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
    counterexamples: c.ends.size,
    lastSteps: c.lastSteps,
    startsHere: c.startsHere,
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
