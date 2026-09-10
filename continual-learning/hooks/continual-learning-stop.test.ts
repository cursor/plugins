import { expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const path_hook = join(import.meta.dir, "continual-learning-stop.ts");

test("uses trial cadence by default", async () => {
	const dir_workspace = mkdtempSync(join(tmpdir(), "continual-learning-"));
	const path_transcript = join(dir_workspace, "transcript.jsonl");
	writeFileSync(path_transcript, "{}\n");

	try {
		const outputs_hook = [];

		for (let count_turn = 1; count_turn <= 3; count_turn += 1) {
			outputs_hook.push(
				await runHook(dir_workspace, path_transcript, count_turn)
			);
		}

		expect(outputs_hook.slice(0, 2)).toEqual([{}, {}]);
		expect(outputs_hook[2]).toHaveProperty("followup_message");
	} finally {
		rmSync(dir_workspace, { recursive: true, force: true });
	}
});

async function runHook(
	dir_workspace: string,
	path_transcript: string,
	count_turn: number
): Promise<Record<string, unknown>> {
	const env_hook = { ...process.env };
	delete env_hook.CONTINUAL_LEARNING_TRIAL_MODE;
	delete env_hook.CONTINUOUS_LEARNING_TRIAL_MODE;

	const process_hook = Bun.spawn(["bun", "run", path_hook], {
		cwd: dir_workspace,
		env: env_hook,
		stdin: "pipe",
		stdout: "pipe",
		stderr: "pipe",
	});
	const input_hook = {
		conversation_id: "trial-default-test",
		generation_id: `generation-${count_turn}`,
		status: "completed",
		loop_count: 0,
		transcript_path: path_transcript,
	};

	process_hook.stdin.write(JSON.stringify(input_hook));
	process_hook.stdin.end();

	const [status_exit, text_stdout, text_stderr] = await Promise.all([
		process_hook.exited,
		new Response(process_hook.stdout).text(),
		new Response(process_hook.stderr).text(),
	]);
	expect(status_exit, text_stderr).toBe(0);

	return JSON.parse(text_stdout) as Record<string, unknown>;
}
