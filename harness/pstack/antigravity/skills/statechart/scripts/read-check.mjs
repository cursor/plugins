import { isRecord } from "./lib.mjs";
import { SEP } from "./chart-parts.mjs";

const kindOf = (v) => (isRecord(v) ? "record" : Array.isArray(v) ? "list" : typeof v);
function shapeOf(graph, traces) {
  const shape = new Map();
  const walk = (o, path) => {
    for (const [k, v] of Object.entries(o)) {
      const p = [...path, k];
      const id = p.join(SEP);
      if (!shape.has(id)) shape.set(id, { path: p, kinds: new Set() });
      shape.get(id).kinds.add(kindOf(v));
      if (isRecord(v)) walk(v, p);
    }
  };
  for (const n of graph.nodes.values()) walk(n.vars, []);
  for (const t of traces) for (const s of t.steps) walk(s.vars, []);
  return shape;
}
const disjoint = (a, b) => ![...b.kinds].some((k) => a.kinds.has(k));
const foreign = (a, b) => [...b.kinds].some((k) => !a.kinds.has(k));
function lacking(a, b) {
  const out = [];
  for (const [id, x] of a) {
    const within = out.some((p) => id.startsWith(`${p.join(SEP)}${SEP}`));
    if (!within && (!b.has(id) || disjoint(x, b.get(id)))) out.push(x.path);
  }
  return out;
}
const unreadOf = (a, b) =>
  [...a].flatMap(([id, x]) =>
    !b.has(id) || foreign(x, b.get(id)) ? [{ ...x, somewhere: b.has(id) }] : [],
  );
function guard(vars, unread, label, at = "v") {
  if (!unread.length || !isRecord(vars)) return vars;
  const here = new Map();
  const deeper = new Map();
  for (const { path, ...x } of unread) {
    const [k, ...rest] = path;
    if (!rest.length) here.set(k, x);
    else deeper.set(k, [...(deeper.get(k) ?? []), { ...x, path: rest }]);
  }
  const check = (target, k, listing) => {
    const x = here.get(k);
    const absent = !Object.hasOwn(target, k);
    if (!x || (absent ? x.somewhere : x.kinds.has(kindOf(target[k])))) return;
    const name = `${at}.${k}`.slice(2);
    const has = absent ? `no ${name}` : `${name} as a value of another type`;
    const does = listing ? `lists the fields of ${at}` : `reads ${at}.${k}`;
    const hint = listing
      ? ", and read the fields it needs by name"
      : absent
        ? `, or test "${k}" in ${at} first`
        : "";
    throw new Error(
      `${label} has ${has}, and the mapping ${does} on its states. Label states and steps only from what both models have${hint}.`,
    );
  };
  return new Proxy(vars, {
    get(target, k) {
      check(target, k, false);
      return deeper.has(k) ? guard(target[k], deeper.get(k), label, `${at}.${k}`) : target[k];
    },
    ownKeys(target) {
      for (const k of here.keys()) check(target, k, true);
      return Reflect.ownKeys(target);
    },
  });
}

export function readCheck({ graph, rawTraces, secondGraph, rawSecondTraces, L }) {
  const [a, b] = [shapeOf(graph, rawTraces), shapeOf(secondGraph, rawSecondTraces)];
  const unread = unreadOf(a, b);
  return {
    lacks: lacking(a, b),
    extra: lacking(b, a),
    guard: (vars) => guard(vars, unread, L),
  };
}
