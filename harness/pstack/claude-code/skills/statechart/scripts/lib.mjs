import fs from "node:fs";
import process from "node:process";

export function findTlc() {
  const { TLA2TOOLS, JAVA } = process.env;
  if (!TLA2TOOLS)
    throw new Error(
      "Cannot find TLC. Download tla2tools.jar from a TLA+ release:\n  https://github.com/tlaplus/tlaplus/releases\nThen set TLA2TOOLS to the path of tla2tools.jar, and JAVA to a java binary (Java 11 or later).",
    );
  if (!fs.existsSync(TLA2TOOLS)) throw new Error(`TLA2TOOLS is ${TLA2TOOLS}, which does not exist.`);
  return { jar: TLA2TOOLS, java: JAVA || "java" };
}

export function parseValue(text) {
  const src = text.trim();
  let i = 0;
  const ws = () => {
    while (i < src.length && /\s/.test(src[i])) i++;
  };
  const peek = (s) => src.startsWith(s, i);
  const eat = (s) => {
    ws();
    if (!peek(s)) throw new Error(`expected ${s} at ${i} in ${src}`);
    i += s.length;
  };
  const list = (close, item) => {
    const out = [];
    ws();
    if (peek(close)) {
      i += close.length;
      return out;
    }
    for (;;) {
      out.push(item());
      ws();
      if (peek(",")) {
        i++;
        continue;
      }
      eat(close);
      return out;
    }
  };
  const value = () => {
    ws();
    if (peek("<<")) {
      i += 2;
      return list(">>", value);
    }
    if (peek("{")) {
      i++;
      return list("}", value);
    }
    if (peek("[")) {
      i++;
      const pairs = list("]", () => {
        ws();
        const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i));
        if (!m) throw new Error(`bad record field at ${i}`);
        i += m[0].length;
        eat("|->");
        return [m[0], value()];
      });
      return Object.fromEntries(pairs);
    }
    if (peek("(")) {
      i++;
      const fn = {};
      for (;;) {
        const k = value();
        eat(":>");
        fn[typeof k === "string" ? k : JSON.stringify(k)] = value();
        ws();
        if (peek("@@")) {
          i += 2;
          continue;
        }
        eat(")");
        return fn;
      }
    }
    if (peek('"')) {
      i++;
      let s = "";
      while (i < src.length && src[i] !== '"') {
        if (src[i] === "\\") i++;
        s += src[i++];
      }
      i++;
      return s;
    }
    const m = /^-?\d+|^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i));
    if (!m) throw new Error(`bad value at ${i} in ${src}`);
    i += m[0].length;
    if (m[0] === "TRUE") return true;
    if (m[0] === "FALSE") return false;
    return /^-?\d+$/.test(m[0]) ? Number(m[0]) : m[0];
  };
  try {
    const v = value();
    ws();
    return i === src.length ? v : src;
  } catch {
    return src;
  }
}

// One state as TLC prints it: "/\ x = 1" lines, or "x = 1" for one variable.
function parseState(text) {
  const lines = text.split("\n").filter((l) => l.trim() !== "");
  const conjuncts = [];
  for (const line of lines) {
    if (/^\s*\/\\ /.test(line) || conjuncts.length === 0)
      conjuncts.push(line.replace(/^\s*\/\\ /, ""));
    else conjuncts[conjuncts.length - 1] += ` ${line.trim()}`;
  }
  const vars = {};
  for (const c of conjuncts) {
    const eq = c.indexOf(" = ");
    if (eq < 0) continue;
    vars[c.slice(0, eq).trim()] = parseValue(c.slice(eq + 3));
  }
  return vars;
}

export const isRecord = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const canon = (v) =>
  Array.isArray(v)
    ? v.map(canon)
    : isRecord(v)
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, canon(v[k])]),
        )
      : v;
export const stateKey = (vars) => JSON.stringify(canon(vars));

export function ruleSentences(tla) {
  const out = new Map();
  const lines = tla.split("\n");
  lines.forEach((line, i) => {
    const name = /^([A-Za-z_]\w*)\s*==/.exec(line)?.[1];
    if (!name) return;
    const said = [];
    for (let j = i - 1; j >= 0 && /^\s*\\\*/.test(lines[j]); j--)
      said.unshift(lines[j].replace(/^\s*\\\*\s?/, "").trim());
    const sentence = said.filter(Boolean).join(" ");
    if (sentence) out.set(name, sentence);
  });
  return out;
}

function unescapeDot(s) {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\\" && i + 1 < s.length) {
      const n = s[++i];
      out += n === "n" ? "\n" : n;
    } else out += s[i];
  }
  return out;
}

export function parseDot(text) {
  const nodes = new Map();
  const edges = [];
  const loops = [];
  const seen = new Set();
  const LABEL = '"((?:[^"\\\\]|\\\\.)*)"';
  const nodeRe = new RegExp(`^(-?\\d+) \\[label=${LABEL}(.*)\\];?\\s*$`);
  const edgeRe = new RegExp(`^(-?\\d+) -> (-?\\d+)(?: \\[label=${LABEL})?`);
  for (const line of text.split("\n")) {
    let m = edgeRe.exec(line);
    if (m) {
      const e = { from: m[1], to: m[2], action: m[3] ? unescapeDot(m[3]) : "" };
      const id = `${e.from} ${e.to} ${e.action}`;
      if (seen.has(id)) continue;
      seen.add(id);
      (e.from === e.to ? loops : edges).push(e);
      continue;
    }
    m = nodeRe.exec(line);
    if (m)
      nodes.set(m[1], {
        id: m[1],
        vars: parseState(unescapeDot(m[2])),
        init: /style\s*=\s*filled/.test(m[3]),
      });
  }
  if (nodes.size === 0)
    throw new Error("no states found; dump the graph with TLC -dump dot,actionlabels <file>");
  const missing = [...edges, ...loops].find((e) => !nodes.has(e.from) || !nodes.has(e.to));
  if (missing)
    throw new Error(
      `transition ${missing.from} -> ${missing.to} names a state the file does not define`,
    );
  if (edges.length > 0 && [...edges, ...loops].every((e) => !e.action))
    throw new Error(
      "the graph has no action names; dump it with TLC -dump dot,actionlabels <file>",
    );
  return { nodes, edges, loops };
}

export function parseTraces(text) {
  const traces = [];
  let invariant = null;
  let current = null;
  const lines = text.split("\n");
  const stateAt = (i) => {
    const body = [];
    while (i + 1 < lines.length && lines[i + 1].trim() !== "") body.push(lines[++i]);
    return [parseState(body.join("\n")), i];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const inv = /^Error: Invariant (\S+) is violated( by the initial state:)?/.exec(line);
    if (inv) {
      invariant = inv[1];
      if (inv[2]) {
        const [vars, end] = stateAt(i);
        traces.push({ invariant, steps: [{ action: null, vars }] });
        i = end;
      }
      continue;
    }
    if (line.startsWith("Error: ") && !line.startsWith("Error: The behavior up to this point is"))
      invariant = null;
    const head = /^State (\d+): <([^\s>(]+)/.exec(line);
    if (!head) continue;
    const [vars, end] = stateAt(i);
    i = end;
    if (head[1] === "1") {
      current = { invariant, steps: [] };
      traces.push(current);
    }
    current?.steps.push({ action: head[2] === "Initial" ? null : head[2], vars });
  }
  return traces;
}

// With -continue, TLC prints "Model checking completed" even after broken invariants, and not
// when it stopped early. TLC can also throw a Java exception of its own while it reports a state
// that breaks a rule, and stop early. An error in the rule's formula throws one of TLC's own
// exceptions in place of java.*. Returns a warning for that crash, without the file name because
// the caller can move the file, and throws for other errors.
export function checkTlcOutput(text, file) {
  const lines = text.split("\n");
  const named = (re) => new Set(lines.map((l) => re.exec(l)?.[1]).filter(Boolean));
  const broken = named(/^Error: Invariant (\S+) is violated/);
  const failed = [...named(/^Error: Evaluating invariant (\S+) failed\./)];
  const thrown = [...text.matchAll(/^The exception was a (\S+)\n: (?:([\w.$]+):)?(.*)$/gm)].map(
    ([, cls, cause, message]) => `${cause ?? cls}: ${message.trim()}`,
  );
  const crashed =
    failed.length > 0 &&
    failed.every((r) => broken.has(r)) &&
    thrown.length > 0 &&
    thrown.every((t) => t.startsWith("java."));
  const reported = crashed
    ? /^Error: (Invariant \S+ is violated|The behavior up to this point is|Evaluating invariant \S+ failed\.|TLC threw an unexpected exception\.|The error occurred when TLC was evaluating the nested)/
    : /^Error: (Invariant \S+ is violated|The behavior up to this point is|Temporal properties were violated\.|The following behavior constitutes a counter-example:)/;
  const other = lines.find((l) => l.startsWith("Error: ") && !reported.test(l));
  if (other)
    throw new Error(
      `${file}: TLC stopped on an error that is not a broken rule: ${other.slice(7)}`,
    );
  if (crashed) {
    const rules = failed.join(", ");
    return `TLC found that ${rules} ${failed.length === 1 ? "is" : "are"} broken, and then failed with ${thrown[0]}. TLC stopped before it checked every state, so the charts can miss states that break ${rules}. The failure is in TLC, not in the rule. Do not weaken ${rules} because of it. A smaller constant can let TLC finish.`;
  }
  // TLC stops at the first broken temporal property, and then does not print that it completed.
  if (!/^(Model checking completed\.|Error: Temporal properties were violated\.)/m.test(text))
    throw new Error(
      `${file}: TLC did not finish, so its counterexamples are not all there; read the file`,
    );
  return null;
}

export function wrap(text, width = 26) {
  const words = String(text).split(/\s+/);
  const rows = [];
  let row = "";
  for (const w of words) {
    if (row && (row + " " + w).length > width) {
      rows.push(row);
      row = w;
    } else row = row ? `${row} ${w}` : w;
  }
  if (row) rows.push(row);
  return rows.join("<br/>");
}

const OPENS_A_PHRASE = new Set(
  "a an the your my our their its this that to of in on at for with from by and or".split(" "),
);
export function joinLabels(labels) {
  if (labels.length < 2) return labels.join(" or ");
  const words = labels.map((l) => String(l).split(" "));
  let n = 0;
  while (words.every((w) => n < w.length - 1 && w[n] === words[0][n])) n++;
  while (n > 0 && OPENS_A_PHRASE.has(words[0][n - 1])) n--;
  if (n < 2) return labels.join(" or ");
  const rest = words.map((w) => w.slice(n).join(" "));
  const list =
    rest.length === 2 ? rest.join(" or ") : `${rest.slice(0, -1).join(", ")}, or ${rest.at(-1)}`;
  return `${words[0].slice(0, n).join(" ")} ${list}`;
}

const unwrap = (s) =>
  s
    .replace(/<br\s*\/?>|#160;/g, " ")
    .replace(/#(quot|34);/g, '"')
    .replace(/\s+/g, " ")
    .trim();

// Mermaid ends a quoted state caption at the first ", so a caption writes " as #quot;.
export const quote = (s) => String(s).replaceAll('"', "#quot;");

export const LEGEND_ID = "legend";
export const FULL_LABELS = "%% labels in full";

export function parseMermaid(text) {
  const names = new Map();
  const nevers = [];
  let last = null;
  const newPart = () => ({ children: [], transitions: [] });
  const root = { name: "", parts: [newPart()] };
  const stack = [root];
  const part = () => stack[stack.length - 1].parts.at(-1);
  const display = (id) => names.get(id) ?? id;
  const implicit = new Map();
  const declare = (id) => {
    const prev = implicit.get(id);
    if (prev)
      prev.children.splice(
        prev.children.findIndex((c) => c.name === id),
        1,
      );
    implicit.set(id, null);
  };
  const mention = (id) => {
    if (id === "[*]" || implicit.has(id)) return;
    part().children.push({ name: id, leaf: true });
    implicit.set(id, part());
  };
  const body = text.replace(/^\s*---[ \t]*\r?\n[^]*?\r?\n---[ \t]*(\r?\n|$)/, "");
  for (const raw of body.split("\n")) {
    const line = raw.trim().replace(/(\[\*\]|[A-Za-z_]\w*):::[\w-]+/g, "$1");
    const when = /^%%\s*when\s+(not\s+)?(.+)$/.exec(line);
    if (when) {
      if (!last) throw new Error(`a %% when line must come right after a transition: ${line}`);
      if (!last.words)
        throw new Error(
          `the guarded step "${last.label}" must end its label with the guard's words in [ ]`,
        );
      last.when = { not: Boolean(when[1]), ids: when[2].split(",").map((s) => s.trim()) };
      last = null;
      continue;
    }
    last = null;
    const never = /^%%\s*never\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+?)(?:\s+--\s+(.*))?$/.exec(line);
    if (never) {
      nevers.push({
        name: never[1],
        states: never[2].split("&").map((s) => s.trim()),
        sentence: never[3] ?? "",
      });
      continue;
    }
    if (
      !line ||
      line.startsWith("%%") ||
      /^(stateDiagram|direction|classDef|class |note)/.test(line)
    )
      continue;
    let m = /^state\s+"([^"]*)"\s+as\s+([A-Za-z_]\w*)\s*(\{)?\s*$/.exec(line);
    if (!m) {
      const plain = /^state\s+([A-Za-z_]\w*)\s*(\{)?\s*$/.exec(line);
      if (plain) m = [line, null, plain[1], plain[2]];
    }
    if (m) {
      if (m[1] !== null && !names.has(m[2])) names.set(m[2], unwrap(m[1]));
      declare(m[2]);
      if (m[3]) {
        const node = { name: m[2], parts: [newPart()] };
        part().children.push(node);
        stack.push(node);
      } else part().children.push({ name: m[2], leaf: true });
      continue;
    }
    if (line === "}") {
      if (stack.length === 1) throw new Error("unmatched } in the chart");
      stack.pop();
      continue;
    }
    if (line === "--") {
      stack[stack.length - 1].parts.push(newPart());
      continue;
    }
    m = /^(\[\*\]|[A-Za-z_]\w*)\s*-->\s*(\[\*\]|[A-Za-z_]\w*)(?:\s*:\s*(.*))?$/.exec(line);
    if (m) {
      if (m[2] === "[*]" && m[1] !== "[*]")
        throw new Error(
          `cannot read final state in "${line}"; draw the step to the state the reader sees next`,
        );
      mention(m[1]);
      mention(m[2]);
      const said = m[3] ? unwrap(m[3]) : "";
      const label = said.replace(/\s*\[[^\]]*\]/g, "");
      last = { from: m[1], to: m[2], label, words: label !== said };
      part().transitions.push(last);
      continue;
    }
    m = /^([A-Za-z_]\w*)\s*:\s*(.*)$/.exec(line);
    if (m) {
      if (!names.has(m[1])) names.set(m[1], unwrap(m[2]));
      if (implicit.get(m[1]) === null) continue;
      declare(m[1]);
      part().children.push({ name: m[1], leaf: true });
      continue;
    }
    throw new Error(`cannot read chart line: ${line}`);
  }
  if (stack.length !== 1) throw new Error("the chart has an unclosed {");
  if (root.parts.length > 1)
    throw new Error(
      "the chart has -- outside a composite; to make parallel regions, split one top-level composite with --",
    );

  // Ids are global, as in Mermaid: a transition may name a state declared inside another composite.
  function region(p) {
    const out = { states: new Set(), initial: new Set(), transitions: [] };
    const info = new Map();
    const declared = new Set();
    (function collect(q) {
      for (const c of q.children) {
        if (c.name === LEGEND_ID) continue;
        declared.add(c.name);
        if (!c.leaf) for (const sub of c.parts) collect(sub);
      }
    })(p);
    const transitions = [];
    const lookup = (id) => {
      const found = info.get(id);
      if (!found) throw new Error(`transition names ${id}, which is not in this region`);
      return found;
    };
    function states(q, prefix, depth) {
      const local = q.children.filter((c) => c.name !== LEGEND_ID);
      for (const t of q.transitions) {
        for (const end of [t.from, t.to]) {
          if (end === "[*]" || declared.has(end)) continue;
          declared.add(end);
          local.push({ name: end, leaf: true });
        }
      }
      const all = [];
      for (const c of local) {
        if (info.has(c.name)) {
          if (local.indexOf(c) !== local.findIndex((x) => x.name === c.name)) continue;
          throw new Error(`state id ${c.name} is declared in two places`);
        }
        const full = `${prefix}${display(c.name)}`;
        if (c.leaf) {
          if (out.states.has(full))
            throw new Error(`two states have the caption "${full}"; give each its own caption`);
          out.states.add(full);
          info.set(c.name, { all: [full], initial: [full], depth });
          all.push(full);
          continue;
        }
        if (c.parts.length > 1)
          throw new Error(
            `${display(c.name)} splits into regions below the top level; make each region a top-level region`,
          );
        const inner = states(c.parts[0], `${full}.`, depth + 1);
        const initial = c.parts[0].transitions
          .filter((t) => t.from === "[*]")
          .flatMap((t) => lookup(t.to).initial);
        if (initial.length === 0)
          throw new Error(
            `${display(c.name)} has no [*] --> start, so a transition into it has nowhere to land`,
          );
        info.set(c.name, { all: inner, initial, depth });
        all.push(...inner);
      }
      for (const t of q.transitions) if (t.from !== "[*]" && t.to !== "[*]") transitions.push(t);
      return all;
    }
    states(p, "", 0);
    for (const t of p.transitions)
      if (t.from === "[*]") for (const s of lookup(t.to).initial) out.initial.add(s);
    transitions.sort((a, b) => lookup(b.from).depth - lookup(a.from).depth);
    const handled = new Set();
    let pending = [];
    let depth = null;
    for (const t of transitions) {
      const from = lookup(t.from);
      if (from.depth !== depth) {
        for (const h of pending) handled.add(h);
        pending = [];
        depth = from.depth;
      }
      for (const f of from.all) {
        const key = `${f}\u0000${t.label}`;
        if (t.label && handled.has(key)) continue;
        for (const to of lookup(t.to).initial)
          out.transitions.push({
            from: f,
            to,
            label: t.label,
            ...(t.when ? { when: t.when } : {}),
          });
        if (t.label) pending.push(key);
      }
    }
    return [out, info];
  }

  const owners = new Map();
  const regions = {};
  const top = root.parts[0];
  const machine = top.children.filter((c) => c.name !== LEGEND_ID);
  const parallel =
    machine.length === 1 &&
    !machine[0].leaf &&
    machine[0].parts.length > 1 &&
    top.transitions.every((t) => t.from === "[*]");
  if (parallel) {
    for (const p of machine[0].parts) {
      const [only] = p.children;
      const holder =
        p.children.length === 1 &&
        !only.leaf &&
        p.transitions.every((t) => t.from === "[*]" && t.to === only.name)
          ? only
          : null;
      if (holder && holder.parts.length > 1)
        throw new Error(`${display(holder.name)} splits into regions below the top level`);
      const name = holder ? display(holder.name) : `Region${Object.keys(regions).length + 1}`;
      const [r, ids] = region(holder ? holder.parts[0] : p);
      regions[name] = r;
      for (const [id, { all }] of ids) owners.set(id, { name, all });
    }
  } else {
    const [r, ids] = region(top);
    regions.Main = r;
    for (const [id, { all }] of ids) owners.set(id, { name: "Main", all });
  }
  for (const [name, r] of Object.entries(regions))
    for (const t of r.transitions) {
      if (!t.when) continue;
      if (!parallel)
        throw new Error("a %% when line guards a step on other regions, and the chart has none");
      const states = {};
      for (const id of t.when.ids) {
        const at = owners.get(id);
        if (!at)
          throw new Error(`a %% when line names ${id}, which is not a state id in the chart`);
        if (at.name === name)
          throw new Error(
            `a %% when line names ${display(id)}, which is in the step's own region; a guard reads other regions`,
          );
        states[at.name] = [...new Set([...(states[at.name] ?? []), ...at.all])].sort();
      }
      t.guard = { not: t.when.not, states };
      delete t.when;
    }
  return { regions, nevers };
}

function guardHolds(guard, at) {
  if (!guard) return true;
  const hits = Object.entries(guard.states).map(([r, states]) => states.includes(at[r]));
  return guard.not ? !hits.some(Boolean) : hits.every(Boolean);
}

export function productOf(regions) {
  const names = Object.keys(regions);
  const rs = Object.values(regions);
  const join = (parts) => parts.join(" | ");
  const byLabel = new Map();
  const unlabeled = [];
  rs.forEach((r, ri) => {
    for (const t of r.transitions) {
      if (!t.label) {
        unlabeled.push({ ri, from: t.from, to: t.to, guard: t.guard });
        continue;
      }
      if (!byLabel.has(t.label))
        byLabel.set(
          t.label,
          rs.map(() => new Map()),
        );
      const moves = byLabel.get(t.label)[ri];
      if (!moves.has(t.from)) moves.set(t.from, []);
      moves.get(t.from).push({ to: t.to, guard: t.guard });
    }
  });
  let starts = [[]];
  for (const r of rs) starts = starts.flatMap((p) => [...r.initial].map((s) => [...p, s]));
  const out = { states: new Set(), initial: new Set(starts.map(join)), transitions: [] };
  const seen = new Set(starts.map(join));
  const queue = [...starts];
  const step = (from, to, label) => {
    const [a, b] = [join(from), join(to)];
    if (a === b) return;
    out.transitions.push({ from: a, to: b, label });
    if (!seen.has(b)) {
      seen.add(b);
      queue.push(to);
    }
  };
  while (queue.length) {
    const cur = queue.shift();
    out.states.add(join(cur));
    const at = Object.fromEntries(names.map((n, ri) => [n, cur[ri]]));
    for (const u of unlabeled) {
      if (cur[u.ri] !== u.from || !guardHolds(u.guard, at)) continue;
      const next = [...cur];
      next[u.ri] = u.to;
      step(cur, next, "");
    }
    for (const [label, perRegion] of byLabel) {
      const open = perRegion.map((moves, ri) =>
        (moves.get(cur[ri]) ?? []).filter((m) => guardHolds(m.guard, at)).map((m) => m.to),
      );
      if (open.every((tos) => tos.length === 0)) continue;
      let nexts = [[]];
      open.forEach((tos, ri) => {
        const options = tos.length ? [...new Set(tos)] : [cur[ri]];
        nexts = nexts.flatMap((p) => options.map((s) => [...p, s]));
      });
      for (const next of nexts) step(cur, next, label);
    }
  }
  return out;
}

export function compareCharts(expectedRegions, actualRegions) {
  const expected = productOf(expectedRegions);
  const actual = productOf(actualRegions);
  const edgeSet = (m) => {
    const labeled = new Set();
    const out = new Set();
    for (const t of m.transitions) {
      if (!t.label) continue;
      labeled.add(`${t.from} --> ${t.to}`);
      for (const l of t.label.split(" or ")) out.add(`${t.from} --> ${t.to} : ${l}`);
    }
    for (const t of m.transitions)
      if (!t.label && !labeled.has(`${t.from} --> ${t.to}`)) out.add(`${t.from} --> ${t.to}`);
    return out;
  };
  const minus = (a, b) => [...a].filter((x) => !b.has(x)).sort();
  const unreached = [];
  const regionEntries = Object.entries(expectedRegions);
  if (regionEntries.length === 1) {
    for (const s of regionEntries[0][1].states) if (!expected.states.has(s)) unreached.push(s);
  } else {
    regionEntries.forEach(([name, r], ri) => {
      const seen = new Set([...expected.states].map((s) => s.split(" | ")[ri]));
      for (const s of r.states) if (!seen.has(s)) unreached.push(`${name}: ${s}`);
    });
  }
  return [
    ["states the agreed chart's own steps never reach", unreached.sort()],
    [
      "states only in EXPECTED (no path from the start reaches them in the spec, or the spec renamed them)",
      minus(expected.states, actual.states),
    ],
    ["states only in ACTUAL", minus(actual.states, expected.states)],
    ["start states only in EXPECTED", minus(expected.initial, actual.initial)],
    ["start states only in ACTUAL", minus(actual.initial, expected.initial)],
    [
      "transitions only in EXPECTED (a guard in the spec blocks them, or the spec renamed the step)",
      minus(edgeSet(expected), edgeSet(actual)),
    ],
    ["transitions only in ACTUAL", minus(edgeSet(actual), edgeSet(expected))],
  ].filter(([, xs]) => xs.length > 0);
}

export const STATUS_CLASSES = [
  "classDef works fill:#f4f6f7,stroke:#566573,color:#1b2631",
  "classDef wrong fill:#fdedec,stroke:#c0392b,color:#7b241c",
  "classDef fixed fill:#e9f7ef,stroke:#1e8449,color:#145a32",
  "classDef worksPath fill:#f4f6f7,stroke:#1f3a93,stroke-width:4px,color:#1b2631",
  "classDef wrongPath fill:#fdedec,stroke:#1f3a93,stroke-width:4px,color:#7b241c",
  "classDef fixedPath fill:#e9f7ef,stroke:#1f3a93,stroke-width:4px,color:#145a32",
];

export const GROUP_PALETTE = [
  "#d6eaf8",
  "#fdebd0",
  "#e8daef",
  "#fcf3cf",
  "#d1f2eb",
  "#ede0d4",
  "#f6e0ef",
];
export const PLAIN_FILL = "#f4f6f7";

const rgb = (hex) => {
  const h = hex.length === 4 ? [...hex.slice(1)].map((c) => c + c).join("") : hex.slice(1);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
// WCAG relative luminance: 0 for black, 1 for white.
function luminance(hex) {
  const [r, g, b] = rgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function groupColorProblem(color) {
  if (typeof color !== "string" || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color))
    return 'is not "#rgb" or "#rrggbb"';
  if (luminance(color) < 0.5) return "is too dark for the status borders to show on it";
  return null;
}

const BORDERS = {
  Wrong: ["stroke:#c0392b,stroke-width:4px", "#7b241c"],
  Fixed: ["stroke:#1e8449,stroke-width:4px", "#145a32"],
  Path: ["stroke:#1f3a93,stroke-width:4px", "#1b2631"],
};
export function groupClassDef(base, fill, border) {
  const darker = `#${rgb(fill)
    .map((c) =>
      Math.round(c / 2)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
  const [stroke, color] = BORDERS[border] ?? [
    `stroke:${fill === PLAIN_FILL ? "#566573" : darker}`,
    "#1b2631",
  ];
  return `classDef ${base}${border} fill:${fill},${stroke},color:${color}`;
}
