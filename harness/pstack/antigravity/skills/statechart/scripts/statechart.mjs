#!/usr/bin/env node
import { constants } from "node:buffer";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { HELP, more, USAGE, usage } from "./statechart-help.mjs";
import {
  BROKEN_PROPERTY,
  checkedOnlyInInitialStates,
  joinAnd,
  parseDot,
  tlcOutputWarning,
  uncitedConditions,
} from "./lib.mjs";
import { loopSentence, readerStateNamer, repeatsIn } from "./property-loop.mjs";
import { loadRenderer, renderPng, THEMES } from "./render.mjs";
import { ruleBook } from "./rule-book.mjs";
import { Inputs } from "./snapshot.mjs";
import { RULES_INVARIANT, SCAFFOLD, withoutComments, writeRulesModule } from "./spec-text.mjs";
import { cannotRunTlc, findTlc } from "./tlc-tools.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const { MAX_STRING_LENGTH } = constants;

class CannotFinish extends Error {}
class TlcStopped extends CannotFinish {}
class NotPublished extends CannotFinish {}

const COMMANDS = {
  "from-spec": {
    values: [
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
      "--theme",
    ],
    switches: ["--cover", "--png"],
    renders: (flags) => flags.png,
    run: fromSpec,
  },
  "from-chart": {
    values: ["--module", "--expect-broken", "--title", "--out", "--theme"],
    switches: ["--png"],
    renders: (flags) => flags.png,
    run: fromChart,
  },
  render: { values: ["--theme", "--out"], switches: [], renders: () => true, run: renderFile },
};

function parseArgs([command, ...rest]) {
  if (command === "-h" || command === "--help") return { help: HELP[""] };
  if (!Object.hasOwn(COMMANDS, command))
    throw new CannotFinish(`${usage(Object.values(USAGE))}\n${more()}`);
  const { values, switches, renders } = COMMANDS[command];
  const flags = { "expect-broken": new Set() };
  let input;
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === "-h" || a === "--help") return { help: HELP[command] };
    if (switches.includes(a)) flags[a.slice(2)] = true;
    else if (values.includes(a)) {
      if (i + 1 === rest.length) throw new CannotFinish(`${a} needs a value. ${more(command)}`);
      const name = a.slice(2);
      if (flags[name] instanceof Set) for (const v of rest[++i].split(",")) flags[name].add(v);
      else flags[name] = rest[++i];
    } else if (!a.startsWith("-") && input === undefined) input = a;
    else throw new CannotFinish(`unknown argument ${a}. ${more(command)}`);
  }
  if (input === undefined) throw new CannotFinish(`${usage([USAGE[command]])}\n${more(command)}`);
  const themes = Object.keys(THEMES);
  if (flags.theme !== undefined && !themes.includes(flags.theme))
    throw new CannotFinish(
      `--theme takes ${themes.slice(0, -1).join(", ")}, or ${themes.at(-1)}. ${more(command)}`,
    );
  if (flags.theme !== undefined && !renders(flags))
    throw new CannotFinish(`--theme needs --png. ${more(command)}`);
  return { command, input, flags };
}

async function rendererFor(command, flags) {
  if (!COMMANDS[command].renders(flags)) return null;
  try {
    return { lib: await loadRenderer(), theme: THEMES[flags.theme ?? "light"] };
  } catch (e) {
    throw new CannotFinish(e.message);
  }
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
  // TLC takes only a state predicate as an INVARIANT, and checks a state predicate given as a
  // PROPERTY only in the initial states, which the INVARIANT run checks too.
  return {
    cfgWithoutRules: `${kept.join(" ")}\n`,
    rules,
    properties: properties.filter((p) => !rules.includes(p)),
  };
}

function runJava(file, args, options, dot) {
  return new Promise((resolve) => {
    const r = { stdout: "", stderr: "", stopped: false, overflowed: false };
    const child = spawn(file, args, options);
    for (const stream of ["stdout", "stderr"])
      child[stream].setEncoding("utf8").on("data", (text) => {
        if (r.overflowed) return;
        if (r[stream].length + text.length <= MAX_STRING_LENGTH) r[stream] += text;
        else {
          r.overflowed = true;
          child.kill("SIGKILL");
        }
      });
    child.on("error", (e) => (r.error = e));
    const watch =
      dot &&
      setInterval(() => {
        if ((fs.statSync(dot, { throwIfNoEntry: false })?.size ?? 0) <= MAX_STRING_LENGTH) return;
        r.stopped = true;
        child.kill("SIGKILL");
      }, 500);
    child.on("close", (status, signal) => {
      clearInterval(watch);
      resolve({ ...r, status, signal });
    });
  });
}

async function tlc(tools, spec, cfg, base, { dump, module, workers = "1" } = {}) {
  fs.writeFileSync(`${base}.cfg`, cfg);
  const metadir = fs.mkdtempSync(path.join(os.tmpdir(), "tlc-"));
  // TLC writes the standard modules, such as Naturals.tla, to java.io.tmpdir under fixed names,
  // so runs that share that folder can read a module while another run rewrites it.
  const javaTmp = path.join(metadir, "tmp");
  fs.mkdirSync(javaTmp);
  // -deadlock: a system at rest has nothing left to do, which TLC would report as a deadlock.
  const r = await runJava(
    tools.java,
    [
      "-XX:+UseParallelGC",
      `-Djava.io.tmpdir=${javaTmp}`,
      ...(module ? [`-DTLA-Library=${path.dirname(path.resolve(spec))}`] : []),
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
      module ? path.resolve(module) : path.basename(spec),
    ],
    { cwd: path.dirname(path.resolve(spec)) },
    dump,
  );
  fs.rmSync(metadir, { recursive: true, force: true });
  if (r.overflowed) {
    fs.writeFileSync(`${base}.out`, r.stdout);
    throw new TlcStopped(
      `${base}.out: TLC printed more than ${MAX_STRING_LENGTH.toLocaleString("en-US")} characters, the most that the command can read, so the command stopped TLC. Smaller constants make TLC print less.`,
    );
  }
  if (r.stopped) {
    fs.writeFileSync(`${base}.out`, r.stdout);
    return { stdout: r.stdout, stopped: true };
  }
  if (r.error || !/^TLC2 Version/m.test(r.stdout)) throw new CannotFinish(cannotRunTlc(tools, r));
  fs.writeFileSync(`${base}.out`, r.stdout);
  try {
    return { stdout: r.stdout, warning: tlcOutputWarning(r.stdout, `${base}.out`) };
  } catch (e) {
    throw new TlcStopped(e.message);
  }
}

function warnUnnamedSteps({ spec, copy }, cfg, dot) {
  const text = withoutComments(copy);
  const specName = /^SPECIFICATION\s+(\w+)/m.exec(cfg)?.[1];
  const specBody = specName && new RegExp(`^${specName}\\s*==(.*(\\n[ \\t]+.*)*)`, "m").exec(text);
  const next =
    /^NEXT\s+(\w+)/m.exec(cfg)?.[1] ?? /\[\]\s*\[\s*(\w+)\s*\]_/.exec(specBody?.[1] ?? text)?.[1];
  const graph = parseDot(fs.readFileSync(dot, "utf8"));
  const unnamed = [...graph.edges, ...graph.loops].filter((e) => e.action === next).length;
  if (unnamed > 0)
    console.error(
      `${rel(spec)}: ${unnamed} ${unnamed === 1 ? "step has" : "steps have"} the name ${next}, the whole next-state action. TLC goes down from ${next} through each \\/, \\E, LET, and definition, and names each step after the last definition on that path. It stops at any other expression, such as /\\, IF, or CASE. If the reader must tell these steps apart, join a definition for each kind of step with \\/ in ${next}, as in ${next} == Pay \\/ Charge, and move each conjunct of ${next} into those definitions.`,
    );
  return next;
}

function readModel(spec, cfgFile, flag, inputs) {
  const [copy, cfgCopy] = [spec, cfgFile].map((f) => inputs.copyOf(f));
  if (!fs.existsSync(copy)) throw new CannotFinish(`${rel(spec)} does not exist`);
  if (!fs.existsSync(cfgCopy)) {
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
  return { spec, copy, cfgFile, ...splitRules(fs.readFileSync(cfgCopy, "utf8")) };
}

function readInput(spec, cfgFile, expected, inputs) {
  const model = readModel(spec, cfgFile, "--config", inputs);
  const names = [...model.rules, ...model.properties];
  const unknown = [...expected].filter((r) => !names.includes(r));
  if (unknown.length)
    throw new CannotFinish(
      `--expect-broken ${unknown.join(", ")}: not a rule in ${rel(model.cfgFile)}, whose rules are ${names.join(", ") || "none"}.`,
    );
  return model;
}

async function check(tools, model, { work, out, role }, expected) {
  const { spec, copy, cfgFile, cfgWithoutRules, rules, properties } = model;
  const started = Date.now();
  let runs = 0;
  const run = (cfg, file, options) => {
    runs++;
    return tlc(tools, copy, cfg, file, options);
  };
  const name = path.basename(spec, ".tla");
  const tlcDir = path.join(work, "tlc", ...(role ? [role] : []));
  fs.mkdirSync(tlcDir, { recursive: true });
  console.log(`TLC on ${rel(spec)} with ${rel(cfgFile)}:`);
  if (rules.length === 0)
    console.log(
      `  ${path.basename(cfgFile)} has no INVARIANT, so ${properties.length ? "the chart marks no state broken" : "no rule is checked"}.`,
    );
  const said = (rule, broken) =>
    `  ${rule} ${broken ? (expected.has(rule) ? "is broken (expected)" : "is broken") : "holds"}.`;
  const shown = published(work, out);
  const traces = [];
  for (const rule of rules) {
    const file = path.join(tlcDir, `${name}-${rule}`);
    const cfg = `${cfgWithoutRules}INVARIANT ${rule}\nCONSTRAINT ${rule}\n`;
    let result = await run(cfg, file, { workers: "auto" });
    // Several workers can reach a bad state by a longer path first. One worker searches breadth
    // first in a fixed order, so the chart's bug paths are the shortest, and the same every run.
    if (/^Error: Invariant /m.test(result.stdout)) result = await run(cfg, file);
    const broken = /^Error: Invariant /m.test(result.stdout);
    console.log(said(rule, broken));
    if (result.warning) console.error(`${shown(`${file}.out`)}: ${result.warning}`);
    traces.push({ file: `${file}.out`, rule, broken });
  }
  const temporal = [];
  for (const property of properties) {
    const file = path.join(tlcDir, `${name}-${property}`);
    const { stdout } = await run(`${cfgWithoutRules}PROPERTY ${property}\n`, file, {
      workers: "auto",
    });
    const broken = BROKEN_PROPERTY.test(stdout);
    const notes = [
      broken &&
        `The chart draws only INVARIANT rules, so read TLC's counterexample in ${shown(`${file}.out`)}.`,
      checkedOnlyInInitialStates(spec, property) &&
        `TLC checked ${property} only in the initial states, because it has no [], <>, or ~>. List it as an INVARIANT to check every state.`,
    ];
    console.log([said(property, broken), ...notes.filter(Boolean)].join(" "));
    temporal.push({ file: `${file}.out`, rule: property, broken });
  }
  const dot = path.join(tlcDir, `${name}.dot`);
  const module = rules.length ? writeRulesModule(copy, rules, tlcDir) : undefined;
  const dumpCfg = module ? `${cfgWithoutRules}INVARIANT ${RULES_INVARIANT}\n` : cfgWithoutRules;
  const { stopped } = await run(dumpCfg, path.join(tlcDir, name), {
    dump: dot,
    module,
    workers: "1",
  });
  const dotBytes = fs.statSync(dot).size;
  const next = dotBytes <= MAX_STRING_LENGTH && warnUnnamedSteps(model, cfgWithoutRules, dot);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`  TLC ran ${runs} ${runs === 1 ? "time" : "times"} in ${seconds} s.`);
  const broken = [...traces, ...temporal].some((t) => t.broken);
  return {
    spec,
    copy,
    dot,
    dotBytes,
    stopped,
    next,
    dumpOut: path.join(tlcDir, `${name}.out`),
    traces,
    properties: temporal,
    broken,
  };
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

async function draw({ now, other, uncited, map, work, out, title, comparing, cover }) {
  const huge = [now, other].find((m) => m?.dotBytes > MAX_STRING_LENGTH);
  const limit = MAX_STRING_LENGTH.toLocaleString("en-US");
  if (huge)
    throw new NotPublished(
      `${rel(huge.spec)}: TLC's state graph ${huge.stopped ? `passed ${limit} bytes, the most that the command can read, so the command stopped TLC and draws no chart` : `has ${huge.dotBytes.toLocaleString("en-US")} bytes, more than the ${limit} that the command can read, so it draws no chart`}. The rule results above stand. Smaller constants make a smaller graph.`,
    );
  const shown = published(work, out);
  const mapping = await import(pathToFileURL(path.resolve(map)).href);
  const from = ["--dot", now.dot, "--broken", now.dumpOut, "--map", map, "--spec", now.copy];
  for (const m of [now, other]) if (m?.next) from.push("--next", m.next);
  from.push(...now.traces.flatMap((t) => ["--traces", t.file]));
  if (other) {
    from.push(`--${other.role}-dot`, other.dot, `--${other.role}-broken`, other.dumpOut);
    from.push("--spec", other.copy);
    from.push(...other.traces.flatMap((t) => [`--${other.role}-traces`, t.file]));
    if (other.traces.length)
      from.push(`--${other.role}-rules`, other.traces.map((t) => t.rule).join(","));
    if (other.label !== undefined) from.push("--label", other.label);
    if (other.listed) from.push("--listed", JSON.stringify(other.listed));
  }
  if (comparing) from.push("--full-labels", "--flat", "--loops");
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
      ...(cover ? ["--cover"] : []),
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
  const L = summary.second?.label;
  const broken = [now, other].filter(Boolean).flatMap((m) => {
    const book = ruleBook(m.copy);
    const where = m === now ? "" : ` ${other.role === "fixed" ? "with" : "in"} ${L}`;
    const nameOf = readerStateNamer(mapping, m.dot);
    return m.properties
      .filter((p) => p.broken)
      .map((p) => ({
        where,
        property: {
          spec: rel(m.spec),
          property: p.rule,
          rule: book.get(p.rule)?.sentence ?? null,
          repeats: repeatsIn(fs.readFileSync(p.file, "utf8"), nameOf),
          counterexample: path.relative(work, p.file),
        },
      }));
  });
  const brokenProperties = broken.map((b) => b.property);
  fs.writeFileSync(
    files.summary,
    `${JSON.stringify({ ...summary, ...(uncited && { uncited }), brokenProperties }, null, 2)}\n`,
  );
  if (brokenProperties.length) {
    const lines = broken.map(
      ({ where, property: b }) =>
        `Rule broken${where}: ${[
          (b.rule ?? `\`${b.property}\``).replace(/\.?$/, "."),
          loopSentence(b.repeats),
          `TLC's counterexample is in ${b.counterexample}.`,
        ]
          .filter(Boolean)
          .join(" ")}`,
    );
    const bugs = fs.readFileSync(files.stories, "utf8");
    fs.writeFileSync(
      files.stories,
      `${bugs}${bugs && "\n"}## Broken rules that the chart does not draw\n\n${lines.join("\n")}\n`,
    );
  }
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

  const { works, wrong, fixed: fixedCount, mixed, after, worse } = summary.chartStatus;
  console.log(
    `\nChart: ${summary.chartStates} states and ${summary.chartTransitions} transitions from ${summary.modelStates} model states.`,
  );
  const r = summary.regions;
  if (r?.drawn)
    console.log(
      `It has 2 parallel regions, of ${r.states[0]} and ${r.states[1]} states. Proof: their ${r.all} arrows together make exactly the ${r.flat.states} states and ${r.flat.transitions} labeled steps of ${shown(proof)}, and the ${r.transitions} drawn arrows make only steps among them. ${shown(everyArrow)} has all ${r.all} arrows.`,
    );
  else if (r) console.log(`It has no parallel regions, because ${r.why}.`);
  const c = summary.cover;
  if (c?.drawn === false) console.log(`--cover draws every state, because ${c.why}.`);
  else if (c) {
    const list = (head, xs) => [
      ...(xs.length ? [head] : []),
      ...xs.slice(0, 10).map((x) => `  ${x}`),
      ...(xs.length > 10 ? [`  and ${xs.length - 10} more in summary.json`] : []),
    ];
    const left = [
      ...list("States left out:", c.leftOutStates),
      ...list("Transitions left out:", c.leftOutTransitions),
    ];
    console.log(
      left.length
        ? `--cover leaves out ${c.leftOutStates.length} of ${c.states} states and ${c.leftOutTransitions.length} of ${c.transitions} transitions. The counts of states that work or break a rule include the states it leaves out.\n${left.join("\n")}`
        : "--cover leaves out no state and no transition.",
    );
  }
  const verb = (n) => (n === 1 ? "breaks" : "break");
  const breaks = `${wrong} ${verb(wrong)} a rule`;
  const withFix = other?.role === "fixed" ? ` with ${L}` : "";
  const partly =
    (mixed ? `, ${mixed} ${verb(mixed)} a rule in some cases${withFix}` : "") +
    (after ? `, ${after} reached only after a bug${withFix}` : "") +
    (worse ? `, ${worse} ${verb(worse)} a rule only${withFix}` : "");
  console.log(
    other?.role === "fixed"
      ? `${works} work today, ${wrong} still wrong with ${L}, ${fixedCount} fixed or new with ${L}${partly}.\n`
      : other?.role === "against"
        ? `${works} work, ${breaks}, ${fixedCount} only in ${L}${partly}.\n`
        : `${works} work, ${breaks}${partly}.\n`,
  );
  if (summary.mixedStatus.length)
    console.log(
      `${summary.mixedStatus.length === 1 ? "This state breaks" : "These states break"} a rule in some cases and not in others:\n${summary.mixedStatus.map((t) => `  ${t}`).join("\n")}\n`,
    );
  if (summary.codeLike.length)
    console.log(
      `These labels or causes read like code. Write them in the reader's words in ${rel(map)}:\n${summary.codeLike.map((t) => `  ${t}`).join("\n")}\n`,
    );
  const stories = fs.readFileSync(files.stories, "utf8").trimEnd();
  console.log(
    summary.classes.length
      ? stories
      : ["No state breaks an INVARIANT rule.", stories].filter(Boolean).join("\n\n"),
  );
  return { files, charts };
}

const pngOf = (chart) => chart.replace(/(\.mmd)?$/, ".png");

function render(charts, { lib, theme }, shown) {
  const pngs = [];
  for (const chart of charts) {
    try {
      fs.writeFileSync(pngOf(chart), renderPng(lib, fs.readFileSync(chart, "utf8"), { theme }));
      pngs.push(pngOf(chart));
    } catch (e) {
      console.error(`could not render ${shown(chart)}: ${e.message}`);
    }
  }
  return pngs;
}

function finish({ work, out, inputs }, { files, charts }, ok, renderer) {
  unchanged(inputs, out);
  const pngs = renderer ? render(charts, renderer, published(work, out)) : [];
  publish(work, out, inputs);
  const written = [...charts, ...pngs, files.stories, files.summary]
    .map((f) => path.basename(f))
    .join(", ");
  console.log(`\nWrote ${written} in ${rel(out)}.`);
  if (renderer && pngs.length < charts.length) return 2;
  return ok ? 0 : 1;
}

function renderFile(input, flags, { lib, theme }) {
  const out = flags.out ?? pngOf(input);
  const step = (failed, f) => {
    try {
      return f();
    } catch (e) {
      throw new CannotFinish(`${failed}: ${e.message}`);
    }
  };
  const src = step(`cannot read ${rel(input)}`, () => fs.readFileSync(input, "utf8"));
  const png = step(`could not render ${rel(input)}`, () => renderPng(lib, src, { theme }));
  step(`cannot write ${rel(out)}`, () => {
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    fs.writeFileSync(out, png);
  });
  console.log(`Wrote ${rel(out)}.`);
  return 0;
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

async function inWorkFolder(body) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "statechart-"));
  fs.mkdirSync(path.join(work, "tlc"));
  let keep = false;
  try {
    return await body(work);
  } catch (e) {
    keep = fs.readdirSync(path.join(work, "tlc")).some((f) => f.endsWith(".out"));
    if (keep && !(e instanceof TlcStopped))
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
  // ENOSYS, or with EISDIR when the target exists. They can rename an empty folder.
  if (!fs.existsSync(from) && missed.includes("ENOENT")) return false;
  const claimed = claimedFolder(to, missed);
  if (claimed === null) return false;
  try {
    copyExclusive(from, to);
    if (!sameFolder(to, claimed))
      throw new Error("another run replaced the folder during the copy");
  } catch (e) {
    if (sameFolder(to, claimed)) fs.rmSync(to, { recursive: true, force: true });
    throw e;
  } finally {
    fs.closeSync(claimed);
  }
  fs.rmSync(from, { recursive: true, force: true });
  return true;
};

function claimedFolder(to, missed) {
  // Making a folder and opening it take two calls. Another run can replace the folder at `to`
  // between them. So the run opens its folder before it moves the folder to `to`.
  // A filesystem can reuse a removed folder's inode number. Holding this folder open keeps its
  // number, so a folder that another run makes in its place cannot match it.
  const mine = fs.mkdtempSync(path.join(path.dirname(to), `.${path.basename(to)}-`));
  const claimed = fs.openSync(mine, "r");
  try {
    fs.renameSync(mine, to);
    return claimed;
  } catch (e) {
    fs.closeSync(claimed);
    fs.rmdirSync(mine);
    if (missed.includes(e.code)) return null;
    throw e;
  }
}

function sameFolder(at, claimed) {
  const now = fs.statSync(at, { throwIfNoEntry: false });
  const made = fs.fstatSync(claimed);
  return now?.dev === made.dev && now?.ino === made.ino;
}

function copyExclusive(from, to) {
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(target);
      copyExclusive(source, target);
    } else fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
  }
}

function unchanged(inputs, out) {
  const changed = inputs.changed();
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

function secondModel(input, cfg, { fixed, against, label }, inputs) {
  if (fixed && against)
    throw new CannotFinish(`use --fixed or --against, not both. ${more("from-spec")}`);
  if (!fixed && !against) {
    if (label === undefined) return null;
    throw new CannotFinish(
      `--label names the --fixed or --against model; it needs one of them. ${more("from-spec")}`,
    );
  }
  const [role, spec] = fixed ? ["fixed", fixed] : ["against", against];
  if (path.resolve(spec) === path.resolve(input))
    throw new CannotFinish(`--${role} needs a file other than the spec, ${rel(input)}.`);
  return { role, label, model: readModel(spec, cfg, `--${role}-config`, inputs) };
}

function warnUnchecked(now, other) {
  const unchecked = now.rules.filter((r) => !other.rules.includes(r));
  if (unchecked.length)
    console.error(
      `${rel(other.cfgFile)} does not check ${unchecked.join(", ")}, so the stories cannot say whether ${rel(other.spec)} keeps ${unchecked.length === 1 ? "it" : "them"}.`,
    );
}

function listedBreaks(spec) {
  const dir = path.dirname(spec);
  const files = fs.readdirSync(dir).sort();
  const modules = files.filter((f) => f.endsWith(".tla") && !f.includes("_TTrace_"));
  const only = modules.length === 1 ? path.basename(modules[0], ".tla") : undefined;
  const breaks = {};
  let headed = false;
  for (const f of files.filter((f) => f.endsWith(".cfg"))) {
    const cfg = fs.readFileSync(path.join(dir, f), "utf8");
    const module = /^\\\* module:[ \t]*(\w+)[ \t]*$/m.exec(cfg)?.[1] ?? only;
    const expect = /^\\\* expect:[ \t]*(\w+)[ \t]*$/m.exec(cfg)?.[1];
    if (module !== path.basename(spec, ".tla") || !expect) continue;
    headed = true;
    if (!/^(pass|deadlock)$|^error/.test(expect)) breaks[f] = expect;
  }
  return headed ? { spec: path.basename(spec), breaks } : null;
}

function warnUnlisted(now, other) {
  if (other.listed || !now.traces.some((t) => t.broken)) return;
  const module = path.basename(other.spec, ".tla");
  console.error(
    `No config beside ${rel(other.spec)} has an "\\* expect:" line for ${module}, so the stories cannot say whether ${module} already lists each bug. When ${path.basename(other.spec)} is a copy, pass the spec in its own folder.`,
  );
}

function warnUncited(models) {
  return Object.fromEntries(
    models.map(({ spec, copy, traces, properties }) => {
      const found = uncitedConditions(fs.readFileSync(copy, "utf8"));
      const held = [...traces, ...properties].filter((t) => !t.broken).map((t) => t.rule);
      const short = (s) => (s.length > 90 ? `${s.slice(0, 87)}...` : s);
      if (found.length && held.length)
        console.error(
          `${rel(spec)}: ${joinAnd(held)} ${held.length === 1 ? "holds" : "hold"}, but a rule can also hold because the model waits for a condition that the code does not check. No comment gives the file and line of the code that checks ${found.length === 1 ? "this condition" : "these conditions"}:\n${found.map((c) => `  ${rel(spec)}:${c.line} ${c.action}: ${short(c.condition)}`).join("\n")}\nPut that file and line in a comment on each condition, as in \\* pay.ts:120, or remove the condition when no code checks it.`,
        );
      return [rel(spec), found];
    }),
  );
}

async function fromSpec(input, { "expect-broken": expected, title, cover, ...flags }, renderer) {
  const name = path.basename(input, ".tla");
  const map = flags.map ?? path.join(path.dirname(input), `${name}.map.mjs`);
  const cfg = flags.config ?? cfgOf(input);
  const otherCfg = secondCfg(cfg, flags);
  const inputs = new Inputs().add([input, cfg, map, flags.fixed ?? flags.against, otherCfg]);
  const second = secondModel(input, otherCfg, flags, inputs);
  const listed = second?.role === "against" ? listedBreaks(second.model.spec) : undefined;
  const model = readInput(input, cfg, expected, inputs);
  const out = outDir(flags.out, input, name);
  if (!fs.existsSync(map)) {
    fs.writeFileSync(map, SCAFFOLD(name, input));
    throw new CannotFinish(`Wrote ${rel(map)}. Fill in its labels, then run this command again.`);
  }
  const tools = findTools();
  return inWorkFolder(async (work) => {
    const now = await check(tools, model, { work, out }, expected);
    const other = second && {
      role: second.role,
      label: second.label,
      listed,
      ...(await check(tools, second.model, { work, out, role: second.role }, expected)),
    };
    let uncited;
    if (second) {
      warnUnchecked(model, second.model);
      if (second.role === "against") warnUnlisted(now, other);
      uncited = warnUncited(second.role === "fixed" ? [now, other] : [now]);
    }
    const drawn = await draw({ now, other, uncited, map, work, out, title, cover });
    return finish({ work, out, inputs }, drawn, rulesAsExpected(now, other, expected), renderer);
  });
}

async function fromChart(input, { "expect-broken": expected, ...flags }, renderer) {
  const name =
    flags.module ??
    path
      .basename(input, path.extname(input))
      .replace(/(^|[^A-Za-z0-9]+)([A-Za-z0-9])/g, (_, __, c) => c.toUpperCase());
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name))
    throw new CannotFinish(`cannot make a TLA+ module name from ${input}; add --module NAME`);
  const spec = path.join(path.dirname(input), `${name}.tla`);
  const map = spec.replace(/\.tla$/, ".map.mjs");
  const inputs = new Inputs().add([input]);
  if (fs.existsSync(spec)) {
    console.log(`Kept ${rel(spec)}. Delete it to write the spec again from ${rel(input)}.`);
  } else {
    script("chart-to-tla.mjs", [input, "--module", name], input);
    console.log(`Wrote ${name}.tla, ${name}.cfg, and ${name}.map.mjs from ${rel(input)}.`);
  }
  inputs.add([spec, cfgOf(spec), map]);
  const tools = findTools();
  const model = readInput(spec, cfgOf(spec), expected, inputs);
  const out = outDir(flags.out, input, name);
  return inWorkFolder(async (work) => {
    const now = await check(tools, model, { work, out }, expected);
    const drawn = await draw({ now, map, work, out, title: flags.title, comparing: true });
    const compared = script(
      "compare-charts.mjs",
      [inputs.copyOf(input), drawn.files.overview],
      input,
      {
        okExits: [0, 1],
      },
    );
    if (compared.status === 0) console.log(`\nThe spec draws ${rel(input)} back unchanged.`);
    else
      console.log(
        `\nThe spec does not draw ${rel(input)}:\n${compared.stdout.trimEnd().replace(/^/gm, "  ")}`,
      );
    return finish(
      { work, out, inputs },
      drawn,
      rulesAsExpected(now, null, expected) && compared.status === 0,
      renderer,
    );
  });
}

try {
  const { help, command, input, flags } = parseArgs(process.argv.slice(2));
  if (help) {
    console.log(help);
    process.exit(0);
  }
  process.exit(await COMMANDS[command].run(input, flags, await rendererFor(command, flags)));
} catch (e) {
  if (!(e instanceof CannotFinish)) throw e;
  console.error(e.message);
  process.exit(2);
}
