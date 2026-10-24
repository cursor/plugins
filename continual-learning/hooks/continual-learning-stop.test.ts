import { expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const hook = join(dirname(fileURLToPath(import.meta.url)), "continual-learning-stop.ts");

test("ignores a turn threshold with trailing characters", () => {
  const project = mkdtempSync(join(tmpdir(), "continual-learning-"));
  const transcript = join(project, "transcript.jsonl");
  try {
    writeFileSync(transcript, "{}\n");
    for (let turn = 1; turn <= 3; turn++) {
      const input = join(project, `input-${turn}.json`);
      writeFileSync(
        input,
        JSON.stringify({
          conversation_id: "conversation",
          generation_id: `generation-${turn}`,
          status: "completed",
          loop_count: 0,
          transcript_path: transcript,
        })
      );
      const result = Bun.spawnSync(
        [process.execPath, hook],
        {
          cwd: project,
          env: {
            ...process.env,
            CONTINUAL_LEARNING_MIN_TURNS: "3turns",
            CONTINUAL_LEARNING_MIN_MINUTES: "1",
          },
          stdin: Bun.file(input),
          stdout: "pipe",
          stderr: "pipe",
        }
      );

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(new TextDecoder().decode(result.stdout))).toEqual({});
    }
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});
