import fs from "node:fs";
import { finished } from "node:stream/promises";
import { killGroup } from "./kill.ts";

const [pid, ...dirs] = process.argv.slice(2);

await finished(process.stdin.resume()).catch(() => {});
await killGroup(Number(pid));
for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
