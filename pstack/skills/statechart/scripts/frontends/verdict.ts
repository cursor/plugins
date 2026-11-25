import { EC, LEVEL, type Part } from "../ir.ts";
import { textOf } from "./messages.ts";

export type Break =
  | { kind: "deadlock" }
  | { kind: "temporal" }
  | { kind: "invariant" | "property"; name: string };

const NAMED = new Map<number, ["invariant" | "property", RegExp]>([
  [EC.TLC_INVARIANT_VIOLATED_INITIAL, ["invariant", /^Invariant (.+) is violated by the initial/]],
  [EC.TLC_INVARIANT_VIOLATED_BEHAVIOR, ["invariant", /^Invariant (.+) is violated\.$/m]],
  [EC.TLC_PROPERTY_VIOLATED_INITIAL, ["property", /^Property (.+) is violated by the initial/]],
  [EC.TLC_ACTION_PROPERTY_VIOLATED_BEHAVIOR, ["property", /^Action property (.+) is violated\.$/m]],
]);

const DISTINCT = new Map<number, RegExp>([
  [EC.TLC_INIT_GENERATED1, /(\d+) distinct states? generated/],
  [EC.TLC_INIT_GENERATED2, /with (\d+) of them distinct/],
  [EC.TLC_STATS, /(\d+) distinct states found/],
]);

const aboutTheRun = (code: number, bounded: boolean) =>
  code === EC.TLC_ENVIRONMENT_JVM_GC ||
  (bounded && code === EC.TLC_FEATURE_LIVENESS_CONSTRAINTS);

export function readVerdict(messages: Iterable<Part>, bounded = false) {
  let broke: Break | undefined;
  let distinct = 0;
  let initial = 0;
  const warnings: string[] = [];
  for (const m of messages) {
    if (typeof m === "string") continue;
    if (m.level === LEVEL.WARNING && !aboutTheRun(m.code, bounded)) warnings.push(textOf(m));
    const count = DISTINCT.get(m.code)?.exec(textOf(m));
    if (count) distinct = Math.max(distinct, Number(count[1]));
    if (m.code === EC.TLC_INIT_GENERATED1 || m.code === EC.TLC_INIT_GENERATED2)
      initial = Number(/(\d+) (?:distinct )?states? generated/.exec(textOf(m))?.[1] ?? 0);
    if (broke) continue;
    if (m.code === EC.TLC_DEADLOCK_REACHED) broke = { kind: "deadlock" };
    else if (m.code === EC.TLC_TEMPORAL_PROPERTY_VIOLATED) broke = { kind: "temporal" };
    const named = NAMED.get(m.code);
    const name = named?.[1].exec(textOf(m))?.[1];
    if (named && name) broke = { kind: named[0], name };
  }
  return { broke, distinct, initial, warnings };
}
