/** Opt-in debug log (set ATLASO_DEBUG=1). Off by default — hooks stay quiet.
 *  Mirrors the Python connector's `_shim.log`: per-hook files in the atlaso dir. */
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { atlasoDir } from "./atlaso";

export function log(name: string, msg: string): void {
  if (!process.env.ATLASO_DEBUG) return;
  try {
    const d = atlasoDir();
    mkdirSync(d, { recursive: true });
    appendFileSync(join(d, `atlaso-cursor-${name}.log`), `${new Date().toISOString()} ${msg}\n`);
  } catch {
    /* logging is best-effort */
  }
}
