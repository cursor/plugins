import fs from "node:fs";
import {
  NO_LOOPS,
  compareCharts,
  escapeMermaidQuotes,
  parseMermaid,
  productOf,
  wrap,
} from "./lib.mjs";
import { SEP, addGuard, frontMatter, guarded } from "./chart-parts.mjs";
import { RANK, diverges, worst } from "./bug-states.mjs";
import { edgesAlong } from "./chart-edges.mjs";

export function regionsChart({
  states,
  starts,
  edges,
  loops,
  classes,
  proofPath,
  allPath,
  mapping,
  status,
  LEGEND,
  groupOf,
  drawnState,
  groupCounts,
  head,
}) {
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
    ...(loops ? [] : [`  ${NO_LOOPS}`]),
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

  const regionStatus = [new Map(), new Map()];
  for (const k of nodes) {
    const p = split(k);
    for (const i of [0, 1]) {
      const prev = regionStatus[i].get(p[i]);
      if (!prev || RANK.indexOf(status(k)) < RANK.indexOf(prev))
        regionStatus[i].set(p[i], status(k));
    }
  }
  for (const k of nodes) {
    const p = split(k);
    const shown = worst(...[0, 1].map((i) => regionStatus[i].get(p[i])));
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
  const differences = compareCharts(parseMermaid(all.mermaid).regions, flat, { loops });
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
    made = productOf(parseMermaid(scoped.mermaid).regions, { loops });
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
      RANK.filter((s) => LEGEND[s]).map((s) => [
        s,
        regionStatus.reduce((n, m) => n + [...m.values()].filter((x) => x === s).length, 0),
      ]),
    ),
    groups: groupCounts(drawn.flat()),
  };
}
