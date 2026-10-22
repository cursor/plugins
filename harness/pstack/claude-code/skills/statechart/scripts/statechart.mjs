#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { checkTlcOutput, findTlc, parseDot } from "./lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

const USAGE = {
  "from-spec":
    "node statechart.mjs from-spec SPEC.tla [--fixed FIXED.tla | --against AGREED.tla] [--label TEXT] [--map FILE] [--expect-broken RULE]... [--title TEXT] [--out DIR] [--png]",
  "from-chart":
    "node statechart.mjs from-chart CHART.mmd [--module NAME] [--expect-broken RULE]... [--title TEXT] [--out DIR] [--png]",
};
const usage = (lines) => `Usage: ${lines.join("\n       ")}`;

const FROM_SPEC = `from-spec SPEC.tla
  Checks each INVARIANT in SPEC.cfg in a separate TLC run. TLC stops at the first rule that a state
  breaks, and the separate runs find the rest. Each run also has the rule as a CONSTRAINT, so TLC
  stops each path at its first state that breaks the rule, and a rule that stays broken reports
  only the step that broke it. SPEC.cfg sits next to the spec and has SPECIFICATION and one
  INVARIANT line per rule. One more run dumps the state graph, and then the command draws the
  charts. TLC names each step after the innermost named action that takes it, so give each kind of
  step its own named action. The command warns when steps carry the name of the whole next-state
  action.

  --fixed FIXED.tla  The model of the open fix. It is a copy of the spec with its own file and
                     module name, such as SpecFixed.tla with MODULE SpecFixed. The command checks
                     it the same way, with FIXED.cfg, or with SPEC.cfg when there is no FIXED.cfg.
                     The charts then mark each bad state fixed or still wrong.
  --against AGREED.tla
                     The spec that SPEC.tla must follow, when SPEC.tla models the code. It needs
                     its own file and module name. The command checks it with AGREED.cfg, or with
                     SPEC.cfg when there is no AGREED.cfg. SPEC.tla may add variables, record
                     fields, and actions that AGREED.tla does not have. The comparison leaves them
                     out. Do not use it with --fixed.
  --label TEXT       The name of the --fixed or --against model in the charts and the stories.
                     Default: "the fix", or "the spec".
  --map FILE         The labels for each model state and step. Default: SPEC.map.mjs next to the
                     spec. When the file does not exist, the command writes one to fill in and
                     exits 2. Its comments say what each function gets.`;

const FROM_CHART = `from-chart CHART.mmd
  Writes NAME.tla, NAME.cfg, and NAME.map.mjs next to the chart. When NAME.tla already exists, it
  writes none of them. Then it checks the spec as from-spec does, and compares the chart that the
  spec draws with CHART.mmd.

  --module NAME      The TLA+ module name. Default: the chart's file name in CamelCase, such as
                     NotesApp for notes-app.mmd.

  The chart is a Mermaid stateDiagram-v2. Each transition label is one action. For parallel
  regions, split one top-level composite with --, and put each part in a named composite, such as
  state Connection { ... }. Each region is one variable. A step moves every region whose current
  state has a transition with the step's label, and the other regions stay where they are. Each
  rule is one comment line:
    %% never NAME: A & B -- the rule in one sentence
  Each name after the colon is a state caption or a composite, and each comes from a different
  region. A composite stands for every state in it. The command refuses final, choice, fork, and
  history states, and regions below the top level.`;

const COMMON = `Both commands
  --expect-broken RULE
                     A rule that is known to break. Repeat it. The command then exits 0 when
                     exactly these rules break, and the --fixed or --against model breaks no other
                     rule.
  --title TEXT       The chart title. Each bug chart adds ", bug N".
  --out DIR          The output folder. Default: NAME-statechart next to the input.
  --png              Also render each chart to PNG with npx @mermaid-js/mermaid-cli.
  -h, --help         Print this help, and exit 0.

Output
  The command prints whether each rule holds, the chart's counts, and one story per bug.
  from-chart also prints the comparison. The command writes these files in the output folder:
  chart.mmd          The overview.
  bug-N.mmd          Only the steps of bug N, numbered. Bugs are numbered by fewest reader steps,
                     then fewest model steps, then rule name, then cause. Bugs that only the
                     --fixed or --against model has come last.
  bug-N-developer.mmd, bug-N-layered.mmd
                     The path of bug N through the developer's states, when the mapping exports
                     detail().
  stories.md         One entry per bug: the rule, why it breaks, the shortest path in reader
                     steps, and what the --fixed or --against model does instead.
  summary.json       The counts behind the chart.
  tlc/               The config and the TLC output of each run. When the overview has regions,
                     from-spec also writes tlc/regions-all.mmd, the regions with every arrow, and
                     tlc/regions-proof.mmd, every state and step of TLC's graph in one region.
                     compare-charts.mjs tlc/regions-all.mmd tlc/regions-proof.mmd repeats the
                     proof.
  *.png              Each chart as a PNG, with --png.

Reading a chart
  from-spec draws the overview as two parallel regions when every state reads "context: progress":
  the contexts on one side, the progress on the other, both at the same time. It does so only when
  that has fewer states, and when the regions combine back into exactly every state and step of
  TLC's graph. Otherwise it puts the states of one context in a box named context, and prints why.
  Regions draw only the arrows of the shortest way to each state, of each bug path, and of the
  nearest step with each label. The script checks that these arrows make no step that TLC's graph
  does not have.
  An arrow from a box's border leaves from every state in the box.
  In regions, a step leaves every region that has it. "[when A]" or "[unless A]" says which states
  of the other region the step needs. A loop says the region may also stay.
  Other words in [ ] come from the mapping's guard(), and "after N s" from its timer(). TLC does
  not check them, and has no clock, so a reviewer checks them against the code.
  Gray states work. Red states break a rule. With --fixed, red states stay wrong with the fix, and
  green states are fixed by it or exist only with it. With --against, red states break a rule in
  either model, and green states exist only in the spec.
  When the mapping exports group(), the fill is the state's group, which the legend names, and the
  status is a thick red or green border on top. tlc-to-chart.mjs --help tells more.
  A state is bad when it breaks a rule, or when every path from the start to it passes a state
  that breaks one. TLC stops each path at the first state that breaks the rule, so a rule that
  stays broken colors only the states where it first breaks and the states after them that no
  path without a bug reaches.
  A thick blue border and numbered labels mark the bug. Mermaid state diagrams cannot color an
  edge.
  A label "with the fix, STEP" or "in the spec, STEP" is a step that only the other model takes. On
  a bug's path it leaves the state before the first step that the other model shows the reader
  differently, and ends where that model goes instead. "with the fix, STEP cannot happen" or "in
  the spec, STEP cannot happen" loops on the state where that model stops the step. Outside
  regions, two states have at most one arrow between them. Its lines are the numbered steps, then
  SPEC.tla's steps, then the other model's steps, with a blank line between each group.
  An edge lists every step that takes it, most common first. Words that the steps share at the
  start are written once, as in "you tap Pay or Back".

Regenerate
  With --expect-broken, one script rebuilds every chart and stops on any change:
    set -e
    node statechart.mjs from-spec Code.tla --against Agreed.tla --expect-broken NoLostUpload --png

TLC
  TLA2TOOLS is the path to tla2tools.jar, and JAVA is the java binary (default: java, Java 11 or
  later). Download tla2tools.jar from https://github.com/tlaplus/tlaplus/releases. When TLA2TOOLS
  is not set, the command says where to get TLC and exits 2.

Exit codes
  0  Every rule holds, or exactly the --expect-broken rules break. from-chart also draws CHART.mmd
     back unchanged.
  1  Another rule is broken, an expected rule holds, or the chart that the spec draws is not
     CHART.mmd. The output says which.
  2  The command cannot finish: a bad argument, a missing file, a chart or TLC output that it
     cannot read, no TLC, a new mapping to fill in, or a chart that --png cannot render. When a
     chart does not render, the command keeps the files it wrote and exits 2, whatever the rules
     give.`;

const HELP = {
  "": `${usage([...Object.values(USAGE), "node statechart.mjs [from-spec|from-chart] --help"])}

Draws a Mermaid statechart of what an app's user sees, from TLC's state graph of a TLA+ spec. The
help calls that user the reader.

${FROM_SPEC}

${FROM_CHART}

${COMMON}`,
  "from-spec": `${usage([USAGE["from-spec"]])}\n\n${FROM_SPEC}\n\n${COMMON}`,
  "from-chart": `${usage([USAGE["from-chart"]])}\n\n${FROM_CHART}\n\n${COMMON}`,
};

const more = (cmd) =>
  `Run node statechart.mjs ${cmd ? `${cmd} ` : ""}--help for the flags, the output, and the exit codes.`;

class CannotFinish extends Error {}

const COMMANDS = {
  "from-spec": {
    flags: ["--map", "--fixed", "--against", "--label", "--expect-broken", "--title", "--out"],
    run: fromSpec,
  },
  "from-chart": { flags: ["--module", "--expect-broken", "--title", "--out"], run: fromChart },
};

function parseArgs([command, ...rest]) {
  if (command === "-h" || command === "--help") return { help: HELP[""] };
  if (!Object.hasOwn(COMMANDS, command))
    throw new CannotFinish(`${usage(Object.values(USAGE))}\n${more()}`);
  const flags = { "expect-broken": new Set() };
  let input;
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === "-h" || a === "--help") return { help: HELP[command] };
    if (a === "--png") flags.png = true;
    else if (COMMANDS[command].flags.includes(a)) {
      if (i + 1 === rest.length) throw new CannotFinish(`${a} needs a value. ${more(command)}`);
      const name = a.slice(2);
      if (flags[name] instanceof Set) flags[name].add(rest[++i]);
      else flags[name] = rest[++i];
    } else if (!a.startsWith("-") && input === undefined) input = a;
    else throw new CannotFinish(`unknown argument ${a}. ${more(command)}`);
  }
  if (input === undefined) throw new CannotFinish(`${usage([USAGE[command]])}\n${more(command)}`);
  return { command, input, flags };
}

const rel = (file) => path.relative(process.cwd(), file) || ".";
const cfgOf = (spec) => spec.replace(/\.tla$/, ".cfg");

function findTools() {
  try {
    return findTlc();
  } catch (e) {
    throw new CannotFinish(e.message);
  }
}

function script(name, scriptArgs, about, { okExits = [0] } = {}) {
  const r = spawnSync(process.execPath, [path.join(here, name), ...scriptArgs], {
    encoding: "utf8",
  });
  if (okExits.includes(r.status)) return r;
  const thrown = r.stderr.match(/^Error: (.*)$/m)?.[1];
  throw new CannotFinish(thrown ? `${rel(about)}: ${thrown}` : r.stderr.trim());
}

const KEYWORD =
  /^(SPECIFICATION|INIT|NEXT|CONSTANTS?|INVARIANTS?|PROPERTY|PROPERTIES|SYMMETRY|VIEW|CONSTRAINTS?|ACTION_CONSTRAINTS?|CHECK_DEADLOCK|POSTCONDITION|ALIAS)$/;

function splitRules(cfg) {
  const words = cfg
    .replace(/\(\*[^]*?\*\)/g, " ")
    .replace(/\\\*.*/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const kept = [];
  const rules = [];
  let section = "";
  for (const w of words) {
    if (KEYWORD.test(w)) section = w;
    if (!/^INVARIANTS?$/.test(section)) kept.push(KEYWORD.test(w) && kept.length ? `\n${w}` : w);
    else if (w !== section && !rules.includes(w)) rules.push(w);
  }
  return { cfgWithoutRules: `${kept.join(" ")}\n`, rules };
}

function tlc(tools, spec, cfg, base, dump) {
  fs.writeFileSync(`${base}.cfg`, cfg);
  const metadir = fs.mkdtempSync(path.join(os.tmpdir(), "tlc-"));
  // -deadlock: a UI at rest has nothing left to do, which TLC would report as a deadlock.
  const r = spawnSync(
    tools.java,
    [
      "-cp",
      tools.jar,
      "tlc2.TLC",
      "-metadir",
      metadir,
      "-deadlock",
      "-continue",
      ...(dump ? ["-dump", "dot,actionlabels", path.resolve(dump)] : []),
      "-config",
      path.resolve(`${base}.cfg`),
      path.basename(spec),
    ],
    { cwd: path.dirname(path.resolve(spec)), encoding: "utf8", maxBuffer: 1 << 30 },
  );
  fs.rmSync(metadir, { recursive: true, force: true });
  if (r.error) throw new CannotFinish(`cannot run TLC: ${r.error.message}`);
  fs.writeFileSync(`${base}.out`, r.stdout);
  try {
    checkTlcOutput(r.stdout, rel(`${base}.out`));
  } catch (e) {
    throw new CannotFinish(e.message);
  }
  return r.stdout;
}

function warnUnnamedSteps(spec, cfg, dot) {
  const text = fs
    .readFileSync(spec, "utf8")
    .replace(/\(\*[^]*?\*\)/g, " ")
    .replace(/\\\*.*/g, " ");
  const specName = /^SPECIFICATION\s+(\w+)/m.exec(cfg)?.[1];
  const specBody = specName && new RegExp(`^${specName}\\s*==(.*(\\n[ \\t]+.*)*)`, "m").exec(text);
  const next =
    /^NEXT\s+(\w+)/m.exec(cfg)?.[1] ?? /\[\]\s*\[\s*(\w+)\s*\]_/.exec(specBody?.[1] ?? text)?.[1];
  const graph = parseDot(fs.readFileSync(dot, "utf8"));
  const unnamed = [...graph.edges, ...graph.loops].filter((e) => e.action === next).length;
  if (unnamed > 0)
    console.error(
      `${rel(spec)}: ${unnamed} ${unnamed === 1 ? "step has" : "steps have"} the name ${next}, the whole next-state action, because TLC names a step after the innermost named action that takes it. If the reader must tell these steps apart, give each part of ${next} its own name, as in Pay == ... and ${next} == Pay \\/ Charge.`,
    );
}

function readModel(spec, cfgFile) {
  if (!fs.existsSync(spec)) throw new CannotFinish(`${rel(spec)} does not exist`);
  if (!fs.existsSync(cfgFile))
    throw new CannotFinish(
      `${rel(cfgFile)} does not exist. It needs SPECIFICATION and one INVARIANT line per rule.`,
    );
  return { spec, cfgFile, ...splitRules(fs.readFileSync(cfgFile, "utf8")) };
}

function readInput(spec, expected) {
  const model = readModel(spec, cfgOf(spec));
  const unknown = [...expected].filter((r) => !model.rules.includes(r));
  if (unknown.length)
    throw new CannotFinish(
      `--expect-broken ${unknown.join(", ")}: not a rule in ${rel(model.cfgFile)}, whose rules are ${model.rules.join(", ") || "none"}.`,
    );
  return model;
}

function check(tools, { spec, cfgFile, cfgWithoutRules, rules }, out, expected) {
  const name = path.basename(spec, ".tla");
  const tlcDir = path.join(out, "tlc");
  const dot = path.join(tlcDir, `${name}.dot`);
  tlc(tools, spec, cfgWithoutRules, path.join(tlcDir, name), dot);
  warnUnnamedSteps(spec, cfgWithoutRules, dot);
  console.log(`TLC on ${path.basename(spec)}:`);
  if (rules.length === 0)
    console.log(`  ${path.basename(cfgFile)} has no INVARIANT, so no rule is checked.`);
  // With -continue TLC reports every bad state. The CONSTRAINT stops each path at its first bad
  // state, so a rule that stays broken reports only the step that broke it, not every later state.
  const traces = rules.map((rule) => {
    const file = path.join(tlcDir, `${name}-${rule}`);
    const cfg = `${cfgWithoutRules}INVARIANT ${rule}\nCONSTRAINT ${rule}\n`;
    const broken = /^Error: Invariant /m.test(tlc(tools, spec, cfg, file));
    console.log(
      `  ${rule} ${broken ? (expected.has(rule) ? "is broken (expected)" : "is broken") : "holds"}.`,
    );
    return { file: `${file}.out`, rule, broken };
  });
  return { spec, dot, traces, broken: traces.some((t) => t.broken) };
}

function rulesAsExpected(now, other, expected) {
  const brokenIn = (m) => (m?.traces ?? []).filter((t) => t.broken).map((t) => t.rule);
  if (expected.size === 0) return !now.broken && !other?.broken;
  const unexpected = [...new Set([...brokenIn(now), ...brokenIn(other)])].filter(
    (r) => !expected.has(r),
  );
  const holds = [...expected].filter((r) => !brokenIn(now).includes(r));
  if (unexpected.length) console.log(`\nBroken but not expected: ${unexpected.join(", ")}.`);
  if (holds.length) console.log(`\nExpected to break but holds: ${holds.join(", ")}.`);
  if (!unexpected.length && !holds.length)
    console.log(`\nBroken as expected: ${[...expected].join(", ")}.`);
  return !unexpected.length && !holds.length;
}

const SCAFFOLD = (name, graph) => {
  const vars = Object.keys([...graph.nodes.values()][0]?.vars ?? {});
  const actions = [...new Set([...graph.edges, ...graph.loops].map((e) => e.action))].sort();
  return `// Chart labels for ${name}, for statechart.mjs. Write labels in plain words, not variable or action names.
// v, before, and after map each variable to its value. Strings, numbers, and booleans keep their kind.
// Sequences, tuples, and sets become arrays, indexed from 0. Records and functions become objects.
// Variables: ${vars.join(", ")}.

// The actions the reader takes. facts.settled is true when only these are enabled, and the overview
// keeps the shortest path to each settled state, plus every bug path.
export const readerActions = [];

// The label for one model state. facts.enabled is the set of actions the state enables,
// including steps that change no variable. Write it as "context: progress", such as
// "Offline: upload queued": the chart puts the states of one context in one box.
// Do not claim a result that a pending step can still change, such as "upload failed" while a
// retry is still queued.
export function state(v, facts) {
	return JSON.stringify(v);
}

// The names of the two parallel regions, when the overview draws them: contexts, then progress.
// export const regionNames = ["Network", "What happened to the file"];

// The group of one model state, in words the reader sees, such as "Upload done". The chart fills
// the states of one group with one color, and the legend names the groups. TLC still decides
// which states break a rule, and draws them with a thick red border on top of the group color.
// groupColors gives a group a light color. Groups without one take a palette color.
// export function group(v, facts) {}
// export const groupColors = { "Upload done": "#d1f2eb" };

// The label for one step. A step that leaves the reader in the same state is not drawn,
// unless the reader takes it on a bug path. "" draws no label, and a numbered bug step shows the action.
const STEPS = {
${actions.map((a) => `\t${a}: ${JSON.stringify(a)},`).join("\n")}
};
export function step(action, before, after) {
	return STEPS[action] ?? action;
}

// When the step can happen, in plain words, such as "offline or disk full". The chart shows
// "step [words]". "" adds nothing.
// export function guard(action, before, after) {}

// For a timer step, how many seconds the code waits, from the constant in the code. The chart
// shows "after N s, step". Return nothing for other steps.
// export function timer(action, before, after) {}

// Why a bad state is bad, in words a product manager reads, such as "the laptop went offline, and
// the app drops an upload it cannot send". No variable, function, or event names.
// Counterexamples that break one rule with one cause are one bug, so two bugs that end on the
// same screen stay apart only if their causes differ. Return null to group by the end state.
// export function cause(v, facts, invariant) {}

// The developer's words for one model state. With it, each bug is also drawn through these states.
// export function detail(v, facts) {}

// The legend's words for each status, in place of the defaults. Group entries keep their names.
// export const legend = { works: "Works on main", wrong: "Wrong on main", fixed: "Fixed in the open PR" };
`;
};

async function draw({ now, other, map, out, title, comparing }) {
  const mapping = await import(pathToFileURL(path.resolve(map)).href);
  const from = ["--dot", now.dot, "--map", map, "--spec", now.spec];
  from.push(...now.traces.flatMap((t) => ["--traces", t.file]));
  if (other) {
    from.push(`--${other.role}-dot`, other.dot, "--spec", other.spec);
    from.push(...other.traces.flatMap((t) => [`--${other.role}-traces`, t.file]));
    if (other.label !== undefined) from.push("--label", other.label);
  }
  if (comparing) from.push("--full-labels", "--flat");
  else if (mapping.readerActions?.length) from.push("--cover");
  const titled = (suffix) => (title ? ["--title", `${title}${suffix}`] : []);
  for (const f of fs.readdirSync(out))
    if (/^bug-\d+(-developer|-layered)?\.(mmd|png)$/.test(f)) fs.rmSync(path.join(out, f));

  const files = {
    overview: path.join(out, "chart.mmd"),
    stories: path.join(out, "stories.md"),
    summary: path.join(out, "summary.json"),
  };
  const proof = path.join(out, "tlc", "regions-proof.mmd");
  const everyArrow = path.join(out, "tlc", "regions-all.mmd");
  for (const f of [proof, everyArrow]) fs.rmSync(f, { force: true });
  script(
    "tlc-to-chart.mjs",
    [
      ...from,
      ...(comparing ? [] : ["--regions", "--proof", proof, "--regions-all", everyArrow]),
      ...titled(""),
      "--highlight",
      "0",
      "--out",
      files.overview,
      "--story",
      files.stories,
      "--summary",
      files.summary,
    ],
    map,
  );
  const summary = JSON.parse(fs.readFileSync(files.summary, "utf8"));
  const charts = [files.overview];
  for (const c of summary.classes) {
    const views = typeof mapping.detail === "function" ? ["", "-developer", "-layered"] : [""];
    for (const view of views) {
      const file = path.join(out, `bug-${c.n}${view}.mmd`);
      const shape = [...(view ? ["--view", view.slice(1)] : []), "--path-only"];
      script(
        "tlc-to-chart.mjs",
        [...from, ...shape, ...titled(`, bug ${c.n}`), "--highlight", String(c.n), "--out", file],
        map,
      );
      charts.push(file);
    }
  }

  const { works, wrong, fixed: fixedCount } = summary.chartStatus;
  const L = summary.second?.label;
  console.log(
    `\nChart: ${summary.chartStates} states and ${summary.chartTransitions} transitions from ${summary.modelStates} model states.`,
  );
  const r = summary.regions;
  if (r?.drawn)
    console.log(
      `It has 2 parallel regions, of ${r.states[0]} and ${r.states[1]} states. Proof: their ${r.all} arrows together make exactly the ${r.flat.states} states and ${r.flat.transitions} labeled steps of ${rel(proof)}, and the ${r.transitions} drawn arrows make only steps among them. ${rel(everyArrow)} has all ${r.all} arrows.`,
    );
  else if (r) console.log(`It has no parallel regions, because ${r.why}.`);
  const breaks = `${wrong} ${wrong === 1 ? "breaks" : "break"} a rule`;
  console.log(
    other?.role === "fixed"
      ? `${works} work today, ${wrong} still wrong with ${L}, ${fixedCount} fixed or new with ${L}.\n`
      : other?.role === "against"
        ? `${works} work, ${breaks}, ${fixedCount} only in ${L}.\n`
        : `${works} work, ${breaks}.\n`,
  );
  if (summary.codeLike.length)
    console.log(
      `These labels or causes read like code. Write them in the reader's words in ${rel(map)}:\n${summary.codeLike.map((t) => `  ${t}`).join("\n")}\n`,
    );
  console.log(
    summary.classes.length
      ? fs.readFileSync(files.stories, "utf8").trimEnd()
      : "No rule is broken.",
  );
  return { files, charts };
}

function render(charts) {
  const pngs = [];
  for (const chart of charts) {
    const png = chart.replace(/\.mmd$/, ".png");
    const r = spawnSync(
      "npx",
      ["-y", "@mermaid-js/mermaid-cli", "-i", chart, "-o", png, "-s", "2"],
      {
        encoding: "utf8",
      },
    );
    if (r.status === 0) pngs.push(png);
    else
      console.error(
        `could not render ${rel(chart)}: ${(r.stderr || r.error?.message || "").trim()}`,
      );
  }
  return pngs;
}

function finish(out, { files, charts }, ok, png) {
  const pngs = png ? render(charts) : [];
  const written = [...charts, ...pngs, files.stories, files.summary]
    .map((f) => path.basename(f))
    .join(", ");
  console.log(`\nWrote ${written} in ${rel(out)}.`);
  if (png && pngs.length < charts.length) return 2;
  return ok ? 0 : 1;
}

function outDir(flagged, input, name) {
  const out = flagged ?? path.join(path.dirname(input), `${name}-statechart`);
  fs.mkdirSync(path.join(out, "tlc"), { recursive: true });
  return out;
}

function secondModel(input, { fixed, against, label }) {
  if (fixed && against)
    throw new CannotFinish(`use --fixed or --against, not both. ${more("from-spec")}`);
  if (!fixed && !against) {
    if (label === undefined) return null;
    throw new CannotFinish(
      `--label names the --fixed or --against model; it needs one of them. ${more("from-spec")}`,
    );
  }
  const [role, spec] = fixed ? ["fixed", fixed] : ["against", against];
  const name = path.basename(input, ".tla");
  // TLC's output files are named after the spec, so a second model with the same name overwrites them.
  if (path.basename(spec, ".tla") === name)
    throw new CannotFinish(
      `${rel(spec)} needs its own file and module name, such as ${name}${fixed ? "Fixed" : "Agreed"}.tla.`,
    );
  return { role, spec, label };
}

async function fromSpec(input, { "expect-broken": expected, ...flags }) {
  const second = secondModel(input, flags);
  const tools = findTools();
  const name = path.basename(input, ".tla");
  const out = outDir(flags.out, input, name);
  const map = flags.map ?? path.join(path.dirname(input), `${name}.map.mjs`);
  const now = check(tools, readInput(input, expected), out, expected);
  if (!fs.existsSync(map)) {
    fs.writeFileSync(map, SCAFFOLD(name, parseDot(fs.readFileSync(now.dot, "utf8"))));
    throw new CannotFinish(`\nWrote ${rel(map)}. Fill in its labels, then run this command again.`);
  }
  let other = null;
  if (second) {
    const { role, spec, label } = second;
    const cfg = fs.existsSync(cfgOf(spec)) ? cfgOf(spec) : cfgOf(input);
    other = { role, label, ...check(tools, readModel(spec, cfg), out, expected) };
  }
  const drawn = await draw({ now, other, map, out, title: flags.title });
  return finish(out, drawn, rulesAsExpected(now, other, expected), flags.png);
}

async function fromChart(input, { "expect-broken": expected, ...flags }) {
  const name =
    flags.module ??
    path
      .basename(input, path.extname(input))
      .replace(/(^|[^A-Za-z0-9]+)([A-Za-z0-9])/g, (_, __, c) => c.toUpperCase());
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name))
    throw new CannotFinish(`cannot make a TLA+ module name from ${input}; add --module NAME`);
  const spec = path.join(path.dirname(input), `${name}.tla`);
  if (fs.existsSync(spec)) {
    console.log(`Kept ${rel(spec)}. Delete it to write the spec again from ${rel(input)}.`);
  } else {
    script("chart-to-tla.mjs", [input, "--module", name], input);
    console.log(`Wrote ${name}.tla, ${name}.cfg, and ${name}.map.mjs from ${rel(input)}.`);
  }
  const tools = findTools();
  const out = outDir(flags.out, input, name);
  const now = check(tools, readInput(spec, expected), out, expected);
  const drawn = await draw({
    now,
    map: spec.replace(/\.tla$/, ".map.mjs"),
    out,
    title: flags.title,
    comparing: true,
  });
  const compared = script("compare-charts.mjs", [input, drawn.files.overview], input, {
    okExits: [0, 1],
  });
  if (compared.status === 0) console.log(`\nThe spec draws ${rel(input)} back unchanged.`);
  else
    console.log(
      `\nThe spec does not draw ${rel(input)}:\n${compared.stdout.trimEnd().replace(/^/gm, "  ")}`,
    );
  return finish(
    out,
    drawn,
    rulesAsExpected(now, null, expected) && compared.status === 0,
    flags.png,
  );
}

try {
  const { help, command, input, flags } = parseArgs(process.argv.slice(2));
  if (help) {
    console.log(help);
    process.exit(0);
  }
  process.exit(await COMMANDS[command].run(input, flags));
} catch (e) {
  if (!(e instanceof CannotFinish)) throw e;
  console.error(e.message);
  process.exit(2);
}
