#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const opts = {
    check: false,
    push: false,
    install: true,
    installDir: "",
    remote: "upstream",
    branch: "main",
    selfTest: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--check") {
      opts.check = true;
    } else if (arg === "--push") {
      opts.push = true;
    } else if (arg === "--no-install") {
      opts.install = false;
    } else if (arg === "--self-test") {
      opts.selfTest = true;
    } else if (arg === "--install-dir" && i + 1 < argv.length) {
      opts.installDir = resolve(argv[++i]);
    } else if (arg === "--remote" && i + 1 < argv.length) {
      opts.remote = argv[++i];
    } else if (arg === "--branch" && i + 1 < argv.length) {
      opts.branch = argv[++i];
    } else {
      throw new Error(`Unknown or incomplete option: ${arg}`);
    }
  }
  return opts;
}

function run(cmd, args, cwd, { allowFailure = false, inherit = false } = {}) {
  const res = spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    stdio: inherit ? "inherit" : "pipe",
  });
  if (res.error) throw res.error;
  if (!allowFailure && res.status !== 0) {
    const detail = [res.stderr, res.stdout].filter(Boolean).join("\n").trim();
    throw new Error(`${cmd} ${args.join(" ")} failed (exit ${res.status}): ${detail}`);
  }
  return res;
}

function git(args, cwd, options = {}) {
  return run("git", args, cwd, options);
}

function gitOut(args, cwd) {
  return git(args, cwd).stdout.trim();
}

function parseLines(text) {
  return text ? text.split("\n").map((s) => s.trim()).filter(Boolean) : [];
}

function runHarnessScripts(repoRoot, opts) {
  run("node", ["scripts/generate-pstack-harness-trees.mjs", "--check"], repoRoot, { inherit: true });
  run("node", ["scripts/check-pstack-docs.mjs"], repoRoot, { inherit: true });
  if (opts.install) {
    const agyArgs = ["scripts/generate-pstack-agy.mjs", "--install"];
    if (opts.installDir) agyArgs.push("--install-dir", opts.installDir);
    run("node", agyArgs, repoRoot, { inherit: true });
  }
}

function printUpstreamSummary(repoRoot, remoteRef) {
  const behind = Number.parseInt(gitOut(["rev-list", "--count", `HEAD..${remoteRef}`], repoRoot), 10);
  const ahead = Number.parseInt(gitOut(["rev-list", "--count", `${remoteRef}..HEAD`], repoRoot), 10);
  const commits = parseLines(gitOut(["log", "--oneline", `HEAD..${remoteRef}`], repoRoot));
  const touched = parseLines(gitOut(["diff", "--name-only", `HEAD...${remoteRef}`], repoRoot)).filter(
    (f) => f.startsWith("pstack/") || f.startsWith("harness/") || f.startsWith("scripts/"),
  );
  console.log(`Status vs ${remoteRef}: ahead ${ahead}, behind ${behind}`);
  for (const line of commits.slice(0, 30)) console.log(`  ${line}`);
  if (commits.length > 30) console.log(`  ... (${commits.length} total)`);
  if (touched.length > 0) {
    console.log(`Upstream files affecting pstack/harness/scripts (${touched.length}):`);
    for (const f of touched.slice(0, 30)) console.log(`  ${f}`);
  } else if (behind > 0) {
    console.log("Upstream changes are outside pstack/harness/scripts.");
  }
  return behind;
}

function syncRepo(repoRoot, opts) {
  const dirty = gitOut(["status", "--porcelain"], repoRoot);
  if (!opts.check && dirty) {
    throw new Error(`Working tree in ${repoRoot} is not clean; commit or stash changes before syncing.\n${dirty}`);
  }

  git(["fetch", opts.remote, opts.branch], repoRoot, { inherit: true });
  const remoteRef = `${opts.remote}/${opts.branch}`;
  const upstreamSha = gitOut(["rev-parse", "--short", remoteRef], repoRoot);

  if (opts.check) {
    printUpstreamSummary(repoRoot, remoteRef);
    return { status: "checked", upstreamSha };
  }

  const ancestorRes = git(["merge-base", "--is-ancestor", remoteRef, "HEAD"], repoRoot, { allowFailure: true });
  if (ancestorRes.status === 0) {
    runHarnessScripts(repoRoot, opts);
    if (opts.push) git(["push", "origin", "HEAD"], repoRoot, { inherit: true });
    console.log(`Already up to date with ${remoteRef} (${upstreamSha}).`);
    return { status: "up_to_date", upstreamSha };
  }

  const mergeRes = git(["merge", "--no-commit", "--no-ff", remoteRef], repoRoot, { allowFailure: true });
  if (mergeRes.status !== 0) {
    const conflicts = parseLines(gitOut(["diff", "--name-only", "--diff-filter=U"], repoRoot));
    const generated = conflicts.filter((f) => f.startsWith("harness/pstack/"));
    const source = conflicts.filter((f) => !f.startsWith("harness/pstack/"));
    if (source.length > 0) {
      git(["merge", "--abort"], repoRoot, { allowFailure: true });
      throw new Error(`Upstream merge aborted due to source conflicts:\n${source.map((f) => `  ${f}`).join("\n")}`);
    }
    if (conflicts.length === 0) {
      git(["merge", "--abort"], repoRoot, { allowFailure: true });
      throw new Error(`git merge ${remoteRef} failed:\n${mergeRes.stderr || mergeRes.stdout}`);
    }
    if (generated.length > 0) {
      console.log(`Auto-resolving ${generated.length} generated conflict(s) under harness/pstack/...`);
    }
  }

  try {
    run("node", ["scripts/generate-pstack-harness-trees.mjs"], repoRoot, { inherit: true });
    git(["add", "-A", "harness/pstack"], repoRoot);
    const remaining = parseLines(gitOut(["diff", "--name-only", "--diff-filter=U"], repoRoot));
    if (remaining.length > 0) {
      throw new Error(`Unmerged paths remain after regenerating harness/pstack/: ${remaining.join(", ")}`);
    }
    runHarnessScripts(repoRoot, opts);
  } catch (err) {
    git(["merge", "--abort"], repoRoot, { allowFailure: true });
    throw err;
  }

  git(
    ["commit", "-m", `chore(sync): merge upstream cursor/plugins (${upstreamSha}) and regenerate pstack packages`],
    repoRoot,
    { inherit: true },
  );
  if (opts.push) git(["push", "origin", "HEAD"], repoRoot, { inherit: true });
  console.log(`Synced ${remoteRef} (${upstreamSha}) cleanly.`);
  return { status: "merged", upstreamSha };
}

function seedMinimalRepo(targetDir) {
  cpSync(join(ROOT, "pstack"), join(targetDir, "pstack"), { recursive: true });
  cpSync(join(ROOT, "cursor-team-kit", "skills"), join(targetDir, "cursor-team-kit", "skills"), { recursive: true });
  for (const name of ["generate-pstack-agy.mjs", "generate-pstack-harness-trees.mjs", "check-pstack-docs.mjs", "sync-upstream.mjs"]) {
    const dst = join(targetDir, "scripts", name);
    mkdirSync(dirname(dst), { recursive: true });
    cpSync(join(ROOT, "scripts", name), dst);
  }
  run("node", ["scripts/generate-pstack-harness-trees.mjs"], targetDir);
}

function initGitUser(repoDir) {
  git(["config", "user.name", "Test User"], repoDir);
  git(["config", "user.email", "test@example.com"], repoDir);
}

function runSelfTest() {
  const base = mkdtempSync(join(tmpdir(), "pstack-sync-test-"));
  try {
    const upstreamBare = join(base, "upstream.git");
    const workUp = join(base, "work-upstream");
    const forkDir = join(base, "fork");
    const installDir = join(base, "installed-pstack");

    git(["init", "--bare", "-b", "main", upstreamBare], base);
    mkdirSync(workUp, { recursive: true });
    git(["init", "-b", "main", workUp], base);
    initGitUser(workUp);
    seedMinimalRepo(workUp);
    git(["add", "."], workUp);
    git(["commit", "-m", "initial pstack"], workUp);
    git(["remote", "add", "origin", upstreamBare], workUp);
    git(["push", "-u", "origin", "main"], workUp);

    git(["clone", "--branch", "main", upstreamBare, forkDir], base);
    git(["remote", "rename", "origin", "upstream"], forkDir);
    initGitUser(forkDir);

    const readmePath = join(forkDir, "harness", "pstack", "README.md");
    const broPathUp = join(workUp, "pstack", "skills", "bro", "SKILL.md");
    const readmePathUp = join(workUp, "harness", "pstack", "README.md");

    writeFileSync(readmePath, `${readFileSync(readmePath, "utf8")}\n<!-- fork-side generated edit -->\n`, "utf8");
    git(["add", "harness/pstack/README.md"], forkDir);
    git(["commit", "-m", "fork generated header note"], forkDir);

    writeFileSync(broPathUp, `${readFileSync(broPathUp, "utf8")}\nUpstream sync marker sentence.\n`, "utf8");
    run("node", ["scripts/generate-pstack-harness-trees.mjs"], workUp);
    writeFileSync(readmePathUp, `${readFileSync(readmePathUp, "utf8")}\n<!-- upstream-side conflict line -->\n`, "utf8");
    git(["add", "-A"], workUp);
    git(["commit", "-m", "upstream update bro skill and README"], workUp);
    git(["push", "origin", "main"], workUp);

    const customRules = "# custom model rule\nfeature, refactoring: pro\n";
    mkdirSync(join(installDir, "rules"), { recursive: true });
    writeFileSync(join(installDir, "rules", "AGENTS.md"), customRules, "utf8");

    const scriptPath = join(forkDir, "scripts", "sync-upstream.mjs");
    const checkOut = run("node", [scriptPath, "--check"], forkDir);
    if (!checkOut.stdout.includes("behind 1")) {
      throw new Error(`Expected --check to report behind 1, got:\n${checkOut.stdout}`);
    }

    const r1 = run("node", [scriptPath, "--install-dir", installDir], forkDir);
    for (const tree of ["claude-code", "antigravity", "codex"]) {
      const mergedBro = readFileSync(join(forkDir, "harness", "pstack", tree, "skills", "bro", "SKILL.md"), "utf8");
      if (!mergedBro.includes("Upstream sync marker sentence.")) {
        throw new Error(`Expected regenerated ${tree} bro skill to contain upstream update; stdout=${r1.stdout}`);
      }
    }
    const installedBro = readFileSync(join(installDir, "skills", "bro", "SKILL.md"), "utf8");
    if (!installedBro.includes("Upstream sync marker sentence.")) {
      throw new Error("Expected installed bro skill to be updated by sync");
    }
    const preserved = readFileSync(join(installDir, "rules", "AGENTS.md"), "utf8");
    if (preserved !== customRules) {
      throw new Error(`Expected custom AGENTS.md without marker to be preserved, got:\n${preserved}`);
    }
    if (gitOut(["status", "--porcelain"], forkDir) !== "") {
      throw new Error("Expected clean working tree after merge");
    }

    const r2 = run("node", [scriptPath, "--install-dir", installDir], forkDir);
    if (!r2.stdout.includes("Already up to date")) {
      throw new Error(`Expected idempotent second sync, got:\n${r2.stdout}`);
    }

    console.log("ALL sync-upstream.mjs SELF-TESTS PASSED");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
}

const opts = parseArgs(process.argv.slice(2));
if (opts.selfTest) {
  runSelfTest();
} else {
  syncRepo(ROOT, opts);
}
