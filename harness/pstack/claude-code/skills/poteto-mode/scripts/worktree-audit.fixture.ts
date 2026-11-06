import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

type PullRequest = {
	number: number;
	state: string;
	headRefName: string;
	headRefOid: string;
};

type AuditRow = {
	merged: string;
	dirty: string;
	remote: string;
	pr: string;
	lastChat: string;
	bucket: string;
};

export function createAuditFixture() {
	const root = mkdtempSync(join(tmpdir(), "worktree-audit-test-"));
	const home = join(root, "home");
	const bin = join(root, "bin");
	const origin = join(root, "origin.git");
	const repo = join(root, "repo");
	const prs = join(root, "prs.json");
	const env = {
		...process.env,
		HOME: home,
		GIT_CONFIG_GLOBAL: join(root, "gitconfig"),
		GIT_CONFIG_NOSYSTEM: "1",
		PATH: `${bin}:${process.env.PATH}`,
		AUDIT_FIXTURE_PRS: prs,
	};
	const cleanup = () => rmSync(root, { recursive: true, force: true });
	const run = (directory: string, command: string, args: string[]) => {
		const result = spawnSync(command, args, { cwd: directory, env, encoding: "utf8" });
		if (result.status !== 0)
			throw new Error(`${command} ${args.join(" ")} failed in ${directory}: ${result.error ?? result.stderr}`);
		return result.stdout.trim();
	};
	const git = (directory: string, ...args: string[]) => run(directory, "git", args);
	const setPrs = (value: PullRequest[]) => writeFileSync(prs, JSON.stringify(value));

	try {
		mkdirSync(home);
		mkdirSync(bin);
		setPrs([]);
		writeFileSync(join(bin, "gh"), '#!/bin/sh\ncat "$AUDIT_FIXTURE_PRS"\n', { mode: 0o755 });
		git(root, "config", "--global", "user.name", "Audit Test");
		git(root, "config", "--global", "user.email", "audit@example.test");
		git(root, "config", "--global", "init.defaultBranch", "main");
		git(root, "init", "--bare", origin);
		git(root, "clone", origin, repo);
		writeFileSync(join(repo, "base"), "base\n");
		git(repo, "add", "base");
		git(repo, "commit", "-m", "base");
		git(repo, "push", "origin", "main");
		git(repo, "remote", "set-head", "origin", "main");
	} catch (error) {
		cleanup();
		throw error;
	}

	const audit = (extraEnv: NodeJS.ProcessEnv = {}) => {
		const result = spawnSync("bash", [join(import.meta.dir, "worktree-audit.sh"), repo], {
			cwd: repo,
			env: { ...env, ...extraEnv },
			encoding: "utf8",
		});
		const rows: Record<string, AuditRow> = {};
		for (const line of result.stdout.trim().split("\n")) {
			if (!line || line.startsWith("# base:") || line.startsWith("SIZE\t")) continue;
			const [, , merged, dirty, remote, pr, lastChat, bucket, worktree] = line.split("\t");
			rows[basename(worktree)] = { merged, dirty, remote, pr, lastChat, bucket };
		}
		return { status: result.status, stderr: result.stderr, rows };
	};

	return { root, home, origin, repo, env, run, git, setPrs, audit, cleanup };
}
