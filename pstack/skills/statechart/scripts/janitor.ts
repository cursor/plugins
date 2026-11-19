import fs from "node:fs";
import { killGroup } from "./run.ts";

const [pid, ...dirs] = process.argv.slice(2);

process.stdin
  .on("end", async () => {
    await killGroup(Number(pid));
    for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10 });
  })
  .resume();
