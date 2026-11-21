import { edgeId } from "./chart-parts.mjs";
import { diverges } from "./bug-states.mjs";

export const edgesAlong = (c) =>
  c.path.slice(1).map((p, i) => ({
    id: edgeId(c.path[i].key, p.key),
    from: c.path[i].key,
    to: p.key,
    label: p.label,
    guard: p.guard,
  }));

export function chartEdges({ args, now, secondQ, modelEdges, classes, chosen, coverOff }) {
  const edges = new Map(modelEdges);
  for (const { second: s } of classes.filter(diverges)) {
    if (modelEdges.has(s.edge)) continue;
    if (!edges.has(s.edge))
      edges.set(s.edge, {
        from: s.from,
        to: s.key,
        labels: new Set(),
        secondOnly: true,
        apart: s.apart,
      });
    edges.get(s.edge).labels.add(s.overview);
  }
  const pathNumbers = new Map();
  (chosen ? edgesAlong(chosen) : []).forEach((step, i) => {
    if (!pathNumbers.has(step.id)) pathNumbers.set(step.id, []);
    const shown = step.guard ? `${step.label} [${step.guard}]` : step.label;
    pathNumbers.get(step.id).push({ n: i + 1, label: step.label, shown });
    if (!edges.has(step.id))
      edges.set(step.id, { from: step.from, to: step.to, labels: new Set([step.label]) });
  });
  const bugSteps = classes.flatMap(edgesAlong);
  const pathEdges = new Map();
  for (const step of bugSteps) {
    if (edges.has(step.id)) continue;
    if (!pathEdges.has(step.id))
      pathEdges.set(step.id, { from: step.from, to: step.to, labels: new Set() });
    pathEdges.get(step.id).labels.add(step.label);
  }
  for (const [id, e] of pathEdges) edges.set(id, e);
  if (!args.cover || coverOff) return { edges, pathNumbers, coverEdges: null };

  const coverEdges = new Set(bugSteps.map((step) => step.id));
  const bfs = (q, targets) => {
    const parent = new Map([...q.initial].map((k) => [k, null]));
    const outEdges = new Map();
    for (const [id, e] of q.edges) {
      if (!outEdges.has(e.from)) outEdges.set(e.from, []);
      outEdges.get(e.from).push([id, e]);
    }
    for (const k of parent.keys())
      for (const [id, e] of outEdges.get(k) ?? []) if (!parent.has(e.to)) parent.set(e.to, id);
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
  for (const c of classes.filter(diverges)) coverEdges.add(c.second.edge);
  return { edges, pathNumbers, coverEdges };
}
