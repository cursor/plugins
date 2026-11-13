import { joinAnd } from "./lib.mjs";
import { badOf, reachableAvoiding } from "./bug-states.mjs";

export function stepsIntoBugs(cs, m, raw, { story, summary, next }) {
  if (!cs.length || (!story && !summary)) return cs;
  const { graph: g, stateKeys } = m;
  const unnamed = new Set(next);
  const rules = new Set(cs.map((c) => c.invariant));
  const clean = new Map([...rules].map((r) => [r, reachableAvoiding(m, badOf(raw, r))]));
  const byEnd = new Map();
  for (const c of cs) for (const k of c.ends) byEnd.set(k, [...(byEnd.get(k) ?? []), c]);
  const ways = new Map(cs.map((c) => [c, { steps: new Map(), n: 0, nameless: 0, action: null }]));
  for (const e of g.edges) {
    const into = byEnd.get(stateKeys.get(e.to))?.filter((c) => clean.get(c.invariant).has(e.from));
    if (!into?.length) continue;
    const [before, after] = [g.nodes.get(e.from).vars, g.nodes.get(e.to).vars];
    const label = m.step(e.action, before, after) || e.action;
    const moves = m.key(before) !== m.key(after);
    for (const c of into) {
      const w = ways.get(c);
      const s = w.steps.get(label) ?? { n: 0, moves: false };
      w.steps.set(label, { n: s.n + 1, moves: s.moves || moves });
      w.n++;
      if (!unnamed.has(e.action)) continue;
      w.nameless++;
      w.action = e.action;
    }
  }
  const starts = [...g.nodes.values()].filter((n) => n.init).map((n) => stateKeys.get(n.id));
  return cs.map((c) => {
    const { steps, n, nameless, action } = ways.get(c);
    const lastSteps = [...steps]
      .sort((a, b) => b[1].n - a[1].n || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .map(([l]) => l);
    const onPath = new Set(c.path.slice(1).map((p) => p.label));
    const startsIn = starts.filter((k) => c.ends.has(k)).length;
    return {
      ...c,
      lastSteps,
      keptSteps: new Set(lastSteps.filter((l) => !steps.get(l).moves && !onPath.has(l))),
      nameless: nameless ? { action, all: nameless === n } : null,
      waysIn: n + startsIn,
      startsHere: startsIn > 0,
    };
  });
}

export function waysLine(c) {
  const quoted = c.lastSteps.map(
    (l) => `"${l}"${c.keptSteps.has(l) ? " (the state stays the same)" : ""}`,
  );
  const named = quoted.slice(0, 5);
  const more = quoted.length - named.length;
  const list = joinAnd(more ? [...named, `${more} more`] : named);
  const steps = c.nameless
    ? `In the model, steps labeled ${list} lead into this bug. TLC names ${c.nameless.all ? "them" : "some of them"} ${c.nameless.action}, the whole next-state action, so the story cannot count them.`
    : c.lastSteps.length === 1
      ? `In the model, one step leads into this bug: ${list}.`
      : c.lastSteps.length
        ? `In the model, ${c.lastSteps.length} different steps lead into this bug: ${list}.`
        : "";
  const start = !c.startsHere
    ? ""
    : steps
      ? "The model can also start in this bug."
      : "The model starts in this bug.";
  const shortest = c.waysIn > 1 ? "The steps below are the shortest path that TLC found." : "";
  return [steps, start, shortest].filter(Boolean).join(" ");
}
