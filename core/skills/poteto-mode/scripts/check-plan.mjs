#!/usr/bin/env node
import fs from "node:fs";
import process from "node:process";

const RULE =
	"Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.";
const LANES = /Ten lanes on `[^`<>]+` at the PR head/;
const SUB_BLOCKS = [
	"Depends on.",
	"Files.",
	"Build.",
	"You see.",
	"Verify, unit.",
	"Verify, live.",
	"Verify, perf.",
	"Review gate.",
	"Merge.",
];
const PROGRAM_H3 = ["Arm the program", "Spawn owners", "PR mechanics", "Verdict and merge", "Boot recipe"];
const PROGRAM_MARKERS = ["git show origin/main:", "hourly audit", "status message"];
const HOW_TO_READ_MARKERS = [
	"One box is one unit of work",
	"names the evidence",
	"Check a box only when its evidence exists",
	"playbooks/",
	RULE,
];
const PERF_ITEMS = ["Metric.", "Probe.", "Baseline.", "Rule."];
const BOX = /^\s*- \[[ x]\] (.*)$/;
const SPAN = /`[^`]*`/g;
const SLOT = /<[^<>]+>/g;
const FENCE = /^\s*(`{3,}|~{3,})/;
const LIST = /^\s*([-*+]|\d+\.)\s/;
// A block headed ", for every PR" or ", for every live lane" is a template the owners instantiate.
const FOR_EVERY = /^#{2,3} .*, for every /;
const mask = (t) => t.replace(SPAN, "`");

const file = process.argv[2];
if (!file) {
	console.error("Usage: node check-plan.mjs <plan.md>");
	process.exit(2);
}

// The placeholders are the skeleton's own, read from the playbook this script ships beside (or the
// source tree's), so the check and the skeleton cannot drift apart.
const playbook = ["../playbooks/multi-phase-plan.md", "../../../playbooks/multi-phase-plan.md"]
	.map((p) => new URL(p, import.meta.url))
	.find((u) => fs.existsSync(u));
if (!playbook) {
	console.error("check-plan.mjs: playbooks/multi-phase-plan.md is not beside this script");
	process.exit(2);
}
const proseSlots = new Set();
const codeSpans = new Set();
const names = new Set();
const loopNames = new Set();
{
	let loop = false;
	const text = fs.readFileSync(playbook, "utf8").replace(/\r\n/g, "\n");
	const skeleton = text.split("````markdown\n")[1]?.split("\n````")[0] ?? "";
	for (const line of skeleton.split("\n")) {
		if (/^#{2,3} /.test(line)) loop = FOR_EVERY.test(line);
		for (const [slot] of mask(line).matchAll(SLOT)) proseSlots.add(slot);
		for (const [span] of line.matchAll(SPAN)) {
			for (const [slot] of span.matchAll(SLOT)) {
				names.add(slot);
				if (loop) loopNames.add(slot);
			}
			if (/<[^<>]+>/.test(span)) codeSpans.add(span);
		}
	}
}
// No placeholders means the skeleton was not found, and every plan would pass.
if (!proseSlots.size) {
	console.error(`check-plan.mjs: found no placeholders in the skeleton of ${playbook.pathname}`);
	process.exit(2);
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const raw = fs.readFileSync(file, "utf8").split(/\r?\n/);
const problems = [];
const fail = (line, message) => problems.push(`${file}:${line}: ${message}`);

let start = 0;
if (raw[0] === "---") {
	start = raw.indexOf("---", 1) + 1;
}

const lines = [];
let fence = null;
let indented = false;
let blank = true;
let item = -1; // the content column of the open list item, or -1
for (let i = start; i < raw.length; i++) {
	const text = raw[i];
	const n = i + 1;
	const mark = text.match(FENCE)?.[1];
	const cols = text.replace(/\t/g, "    ");
	const lead = cols.match(/^ */)[0].length;
	const bullet = cols.match(LIST);
	// An indented code block sits four columns past the text it belongs to, a list item's included,
	// after a blank line. Less than that inside a list item is a continuation paragraph.
	indented = fence === null && mark === undefined && !bullet && lead >= (item < 0 ? 4 : item + 4) && (blank || indented);
	if (!indented && fence === null && mark === undefined && text.trim() !== "") {
		if (bullet) item = bullet[0].length;
		else if (lead < Math.max(item, 1)) item = -1;
	}
	blank = text.trim() === "";
	const code = fence !== null || mark !== undefined || indented;
	if (fence === null) fence = mark ?? null;
	else if (mark && mark[0] === fence[0] && mark.length >= fence.length && text.trim() === mark) fence = null;
	lines.push({ n, text, code });
	if (code) continue;
	const prose = text
		.replace(/`[^`]*`/g, "`")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
		.replace(/\]\([^)]*\)/g, "]");
	if (/[\u2013\u2014]/.test(prose)) fail(n, "long dash");
	if (/[\u2018\u2019\u201c\u201d]/.test(prose)) fail(n, "curly quote");
	if (/: \S/.test(prose)) fail(n, "mid-sentence colon");
}

let loop = false;
for (const l of lines) {
	if (l.code) continue;
	if (/^#{2,3} /.test(l.text)) loop = FOR_EVERY.test(l.text);
	const masked = mask(l.text);
	const slots = new Set([...proseSlots].filter((s) => masked.includes(s)));
	for (const [span] of l.text.matchAll(SPAN)) {
		const live = [...span.matchAll(SLOT)].map((m) => m[0]).filter((s) => names.has(s) && !(loop && loopNames.has(s)));
		// A name in code is a value only when the span is the skeleton's, the name stands alone, or it is
		// joined to a path. `app export <path>` is usage syntax, not a slot.
		const unfilled = live.filter((s) => codeSpans.has(span) || span === `\`${s}\``
			|| new RegExp(`[^\\s\`]${esc(s)}|${esc(s)}[^\\s\`]`).test(span));
		for (const s of unfilled) slots.add(s);
	}
	if (slots.size) fail(l.n, `unfilled placeholder ${[...slots].join(", ")}`);
}

const h2 = (l) => (!l.code && l.text.startsWith("## ") ? l.text.slice(3).trim() : null);
const sections = [];
for (const l of lines) {
	const title = h2(l);
	if (title !== null) sections.push({ title, n: l.n, body: [] });
	else if (sections.length) sections.at(-1).body.push(l);
}
const find = (title) => sections.find((s) => s.title === title);
const bodyText = (s) => s.body.map((l) => l.text).join("\n");
const boxes = (ls) => ls.filter((l) => !l.code && BOX.test(l.text)).map((l) => ({ n: l.n, text: l.text.match(BOX)[1] }));

const h1 = lines.findIndex((l) => !l.code && l.text.startsWith("# "));
if (h1 === -1) fail(1, "no H1 title");
const howToRead = find("How to read this");
if (!howToRead) fail(1, 'no "## How to read this" section');
if (h1 !== -1 && howToRead) {
	const intro = lines.slice(h1 + 1).filter((l) => l.n < howToRead.n && l.text.trim() !== "");
	if (intro.length >= 10) fail(lines[h1].n, `intro is ${intro.length} lines, under ten required`);
	for (const marker of HOW_TO_READ_MARKERS) {
		if (!bodyText(howToRead).includes(marker)) fail(howToRead.n, `How to read this lacks "${marker}"`);
	}
}

const program = find("Program checklist");
if (!program) fail(1, 'no "## Program checklist" section');
else {
	const h3s = program.body.filter((l) => !l.code && l.text.startsWith("### ")).map((l) => l.text.slice(4).trim());
	let cursor = 0;
	for (const name of PROGRAM_H3) {
		const at = h3s.findIndex((t, i) => i >= cursor && t.startsWith(name));
		if (at === -1) fail(program.n, `Program checklist lacks "### ${name}" in order`);
		else cursor = at + 1;
	}
	for (const marker of PROGRAM_MARKERS) {
		if (!bodyText(program).includes(marker)) fail(program.n, `Program checklist lacks "${marker}"`);
	}
}

const close = find("Close the program");
if (!close) fail(1, 'no "## Close the program" section');
const programIndex = sections.indexOf(program);
const closeIndex = sections.indexOf(close);
const prSections = programIndex === -1 || closeIndex === -1 ? [] : sections.slice(programIndex + 1, closeIndex);
if (prSections.length === 0) fail(1, "no PR sections between Program checklist and Close the program");

const report = [];
for (const pr of prSections) {
	const heads = [];
	for (const l of pr.body) {
		if (l.code) continue;
		const m = l.text.match(/^\*\*([^*]+)\*\*(.*)$/);
		if (m && SUB_BLOCKS.includes(m[1])) heads.push({ name: m[1], n: l.n, rest: m[2].trim(), lines: [] });
		else if (heads.length) heads.at(-1).lines.push(l);
	}
	const names = heads.map((h) => h.name);
	if (names.join("|") !== SUB_BLOCKS.join("|")) {
		fail(pr.n, `${pr.title}: sub-blocks are [${names.join(", ")}], expected [${SUB_BLOCKS.join(", ")}]`);
	}
	const block = (name) => heads.find((h) => h.name === name);
	const counts = {};
	for (const h of heads) counts[h.name] = boxes(h.lines).length;

	const depends = block("Depends on.");
	if (depends && depends.rest === "") fail(depends.n, `${pr.title}: Depends on names nothing`);
	for (const name of ["Files.", "Build.", "You see.", "Verify, unit.", "Merge."]) {
		const b = block(name);
		if (b && boxes(b.lines).length === 0) fail(b.n, `${pr.title}: ${name} has no box`);
	}
	for (const name of ["Verify, unit.", "Verify, live.", "Verify, perf."]) {
		const b = block(name);
		if (b && !b.rest.startsWith(RULE)) fail(b.n, `${pr.title}: ${name} does not open with the rule`);
	}

	const live = block("Verify, live.");
	if (live) {
		if (!LANES.test(live.rest)) fail(live.n, `${pr.title}: Verify, live lacks "Ten lanes on \`<swarm workers model>\` at the PR head" with the model filled in`);
		const lanes = boxes(live.lines).map((b) => ({ ...b, m: b.text.match(/^Lane (\d+)\. /) }));
		const numbers = lanes.filter((b) => b.m).map((b) => Number(b.m[1])).sort((a, b) => a - b);
		if (numbers.join(",") !== "1,2,3,4,5,6,7,8,9,10") fail(live.n, `${pr.title}: lanes are [${numbers.join(",")}], expected 1 to 10`);
		for (const lane of lanes) {
			if (!lane.m) fail(lane.n, `${pr.title}: live box is not a lane`);
			else if (!/Save `[^`]+`/.test(lane.text)) fail(lane.n, `${pr.title}: lane ${lane.m[1]} names no screenshot`);
			else if (!lane.text.includes("Pass when")) fail(lane.n, `${pr.title}: lane ${lane.m[1]} has no pass predicate`);
		}
	}

	const perf = block("Verify, perf.");
	if (perf) {
		const items = boxes(perf.lines).map((b) => b.text.split(" ")[0]);
		if (items.join("|") !== PERF_ITEMS.join("|")) fail(perf.n, `${pr.title}: perf boxes are [${items.join(", ")}], expected [${PERF_ITEMS.join(", ")}]`);
	}

	const gate = block("Review gate.");
	if (gate) {
		const gateBoxes = boxes(gate.lines);
		if (gate.rest.startsWith("None.")) {
			if (gateBoxes.length) fail(gate.n, `${pr.title}: Review gate says None but has boxes`);
		} else {
			const text = gate.lines.map((l) => l.text).join("\n");
			if (gateBoxes.length === 0) fail(gate.n, `${pr.title}: Review gate has no box`);
			for (const word of ["screenshot", "video", "operator"]) {
				if (!text.includes(word)) fail(gate.n, `${pr.title}: Review gate lacks "${word}"`);
			}
		}
	}

	const total = boxes(pr.body).length;
	const cells = SUB_BLOCKS.filter((s) => s !== "Depends on.").map((s) => `${s.replace(/[ ,.]+/g, "-").replace(/-$/, "").toLowerCase()}=${counts[s] ?? 0}`);
	report.push(`${pr.title}  boxes=${total}  ${cells.join(" ")}`);
}

if (closeIndex !== -1) {
	const tail = sections.slice(closeIndex + 1);
	for (const s of tail) {
		if (!s.title.startsWith("Appendix")) fail(s.n, `"## ${s.title}" after Close the program is not an appendix`);
	}
	if (!tail.some((s) => s.title.includes("Prototype evidence"))) fail(close.n, 'no "## Appendix ... Prototype evidence" section');
}

for (const line of report) console.log(line);
console.log(`${prSections.length} PR sections, ${problems.length} problems`);
for (const p of problems) console.error(p);
process.exit(problems.length ? 1 : 0);
