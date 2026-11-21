import { EC, type Part } from "../ir.ts";
import { textOf } from "./messages.ts";

const NEXT = /^<(.+?) (line \d+, col \d+ to line \d+, col \d+ of module ([^\s()]+))(?: \(\d+ \d+ \d+ \d+\))?>: \d+:(\d+)\s*$/;

export function readCoverage(messages: Iterable<Part>) {
  const actions = new Map<string, { name: string; module: string; seen: boolean }>();
  for (const m of messages) {
    if (typeof m === "string" || m.code !== EC.TLC_COVERAGE_NEXT) continue;
    const match = NEXT.exec(textOf(m));
    if (!match) continue;
    const [, name, declaration, module, generated] = match;
    const key = `${name} ${declaration}`;
    const previous = actions.get(key);
    actions.set(key, { name, module, seen: previous?.seen === true || /[1-9]/.test(generated) });
  }
  return actions;
}
