import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, expect, test } from "bun:test";
import { createAuditFixture } from "./worktree-audit.fixture";

const fixture = createAuditFixture();
afterAll(fixture.cleanup);
const { root, repo, origin, git } = fixture;
const worktree = (branch: string) => {
	const directory = join(root, branch);
	git(repo, "worktree", "add", "-b", branch, directory, "main");
	return directory;
};
const commit = (directory: string, file: string) => {
	writeFileSync(join(directory, file), `${file}\n`);
	git(directory, "add", file);
	git(directory, "commit", "-m", file);
	return git(directory, "rev-parse", "HEAD");
};
const pushed = (branch: string) => {
	const directory = worktree(branch);
	const head = commit(directory, branch);
	git(directory, "push", "origin", branch);
	return { directory, head };
};

const closedUnpushed = pushed("closed-unpushed");
commit(closedUnpushed.directory, "local-only");
const closedPushed = pushed("closed-pushed");
const behind = pushed("behind");
const other = join(root, "other");
git(root, "clone", origin, other);
git(other, "checkout", "behind");
commit(other, "remote-only");
git(other, "push", "origin", "behind");
git(behind.directory, "fetch", "origin");

const squashPruned = pushed("squash-pruned");
const squashKept = pushed("squash-kept");
const mergedThenMore = pushed("merged-then-more");
for (const branch of ["squash-pruned", "squash-kept", "merged-then-more"]) {
	git(repo, "merge", "--squash", branch);
	git(repo, "commit", "-m", `Squash ${branch}`);
}
git(repo, "push", "origin", "main");
git(repo, "push", "origin", "--delete", "squash-pruned", "merged-then-more");
git(repo, "fetch", "--prune", "origin");
commit(mergedThenMore.directory, "after-merge");

const detached = join(root, "detached-off-base");
git(repo, "worktree", "add", "--detach", detached, "main");
commit(detached, "detached-only");

const gone = join(root, "detached-gone");
git(repo, "worktree", "add", "--detach", gone, "main");
commit(gone, "gone-only");
rmSync(gone, { recursive: true, force: true });

const reused = pushed("reused-name");
git(repo, "push", "origin", "--delete", "reused-name");
git(repo, "fetch", "--prune", "origin");

fixture.setPrs([
	{ number: 8, state: "CLOSED", headRefName: "reused-name", headRefOid: "0".repeat(40) },
	{ number: 7, state: "MERGED", headRefName: "reused-name", headRefOid: reused.head },
	{ number: 1, state: "CLOSED", headRefName: "closed-unpushed", headRefOid: closedUnpushed.head },
	{ number: 2, state: "CLOSED", headRefName: "closed-pushed", headRefOid: closedPushed.head },
	{ number: 4, state: "MERGED", headRefName: "squash-pruned", headRefOid: squashPruned.head },
	{ number: 5, state: "MERGED", headRefName: "squash-kept", headRefOid: squashKept.head },
	{ number: 6, state: "MERGED", headRefName: "merged-then-more", headRefOid: mergedThenMore.head },
]);
const result = fixture.audit();

const expectations = [
	["closed-unpushed", "ahead1", "#1/CLOSED", "hold-unpushed"],
	["closed-pushed", "pushed", "#2/CLOSED", "review"],
	["behind", "behind", "-", "review"],
	["squash-pruned", "no-remote", "#4/MERGED", "safe"],
	["squash-kept", "pushed", "#5/MERGED", "safe"],
	["merged-then-more", "no-remote", "#6/MERGED", "hold-unpushed"],
	["detached-off-base", "detached", "-", "hold-unpushed"],
	["detached-gone", "detached", "-", "hold-unpushed"],
	["reused-name", "no-remote", "#7/MERGED", "safe"],
];
for (const [worktree, remote, pr, bucket] of expectations) {
	test(`worktree audit: ${worktree}`, () => {
		expect(result.status).toBe(0);
		expect(result.rows[worktree]).toMatchObject({ remote, pr, bucket });
		if (worktree === "squash-pruned") expect(result.rows[worktree].merged).toBe("no");
	});
}
