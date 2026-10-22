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
    "node statechart.mjs from-spec SPEC.tla [--config FILE] [--fixed FIXED.tla [--fixed-config FILE] | --against AGREED.tla [--against-config FILE]] [--label TEXT] [--map FILE] [--expect-broken RULE]... [--title TEXT] [--out DIR] [--png]",
  "from-chart":
    "node statechart.mjs from-chart CHART.mmd [--module NAME] [--expect-broken RULE]... [--title TEXT] [--out DIR] [--png]",
};
const usage = (lines) => `Usage: ${lines.join("\n       ")}`;

const FROM_SPEC = `from-spec SPEC.tla
  Checks each INVARIANT in SPEC.cfg in a separate TLC run. TLC stops at the first rule that a state
  breaks, and the separate runs find the rest. Each run also has the rule as a CONSTRAINT, so TLC
  stops each path at its first state that breaks the rule, and a rule that stays broken reports
  only the step that broke it. SPEC.cfg has SPECIFICATION and one INVARIANT line per rule. Each
  PROPERTY, a rule about whole behaviors, gets one TLC run too, and the charts do not draw it. One
  more run dumps the state graph, and then the command draws the charts. TLC names each step after
  the innermost named action that takes it, so give each kind of step its own named action. The
  command warns when steps carry the name of the whole next-state action. The command prints the
  config that it checks each model with, and stops when a config does not exist, with the configs
  beside the spec.

  --config FILE      The config for SPEC.tla. Default: SPEC.cfg next to the spec.
  --fixed FIXED.tla  The model of the open fix. It is a copy of the spec with its own file and
                     module name, such as SpecFixed.tla with MODULE SpecFixed. The command checks
                     it the same way, with FIXED.cfg, or with the config of SPEC.tla when there is
                     no FIXED.cfg. The charts then mark each bad state fixed or still wrong.
  --fixed-config FILE
                     The config for FIXED.tla.
  --against AGREED.tla
                     The spec that SPEC.tla must follow, when SPEC.tla models the code. It needs
                     its own file and module name. The command checks it with AGREED.cfg, and
                     never with the config of SPEC.tla. SPEC.tla may add variables, record fields,
                     and actions that AGREED.tla does not have. The comparison leaves them out.
                     Do not use it with --fixed.
  --against-config FILE
                     The config for AGREED.tla, when it is not AGREED.cfg. Give the config that the
                     spec's authors say the unchanged spec passes. A rule that this config does not
                     check is "not checked" in the stories.
  --label TEXT       The name of the --fixed or --against model in the charts and the stories.
                     Default: "the fix", or "the spec".
  --map FILE         The labels for each model state and step. Default: SPEC.map.mjs next to the
                     spec. When the file does not exist, the command writes one from the spec's
                     VARIABLES and actions to fill in, and exits 2 before it runs TLC. Its
                     comments say what each function gets.`;

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
                     An INVARIANT or PROPERTY that is known to break. Repeat it, or list rules
                     with commas, as in A,B. The command then exits 0 when exactly these rules
                     break, and the --fixed or --against model breaks no other rule.
  --title TEXT       The chart title. Each bug chart adds ", bug N".
  --out DIR          The output folder. Default: NAME-statechart next to the input. A run writes its
                     files in a temporary folder, and then replaces the whole output folder with
                     it. When runs overlap, the output folder has the files of the run that
                     finished last. The command does not use an output folder that has files that
                     it did not write. On a filesystem that cannot rename, the command copies the
                     files into place, and overlapping runs can mix their files.
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
  *.png              Each chart as a PNG, with --png. A run without --png deletes them.

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
  TLC checks each rule with one worker per CPU. When a rule is broken, TLC checks it again with one
  worker, which finds the shortest bug paths, the same on every run. The command then prints how
  many times TLC ran and how long that took.
  TLC can find that a rule is broken and then fail with a Java exception while it reports the rule.
  The command then keeps the paths that TLC printed, marks the rule broken, and warns that the
  charts can miss states that break it. The failure is in TLC, so do not weaken the rule because of
  it. A smaller constant can let TLC finish.

Exit codes
  0  Every rule holds, or exactly the --expect-broken rules break. from-chart also draws CHART.mmd
     back unchanged.
  1  Another rule is broken, an expected rule holds, or the chart that the spec draws is not
     CHART.mmd. The output says which.
  2  The command cannot finish: a bad argument, a missing file, a chart or TLC output that it
     cannot read, no TLC, a helper script that cannot start, an output folder with files that the
     command did not write, an input file that changed during the run, a new mapping to fill in,
     or a chart that --png cannot render. When a chart does not render, the command keeps the
     files it wrote and exits 2, whatever the rules give. Otherwise, exit 2 does not change the
     output folder, unless the command moved it aside and cannot put it back. Then the message
     names the folder's new path. When TLC stops on an error, the message names TLC's output, in a
     temporary folder that the command keeps. When the command cannot put its files in the output
     folder, it keeps them in a temporary folder, and the message names it. The command checks
     its input files again before --png renders, so a changed input stops the run before that.`;

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
class TlcStopped extends CannotFinish {}
class NotPublished extends CannotFinish {}

const COMMANDS = {
  "from-spec": {
    flags: [
      "--map",
      "--config",
      "--fixed",
      "--fixed-config",
      "--against",
      "--against-config",
      "--label",
      "--expect-broken",
      "--title",
      "--out",
    ],
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
      if (flags[name] instanceof Set) for (const v of rest[++i].split(",")) flags[name].add(v);
      else flags[name] = rest[++i];
    } else if (!a.startsWith("-") && input === undefined) input = a;
    else throw new CannotFinish(`unknown argument ${a}. ${more(command)}`);
  }
  if (input === undefined) throw new CannotFinish(`${usage([USAGE[command]])}\n${more(command)}`);
  return { command, input, flags };
}

const rel = (file) => {
  const r = path.relative(process.cwd(), file) || ".";
  return r === ".." || r.startsWith(`..${path.sep}`) ? path.resolve(file) : r;
};
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
  if (r.error) throw new CannotFinish(`cannot run ${name}: ${r.error.message}`);
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
  const properties = [];
  let section = "";
  for (const w of words) {
    if (KEYWORD.test(w)) section = w;
    const list = /^INVARIANTS?$/.test(section)
      ? rules
      : /^PROPERT(Y|IES)$/.test(section)
        ? properties
        : null;
    if (!list) kept.push(KEYWORD.test(w) && kept.length ? `\n${w}` : w);
    else if (w !== section && !list.includes(w)) list.push(w);
  }
  return { cfgWithoutRules: `${kept.join(" ")}\n`, rules, properties };
}

function tlc(tools, spec, cfg, base, { dump, workers = "1" } = {}) {
  fs.writeFileSync(`${base}.cfg`, cfg);
  const metadir = fs.mkdtempSync(path.join(os.tmpdir(), "tlc-"));
  // TLC writes the standard modules, such as Naturals.tla, to java.io.tmpdir under fixed names,
  // so runs that share that folder can read a module while another run rewrites it.
  const javaTmp = path.join(metadir, "tmp");
  fs.mkdirSync(javaTmp);
  // -deadlock: a UI at rest has nothing left to do, which TLC would report as a deadlock.
  const r = spawnSync(
    tools.java,
    [
      "-XX:+UseParallelGC",
      `-Djava.io.tmpdir=${javaTmp}`,
      "-cp",
      tools.jar,
      "tlc2.TLC",
      "-workers",
      workers,
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
    return { stdout: r.stdout, warning: checkTlcOutput(r.stdout, `${base}.out`) };
  } catch (e) {
    throw new TlcStopped(e.message);
  }
}

const withoutComments = (spec) =>
  fs
    .readFileSync(spec, "utf8")
    .replace(/\(\*[^]*?\*\)/g, " ")
    .replace(/\\\*.*/g, " ");

function warnUnnamedSteps(spec, cfg, dot) {
  const text = withoutComments(spec);
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

function readModel(spec, cfgFile, flag) {
  if (!fs.existsSync(spec)) throw new CannotFinish(`${rel(spec)} does not exist`);
  if (!fs.existsSync(cfgFile)) {
    const beside = fs
      .readdirSync(path.dirname(spec))
      .filter((f) => f.endsWith(".cfg"))
      .sort();
    throw new CannotFinish(
      `${rel(cfgFile)} does not exist. Pass ${flag} with the config to check ${path.basename(spec)} with. ${
        beside.length
          ? `The configs beside it: ${beside.join(", ")}.`
          : "A config has SPECIFICATION and one INVARIANT line per rule."
      }`,
    );
  }
  return { spec, cfgFile, ...splitRules(fs.readFileSync(cfgFile, "utf8")) };
}

function readInput(spec, cfgFile, expected) {
  const model = readModel(spec, cfgFile, "--config");
  const names = [...model.rules, ...model.properties];
  const unknown = [...expected].filter((r) => !names.includes(r));
  if (unknown.length)
    throw new CannotFinish(
      `--expect-broken ${unknown.join(", ")}: not a rule in ${rel(model.cfgFile)}, whose rules are ${names.join(", ") || "none"}.`,
    );
  return model;
}

function check(tools, model, { work, out }, expected) {
  const { spec, cfgFile, cfgWithoutRules, rules, properties } = model;
  const started = Date.now();
  let runs = 0;
  const run = (cfg, file, options) => {
    runs++;
    return tlc(tools, spec, cfg, file, options);
  };
  const name = path.basename(spec, ".tla");
  const tlcDir = path.join(work, "tlc");
  const dot = path.join(tlcDir, `${name}.dot`);
  // One worker writes the graph in a fixed order, which breaks ties between equally short paths.
  run(cfgWithoutRules, path.join(tlcDir, name), { dump: dot });
  warnUnnamedSteps(spec, cfgWithoutRules, dot);
  console.log(`TLC on ${path.basename(spec)} with ${rel(cfgFile)}:`);
  if (rules.length === 0)
    console.log(
      `  ${path.basename(cfgFile)} has no INVARIANT, so ${properties.length ? "the chart marks no state broken" : "no rule is checked"}.`,
    );
  const said = (rule, broken) =>
    `  ${rule} ${broken ? (expected.has(rule) ? "is broken (expected)" : "is broken") : "holds"}.`;
  const shown = (file) => rel(path.join(out, "tlc", path.basename(file)));
  // With -continue TLC reports every bad state. The CONSTRAINT stops each path at its first bad
  // state, so a rule that stays broken reports only the step that broke it, not every later state.
  const traces = rules.map((rule) => {
    const file = path.join(tlcDir, `${name}-${rule}`);
    const cfg = `${cfgWithoutRules}INVARIANT ${rule}\nCONSTRAINT ${rule}\n`;
    let result = run(cfg, file, { workers: "auto" });
    // Several workers can reach a bad state by a longer path first. One worker searches breadth
    // first in a fixed order, so the chart's bug paths are the shortest, and the same every run.
    if (/^Error: Invariant /m.test(result.stdout)) result = run(cfg, file);
    const broken = /^Error: Invariant /m.test(result.stdout);
    console.log(said(rule, broken));
    if (result.warning) console.error(`${shown(`${file}.out`)}: ${result.warning}`);
    return { file: `${file}.out`, rule, broken };
  });
  const temporal = properties.map((property) => {
    const file = path.join(tlcDir, `${name}-${property}`);
    const { stdout } = run(`${cfgWithoutRules}PROPERTY ${property}\n`, file, { workers: "auto" });
    const broken = /^Error: Temporal properties were violated/m.test(stdout);
    console.log(
      `${said(property, broken)}${broken ? ` The chart draws only INVARIANT rules, so read TLC's counterexample in ${shown(`${file}.out`)}.` : ""}`,
    );
    return { file: `${file}.out`, rule: property, broken };
  });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`  TLC ran ${runs} ${runs === 1 ? "time" : "times"} in ${seconds} s.`);
  const broken = [...traces, ...temporal].some((t) => t.broken);
  return { spec, dot, traces, properties: temporal, broken };
}

function rulesAsExpected(now, other, expected) {
  const brokenIn = (m) =>
    [...(m?.traces ?? []), ...(m?.properties ?? [])].filter((t) => t.broken).map((t) => t.rule);
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

const SCAFFOLD = (name, spec) => {
  const text = withoutComments(spec);
  const vars = [...text.matchAll(/\bVARIABLES?\s+(\w+(?:\s*,\s*\w+)*)/g)].flatMap((m) =>
    m[1].split(/\s*,\s*/),
  );
  // TLC names each step after a definition that primes a variable or leaves one UNCHANGED. A
  // definition that only another action calls is listed too, though TLC names no step after it.
  const actions = [
    ...new Set(
      text
        .split(/\n(?=\S)/)
        .map((d) => /^(\w+)\s*(?:\([^)]*\))?\s*==([^]*)/.exec(d))
        .filter((d) => d && /[\w)\]>}]'|\bUNCHANGED\b/.test(d[2]))
        .map((d) => d[1]),
    ),
  ].sort();
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

async function draw({ now, other, map, work, out, title, comparing }) {
  const shown = published(work, out);
  const mapping = await import(pathToFileURL(path.resolve(map)).href);
  const from = ["--dot", now.dot, "--map", map, "--spec", now.spec];
  from.push(...now.traces.flatMap((t) => ["--traces", t.file]));
  if (other) {
    from.push(`--${other.role}-dot`, other.dot, "--spec", other.spec);
    from.push(...other.traces.flatMap((t) => [`--${other.role}-traces`, t.file]));
    if (other.traces.length)
      from.push(`--${other.role}-rules`, other.traces.map((t) => t.rule).join(","));
    if (other.label !== undefined) from.push("--label", other.label);
  }
  if (comparing) from.push("--full-labels", "--flat");
  else if (mapping.readerActions?.length) from.push("--cover");
  const titled = (suffix) => (title ? ["--title", `${title}${suffix}`] : []);

  const files = {
    overview: path.join(work, "chart.mmd"),
    stories: path.join(work, "stories.md"),
    summary: path.join(work, "summary.json"),
  };
  const proof = path.join(work, "tlc", "regions-proof.mmd");
  const everyArrow = path.join(work, "tlc", "regions-all.mmd");
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
      const file = path.join(work, `bug-${c.n}${view}.mmd`);
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
      `It has 2 parallel regions, of ${r.states[0]} and ${r.states[1]} states. Proof: their ${r.all} arrows together make exactly the ${r.flat.states} states and ${r.flat.transitions} labeled steps of ${shown(proof)}, and the ${r.transitions} drawn arrows make only steps among them. ${shown(everyArrow)} has all ${r.all} arrows.`,
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
      : "No state breaks a rule.",
  );
  return { files, charts };
}

function render(charts, shown) {
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
        `could not render ${shown(chart)}: ${(r.stderr || r.error?.message || "").trim()}`,
      );
  }
  return pngs;
}

function finish({ work, out, inputs }, { files, charts }, ok, png) {
  unchanged(inputs, out);
  const pngs = png ? render(charts, published(work, out)) : [];
  publish(work, out, inputs);
  const written = [...charts, ...pngs, files.stories, files.summary]
    .map((f) => path.basename(f))
    .join(", ");
  console.log(`\nWrote ${written} in ${rel(out)}.`);
  if (png && pngs.length < charts.length) return 2;
  return ok ? 0 : 1;
}

const published = (work, out) => (file) => rel(path.join(out, path.relative(work, file)));

const OWN =
  /^((chart|bug-\d+(-developer|-layered)?)\.(mmd|png)|stories\.md|summary\.json|tlc|\.DS_Store)$/;

function foreign(dir) {
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => !OWN.test(f))
      .sort();
  } catch (e) {
    if (e.code === "ENOENT") return [];
    throw new CannotFinish(`cannot use ${rel(dir)} as the output folder: ${e.message}`);
  }
}

function refuseForeign(out, files = foreign(out)) {
  const [first, ...others] = files;
  if (first)
    throw new CannotFinish(
      `${rel(out)} has ${others.length ? `${others.length + 1} files that this command did not write, such as ${first}` : `a file that this command did not write: ${first}`}. A run puts its files in place of the whole output folder, so pass --out with a new folder.`,
    );
}

function outDir(flagged, input, name) {
  const out = flagged ?? path.join(path.dirname(input), `${name}-statechart`);
  refuseForeign(out);
  return out;
}

const fingerprint = (file) => {
  try {
    const { ino, ctimeNs } = fs.statSync(file, { bigint: true });
    return `${ino} ${ctimeNs} ${fs.readFileSync(file, "base64")}`;
  } catch {
    return null;
  }
};

function snapshot(files, inputs = new Map()) {
  for (const f of files) if (f && !inputs.has(f)) inputs.set(f, fingerprint(f));
  return inputs;
}

async function inWorkFolder(body) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "statechart-"));
  fs.mkdirSync(path.join(work, "tlc"));
  let keep = false;
  try {
    return await body(work);
  } catch (e) {
    keep = e instanceof TlcStopped || e instanceof NotPublished;
    if (e instanceof NotPublished)
      e.message += ` The files that this run wrote are in ${rel(work)}.`;
    throw e;
  } finally {
    if (!keep) fs.rmSync(work, { recursive: true, force: true });
  }
}

const moved = (from, to, ...missed) => {
  try {
    fs.renameSync(from, to);
    return true;
  } catch (e) {
    if (missed.includes(e.code)) return false;
    if (!["ENOSYS", "EXDEV", "EISDIR"].includes(e.code)) throw e;
  }
  // Some filesystems, such as FUSE mounts, cannot rename a folder that has files. They fail with
  // ENOSYS, or with EISDIR when the target exists. Copy, and keep rename's outcomes.
  if (!fs.existsSync(from) && missed.includes("ENOENT")) return false;
  if (fs.existsSync(to)) {
    if (fs.readdirSync(to).length && missed.includes("ENOTEMPTY")) return false;
    fs.rmdirSync(to);
  }
  try {
    fs.cpSync(from, to, { recursive: true, errorOnExist: true, force: false });
  } catch (e) {
    fs.rmSync(to, { recursive: true, force: true });
    throw e;
  }
  fs.rmSync(from, { recursive: true, force: true });
  return true;
};

function unchanged(inputs, out) {
  const changed = [...inputs].find(([f, was]) => fingerprint(f) !== was)?.[0];
  if (changed)
    throw new NotPublished(
      `${rel(changed)} changed while this run read it, so the run left ${rel(out)} as it was. Run the command again.`,
    );
}

function publish(work, out, inputs) {
  const parent = path.dirname(path.resolve(out));
  fs.mkdirSync(parent, { recursive: true });
  const next = fs.mkdtempSync(path.join(parent, `.${path.basename(out)}-`));
  const old = `${next}-old`;
  let aside = false;
  try {
    fs.cpSync(work, next, { recursive: true });
    unchanged(inputs, out);
    refuseForeign(out);
    while (!moved(next, out, "ENOTEMPTY", "EEXIST")) {
      if (aside) {
        refuseForeign(out);
        fs.rmSync(old, { recursive: true, force: true });
        aside = false;
      }
      aside = moved(out, old, "ENOENT");
      if (aside) refuseForeign(out, foreign(old));
    }
  } catch (e) {
    const back = !aside || putBack(old, out);
    fs.rmSync(next, { recursive: true, force: true });
    const why = e instanceof CannotFinish ? e.message : `cannot replace ${rel(out)}: ${e.message}.`;
    if (!back)
      throw new NotPublished(
        `${why} This run moved the previous ${rel(out)} to ${rel(old)} and could not put it back.`,
      );
    throw new NotPublished(
      e instanceof CannotFinish ? why : `${why} The run left ${rel(out)} as it was.`,
    );
  }
  if (aside) fs.rmSync(old, { recursive: true, force: true });
}

function putBack(old, out) {
  try {
    return moved(old, out, "ENOTEMPTY", "EEXIST");
  } catch {
    return false;
  }
}

function secondCfg(cfg, flags) {
  if (flags["fixed-config"] && !flags.fixed)
    throw new CannotFinish(`--fixed-config needs --fixed. ${more("from-spec")}`);
  if (flags["against-config"] && !flags.against)
    throw new CannotFinish(`--against-config needs --against. ${more("from-spec")}`);
  if (flags.fixed)
    return flags["fixed-config"] ?? (fs.existsSync(cfgOf(flags.fixed)) ? cfgOf(flags.fixed) : cfg);
  return flags.against && (flags["against-config"] ?? cfgOf(flags.against));
}

function secondModel(input, cfg, { fixed, against, label }) {
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
  return { role, label, model: readModel(spec, cfg, `--${role}-config`) };
}

function warnUnchecked(now, other) {
  const unchecked = now.rules.filter((r) => !other.rules.includes(r));
  if (unchecked.length)
    console.error(
      `${rel(other.cfgFile)} does not check ${unchecked.join(", ")}, so the stories cannot say whether ${path.basename(other.spec)} keeps ${unchecked.length === 1 ? "it" : "them"}.`,
    );
}

async function fromSpec(input, { "expect-broken": expected, ...flags }) {
  const name = path.basename(input, ".tla");
  const map = flags.map ?? path.join(path.dirname(input), `${name}.map.mjs`);
  const cfg = flags.config ?? cfgOf(input);
  const otherCfg = secondCfg(cfg, flags);
  const inputs = snapshot([input, cfg, map, flags.fixed ?? flags.against, otherCfg]);
  const second = secondModel(input, otherCfg, flags);
  const model = readInput(input, cfg, expected);
  const out = outDir(flags.out, input, name);
  if (!fs.existsSync(map)) {
    fs.writeFileSync(map, SCAFFOLD(name, input));
    throw new CannotFinish(`Wrote ${rel(map)}. Fill in its labels, then run this command again.`);
  }
  const tools = findTools();
  return inWorkFolder(async (work) => {
    const now = check(tools, model, { work, out }, expected);
    const other = second && {
      role: second.role,
      label: second.label,
      ...check(tools, second.model, { work, out }, expected),
    };
    if (second) warnUnchecked(model, second.model);
    const drawn = await draw({ now, other, map, work, out, title: flags.title });
    return finish({ work, out, inputs }, drawn, rulesAsExpected(now, other, expected), flags.png);
  });
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
  const map = spec.replace(/\.tla$/, ".map.mjs");
  const inputs = snapshot([input]);
  if (fs.existsSync(spec)) {
    console.log(`Kept ${rel(spec)}. Delete it to write the spec again from ${rel(input)}.`);
  } else {
    script("chart-to-tla.mjs", [input, "--module", name], input);
    console.log(`Wrote ${name}.tla, ${name}.cfg, and ${name}.map.mjs from ${rel(input)}.`);
  }
  snapshot([spec, cfgOf(spec), map], inputs);
  const tools = findTools();
  const model = readInput(spec, cfgOf(spec), expected);
  const out = outDir(flags.out, input, name);
  return inWorkFolder(async (work) => {
    const now = check(tools, model, { work, out }, expected);
    const drawn = await draw({ now, map, work, out, title: flags.title, comparing: true });
    const compared = script("compare-charts.mjs", [input, drawn.files.overview], input, {
      okExits: [0, 1],
    });
    if (compared.status === 0) console.log(`\nThe spec draws ${rel(input)} back unchanged.`);
    else
      console.log(
        `\nThe spec does not draw ${rel(input)}:\n${compared.stdout.trimEnd().replace(/^/gm, "  ")}`,
      );
    return finish(
      { work, out, inputs },
      drawn,
      rulesAsExpected(now, null, expected) && compared.status === 0,
      flags.png,
    );
  });
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
