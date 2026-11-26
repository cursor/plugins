import fs from "node:fs";
import { joinAnd, parseDot, parseState, stateKey } from "./lib.mjs";
import { mapView } from "./map-view.mjs";

const TEMPORAL_BREAK = "Error: Temporal properties were violated.";

function lasso(tlcOutput) {
  const start = tlcOutput.lastIndexOf(TEMPORAL_BREAK);
  if (start < 0) return null;
  const lines = tlcOutput.slice(start).split("\n");
  const states = [];
  for (let i = 0; i < lines.length; i++) {
    const back = /^Back to state (\d+): /.exec(lines[i]);
    if (back) return { loop: states.slice(Number(back[1]) - 1), stutters: false };
    const head = /^State \d+: (<|Stuttering)/.exec(lines[i]);
    if (!head) continue;
    if (head[1] === "Stuttering") return { loop: states.slice(-1), stutters: true };
    const body = [];
    while (i + 1 < lines.length && lines[i + 1].trim() !== "") body.push(lines[++i]);
    states.push(parseState(body.join("\n")));
  }
  return null;
}

const collapseRepeatsAroundLoop = (names) => {
  const runs = names.filter((name, i) => name !== names[i - 1]);
  return runs.length > 1 && runs.at(-1) === runs[0] ? runs.slice(0, -1) : runs;
};

export function repeatsIn(tlcOutput, nameOf) {
  const found = lasso(tlcOutput);
  return (
    found && { states: collapseRepeatsAroundLoop(found.loop.map(nameOf)), stutters: found.stutters }
  );
}

function enabledByState({ nodes, edges, loops }) {
  const byId = new Map([...nodes.keys()].map((id) => [id, new Set()]));
  for (const e of [...edges, ...loops]) byId.get(e.from).add(e.action);
  return new Map([...nodes.values()].map((n) => [stateKey(n.vars), byId.get(n.id)]));
}

export function readerStateNamer(mapping, dotFile) {
  const readerActions = new Set(mapping.readerActions ?? []);
  let enabledAt;
  return (vars) => {
    enabledAt ??= enabledByState(parseDot(fs.readFileSync(dotFile, "utf8")));
    const enabled = enabledAt.get(stateKey(vars)) ?? new Set();
    const settled = [...enabled].every((a) => readerActions.has(a));
    return String(mapping.state(mapView(vars), { enabled, settled }));
  };
}

export function loopSentence(repeats) {
  if (!repeats) return null;
  const quoted = repeats.states.map((name) => `"${name}"`);
  if (repeats.stutters) return `The run stops in ${quoted[0]} forever.`;
  if (quoted.length === 1) return `The run stays in ${quoted[0]} forever.`;
  return `The run loops through ${joinAnd(quoted)} forever.`;
}
