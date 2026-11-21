import { isRecord, stateKey } from "./lib.mjs";
import { SEP, edgeId } from "./chart-parts.mjs";
import { badOf } from "./bug-states.mjs";

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

export function replaySecond(
  trace,
  { main, lacks, extra, second, hiddenStep, readerPath, mainActions, secondRules, rawSecondTraces },
) {
  if (!second) return null;
  const shared = (vars) => stateKey(omit(vars, lacks));
  const sharedOf = (n) => stateKey(omit(n.vars, extra));
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
  const words = (e) =>
    second.step(e.action, nodeOf(e.from).vars, nodeOf(e.to).vars, "customer") || e.action;
  const settle = (ids) => {
    const all = new Set(ids);
    for (const id of all)
      for (const e of out.get(id) ?? []) {
        const sameLabel = screen.get(e.to) === screen.get(id);
        if (
          !mainActions.has(e.action) &&
          hiddenStep(trace.invariant, sameLabel, e.action, nodeOf(id).vars, nodeOf(e.to).vars)
        )
          all.add(e.to);
      }
    return all;
  };
  const seen = readerPath(trace, main, main.customer, "customer");
  const shownAt = new Map(seen.map((p, j) => [p.modelStep, j]));
  let here = settle(
    [...second.graph.nodes.values()]
      .filter((n) => n.init && screen.get(n.id) === seen[0].key)
      .map((n) => n.id),
  );
  if (here.size === 0) return { reason: "starts in another state" };
  const passed = new Set(here);
  let j = 0;
  for (let i = 1; i < trace.steps.length; i++) {
    const { action } = trace.steps[i];
    const hidden = !shownAt.has(i);
    if (!hidden) j = shownAt.get(i);
    const want = seen[j];
    const [before, after] = [trace.steps[i - 1].vars, trace.steps[i].vars];
    const known = actions.has(action);
    if (!known && hidden) continue;
    const moved = shared(before) !== shared(after);
    const steps = (keep) => [...here].flatMap((id) => (out.get(id) ?? []).filter(keep));
    const tries = steps((e) =>
      known ? e.action === action : moved && sharedOf(nodeOf(e.to)) === shared(after),
    );
    if (hidden && tries.length === 0) continue;
    const looksSame = (e) => screen.get(e.to) === want.key && (hidden || words(e) === want.label);
    const matched = known ? tries.filter(looksSame) : tries;
    const same = matched.length || hidden ? matched : steps(looksSame);
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
    const said = hidden ? main.step(action, before, after, "customer") || action : want.label;
    const at = { modelStep: i, said, from, hidden };
    if (!taken)
      return {
        ...at,
        key: from,
        label: main.step(action, before, after) || action,
        disabled: true,
      };
    const [b, a] = [nodeOf(taken.from).vars, nodeOf(taken.to).vars];
    return {
      ...at,
      key: second.key(a),
      label: second.step(taken.action, b, a) || taken.action,
      own: words(taken),
    };
  }
  const bad = badOf(rawSecondTraces, trace.invariant);
  const checked = secondRules.has(trace.invariant);
  const ruleHolds = checked && ![...passed].some((id) => bad.has(stateKey(nodeOf(id).vars)));
  return { sameEnd: true, checked, ruleHolds };
}

export function divergence(s, path, n, { inSecond, modelEdges }) {
  if (s?.key === undefined) return s;
  const step = path.findLastIndex((p) => p.modelStep < s.modelStep) + (s.hidden ? 0 : 1);
  const plain = edgeId(s.from, s.key);
  if (s.disabled) {
    const text = inSecond(`${s.label} cannot happen at step ${step}`);
    const edge = `${plain}${SEP}cannot${SEP}second`;
    return { ...s, step, text, overview: `${text} of bug ${n}`, edge, apart: true };
  }
  const text = inSecond(s.label);
  const drawn = [s.label, text].some((l) => modelEdges.get(plain)?.labels.has(l));
  return { ...s, step, text, overview: text, edge: drawn ? plain : `${plain}${SEP}second` };
}
