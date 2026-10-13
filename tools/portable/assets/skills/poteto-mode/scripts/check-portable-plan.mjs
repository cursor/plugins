#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

// Updating this pin requires reviewing the upstream checker and its output contract.
const REVIEWED_CHECKER_SHA256 = "e58c3d871b09d477be00628d69dd23ffa6c2e3a1728f5b867a841baa8e90278b";
const COMPATIBILITY = new Set([
	'Program checklist lacks "git show origin/main:"',
	'Program checklist lacks "/loop 1h"',
]);
const EXECUTION_PLAYBOOKS = ["autopilot-full", "autopilot-stack", "orchestrate"]
	.map((name) => `poteto-mode/playbooks/${name}.md`);
const CONTRACT_KEYS = [
	"version", "skillsRoot", "executionPlaybook", "readAt", "auditEveryMinutes",
	"wakeMechanism", "wakeEvidence", "availableLifetime", "requiredLifetime", "stopWhen", "checkpoint",
];
const sha256 = (data) => createHash("sha256").update(data).digest("hex");
const nonempty = (value) => typeof value === "string" && value.trim().length > 0;

function readContract(raw) {
	const contracts = [];
	let fence = null;
	let body = [];
	let section = "";
	let heading = "";
	let sawProgram = false;
	let inFirstProgram = false;
	const lines = raw.split(/\r?\n/);
	const start = lines[0] === "---" ? lines.indexOf("---", 1) + 1 : 0;
	for (const line of lines.slice(start)) {
		const delimiter = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
		if (fence !== null) {
			if (delimiter && delimiter[1][0] === fence.marker[0]
				&& delimiter[1].length >= fence.marker.length && delimiter[2].trim() === "") {
				if (fence.runtime) contracts.push({ json: body.join("\n"), inArm: fence.inArm });
				fence = null;
			} else if (fence.runtime) body.push(line);
		} else if (delimiter) {
			fence = { marker: delimiter[1], runtime: delimiter[2].trim() === "portable-runtime",
				inArm: inFirstProgram && heading.startsWith("Arm the program") };
			body = [];
		} else if (line.startsWith("## ")) {
			section = line.slice(3).trim();
			inFirstProgram = section === "Program checklist" && !sawProgram;
			if (section === "Program checklist") sawProgram = true;
			heading = "";
		} else if (line.startsWith("### ")) heading = line.slice(4).trim();
	}
	if (fence?.runtime || contracts.length !== 1) {
		throw new Error("expected exactly one closed portable-runtime JSON fence");
	}
	if (!contracts[0].inArm) throw new Error("portable-runtime must be under Program checklist > Arm the program");
	const json = contracts[0].json;
	const contract = JSON.parse(json);
	if (contract === null || Array.isArray(contract) || typeof contract !== "object") {
		throw new Error("portable-runtime must be an object");
	}
	const tokens = json.match(/"(?:\\[\s\S]|[^"\\])*"|[^\s]/g);
	const keys = new Set();
	for (let i = 0; i < tokens.length - 1; i++) {
		if (tokens[i + 1] !== ":") continue;
		const key = JSON.parse(tokens[i]);
		if (keys.has(key)) throw new Error(`duplicate portable-runtime key ${JSON.stringify(key)}`);
		keys.add(key);
	}
	if (Object.keys(contract).sort().join("|") !== [...CONTRACT_KEYS].sort().join("|")) {
		throw new Error(`portable-runtime requires exactly these fields: ${CONTRACT_KEYS.join(", ")}`);
	}
	if (contract.version !== 1) throw new Error("unsupported portable-runtime version");
	for (const key of ["skillsRoot", "stopWhen", "checkpoint"]) {
		if (!nonempty(contract[key])) throw new Error(`${key} must be a nonempty string`);
	}
	if (!EXECUTION_PLAYBOOKS.includes(contract.executionPlaybook)) {
		throw new Error("executionPlaybook must name autopilot-full, autopilot-stack, or orchestrate in poteto-mode/playbooks");
	}
	if (JSON.stringify(contract.readAt) !== '["start","every-audit"]') {
		throw new Error('readAt must be ["start","every-audit"]');
	}
	if (contract.auditEveryMinutes !== 60) throw new Error("auditEveryMinutes must be 60");
	for (const key of ["wakeMechanism", "wakeEvidence"]) {
		if (contract[key] !== null && !nonempty(contract[key])) throw new Error(`${key} must be a nonempty string or null`);
	}
	if (!["unavailable", "active-session", "persistent"].includes(contract.availableLifetime)
		|| !["active-session", "persistent"].includes(contract.requiredLifetime)) {
		throw new Error("invalid availableLifetime or requiredLifetime");
	}
	if ((contract.wakeMechanism === null) !== (contract.availableLifetime === "unavailable")
		|| (contract.wakeMechanism === null && contract.wakeEvidence !== null)) {
		throw new Error("wake mechanism, evidence, and available lifetime contradict one another");
	}
	return contract;
}

function inspectSnapshot(contract, plan, installedRoot) {
	const root = fs.realpathSync(path.resolve(path.dirname(plan), contract.skillsRoot));
	const companion = "poteto-mode/scripts/check-portable-plan.mjs";
	if (fs.realpathSync(path.join(root, companion)) !== fs.realpathSync(path.join(installedRoot, companion))) {
		throw new Error("skillsRoot must identify this companion's installed skills directory");
	}
	const files = [contract.executionPlaybook, "swarm/SKILL.md", "poteto-mode/playbooks/opening-a-pr.md"];
	return files.map((file) => {
		const resource = fs.realpathSync(path.join(root, file));
		const canonical = fs.realpathSync(path.join(installedRoot, file));
		if (resource !== canonical || !canonical.startsWith(installedRoot + path.sep)
			|| !fs.statSync(resource).isFile()) {
			throw new Error(`required resource must be a file in the same installed snapshot: ${file}`);
		}
		return { file, sha256: sha256(fs.readFileSync(resource)) };
	});
}

function checkUpstream(checker, plan) {
	const result = spawnSync(process.execPath, [checker, plan], {
		encoding: "utf8", timeout: 30000, maxBuffer: 4 * 1024 * 1024,
	});
	if (result.error || result.signal || ![0, 1].includes(result.status)) {
		throw new Error(`upstream checker failed to complete normally (${result.error?.message ?? result.signal ?? result.status})`);
	}
	const stdout = result.stdout.trimEnd().split("\n");
	const summary = stdout.pop()?.match(/^(\d+) PR sections, (\d+) problems$/);
	const diagnostics = result.stderr === "" ? [] : result.stderr.trimEnd().split("\n");
	if (!summary || Number(summary[1]) !== stdout.length || Number(summary[2]) !== diagnostics.length
		|| result.status !== (diagnostics.length ? 1 : 0)
		|| stdout.some((line) => !/^.*  boxes=\d+  files=\d+ build=\d+ you-see=\d+ verify-unit=\d+ verify-live=\d+ verify-perf=\d+ review-gate=\d+ merge=\d+$/.test(line))) {
		throw new Error("upstream checker output or problem count is inconsistent");
	}
	const adapted = [];
	const substantive = [];
	const prefix = `${plan}:`;
	for (const diagnostic of diagnostics) {
		const match = diagnostic.startsWith(prefix) && diagnostic.slice(prefix.length).match(/^([1-9]\d*): (.+)$/);
		if (!match) throw new Error("unexpected upstream checker diagnostic");
		if (COMPATIBILITY.has(match[2])) {
			if (adapted.some((entry) => entry.message === match[2])) throw new Error("duplicate upstream compatibility diagnostic");
			adapted.push({ diagnostic, message: match[2] });
		} else substantive.push(diagnostic);
	}
	return { stdout: result.stdout, adapted, substantive };
}

function main() {
	if (process.argv.length !== 3) {
		console.error("Usage: node check-portable-plan.mjs <plan.md>");
		return 2;
	}
	const plan = path.resolve(process.argv[2]);
	const scripts = path.dirname(fileURLToPath(import.meta.url));
	const checker = path.join(scripts, "check-plan.mjs");
	if (sha256(fs.readFileSync(checker)) !== REVIEWED_CHECKER_SHA256) {
		throw new Error("upstream checker source drift; review check-plan.mjs and this companion before updating the reviewed SHA256");
	}
	const raw = fs.readFileSync(plan, "utf8");
	const upstream = checkUpstream(checker, plan);
	if (fs.readFileSync(plan, "utf8") !== raw) throw new Error("plan changed during the upstream check; retry against a stable file");
	process.stdout.write(`Unmodified upstream check\n${upstream.stdout}`);
	for (const diagnostic of upstream.substantive) console.error(diagnostic);
	let contract;
	let snapshot;
	try {
		contract = readContract(raw);
		snapshot = inspectSnapshot(contract, plan, fs.realpathSync(path.resolve(scripts, "../..")));
	} catch (error) {
		for (const { diagnostic } of upstream.adapted) console.error(diagnostic);
		console.error(`Portable contract FAIL. ${error.message}`);
		console.log("Portable STRUCTURE FAIL");
		console.log("Runtime assertions UNVERIFIED. No valid portable contract.");
		return 1;
	}
	for (const { diagnostic } of upstream.adapted) console.log(`Compatibility substitution. ${diagnostic}`);
	console.log(`Installed snapshot root ${JSON.stringify(fs.realpathSync(path.resolve(scripts, "../..")))}`);
	for (const resource of snapshot) console.log(`Installed snapshot SHA256 ${JSON.stringify(resource.file)} ${resource.sha256}`);
	console.log(`Portable STRUCTURE ${upstream.substantive.length ? "FAIL" : "PASS"}`);
	console.log("Runtime assertions UNVERIFIED. Resource reads, wake capability, cadence, lifetime, stop/checkpoint behavior, and operator approval need runtime evidence.");
	console.log(`Wake mechanism ${JSON.stringify(contract.wakeMechanism)}; evidence reference ${JSON.stringify(contract.wakeEvidence)} (not verified)`);
	if (contract.wakeEvidence === null) console.log("Wake evidence MISSING. No evidence reference supplied.");
	if (contract.availableLifetime === "unavailable"
		|| (contract.requiredLifetime === "persistent" && contract.availableLifetime !== "persistent")) {
		console.log("Runtime BLOCKED. The declared wake mechanism or lifetime cannot meet the plan requirement. Preserve the checkpoint; do not claim continued monitoring.");
		return 1;
	}
	return upstream.substantive.length ? 1 : 0;
}

try {
	process.exitCode = main();
} catch (error) {
	console.error(`Portable checker ERROR. ${error.message}`);
	process.exitCode = 2;
}
