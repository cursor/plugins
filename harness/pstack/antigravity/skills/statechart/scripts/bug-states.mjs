import fs from "node:fs";
import { BROKEN_MARK, parseValue, stateKey } from "./lib.mjs";
import { SEP } from "./chart-parts.mjs";

export function firstBad(raw) {
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

export const byOrder = (a, b) =>
  a.steps - b.steps ||
  a.trace.steps.length - b.trace.steps.length ||
  (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

const lastKey = (t) => stateKey(t.steps[t.steps.length - 1].vars);
export const badOf = (raw, rule) => new Set(raw.filter((t) => t.invariant === rule).map(lastKey));
export function reachableAvoiding({ graph: g, stateKeys }, bad) {
  const ok = (id) => !bad.has(stateKeys.get(id));
  const next = new Map();
  for (const e of g.edges) {
    if (!next.has(e.from)) next.set(e.from, []);
    next.get(e.from).push(e.to);
  }
  const clean = new Set([...g.nodes.values()].filter((n) => n.init && ok(n.id)).map((n) => n.id));
  for (const id of clean) for (const to of next.get(id) ?? []) if (ok(to)) clean.add(to);
  return clean;
}

export const diverges = (c) => c.second?.key !== undefined;
export function readBroken(file) {
  if (!file) return [];
  const lines = fs.readFileSync(file, "utf8").split("\n");
  const marked = new RegExp(`^<<\\s*"${BROKEN_MARK}",`);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (!marked.test(lines[i])) continue;
    let text = lines[i];
    while (typeof parseValue(text) === "string" && i + 1 < lines.length) text += `\n${lines[++i]}`;
    const [, vars, broken] = parseValue(text);
    out.push({ key: stateKey(vars), rules: broken });
  }
  return out;
}
export const badStates = (raw, broken, counts = () => true) =>
  new Set([
    ...raw.filter((t) => counts(t.invariant)).map(lastKey),
    ...broken.filter((b) => b.rules.some(counts)).map((b) => b.key),
  ]);
export function labelStatus(m, keys, bad) {
  const good = reachableAvoiding(m, bad);
  const kinds = new Map();
  for (const n of m.graph.nodes.values()) {
    const k = keys.get(n.id);
    if (!kinds.has(k)) kinds.set(k, new Set());
    kinds.get(k).add(bad.has(m.stateKeys.get(n.id)) ? "bad" : good.has(n.id) ? "good" : "after");
  }
  return (k) => {
    const has = kinds.get(k);
    if (!has) return undefined;
    if (has.has("bad")) return has.has("good") ? "mixed" : "wrong";
    return has.has("good") ? "works" : "after";
  };
}

export const RANK = ["works", "fixed", "after", "mixed", "wrong", "worse"];
export const worst = (...all) =>
  all.filter(Boolean).reduce((a, b) => (RANK.indexOf(b) > RANK.indexOf(a) ? b : a), "works");
