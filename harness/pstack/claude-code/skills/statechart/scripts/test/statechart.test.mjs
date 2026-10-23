import assert from "node:assert/strict";
import { constants } from "node:buffer";
import { spawn, spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, delimiter, dirname, join, posix, win32 } from "node:path";
import { test } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { crc32, inflateSync } from "node:zlib";
import {
  checkedOnlyInInitialStates,
  groupClassDef,
  parseDot,
  parseMermaid,
  parseTraces,
  parseValue,
  ruleSentences,
  stateKey,
  STATUS_CLASSES,
  tlcOutputWarning,
  uncitedConditions,
} from "../lib.mjs";
import {
  CACHE_NAME,
  cacheDir,
  fcMatch,
  fontMeasurer,
  loadRenderer,
  renderChart,
  THEMES,
} from "../render.mjs";
import { ruleBook } from "../rule-book.mjs";
import { copyPath } from "../snapshot.mjs";
import { findTlc, JAVA_TOOL, TLC_TOOL } from "../tlc-tools.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const scripts = dirname(here);
const fixture = (name) => readFileSync(join(here, name), "utf8");
const edges = (r) => r.transitions.map((t) => `${t.from} -> ${t.to} : ${t.label}`).sort();
const node = (script, args, cwd, env = {}, at = scripts) => {
  const r = spawnSync(process.execPath, [join(at, script), ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...env },
    timeout: 120_000,
  });
  r.stdout = r.stdout?.replace(/^( {2}TLC ran \d+ times? in )\d+\.\d s\.$/gm, "$1N s.");
  return r;
};
const statusOf = (chart) => {
  const names = new Map(
    [...chart.matchAll(/^ {2}state "([^"]+)" as (s\d+)$/gm)].map((m) => [
      m[2],
      m[1].replace(/<br\/>/g, " "),
    ]),
  );
  return Object.fromEntries(
    [...chart.matchAll(/^ {2}class (s\d+) (\w+)$/gm)].map((m) => [names.get(m[1]), m[2]]),
  );
};

test("a transition on a composite leaves from every state inside it", () => {
  const { regions } = parseMermaid(fixture("upload.mmd"));
  const main = regions.Main;
  assert.deepEqual([...main.states].sort(), [
    "Nothing chosen",
    "Upload failed",
    "Uploaded",
    "Uploading.Checking the file",
    "Uploading.Sending the file",
  ]);
  assert.deepEqual([...main.initial], ["Nothing chosen"]);
  assert.deepEqual(edges(main), [
    "Nothing chosen -> Uploading.Sending the file : you choose a file",
    "Upload failed -> Uploading.Sending the file : you retry",
    "Uploading.Checking the file -> Nothing chosen : you cancel",
    "Uploading.Checking the file -> Upload failed : the network drops",
    "Uploading.Checking the file -> Uploaded : the check passes",
    "Uploading.Sending the file -> Nothing chosen : you cancel",
    "Uploading.Sending the file -> Upload failed : the network drops",
    "Uploading.Sending the file -> Uploading.Checking the file : the last byte arrives",
  ]);
});

test("the deepest source wins when a composite and a state inside it share a label", () => {
  const { regions } = parseMermaid(`stateDiagram-v2
  state Form {
    [*] --> Typing
    Typing --> Confirm : you press Escape
    state Confirm
  }
  [*] --> Form
  Form --> Closed : you press Escape
  Confirm --> Closed : you press Escape`);
  assert.deepEqual(edges(regions.Main), [
    "Form.Confirm -> Closed : you press Escape",
    "Form.Typing -> Form.Confirm : you press Escape",
  ]);
});

test("a top-level composite split by -- makes one region per part", () => {
  const { regions, nevers } = parseMermaid(fixture("sync.mmd"));
  assert.deepEqual(Object.keys(regions), ["Connection", "Sync badge"]);
  assert.deepEqual(edges(regions["Sync badge"]), [
    "Synced -> Waiting to sync : the network drops",
    "Synced -> Waiting to sync : you edit a note",
    "Waiting to sync -> Synced : the server confirms",
  ]);
  assert.deepEqual(nevers, [
    {
      name: "NeverSyncedWhileOffline",
      states: ["Offline", "Synced"],
      sentence: 'You never see "Synced" while you are offline.',
    },
  ]);
});

test("a rule's sentence is the comment lines right above it, and a state key ignores field order", () => {
  const sentences = ruleSentences(`---- MODULE M ----
\\* Not about a rule.

\\* You never see "Saved"
\\* while the note is a draft.
NoFalseSaved == TRUE
Bare == TRUE
====`);
  assert.deepEqual(
    [...sentences],
    [["NoFalseSaved", 'You never see "Saved" while the note is a draft.']],
  );
  assert.equal(stateKey({ b: 1, a: { d: 2, c: [3] } }), stateKey({ a: { c: [3], d: 2 }, b: 1 }));
});

test("a rule defined in a module that the spec extends, directly or through another module, keeps its sentence and the step that breaks it", () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(
    join(dir, "LampVars.tla"),
    `---- MODULE LampVars ----
VARIABLES light, wire
====
`,
  );
  writeFileSync(
    join(dir, "LampRules.tla"),
    `---- MODULE LampRules ----
EXTENDS LampVars
\\* The light never comes on over a shorted wire.
SafeLight == wire = "Short" => light # "On"
====
`,
  );
  writeFileSync(
    join(dir, "LampSteps.tla"),
    `---- MODULE LampSteps ----
EXTENDS LampRules
Short == wire = "Ok" /\\ wire' = "Short" /\\ UNCHANGED light
SwitchOn == light = "Off" /\\ light' = "On" /\\ UNCHANGED wire
====
`,
  );
  writeFileSync(
    join(dir, "Lamp.tla"),
    `---- MODULE Lamp ----
EXTENDS Naturals,
        LampSteps
Init == light = "Off" /\\ wire = "Ok"
Spec == Init /\\ [][Short \\/ SwitchOn]_<<light, wire>>
====
`,
  );
  const dotNode = (id, light, wire, init) =>
    `${id} [label="/\\\\ light = \\"${light}\\"\\n/\\\\ wire = \\"${wire}\\""${init ? ",style = filled" : ""}]`;
  writeFileSync(
    join(dir, "Lamp.dot"),
    `strict digraph DiskGraph {
${dotNode(1, "Off", "Ok", true)}
${dotNode(2, "Off", "Short")}
${dotNode(3, "On", "Short")}
${dotNode(4, "On", "Ok")}
1 -> 2 [label="Short"];
2 -> 3 [label="SwitchOn"];
1 -> 4 [label="SwitchOn"];
4 -> 3 [label="Short"];
}`,
  );
  writeFileSync(
    join(dir, "Lamp.out"),
    `Error: Invariant SafeLight is violated.
Error: The behavior up to this point is:
State 1: <Initial predicate>
/\\ light = "Off"
/\\ wire = "Ok"

State 2: <Short line 3, col 10 to line 3, col 58 of module LampSteps>
/\\ light = "Off"
/\\ wire = "Short"

State 3: <SwitchOn line 4, col 13 to line 4, col 58 of module LampSteps>
/\\ light = "On"
/\\ wire = "Short"

${done}`,
  );
  writeFileSync(
    join(dir, "lamp.map.mjs"),
    'export const state = (v) => v.light;\nexport const step = (a) => ({ Short: "the wire shorts", SwitchOn: "you switch it on" })[a];\n',
  );
  const r = node(
    "tlc-to-chart.mjs",
    [
      ...["--dot", "Lamp.dot", "--map", "lamp.map.mjs", "--traces", "Lamp.out"],
      ...["--spec", "Lamp.tla", "--story", "story.md", "--out", "chart.mmd"],
    ],
    dir,
  );
  assert.equal(r.status, 0, r.stderr);
  const story = readFileSync(join(dir, "story.md"), "utf8");
  assert.match(story, /^Rule broken: The light never comes on over a shorted wire\.$/m);
  assert.match(story, /^1\. The wire shorts\. Now: Off\n2\. You switch it on\. Now: On$/m);
});

const lampRules = `---- MODULE LampRules ----
VARIABLES light, wire
\\* The light never comes on over a shorted wire.
SafeLight == wire = "Short" => light # "On"
\\* The wire never shorts.
NeverShorts == [](wire # "Short")
====
`;
const lampSteps = `Init == lamp = "Off" /\\ cable = "Ok"
Short == cable = "Ok" /\\ cable' = "Short" /\\ UNCHANGED lamp
SwitchOn == lamp = "Off" /\\ lamp' = "On" /\\ UNCHANGED cable
Spec == Init /\\ [][Short \\/ SwitchOn]_<<lamp, cable>>
====
`;
const lampMap =
  'export const state = (v) => v.lamp;\nexport const step = (a) => ({ Short: "the wire shorts", SwitchOn: "you switch it on" })[a];\n';

test("a rule that the spec pulls in through an unnamed INSTANCE with substitutions keeps its sentence and the step that breaks it", () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(join(dir, "LampRules.tla"), lampRules);
  writeFileSync(
    join(dir, "Lamp.tla"),
    `---- MODULE Lamp ----
VARIABLES lamp, cable
INSTANCE LampRules
  WITH light <- lamp,
       wire <- cable
${lampSteps}`,
  );
  const dotNode = (id, lamp, cable, init) =>
    `${id} [label="/\\\\ cable = \\"${cable}\\"\\n/\\\\ lamp = \\"${lamp}\\""${init ? ",style = filled" : ""}]`;
  writeFileSync(
    join(dir, "Lamp.dot"),
    `strict digraph DiskGraph {
${dotNode(1, "Off", "Ok", true)}
${dotNode(2, "Off", "Short")}
${dotNode(3, "On", "Short")}
${dotNode(4, "On", "Ok")}
1 -> 2 [label="Short"];
2 -> 3 [label="SwitchOn"];
1 -> 4 [label="SwitchOn"];
4 -> 3 [label="Short"];
}`,
  );
  writeFileSync(
    join(dir, "Lamp.out"),
    `Error: Invariant SafeLight is violated.
Error: The behavior up to this point is:
State 1: <Initial predicate>
/\\ cable = "Ok"
/\\ lamp = "Off"

State 2: <Short line 7, col 10 to line 7, col 59 of module Lamp>
/\\ cable = "Short"
/\\ lamp = "Off"

State 3: <SwitchOn line 8, col 13 to line 8, col 59 of module Lamp>
/\\ cable = "Short"
/\\ lamp = "On"

${done}`,
  );
  writeFileSync(join(dir, "lamp.map.mjs"), lampMap);
  const r = node(
    "tlc-to-chart.mjs",
    [
      ...["--dot", "Lamp.dot", "--map", "lamp.map.mjs", "--traces", "Lamp.out"],
      ...["--spec", "Lamp.tla", "--story", "story.md", "--out", "chart.mmd"],
    ],
    dir,
  );
  assert.equal(r.status, 0, r.stderr);
  const story = readFileSync(join(dir, "story.md"), "utf8");
  assert.match(story, /^Rule broken: The light never comes on over a shorted wire\.$/m);
  assert.match(story, /^1\. The wire shorts\. Now: Off\n2\. You switch it on\. Now: On$/m);
});

test("rules reached through nested EXTENDS and INSTANCE keep their sentences and read the spec's variables behind each substitution", () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  const module = (name, body) =>
    writeFileSync(join(dir, `${name}.tla`), `---- MODULE ${name} ----\n${body}\n====\n`);
  module("Wire", `VARIABLE wire\n\\* The wire is never cut.\nIntact == wire # "Cut"`);
  module("Socket", `VARIABLE power\n\\* The socket always has power.\nLive == power = "On"`);
  module("Count", `VARIABLE v\n\\* The count never goes negative.\nOk == v >= 0`);
  module(
    "LampRules",
    `EXTENDS Naturals, Wire\nVARIABLE light\nPlug == INSTANCE Socket WITH power <- light\nLOCAL INSTANCE Count WITH v <- light\n\\* The light never comes on over a shorted wire.\nSafeLight == wire = "Short" => light # "On"`,
  );
  module(
    "Lamp",
    `EXTENDS TLC
VARIABLES lamp, wire
shown == lamp
INSTANCE LampRules WITH light <- shown
Rules == INSTANCE
    LampRules WITH light <- lamp, wire <- lamp
Quoted == INSTANCE Wire WITH wire <- IF lamp = "Cut<-" THEN wire ELSE "Cut"
Plain == Intact
Chain == Plain
Safe == Rules!SafeLight
Ok == wire # "Short"
\\* Its own words.
Worded == Rules!SafeLight`,
  );
  const book = ruleBook(join(dir, "Lamp.tla"));
  const reads = (rule) => [...book.get(rule).reads].sort();
  assert.deepEqual(reads("SafeLight"), ["lamp", "wire"]);
  assert.deepEqual(reads("Intact"), ["wire"]);
  assert.deepEqual(reads("Plug!Live"), ["lamp"]);
  assert.deepEqual(reads("Rules!SafeLight"), ["lamp"]);
  assert.deepEqual(reads("Worded"), ["lamp"]);
  assert.deepEqual(reads("Quoted!Intact"), ["lamp", "wire"]);
  assert.deepEqual(reads("Ok"), ["wire"]);
  const rules = [
    "SafeLight",
    "Rules!SafeLight",
    "Plug!Live",
    "Plain",
    "Chain",
    "Safe",
    "Ok",
    "Worded",
  ];
  assert.deepEqual(
    rules.map((rule) => book.get(rule).sentence),
    [
      "The light never comes on over a shorted wire.",
      "The light never comes on over a shorted wire.",
      "The socket always has power.",
      "The wire is never cut.",
      "The wire is never cut.",
      "The light never comes on over a shorted wire.",
      undefined,
      "Its own words.",
    ],
  );
});

test("a LOCAL INSTANCE or LOCAL definition stays inside the module that declares it, and a public name that starts with LOCAL does not", () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  const module = (name, body) =>
    writeFileSync(join(dir, `${name}.tla`), `---- MODULE ${name} ----\n${body}\n====\n`);
  module("Glow", `VARIABLE g\n\\* The glow is bright.\nOk == g = "Bright"`);
  module("Dim", `VARIABLE d\n\\* The glow is dim.\nOk == d = "Dim"`);
  module(
    "Base",
    `VARIABLE b\nLOCAL INSTANCE Dim WITH d <- b\nLOCAL Lit == b = "On"\n\\* The base is lit or dim.\nShown == Lit \\/ Ok\n\\* The base is never off.\nLOCALOn == b # "Off"`,
  );
  module("Room", `EXTENDS Base\nVARIABLE r\nINSTANCE Glow WITH g <- r\nHall == INSTANCE Base`);
  const book = ruleBook(join(dir, "Room.tla"));
  assert.deepEqual(book.get("Ok").sentence, "The glow is bright.");
  assert.deepEqual([...book.get("Ok").reads], ["r"]);
  assert.deepEqual(book.get("Shown").sentence, "The base is lit or dim.");
  assert.deepEqual([...book.get("Shown").reads], ["b"]);
  assert.deepEqual([...book.get("Hall!Shown").reads], ["b"]);
  assert.deepEqual(book.get("LOCALOn")?.sentence, "The base is never off.");
  assert.deepEqual(book.get("Hall!LOCALOn")?.sentence, "The base is never off.");
  assert.deepEqual(
    ["Lit", "Hall!Lit", "Hall!Ok"].filter((rule) => book.has(rule)),
    [],
  );
});

test("a rule that reads a CONSTANT reads the spec's variables that WITH puts in its place", () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  const module = (name, body) =>
    writeFileSync(join(dir, `${name}.tla`), `---- MODULE ${name} ----\n${body}\n====\n`);
  module(
    "Limit",
    `EXTENDS Naturals\nCONSTANTS Max, Fits(_, _)\nVARIABLE level\n\\* The level stays under the cap.\nUnder == Fits(level, Max)`,
  );
  module("Capped", `EXTENDS Limit\nVARIABLE spare\nRoom == spare + level <= Max`);
  module(
    "Tank",
    `EXTENDS Naturals
VARIABLES tank, cap, gap
Gauge == INSTANCE Limit WITH level <- tank, Max <- cap, Fits <- LAMBDA a, b : a <= b
Fixed == INSTANCE Limit WITH level <- tank, Max <- 3, Fits <- LAMBDA a, b : a <= b
Shell == INSTANCE Capped WITH level <- tank, spare <- gap, Max <- cap + 1, Fits <- LAMBDA a, b : a <= b`,
  );
  const book = ruleBook(join(dir, "Tank.tla"));
  const reads = (rule) => [...book.get(rule).reads].sort();
  assert.deepEqual(reads("Gauge!Under"), ["cap", "tank"]);
  assert.deepEqual(reads("Fixed!Under"), ["tank"]);
  assert.deepEqual(reads("Shell!Under"), ["cap", "tank"]);
  assert.deepEqual(reads("Shell!Room"), ["cap", "gap", "tank"]);
  assert.deepEqual(book.get("Gauge!Under").sentence, "The level stays under the cap.");
});

test("an action's condition on a variable that the action does not change needs a file and line", () => {
  const found = uncitedConditions(`---- MODULE Pay ----
CONSTANT MaxAge
VARIABLES screen, sent,
          paid, clock
Ready == sent > 0
Tick == clock' = clock + 1 /\\ UNCHANGED <<screen, sent, paid>>
Pay ==
  /\\ screen = "Cart \\* not a comment"
  /\\ MaxAge > 0
  /\\ clock < MaxAge (* pay.ts:120 *)
  /\\ Ready
  \\* checkout.ts:88
  /\\ sent < 3
  /\\ screen' = IF clock > 0 /\\ sent > 0 THEN "Paid" ELSE screen /\\ paid' = TRUE
  /\\ UNCHANGED <<sent, clock>>
\\* fill.ts:10
Fill == \\E o \\in 1..3 : /\\ paid = TRUE
                        /\\ clock > 0 /\\ sent' = o + 1
                        /\\ sent = o
                        /\\ paid => clock > 0 /\\ screen = "Cart"
                        /\\ UNCHANGED <<screen, paid, clock>>
Next == Tick \\/ Pay \\/ Fill
====`);
  assert.deepEqual(found, [
    { line: 11, action: "Pay", condition: "Ready" },
    { line: 17, action: "Fill", condition: "paid = TRUE" },
    { line: 18, action: "Fill", condition: "clock > 0" },
    { line: 20, action: "Fill", condition: 'paid => clock > 0 /\\ screen = "Cart"' },
  ]);
});

test("a rule reads the variables its helpers read, and not the ones its actions only change or leave unchanged", () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(
    join(dir, "Door.tla"),
    `---- MODULE Door ----
VARIABLES door, lock, bell
rest == <<lock, bell>>
Locked == lock = "on"
NeverOpenWhileLocked == ~(door = "open" /\\ Locked)
Open == door = "shut" /\\ door' = "open" /\\ bell' = TRUE /\\ UNCHANGED lock
Close == door = "open" /\\ door' = "shut" /\\ UNCHANGED rest
System == Open \\/ Close
Settled == ~ENABLED System
====`,
  );
  const book = ruleBook(join(dir, "Door.tla"));
  assert.deepEqual([...book.get("NeverOpenWhileLocked").reads].sort(), ["door", "lock"]);
  assert.deepEqual([...book.get("Settled").reads], ["door"]);
});

test("a property is checked only in the initial states when no definition it reaches has a temporal operator", () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(
    join(dir, "LampBase.tla"),
    `---- MODULE LampBase ----
VARIABLE on
Safe == [](on \\in BOOLEAN)
====
`,
  );
  writeFileSync(
    join(dir, "Lamp.tla"),
    `---- MODULE Lamp ----
VARIABLE on
vars == <<on>>
Base == INSTANCE LampBase
StaysOff == on = FALSE
NotEmpty == vars /= <<>>
Always == [](on \\in BOOLEAN)
Eventually == <>on
LeadsTo == on ~> ~on
WhilePlus == StaysOff -+-> StaysOff
Weak == WF_vars(on' = ~on)
Strong == SF_vars(on' = ~on)
Some == \\EE x : StaysOff
Every == \\AA x : StaysOff
ByHelper == Always
FromBase == Base!Safe
====
`,
  );
  const names = [
    "StaysOff",
    "NotEmpty",
    "Always",
    "Eventually",
    "LeadsTo",
    "WhilePlus",
    "Weak",
    "Strong",
    "Some",
    "Every",
    "ByHelper",
    "FromBase",
    "Missing",
  ];
  assert.deepEqual(
    names.filter((name) => checkedOnlyInInitialStates(join(dir, "Lamp.tla"), name)),
    ["StaysOff", "NotEmpty"],
  );
});

test("the legend is not part of the machine", () => {
  const { regions } = parseMermaid(`stateDiagram-v2
  state "Legend" as legend {
    state "Works today" as legendWorks
  }
  [*] --> A
  A --> B : go`);
  assert.deepEqual([...regions.Main.states].sort(), ["A", "B"]);
});

test("the parser refuses charts it cannot read", () => {
  assert.throws(() => parseMermaid("stateDiagram-v2\n  state A {\n  [*] --> B"), /unclosed/);
  assert.throws(() => parseMermaid("stateDiagram-v2\n  A ==> B"), /cannot read chart line/);
  assert.throws(
    () => parseMermaid("stateDiagram-v2\n  state A {\n    B --> C : go\n  }\n  [*] --> A"),
    /no \[\*\] --> start/,
  );
  assert.throws(
    () =>
      parseMermaid(
        "stateDiagram-v2\n  state A {\n    state B {\n      [*] --> C\n      --\n      [*] --> D\n    }\n    [*] --> B\n  }\n  [*] --> A",
      ),
    /below the top level/,
  );
  assert.throws(
    () => parseMermaid("stateDiagram-v2\n  [*] --> A\n  A --> [*] : you close the app"),
    /final state/,
  );
  assert.throws(
    () =>
      parseMermaid(
        'stateDiagram-v2\n  state "Something went wrong" as UploadError\n  state "Something went wrong" as SyncError\n  [*] --> UploadError\n  UploadError --> SyncError : go',
      ),
    /two states have the caption "Something went wrong"/,
  );
});

test("the parser reads class shorthand, repeated descriptions, and states first named inside a composite", () => {
  const { regions } = parseMermaid(`stateDiagram-v2
  classDef wrong fill:#fdd
  N : Nothing chosen
  N : press Upload to start
  [*] --> N
  N:::wrong --> Done : you finish
  Done --> Moving:::wrong
  state A {
    [*] --> X
    X --> Y : go
  }
  Moving --> A : start
  Y --> Z : next
  A --> N : cancel`);
  assert.deepEqual([...regions.Main.states].sort(), [
    "A.X",
    "A.Y",
    "Done",
    "Moving",
    "Nothing chosen",
    "Z",
  ]);
  assert.deepEqual(edges(regions.Main), [
    "A.X -> A.Y : go",
    "A.X -> Nothing chosen : cancel",
    "A.Y -> Nothing chosen : cancel",
    "A.Y -> Z : next",
    "Done -> Moving : ",
    "Moving -> A.X : start",
    "Nothing chosen -> Done : you finish",
  ]);
});

test("TLC values, states, graphs, and traces parse", () => {
  assert.deepEqual(parseValue('[a |-> <<1, "x">>, b |-> {TRUE}]'), { a: [1, "x"], b: [true] });
  assert.deepEqual(parseValue('("p" :> 1 @@ "q" :> 2)'), { p: 1, q: 2 });
  const graph = parseDot(`strict digraph DiskGraph {
1 [label="/\\\\ x = 0",style = filled]
2 [label="/\\\\ x = 1"]
1 -> 2 [label="Inc",color="black",fontcolor="black"];
1 -> 2 [label="Inc",color="black",fontcolor="black"];
2 -> 2 [label="Stay"];
}`);
  assert.equal(graph.nodes.get("1").init, true);
  assert.deepEqual(graph.nodes.get("2").vars, { x: 1 });
  assert.deepEqual(graph.edges, [{ from: "1", to: "2", action: "Inc" }]);
  assert.deepEqual(graph.loops, [{ from: "2", to: "2", action: "Stay" }]);
  assert.throws(
    () =>
      parseDot(
        'strict digraph DiskGraph {\n1 [label="/\\\\ x = 0",style = filled]\n2 [label="/\\\\ x = 1"]\n1 -> 2;\n}',
      ),
    /no action names/,
  );
  const [trace] = parseTraces(`Error: Invariant Small is violated.
Error: The behavior up to this point is:
State 1: <Initial predicate>
x = 0

State 2: <Inc line 9, col 8 to line 9, col 20 of module M>
x = 1
`);
  assert.equal(trace.invariant, "Small");
  assert.deepEqual(trace.steps, [
    { action: null, vars: { x: 0 } },
    { action: "Inc", vars: { x: 1 } },
  ]);
});

const done = "Model checking completed. No error has been found.\n";
const evaluationError = `Error: Invariant NoLost is violated.
Error: The behavior up to this point is:
State 1: <Initial predicate>
s = "Idle"

State 2: <Lose line 4, col 9 to line 4, col 33 of module F>
s = "Lost"

Error: TLC threw an unexpected exception.
This was probably caused by an error in the spec or model.

Error: The behavior up to this point is:
State 1: <Initial predicate>
s = "Idle"

State 2: <Save line 5, col 9 to line 5, col 35 of module F>
s = "Saving"

3 states generated, 3 distinct states found, 0 states left on queue.
`;

test("a rule broken by a start state is a counterexample of one state", () => {
  const text = `Error: Invariant NeverSyncedWhileOffline is violated by the initial state:
/\\ badge = "Synced"
/\\ conn = "Offline"

${done}`;
  assert.doesNotThrow(() => tlcOutputWarning(text, "tlc.out"));
  assert.deepEqual(parseTraces(text), [
    {
      invariant: "NeverSyncedWhileOffline",
      steps: [{ action: null, vars: { badge: "Synced", conn: "Offline" } }],
    },
  ]);
});

test("TLC output from a run that failed or stopped early is refused", () => {
  assert.doesNotThrow(() =>
    tlcOutputWarning(
      `Error: Invariant Small is violated.\nError: The behavior up to this point is:\nState 1: <Initial predicate>\nx = 0\n\n${done}`,
      "ok.out",
    ),
  );
  assert.throws(
    () =>
      tlcOutputWarning(
        "Error: The invariant Nope specified in the configuration file\nis not defined in the specification.\n",
        "cfg.out",
      ),
    /cfg\.out: TLC stopped on an error that is not a broken rule/,
  );
  assert.throws(
    () => tlcOutputWarning("Error: Parsing or semantic analysis failed.\n", "parse.out"),
    /not a broken rule/,
  );
  assert.throws(
    () =>
      tlcOutputWarning(
        "Error: Invariant Small is violated.\nError: The behavior up to this point is:\nState 1: <Initial predicate>\nx = 0\n",
        "stopped.out",
      ),
    /did not finish/,
  );
});

const tlcThrew = (cls, message) => `Error: Evaluating invariant Small failed.
Index 123 out of bounds for length 4
Error: TLC threw an unexpected exception.
This was probably caused by an error in the spec or model.
See the User Output or TLC Console for clues to what happened.
The exception was a ${cls}
: ${message}
Error: The error occurred when TLC was evaluating the nested
expressions at the following positions:
    The error call stack is empty.
`;
const smallBroken =
  "Error: Invariant Small is violated.\nError: The behavior up to this point is:\nState 1: <Initial predicate>\nx = 0\n\n";
const stoppedEarly = "9 states generated, 9 distinct states found, 4 states left on queue.\n";

test("a rule that TLC finds broken keeps its paths after any error that TLC then stops on, with a warning", () => {
  const warned = (rule, error) =>
    `TLC found that ${rule} is broken, and then stopped on an error: ${error}. The paths that TLC printed before it stopped are complete, but TLC did not check every state, so the charts can miss states that break ${rule}. A smaller constant can let TLC finish.`;
  const aioobe = "java.lang.ArrayIndexOutOfBoundsException: Index 123 out of bounds for length 4";
  const oneWorker = `${smallBroken}Error: Invariant Small is violated.\n${tlcThrew(
    "java.lang.ArrayIndexOutOfBoundsException",
    "Index 123 out of bounds for length 4",
  )}\n${stoppedEarly}`;
  assert.equal(tlcOutputWarning(oneWorker, "tlc.out"), warned("Small", aioobe));
  const workersInterleaved = `${tlcThrew("java.lang.RuntimeException", aioobe)}${smallBroken}${stoppedEarly}`;
  assert.equal(tlcOutputWarning(workersInterleaved, "tlc.out"), warned("Small", aioobe));
  assert.deepEqual(
    parseTraces(workersInterleaved).map((t) => t.invariant),
    ["Small"],
  );
  const arraycopy = (message) =>
    `${smallBroken}${tlcThrew("java.lang.ArrayIndexOutOfBoundsException", message)}${stoppedEarly}`;
  const negative = "java.lang.ArrayIndexOutOfBoundsException: arraycopy: length -3 is negative";
  assert.equal(
    tlcOutputWarning(arraycopy("arraycopy: length -3 is negative"), "tlc.out"),
    warned("Small", negative),
  );
  assert.equal(tlcOutputWarning(arraycopy(negative), "tlc.out"), warned("Small", negative));
  assert.equal(
    tlcOutputWarning(
      `${smallBroken}${tlcThrew("java.lang.RuntimeException", "util.Assert$TLCRuntimeException: Attempted to apply tuple")}${stoppedEarly}`,
      "formula.out",
    ),
    warned("Small", "util.Assert$TLCRuntimeException: Attempted to apply tuple"),
  );
  assert.equal(
    tlcOutputWarning(
      `${smallBroken}Error: Invariant Small is violated.\nError: Failed to recover the initial state from its fingerprint.\nThis is probably a TLC bug(4).\n${stoppedEarly}`,
      "fingerprint.out",
    ),
    warned("Small", "Failed to recover the initial state from its fingerprint"),
  );
  assert.equal(
    tlcOutputWarning(evaluationError, "eval.out"),
    warned("NoLost", "TLC threw an unexpected exception"),
  );
  assert.deepEqual(
    parseTraces(evaluationError).map((t) => t.invariant),
    ["NoLost"],
  );
  assert.throws(
    () =>
      tlcOutputWarning(
        `${tlcThrew("java.lang.ArrayIndexOutOfBoundsException", "Index 123 out of bounds for length 4")}${stoppedEarly}`,
        "never-broken.out",
      ),
    /not a broken rule: Evaluating invariant Small failed\./,
  );
});

test("a step that changes nothing keeps a state unsettled, and a quote in a reader label survives the chart", () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(
    join(dir, "save.dot"),
    `strict digraph DiskGraph {
1 [label="/\\\\ s = \\"Idle\\"",style = filled]
2 [label="/\\\\ s = \\"Saving\\""]
1 -> 2 [label="Tap"];
2 -> 2 [label="Retry"];
}`,
  );
  writeFileSync(
    join(dir, "save.map.mjs"),
    `export const readerActions = ["Tap"];
export const state = (v, facts) => (v.s === "Idle" ? 'Badge says "Synced"' : facts.settled ? "Saved" : "Saving");
export const step = (action) => ({ Tap: "you tap Save" })[action] ?? "";
`,
  );
  const r = node(
    "tlc-to-chart.mjs",
    ["--dot", "save.dot", "--map", "save.map.mjs", "--highlight", "0", "--out", "chart.mmd"],
    dir,
  );
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(edges(parseMermaid(readFileSync(join(dir, "chart.mmd"), "utf8")).regions.Main), [
    'Badge says "Synced" -> Saving : you tap Save',
  ]);
});

test("a map keys on the bare action name when TLC 1.8.0 writes each step with its parameters", () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(
    join(dir, "seats.dot"),
    `strict digraph DiskGraph {
node [shape=box,style=rounded]
nodesep=0.35;
subgraph cluster_graph {
color="white";
1 [label="seat = <<\\"free\\", \\"free\\">>",style = filled]
1 -> 2 [label="Take(1)",color="black",fontcolor="black"];
2 [label="seat = <<\\"taken\\", \\"free\\">>",tooltip="seat = <<\\"taken\\", \\"free\\">>"];
1 -> 3 [label="Take(2)",color="black",fontcolor="black"];
3 [label="seat = <<\\"free\\", \\"taken\\">>",tooltip="seat = <<\\"free\\", \\"taken\\">>"];
2 -> 1 [label="Leave(1)",color="black",fontcolor="black"];
2 -> 4 [label="Take(2)",color="black",fontcolor="black"];
4 [label="seat = <<\\"taken\\", \\"taken\\">>",tooltip="seat = <<\\"taken\\", \\"taken\\">>"];
3 -> 4 [label="Take(1)",color="black",fontcolor="black"];
3 -> 1 [label="Leave(2)",color="black",fontcolor="black"];
4 -> 3 [label="Leave(1)",color="black",fontcolor="black"];
4 -> 2 [label="Leave(2)",color="black",fontcolor="black"];
{rank = same; 1;}
{rank = same; 3;2;}
{rank = same; 4;}
}
}`,
  );
  writeFileSync(
    join(dir, "seats.map.mjs"),
    `export const readerActions = ["Take", "Leave"];
const taken = (v) => v.seat.filter((s) => s === "taken").length;
export const state = (v) => ["Both free", "One taken", "Both taken"][taken(v)];
export const step = (action) => ({ Take: "you sit down", Leave: "you get up" })[action] ?? action;
`,
  );
  const draw = (...extra) => {
    const r = node(
      "tlc-to-chart.mjs",
      ["--dot", "seats.dot", "--map", "seats.map.mjs", "--out", "chart.mmd", ...extra],
      dir,
    );
    assert.equal(r.status, 0, r.stderr);
    return parseMermaid(readFileSync(join(dir, "chart.mmd"), "utf8")).regions.Main;
  };
  assert.deepEqual(edges(draw()), [
    "Both free -> One taken : you sit down",
    "Both taken -> One taken : you get up",
    "One taken -> Both free : you get up",
    "One taken -> Both taken : you sit down",
  ]);
  assert.deepEqual([...draw("--cover").states].sort(), ["Both free", "Both taken", "One taken"]);
});

function layeredHouse({
  extra = [],
  edges = "",
  state = '(v.x === "attic" ? "Upstairs" : "Downstairs")',
  detail = '(v.x === "porch" || v.x === "hall" ? v.x : "")',
} = {}) {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(
    join(dir, "house.dot"),
    `strict digraph DiskGraph {
1 [label="x = \\"start\\"",style = filled]
1 -> 2 [label="Side"];
2 [label="x = \\"porch\\""];
1 -> 3 [label="Front"];
3 [label="x = \\"hall\\""];
2 -> 4 [label="Arrive"];
4 [label="x = \\"attic\\""];
4 -> 1 [label="Leave"];
${edges}
}`,
  );
  writeFileSync(
    join(dir, "house.map.mjs"),
    `export const readerActions = ["Side", "Front", "Arrive"];
export const state = (v) => ${state};
export const detail = (v) => ${detail};
export const step = (a) => ({ Side: "you take the side door", Front: "you take the front door", Arrive: "you climb the stairs", Leave: "the lights go out" })[a];
`,
  );
  const r = node(
    "tlc-to-chart.mjs",
    [
      ...["--dot", "house.dot", "--map", "house.map.mjs", "--view", "layered"],
      ...["--out", "chart.mmd", ...extra],
    ],
    dir,
  );
  assert.equal(r.status, 0, r.stderr);
  return dir;
}

test("--cover names a layered state with an empty detail by its outer label alone", () => {
  const dir = layeredHouse({ extra: ["--cover", "--summary", "summary.json"] });
  const { cover } = JSON.parse(readFileSync(join(dir, "summary.json"), "utf8"));
  assert.deepEqual(cover.leftOutStates, ["Upstairs"]);
  assert.deepEqual(cover.leftOutTransitions, [
    "Downstairs: porch --> Upstairs: you climb the stairs [Arrive]",
    "Upstairs --> Downstairs: the lights go out [Leave]",
  ]);
});

test("a layered chart draws a state with an empty detail by its outer label alone, outside any box", () => {
  const chart = readFileSync(join(layeredHouse(), "chart.mmd"), "utf8");
  assert.doesNotMatch(chart, /state ""/);
  assert.match(
    chart,
    /^ {2}state "Downstairs" as g\d+ \{\n {4}state "hall" as s\d+\n {4}state "porch" as s\d+\n {2}\}$/m,
  );
  const plain = /^ {2}state "Downstairs" as (s\d+)$/m.exec(chart)?.[1];
  assert.ok(plain, chart);
  assert.match(chart, new RegExp(`^ {2}\\[\\*\\] --> ${plain}$`, "m"));
  assert.match(chart, /^ {2}state "Upstairs" as s\d+$/m);
});

test("a box's shared step stays on each state when a plain state outside the box has the box's name", () => {
  const chart = readFileSync(
    join(layeredHouse({ edges: '3 -> 4 [label="Arrive"];' }), "chart.mmd"),
    "utf8",
  );
  assert.doesNotMatch(chart, /^ {2}g\d+ --> /m);
  assert.deepEqual(
    flatEdges(chart).map((e) => e.replaceAll("<br/>", " ")),
    [
      "Downstairs --> Downstairs: hall : you take the front door [Front]",
      "Downstairs --> Downstairs: porch : you take the side door [Side]",
      "Downstairs: hall --> Upstairs : you climb the stairs [Arrive]",
      "Downstairs: porch --> Upstairs : you climb the stairs [Arrive]",
      "Upstairs --> Downstairs : the lights go out [Leave]",
    ],
  );
});

test("--flat draws a layered chart with no boxes, naming each state by its label and detail", () => {
  const chart = readFileSync(join(layeredHouse({ extra: ["--flat"] }), "chart.mmd"), "utf8");
  assert.doesNotMatch(chart, / as g\d+ \{$/m);
  assert.deepEqual([...chart.matchAll(/^ {2}state "([^"]+)" as s\d+$/gm)].map((m) => m[1]).sort(), [
    "Downstairs",
    "Downstairs: hall",
    "Downstairs: porch",
    "Upstairs",
  ]);
});

test("a layered chart and its --cover lists treat a blank state label or detail as absent", () => {
  const dir = layeredHouse({
    extra: ["--cover", "--summary", "summary.json"],
    state: '({ attic: "Upstairs", hall: " " })[v.x] ?? "Downstairs"',
    detail: '(v.x === "porch" || v.x === "hall" ? v.x : "  ")',
  });
  const chart = readFileSync(join(dir, "chart.mmd"), "utf8");
  assert.doesNotMatch(chart, /state ""/);
  assert.match(chart, /^ {2}state "Downstairs" as g\d+ \{\n {4}state "porch" as s\d+\n {2}\}$/m);
  assert.deepEqual([...chart.matchAll(/^ {2}state "([^"]+)" as s\d+$/gm)].map((m) => m[1]).sort(), [
    "Downstairs",
    "hall",
  ]);
  const { cover } = JSON.parse(readFileSync(join(dir, "summary.json"), "utf8"));
  assert.deepEqual(cover.leftOutStates, ["Upstairs"]);
  assert.deepEqual(cover.leftOutTransitions, [
    "Downstairs: porch --> Upstairs: you climb the stairs [Arrive]",
    "Upstairs --> Downstairs: the lights go out [Leave]",
  ]);
});

test("a large graph with a thousand bugs draws its overview and a bug chart in seconds", () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  const [states, bugs, bound] = [20_000, 1000, 10_000];
  const label = (n, broken) => `/\\\\ n = ${n}\\n/\\\\ broken = ${broken ? "TRUE" : "FALSE"}`;
  const dot = [];
  for (let i = 1; i <= states; i++) {
    dot.push(`${i} [label="${label(i, false)}"${i === 1 ? ",style = filled" : ""}];`);
    if (i < states) dot.push(`${i} -> ${i + 1} [label="Tick"];`);
    dot.push(`${i} -> ${((i * 7) % states) + 1} [label="Jump"];`);
  }
  const traces = [];
  for (let k = 1; k <= bugs; k++) {
    dot.push(`${states + k} [label="${label(k, true)}"];`, `1 -> ${states + k} [label="Break"];`);
    traces.push(
      `Error: Invariant ${k % 2 ? "Safe" : "Calm"} is violated.\nError: The behavior up to this point is:\nState 1: <Initial predicate>\n/\\ n = 1\n/\\ broken = FALSE\n\nState 2: <Break line 1, col 1 to line 1, col 2 of module M>\n/\\ n = ${k}\n/\\ broken = TRUE\n`,
    );
  }
  writeFileSync(join(dir, "big.dot"), `strict digraph DiskGraph {\n${dot.join("\n")}\n}\n`);
  writeFileSync(join(dir, "big.out"), `${traces.join("\n")}\n${done}`);
  writeFileSync(
    join(dir, "big.map.mjs"),
    `export const state = (v) => (v.broken ? "Broken" : "Counting");
export const step = (a) => ({ Tick: "a second passes", Jump: "it jumps", Break: "it breaks" })[a];
export const cause = (v) => (v.broken ? \`counter \${v.n} broke\` : null);
`,
  );
  for (const view of [
    "--highlight 0 --out chart.mmd --story stories.md --summary summary.json",
    "--highlight 1 --path-only --out bug-1.mmd",
  ]) {
    const input = `--dot big.dot --map big.map.mjs --traces big.out ${view}`.split(" ");
    const r = spawnSync(process.execPath, [join(scripts, "tlc-to-chart.mjs"), ...input], {
      cwd: dir,
      encoding: "utf8",
      timeout: bound,
    });
    assert.equal(r.signal, null, `${view} ran past ${bound / 1000} s`);
    assert.equal(r.status, 0, r.stderr);
  }
  const { classes } = JSON.parse(readFileSync(join(dir, "summary.json"), "utf8"));
  assert.equal(classes.length, bugs);
  assert.deepEqual(
    new Set(classes.map((c) => JSON.stringify([c.lastSteps, c.startsHere]))),
    new Set([JSON.stringify([["it breaks"], false])]),
  );
});

test("chart-to-tla writes one action per label and one invariant per never line", () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(join(dir, "sync.mmd"), fixture("sync.mmd"));
  const r = node("chart-to-tla.mjs", ["sync.mmd", "--module", "Sync"], dir);
  assert.equal(r.status, 0, r.stderr);
  const spec = readFileSync(join(dir, "Sync.tla"), "utf8");
  assert.match(spec, /^VARIABLES connection, syncBadge$/m);
  assert.match(
    spec,
    /^TheNetworkDrops ==\n {4}\/\\ \(connection \\in \{"Online"\} \\\/ syncBadge \\in \{"Synced"\}\)$/m,
  );
  assert.match(
    spec,
    /^NeverSyncedWhileOffline == ~\(connection = "Offline" \/\\ syncBadge = "Synced"\)$/m,
  );
  assert.equal(
    readFileSync(join(dir, "Sync.cfg"), "utf8"),
    "SPECIFICATION Spec\nINVARIANT TypeOK\nINVARIANT NeverSyncedWhileOffline\n",
  );
  assert.match(r.stderr, /rules TypeOK NeverSyncedWhileOffline/);
});

test("chart-to-tla refuses a never line that names no state", () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(
    join(dir, "c.mmd"),
    "stateDiagram-v2\n  [*] --> A\n  A --> B : go\n  %% never Bad: C -- never C\n",
  );
  const r = node("chart-to-tla.mjs", ["c.mmd", "--module", "C"], dir);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /names "C", which is not a state/);
});

test("a never line names a state exactly, or every state inside a composite", () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(
    join(dir, "c.mmd"),
    `stateDiagram-v2
  state "Saving" as S
  state "Saving..." as S2
  state Busy {
    [*] --> Checking
    Checking --> Sending : the check passes
  }
  [*] --> S
  S --> S2 : you wait
  S2 --> Busy : you send
  Busy --> S : you cancel
  %% never NoSaving: Saving -- You never see Saving.
  %% never NoBusy: Busy -- You are never busy.
`,
  );
  const r = node("chart-to-tla.mjs", ["c.mmd", "--module", "C"], dir);
  assert.equal(r.status, 0, r.stderr);
  const spec = readFileSync(join(dir, "C.tla"), "utf8");
  assert.match(spec, /^NoSaving == ~\(main = "Saving"\)$/m);
  assert.match(spec, /^NoBusy == ~\(main \\in \{"Busy\.Checking", "Busy\.Sending"\}\)$/m);
  assert.match(
    readFileSync(join(dir, "C.map.mjs"), "utf8"),
    /^export const readerActions = \[\];$/m,
  );
});

const door = `stateDiagram-v2
  state Door {
    [*] --> Locked
    Locked --> Unlocked : tap unlock
    Unlocked --> Locked : tap lock
    --
    [*] --> Closed
    Closed --> Open : open the door
    Open --> Closed : close the door
  }
  [*] --> Door`;
const flatDoor = (extra = []) =>
  [
    "stateDiagram-v2",
    '  state "Locked | Closed" as L_C',
    '  state "Locked | Open" as L_O',
    '  state "Unlocked | Closed" as U_C',
    '  state "Unlocked | Open" as U_O',
    "  [*] --> L_C",
    "  L_C --> U_C : tap unlock",
    "  U_C --> L_C : tap lock",
    "  L_O --> U_O : tap unlock",
    "  L_C --> L_O : open the door",
    "  L_O --> L_C : close the door",
    "  U_C --> U_O : open the door",
    "  U_O --> U_C : close the door",
    ...extra,
  ].join("\n");

test("compare reads parallel regions as one machine, so a guard across regions shows", () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(join(dir, "agreed.mmd"), door);
  writeFileSync(join(dir, "guarded.mmd"), flatDoor());
  writeFileSync(join(dir, "free.mmd"), flatDoor(["  U_O --> L_O : tap lock"]));
  const differ = node("compare-charts.mjs", ["agreed.mmd", "guarded.mmd"], dir);
  assert.equal(differ.status, 1);
  assert.match(
    differ.stdout,
    /transitions only in EXPECTED[^\n]*:\n {2}Unlocked \| Open --> Locked \| Open : tap lock\n1 difference\(s\)/,
  );
  const same = node("compare-charts.mjs", ["agreed.mmd", "free.mmd"], dir);
  assert.equal(same.stdout.trim(), "same", same.stdout);
});

const lamp = `stateDiagram-v2
  state "Lamp" as lamp {
    state "Power" as power {
      [*] --> Off
      Off --> On : flip the switch
      On --> Off : flip the switch
    }
    --
    state "Bulb" as bulb {
      [*] --> Dark
      Dark --> Lit : warm up [when the<br/>power is on]
      %% when On
      Lit --> Dark : cool down [when the power is off]
      %% when not On
    }
  }
  %% never LitWhileOff: Off & Lit -- The bulb is never lit while the power is off.
`;

test("a %% when line guards a step on the other region's states, and [words] are only its text", () => {
  const { regions } = parseMermaid(lamp);
  assert.deepEqual(regions.Bulb.transitions, [
    { from: "Dark", to: "Lit", label: "warm up", guard: { not: false, states: { Power: ["On"] } } },
    {
      from: "Lit",
      to: "Dark",
      label: "cool down",
      guard: { not: true, states: { Power: ["On"] } },
    },
  ]);
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(join(dir, "lamp.mmd"), lamp);
  writeFileSync(
    join(dir, "flat.mmd"),
    [
      "stateDiagram-v2",
      "  [*] --> OD",
      '  state "Off | Dark" as OD',
      '  state "On | Dark" as ND',
      '  state "On | Lit" as NL',
      '  state "Off | Lit" as OL',
      "  OD --> ND : flip the switch",
      "  ND --> OD : flip the switch",
      "  ND --> NL : warm up",
      "  NL --> OL : flip the switch",
      "  OL --> NL : flip the switch",
      "  OL --> OD : cool down",
    ].join("\n"),
  );
  const same = node("compare-charts.mjs", ["lamp.mmd", "flat.mmd"], dir);
  assert.equal(same.stdout, "same\n", same.stderr);
  const tla = node("chart-to-tla.mjs", ["lamp.mmd", "--module", "Lamp"], dir);
  assert.equal(tla.status, 0, tla.stderr);
  const spec = readFileSync(join(dir, "Lamp.tla"), "utf8");
  assert.match(spec, /\(bulb = "Dark" \/\\ power = "On" \/\\ bulb' = "Lit"\)/);
  assert.match(spec, /\(bulb = "Lit" \/\\ ~\(power = "On"\) \/\\ bulb' = "Dark"\)/);

  for (const [from, to, why] of [
    [
      "      %% when On\n",
      "      state Glow\n      %% when On\n",
      /must come right after a transition/,
    ],
    [
      "warm up [when the<br/>power is on]",
      "warm up",
      /must end its label with the guard's words in \[ \]/,
    ],
    ["      %% when On\n", "      %% when Nope\n", /names Nope, which is not a state id/],
    ["      %% when On\n", "      %% when Lit\n", /names Lit, which is in the step's own region/],
  ])
    assert.throws(() => parseMermaid(lamp.replace(from, to)), why);
  assert.throws(
    () =>
      parseMermaid(
        "stateDiagram-v2\n  [*] --> A\n  A --> B : go [when C]\n  %% when C\n  B --> C : on\n",
      ),
    /the chart has none/,
  );
  assert.deepEqual(
    edges(parseMermaid("stateDiagram-v2\n  [*] --> A\n  A --> B : go [user away]\n").regions.Main),
    ["A -> B : go"],
  );
});

const switchLamp = `stateDiagram-v2
  state "Lamp" as lamp {
    state "Power" as power {
      [*] --> Off
      Off --> On : flip the switch
      On --> Off : flip the switch
    }
    --
    state "Bulb" as bulb {
      [*] --> Dark
      Dark --> Lit : flip the switch [when the power is off]
      %% when Off
      Lit --> Dark : flip the switch
    }
  }
`;

test("a label with a guarded and an unguarded move in one region writes both moves", () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(join(dir, "switch.mmd"), switchLamp);
  const r = node("chart-to-tla.mjs", ["switch.mmd", "--module", "Switch"], dir);
  assert.equal(r.status, 0, r.stderr);
  const spec = readFileSync(join(dir, "Switch.tla"), "utf8");
  assert.equal(
    spec.slice(spec.indexOf("\\* flip the switch"), spec.indexOf("\nNext ==")),
    `\\* flip the switch
FlipTheSwitch ==
    /\\ (power \\in {"Off", "On"} \\/ (bulb = "Dark" /\\ power = "Off") \\/ (bulb = "Lit"))
    /\\ \\/ (power = "Off" /\\ power' = "On")
       \\/ (power = "On" /\\ power' = "Off")
       \\/ (power \\notin {"Off", "On"} /\\ UNCHANGED power)
    /\\ \\/ (bulb = "Dark" /\\ power = "Off" /\\ bulb' = "Lit")
       \\/ (bulb = "Lit" /\\ bulb' = "Dark")
       \\/ (~((bulb = "Dark" /\\ power = "Off") \\/ (bulb = "Lit")) /\\ UNCHANGED bulb)
`,
  );
});

test("compare reads a one-region chart as the machine its steps reach, with the steps that keep the state", () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  const drawn =
    "stateDiagram-v2\n  [*] --> Idle\n  Idle --> Busy : start\n  Busy --> Idle : finish\n";
  writeFileSync(join(dir, "drawn.mmd"), drawn);
  writeFileSync(join(dir, "loop.mmd"), `${drawn}  Idle --> Idle : refresh\n`);
  writeFileSync(join(dir, "orphan.mmd"), `${drawn}  Lost --> Idle : come back\n`);
  const loop = node("compare-charts.mjs", ["loop.mmd", "drawn.mmd"], dir);
  assert.equal(loop.status, 1);
  assert.equal(
    loop.stdout,
    "transitions only in EXPECTED (a guard in the spec blocks them, or the spec renamed the step):\n  Idle --> Idle : refresh\n1 difference(s)\n",
  );
  const orphan = node("compare-charts.mjs", ["orphan.mmd", "drawn.mmd"], dir);
  assert.equal(orphan.status, 1);
  assert.equal(
    orphan.stdout,
    "states the agreed chart's own steps never reach:\n  Lost\n1 difference(s)\n",
  );
});

test("a -- outside a composite is refused, not read as one region", () => {
  const split =
    "stateDiagram-v2\n  [*] --> Online\n  Online --> Offline : the network drops\n  --\n  [*] --> Synced\n  Synced --> Pending : you edit a note\n";
  assert.throws(() => parseMermaid(split), /-- outside a composite/);
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(join(dir, "split.mmd"), split);
  writeFileSync(join(dir, "door.mmd"), door);
  const tla = node("chart-to-tla.mjs", ["split.mmd", "--module", "Split"], dir);
  assert.notEqual(tla.status, 0);
  assert.match(tla.stderr, /-- outside a composite/);
  for (const pair of [
    ["split.mmd", "split.mmd"],
    ["door.mmd", "split.mmd"],
    ["split.mmd", "door.mmd"],
  ]) {
    const r = node("compare-charts.mjs", pair, dir);
    assert.equal(r.status, 2, pair.join(" "));
    assert.match(r.stderr, /^split\.mmd: the chart has -- outside a composite/);
  }
});

test("compare refuses a chart it cannot read, or an ACTUAL chart that is not drawn for comparison", () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(join(dir, "agreed.mmd"), door);
  for (const pair of [
    ["agreed.mmd", "missing.mmd"],
    ["missing.mmd", "agreed.mmd"],
  ]) {
    const r = node("compare-charts.mjs", pair, dir);
    assert.equal(r.status, 2, pair.join(" "));
    assert.match(r.stderr, /^missing\.mmd: ENOENT/);
  }
  for (const [extra, why] of [
    ["  U_O --> L_O : 1. tap lock", /--highlight 0/],
    [
      "  %% second model (against): the spec",
      "actual.mmd: it has a second model; draw ACTUAL without --fixed-dot or --against-dot\n",
    ],
    [
      '  state "Locked" as g1 {\n    state "Closed" as L_C2\n  }',
      "actual.mmd: it has boxes; draw ACTUAL with --flat\n",
    ],
  ]) {
    writeFileSync(join(dir, "actual.mmd"), flatDoor([extra]));
    const r = node("compare-charts.mjs", ["agreed.mmd", "actual.mmd"], dir);
    assert.equal(r.status, 2, extra);
    if (typeof why === "string") assert.equal(r.stderr, why);
    else assert.match(r.stderr, why);
  }
});

test("an edge lists every step, writes shared leading words once, and the chart renders at its natural width", () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  const nodes = [
    ["Home", 1],
    ["Home", 2],
    ["Home", 3],
    ["Away", 1],
    ["Away", 2],
    ["Done", 1],
  ].map(
    ([s, n], i) =>
      `${i + 1} [label="/\\\\ s = \\"${s}\\"\\n/\\\\ n = ${n}"${i ? "" : ",style = filled"}]`,
  );
  const steps = [
    "1 -> 4 TapPay",
    "2 -> 5 TapBack",
    "3 -> 4 TapHome",
    "4 -> 1 OpenThread",
    "5 -> 2 OpenApp",
    "4 -> 6 Finish",
  ];
  writeFileSync(
    join(dir, "nav.dot"),
    `strict digraph DiskGraph {\n${nodes.join("\n")}\n${steps.map((e) => e.replace(/ (\w+)$/, ' [label="$1"];')).join("\n")}\n}\n`,
  );
  writeFileSync(
    join(dir, "nav.map.mjs"),
    `export const state = (v) => v.s;
export const step = (a) => ({ TapPay: "you tap Pay", TapBack: "you tap Back", TapHome: "you tap Home", OpenThread: "you open the thread", OpenApp: "you open the phone app", Finish: "" })[a];
`,
  );
  writeFileSync(
    join(dir, "agreed.mmd"),
    `stateDiagram-v2
  [*] --> Home
  Home --> Away : you tap Pay
  Home --> Away : you tap Back
  Home --> Away : you tap Home
  Away --> Home : you open the thread
  Away --> Home : you open the phone app
  Away --> Done
`,
  );
  const draw = (...extra) => {
    const r = node(
      "tlc-to-chart.mjs",
      [
        "--dot",
        "nav.dot",
        "--map",
        "nav.map.mjs",
        "--highlight",
        "0",
        "--out",
        "chart.mmd",
        ...extra,
      ],
      dir,
    );
    assert.equal(r.status, 0, r.stderr);
    return readFileSync(join(dir, "chart.mmd"), "utf8");
  };
  const chart = draw();
  assert.ok(
    chart.startsWith(
      "---\nconfig:\n  markdownAutoWrap: false\n  state:\n    useMaxWidth: false\n---\nstateDiagram-v2\n",
    ),
    chart,
  );
  const shortened = [
    "Away -> Done : ",
    "Away -> Home : you open the thread or the phone app",
    "Home -> Away : you tap Pay, Back, or Home",
  ];
  assert.deepEqual(edges(parseMermaid(chart).regions.Main), shortened);
  const crlf = chart.replace("---\n", "---  \n").replaceAll("\n", "\r\n");
  assert.deepEqual(edges(parseMermaid(crlf).regions.Main), shortened);
  const refused = node("compare-charts.mjs", ["agreed.mmd", "chart.mmd"], dir);
  assert.equal(refused.status, 2);
  assert.match(refused.stderr, /draw ACTUAL with --full-labels/);
  const full = draw("--full-labels");
  assert.match(full, /^stateDiagram-v2\n {2}%% labels in full\n/m);
  assert.deepEqual(edges(parseMermaid(full).regions.Main), [
    "Away -> Done : ",
    "Away -> Home : you open the thread or you open the phone app",
    "Home -> Away : you tap Pay or you tap Back or you tap Home",
  ]);
  assert.equal(node("compare-charts.mjs", ["agreed.mmd", "chart.mmd"], dir).stdout, "same\n");
});

const NO_TLC =
  "Cannot find TLC. It installs with mise, which cannot start: spawnSync mise ENOENT. Install mise (https://mise.jdx.dev), or set TLA2TOOLS to the path of tla2tools.jar, and JAVA to a java binary (Java 11 or later).\n";
const FROM_SPEC_USAGE =
  "node statechart.mjs from-spec SPEC.tla [--config FILE] [--fixed FIXED.tla [--fixed-config FILE] | --against AGREED.tla [--against-config FILE]] [--label TEXT] [--map FILE] [--expect-broken RULE]... [--title TEXT] [--out DIR] [--cover] [--png [--theme NAME]]";
const FROM_CHART_USAGE =
  "node statechart.mjs from-chart CHART.mmd [--module NAME] [--expect-broken RULE]... [--title TEXT] [--out DIR] [--png [--theme NAME]]";
const RENDER_USAGE = "node statechart.mjs render CHART.mmd [--theme NAME] [--out FILE]";
const noTlc = { PATH: mkdtempSync(join(tmpdir(), "empty-path-")), TLA2TOOLS: "", JAVA: "" };

test("statechart.mjs writes the spec next to the chart, keeps it on the next run, and stops without TLC", () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(join(dir, "notes-app.mmd"), fixture("sync.mmd"));
  const first = node("statechart.mjs", ["from-chart", "notes-app.mmd"], dir, noTlc);
  assert.equal(first.status, 2);
  assert.equal(
    first.stdout,
    "Wrote NotesApp.tla, NotesApp.cfg, and NotesApp.map.mjs from notes-app.mmd.\n",
  );
  assert.equal(first.stderr, NO_TLC);
  assert.equal(
    readFileSync(join(dir, "NotesApp.cfg"), "utf8"),
    "SPECIFICATION Spec\nINVARIANT TypeOK\nINVARIANT NeverSyncedWhileOffline\n",
  );
  const again = node("statechart.mjs", ["from-chart", "notes-app.mmd"], dir, noTlc);
  assert.equal(
    again.stdout,
    "Kept NotesApp.tla. Delete it to write the spec again from notes-app.mmd.\n",
  );
  const spec = node("statechart.mjs", ["from-spec", "NotesApp.tla"], dir, noTlc);
  assert.equal(spec.status, 2);
  assert.equal(spec.stderr, NO_TLC);
  const missingJar = node("statechart.mjs", ["from-spec", "NotesApp.tla"], dir, {
    TLA2TOOLS: "/nonexistent/tla2tools.jar",
  });
  assert.equal(missingJar.status, 2);
  assert.equal(
    missingJar.stderr,
    "TLA2TOOLS is /nonexistent/tla2tools.jar, which does not exist.\n",
  );
  const missingJava = node("statechart.mjs", ["from-spec", "NotesApp.tla"], dir, {
    ...noTlc,
    JAVA: "/nonexistent/java",
  });
  assert.equal(missingJava.status, 2);
  assert.equal(missingJava.stderr, "JAVA is /nonexistent/java, which does not exist.\n");
});

const installCommand = (...tools) =>
  `cd "$(mktemp -d)" && MISE_CEILING_PATHS="$PWD" mise install ${tools.map((t) => `'${t}'`).join(" ")}`;

test("statechart.mjs shows mise's own error when mise fails before it can look for TLC", () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  const bin = mkdtempSync(join(tmpdir(), "fake-mise-"));
  const said =
    "mise ERROR failed to read the global config\nmise ERROR Run with --verbose for more";
  writeFileSync(join(bin, "mise"), `#!/bin/sh\nprintf '%s\\n' "${said}" >&2\nexit 1\n`, {
    mode: 0o755,
  });
  writeFileSync(join(dir, "Pay.tla"), "---- MODULE Pay ----\n====\n");
  writeFileSync(join(dir, "Pay.cfg"), "SPECIFICATION Spec\n");
  writeFileSync(join(dir, "Pay.map.mjs"), "export default {};\n");
  const r = node("statechart.mjs", ["from-spec", "Pay.tla"], dir, {
    PATH: bin,
    TLA2TOOLS: "",
    JAVA: "",
  });
  assert.equal(r.status, 2);
  assert.equal(
    r.stderr,
    `Cannot find TLC, because mise failed:
  mise ERROR failed to read the global config
  mise ERROR Run with --verbose for more
The install command: ${installCommand(JAVA_TOOL, TLC_TOOL)}
Fix that, or set TLA2TOOLS to the path of tla2tools.jar, and JAVA to a java binary (Java 11 or later).
`,
  );
});

test("statechart.mjs writes no output folder when it refuses the input", () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(join(dir, "tla2tools.jar"), "");
  writeFileSync(join(dir, "Pay.tla"), "---- MODULE Pay ----\n====\n");
  writeFileSync(join(dir, "Pay.cfg"), "SPECIFICATION Spec\nINVARIANT Paid\n");
  writeFileSync(join(dir, "cart.mmd"), "stateDiagram-v2\n  [*] --> Cart\n  Cart --> Paid : pay\n");
  for (const args of [
    ["from-spec", "Pya.tla"],
    ["from-spec", "Pay.tla", "--expect-broken", "Unpaid"],
    ["from-spec", "Pay.tla", "--fixed", "PayFixd.tla"],
    ["from-chart", "cart.mmd", "--expect-broken", "Unpaid"],
  ]) {
    const r = node("statechart.mjs", args, dir, { TLA2TOOLS: join(dir, "tla2tools.jar") });
    assert.equal(r.status, 2, r.stderr);
  }
  assert.deepEqual(
    readdirSync(dir).filter((f) => f.endsWith("-statechart")),
    [],
  );
});

test("statechart.mjs does not use an output folder that has files that it did not write", () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(join(dir, "tla2tools.jar"), "");
  writeFileSync(join(dir, "Pay.tla"), "---- MODULE Pay ----\n====\n");
  writeFileSync(join(dir, "Pay.cfg"), "SPECIFICATION Spec\n");
  const env = { TLA2TOOLS: join(dir, "tla2tools.jar") };
  const cwd = node("statechart.mjs", ["from-spec", "Pay.tla", "--out", "."], dir, env);
  assert.equal(cwd.status, 2);
  assert.equal(
    cwd.stderr,
    ". has 3 files that this command did not write, such as Pay.cfg. A run puts its files in place of the whole output folder, so pass --out with a new folder.\n",
  );
  const out = join(dir, "Pay-statechart");
  mkdirSync(join(out, "tlc"), { recursive: true });
  writeFileSync(join(out, "chart.mmd"), "kept\n");
  writeFileSync(join(out, ".DS_Store"), "");
  writeFileSync(join(out, "notes.md"), "mine\n");
  const notes = node("statechart.mjs", ["from-spec", "Pay.tla"], dir, env);
  assert.equal(notes.status, 2);
  assert.equal(
    notes.stderr,
    "Pay-statechart has a file that this command did not write: notes.md. A run puts its files in place of the whole output folder, so pass --out with a new folder.\n",
  );
  assert.deepEqual(readdirSync(dir).sort(), [
    "Pay-statechart",
    "Pay.cfg",
    "Pay.tla",
    "tla2tools.jar",
  ]);
  assert.deepEqual(readdirSync(out).sort(), [".DS_Store", "chart.mmd", "notes.md", "tlc"]);
  assert.equal(readFileSync(join(out, "chart.mmd"), "utf8"), "kept\n");
});

test("statechart.mjs refuses an output folder with foreign files under tlc/ or behind an owned name", () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(join(dir, "tla2tools.jar"), "");
  writeFileSync(join(dir, "Pay.tla"), "---- MODULE Pay ----\n====\n");
  writeFileSync(join(dir, "Pay.cfg"), "SPECIFICATION Spec\n");
  const env = { TLA2TOOLS: join(dir, "tla2tools.jar") };
  const refused = (out, expected) => {
    const r = node("statechart.mjs", ["from-spec", "Pay.tla", "--out", out], dir, env);
    assert.equal(r.status, 2, r.stderr);
    assert.equal(
      r.stderr,
      `${out} has a file that this command did not write: ${expected}. A run puts its files in place of the whole output folder, so pass --out with a new folder.\n`,
    );
  };

  // A user's file inside the owned tlc/ folder.
  mkdirSync(join(dir, "nested", "tlc"), { recursive: true });
  writeFileSync(join(dir, "nested", "tlc", "Pay.out"), "");
  writeFileSync(join(dir, "nested", "tlc", "notes.md"), "mine\n");
  refused("nested", "tlc/notes.md");
  assert.equal(readFileSync(join(dir, "nested", "tlc", "notes.md"), "utf8"), "mine\n");

  // A folder that carries the name of a generated file.
  mkdirSync(join(dir, "typed", "chart.mmd"), { recursive: true });
  writeFileSync(join(dir, "typed", "chart.mmd", "notes.md"), "mine\n");
  refused("typed", "chart.mmd");

  // The same with the ignored Finder file.
  mkdirSync(join(dir, "finder", ".DS_Store"), { recursive: true });
  writeFileSync(join(dir, "finder", ".DS_Store", "notes.md"), "mine\n");
  refused("finder", ".DS_Store");

  // A link under an owned name is not the run's file either.
  mkdirSync(join(dir, "linked"));
  writeFileSync(join(dir, "elsewhere.mmd"), "theirs\n");
  symlinkSync(join(dir, "elsewhere.mmd"), join(dir, "linked", "chart.mmd"));
  refused("linked", "chart.mmd");
  assert.equal(readFileSync(join(dir, "elsewhere.mmd"), "utf8"), "theirs\n");

  // The run's own files, including the whole of tlc/, still pass.
  mkdirSync(join(dir, "own", "tlc"), { recursive: true });
  for (const f of ["chart.mmd", "stories.md", "summary.json", ".DS_Store", "bug-1.png"])
    writeFileSync(join(dir, "own", f), "");
  for (const f of ["Pay.cfg", "Pay.out", "Pay.dot", "Pay-Safe.cfg", "regions-proof.mmd"])
    writeFileSync(join(dir, "own", "tlc", f), "");
  // The run gets past the ownership check and stops at the next step, the missing mapping.
  const own = node("statechart.mjs", ["from-spec", "Pay.tla", "--out", "own"], dir, env);
  assert.doesNotMatch(own.stderr, /did not write/);
  assert.match(own.stderr, /Wrote Pay\.map\.mjs/);
});

test("statechart.mjs exits 2 and names a helper script that cannot start", () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(join(dir, "notes-app.mmd"), fixture("sync.mmd"));
  writeFileSync(join(dir, "no-node.cjs"), 'process.execPath = "/nonexistent/node";\n');
  const r = node("statechart.mjs", ["from-chart", "notes-app.mmd"], dir, {
    NODE_OPTIONS: `--require ${join(dir, "no-node.cjs")}`,
  });
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /chart-to-tla\.mjs/);
});

test("statechart.mjs names the chart it refuses and the argument it does not know", () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(
    join(dir, "c.mmd"),
    "stateDiagram-v2\n  [*] --> A\n  A --> B : go\n  %% never Bad: C -- never C\n",
  );
  const refused = node("statechart.mjs", ["from-chart", "c.mmd"], dir);
  assert.equal(refused.status, 2);
  assert.equal(refused.stdout, "");
  assert.equal(refused.stderr, 'c.mmd: never line names "C", which is not a state in the chart\n');
  const unknown = node("statechart.mjs", ["from-chart", "c.mmd", "--fixed", "CFixed.tla"], dir);
  assert.equal(unknown.status, 2);
  assert.equal(
    unknown.stderr,
    "unknown argument --fixed. Run node statechart.mjs from-chart --help for the flags, the output, and the exit codes.\n",
  );
  const sameFile = node("statechart.mjs", ["from-spec", "C.tla", "--fixed", "./C.tla"], dir);
  assert.equal(sameFile.status, 2);
  assert.equal(sameFile.stderr, "--fixed needs a file other than the spec, C.tla.\n");
  const sameAgreed = node("statechart.mjs", ["from-spec", "C.tla", "--against", "C.tla"], dir);
  assert.equal(sameAgreed.stderr, "--against needs a file other than the spec, C.tla.\n");
  for (const [extra, stderr] of [
    [
      ["--fixed", "F.tla", "--against", "A.tla"],
      "use --fixed or --against, not both. Run node statechart.mjs from-spec --help for the flags, the output, and the exit codes.\n",
    ],
    [
      ["--label", "the new build"],
      "--label names the --fixed or --against model; it needs one of them. Run node statechart.mjs from-spec --help for the flags, the output, and the exit codes.\n",
    ],
  ]) {
    const r = node("statechart.mjs", ["from-spec", "C.tla", ...extra], dir);
    assert.equal(r.status, 2, extra.join(" "));
    assert.equal(r.stderr, stderr);
  }
  const valueless = node("statechart.mjs", ["from-chart", "c.mmd", "--out"], dir);
  assert.equal(valueless.status, 2);
  assert.equal(
    valueless.stderr,
    "--out needs a value. Run node statechart.mjs from-chart --help for the flags, the output, and the exit codes.\n",
  );
  for (const [args, stderr] of [
    [
      ["render", "c.mmd", "--theme", "blue"],
      "--theme takes light, dark, or classic. Run node statechart.mjs render --help for the flags, the output, and the exit codes.\n",
    ],
    [
      ["from-chart", "c.mmd", "--theme", "dark"],
      "--theme needs --png. Run node statechart.mjs from-chart --help for the flags, the output, and the exit codes.\n",
    ],
    [
      ["render", "c.mmd", "--png"],
      "unknown argument --png. Run node statechart.mjs render --help for the flags, the output, and the exit codes.\n",
    ],
    [
      ["render"],
      `Usage: ${RENDER_USAGE}\nRun node statechart.mjs render --help for the flags, the output, and the exit codes.\n`,
    ],
  ]) {
    const r = node("statechart.mjs", args, dir);
    assert.equal(r.status, 2, args.join(" "));
    assert.equal(r.stderr, stderr);
  }
  const bare = node("statechart.mjs", [], dir);
  assert.equal(bare.status, 2);
  assert.equal(
    bare.stderr,
    `Usage: ${FROM_SPEC_USAGE}
       ${FROM_CHART_USAGE}
       ${RENDER_USAGE}
Run node statechart.mjs --help for the flags, the output, and the exit codes.
`,
  );
});

test("statechart.mjs prints its help with -h or --help and points at it for an argument it does not know, and each inner script refuses that argument", () => {
  const help = {
    "statechart.mjs": [[], `Usage: ${FROM_SPEC_USAGE}`],
    "statechart.mjs from-spec": [["from-spec"], `Usage: ${FROM_SPEC_USAGE}`],
    "statechart.mjs from-chart": [["from-chart", "notes-app.mmd"], `Usage: ${FROM_CHART_USAGE}`],
  };
  for (const [name, [before, usage]] of Object.entries(help)) {
    const script = name.split(" ")[0];
    for (const flag of ["-h", "--help"]) {
      const r = node(script, [...before, flag], here);
      assert.equal(r.status, 0, `${name} ${flag}`);
      assert.equal(r.stderr, "");
      assert.equal(r.stdout.split("\n")[0], usage);
      assert.match(r.stdout, /\nExit codes\n {2}0 .*\n(.*\n)* {2}1 .*\n(.*\n)* {2}2 /);
    }
  }
  const top = node("statechart.mjs", ["--help"], here).stdout.split("\n");
  assert.equal(top[1], `       ${FROM_CHART_USAGE}`);
  assert.equal(top[2], `       ${RENDER_USAGE}`);
  assert.equal(top[3], "       node statechart.mjs [from-spec|from-chart|render] --help");
  for (const flag of [
    "--fixed FIXED.tla",
    "--label TEXT",
    "--map FILE",
    "--module NAME",
    "--title TEXT",
    "--out DIR",
    "--png",
    "-h, --help",
  ])
    assert.ok(
      top.some((l) => l.startsWith(`  ${flag}  `)),
      flag,
    );
  for (const [script, args, stderr] of [
    [
      "statechart.mjs",
      ["from-spec", "--nope"],
      "unknown argument --nope. Run node statechart.mjs from-spec --help for the flags, the output, and the exit codes.\n",
    ],
    ["chart-to-tla.mjs", ["--nope"], "unknown argument --nope.\n"],
    ["tlc-to-chart.mjs", ["--nope"], "unknown argument --nope.\n"],
    ["compare-charts.mjs", ["--nope"], "unknown argument --nope.\n"],
  ]) {
    const r = node(script, args, here);
    assert.equal(r.status, 2, script);
    assert.equal(r.stdout, "");
    assert.equal(r.stderr, stderr);
  }
});

const tools = (() => {
  try {
    return findTlc();
  } catch {
    return null;
  }
})();
const needsTlc = { skip: tools ? false : "cannot find TLC" };

const realEntry = pathToFileURL(join(cacheDir(), "entry.mjs")).href;
const lib = await loadRenderer().catch(() => null);
const needsPng = { skip: lib ? false : "cannot install Pele and resvg" };

function fakeRenderer() {
  const xdg = mkdtempSync(join(tmpdir(), "xdg-"));
  const dir = join(xdg, "statechart", CACHE_NAME);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "entry.mjs"),
    `import { appendFileSync } from "node:fs";
import { render as real } from ${JSON.stringify(realEntry)};
export { Resvg } from ${JSON.stringify(realEntry)};
export function render(text, options) {
  const title = JSON.parse(/^title: (.*)$/m.exec(text)?.[1] ?? '""');
  if (process.env.RENDERED) appendFileSync(process.env.RENDERED, \`\${title}\\n\`);
  if (title && process.env.UNRENDERED?.split("|").includes(title))
    throw new Error("Pele cannot lay out this chart");
  return real(text, options);
}
`,
  );
  return xdg;
}

const paeth = (a, b, c) => {
  const [pa, pb, pc] = [a, b, c].map((v) => Math.abs(a + b - c - v));
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};
const FILTERS = [() => 0, (a) => a, (a, b) => b, (a, b) => (a + b) >> 1, paeth];

function decodePng(png) {
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], "PNG signature");
  const chunks = {};
  for (let at = 8; at < png.length;) {
    const size = png.readUInt32BE(at);
    const type = png.toString("latin1", at + 4, at + 8);
    const crc = crc32(png.subarray(at + 4, at + 8 + size));
    assert.equal(png.readUInt32BE(at + 8 + size), crc, `${type} chunk CRC`);
    (chunks[type] ??= []).push(png.subarray(at + 8, at + 8 + size));
    at += 12 + size;
  }
  const [ihdr] = chunks.IHDR;
  const [width, height] = [ihdr.readUInt32BE(0), ihdr.readUInt32BE(4)];
  assert.deepEqual([ihdr[8], ihdr[9], ihdr[12]], [8, 6, 0], "8-bit RGBA, not interlaced");
  const raw = inflateSync(Buffer.concat(chunks.IDAT));
  const stride = width * 4;
  const px = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const row = y * (stride + 1);
    const filter = FILTERS[raw[row]];
    assert.ok(filter, `row ${y} has PNG filter ${raw[row]}`);
    for (let x = 0; x < stride; x++) {
      const a = x < 4 ? 0 : px[y * stride + x - 4];
      const b = y ? px[(y - 1) * stride + x] : 0;
      const c = x < 4 || !y ? 0 : px[(y - 1) * stride + x - 4];
      px[y * stride + x] = raw[row + 1 + x] + filter(a, b, c);
    }
  }
  const at = (x, y) => (Math.floor(y) * width + Math.floor(x)) * 4;
  return {
    width,
    height,
    pixel: (x, y) => `#${px.subarray(at(x, y), at(x, y) + 3).toString("hex")}`,
  };
}

const xmlText = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
const textLines = (text) => {
  const spans = [...text.matchAll(/<tspan\b[^>]*>([^<]*)<\/tspan>/g)].map((m) => m[1]);
  return (spans.length ? spans : [text.replace(/<[^>]+>/g, "")])
    .map(xmlText)
    .filter((l) => l.trim());
};
const width = (rect) => +/\swidth="([\d.]+)"/.exec(rect)[1];

function labeledBoxes(svg) {
  const states = [
    ...svg.matchAll(
      /<g class="pele-node pele-state[^"]*" data-id="([^"]+)"[^>]*>(<rect\b[^>]*\/>)([\s\S]*?)<\/g>/g,
    ),
  ].flatMap(([, id, rect, inside]) => {
    const text = /<text\b[^>]*>[\s\S]*?<\/text>/.exec(inside);
    return text
      ? [{ kind: "state", id, box: width(rect), size: 16, lines: textLines(text[0]) }]
      : [];
  });
  const edges = [
    ...svg.matchAll(
      /<g class="pele-edge-label" data-id="([^"]+)">(<rect\b[^>]*\/>)(<text\b[\s\S]*?<\/text>)/g,
    ),
  ].map(([, id, rect, text]) => ({
    kind: "edge label",
    id,
    box: width(rect),
    size: 14,
    lines: textLines(text),
  }));
  const regions = [
    ...svg.matchAll(
      /<g class="pele-cluster[^"]*" data-id="([^"]+)">(<rect\b[^>]*\/>)[\s\S]*?(<text class="pele-cluster-label"[\s\S]*?<\/text>)/g,
    ),
  ].map(([, id, rect, text]) => ({
    kind: "region title",
    id,
    box: width(rect),
    size: 16,
    lines: textLines(text),
  }));
  return [...states, ...edges, ...regions];
}

function tlc(dir, name) {
  const r = spawnSync(
    tools.java,
    [
      "-cp",
      tools.jar,
      "tlc2.TLC",
      "-metadir",
      mkdtempSync(join(tmpdir(), "tlc-")),
      "-deadlock",
      "-continue",
      "-dump",
      "dot,actionlabels",
      `${name}.dot`,
      "-config",
      `${name}.cfg`,
      `${name}.tla`,
    ],
    { cwd: dir, encoding: "utf8" },
  );
  writeFileSync(join(dir, `${name}.out`), r.stdout);
  return r;
}

const FAKE_MISE = `#!/bin/sh
echo "$PWD $*" >> "$MISE_LOG"
d=$PWD
while :; do
  grep -qs '^locked = true' "$d/mise.toml" && locked=1
  case ":$MISE_CEILING_PATHS:" in *":$d:"*) break;; esac
  [ "$d" = / ] && break
  d=$(dirname "$d")
done
case $1 in
install)
  if [ -n "$FAIL" ]; then echo "mise ERROR cannot download tla2tools.jar" >&2; exit 1; fi
  if [ -n "$locked" ]; then echo "mise ERROR No lockfile URL found for $3 (--locked mode)" >&2; exit 1; fi
  touch "$MISE_STATE/installed"
  if [ -n "$FAIL_AFTER_INSTALL" ]; then echo "mise ERROR failed to rebuild runtime symlinks: File exists (os error 17)" >&2; exit 1; fi
  exit 0;;
where) if [ -e "$MISE_STATE/installed" ]; then echo "$TLAPLUS_HOME"; exit 0; fi;;
which) if [ -e "$MISE_STATE/installed" ]; then echo "$TLC_JAVA"; exit 0; fi;;
esac
echo "mise ERROR $2 is not installed" >&2
exit 1
`;

function outsideRepoWithoutTlc() {
  const root = mkdtempSync(join(tmpdir(), "statechart-outside-"));
  const at = join(root, "skill", "scripts");
  cpSync(scripts, at, { recursive: true, filter: (f) => !f.startsWith(here) });
  const bin = join(root, "bin");
  const state = join(root, "state");
  const dir = join(root, "work");
  for (const d of [bin, state, dir]) mkdirSync(d);
  writeFileSync(join(bin, "mise"), FAKE_MISE, { mode: 0o755 });
  writeFileSync(join(dir, "mise.toml"), '[tools]\njava = "17"\n');
  const log = join(root, "mise.log");
  const env = {
    PATH: `${bin}${delimiter}${process.env.PATH}`,
    TLA2TOOLS: "",
    JAVA: "",
    MISE_STATE: state,
    MISE_LOG: log,
  };
  const calls = () =>
    existsSync(log)
      ? readFileSync(log, "utf8")
          .trim()
          .split("\n")
          .map((line) => {
            const [folder, ...args] = line.split(" ");
            return { folder, args };
          })
      : [];
  return { at, dir, env, calls };
}

function assertMiseRanInARemovedEmptyFolder(dir, calls) {
  const folders = [...new Set(calls.map((c) => c.folder))];
  assert.equal(folders.length > 0, true);
  for (const folder of folders) {
    assert.equal(folder.startsWith(dir), false, folder);
    assert.equal(existsSync(folder), false, folder);
  }
}

const INSTALLING = "Installing TLC and Java with mise. This happens once.\n";

test("statechart.mjs outside the repo installs TLC with mise in an empty folder once and shows mise's error", () => {
  const { at, dir, env, calls } = outsideRepoWithoutTlc();
  writeFileSync(join(dir, "Pay.tla"), "---- MODULE Pay ----\n====\n");
  writeFileSync(join(dir, "Pay.cfg"), "SPECIFICATION Spec\n");
  writeFileSync(join(dir, "Pay.map.mjs"), "export default {};\n");
  const r = node("statechart.mjs", ["from-spec", "Pay.tla"], dir, { ...env, FAIL: "1" }, at);
  assert.equal(r.status, 2);
  assert.equal(
    r.stderr,
    `${INSTALLING}Cannot find TLC, and mise could not install it:
  mise ERROR cannot download tla2tools.jar
The install command: ${installCommand(JAVA_TOOL, TLC_TOOL)}
Or set TLA2TOOLS to the path of tla2tools.jar, and JAVA to a java binary (Java 11 or later).
`,
  );
  const install = ["install", "--quiet", JAVA_TOOL, TLC_TOOL];
  assert.deepEqual(
    calls().map((c) => c.args),
    [
      ["where", TLC_TOOL],
      ["which", "java", "--tool", JAVA_TOOL],
      install,
      ["where", TLC_TOOL],
      ["which", "java", "--tool", JAVA_TOOL],
    ],
  );
  assertMiseRanInARemovedEmptyFolder(dir, calls());
});

test("statechart.mjs with JAVA set installs only TLC with mise", () => {
  const { at, dir, env, calls } = outsideRepoWithoutTlc();
  writeFileSync(join(dir, "Pay.tla"), "---- MODULE Pay ----\n====\n");
  writeFileSync(join(dir, "Pay.cfg"), "SPECIFICATION Spec\n");
  writeFileSync(join(dir, "Pay.map.mjs"), "export default {};\n");
  const javaEnv = { ...env, JAVA: process.execPath, FAIL: "1" };
  const r = node("statechart.mjs", ["from-spec", "Pay.tla"], dir, javaEnv, at);
  assert.equal(r.status, 2);
  assert.equal(
    r.stderr,
    `Installing TLC with mise. This happens once.
Cannot find TLC, and mise could not install it:
  mise ERROR cannot download tla2tools.jar
The install command: ${installCommand(TLC_TOOL)}
Or set TLA2TOOLS to the path of tla2tools.jar, and JAVA to a java binary (Java 11 or later).
`,
  );
  assert.deepEqual(
    calls().map((c) => c.args[0]),
    ["where", "install", "where"],
  );
  assertMiseRanInARemovedEmptyFolder(dir, calls());
});

test(
  "statechart.mjs outside the repo installs a missing TLC with mise once, and leaves the mise files next to the spec alone",
  needsTlc,
  () => {
    const { at, dir, env, calls } = outsideRepoWithoutTlc();
    const tlcEnv = { ...env, TLAPLUS_HOME: dirname(tools.jar), TLC_JAVA: tools.java };
    writeFileSync(join(dir, "upload.mmd"), fixture("upload.mmd"));
    const first = node("statechart.mjs", ["from-chart", "upload.mmd"], dir, tlcEnv, at);
    assert.equal(first.status, 0, first.stderr);
    assert.equal(first.stderr, INSTALLING);
    assert.match(first.stdout, /\nThe spec draws upload\.mmd back unchanged\.\n/);
    const again = node("statechart.mjs", ["from-chart", "upload.mmd"], dir, tlcEnv, at);
    assert.equal(again.status, 0, again.stderr);
    assert.equal(again.stderr, "");
    assert.equal(calls().filter((c) => c.args[0] === "install").length, 1);
    assertMiseRanInARemovedEmptyFolder(dir, calls());
  },
);

test(
  "statechart.mjs uses TLC that mise installed even when mise install then exits non-zero",
  needsTlc,
  () => {
    const { at, dir, env, calls } = outsideRepoWithoutTlc();
    const tlcEnv = {
      ...env,
      TLAPLUS_HOME: dirname(tools.jar),
      TLC_JAVA: tools.java,
      FAIL_AFTER_INSTALL: "1",
    };
    writeFileSync(join(dir, "upload.mmd"), fixture("upload.mmd"));
    const r = node("statechart.mjs", ["from-chart", "upload.mmd"], dir, tlcEnv, at);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stderr, INSTALLING);
    assert.match(r.stdout, /\nThe spec draws upload\.mmd back unchanged\.\n/);
    assert.equal(calls().filter((c) => c.args[0] === "install").length, 1);
  },
);

test(
  "statechart.mjs installs TLC with mise inside a repo whose mise.toml sets locked = true",
  needsTlc,
  () => {
    const { at, dir, env, calls } = outsideRepoWithoutTlc();
    writeFileSync(join(dir, "mise.toml"), "[settings]\nlocked = true\n");
    const specs = join(dir, "specs");
    mkdirSync(specs);
    writeFileSync(join(specs, "upload.mmd"), fixture("upload.mmd"));
    const tlcEnv = { ...env, TLAPLUS_HOME: dirname(tools.jar), TLC_JAVA: tools.java };
    const r = node("statechart.mjs", ["from-chart", "upload.mmd"], specs, tlcEnv, at);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stderr, INSTALLING);
    assert.match(r.stdout, /\nThe spec draws upload\.mmd back unchanged\.\n/);
    assertMiseRanInARemovedEmptyFolder(dir, calls());
  },
);

test(
  "statechart.mjs finds TLC with the real mise when an untrusted mise.toml is next to the spec and above TMPDIR",
  {
    skip:
      !tools || process.env.TLA2TOOLS
        ? "needs TLC from mise, not from TLA2TOOLS"
        : spawnSync("mise", ["--version"]).error
          ? "needs mise"
          : false,
  },
  () => {
    const root = mkdtempSync(join(tmpdir(), "statechart-outside-"));
    const at = join(root, "scripts");
    cpSync(scripts, at, { recursive: true, filter: (f) => !f.startsWith(here) });
    const dir = join(root, "work");
    const tmp = join(dir, "tmp");
    mkdirSync(tmp, { recursive: true });
    writeFileSync(join(dir, "mise.toml"), '[tools]\njava = "17"\n\n[env]\nSTATECHART = "1"\n');
    writeFileSync(join(dir, "upload.mmd"), fixture("upload.mmd"));
    const env = { JAVA: "", TMPDIR: tmp };
    const r = node("statechart.mjs", ["from-chart", "upload.mmd"], dir, env, at);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stderr, "");
    assert.match(r.stdout, /\nThe spec draws upload\.mmd back unchanged\.\n/);
    assert.deepEqual(readdirSync(dir).sort(), [
      "Upload-statechart",
      "Upload.cfg",
      "Upload.map.mjs",
      "Upload.tla",
      "mise.toml",
      "tmp",
      "upload.mmd",
    ]);
  },
);

test("statechart.mjs shows why java cannot start TLC", needsTlc, () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(join(dir, "upload.mmd"), fixture("upload.mmd"));
  const setVars =
    "Fix that, or set TLA2TOOLS to the path of tla2tools.jar, and JAVA to a java binary (Java 11 or later).\n";
  const folder = dirname(tools.jar);
  const notJar = node("statechart.mjs", ["from-chart", "upload.mmd"], dir, {
    TLA2TOOLS: folder,
    JAVA: tools.java,
  });
  assert.equal(notJar.status, 2);
  assert.equal(
    notJar.stderr,
    `cannot run TLC with ${tools.java} -cp ${folder}: java exited 1:
  Error: Could not find or load main class tlc2.TLC
  Caused by: java.lang.ClassNotFoundException: tlc2.TLC
${setVars}`,
  );
  const noJava = node("statechart.mjs", ["from-chart", "upload.mmd"], dir, {
    ...noTlc,
    TLA2TOOLS: tools.jar,
  });
  assert.equal(noJava.status, 2);
  assert.equal(
    noJava.stderr,
    `cannot run TLC with java -cp ${tools.jar}: spawn java ENOENT\n${setVars}`,
  );
});

test("from-chart checks the agreed chart and draws it back unchanged", needsTlc, () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(join(dir, "upload.mmd"), fixture("upload.mmd"));
  const r = node("statechart.mjs", ["from-chart", "upload.mmd"], dir);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(
    r.stdout,
    `Wrote Upload.tla, Upload.cfg, and Upload.map.mjs from upload.mmd.
TLC on Upload.tla with Upload.cfg:
  TypeOK holds.
  TLC ran 2 times in N s.

Chart: 5 states and 8 transitions from 5 model states.
5 work, 0 break a rule.

No state breaks an INVARIANT rule.

The spec draws upload.mmd back unchanged.

Wrote chart.mmd, stories.md, summary.json in Upload-statechart.
`,
  );
  assert.equal(r.stderr, "");
});

const ringing = `stateDiagram-v2
  [*] --> Idle
  Idle --> Ringing : a call comes in
  Ringing --> Ringing : it rings again
  Ringing --> Idle : the caller hangs up
`;

test(
  "from-chart counts a self-loop, so a spec that drops it does not draw the chart back",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(join(dir, "call.mmd"), ringing);
    const drawn = node("statechart.mjs", ["from-chart", "call.mmd"], dir);
    assert.equal(drawn.status, 0, drawn.stdout + drawn.stderr);
    assert.match(drawn.stdout, /\nThe spec draws call\.mmd back unchanged\.\n/);

    const spec = readFileSync(join(dir, "Call.tla"), "utf8");
    const dropped = spec.replace(" \\/ ItRingsAgain", "");
    assert.notEqual(dropped, spec);
    writeFileSync(join(dir, "Call.tla"), dropped);
    const r = node("statechart.mjs", ["from-chart", "call.mmd"], dir);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(
      r.stdout,
      /\nThe spec does not draw call\.mmd:\n {2}transitions only in EXPECTED [^\n]*\n {4}Ringing --> Ringing : it rings again\n {2}1 difference\(s\)\n/,
    );
  },
);

test("from-chart draws a chart with no transitions back unchanged", needsTlc, () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(join(dir, "lone.mmd"), "stateDiagram-v2\n  [*] --> Idle\n");
  const r = node("statechart.mjs", ["from-chart", "lone.mmd"], dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /\nThe spec draws lone\.mmd back unchanged\.\n/);
  assert.equal(r.stderr, "");
});

test("TLC reads a label with a guarded and an unguarded move in one region", needsTlc, () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(join(dir, "switch.mmd"), switchLamp);
  const r = node("statechart.mjs", ["from-chart", "switch.mmd"], dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /\nThe spec draws switch\.mmd back unchanged\.\n/);
});

const syncStory = `## 1. Offline | Synced

Rule broken: You never see "Synced" while you are offline.
In the model, one step leads into this bug: "the server confirms".

0. Start: Online | Synced
1. The network drops. Now: Offline | Waiting to sync
2. The server confirms. Now: Offline | Synced
`;

test("from-chart finds the design bug, and from-spec with the fix marks it fixed", needsTlc, () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(join(dir, "sync.mmd"), fixture("sync.mmd"));
  const today = node("statechart.mjs", ["from-chart", "sync.mmd"], dir);
  assert.equal(today.status, 1, today.stderr);
  assert.equal(
    today.stdout,
    `Wrote Sync.tla, Sync.cfg, and Sync.map.mjs from sync.mmd.
TLC on Sync.tla with Sync.cfg:
  TypeOK holds.
  NeverSyncedWhileOffline is broken.
  TLC ran 4 times in N s.

Chart: 4 states and 8 transitions from 4 model states.
3 work, 1 breaks a rule.

${syncStory}
The spec draws sync.mmd back unchanged.

Wrote chart.mmd, bug-1.mmd, stories.md, summary.json in Sync-statechart.
`,
  );
  assert.match(
    readFileSync(join(dir, "Sync-statechart", "bug-1.mmd"), "utf8"),
    /: 2\. the server confirms\n/,
  );

  const spec = readFileSync(join(dir, "Sync.tla"), "utf8");
  const guarded = spec
    .replace("TheServerConfirms ==\n", 'TheServerConfirms ==\n    /\\ connection = "Online"\n')
    .replace("MODULE Sync", "MODULE SyncFixed");
  assert.notEqual(guarded, spec);
  writeFileSync(join(dir, "SyncFixed.tla"), guarded);
  const fixed = node("statechart.mjs", ["from-spec", "Sync.tla", "--fixed", "SyncFixed.tla"], dir);
  assert.equal(fixed.status, 1, fixed.stderr);
  assert.equal(
    fixed.stdout,
    `TLC on Sync.tla with Sync.cfg:
  TypeOK holds.
  NeverSyncedWhileOffline is broken.
  TLC ran 4 times in N s.
TLC on SyncFixed.tla with Sync.cfg:
  TypeOK holds.
  NeverSyncedWhileOffline holds.
  TLC ran 3 times in N s.

Chart: 4 states and 9 transitions from 4 model states.
3 work today, 0 still wrong with the fix, 1 fixed or new with the fix.

${syncStory}
With the fix, step 2 (the server confirms) cannot happen, so you stay at: Offline | Waiting to sync.

Wrote chart.mmd, bug-1.mmd, stories.md, summary.json in Sync-statechart.
`,
  );
  const summary = JSON.parse(readFileSync(join(dir, "Sync-statechart", "summary.json"), "utf8"));
  assert.deepEqual(summary.chartStatus, {
    works: 3,
    wrong: 0,
    fixed: 1,
    mixed: 0,
    after: 0,
    worse: 0,
  });
  assert.equal(summary.classes[0].fix, "Offline | Waiting to sync");

  const map = readFileSync(join(dir, "Sync.map.mjs"), "utf8");
  writeFileSync(join(dir, "Sync.map.mjs"), `${map}export const group = () => "Your notes";\n`);
  const grouped = node(
    "statechart.mjs",
    ["from-spec", "Sync.tla", "--fixed", "SyncFixed.tla"],
    dir,
  );
  assert.equal(grouped.status, 1, grouped.stderr);
  const lines = readFileSync(join(dir, "Sync-statechart", "chart.mmd"), "utf8").split("\n");
  assert.deepEqual(
    lines.filter((l) => /^ {2}(classDef|class) |legend/.test(l)),
    [
      "  classDef plainFixed fill:#f4f6f7,stroke:#1e8449,stroke-width:4px,color:#145a32",
      "  classDef group0 fill:#d6eaf8,stroke:#6b757c,color:#1b2631",
      "  classDef group0Fixed fill:#d6eaf8,stroke:#1e8449,stroke-width:4px,color:#145a32",
      '  state "Legend" as legend {',
      '    state "Your notes" as legendGroup0',
      '    state "Fixed or new with the fix" as legendFixed',
      "  class legendGroup0 group0",
      "  class legendFixed plainFixed",
      "  class s0 group0Fixed",
      "  class s1 group0",
      "  class s2 group0",
      "  class s3 group0",
    ],
  );
  writeFileSync(join(dir, "Sync.map.mjs"), map);

  writeFileSync(join(dir, "Sync.tla"), guarded.replace("MODULE SyncFixed", "MODULE Sync"));
  const coded = node("statechart.mjs", ["from-chart", "sync.mmd"], dir);
  assert.equal(coded.status, 1, coded.stderr);
  assert.equal(
    coded.stdout,
    `Kept Sync.tla. Delete it to write the spec again from sync.mmd.
TLC on Sync.tla with Sync.cfg:
  TypeOK holds.
  NeverSyncedWhileOffline holds.
  TLC ran 3 times in N s.

Chart: 3 states and 5 transitions from 3 model states.
3 work, 0 break a rule.

No state breaks an INVARIANT rule.

The spec does not draw sync.mmd:
  states only in EXPECTED (no path from the start reaches them in the spec, or the spec renamed them):
    Offline | Synced
  transitions only in EXPECTED (a guard in the spec blocks them, or the spec renamed the step):
    Offline | Synced --> Offline | Waiting to sync : the network drops
    Offline | Synced --> Offline | Waiting to sync : you edit a note
    Offline | Synced --> Online | Synced : the network returns
    Offline | Waiting to sync --> Offline | Synced : the server confirms
  5 difference(s)

Wrote chart.mmd, stories.md, summary.json in Sync-statechart.
`,
  );
  assert.deepEqual(readdirSync(join(dir, "Sync-statechart")).sort(), [
    "chart.mmd",
    "stories.md",
    "summary.json",
    "tlc",
  ]);
});

test(
  "a second model with the module name of the spec, in its own folder, keeps its own TLC files",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(join(dir, "sync.mmd"), fixture("sync.mmd"));
    assert.equal(node("statechart.mjs", ["from-chart", "sync.mmd"], dir).status, 1);
    const guarded = readFileSync(join(dir, "Sync.tla"), "utf8").replace(
      "TheServerConfirms ==\n",
      'TheServerConfirms ==\n    /\\ connection = "Online"\n',
    );
    mkdirSync(join(dir, "fix"));
    writeFileSync(join(dir, "fix", "Sync.tla"), guarded);
    writeFileSync(join(dir, "SyncFixed.tla"), guarded.replace("MODULE Sync", "MODULE SyncFixed"));
    const run = (...args) => node("statechart.mjs", ["from-spec", "Sync.tla", ...args], dir);
    const broken = /^Error: Invariant NeverSyncedWhileOffline is violated/m;

    const named = run("--fixed", "SyncFixed.tla", "--out", "named");
    const same = run("--fixed", "fix/Sync.tla", "--out", "same");
    assert.equal(same.status, 1, same.stderr);
    assert.equal(same.stderr, named.stderr.replaceAll("SyncFixed.tla", "fix/Sync.tla"));
    assert.equal(
      same.stdout,
      named.stdout
        .replace("TLC on SyncFixed.tla with", "TLC on fix/Sync.tla with")
        .replace(" in named.\n", " in same.\n"),
    );
    for (const file of ["chart.mmd", "bug-1.mmd", "stories.md"])
      assert.equal(
        readFileSync(join(dir, "same", file), "utf8"),
        readFileSync(join(dir, "named", file), "utf8"),
      );
    const tlcOut = (...parts) => readFileSync(join(dir, "same", "tlc", ...parts), "utf8");
    assert.match(tlcOut("Sync-NeverSyncedWhileOffline.out"), broken);
    assert.doesNotMatch(tlcOut("fixed", "Sync-NeverSyncedWhileOffline.out"), broken);

    cpSync(join(dir, "Sync.cfg"), join(dir, "fix", "Sync.cfg"));
    const agreed = run("--against", "fix/Sync.tla", "--out", "agreed");
    assert.equal(agreed.status, 1, agreed.stderr);
    assert.match(agreed.stdout, /^TLC on fix\/Sync\.tla with fix\/Sync\.cfg:\n/m);
    const agreedOut = (...parts) => readFileSync(join(dir, "agreed", "tlc", ...parts), "utf8");
    assert.match(agreedOut("Sync-NeverSyncedWhileOffline.out"), broken);
    assert.doesNotMatch(agreedOut("against", "Sync-NeverSyncedWhileOffline.out"), broken);
  },
);

const lockSpec = `---- MODULE Lock ----
VARIABLES a, b, locked
vars == <<a, b, locked>>
Init == a = "idle" /\\ b = "idle" /\\ locked = FALSE
CheckA == a = "idle" /\\ ~locked /\\ a' = "checked" /\\ UNCHANGED <<b, locked>>
TakeA == a = "checked" /\\ a' = "critical" /\\ locked' = TRUE /\\ UNCHANGED b
ReleaseA == a = "critical" /\\ a' = "idle" /\\ locked' = FALSE /\\ UNCHANGED b
CheckB == b = "idle" /\\ ~locked /\\ b' = "checked" /\\ UNCHANGED <<a, locked>>
TakeB == b = "checked" /\\ b' = "critical" /\\ locked' = TRUE /\\ UNCHANGED a
ReleaseB == b = "critical" /\\ b' = "idle" /\\ locked' = FALSE /\\ UNCHANGED a
Spec == Init /\\ [][CheckA \\/ TakeA \\/ ReleaseA \\/ CheckB \\/ TakeB \\/ ReleaseB]_vars
\\* Two processes are never in the critical section at once.
MutualExclusion == ~(a = "critical" /\\ b = "critical")
====
`;
const lockMap = `const S = { idle: "outside", checked: "saw the lock free", critical: "in the critical section" };
export const state = (v) => \`A \${S[v.a]}, B \${S[v.b]}\`;
export const step = (a) => ({
  CheckA: "A checks the lock", TakeA: "A takes the lock", ReleaseA: "A releases the lock",
  CheckB: "B checks the lock", TakeB: "B takes the lock", ReleaseB: "B releases the lock",
})[a];
`;

test(
  "from-spec on a lock protocol names every step that leads into the bug, not only the shortest trace",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(join(dir, "Lock.tla"), lockSpec);
    writeFileSync(join(dir, "Lock.cfg"), "SPECIFICATION Spec\nINVARIANT MutualExclusion\n");
    writeFileSync(join(dir, "Lock.map.mjs"), lockMap);
    const r = node(
      "statechart.mjs",
      ["from-spec", "Lock.tla", "--expect-broken", "MutualExclusion"],
      dir,
    );
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const story = `## 1. A in the critical section, B in the critical section

Rule broken: Two processes are never in the critical section at once.
In the model, 2 different steps lead into this bug: "A takes the lock" and "B takes the lock". The steps below are the shortest path that TLC found.

0. Start: A outside, B outside
1. A checks the lock. Now: A saw the lock free, B outside
2. B checks the lock. Now: A saw the lock free, B saw the lock free
3. A takes the lock. Now: A in the critical section, B saw the lock free
4. B takes the lock. Now: A in the critical section, B in the critical section
`;
    assert.equal(
      r.stdout,
      `TLC on Lock.tla with Lock.cfg:
  MutualExclusion is broken (expected).
  TLC ran 3 times in N s.

Chart: 9 states and 18 transitions from 13 model states.
8 work, 1 breaks a rule.

${story}
Broken as expected: MutualExclusion.

Wrote chart.mmd, bug-1.mmd, stories.md, summary.json in Lock-statechart.
`,
    );
    const out = join(dir, "Lock-statechart");
    assert.equal(readFileSync(join(out, "stories.md"), "utf8"), story);
    const [bug] = JSON.parse(readFileSync(join(out, "summary.json"), "utf8")).classes;
    assert.equal(bug.counterexamples, 1);
    assert.deepEqual(bug.lastSteps, ["A takes the lock", "B takes the lock"]);
    assert.equal(bug.startsHere, false);
  },
);

const counterMap = (steps) =>
  `export const state = (v) => \`The counter shows \${v.x}\`;\nexport const step = (a) => (${JSON.stringify(steps)})[a] ?? "the counter moves";\n`;

test(
  "a story does not count the steps into a bug when TLC names them only after the whole next-state action",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(
      join(dir, "Jump.tla"),
      `---- MODULE Jump ----
VARIABLE x
Init == x = 0
Next ==
  \\/ x = 0 /\\ x' = 1
  \\/ x = 1 /\\ x' = 3
  \\/ x = 0 /\\ x' = 3
Spec == Init /\\ [][Next]_x
\\* The counter never shows 3.
NotThree == x # 3
====
`,
    );
    writeFileSync(join(dir, "Jump.cfg"), "SPECIFICATION Spec\nINVARIANT NotThree\n");
    writeFileSync(join(dir, "Jump.map.mjs"), counterMap({}));
    const r = node("statechart.mjs", ["from-spec", "Jump.tla", "--expect-broken", "NotThree"], dir);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(
      r.stderr,
      /^Jump\.tla: 3 steps have the name Next, the whole next-state action\./m,
    );
    assert.equal(
      readFileSync(join(dir, "Jump-statechart", "stories.md"), "utf8"),
      `## 1. The counter shows 3

Rule broken: The counter never shows 3.
In the model, steps labeled "the counter moves" lead into this bug. TLC names them Next, the whole next-state action, so the story cannot count them. The steps below are the shortest path that TLC found.

0. Start: The counter shows 0
1. The counter moves. Now: The counter shows 3
`,
    );
  },
);

test(
  "a story says its path is the shortest only when more than one step leads into the bug",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(
      join(dir, "Skip.tla"),
      `---- MODULE Skip ----
EXTENDS Naturals
VARIABLE x
Init == x = 0
Up == x < 2 /\\ x' = x + 1
Skip == x = 0 /\\ x' = 2
Spec == Init /\\ [][Up \\/ Skip]_x
\\* The counter never shows 1.
NotOne == x # 1
\\* The counter never shows 2.
NotTwo == x # 2
====
`,
    );
    writeFileSync(
      join(dir, "Skip.cfg"),
      "SPECIFICATION Spec\nINVARIANT NotOne\nINVARIANT NotTwo\n",
    );
    writeFileSync(join(dir, "Skip.map.mjs"), counterMap({}));
    const r = node(
      "statechart.mjs",
      ["from-spec", "Skip.tla", "--expect-broken", "NotOne,NotTwo"],
      dir,
    );
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.equal(
      readFileSync(join(dir, "Skip-statechart", "stories.md"), "utf8"),
      `## 1. The counter shows 1

Rule broken: The counter never shows 1.
In the model, one step leads into this bug: "the counter moves".

0. Start: The counter shows 0
1. The counter moves. Now: The counter shows 1

## 2. The counter shows 2

Rule broken: The counter never shows 2.
In the model, one step leads into this bug: "the counter moves". The steps below are the shortest path that TLC found.

0. Start: The counter shows 0
1. The counter moves. Now: The counter shows 2
`,
    );
  },
);

test(
  "a story says which step into the bug keeps the state, so that no chart draws it",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(
      join(dir, "Panel.tla"),
      `---- MODULE Panel ----
VARIABLES panel, saved
vars == <<panel, saved>>
Init == panel = "closed" /\\ saved = TRUE
Open == panel = "closed" /\\ panel' = "open" /\\ UNCHANGED saved
Close == panel = "open" /\\ panel' = "closed" /\\ UNCHANGED saved
Lose == panel = "open" /\\ saved /\\ saved' = FALSE /\\ UNCHANGED panel
Pop == panel = "closed" /\\ saved /\\ panel' = "open" /\\ saved' = FALSE
Spec == Init /\\ [][Open \\/ Close \\/ Lose \\/ Pop]_vars
\\* The note is never lost.
NeverLost == saved
====
`,
    );
    writeFileSync(join(dir, "Panel.cfg"), "SPECIFICATION Spec\nINVARIANT NeverLost\n");
    writeFileSync(
      join(dir, "Panel.map.mjs"),
      'export const state = (v) => `The panel is ${v.panel}`;\nexport const step = (a) => ({ Open: "you open the panel", Close: "you close the panel", Lose: "the note is lost", Pop: "the panel pops open" })[a];\n',
    );
    const r = node(
      "statechart.mjs",
      ["from-spec", "Panel.tla", "--expect-broken", "NeverLost"],
      dir,
    );
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const out = join(dir, "Panel-statechart");
    assert.match(
      readFileSync(join(out, "stories.md"), "utf8"),
      /^In the model, 2 different steps lead into this bug: "the note is lost" \(the state stays the same\) and "the panel pops open"\. The steps below are the shortest path that TLC found\.\n\n0\. Start: The panel is closed\n1\. The panel pops open\. Now: The panel is open\n$/m,
    );
    for (const chart of readdirSync(out).filter((f) => f.endsWith(".mmd")))
      assert.doesNotMatch(readFileSync(join(out, chart), "utf8"), /the note is lost/, chart);
  },
);

test(
  "--png exits 2 unless every chart renders, even with --expect-broken, and keeps the files it wrote",
  { skip: needsTlc.skip || needsPng.skip },
  () => {
    const args = [
      "from-chart",
      "sync.mmd",
      "--expect-broken",
      "NeverSyncedWhileOffline",
      "--title",
      "Sync",
      "--png",
    ];
    const titles = { chart: "Sync", "bug-1": "Sync, bug 1" };
    const xdg = fakeRenderer();
    for (const [unrendered, status, written] of [
      [["chart", "bug-1"], 2, ["chart.mmd", "bug-1.mmd"]],
      [["bug-1"], 2, ["chart.mmd", "bug-1.mmd", "chart.png"]],
      [[], 0, ["chart.mmd", "bug-1.mmd", "chart.png", "bug-1.png"]],
    ]) {
      const dir = mkdtempSync(join(tmpdir(), "statechart-"));
      writeFileSync(join(dir, "sync.mmd"), fixture("sync.mmd"));
      const rendered = join(dir, "rendered");
      const r = node("statechart.mjs", args, dir, {
        XDG_CACHE_HOME: xdg,
        TLA2TOOLS: tools.jar,
        JAVA: tools.java,
        RENDERED: rendered,
        UNRENDERED: unrendered.map((c) => titles[c]).join("|"),
      });
      assert.equal(r.status, status, `${unrendered}: ${r.stdout}${r.stderr}`);
      assert.equal(
        r.stderr,
        unrendered
          .map((c) => `could not render Sync-statechart/${c}.mmd: Pele cannot lay out this chart\n`)
          .join(""),
      );
      assert.deepEqual(
        readFileSync(rendered, "utf8").split("\n").filter(Boolean),
        ["Sync", "Sync, bug 1"],
        "tries every chart",
      );
      assert.match(r.stdout, /\nBroken as expected: NeverSyncedWhileOffline\.\n/);
      assert.equal(
        r.stdout.split("\n").at(-2),
        `Wrote ${[...written, "stories.md", "summary.json"].join(", ")} in Sync-statechart.`,
      );
      const out = join(dir, "Sync-statechart");
      assert.deepEqual(
        readdirSync(out).sort(),
        [...written, "stories.md", "summary.json", "tlc"].sort(),
      );
      for (const png of written.filter((f) => f.endsWith(".png")))
        assert.ok(decodePng(readFileSync(join(out, png))).width > 0, png);
    }
  },
);

const SOURCE = fixture("regions.mmd");
const SOURCE_LINES = [...SOURCE.matchAll(/state "([^"]+)" as|--> \w+ : (.+)$/gm)]
  .flatMap((m) => (m[1] ?? m[2]).split("<br/>"))
  .sort();
const drawnLines = (svg) =>
  labeledBoxes(svg)
    .flatMap((b) => b.lines)
    .sort();

function rectOf(svg, id) {
  const [ox, oy] = /<g transform="translate\(([\d.-]+),([\d.-]+)\)">/
    .exec(svg)
    .slice(1)
    .map(Number);
  const [tx, ty, x, y, w, h] = new RegExp(
    `data-id="${id}"(?: transform="translate\\(([\\d.-]+),([\\d.-]+)\\)")?><rect x="([\\d.-]+)" y="([\\d.-]+)" width="([\\d.]+)" height="([\\d.]+)"`,
  )
    .exec(svg)
    .slice(1)
    .map((v) => +(v ?? 0));
  const [left, top] = [ox + tx + x, oy + ty + y];
  return { left, top, right: left + w, bottom: top + h };
}

test(
  "render writes a PNG at twice the chart's size, next to the chart or at --out",
  needsPng,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(join(dir, "regions.mmd"), SOURCE);
    writeFileSync(join(dir, "regions.txt"), SOURCE);
    for (const [args, file, theme] of [
      [["regions.mmd"], "regions.png", "light"],
      [["regions.txt"], "regions.txt.png", "light"],
      ...Object.keys(THEMES).map((t) => [
        ["regions.mmd", "--theme", t, "--out", join("new", t, "chart.png")],
        join("new", t, "chart.png"),
        t,
      ]),
    ]) {
      const r = node("statechart.mjs", ["render", ...args], dir);
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.stderr, "");
      assert.equal(r.stdout, `Wrote ${file}.\n`);
      const chart = renderChart(lib, SOURCE, { theme: THEMES[theme] });
      const png = decodePng(readFileSync(join(dir, file)));
      assert.deepEqual([png.width, png.height], [2 * chart.width, 2 * chart.height], file);
      assert.equal(png.pixel(0, 0), THEMES[theme].background, file);
    }
  },
);

test(
  "a chart too big to draw at twice its size draws at about 100 million pixels",
  needsPng,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    const steps = Array.from({ length: 60 }, (_, i) =>
      [0, 1, 2].map((k) => `  s${i} --> s${(i * 7 + k * 13 + 1) % 60} : e${i}x${k}`),
    ).flat();
    const src = `stateDiagram-v2\n  [*] --> s0\n${steps.join("\n")}\n`;
    writeFileSync(join(dir, "c.mmd"), src);
    const chart = renderChart(lib, src);
    assert.ok(4 * chart.width * chart.height > 1.2e8, `${chart.width}x${chart.height}`);
    const r = node("statechart.mjs", ["render", "c.mmd"], dir);
    assert.equal(r.status, 0, r.stderr);
    const png = readFileSync(join(dir, "c.png"));
    const pixels = png.readUInt32BE(16) * png.readUInt32BE(20);
    assert.ok(pixels > 0.99e8 && pixels < 1.001e8, `${pixels} pixels`);
  },
);

test(
  "a PNG fills a state with its theme's group color, and a state that breaks a rule with the theme's wrong fill and border",
  needsPng,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(join(dir, "regions.mmd"), SOURCE);
    const chartFill = /classDef group0 fill:(#\w{6})/.exec(SOURCE)[1];
    for (const name of [undefined, ...Object.keys(THEMES)]) {
      const theme = THEMES[name ?? "light"];
      const r = node(
        "statechart.mjs",
        ["render", "regions.mmd", ...(name ? ["--theme", name] : [])],
        dir,
      );
      assert.equal(r.status, 0, r.stderr);
      const png = decodePng(readFileSync(join(dir, "regions.png")));
      const { svg } = renderChart(lib, SOURCE, { theme });
      const inside = (box) => png.pixel(2 * (box.left + 8), box.top + box.bottom);
      const borderWidth = (box) => {
        const [x, y] = [2 * box.left, box.top + box.bottom];
        const ink = png.pixel(x, y);
        let n = 0;
        for (let i = x - 6; i <= x + 6; i++) if (png.pixel(i, y) === ink) n++;
        return n;
      };
      const wrong = rectOf(svg, "r1s3");
      const group = rectOf(svg, "r1s2");
      assert.equal(inside(wrong), theme.wrong.fill, `${name} wrong fill`);
      assert.equal(
        png.pixel(2 * wrong.left, wrong.top + wrong.bottom),
        theme.wrong.border,
        `${name} wrong border`,
      );
      assert.ok(
        borderWidth(wrong) >= 4 && borderWidth(group) <= 3,
        `${name} wrong border is ${borderWidth(wrong)}px and a group border ${borderWidth(group)}px at twice the chart's size`,
      );
      assert.equal(inside(group), theme.groups?.[0] ?? chartFill, `${name} group fill`);
    }
  },
);

test(
  "a PNG draws a state that breaks a rule in some cases, one reached only after a bug, and one that breaks a rule only with the fix, in its theme's colors",
  needsPng,
  () => {
    const source = [
      "stateDiagram-v2",
      ...STATUS_CLASSES.map((c) => `  ${c}`),
      ...["Mixed", "After", "Worse"].map((b) => `  ${groupClassDef("group0", "#d6eaf8", b)}`),
      '  state "Works" as w',
      '  state "Wrong in some cases" as m',
      '  state "Reached after a bug" as a',
      '  state "Wrong only with the fix" as o',
      '  state "Wrong in some cases, in a group" as gm',
      '  state "Reached after a bug, in a group" as ga',
      '  state "Wrong only with the fix, in a group" as go',
      "  [*] --> w",
      "  w --> m : one",
      "  m --> a : two",
      "  a --> o : five",
      "  w --> gm : three",
      "  gm --> ga : four",
      "  ga --> go : six",
      "  class w works",
      "  class m mixed",
      "  class a after",
      "  class o worse",
      "  class gm group0Mixed",
      "  class ga group0After",
      "  class go group0Worse",
      "",
    ].join("\n");
    for (const [name, theme] of Object.entries(THEMES)) {
      const { svg } = renderChart(lib, source, { theme });
      for (const [id, status] of [
        ["m", "mixed"],
        ["a", "after"],
        ["o", "worse"],
        ["gm", "mixed"],
        ["ga", "after"],
        ["go", "worse"],
      ]) {
        const [box, label] = new RegExp(
          `data-id="${id}"[^>]*><rect [^>]*style="([^"]*)"/><text [^>]*style="([^"]*)"`,
        )
          .exec(svg)
          .slice(1)
          .map((s) =>
            Object.fromEntries(
              s
                .split(";")
                .filter(Boolean)
                .map((d) => d.split(":")),
            ),
          );
        assert.deepEqual(
          [box.fill, box.stroke, label.fill],
          [theme[status]?.fill, theme[status]?.border, theme[status]?.text],
          `${name} ${id}`,
        );
      }
    }
  },
);

test("a PNG draws no edge over a group's title band", needsPng, () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  const source = fixture("band.mmd");
  writeFileSync(join(dir, "band.mmd"), source);
  for (const [name, theme] of Object.entries(THEMES)) {
    const r = node("statechart.mjs", ["render", "band.mmd", "--theme", name], dir);
    assert.equal(r.status, 0, r.stderr);
    const png = decodePng(readFileSync(join(dir, "band.png")));
    const { svg } = renderChart(lib, source, { theme });
    const group = rectOf(svg, "G");
    const [rectY, dividerY] =
      /data-id="G"><rect x="[\d.-]+" y="([\d.-]+)"[^>]*\/><path d="M[\d.-]+,([\d.-]+)H/
        .exec(svg)
        .slice(1)
        .map(Number);
    const divider = group.top + dividerY - rectY;
    const fill = png.pixel(2 * (group.left + 4), group.top + divider);
    const columns = [];
    for (let x = Math.ceil(2 * group.left) + 4; x < 2 * group.right - 4; x++)
      if (png.pixel(x, 2 * (divider + 4)) === theme.edge) columns.push(x);
    assert.ok(columns.length, `${name} draws an edge into the group below its band`);
    for (const x of columns)
      for (let y = Math.ceil(2 * group.top) + 4; y < 2 * divider - 4; y++)
        assert.equal(png.pixel(x, y), fill, `${name} title band at column ${x}, row ${y}`);
  }
});

const fonts = ["DejaVu Sans", "Liberation Sans", "Noto Sans", "Inter"].filter(
  (f) => fcMatch(f)?.name === f,
);
const type1 = ["Nimbus Sans Narrow", "Nimbus Sans", "URW Gothic"].find((f) =>
  /\.(pfb|pfa|t1)$/.test(fcMatch(f)?.file ?? ""),
);
const fcFile = (pattern) =>
  spawnSync("fc-list", [pattern, "file"], { encoding: "utf8" }).stdout?.match(/^(.+): $/m)?.[1];
const type1Styles = [
  "Nimbus Sans:style=Regular:fontformat=CFF",
  "Nimbus Sans:style=Bold:fontformat=Type 1",
  "Nimbus Sans:style=Italic:fontformat=Type 1",
].map(fcFile);
test(
  "each label fits its box in the font it is drawn in, and a wider font gets a wider wrap, so lines break where the chart breaks them",
  {
    skip:
      needsPng.skip ||
      (fonts.length < 2 && "needs two of DejaVu Sans, Liberation Sans, Noto Sans, and Inter"),
  },
  () => {
    const runs = fonts.map((font) => {
      const measure = fontMeasurer(lib.Resvg, font);
      const chart = renderChart(lib, SOURCE, { systemFont: font });
      for (const { kind, id, box, size, lines } of labeledBoxes(chart.svg))
        for (const line of lines)
          assert.ok(
            measure.width(line, size) <= box,
            `${font}: ${kind} ${id} "${line}" fits ${box}`,
          );
      assert.deepEqual(
        drawnLines(chart.svg),
        SOURCE_LINES,
        `${font} breaks lines as the chart does`,
      );
      return {
        font,
        wrap: chart.wrap,
        ink: SOURCE_LINES.reduce((s, l) => s + measure.width(l, 16), 0),
      };
    });
    runs.sort((a, b) => a.ink - b.ink);
    const [narrow, wide] = [runs[0], runs.at(-1)];
    assert.ok(
      wide.wrap > narrow.wrap,
      `${wide.font} wraps at ${wide.wrap}, ${narrow.font} at ${narrow.wrap}`,
    );
  },
);

test(
  "a font that resvg cannot read keeps Pele's widths, so the chart keeps every label",
  { skip: needsPng.skip || (!type1 && "cannot find a Type 1 font") },
  () => {
    assert.deepEqual(drawnLines(renderChart(lib, SOURCE, { systemFont: type1 }).svg), SOURCE_LINES);
  },
);

test(
  "a bold or italic face that resvg cannot read is measured in its regular face, so the chart keeps every label",
  {
    skip:
      needsPng.skip ||
      (!type1Styles.every(Boolean) &&
        "needs Nimbus Sans with an OpenType regular face and Type 1 bold and italic faces"),
  },
  () => {
    const dir = mkdtempSync(join(tmpdir(), "fontconfig-"));
    for (const file of type1Styles) symlinkSync(file, join(dir, basename(file)));
    writeFileSync(
      join(dir, "fonts.conf"),
      `<fontconfig><dir>${dir}</dir><cachedir>${dir}</cachedir></fontconfig>`,
    );
    const styled = SOURCE.replace(/(--> \w+ : )(.+)$/m, "$1<b>$2</b>").replace(
      /(--> \w+ : )([^<].*)$/m,
      "$1<i>$2</i>",
    );
    const run = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `import { loadRenderer, renderChart } from ${JSON.stringify(pathToFileURL(join(scripts, "render.mjs")).href)};
process.stdout.write(renderChart(await loadRenderer(), ${JSON.stringify(styled)}, { systemFont: "Nimbus Sans" }).svg);`,
      ],
      { encoding: "utf8", env: { ...process.env, FONTCONFIG_FILE: join(dir, "fonts.conf") } },
    );
    assert.equal(run.status, 0, run.stderr);
    assert.deepEqual(drawnLines(run.stdout), SOURCE_LINES);
  },
);

test("a PNG puts parallel regions side by side and the legend above them", needsPng, () => {
  const { svg } = renderChart(lib, SOURCE);
  const [parcel, payment, legend, regions] = ["region0", "region1", "legend", "regions"].map((id) =>
    rectOf(svg, id),
  );
  assert.ok(parcel.top < payment.bottom && payment.top < parcel.bottom, "the regions share rows");
  assert.ok(parcel.right <= payment.left, "the regions do not share columns");
  assert.ok(legend.bottom <= regions.top, "the legend is above the regions");
});

test("a renderer that npm cannot install exits 2 and writes nothing", () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(join(dir, "c.mmd"), SOURCE);
  writeFileSync(join(dir, "sync.mmd"), fixture("sync.mmd"));
  const xdg = mkdtempSync(join(tmpdir(), "xdg-"));
  const env = {
    XDG_CACHE_HOME: xdg,
    npm_config_cache: mkdtempSync(join(tmpdir(), "npm-")),
    npm_config_offline: "true",
  };
  for (const args of [
    ["render", "c.mmd"],
    ["from-chart", "sync.mmd", "--png"],
  ]) {
    const r = node("statechart.mjs", args, dir, env);
    assert.equal(r.status, 2, `${args}: ${r.stdout}${r.stderr}`);
    assert.equal(r.stdout, "");
    assert.ok(
      r.stderr.startsWith(
        `Installing pele@1.8.0 and @resvg/resvg-js@2.6.2 with npm in ${join(xdg, "statechart", CACHE_NAME)}. This happens once.\n`,
      ),
      r.stderr,
    );
    assert.match(
      r.stderr,
      /\ncannot install pele@1\.8\.0 and @resvg\/resvg-js@2\.6\.2 with npm:\n/,
    );
    assert.deepEqual(readdirSync(dir).sort(), ["c.mmd", "sync.mmd"]);
    assert.deepEqual(readdirSync(join(xdg, "statechart")), []);
  }
});

test("a renderer that cannot load exits 2, names its folder, and says to delete it", () => {
  const xdg = mkdtempSync(join(tmpdir(), "xdg-"));
  const cache = join(xdg, "statechart", CACHE_NAME);
  mkdirSync(cache, { recursive: true });
  writeFileSync(join(cache, "entry.mjs"), 'export { render } from "no-such-package";\n');
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(join(dir, "c.mmd"), SOURCE);
  const r = node("statechart.mjs", ["render", "c.mmd"], dir, { XDG_CACHE_HOME: xdg });
  assert.equal(r.status, 2);
  assert.equal(r.stdout, "");
  assert.ok(r.stderr.startsWith(`cannot load Pele and resvg from ${cache}: `), r.stderr);
  assert.ok(r.stderr.endsWith("\nDelete that folder to install them again.\n"), r.stderr);
  assert.deepEqual(readdirSync(dir), ["c.mmd"]);
});

test("a chart too long for Pele exits 2, writes no PNG, and says how to get one", needsPng, () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  const lines = Array.from({ length: 3000 }, (_, i) => `  s${i} --> s${i + 1} : step ${i}`);
  writeFileSync(join(dir, "c.mmd"), `stateDiagram-v2\n${lines.join("\n")}\n`);
  const r = node("statechart.mjs", ["render", "c.mmd"], dir);
  assert.equal(r.status, 2);
  assert.equal(r.stdout, "");
  assert.ok(r.stderr.startsWith("could not render c.mmd: "), r.stderr);
  assert.ok(
    r.stderr.endsWith(
      " The chart is too big for one PNG, and the .mmd file still has all of it. A chart with fewer states fits. Run node statechart.mjs from-spec SPEC.tla --cover --png to draw a smaller overview of the spec.\n",
    ),
    r.stderr,
  );
  assert.deepEqual(readdirSync(dir), ["c.mmd"]);
});

const pay = (name, charge) => `---- MODULE ${name} ----
EXTENDS Naturals
VARIABLES screen, charges
vars == <<screen, charges>>
Init == screen = "Cart" /\\ charges = 0
Pay == screen = "Cart" /\\ screen' = "Paying" /\\ UNCHANGED charges
Charge == ${charge}
Refund == charges = 2 /\\ charges' = 1 /\\ screen' = "Refunded"
Next == Pay \\/ Charge \\/ Refund
Spec == Init /\\ [][Next]_vars
NoDoubleCharge == charges <= 1
====
`;
const payMap = `export const readerActions = ["Pay"];
export const state = (v) => v.screen + ["", ", charged", ", charged twice"][v.charges];
export const step = (action) => ({ Pay: "you pay", Charge: "the bank charges you", Refund: "the bank refunds you" })[action] ?? "";
export const cause = () => "each charge request charges again";
`;

test(
  "from-spec checks each PROPERTY in its own TLC run, and names the counterexample of a broken one",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(
      join(dir, "Pay.tla"),
      pay("Pay", `screen = "Paying" /\\ charges = 0 /\\ charges' = 1 /\\ UNCHANGED screen`).replace(
        "====",
        'ChargedAtMostOnce == [](charges <= 1)\nEventuallyPaying == <>(screen = "Paying")\n====',
      ),
    );
    writeFileSync(
      join(dir, "Pay.cfg"),
      "SPECIFICATION Spec\nINVARIANT NoDoubleCharge\nPROPERTIES ChargedAtMostOnce EventuallyPaying\n",
    );
    writeFileSync(join(dir, "Pay.map.mjs"), payMap);
    const r = node("statechart.mjs", ["from-spec", "Pay.tla"], dir);
    assert.equal(r.status, 1, r.stderr);
    assert.equal(
      r.stdout.split("\n\n")[0],
      `TLC on Pay.tla with Pay.cfg:
  NoDoubleCharge holds.
  ChargedAtMostOnce holds.
  EventuallyPaying is broken. The chart draws only INVARIANT rules, so read TLC's counterexample in ${join("Pay-statechart", "tlc", "Pay-EventuallyPaying.out")}.
  TLC ran 4 times in N s.`,
    );
    const stories = `## Broken rules that the chart does not draw

Rule broken: \`EventuallyPaying\`. The run stops in "Cart" forever. TLC's counterexample is in ${join("tlc", "Pay-EventuallyPaying.out")}.
`;
    assert.ok(r.stdout.includes(`\nNo state breaks an INVARIANT rule.\n\n${stories}`), r.stdout);
    const tlcDir = join(dir, "Pay-statechart", "tlc");
    assert.match(
      readFileSync(join(tlcDir, "Pay-EventuallyPaying.out"), "utf8"),
      /^Error: Temporal properties were violated\./m,
    );
    assert.deepEqual(
      readdirSync(tlcDir)
        .filter((f) => f.endsWith(".cfg") && /PROPERT/.test(readFileSync(join(tlcDir, f), "utf8")))
        .sort(),
      ["Pay-ChargedAtMostOnce.cfg", "Pay-EventuallyPaying.cfg"],
    );
    const expected = node(
      "statechart.mjs",
      ["from-spec", "Pay.tla", "--expect-broken", "EventuallyPaying"],
      dir,
    );
    assert.equal(expected.status, 0, expected.stderr);
    assert.match(expected.stdout, /\n {2}EventuallyPaying is broken \(expected\)\. /);
  },
);

test(
  "from-spec names the reader states that a broken PROPERTY's counterexample loops through, without a state twice in a row and without the states before the loop",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(
      join(dir, "Bell.tla"),
      `---- MODULE Bell ----
VARIABLES door, bell, knocked
vars == <<door, bell, knocked>>
Init == door = "closed" /\\ bell = "off" /\\ knocked = FALSE
SwitchOn == bell = "off" /\\ bell' = "quiet" /\\ UNCHANGED <<door, knocked>>
Knock == bell = "quiet" /\\ ~knocked /\\ knocked' = TRUE /\\ UNCHANGED <<door, bell>>
Ring == knocked /\\ bell' = "ringing" /\\ knocked' = FALSE /\\ UNCHANGED door
Hush == bell = "ringing" /\\ bell' = "quiet" /\\ UNCHANGED <<door, knocked>>
Open == bell = "ringing" /\\ door' = "open" /\\ UNCHANGED <<bell, knocked>>
Spec == Init /\\ [][SwitchOn \\/ Knock \\/ Ring \\/ Hush \\/ Open]_vars /\\ WF_vars(SwitchOn \\/ Knock \\/ Ring \\/ Hush)
EventuallyOpen == <>(door = "open")
====
`,
    );
    writeFileSync(join(dir, "Bell.cfg"), "SPECIFICATION Spec\nPROPERTY EventuallyOpen\n");
    writeFileSync(
      join(dir, "Bell.map.mjs"),
      `export const readerActions = ["Open"];
export const state = (v, facts) => v.door === "open" ? "Door open" : v.bell === "off" ? "Bell off" : facts.enabled.has("Hush") ? "Bell ringing" : "Waiting";
export const step = (action) => action;
`,
    );
    const r = node(
      "statechart.mjs",
      ["from-spec", "Bell.tla", "--expect-broken", "EventuallyOpen"],
      dir,
    );
    assert.equal(r.status, 0, r.stderr);
    const out = join(dir, "Bell-statechart");
    assert.match(
      readFileSync(join(out, "tlc", "Bell-EventuallyOpen.out"), "utf8"),
      /^Back to state 2: /m,
    );
    const stories = `## Broken rules that the chart does not draw

Rule broken: \`EventuallyOpen\`. The run loops through "Waiting" and "Bell ringing" forever. TLC's counterexample is in ${join("tlc", "Bell-EventuallyOpen.out")}.
`;
    assert.ok(r.stdout.includes(`\nNo state breaks an INVARIANT rule.\n\n${stories}`), r.stdout);
    assert.deepEqual(
      JSON.parse(readFileSync(join(out, "summary.json"), "utf8")).brokenProperties[0].repeats,
      { states: ["Waiting", "Bell ringing"], stutters: false },
    );
  },
);

test(
  "from-spec checks a rule that the config lists as both PROPERTY and INVARIANT once, as the INVARIANT, and charts its bug",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(
      join(dir, "Pay.tla"),
      pay(
        "Pay",
        `screen = "Paying" /\\ charges < 2 /\\ charges' = charges + 1 /\\ UNCHANGED screen`,
      ),
    );
    writeFileSync(
      join(dir, "Pay.cfg"),
      "SPECIFICATION Spec\nPROPERTY NoDoubleCharge\nINVARIANT NoDoubleCharge\n",
    );
    writeFileSync(join(dir, "Pay.map.mjs"), payMap);
    const r = node("statechart.mjs", ["from-spec", "Pay.tla"], dir);
    assert.equal(r.status, 1, r.stderr);
    assert.equal(
      r.stdout.split("\n\n")[0],
      `TLC on Pay.tla with Pay.cfg:
  NoDoubleCharge is broken.
  TLC ran 3 times in N s.`,
    );
    assert.match(r.stdout, /\nRule broken: `NoDoubleCharge`\n/);
    assert.equal(
      r.stdout.split("\n").at(-2),
      "Wrote chart.mmd, bug-1.mmd, stories.md, summary.json in Pay-statechart.",
    );
    const unknown = node(
      "statechart.mjs",
      ["from-spec", "Pay.tla", "--expect-broken", "Nope"],
      dir,
    );
    assert.match(unknown.stderr, /, whose rules are NoDoubleCharge\.\n/);
  },
);

test("from-spec reports a broken PROPERTY in each form that TLC reports it in", needsTlc, () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(
    join(dir, "Pay.tla"),
    pay(
      "Pay",
      `screen = "Paying" /\\ charges < 2 /\\ charges' = charges + 1 /\\ UNCHANGED screen`,
    ).replace(
      "====",
      `ChargedAtMostOnce == [](charges <= 1)\nNeverChargedAgain == [][charges' <= 1]_charges\nStartsPaying == screen = "Paying"\nNeverTwiceNorRefunded == [](charges <= 1) /\\ [](screen # "Refunded")\nStartsPayingUncharged == screen = "Paying" /\\ charges = 0\n====`,
    ),
  );
  writeFileSync(
    join(dir, "Pay.cfg"),
    "SPECIFICATION Spec\nPROPERTIES ChargedAtMostOnce NeverChargedAgain StartsPaying NeverTwiceNorRefunded StartsPayingUncharged\n",
  );
  writeFileSync(join(dir, "Pay.map.mjs"), payMap);
  const r = node("statechart.mjs", ["from-spec", "Pay.tla"], dir);
  assert.equal(r.status, 1, r.stderr);
  const broken = (p) =>
    `  ${p} is broken. The chart draws only INVARIANT rules, so read TLC's counterexample in ${join("Pay-statechart", "tlc", `Pay-${p}.out`)}.`;
  const initialOnly = (p) =>
    ` TLC checked ${p} only in the initial states, because it has no [], <>, or ~>. List it as an INVARIANT to check every state.`;
  assert.equal(
    r.stdout.split("\n\n")[0],
    `TLC on Pay.tla with Pay.cfg:
  Pay.cfg has no INVARIANT, so the chart marks no state broken.
${broken("ChargedAtMostOnce")}
${broken("NeverChargedAgain")}
${broken("StartsPaying")}${initialOnly("StartsPaying")}
${broken("NeverTwiceNorRefunded")}
${broken("StartsPayingUncharged")}${initialOnly("StartsPayingUncharged")}
  TLC ran 6 times in N s.`,
  );
  const tlcDir = join(dir, "Pay-statechart", "tlc");
  assert.match(
    readFileSync(join(tlcDir, "Pay-NeverTwiceNorRefunded.out"), "utf8"),
    /^Error: Invariant line \d+, col \d+ to line \d+, col \d+ of module Pay is violated\.$/m,
  );
  assert.match(
    readFileSync(join(tlcDir, "Pay-StartsPayingUncharged.out"), "utf8"),
    /^Error: Property line \d+, col \d+ to line \d+, col \d+ of module Pay is violated by the initial state:$/m,
  );
});

test(
  "from-spec reports a broken refinement of an instanced module in its output, the stories, and the summary",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(
      join(dir, "TicketApi.tla"),
      `---- MODULE TicketApi ----
VARIABLE status
Init == status = "open"
Take == status = "open" /\\ status' = "taken"
Close == status = "taken" /\\ status' = "closed"
Spec == Init /\\ [][Take \\/ Close]_status
====
`,
    );
    writeFileSync(
      join(dir, "Desk.tla"),
      `---- MODULE Desk ----
VARIABLES phase, agent
vars == <<phase, agent>>
Init == phase = "open" /\\ agent = "none"
Assign == phase = "open" /\\ phase' = "taken" /\\ agent' = "ana"
Finish == phase = "taken" /\\ phase' = "closed" /\\ UNCHANGED agent
Drop == phase = "open" /\\ phase' = "closed" /\\ UNCHANGED agent
Spec == Init /\\ [][Assign \\/ Finish \\/ Drop]_vars
Known == phase \\in {"open", "taken", "closed"}
Api == INSTANCE TicketApi WITH status <- phase
\\* A ticket closes only after someone takes it.
ApiRefines == Api!Spec
StartsOpen == phase = "open"
====
`,
    );
    writeFileSync(
      join(dir, "Desk.cfg"),
      "SPECIFICATION Spec\nINVARIANT Known\nPROPERTIES ApiRefines StartsOpen\n",
    );
    writeFileSync(
      join(dir, "Desk.map.mjs"),
      `export const readerActions = [];
export const state = (v) => "Ticket " + v.phase;
export const step = (action) => ({ Assign: "an agent takes it", Finish: "the agent closes it", Drop: "it closes unassigned" })[action];
`,
    );
    const r = node(
      "statechart.mjs",
      ["from-spec", "Desk.tla", "--expect-broken", "ApiRefines"],
      dir,
    );
    assert.equal(r.status, 0, r.stderr);
    const out = join(dir, "Desk-statechart");
    assert.equal(
      r.stdout.split("\n\n")[0],
      `TLC on Desk.tla with Desk.cfg:
  Known holds.
  ApiRefines is broken (expected). The chart draws only INVARIANT rules, so read TLC's counterexample in ${join("Desk-statechart", "tlc", "Desk-ApiRefines.out")}.
  StartsOpen holds. TLC checked StartsOpen only in the initial states, because it has no [], <>, or ~>. List it as an INVARIANT to check every state.
  TLC ran 4 times in N s.`,
    );
    const stories = `## Broken rules that the chart does not draw

Rule broken: A ticket closes only after someone takes it. TLC's counterexample is in ${join("tlc", "Desk-ApiRefines.out")}.
`;
    assert.ok(r.stdout.includes(`\nNo state breaks an INVARIANT rule.\n\n${stories}`), r.stdout);
    assert.equal(readFileSync(join(out, "stories.md"), "utf8"), stories);
    assert.deepEqual(JSON.parse(readFileSync(join(out, "summary.json"), "utf8")).brokenProperties, [
      {
        spec: "Desk.tla",
        property: "ApiRefines",
        rule: "A ticket closes only after someone takes it.",
        repeats: null,
        counterexample: join("tlc", "Desk-ApiRefines.out"),
      },
    ]);
  },
);

test(
  "from-spec explains an invariant and a property that name rules of a named INSTANCE with substitutions in the instanced module's words",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(join(dir, "LampRules.tla"), lampRules);
    writeFileSync(
      join(dir, "Lamp.tla"),
      `---- MODULE Lamp ----
VARIABLES lamp, cable
Rules == INSTANCE LampRules WITH light <- lamp, wire <- cable
Safe == Rules!SafeLight
Sound ==
  Rules!NeverShorts
${lampSteps}`,
    );
    writeFileSync(join(dir, "Lamp.cfg"), "SPECIFICATION Spec\nINVARIANT Safe\nPROPERTIES Sound\n");
    writeFileSync(join(dir, "Lamp.map.mjs"), lampMap);
    const r = node(
      "statechart.mjs",
      ["from-spec", "Lamp.tla", "--expect-broken", "Safe", "--expect-broken", "Sound"],
      dir,
    );
    assert.equal(r.status, 0, r.stderr);
    const out = join(dir, "Lamp-statechart");
    const stories = readFileSync(join(out, "stories.md"), "utf8");
    assert.match(stories, /^Rule broken: The light never comes on over a shorted wire\.$/m);
    assert.match(stories, /^1\. The wire shorts\. Now: Off\n2\. You switch it on\. Now: On$/m);
    assert.ok(
      stories.includes(
        `\nRule broken: The wire never shorts. TLC's counterexample is in ${join("tlc", "Lamp-Sound.out")}.\n`,
      ),
      stories,
    );
    assert.deepEqual(
      JSON.parse(readFileSync(join(out, "summary.json"), "utf8")).brokenProperties.map(
        (b) => b.rule,
      ),
      ["The wire never shorts."],
    );
  },
);

test(
  "a state reached only after a bug gets its own color, and the fix edge leaves the state before the changed step",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    const cfg = "SPECIFICATION Spec\nINVARIANT NoDoubleCharge\n";
    writeFileSync(
      join(dir, "Pay.tla"),
      pay(
        "Pay",
        `screen = "Paying" /\\ charges < 2 /\\ charges' = charges + 1 /\\ UNCHANGED screen`,
      ),
    );
    writeFileSync(
      join(dir, "PayFixed.tla"),
      pay(
        "PayFixed",
        `screen = "Paying" /\\ charges < 2 /\\ IF charges = 0 THEN charges' = 1 /\\ UNCHANGED screen ELSE screen' = "Paid" /\\ UNCHANGED charges`,
      ),
    );
    writeFileSync(join(dir, "Pay.cfg"), cfg);
    writeFileSync(join(dir, "PayFixed.cfg"), cfg);
    writeFileSync(join(dir, "pay.map.mjs"), payMap);
    assert.match(tlc(dir, "Pay").stdout, /Invariant NoDoubleCharge is violated/);
    assert.doesNotMatch(tlc(dir, "PayFixed").stdout, /is violated/);

    const args = [
      "--dot",
      "Pay.dot",
      "--map",
      "pay.map.mjs",
      "--traces",
      "Pay.out",
      "--highlight",
      "0",
      "--out",
      "chart.mmd",
    ];
    assert.equal(node("tlc-to-chart.mjs", args, dir).status, 0);
    assert.deepEqual(statusOf(readFileSync(join(dir, "chart.mmd"), "utf8")), {
      Cart: "works",
      Paying: "works",
      "Paying, charged": "works",
      "Paying, charged twice": "wrong",
      "Refunded, charged": "after",
    });

    const withFix = [
      ...args,
      "--fixed-dot",
      "PayFixed.dot",
      "--fixed-traces",
      "PayFixed.out",
      "--fixed-rules",
      "NoDoubleCharge",
    ];
    assert.equal(node("tlc-to-chart.mjs", withFix, dir).status, 0);
    const chart = readFileSync(join(dir, "chart.mmd"), "utf8");
    assert.deepEqual(statusOf(chart), {
      Cart: "works",
      "Paid, charged": "fixed",
      Paying: "works",
      "Paying, charged": "works",
      "Paying, charged twice": "fixed",
      "Refunded, charged": "fixed",
    });
    assert.deepEqual(
      [...chart.matchAll(/^ {4}state "([^"]+)" as legend\w+$/gm)].map((m) => m[1]),
      ["Works today", "Fixed or new with the fix"],
    );
    assert.match(chart, /^stateDiagram-v2\n {2}%% second model \(fix\): the fix\n/m);
    const fixEdges = parseMermaid(chart).regions.Main.transitions.filter((t) =>
      t.label.startsWith("with the fix, "),
    );
    assert.deepEqual(
      fixEdges.map((t) => `${t.from} --> ${t.to} : ${t.label}`),
      ["Paying, charged --> Paid, charged : with the fix, the bank charges you"],
    );
  },
);

test(
  "a rule that the second model does not check reads not checked, and a rule it checks reads unchanged",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(
      join(dir, "Pay.tla"),
      pay(
        "Pay",
        `screen = "Paying" /\\ charges < 2 /\\ charges' = charges + 1 /\\ UNCHANGED screen`,
      ),
    );
    writeFileSync(join(dir, "Pay.cfg"), "SPECIFICATION Spec\nINVARIANT NoDoubleCharge\n");
    writeFileSync(join(dir, "pay.map.mjs"), payMap);
    assert.match(tlc(dir, "Pay").stdout, /Invariant NoDoubleCharge is violated/);
    const story = (...extra) => {
      const r = node(
        "tlc-to-chart.mjs",
        [
          ...["--dot", "Pay.dot", "--map", "pay.map.mjs", "--traces", "Pay.out"],
          ...["--against-dot", "Pay.dot", ...extra, "--story", "story.md", "--out", "chart.mmd"],
        ],
        dir,
      );
      assert.equal(r.status, 0, r.stderr);
      return readFileSync(join(dir, "story.md"), "utf8");
    };
    assert.match(
      story(),
      /^In the spec you see the same states and steps, but the spec does not check this rule\.$/m,
    );
    assert.match(
      story("--against-traces", "Pay.out", "--against-rules", "NoDoubleCharge"),
      /^In the spec you see the same states and steps, so the spec does not change this path\.$/m,
    );
  },
);

test(
  "from-spec writes a mapping to fill in, then draws each bug in every view the mapping has",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(
      join(dir, "Pay.tla"),
      pay(
        "Pay",
        `screen = "Paying" /\\ charges < 2 /\\ charges' = charges + 1 /\\ UNCHANGED screen`,
      ).replace("Next ==", 'Wait == screen = "Paying" /\\ UNCHANGED vars\nNext =='),
    );
    writeFileSync(
      join(dir, "Pay.cfg"),
      "SPECIFICATION Spec\n\\* The reader's rule.\nINVARIANTS\n  NoDoubleCharge\n",
    );
    const first = node("statechart.mjs", ["from-spec", "Pay.tla"], dir, {
      TLA2TOOLS: join(dir, "no-tlc.jar"),
    });
    assert.equal(first.status, 2);
    assert.equal(first.stdout, "");
    assert.equal(
      first.stderr,
      "Wrote Pay.map.mjs. Fill in its labels, then run this command again.\n",
    );
    const scaffold = readFileSync(join(dir, "Pay.map.mjs"), "utf8");
    assert.match(scaffold, /^\/\/ Variables: screen, charges\.$/m);
    assert.match(
      scaffold,
      /^const STEPS = \{\n\tCharge: "Charge",\n\tPay: "Pay",\n\tRefund: "Refund",\n\tWait: "Wait",\n\};$/m,
    );
    assert.equal(existsSync(join(dir, "Pay-statechart")), false);

    writeFileSync(
      join(dir, "Pay.map.mjs"),
      `${payMap}export const detail = (v) => \`charges = \${v.charges}\`;\n`,
    );
    const r = node("statechart.mjs", ["from-spec", "Pay.tla"], dir);
    assert.equal(r.status, 1, r.stderr);
    assert.equal(
      r.stdout,
      `TLC on Pay.tla with Pay.cfg:
  NoDoubleCharge is broken.
  TLC ran 3 times in N s.

Chart: 5 states and 4 transitions from 5 model states.
3 work, 1 breaks a rule, 1 reached only after a bug.

## 1. Paying, charged twice

Rule broken: \`NoDoubleCharge\`
Why: each charge request charges again.
In the model, one step leads into this bug: "the bank charges you".

0. Start: Cart
1. You pay. Now: Paying
2. The bank charges you. Now: Paying, charged
3. The bank charges you. Now: Paying, charged twice

Wrote chart.mmd, bug-1.mmd, bug-1-developer.mmd, bug-1-layered.mmd, stories.md, summary.json in Pay-statechart.
`,
    );
    assert.match(
      readFileSync(join(dir, "Pay-statechart", "bug-1-layered.mmd"), "utf8"),
      /state "Paying, charged twice" as g\d \{\n {4}state "charges = 2" as s\d\n/,
    );
    assert.deepEqual(readdirSync(join(dir, "Pay-statechart")).sort(), [
      "bug-1-developer.mmd",
      "bug-1-layered.mmd",
      "bug-1.mmd",
      "chart.mmd",
      "stories.md",
      "summary.json",
      "tlc",
    ]);
    assert.equal(
      readFileSync(join(dir, "Pay-statechart", "tlc", "Pay.cfg"), "utf8"),
      "SPECIFICATION Spec\nINVARIANT StatechartRules\n",
    );
    assert.equal(
      readFileSync(join(dir, "Pay-statechart", "tlc", "Pay-NoDoubleCharge.cfg"), "utf8"),
      "SPECIFICATION Spec\nINVARIANT NoDoubleCharge\nCONSTRAINT NoDoubleCharge\n",
    );
  },
);

test("a rule broken by a start state marks that state wrong", needsTlc, () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(
    join(dir, "Start.tla"),
    `---- MODULE Start ----
VARIABLES conn, badge
vars == <<conn, badge>>
Init == conn \\in {"Online", "Offline"} /\\ badge = "Synced"
Drop == conn = "Online" /\\ conn' = "Offline" /\\ badge' = "Waiting"
Next == Drop
Spec == Init /\\ [][Next]_vars
NeverSyncedWhileOffline == ~(conn = "Offline" /\\ badge = "Synced")
====
`,
  );
  writeFileSync(join(dir, "Start.cfg"), "SPECIFICATION Spec\nINVARIANT NeverSyncedWhileOffline\n");
  writeFileSync(
    join(dir, "start.map.mjs"),
    'export const state = (v) => `${v.conn} | ${v.badge}`;\nexport const step = () => "the network drops";\n',
  );
  assert.match(tlc(dir, "Start").stdout, /is violated by the initial state/);
  const args = [
    "--dot",
    "Start.dot",
    "--map",
    "start.map.mjs",
    "--traces",
    "Start.out",
    "--summary",
    "summary.json",
    "--out",
    "chart.mmd",
  ];
  const r = node("tlc-to-chart.mjs", args, dir);
  assert.equal(r.status, 0, r.stderr);
  const summary = JSON.parse(readFileSync(join(dir, "summary.json"), "utf8"));
  assert.deepEqual(
    summary.classes.map((c) => [c.end, c.readerSteps]),
    [["Offline | Synced", 0]],
  );
  assert.deepEqual(summary.chartStatus, { works: 2, wrong: 1, fixed: 0, mixed: 0, after: 0 });
});

test(
  "a screen that a clean path reaches is marked wrong in some cases when a state under it breaks a rule after a bug",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(
      join(dir, "Fork.tla"),
      `---- MODULE Fork ----
VARIABLE screen
Init == screen = "start"
Slip == screen = "start" /\\ screen' = "bad"
Go == screen = "start" /\\ screen' = "good"
Fall == screen = "bad" /\\ screen' = "worse"
Spec == Init /\\ [][Slip \\/ Go \\/ Fall]_screen
NeverBroken == screen \\notin {"bad", "worse"}
====
`,
    );
    writeFileSync(join(dir, "Fork.cfg"), "SPECIFICATION Spec\nINVARIANT NeverBroken\n");
    writeFileSync(
      join(dir, "Fork.map.mjs"),
      'export const state = (v) => ({ start: "Home", bad: "Error", good: "Done", worse: "Done" })[v.screen];\nexport const step = (a) => ({ Slip: "you slip", Go: "you go", Fall: "you fall" })[a];\n',
    );
    const r = node("statechart.mjs", ["from-spec", "Fork.tla"], dir);
    assert.equal(r.status, 1, r.stderr);
    const out = join(dir, "Fork-statechart");
    assert.deepEqual(statusOf(readFileSync(join(out, "chart.mmd"), "utf8")), {
      Done: "mixed",
      Error: "wrong",
      Home: "works",
    });
    const summary = JSON.parse(readFileSync(join(out, "summary.json"), "utf8"));
    assert.deepEqual(summary.chartStatus, { works: 1, wrong: 1, fixed: 0, mixed: 1, after: 0 });
    assert.deepEqual(summary.mixedStatus, ["Done"]);
    assert.match(
      r.stdout,
      /\n1 work, 1 breaks a rule, 1 breaks a rule in some cases\.\n\nThis state breaks a rule in some cases and not in others:\n {2}Done\n/,
    );
  },
);

test(
  "a bug that ends on the start screen's label marks that screen wrong in some cases, and a screen reached only after the bug gets its own color",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(
      join(dir, "Echo.tla"),
      `---- MODULE Echo ----
VARIABLE screen
Init == screen = "idle"
Lose == screen = "idle" /\\ screen' = "lost"
Leave == screen = "lost" /\\ screen' = "gone"
Spec == Init /\\ [][Lose \\/ Leave]_screen
NeverLost == screen # "lost"
====
`,
    );
    writeFileSync(join(dir, "Echo.cfg"), "SPECIFICATION Spec\nINVARIANT NeverLost\n");
    writeFileSync(
      join(dir, "Echo.map.mjs"),
      'export const state = (v) => (v.screen === "gone" ? "Away" : "Home");\nexport const step = (a) => ({ Lose: "the note is lost", Leave: "you leave" })[a];\n',
    );
    const r = node("statechart.mjs", ["from-spec", "Echo.tla"], dir);
    assert.equal(r.status, 1, r.stderr);
    const out = join(dir, "Echo-statechart");
    const chart = readFileSync(join(out, "chart.mmd"), "utf8");
    assert.deepEqual(statusOf(chart), { Away: "after", Home: "mixed" });
    assert.deepEqual(
      [...chart.matchAll(/^ {4}state "([^"]+)" as legend\w+$/gm)].map((m) => m[1]),
      ["Breaks a rule in some cases", "Reached only after a bug"],
    );
    const summary = JSON.parse(readFileSync(join(out, "summary.json"), "utf8"));
    assert.deepEqual(summary.chartStatus, { works: 0, wrong: 0, fixed: 0, mixed: 1, after: 1 });
    assert.deepEqual(summary.mixedStatus, ["Home"]);
  },
);

test(
  "a bug story numbers the step into the bug and each step that changes what the rule reads, and names the steps it hides",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(
      join(dir, "Reads.tla"),
      `---- MODULE Reads ----
EXTENDS Naturals
VARIABLES screen, reads, ticks
vars == <<screen, reads, ticks>>
Init == screen = "Idle" /\\ reads = 0 /\\ ticks = 0
Open == screen = "Idle" /\\ screen' = "Open" /\\ UNCHANGED <<reads, ticks>>
Read == screen = "Open" /\\ reads < 2 /\\ ticks = 2 * reads /\\ reads' = reads + 1 /\\ UNCHANGED <<screen, ticks>>
Tick == screen = "Open" /\\ ticks < 2 * reads /\\ ticks' = ticks + 1 /\\ UNCHANGED <<screen, reads>>
Spec == Init /\\ [][Open \\/ Read \\/ Tick]_vars
ReadOnce == reads <= 1
====
`,
    );
    writeFileSync(join(dir, "Reads.cfg"), "SPECIFICATION Spec\nINVARIANT ReadOnce\n");
    writeFileSync(
      join(dir, "reads.map.mjs"),
      'export const state = (v) => v.screen;\nexport const step = (a) => ({ Open: "you open the page", Read: "the page is read" })[a] ?? "";\n',
    );
    assert.match(tlc(dir, "Reads").stdout, /Invariant ReadOnce is violated/);
    const run = (...flags) => {
      const r = node(
        "tlc-to-chart.mjs",
        [
          ...["--dot", "Reads.dot", "--map", "reads.map.mjs", "--traces", "Reads.out", ...flags],
          ...["--story", "story.md", "--summary", "summary.json", "--out", "chart.mmd"],
        ],
        dir,
      );
      assert.equal(r.status, 0, r.stderr);
      const story = readFileSync(join(dir, "story.md"), "utf8");
      return {
        steps: story.slice(story.indexOf("0. Start")),
        readerSteps: JSON.parse(readFileSync(join(dir, "summary.json"), "utf8")).classes[0]
          .readerSteps,
        numbered: edges(parseMermaid(readFileSync(join(dir, "chart.mmd"), "utf8")).regions.Main),
      };
    };
    assert.deepEqual(run("--spec", "Reads.tla"), {
      steps: `0. Start: Idle
1. You open the page. Now: Open
2. The page is read. Now: Open
   (2 hidden steps: Tick)
3. The page is read. Now: Open
`,
      readerSteps: 3,
      numbered: ["Idle -> Open : 1. you open the page", "Open -> Open : 2, 3. the page is read"],
    });
    assert.equal(
      run().steps,
      `0. Start: Idle
1. You open the page. Now: Open
   (3 hidden steps: the page is read, Tick)
2. The page is read. Now: Open
`,
    );
  },
);

test(
  "a story of a bug that only the spec has numbers a step that changes what the spec's rule reads, skips the variables that the spec lacks, and a step that the spec lacks cannot happen in the spec",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(
      join(dir, "Code.tla"),
      `---- MODULE Code ----
VARIABLES s, cache
vars == <<s, cache>>
Init == s = "Idle" /\\ cache = "fresh"
Go == s = "Idle" /\\ s' = "Busy" /\\ UNCHANGED cache
Rot == s = "Busy" /\\ cache = "fresh" /\\ cache' = "stale" /\\ UNCHANGED s
Spec == Init /\\ [][Go \\/ Rot]_vars
NoStale == ~(s = "Busy" /\\ cache = "stale")
====
`,
    );
    writeFileSync(
      join(dir, "Agreed.tla"),
      `---- MODULE Agreed ----
VARIABLES s, n
vars == <<s, n>>
Init == s = "Idle" /\\ n = 0
Go == s = "Idle" /\\ s' = "Busy" /\\ UNCHANGED n
Tick == s = "Busy" /\\ n = 0 /\\ n' = 1 /\\ UNCHANGED s
Fail == s = "Busy" /\\ n = 1 /\\ s' = "Broken" /\\ UNCHANGED n
Spec == Init /\\ [][Go \\/ Tick \\/ Fail]_vars
NoStale == ~(s = "Broken" /\\ n = 1)
====
`,
    );
    for (const name of ["Code", "Agreed"])
      writeFileSync(join(dir, `${name}.cfg`), "SPECIFICATION Spec\nINVARIANT NoStale\n");
    writeFileSync(join(dir, "Code.map.mjs"), "export const state = (v) => v.s;\n");
    const r = node(
      "statechart.mjs",
      ["from-spec", "Code.tla", "--against", "Agreed.tla", "--expect-broken", "NoStale"],
      dir,
    );
    assert.equal(r.status, 0, r.stderr);
    const stories = readFileSync(join(dir, "Code-statechart", "stories.md"), "utf8");
    assert.match(
      stories,
      /^## 2\. Only in the spec: Broken\n[^#]*\n0\. Start: Idle\n1\. Go\. Now: Busy\n2\. Tick\. Now: Busy\n3\. Fail\. Now: Broken\n/m,
    );
    assert.match(
      stories,
      /^1\. Go\. Now: Busy\n2\. Rot\. Now: Busy\n\nIn the spec, step 2 \(Rot\) cannot happen, so you stay at: Busy\.\n/m,
    );
  },
);

const edit = (name, fixed) => `---- MODULE ${name} ----
VARIABLES s, flashed
vars == <<s, flashed>>
Init == s = "Idle" /\\ flashed = FALSE
Tap == s = "Idle" /\\ s' = "Saving" /\\ UNCHANGED flashed
Lose == s = "Saving" /\\ s' = "Lost edit" /\\ UNCHANGED flashed
Flash == s = "Saving" /\\ s' = "Flash" /\\ flashed' = ${fixed ? "TRUE" : "FALSE"}
Back == s \\in {"Lost edit", "Flash"} /\\ s' = "Idle" /\\ flashed' = FALSE
Next == Tap \\/ Flash \\/ Back${fixed ? "" : " \\/ Lose"}
Spec == Init /\\ [][Next]_vars
NoLostEdit == s # "Lost edit" /\\ ~(s = "Flash" /\\ flashed)
====
`;

test(
  "a bug that only the fixed model has is numbered after the current bugs and drawn as breaking a rule only with the fix",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    const cfg = "SPECIFICATION Spec\nINVARIANT NoLostEdit\n";
    for (const [name, fixed] of [
      ["Edit", false],
      ["EditFixed", true],
    ]) {
      writeFileSync(join(dir, `${name}.tla`), edit(name, fixed));
      writeFileSync(join(dir, `${name}.cfg`), cfg);
      assert.match(tlc(dir, name).stdout, /Invariant NoLostEdit is violated/);
    }
    writeFileSync(
      join(dir, "edit.map.mjs"),
      'export const readerActions = ["Tap"];\nexport const state = (v) => v.s;\nexport const step = (a) => ({ Tap: "you tap Save", Lose: "the save fails", Flash: "the screen flashes", Back: "you go back" })[a] ?? "";\n',
    );
    const args = [
      "--dot",
      "Edit.dot",
      "--map",
      "edit.map.mjs",
      "--traces",
      "Edit.out",
      "--fixed-dot",
      "EditFixed.dot",
      "--fixed-traces",
      "EditFixed.out",
      "--fixed-rules",
      "NoLostEdit",
    ];
    const r = node(
      "tlc-to-chart.mjs",
      [
        ...args,
        "--cover",
        "--highlight",
        "0",
        "--story",
        "story.md",
        "--summary",
        "summary.json",
        "--out",
        "chart.mmd",
      ],
      dir,
    );
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stderr, /1 bug\(s\), 1 new with the fix/);
    const summary = JSON.parse(readFileSync(join(dir, "summary.json"), "utf8"));
    assert.deepEqual(
      summary.classes.map((c) => [c.n, c.end, c.fix]),
      [
        [1, "Lost edit", "Saving"],
        [2, "Flash", "new with the fix"],
      ],
    );
    assert.deepEqual(summary.chartStatus, {
      works: 2,
      wrong: 0,
      fixed: 1,
      mixed: 0,
      after: 0,
      worse: 1,
    });
    assert.equal(statusOf(readFileSync(join(dir, "chart.mmd"), "utf8")).Flash, "worse");
    assert.match(readFileSync(join(dir, "story.md"), "utf8"), /^## 2\. New with the fix: Flash$/m);
    const two = node(
      "tlc-to-chart.mjs",
      [...args, "--highlight", "2", "--path-only", "--out", "bug2.mmd"],
      dir,
    );
    assert.equal(two.status, 0, two.stderr);
    assert.match(readFileSync(join(dir, "bug2.mmd"), "utf8"), /: 2\. the screen flashes\n/);
  },
);

test(
  "with --fixed, a state that breaks a rule only with the fix has its own status, legend line, and count",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    const counter = (name, leap) => `---- MODULE ${name} ----
EXTENDS Naturals
VARIABLE x
Init == x = 0
CountUp == x < 2 /\\ x' = x + 1
Leap == x \\in {1, 2} /\\ x' = 5
Spec == Init /\\ [][CountUp${leap ? " \\/ Leap" : ""}]_x
\\* The counter never shows five.
NotFive == x # 5
====
`;
    writeFileSync(join(dir, "Counter.tla"), counter("Counter", false));
    writeFileSync(join(dir, "CounterFixed.tla"), counter("CounterFixed", true));
    writeFileSync(join(dir, "Counter.cfg"), "SPECIFICATION Spec\nINVARIANT NotFive\n");
    writeFileSync(
      join(dir, "Counter.map.mjs"),
      `export const state = (v) => \`The counter shows \${v.x}\`;
export const step = (a) => ({ CountUp: "the counter goes up", Leap: "the counter leaps" })[a];
`,
    );
    const r = node(
      "statechart.mjs",
      ["from-spec", "Counter.tla", "--fixed", "CounterFixed.tla"],
      dir,
    );
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(
      r.stdout,
      /\n3 work today, 0 still wrong with the fix, 0 fixed or new with the fix, 1 breaks a rule only with the fix\.\n\n## 1\. New with the fix: The counter shows 5\n/,
    );
    const out = join(dir, "Counter-statechart");
    const chart = readFileSync(join(out, "chart.mmd"), "utf8");
    assert.equal(statusOf(chart)["The counter shows 5"], "worse");
    assert.deepEqual(
      [...chart.matchAll(/^ {4}state "([^"]+)" as legend\w+$/gm)].map((m) => m[1]),
      ["Works today", "Breaks a rule only with the fix"],
    );
    assert.deepEqual(JSON.parse(readFileSync(join(out, "summary.json"), "utf8")).chartStatus, {
      works: 3,
      wrong: 0,
      fixed: 0,
      mixed: 0,
      after: 0,
      worse: 1,
    });
  },
);

test(
  "only --cover trims the overview, and it lists what it leaves out and counts every state",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(
      join(dir, "Route.tla"),
      `---- MODULE Route ----
VARIABLE x
Init == x = "start"
Side == x = "start" /\\ x' = "porch"
Front == x = "start" /\\ x' = "hall"
Arrive == x = "porch" /\\ x' = "attic"
Leave == x = "attic" /\\ x' = "start"
Spec == Init /\\ [][Side \\/ Front \\/ Arrive \\/ Leave]_x
NoPorch == x # "porch"
====
`,
    );
    writeFileSync(join(dir, "Route.cfg"), "SPECIFICATION Spec\nINVARIANT NoPorch\n");
    const mapping = (readerActions) =>
      `export const readerActions = ${JSON.stringify(readerActions)};
export const state = (v) => v.x;
export const step = (a) => ({ Side: "you take the side door", Front: "you take the front door", Arrive: "you climb the stairs", Leave: "the lights go out" })[a];
`;
    writeFileSync(join(dir, "Route.map.mjs"), mapping(["Side", "Front", "Arrive"]));
    writeFileSync(join(dir, "nobody.map.mjs"), mapping(["Knock"]));
    const run = (out, ...flags) => {
      const r = node(
        "statechart.mjs",
        ["from-spec", "Route.tla", "--expect-broken", "NoPorch", "--out", out, ...flags],
        dir,
      );
      assert.equal(r.status, 0, r.stdout + r.stderr);
      return { r, summary: JSON.parse(readFileSync(join(dir, out, "summary.json"), "utf8")) };
    };

    const whole = run("whole");
    assert.equal(whole.summary.chartStates, 4);
    assert.equal(whole.summary.chartTransitions, 4);
    assert.deepEqual(whole.summary.chartStatus, {
      works: 2,
      wrong: 1,
      fixed: 0,
      mixed: 0,
      after: 1,
    });
    assert.equal(whole.summary.cover, undefined);
    assert.doesNotMatch(whole.r.stdout, /--cover/);

    const covered = run("covered", "--cover");
    assert.equal(covered.summary.chartStates, 3);
    assert.equal(covered.summary.chartTransitions, 2);
    assert.deepEqual(covered.summary.chartStatus, {
      works: 2,
      wrong: 1,
      fixed: 0,
      mixed: 0,
      after: 1,
    });
    assert.deepEqual(covered.summary.cover, {
      drawn: true,
      states: 4,
      transitions: 4,
      leftOutStates: ["attic"],
      leftOutTransitions: [
        "attic --> start: the lights go out",
        "porch --> attic: you climb the stairs",
      ],
    });
    assert.match(
      covered.r.stdout,
      /^--cover leaves out 1 of 4 states and 2 of 4 transitions\. The counts of states that work or break a rule include the states it leaves out\.\nStates left out:\n {2}attic\nTransitions left out:\n {2}attic --> start: the lights go out\n {2}porch --> attic: you climb the stairs\n2 work, 1 breaks a rule, 1 reached only after a bug\.$/m,
    );

    const none = run("none", "--cover", "--map", "nobody.map.mjs");
    assert.equal(none.summary.chartStates, 4);
    assert.equal(none.summary.chartTransitions, 4);
    assert.deepEqual(none.summary.cover, {
      drawn: false,
      why: "no step in TLC's graph is a reader action",
    });
    assert.match(
      none.r.stdout,
      /^--cover draws every state, because no step in TLC's graph is a reader action\.$/m,
    );
  },
);

function flatEdges(mmd) {
  const names = new Map();
  const members = new Map();
  let box = null;
  for (const line of mmd.split("\n")) {
    const opens = /^ {2}state "([^"]+)" as (g\d+) \{$/.exec(line);
    const state = /^ +state "([^"]+)" as (s\d+)$/.exec(line);
    const said = (s) => s.replaceAll("<br/>", " ");
    if (opens) {
      box = { id: opens[2], name: said(opens[1]) };
      members.set(box.id, []);
    } else if (line === "  }") box = null;
    else if (state) {
      names.set(state[2], box ? `${box.name}: ${said(state[1])}` : said(state[1]));
      if (box) members.get(box.id).push(state[2]);
    }
  }
  return [...mmd.matchAll(/^ {2}([gs]\d+) --> (s\d+) : (.*)$/gm)]
    .flatMap(([, from, to, label]) =>
      (members.get(from) ?? [from]).map((f) => `${names.get(f)} --> ${names.get(to)} : ${label}`),
    )
    .sort();
}

test(
  "states of one context sit in one box, and an arrow from the box's border stands for the same step from each",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(
      join(dir, "Window.tla"),
      `---- MODULE Window ----
VARIABLES where, reply
vars == <<where, reply>>
Init == where = "Starting" /\\ reply = "none"
Boot == where = "Starting" /\\ where' = "Chat open" /\\ UNCHANGED reply
Ask == where = "Chat open" /\\ reply = "none" /\\ reply' = "pending" /\\ UNCHANGED where
Answer == reply = "pending" /\\ reply' = "shown" /\\ UNCHANGED where
Close == where = "Chat open" /\\ where' = "Window closed" /\\ UNCHANGED reply
Open == where = "Window closed" /\\ where' = "Chat open" /\\ reply' = "none"
Next == Boot \\/ Ask \\/ Answer \\/ Close \\/ Open
Spec == Init /\\ [][Next]_vars
NoReplyWhileClosed == ~(where = "Window closed" /\\ reply = "shown")
====
`,
    );
    writeFileSync(join(dir, "Window.cfg"), "SPECIFICATION Spec\nINVARIANT NoReplyWhileClosed\n");
    writeFileSync(
      join(dir, "window.map.mjs"),
      `const R = { none: "no question", pending: "reply on its way", shown: "reply shown" };
export const state = (v) => \`\${v.where}: \${v.where === "Starting" ? "loading" : R[v.reply]}\`;
export const step = (a) => ({ Boot: "the app starts", Ask: "you ask", Answer: "the reply arrives", Close: "you close the window", Open: "you open the window" })[a];
`,
    );
    assert.match(tlc(dir, "Window").stdout, /Invariant NoReplyWhileClosed is violated/);
    const args = ["--dot", "Window.dot", "--map", "window.map.mjs", "--traces", "Window.out"];
    const draw = (extra, out) => {
      const r = node("tlc-to-chart.mjs", [...args, ...extra, "--out", out], dir);
      assert.equal(r.status, 0, r.stderr);
      return readFileSync(join(dir, out), "utf8");
    };
    const boxed = draw([], "boxed.mmd");
    const flat = draw(["--flat"], "flat.mmd");

    assert.match(
      boxed,
      /^ {2}state "Chat open" as g0 \{\n {4}state "no question" as s0\n {4}state "reply on its way" as s1\n {4}state "reply shown" as s2\n {2}\}\n {2}state "Window closed" as g1 \{\n {4}state "no question" as s3\n {4}state "reply on its way" as s4\n {4}state "reply shown" as s5\n {2}\}\n {2}state "Starting: loading" as s6\n/m,
    );
    assert.deepEqual(
      boxed.split("\n").filter((l) => /you open the window/.test(l)),
      ["  g1 --> s0 : you open the window"],
    );
    assert.equal(flat.split("\n").filter((l) => /you open the window/.test(l)).length, 3);
    assert.doesNotMatch(flat, /as g\d+ \{/);
    assert.deepEqual(flatEdges(boxed), flatEdges(flat));
    assert.match(boxed, /^ {2}class s5 wrongPath$/m);
    assert.match(boxed, /^ {2}s\d --> s5 : 4\. /m);
    assert.match(boxed, /state "Breaks a rule" as legendWrong/);
  },
);

const save = (name, code) => `---- MODULE ${name} ----
VARIABLES screen, note${code ? ", retries" : ""}
vars == <<screen, note${code ? ", retries" : ""}>>
Init == screen = "Editing" /\\ note = [text |-> "draft"${code ? `, rev |-> 0] /\\ retries = 0` : "]"}
Save == screen = "Editing" /\\ screen' = "Saving" /\\ UNCHANGED <<note${code ? ", retries" : ""}>>
Confirm == screen = "Saving" /\\ screen' = "Saved" /\\ note' = [text |-> "stored"${code ? `, rev |-> 1] /\\ UNCHANGED retries` : "]"}
Edit == screen = "Saved" /\\ screen' = "Editing" /\\ note' = [note EXCEPT !.text = "draft"]${code ? " /\\ retries' = 0" : ""}
${
  code
    ? `Retry == screen = "Saving" /\\ retries = 0 /\\ retries' = 1 /\\ UNCHANGED <<screen, note>>
TimeOut == screen = "Saving" /\\ retries = 1 /\\ screen' = "Saved" /\\ UNCHANGED <<note, retries>>
Next == Save \\/ Retry \\/ Confirm \\/ TimeOut \\/ Edit`
    : "Next == Save \\/ Confirm \\/ Edit"
}
Spec == Init /\\ [][Next]_vars
TypeOK == screen \\in {"Editing", "Saving", "Saved"}
\\* You never see "Saved" while the note is still a draft.
NoFalseSaved == ~(screen = "Saved" /\\ note.text = "draft")
====
`;

test(
  "from-spec --against compares the code with the spec on the parts both have, and --expect-broken sets the exit code",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(join(dir, "SaveCode.tla"), save("SaveCode", true));
    writeFileSync(join(dir, "SaveAgreed.tla"), save("SaveAgreed", false));
    writeFileSync(
      join(dir, "SaveCode.cfg"),
      "SPECIFICATION Spec\nINVARIANT TypeOK\nINVARIANT NoFalseSaved\n",
    );
    writeFileSync(
      join(dir, "SaveCode.map.mjs"),
      `export const readerActions = ["Save", "Edit"];
export const state = (v) => \`\${v.screen}, \${v.note.text}\`;
export const step = (a) => ({ Save: "you press Save", Retry: "the app tries again", Confirm: "the server stores the note", TimeOut: "the save times out", Edit: "you edit the note" })[a] ?? "";
export const cause = () => "the app stops after one retry and shows Saved anyway";
`,
    );
    const base = [
      "from-spec",
      "SaveCode.tla",
      "--against",
      "SaveAgreed.tla",
      "--label",
      "the agreed chart",
    ];
    const noCfg = node("statechart.mjs", base, dir);
    assert.equal(noCfg.status, 2);
    assert.equal(
      noCfg.stderr,
      "SaveAgreed.cfg does not exist. Pass --against-config with the config to check SaveAgreed.tla with. The configs beside it: SaveCode.cfg.\n",
    );
    const run = (...extra) =>
      node("statechart.mjs", [...base, "--against-config", "SaveCode.cfg", ...extra], dir);

    const unknown = run("--expect-broken", "NoLostNote");
    assert.equal(unknown.status, 2);
    assert.equal(
      unknown.stderr,
      "--expect-broken NoLostNote: not a rule in SaveCode.cfg, whose rules are TypeOK, NoFalseSaved.\n",
    );

    const expected = run("--expect-broken", "NoFalseSaved");
    assert.equal(expected.status, 0, expected.stderr);
    assert.equal(
      expected.stdout,
      `TLC on SaveCode.tla with SaveCode.cfg:
  TypeOK holds.
  NoFalseSaved is broken (expected).
  TLC ran 4 times in N s.
TLC on SaveAgreed.tla with SaveCode.cfg:
  TypeOK holds.
  NoFalseSaved holds.
  TLC ran 3 times in N s.

Chart: 4 states and 6 transitions from 10 model states.
3 work, 1 breaks a rule, 0 only in the agreed chart.

## 1. Saved, draft

Rule broken: You never see "Saved" while the note is still a draft.
Why: the app stops after one retry and shows Saved anyway.
In the model, one step leads into this bug: "the save times out". The steps below are the shortest path that TLC found.

0. Start: Editing, draft
1. You press Save. Now: Saving, draft
   (1 hidden step: the app tries again)
2. The save times out. Now: Saved, draft

In the agreed chart, step 2 (the save times out) cannot happen, so you stay at: Saving, draft.

Broken as expected: NoFalseSaved.

Wrote chart.mmd, bug-1.mmd, stories.md, summary.json in SaveCode-statechart.
`,
    );
    const uncitedWarning = `SaveCode.tla: TypeOK holds, but a rule can also hold because the model waits for a condition that the code does not check. No comment gives the file and line of the code that checks these conditions:
  SaveCode.tla:8 Retry: screen = "Saving"
  SaveCode.tla:9 TimeOut: retries = 1
Put that file and line in a comment on each condition, as in \\* pay.ts:120, or remove the condition when no code checks it.
`;
    const warnings = `No config beside SaveAgreed.tla has an "\\* expect:" line for SaveAgreed, so the stories cannot say whether SaveAgreed already lists each bug. When SaveAgreed.tla is a copy, pass the spec in its own folder.
${uncitedWarning}`;
    assert.equal(expected.stderr, warnings);
    const out = join(dir, "SaveCode-statechart");
    const chart = readFileSync(join(out, "chart.mmd"), "utf8");
    assert.match(chart, /^stateDiagram-v2\n {2}%% second model \(against\): the agreed chart\n/m);
    assert.deepEqual(
      [...chart.matchAll(/^ {4}state "([^"]+)" as legend\w+$/gm)].map((m) => m[1]),
      ["Works", "Breaks a rule"],
    );
    assert.match(
      chart,
      /^ {2}s3 --> s3 : in the agreed chart, the save<br\/>times out cannot happen at<br\/>step 2 of bug 1$/m,
    );
    const bug = readFileSync(join(out, "bug-1.mmd"), "utf8");
    assert.deepEqual([...bug.matchAll(/^ {2}state "([^"]+)" as s\d+$/gm)].map((m) => m[1]).sort(), [
      "Editing, draft",
      "Saved, draft",
      "Saving, draft",
    ]);
    const summary = JSON.parse(readFileSync(join(out, "summary.json"), "utf8"));
    assert.deepEqual(summary.second.role, "against");
    assert.deepEqual(summary.second.lacks.sort(), ["note.rev", "retries"]);
    assert.equal(summary.classes[0].against, "Saving, draft");
    assert.deepEqual(summary.codeLike, []);
    assert.deepEqual(summary.uncited, {
      "SaveCode.tla": [
        { line: 8, action: "Retry", condition: 'screen = "Saving"' },
        { line: 9, action: "TimeOut", condition: "retries = 1" },
      ],
    });
    assert.equal(summary.second.listed, undefined);

    const unexpected = run();
    assert.equal(unexpected.status, 1, unexpected.stderr);
    const holds = run("--expect-broken", "TypeOK");
    assert.equal(holds.status, 1, holds.stderr);
    assert.match(
      holds.stdout,
      /\nBroken but not expected: NoFalseSaved\.\n\nExpected to break but holds: TypeOK\.\n/,
    );
    const listed = run("--expect-broken", "NoFalseSaved,TypeOK");
    assert.equal(listed.status, 1, listed.stderr);
    assert.match(listed.stdout, /\nExpected to break but holds: TypeOK\.\n/);
    assert.doesNotMatch(listed.stdout, /Broken but not expected/);

    writeFileSync(
      join(dir, "code.map.mjs"),
      readFileSync(join(out, "../SaveCode.map.mjs"), "utf8").replace(
        '"the app stops after one retry and shows Saved anyway"',
        '"retryCount hit maxRetries"',
      ),
    );
    const coded = run("--map", "code.map.mjs", "--expect-broken", "NoFalseSaved");
    assert.equal(coded.status, 0, coded.stderr);
    assert.match(
      coded.stdout,
      /These labels or causes read like code\. Write them in the reader's words in code\.map\.mjs:\n {2}retryCount hit maxRetries\n/,
    );

    writeFileSync(
      join(dir, "rev.map.mjs"),
      readFileSync(join(dir, "SaveCode.map.mjs"), "utf8").replace(
        "${v.note.text}`",
        "${v.note.text} r${v.note.rev}`",
      ),
    );
    const tmp = join(dir, "tmp");
    mkdirSync(tmp);
    const lacks = node(
      "statechart.mjs",
      [
        ...base,
        "--against-config",
        "SaveCode.cfg",
        "--map",
        "rev.map.mjs",
        "--expect-broken",
        "NoFalseSaved",
      ],
      dir,
      { TMPDIR: tmp },
    );
    assert.equal(lacks.status, 2);
    const [, kept] = lacks.stderr.match(
      / The files that this run wrote are in (tmp\/statechart-\w+)\.\n$/,
    );
    assert.equal(
      lacks.stderr,
      `${warnings}rev.map.mjs: the agreed chart has no note.rev, and the mapping reads v.note.rev on its states. Label states and steps only from what both models have, or test "rev" in v.note first. The files that this run wrote are in ${kept}.\n`,
    );
    assert.match(
      readFileSync(join(dir, kept, "tlc", "SaveCode-NoFalseSaved.out"), "utf8"),
      /^Error: Invariant NoFalseSaved is violated/m,
    );
    writeFileSync(
      join(dir, "rev.map.mjs"),
      readFileSync(join(dir, "SaveCode.map.mjs"), "utf8").replace(
        "${v.note.text}`",
        '${v.note.text}${"rev" in v.note ? ` r${v.note.rev}` : ""}`',
      ),
    );
    const tested = run("--map", "rev.map.mjs", "--expect-broken", "NoFalseSaved");
    assert.equal(tested.status, 0, tested.stderr);

    writeFileSync(
      join(dir, "SaveBoth.cfg"),
      "SPECIFICATION Spec\nINVARIANT TypeOK\nINVARIANT NoFalseSaved\nPROPERTY NoFalseSaved\n",
    );
    const both = node(
      "statechart.mjs",
      [
        ...base,
        "--config",
        "SaveBoth.cfg",
        "--against-config",
        "SaveBoth.cfg",
        "--expect-broken",
        "NoFalseSaved",
      ],
      dir,
    );
    assert.equal(both.status, 0, both.stderr);
    assert.equal(both.stderr, warnings);

    writeFileSync(join(dir, "SaveAgreedType.cfg"), "SPECIFICATION Spec\nINVARIANT TypeOK\n");
    const unchecked = node(
      "statechart.mjs",
      [...base, "--against-config", "SaveAgreedType.cfg", "--expect-broken", "NoFalseSaved"],
      dir,
    );
    assert.equal(unchecked.status, 0, unchecked.stderr);
    assert.match(
      unchecked.stdout,
      /^TLC on SaveAgreed\.tla with SaveAgreedType\.cfg:\n {2}TypeOK holds\.\n/m,
    );
    assert.equal(
      unchecked.stderr,
      `SaveAgreedType.cfg does not check NoFalseSaved, so the stories cannot say whether SaveAgreed.tla keeps it.\n${warnings}`,
    );

    const listedCfg = (rule) =>
      writeFileSync(
        join(dir, "SaveAgreedBug.cfg"),
        `\\* module: SaveAgreed\n\\* expect: ${rule}\nSPECIFICATION Spec\nINVARIANT ${rule}\n`,
      );
    listedCfg("NoFalseSaved");
    const known = run("--expect-broken", "NoFalseSaved");
    assert.equal(known.status, 0, known.stderr);
    assert.equal(known.stderr, uncitedWarning);
    assert.match(
      known.stdout,
      /\nWhy: .*\nListed: SaveAgreedBug\.cfg, a config of SaveAgreed\.tla, expects TLC to break this rule\.\n/,
    );
    const listedSummary = JSON.parse(readFileSync(join(out, "summary.json"), "utf8"));
    assert.deepEqual(listedSummary.second.listed, {
      spec: "SaveAgreed.tla",
      breaks: { "SaveAgreedBug.cfg": "NoFalseSaved" },
    });
    assert.deepEqual(listedSummary.classes[0].listed, ["SaveAgreedBug.cfg"]);
    listedCfg("TypeOK");
    const fresh = run("--expect-broken", "NoFalseSaved");
    assert.equal(fresh.status, 0, fresh.stderr);
    assert.match(
      fresh.stdout,
      /\nNot listed: no config of SaveAgreed\.tla expects TLC to break this rule\. Its configs expect TLC to break `TypeOK`\.\n/,
    );
  },
);

const cartCode = `---- MODULE CartCode ----
VARIABLES phase, note, tag, mark, extra
vars == <<phase, note, tag, mark, extra>>
Init == phase = "cart" /\\ note = [text |-> "hi"] /\\ tag = [id |-> "a"] /\\ mark = [on |-> TRUE] /\\ extra = "kept"
Pay == phase = "cart" /\\ phase' = "paid" /\\ note' = [text |-> note.text, rev |-> 1] /\\ UNCHANGED <<tag, mark, extra>>
Back == phase = "paid" /\\ phase' = "cart" /\\ UNCHANGED <<note, tag, mark, extra>>
Spec == Init /\\ [][Pay \\/ Back]_vars
Ok == phase \\in {"cart", "paid"}
====
`;
const cartAgreed = `---- MODULE CartAgreed ----
VARIABLES phase, note, tag, mark
vars == <<phase, note, tag, mark>>
Init == phase = "cart" /\\ note = [text |-> "hi"] /\\ tag = "a" /\\ mark = [on |-> TRUE]
Pay == phase = "cart" /\\ phase' = "paid" /\\ mark' = [off |-> TRUE] /\\ UNCHANGED <<note, tag>>
Back == phase = "paid" /\\ phase' = "cart" /\\ UNCHANGED <<note, tag, mark>>
Spec == Init /\\ [][Pay \\/ Back]_vars
Ok == phase \\in {"cart", "paid"}
====
`;

test(
  "from-spec --against stops when the mapping reads what the spec lacks through a spread, a later state, a field of another type, or a field some states lack",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(join(dir, "CartCode.tla"), cartCode);
    writeFileSync(join(dir, "CartAgreed.tla"), cartAgreed);
    writeFileSync(join(dir, "CartCode.cfg"), "SPECIFICATION Spec\nINVARIANT Ok\n");
    const map = (name, state, more = "") =>
      writeFileSync(
        join(dir, name),
        `export const readerActions = ["Pay", "Back"];
export const state = ${state};
export const step = (a) => ({ Pay: "you pay", Back: "you go back" })[a];
${more}`,
      );
    const tmp = join(dir, "tmp");
    mkdirSync(tmp);
    const stops = (name, message) => {
      const r = node(
        "statechart.mjs",
        [
          "from-spec",
          "CartCode.tla",
          "--against",
          "CartAgreed.tla",
          "--label",
          "the agreed chart",
          "--against-config",
          "CartCode.cfg",
          "--map",
          name,
        ],
        dir,
        { TMPDIR: tmp },
      );
      assert.equal(r.status, 2, r.stdout);
      const [, kept] =
        r.stderr.match(/ The files that this run wrote are in (tmp\/statechart-\w+)\.\n$/) ?? [];
      assert.equal(r.stderr, `${message} The files that this run wrote are in ${kept}.\n`);
    };

    map("spread.map.mjs", "(v) => { const c = { ...v }; return `${c.phase} ${c.extra}`; }");
    stops(
      "spread.map.mjs",
      "spread.map.mjs: the agreed chart has no extra, and the mapping lists the fields of v on its states. Label states and steps only from what both models have, and read the fields it needs by name.",
    );

    map("later.map.mjs", "(v) => `${v.phase} ${v.note.rev}`");
    stops(
      "later.map.mjs",
      'later.map.mjs: the agreed chart has no note.rev, and the mapping reads v.note.rev on its states. Label states and steps only from what both models have, or test "rev" in v.note first.',
    );

    map("typed.map.mjs", "(v) => `${v.phase} ${v.tag.id}`");
    stops(
      "typed.map.mjs",
      "typed.map.mjs: the agreed chart has tag as a value of another type, and the mapping reads v.tag on its states. Label states and steps only from what both models have.",
    );

    map("partial.map.mjs", "(v) => `${v.phase} ${v.mark.on}`");
    stops(
      "partial.map.mjs",
      'partial.map.mjs: the mapping labels a state of the agreed chart "paid undefined", so it reads a field the agreed chart does not have there. Label states and steps only from what both models have.',
    );

    map(
      "guarded.map.mjs",
      "(v) => v.phase",
      "export const guard = (a, b) => `tag ${b.mark.on}`;\n",
    );
    stops(
      "guarded.map.mjs",
      'guarded.map.mjs: the mapping labels a step of the agreed chart "tag undefined", so it reads a field the agreed chart does not have there. Label states and steps only from what both models have.',
    );
  },
);

const seatsSpec = `---- MODULE Seats ----
VARIABLES seat, grid
vars == <<seat, grid>>
Init == seat = <<"empty", "empty">> /\\ grid = << <<"a", "b">>, <<"c", "d">> >>
Fill == seat[1] = "empty" /\\ seat' = [seat EXCEPT ![1] = "full"] /\\ UNCHANGED grid
Next == Fill
Spec == Init /\\ [][Next]_vars
====
`;

function seats() {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(join(dir, "Seats.tla"), seatsSpec);
  writeFileSync(join(dir, "Seats.cfg"), "SPECIFICATION Spec\n");
  const draw = (name, map) => {
    writeFileSync(join(dir, `${name}.map.mjs`), map);
    return node(
      "statechart.mjs",
      ["from-spec", "Seats.tla", "--map", `${name}.map.mjs`, "--out", name],
      dir,
    );
  };
  const chartOf = (name) => readFileSync(join(dir, name, "chart.mmd"), "utf8");
  const states = (name, map) => {
    const r = draw(name, map);
    assert.equal(r.status, 0, r.stderr);
    return Object.keys(statusOf(chartOf(name))).sort();
  };
  return { draw, chartOf, states };
}

test(
  "a map reads a tuple from 1, as in TLA+, stops when it reads index 0, and keeps length, array methods, spread, and JSON",
  needsTlc,
  () => {
    const { draw, chartOf } = seats();

    const first = draw(
      "first",
      'export const state = (v) => `first seat ${v.seat[1]}`;\nexport const step = () => "you take the first seat";\n',
    );
    assert.equal(first.status, 0, first.stderr);
    assert.deepEqual(edges(parseMermaid(chartOf("first")).regions.Main), [
      "first seat empty -> first seat full : you take the first seat",
    ]);

    const zero = draw("zero", "export const state = (v) => `first seat ${v.seat[0]}`;\n");
    assert.equal(zero.status, 2, zero.stdout);
    assert.match(
      zero.stderr,
      /^zero\.map\.mjs: the mapping reads v\.seat\[0\], .*reads from 1.*\bv\.seat\[1\]/m,
    );

    const shapes = draw(
      "shapes",
      'export const state = (v) =>\n  `${v.seat.filter((s) => s === "full").length} of ${v.seat.length} full, ${[...v.seat].join(" and ")}, corner ${v.grid[1][2]}`;\nexport const step = (action, before, after) => JSON.stringify(after);\n',
    );
    assert.equal(shapes.status, 0, shapes.stderr);
    const chart = chartOf("shapes");
    assert.deepEqual(Object.keys(statusOf(chart)).sort(), [
      "0 of 2 full, empty and empty, corner b",
      "1 of 2 full, full and empty, corner b",
    ]);
    assert.deepEqual(
      [...chart.matchAll(/^ {2}s\d+ --> s\d+ : (.*)$/gm)].map((m) => m[1]),
      [
        JSON.stringify({
          grid: [
            ["a", "b"],
            ["c", "d"],
          ],
          seat: ["full", "empty"],
        }),
      ],
    );
  },
);

const zeroIndex = (at) =>
  new RegExp(
    String.raw`the mapping looks for index 0 in ${at}, .*reads from 1, as in TLA\+\. Use \[\.\.\.${at}\] for an array that reads from 0\.`,
  );

test(
  "a map's in and hasOwnProperty see a tuple's indexes from 1, and asking for index 0 stops the run",
  needsTlc,
  () => {
    const { draw, states } = seats();
    assert.deepEqual(
      states(
        "has",
        "export const state = (v) =>\n  `${v.seat[1]}: ${[1, 2, 3].map((i) => i in v.seat)} ${v.seat.hasOwnProperty(2)}`;\n",
      ),
      ["empty: true,true,false true", "full: true,true,false true"],
    );

    const zero = draw("zero", "export const state = (v) => `${0 in v.seat}`;\n");
    assert.equal(zero.status, 2, zero.stdout);
    assert.match(
      zero.stderr,
      new RegExp(`^zero\\.map\\.mjs: ${zeroIndex("v\\.seat").source}`, "m"),
    );
  },
);

test("a map's Object.keys and Object.entries list a tuple's indexes from 1", needsTlc, () => {
  const { states } = seats();
  assert.deepEqual(
    states(
      "keys",
      'export const state = (v) =>\n  `${v.seat[1]}: ${Object.keys(v.seat)} ${Object.entries(v.seat).map(([i, s]) => `${i}=${s}`).join(" ")}`;\n',
    ),
    ["empty: 1,2 1=empty 2=empty", "full: 1,2 1=full 2=empty"],
  );
});

test("a map that spreads a tuple into an object gets its items at keys from 1", needsTlc, () => {
  const { states } = seats();
  assert.deepEqual(
    states(
      "spread",
      "export const state = (v) => {\n  const s = { ...v.seat };\n  return `${s[1]} ${s[2]} ${0 in s}`;\n};\n",
    ),
    ["empty empty false", "full empty false"],
  );
});

test(
  "a map that hands a tuple to concat stops the run and names the tuple it wrote",
  needsTlc,
  () => {
    const { draw } = seats();
    const r = draw("concat", 'export const state = (v) => [].concat(v.seat).join(" ");\n');
    assert.equal(r.status, 2, r.stdout);
    assert.match(r.stderr, new RegExp(`^concat\\.map\\.mjs: ${zeroIndex("v\\.seat").source}`, "m"));
  },
);

test(
  "a map flattens nested tuples with flat and flatMap, and flattening an array that holds a tuple stops the run",
  needsTlc,
  () => {
    const { draw, states } = seats();
    assert.deepEqual(
      states(
        "flat",
        'export const state = (v) =>\n  `${v.seat[1]} ${v.grid.flat().join("")} ${v.grid.flatMap((row) => row).join("")} ${v.grid.flat(Infinity).join("")}`;\n',
      ),
      ["empty abcd abcd abcd", "full abcd abcd abcd"],
    );

    const inArray = draw("inarray", 'export const state = (v) => [v.seat].flat().join(" ");\n');
    assert.equal(inArray.status, 2, inArray.stdout);
    assert.match(
      inArray.stderr,
      new RegExp(`^inarray\\.map\\.mjs: ${zeroIndex("v\\.seat").source}`, "m"),
    );
  },
);

test("a map flattens a set of tuples with flat and flatMap", needsTlc, () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(
    join(dir, "Pairs.tla"),
    `---- MODULE Pairs ----
VARIABLES sent
Init == sent = {<<1, "a">>}
Send == sent = {<<1, "a">>} /\\ sent' = sent \\cup {<<2, "b">>}
Spec == Init /\\ [][Send]_sent
====
`,
  );
  writeFileSync(join(dir, "Pairs.cfg"), "SPECIFICATION Spec\n");
  writeFileSync(
    join(dir, "Pairs.map.mjs"),
    'export const state = (v) =>\n  `${v.sent.flat().join("")} ${v.sent.flatMap((m) => m).join("")} ${structuredClone(v.sent).flat().join("")}`;\n',
  );
  const r = node("statechart.mjs", ["from-spec", "Pairs.tla", "--out", "out"], dir);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(
    Object.keys(statusOf(readFileSync(join(dir, "out", "chart.mmd"), "utf8"))).sort(),
    ["1a 1a 1a", "1a2b 1a2b 1a2b"],
  );
});

test("a map's structuredClone copies tuples that still read and write from 1", needsTlc, () => {
  const { draw, states } = seats();
  assert.deepEqual(
    states(
      "clone",
      'export const state = (v) => {\n  const c = structuredClone(v);\n  c.seat[2] = "held";\n  return `${c.seat[1]} ${c.seat[2]} ${v.seat[2]} ${c.grid[2][1]} ${Object.keys(c.seat)} ${structuredClone(v.grid)[2][2]}`;\n};\n',
    ),
    ["empty held empty c 1,2 d", "full held empty c 1,2 d"],
  );

  const zero = draw(
    "clonezero",
    'export const state = (v) => {\n  const c = structuredClone(v);\n  c.seat[0] = "held";\n  return c.seat[1];\n};\n',
  );
  assert.equal(zero.status, 2, zero.stdout);
  assert.match(
    zero.stderr,
    /^clonezero\.map\.mjs: the mapping writes v\.seat\[0\], but a tuple reads from 1, as in TLA\+\. Write v\.seat\[1\] for its first item\./m,
  );
});

test(
  "from-spec --against draws a step that step() does not name by its action in the developer and layered views",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    const packing = (name, more = "") => `---- MODULE ${name} ----
VARIABLES phase
Init == phase = "cart"
Pay == phase = "cart" /\\ phase' = "paid"
Pack == phase = "paid" /\\ phase' = "packed"
Ship == phase = "packed" /\\ phase' = "shipped"
${more}Spec == Init /\\ [][Pay \\/ Pack \\/ Ship${more && " \\/ Refund"}]_phase
NotShipped == phase # "shipped"
====
`;
    writeFileSync(join(dir, "PackCode.tla"), packing("PackCode"));
    writeFileSync(
      join(dir, "PackAgreed.tla"),
      packing("PackAgreed", `Refund == phase = "paid" /\\ phase' = "cart"\n`),
    );
    writeFileSync(join(dir, "PackCode.cfg"), "SPECIFICATION Spec\nINVARIANT NotShipped\n");
    writeFileSync(
      join(dir, "pack.map.mjs"),
      `export const readerActions = ["Pay"];
export const state = (v) => v.phase;
export const detail = (v) => v.phase;
export const step = (a) => ({ Pay: "you pay", Ship: "we ship" })[a];
`,
    );
    const r = node(
      "statechart.mjs",
      [
        ...["from-spec", "PackCode.tla", "--against", "PackAgreed.tla"],
        ...["--label", "the agreed chart", "--against-config", "PackCode.cfg"],
        ...["--map", "pack.map.mjs", "--out", "out"],
      ],
      dir,
    );
    assert.equal(r.status, 1, r.stderr);
    assert.doesNotMatch(r.stderr, /the mapping labels/);
    for (const view of ["developer", "layered"]) {
      const chart = readFileSync(join(dir, "out", `bug-1-${view}.mmd`), "utf8");
      assert.doesNotMatch(chart, /undefined/, view);
      assert.match(chart, /--> s\d+ : 2\. Pack$/m, view);
    }
  },
);

test(
  "from-spec --against compares a rule's variable of another type without blaming the mapping",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(
      join(dir, "ShopCode.tla"),
      `---- MODULE ShopCode ----
VARIABLES phase, tag
vars == <<phase, tag>>
Init == phase = "cart" /\\ tag = [id |-> "a"]
Pay == phase = "cart" /\\ phase' = "paid" /\\ UNCHANGED tag
Spec == Init /\\ [][Pay]_vars
Ok == ~(phase = "paid" /\\ tag = tag)
====
`,
    );
    writeFileSync(
      join(dir, "ShopAgreed.tla"),
      `---- MODULE ShopAgreed ----
VARIABLES phase, tag, seen
vars == <<phase, tag, seen>>
Init == phase = "cart" /\\ tag = "a" /\\ seen = FALSE
Peek == ~seen /\\ seen' = TRUE /\\ tag' = "b" /\\ UNCHANGED phase
Pay == phase = "cart" /\\ phase' = "paid" /\\ UNCHANGED <<tag, seen>>
Spec == Init /\\ [][Peek \\/ Pay]_vars
Ok == ~(phase = "paid" /\\ tag = tag)
====
`,
    );
    writeFileSync(join(dir, "ShopCode.cfg"), "SPECIFICATION Spec\nINVARIANT Ok\n");
    writeFileSync(
      join(dir, "shop.map.mjs"),
      `export const readerActions = ["Pay"];
export const state = (v) => v.phase;
export const step = (a) => ({ Pay: "you pay" })[a];
`,
    );
    const r = node(
      "statechart.mjs",
      [
        "from-spec",
        "ShopCode.tla",
        "--against",
        "ShopAgreed.tla",
        "--label",
        "the agreed chart",
        "--against-config",
        "ShopCode.cfg",
        "--map",
        "shop.map.mjs",
      ],
      dir,
    );
    assert.equal(r.status, 1, r.stderr);
    assert.doesNotMatch(r.stderr, /the mapping reads/);
  },
);

const shipCode = `---- MODULE ShipCode ----
EXTENDS Naturals
VARIABLES phase, n, mark
vars == <<phase, n, mark>>
Init == phase = "cart" /\\ n = 0 /\\ mark = [on |-> TRUE]
Pay == phase = "cart" /\\ phase' = "paid" /\\ n' = 1 /\\ UNCHANGED mark
Ship == phase = "paid" /\\ phase' = "shipped" /\\ UNCHANGED <<n, mark>>
Spec == Init /\\ [][Pay \\/ Ship]_vars
Ok == phase \\in {"cart", "paid", "shipped"}
NotShipped == phase # "shipped"
====
`;
const shipAgreed = `---- MODULE ShipAgreed ----
VARIABLES phase, n, mark
vars == <<phase, n, mark>>
Init == phase = "cart" /\\ n = "0" /\\ mark = [on |-> TRUE]
Pay == phase = "cart" /\\ phase' = "paid" /\\ n' = "1" /\\ UNCHANGED mark
Ship == phase = "paid" /\\ phase' = "shipped" /\\ mark' = "off" /\\ UNCHANGED n
Spec == Init /\\ [][Pay \\/ Ship]_vars
Ok == phase \\in {"cart", "paid", "shipped"}
NotShipped == phase # "shipped"
====
`;
const shipMap = (state) => `export const readerActions = ["Pay", "Ship"];
export const state = ${state};
export const step = (a) => ({ Pay: "you pay", Ship: "we ship" })[a];
`;
const stopsWith = (r, message) => {
  assert.equal(r.status, 2, r.stdout);
  const [, kept] =
    r.stderr.match(/ The files that this run wrote are in (tmp\/statechart-\w+)\.\n$/) ?? [];
  assert.equal(r.stderr, `${message} The files that this run wrote are in ${kept}.\n`);
};
const codeAgainstAgreed = [
  ...["ShipCode.tla", "--against", "ShipAgreed.tla", "--label", "the agreed chart"],
  ...["--against-config", "ShipCode.cfg"],
];
function shipAgainst(map, models = codeAgainstAgreed, agreed = shipAgreed) {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(join(dir, "ShipCode.tla"), shipCode);
  writeFileSync(join(dir, "ShipAgreed.tla"), agreed);
  writeFileSync(join(dir, "ShipCode.cfg"), "SPECIFICATION Spec\nINVARIANT Ok\n");
  writeFileSync(join(dir, "ship.map.mjs"), map);
  mkdirSync(join(dir, "tmp"));
  return node("statechart.mjs", ["from-spec", ...models, "--map", "ship.map.mjs"], dir, {
    TMPDIR: join(dir, "tmp"),
  });
}

test(
  "from-spec --against stops when the mapping reads a field that one model has as a number and the other as a string",
  needsTlc,
  () => {
    stopsWith(
      shipAgainst(shipMap('(v) => `${v.phase}, ${v.n === 0 ? "free" : "charged"}`')),
      "ship.map.mjs: the agreed chart has n as a value of another type, and the mapping reads v.n on its states. Label states and steps only from what both models have.",
    );
    stopsWith(
      shipAgainst(shipMap('(v) => `${v.phase}, ${v.n === "0" ? "free" : "charged"}`'), [
        "ShipAgreed.tla",
        "--config",
        "ShipCode.cfg",
        "--against",
        "ShipCode.tla",
      ]),
      "ship.map.mjs: the spec has n as a value of another type, and the mapping reads v.n on its states. Label states and steps only from what both models have.",
    );
  },
);

test(
  "from-spec --against stops when the mapping reads a field that is a record in some of the spec's states and not in others",
  needsTlc,
  () => {
    stopsWith(
      shipAgainst(shipMap('(v) => `${v.phase}, ${v.mark.on ? "marked" : "plain"}`')),
      "ship.map.mjs: the agreed chart has mark as a value of another type, and the mapping reads v.mark on its states. Label states and steps only from what both models have.",
    );

    const where = shipAgainst(
      shipMap(
        '(v) => (v.phase === "shipped" ? v.phase : `${v.phase}, ${v.mark.on ? "marked" : "plain"}`)',
      ),
    );
    assert.equal(where.status, 0, where.stderr);
  },
);

test(
  "from-spec --against checks the fields of a record that is a record in only some of the spec's states",
  needsTlc,
  () => {
    const recordStates = shipMap(
      '(v) => (v.phase === "shipped" ? v.phase : `${v.phase}, ${v.mark.on === true ? "marked" : "plain"}`)',
    );
    stopsWith(
      shipAgainst(recordStates, codeAgainstAgreed, shipAgreed.replaceAll("[on |->", "[off |->")),
      'ship.map.mjs: the agreed chart has no mark.on, and the mapping reads v.mark.on on its states. Label states and steps only from what both models have, or test "on" in v.mark first.',
    );
    stopsWith(
      shipAgainst(recordStates, codeAgainstAgreed, shipAgreed.replaceAll("TRUE", '"yes"')),
      "ship.map.mjs: the agreed chart has mark.on as a value of another type, and the mapping reads v.mark.on on its states. Label states and steps only from what both models have.",
    );
  },
);

test(
  "tlc-to-chart stops when the mapping reads a field of another type that only a trace of the second model has",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(join(dir, "ShipCode.tla"), shipCode);
    writeFileSync(join(dir, "ShipAgreed.tla"), shipAgreed);
    writeFileSync(join(dir, "ShipCode.cfg"), "SPECIFICATION Spec\nINVARIANT NotShipped\n");
    writeFileSync(join(dir, "ShipAgreed.cfg"), "SPECIFICATION Spec\nINVARIANT NotShipped\n");
    tlc(dir, "ShipCode");
    tlc(dir, "ShipAgreed");
    renameSync(join(dir, "ShipAgreed.out"), join(dir, "ShipAgreedTraces.out"));
    writeFileSync(join(dir, "ShipAgreed.cfg"), "SPECIFICATION Spec\nCONSTRAINT NotShipped\n");
    tlc(dir, "ShipAgreed");
    assert.doesNotMatch(readFileSync(join(dir, "ShipAgreed.dot"), "utf8"), /shipped/);
    writeFileSync(
      join(dir, "ship.map.mjs"),
      shipMap('(v) => `${v.phase}, ${v.mark.on ? "marked" : "plain"}`'),
    );
    const r = node(
      "tlc-to-chart.mjs",
      [
        ...["--dot", "ShipCode.dot", "--map", "ship.map.mjs", "--traces", "ShipCode.out"],
        ...["--against-dot", "ShipAgreed.dot", "--against-traces", "ShipAgreedTraces.out"],
        ...["--against-rules", "NotShipped", "--label", "the agreed chart", "--out", "chart.mmd"],
      ],
      dir,
    );
    assert.equal(r.status, 1, r.stdout);
    assert.match(
      r.stderr,
      /^Error: the agreed chart has mark as a value of another type, and the mapping reads v\.mark on its states\./m,
    );
  },
);

test(
  "from-spec --against names the group when the mapping groups a state of the spec by a field that state lacks",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(join(dir, "CartCode.tla"), cartCode);
    writeFileSync(join(dir, "CartAgreed.tla"), cartAgreed);
    writeFileSync(join(dir, "CartCode.cfg"), "SPECIFICATION Spec\nINVARIANT Ok\n");
    writeFileSync(
      join(dir, "group.map.mjs"),
      `export const readerActions = ["Pay", "Back"];
export const state = (v) => v.phase;
export const step = (a) => ({ Pay: "you pay", Back: "you go back" })[a];
export const group = (v) => \`mark \${v.mark.on}\`;
`,
    );
    mkdirSync(join(dir, "tmp"));
    const r = node(
      "statechart.mjs",
      [
        "from-spec",
        "CartCode.tla",
        "--against",
        "CartAgreed.tla",
        "--label",
        "the agreed chart",
        "--against-config",
        "CartCode.cfg",
        "--map",
        "group.map.mjs",
      ],
      dir,
      { TMPDIR: join(dir, "tmp") },
    );
    stopsWith(
      r,
      'group.map.mjs: the mapping puts a state of the agreed chart in group "mark undefined", so it reads a field the agreed chart does not have there. Label states and steps only from what both models have.',
    );
  },
);

test(
  "from-chart checks a chart whose regions guard each other, and draws it back unchanged",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(join(dir, "lamp.mmd"), lamp);
    const r = node(
      "statechart.mjs",
      ["from-chart", "lamp.mmd", "--expect-broken", "LitWhileOff"],
      dir,
    );
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /\nThe spec draws lamp\.mmd back unchanged\.\n/);
  },
);

const doorSpec = `---- MODULE Door ----
VARIABLES where, reply
vars == <<where, reply>>
Init == where = "Open" /\\ reply = "none"
Ask == reply = "none" /\\ reply' = "pending" /\\ UNCHANGED where
Answer == where = "Open" /\\ reply = "pending" /\\ reply' = "shown" /\\ UNCHANGED where
Drop == where = "Closed" /\\ reply = "pending" /\\ reply' = "lost" /\\ UNCHANGED where
Close == where = "Open" /\\ where' = "Closed" /\\ UNCHANGED reply
Reopen == where = "Closed" /\\ where' = "Open" /\\ (reply' = reply \\/ (reply = "pending" /\\ reply' = "shown"))
Next == Ask \\/ Answer \\/ Drop \\/ Close \\/ Reopen
Spec == Init /\\ [][Next]_vars
NoLostReply == reply # "lost"
NoShownWhileClosed == ~(where = "Closed" /\\ reply = "shown")
====
`;

const doorMap = `const W = { Open: "Window open", Closed: "Window closed" };
const R = { none: "no question", pending: "reply on its way", shown: "reply shown", lost: "reply lost" };
export const regionNames = ["Where you are", "Your reply"];
export const state = (v) => \`\${W[v.where]}: \${R[v.reply]}\`;
export const step = (a) => ({ Ask: "you ask", Answer: "the reply arrives", Drop: "the app drops the reply", Close: "you close the window", Reopen: "you open the window" })[a];
`;

function runDoor(map) {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(join(dir, "Door.tla"), doorSpec);
  writeFileSync(join(dir, "Door.map.mjs"), map);
  const out = join(dir, "Door-statechart");
  const read = (f) => readFileSync(join(out, f), "utf8").replaceAll("<br/>", " ");
  return (rule) => {
    writeFileSync(join(dir, "Door.cfg"), `SPECIFICATION Spec\nINVARIANT ${rule}\n`);
    const r = node("statechart.mjs", ["from-spec", "Door.tla", "--expect-broken", rule], dir);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const every = join(out, "tlc", "regions-all.mmd");
    return {
      stdout: r.stdout,
      chart: read("chart.mmd"),
      every: existsSync(every) ? read("tlc/regions-all.mmd") : null,
      bug: read("bug-1.mmd"),
      out,
    };
  };
}

test(
  "from-spec draws parallel regions only when they combine back into TLC's graph, and boxes otherwise",
  needsTlc,
  () => {
    const run = runDoor(doorMap);
    const proved = run("NoLostReply");
    assert.match(
      proved.stdout,
      /\nChart: 6 states and 5 transitions from 8 model states\.\nIt has 2 parallel regions, of 2 and 4 states\. Proof: their 7 arrows together make exactly the 8 states and 13 labeled steps of Door-statechart\/tlc\/regions-proof\.mmd, and the 5 drawn arrows make only steps among them\. Door-statechart\/tlc\/regions-all\.mmd has all 7 arrows\.\n5 work, 1 breaks a rule\.\n/,
    );
    const lines = proved.chart.split("\n");
    assert.ok(lines.includes('    state "Where you are" as region0 {'));
    assert.ok(lines.includes("    --"));
    const guarded = lines.findIndex((l) => /: the reply arrives \[when Window open\]$/.test(l));
    assert.match(lines[guarded + 1], /^ {6}%% when r0s\d$/);
    assert.doesNotMatch(proved.chart, /^ {6}r1s\d --> r1s\d : you open the window/m);
    assert.equal(
      proved.every
        .split("\n")
        .filter((l) => /^ {6}(r1s\d) --> \1 : you open the window \[when Window closed\]$/.test(l))
        .length,
      1,
    );
    const again = node(
      "compare-charts.mjs",
      ["tlc/regions-all.mmd", "tlc/regions-proof.mmd"],
      proved.out,
    );
    assert.equal(again.stdout, "same\n", again.stderr);

    const boxed = run("NoShownWhileClosed");
    assert.equal(boxed.every, null);
    assert.match(
      boxed.stdout,
      /\nIt has no parallel regions, because "Window closed: reply shown" is "Breaks a rule", and its two region states would show "Works"\.\n/,
    );
    assert.doesNotMatch(boxed.chart, /^ +--$/m);
    assert.match(boxed.chart, /^ {2}state "Window closed" as g\d \{$/m);
  },
);

test(
  "from-spec draws parallel regions whose arrows together make a step back to the same state, which the overview leaves out",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(
      join(dir, "Knobs.tla"),
      `---- MODULE Knobs ----
VARIABLES dial, light
vars == <<dial, light>>
Init == dial = "low" /\\ light = "off"
Turn == dial = "low" /\\ light = "off" /\\ dial' \\in {"low", "mid"} /\\ light' \\in {"off", "on"}
Push == dial = "mid" /\\ dial' = "high" /\\ UNCHANGED light
Next == Turn \\/ Push
Spec == Init /\\ [][Next]_vars
====
`,
    );
    writeFileSync(join(dir, "Knobs.cfg"), "SPECIFICATION Spec\nCHECK_DEADLOCK FALSE\n");
    writeFileSync(
      join(dir, "Knobs.map.mjs"),
      `export const regionNames = ["Dial", "Light"];
export const state = (v) => \`\${v.dial}: \${v.light}\`;
export const step = (a) => ({ Turn: "you turn", Push: "you push" })[a];
`,
    );
    const r = node("statechart.mjs", ["from-spec", "Knobs.tla"], dir);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /\nIt has 2 parallel regions, of 3 and 2 states\. /);
    const again = node(
      "compare-charts.mjs",
      ["tlc/regions-all.mmd", "tlc/regions-proof.mmd"],
      join(dir, "Knobs-statechart"),
    );
    assert.equal(again.stdout, "same\n", again.stderr);
  },
);

test(
  "the mapping's guard words show on an arrow only when every model step behind it has them",
  needsTlc,
  () => {
    const run = runDoor(
      `${doorMap}export const guard = (a, before) =>
  ({ Answer: "window open", Drop: "window closed", Ask: before.where === "Open" ? "window open" : "" })[a] ?? "";
`,
    );
    const proved = run("NoLostReply");
    const lines = proved.chart.split("\n");
    for (const words of [
      /: the reply arrives \[window open\]$/,
      /: the app drops the reply \[window closed\]$/,
    ])
      assert.match(lines[lines.findIndex((l) => words.test(l)) + 1], /^ {6}%% when r0s\d$/);
    assert.ok(lines.some((l) => /^ {6}r1s\d --> r1s\d : you ask$/.test(l)));
    const again = node(
      "compare-charts.mjs",
      ["tlc/regions-all.mmd", "tlc/regions-proof.mmd"],
      proved.out,
    );
    assert.equal(again.stdout, "same\n", again.stderr);
    assert.match(proved.bug, / : \d\. the app drops the reply \[window closed\]$/m);

    const boxed = run("NoShownWhileClosed");
    assert.match(boxed.chart, / : you ask \[window open\]$/m);
    assert.match(boxed.chart, / : you ask$/m);
  },
);

test(
  "the mapping's timer() writes after N s on timer steps, and refuses a value that is not seconds",
  needsTlc,
  () => {
    const timed = runDoor(
      `${doorMap}export const timer = (a) => (a === "Drop" ? 30 : undefined);\n`,
    )("NoLostReply");
    assert.match(timed.chart, / : after 30 s, the app drops the reply \[when Window closed\]$/m);
    assert.match(timed.bug, / : \d\. after 30 s, the app drops the reply$/m);
    const again = node(
      "compare-charts.mjs",
      ["tlc/regions-all.mmd", "tlc/regions-proof.mmd"],
      timed.out,
    );
    assert.equal(again.stdout, "same\n", again.stderr);

    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(join(dir, "Door.tla"), doorSpec);
    writeFileSync(join(dir, "Door.cfg"), "SPECIFICATION Spec\nINVARIANT NoLostReply\n");
    writeFileSync(join(dir, "Door.map.mjs"), `${doorMap}export const timer = () => "soon";\n`);
    const r = node("statechart.mjs", ["from-spec", "Door.tla"], dir);
    assert.notEqual(r.status, 0);
    assert.match(
      r.stderr,
      /timer\(\) must return a number of seconds above 0, or nothing; got "soon" for \w+/,
    );
  },
);

const groupMap = `${doorMap}export const group = (v) =>
  ({ none: "Nothing to show", pending: "Waiting", shown: "Reply shown", lost: "Reply shown" })[v.reply];
export const groupColors = { "Reply shown": "#d1f2eb", Waiting: null, "Never drawn": "#ffffff" };
`;

test(
  "group() fills each state with its group's color, and the legend lists only the groups the chart draws",
  needsTlc,
  () => {
    const run = runDoor(groupMap)("NoLostReply");
    const lines = run.chart.split("\n");
    assert.deepEqual(lines.slice(0, lines.indexOf('  state "At the same time" as regions {')), [
      "---",
      "config:",
      "  markdownAutoWrap: false",
      "  state:",
      "    useMaxWidth: false",
      "---",
      "stateDiagram-v2",
      "  classDef plain fill:#f4f6f7,stroke:#566573,color:#1b2631",
      "  classDef plainWrong fill:#f4f6f7,stroke:#c0392b,stroke-width:4px,color:#7b241c",
      "  classDef group0 fill:#d1f2eb,stroke:#697976,color:#1b2631",
      "  classDef group0Wrong fill:#d1f2eb,stroke:#c0392b,stroke-width:4px,color:#7b241c",
      "  classDef group1 fill:#d6eaf8,stroke:#6b757c,color:#1b2631",
      "  classDef group2 fill:#fdebd0,stroke:#7f7668,color:#1b2631",
      '  state "Legend" as legend {',
      '    state "Reply shown" as legendGroup0',
      '    state "Waiting" as legendGroup1',
      '    state "Nothing to show" as legendGroup2',
      '    state "Breaks a rule" as legendWrong',
      "  }",
      "  class legendGroup0 group0",
      "  class legendGroup1 group1",
      "  class legendGroup2 group2",
      "  class legendWrong plainWrong",
    ]);
    assert.ok(lines.includes('      state "reply lost" as r1s1'));
    assert.deepEqual(
      lines.filter((l) => l.startsWith("  class r")),
      [
        "  class r0s0 plain",
        "  class r0s1 plain",
        "  class r1s0 group2",
        "  class r1s1 group0Wrong",
        "  class r1s2 group1",
        "  class r1s3 group0",
      ],
    );
    assert.match(run.stdout, /\n5 work, 1 breaks a rule\.\n/);
    const again = node(
      "compare-charts.mjs",
      ["tlc/regions-all.mmd", "tlc/regions-proof.mmd"],
      run.out,
    );
    assert.equal(again.stdout, "same\n", again.stderr);

    const bug = run.bug.split("\n");
    assert.ok(
      bug.includes(
        "  classDef group1Path fill:#d6eaf8,stroke:#1f3a93,stroke-width:4px,color:#1b2631",
      ),
    );
    assert.deepEqual(
      bug.filter((l) => /^ {2}class s\d/.test(l)),
      [
        "  class s0 group0Wrong",
        "  class s1 group1Path",
        "  class s2 group2Path",
        "  class s3 group1Path",
      ],
    );

    const summary = JSON.parse(readFileSync(join(run.out, "summary.json"), "utf8"));
    assert.deepEqual(summary.chartGroups, [
      { name: "Reply shown", color: "#d1f2eb", states: 2 },
      { name: "Waiting", color: "#d6eaf8", states: 1 },
      { name: "Nothing to show", color: "#fdebd0", states: 1 },
    ]);
    assert.deepEqual(summary.mixedGroups, []);
  },
);

test(
  "the mapping cannot hide a broken rule, and refuses a status name, a dark or bad color, or a group that is not a name",
  needsTlc,
  () => {
    const run = runDoor(groupMap)("NoLostReply");
    const tlcDir = join(run.out, "tlc");
    const chart = (map, ...extra) => {
      writeFileSync(join(tlcDir, "probe.map.mjs"), map);
      return node(
        "tlc-to-chart.mjs",
        [
          "--dot",
          "Door.dot",
          "--map",
          "probe.map.mjs",
          "--traces",
          "Door-NoLostReply.out",
          "--broken",
          "Door.out",
          "--highlight",
          "0",
          ...extra,
        ],
        tlcDir,
      );
    };

    const hidden = chart(
      `${doorMap}export const group = () => "All good";\nexport const groupColors = { "All good": "#e9f7ef" };\n`,
      "--regions",
    );
    assert.equal(hidden.status, 0, hidden.stderr);
    const lines = hidden.stdout.split("\n");
    assert.ok(
      lines.includes(
        "  classDef group0Wrong fill:#e9f7ef,stroke:#c0392b,stroke-width:4px,color:#7b241c",
      ),
    );
    const legend = lines.indexOf('  state "Legend" as legend {');
    assert.deepEqual(lines.slice(legend, legend + 6), [
      '  state "Legend" as legend {',
      '    state "All good" as legendGroup0',
      '    state "Breaks a rule" as legendWrong',
      "  }",
      "  class legendGroup0 group0",
      "  class legendWrong plainWrong",
    ]);
    assert.ok(lines.includes("  class r1s1 group0Wrong"));
    assert.equal(lines.filter((l) => / group0Wrong$/.test(l)).length, 1);

    const coarse = chart(
      `const W = { Open: "Window open", Closed: "Window closed" };
export const state = (v) => W[v.where];
export const group = (v) => (v.reply === "shown" ? "Reply shown" : "Waiting");
`,
      "--summary",
      "coarse.json",
    );
    assert.equal(coarse.status, 0, coarse.stderr);
    assert.deepEqual(
      coarse.stdout.split("\n").filter((l) => /^ {2}(class|classDef) /.test(l)),
      [
        "  classDef plainMixed fill:#f4f6f7,stroke:#d35400,stroke-width:4px,color:#7e5109",
        "  class legendMixed plainMixed",
        "  class s0 plainMixed",
        "  class s1 plainMixed",
      ],
    );
    const summary = JSON.parse(readFileSync(join(tlcDir, "coarse.json"), "utf8"));
    assert.deepEqual(summary.chartGroups, []);
    assert.deepEqual(summary.mixedGroups, ["Window closed", "Window open"]);

    for (const [map, error] of [
      [
        `export const group = (v) => (v.reply === "lost" ? "Breaks a rule" : "Fine");`,
        /group "Breaks a rule" has the name of a status; TLC decides the status, so name the group for what the reader sees/,
      ],
      [`export const group = () => "fixed";`, /group "fixed" has the name of a status/],
      [
        `export const group = () => "All good";\nexport const groupColors = { "All good": "#123" };`,
        /groupColors\["All good"\] "#123" is too dark for the status borders to show on it/,
      ],
      [
        `export const group = () => "All good";\nexport const groupColors = { "All good": "red" };`,
        /groupColors\["All good"\] "red" is not "#rgb" or "#rrggbb"/,
      ],
      [
        `export const group = () => "All good";\nexport const groupColors = ["#ffffff"];`,
        /groupColors must be an object from a group name to a color such as #d6eaf8/,
      ],
      [`export const group = () => 1;`, /group\(\) must return a group name or nothing; got 1/],
    ]) {
      const r = chart(`${doorMap}${map}\n`, "--regions");
      assert.equal(r.status, 1, map);
      assert.equal(r.stdout, "", map);
      assert.match(r.stderr, error);
    }
  },
);

const order = (name, note, charge) => `---- MODULE ${name} ----
EXTENDS Naturals
VARIABLES screen, charges, note
vars == <<screen, charges, note>>
Init == screen = "Cart" /\\ charges = 0 /\\ note = 0
Pay == screen = "Cart" /\\ screen' = "Paying" /\\ note' = ${note} /\\ UNCHANGED charges
Charge == screen = "Paying" /\\ charges < 2 /\\ ${charge}
Next == Pay \\/ Charge
Spec == Init /\\ [][Next]_vars
NoDoubleCharge == charges <= 1
====
`;
const chargeAgain = "charges' = charges + 1 /\\ UNCHANGED <<screen, note>>";
const chargeOnce = `IF charges = 0 THEN charges' = 1 /\\ UNCHANGED <<screen, note>> ELSE screen' = "Paid" /\\ UNCHANGED <<charges, note>>`;
const chargeFirstOnly = "charges = 0 /\\ charges' = 1 /\\ UNCHANGED <<screen, note>>";

test(
  "the fix changes a bug only at the first step that the reader sees differently",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(join(dir, "Order.tla"), order("Order", 0, chargeAgain));
    writeFileSync(join(dir, "Order.cfg"), "SPECIFICATION Spec\nINVARIANT NoDoubleCharge\n");
    const withFix = (charge, map = payMap) => {
      writeFileSync(join(dir, "Order.map.mjs"), map);
      writeFileSync(join(dir, "OrderFixed.tla"), order("OrderFixed", 1, charge));
      const r = node(
        "statechart.mjs",
        ["from-spec", "Order.tla", "--fixed", "OrderFixed.tla"],
        dir,
      );
      assert.equal(r.status, 1, r.stderr);
      const transitions = (f) =>
        parseMermaid(readFileSync(join(dir, "Order-statechart", f), "utf8")).regions.Main
          .transitions;
      return {
        story: readFileSync(join(dir, "Order-statechart", "stories.md"), "utf8"),
        fixEdges: transitions("chart.mmd")
          .filter((t) => t.label.includes("with the fix"))
          .map((t) => `${t.from} --> ${t.to} : ${t.label}`),
        bugLoops: transitions("bug-1.mmd")
          .filter((t) => t.from === t.to)
          .map((t) => `${t.from} --> ${t.to} : ${t.label}`)
          .sort(),
      };
    };
    const hidden = withFix(chargeAgain);
    assert.deepEqual(hidden.fixEdges, []);
    assert.match(
      hidden.story,
      /^With the fix you see the same states and steps, so the fix does not change this path\.$/m,
    );
    const once = withFix(chargeOnce);
    assert.deepEqual(once.fixEdges, [
      "Paying, charged --> Paid, charged : with the fix, the bank charges you",
    ]);
    assert.match(
      once.story,
      /^With the fix, step 3 \(the bank charges you\) takes you to: Paid, charged\.$/m,
    );
    const unlabeledMap = payMap.replace(
      /^export const state = .*$/m,
      "export const state = (v) => v.screen;",
    );
    const unseen = withFix(chargeOnce, unlabeledMap);
    assert.deepEqual(unseen.fixEdges, ["Paying --> Paid : with the fix, the bank charges you"]);
    assert.match(
      unseen.story,
      /^With the fix, step 3 \(the bank charges you\) takes you to: Paid\.$/m,
    );
    const blocked = withFix(chargeFirstOnly, unlabeledMap);
    assert.deepEqual(blocked.fixEdges, [
      "Paying --> Paying : with the fix, the bank charges you cannot happen at step 3 of bug 1",
    ]);
    assert.deepEqual(blocked.bugLoops, [
      "Paying --> Paying : 2, 3. the bank charges you",
      "Paying --> Paying : with the fix, the bank charges you cannot happen at step 3",
    ]);
    assert.match(
      blocked.story,
      /^With the fix, step 3 \(the bank charges you\) cannot happen, so you stay at: Paying\.$/m,
    );
  },
);

test(
  "a step that the fix cannot take keeps its own loop when the fix keeps another bug on the same state",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    const shop = (name, steps) => `---- MODULE ${name} ----
VARIABLES screen, charged, refunded, declined
vars == <<screen, charged, refunded, declined>>
Init == screen = "Cart" /\\ charged = FALSE /\\ refunded = FALSE /\\ declined = FALSE
Pay == screen = "Cart" /\\ screen' = "Paying" /\\ UNCHANGED <<charged, refunded, declined>>
${steps}
Spec == Init /\\ [][Next]_vars
NoCharge == ~charged
NoRefund == ~refunded
====
`;
    writeFileSync(
      join(dir, "Shop.tla"),
      shop(
        "Shop",
        `Charge == screen = "Paying" /\\ ~charged /\\ charged' = TRUE /\\ UNCHANGED <<screen, refunded, declined>>
Refund == screen = "Paying" /\\ ~refunded /\\ refunded' = TRUE /\\ UNCHANGED <<screen, charged, declined>>
Next == Pay \\/ Charge \\/ Refund`,
      ),
    );
    writeFileSync(
      join(dir, "ShopFixed.tla"),
      shop(
        "ShopFixed",
        `Charge == screen = "Paying" /\\ ~declined /\\ declined' = TRUE /\\ UNCHANGED <<screen, charged, refunded>>
Next == Pay \\/ Charge`,
      ),
    );
    writeFileSync(
      join(dir, "Shop.cfg"),
      "SPECIFICATION Spec\nINVARIANT NoCharge\nINVARIANT NoRefund\n",
    );
    writeFileSync(
      join(dir, "Shop.map.mjs"),
      `export const readerActions = ["Pay", "Charge", "Refund"];
export const state = (v) => v.screen;
export const step = (a, v, w) => ({ Pay: "you pay", Charge: w.charged ? "the bank charges you" : "the bank declines", Refund: "the bank refunds you" })[a];
export const cause = () => null;
`,
    );
    const r = node("statechart.mjs", ["from-spec", "Shop.tla", "--fixed", "ShopFixed.tla"], dir);
    assert.equal(r.status, 1, r.stderr);
    const loops = parseMermaid(readFileSync(join(dir, "Shop-statechart", "chart.mmd"), "utf8"))
      .regions.Main.transitions.filter((t) => t.from === t.to)
      .map((t) => t.label)
      .sort();
    assert.deepEqual(loops, [
      "the bank charges you or refunds you with the fix, the bank declines",
      "with the fix, the bank refunds you cannot happen at step 2 of bug 2",
    ]);
  },
);

test(
  "the replay on the fix skips only the steps that the story hides, so a step that the fix stops cannot happen",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(
      join(dir, "Order.tla"),
      `---- MODULE Order ----
EXTENDS Naturals
VARIABLES screen, charges
vars == <<screen, charges>>
Init == screen = "Cart" /\\ charges = 0
Pay == screen = "Cart" /\\ screen' = "Paying" /\\ UNCHANGED charges
Charge == screen = "Paying" /\\ charges < 2 /\\ charges' = charges + 1 /\\ UNCHANGED screen
Spec == Init /\\ [][Pay \\/ Charge]_vars
NoDoubleCharge == charges <= 1
====
`,
    );
    writeFileSync(
      join(dir, "OrderFixed.tla"),
      `---- MODULE OrderFixed ----
EXTENDS Naturals
VARIABLES screen, charges
vars == <<screen, charges>>
Init == screen = "Cart" /\\ charges = 0
Pay == screen = "Cart" /\\ screen' = "Paying" /\\ UNCHANGED charges
Charge == screen = "Paying" /\\ charges < 1 /\\ charges' = charges + 1 /\\ UNCHANGED screen
Refund == charges = 1 /\\ charges' = 0 /\\ UNCHANGED screen
Spec == Init /\\ [][Pay \\/ Charge \\/ Refund]_vars
NoDoubleCharge == charges <= 1
====
`,
    );
    writeFileSync(join(dir, "Order.cfg"), "SPECIFICATION Spec\nINVARIANT NoDoubleCharge\n");
    writeFileSync(join(dir, "Order.map.mjs"), "export const state = (v) => v.screen;\n");
    const r = node("statechart.mjs", ["from-spec", "Order.tla", "--fixed", "OrderFixed.tla"], dir);
    assert.equal(r.status, 1, r.stderr);
    const story = readFileSync(join(dir, "Order-statechart", "stories.md"), "utf8");
    assert.match(
      story,
      /\n0\. Start: Cart\n1\. Pay\. Now: Paying\n2\. Charge\. Now: Paying\n3\. Charge\. Now: Paying\n\nWith the fix, step 3 \(Charge\) cannot happen, so you stay at: Paying\.\n/,
    );
  },
);

const retry = (name, act, again) => `---- MODULE ${name} ----
EXTENDS Naturals
VARIABLES screen, charges, key
vars == <<screen, charges, key>>
Init == screen = "Cart" /\\ charges = 0 /\\ key = FALSE
Pay == screen = "Cart" /\\ screen' = "Paying" /\\ charges' = 1 /\\ UNCHANGED key
FetchKey == screen = "Paying" /\\ ~key /\\ key' = TRUE /\\ UNCHANGED <<screen, charges>>
${act} == screen = "Paying" /\\ ${again}
Spec == Init /\\ [][Pay \\/ FetchKey \\/ ${act}]_vars
NoDoubleCharge == charges <= 1
====
`;

test(
  "the replay takes only the trace's own steps, matches a step by its words between the same two states, and quotes the second model's words",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(
      join(dir, "Retry.tla"),
      retry(
        "Retry",
        "Retry",
        "charges < 2 /\\ charges' = charges + 1 /\\ UNCHANGED <<screen, key>>",
      ),
    );
    writeFileSync(join(dir, "Retry.cfg"), "SPECIFICATION Spec\nINVARIANT NoDoubleCharge\n");
    writeFileSync(
      join(dir, "Retry.map.mjs"),
      `export const state = (v) => v.screen;
export const step = (a, before, after) =>
  a === "Pay" ? "you pay"
  : a === "FetchKey" ? "the key arrives"
  : after.charges > before.charges ? "you retry and the bank charges you again"
  : "you retry and see the first charge";
`,
    );
    const withFix = (act, again) => {
      writeFileSync(join(dir, "RetryFixed.tla"), retry("RetryFixed", act, again));
      const r = node(
        "statechart.mjs",
        ["from-spec", "Retry.tla", "--fixed", "RetryFixed.tla"],
        dir,
      );
      assert.equal(r.status, 1, r.stderr);
      const story = readFileSync(join(dir, "Retry-statechart", "stories.md"), "utf8");
      assert.match(
        story,
        /\n0\. Start: Cart\n1\. You pay\. Now: Paying\n2\. You retry and the bank charges you again\. Now: Paying\n\n/,
      );
      return story.split("\n").find((l) => l.startsWith("With the fix"));
    };
    assert.equal(
      withFix("Retry", `key /\\ screen' = "Paid" /\\ UNCHANGED <<charges, key>>`),
      "With the fix, step 2 (you retry and the bank charges you again) cannot happen, so you stay at: Paying.",
    );
    assert.equal(
      withFix("Retry", `screen' = "Paid" /\\ UNCHANGED <<charges, key>>`),
      'With the fix, step 2 (you retry and the bank charges you again) happens as "you retry and see the first charge" and takes you to: Paid.',
    );
    assert.equal(
      withFix(
        "Recharge",
        "charges < 2 /\\ charges' = charges + 1 /\\ key' = TRUE /\\ UNCHANGED screen",
      ),
      "With the fix you see the same states and steps, so the fix does not change this path.",
    );
  },
);

const upload = (name, cache, copy) => `---- MODULE ${name} ----
EXTENDS Naturals
VARIABLES screen, cached, copies, merged
vars == <<screen, cached, copies, merged>>
Init == screen = "Picking" /\\ cached = FALSE /\\ copies = 0 /\\ merged = FALSE
Pick == screen = "Picking" /\\ screen' = "Ready" /\\ UNCHANGED <<cached, copies, merged>>
Cache == screen = "Ready" /\\ ~cached /\\ cached' = TRUE /\\ ${cache}
Upload == screen = "Ready" /\\ cached /\\ copies < 2 /\\ copies' = copies + 1 /\\ ${copy}
Spec == Init /\\ [][Pick \\/ Cache \\/ Upload]_vars
OneCopy == copies <= 1 \\/ merged
====
`;

test(
  "the replay says which hidden step goes elsewhere in the fix, and when the rule holds on the same states and steps",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    const keepCache = "UNCHANGED <<screen, copies, merged>>";
    const keepCopy = "UNCHANGED <<screen, cached, merged>>";
    writeFileSync(join(dir, "Upload.tla"), upload("Upload", keepCache, keepCopy));
    writeFileSync(join(dir, "Upload.cfg"), "SPECIFICATION Spec\nINVARIANT OneCopy\n");
    writeFileSync(join(dir, "Upload.map.mjs"), "export const state = (v) => v.screen;\n");
    const withFix = (cache, copy) => {
      writeFileSync(join(dir, "UploadFixed.tla"), upload("UploadFixed", cache, copy));
      const r = node(
        "statechart.mjs",
        ["from-spec", "Upload.tla", "--fixed", "UploadFixed.tla"],
        dir,
      );
      assert.equal(r.status, 1, r.stderr);
      const story = readFileSync(join(dir, "Upload-statechart", "stories.md"), "utf8");
      assert.match(
        story,
        /\n0\. Start: Picking\n1\. Pick\. Now: Ready\n {3}\(1 hidden step: Cache\)\n2\. Upload\. Now: Ready\n3\. Upload\. Now: Ready\n\n/,
      );
      return story.split("\n").find((l) => l.startsWith("With the fix"));
    };
    assert.equal(
      withFix(`screen' = "Cached" /\\ UNCHANGED <<copies, merged>>`, keepCopy),
      'With the fix, after step 1, "Cache" happens and takes you to: Cached.',
    );
    assert.equal(
      withFix(keepCache, "merged' = (copies = 1) /\\ UNCHANGED <<screen, cached>>"),
      "With the fix you see the same states and steps, yet the rule holds, so the state labels do not show what the fix changes.",
    );
  },
);

const notify = (name, mutedArrive) => `---- MODULE ${name} ----
EXTENDS Naturals
VARIABLES screen, muted, banner, badge, missed, msgs, syncs
vars == <<screen, muted, banner, badge, missed, msgs, syncs>>
Init == screen = "Inbox" /\\ muted = FALSE /\\ banner = FALSE /\\ badge = FALSE
        /\\ missed = FALSE /\\ msgs = 0 /\\ syncs = 0
OpenThread == screen = "Inbox" /\\ screen' = "Thread" /\\ UNCHANGED <<muted, banner, badge, missed, msgs, syncs>>
OpenSettings == screen \\in {"Inbox", "Thread"} /\\ screen' = "Settings" /\\ UNCHANGED <<muted, banner, badge, missed, msgs, syncs>>
TapBack == screen \\in {"Thread", "Settings"} /\\ screen' = "Inbox" /\\ UNCHANGED <<muted, banner, badge, missed, msgs, syncs>>
Mute == screen = "Settings" /\\ ~muted /\\ muted' = TRUE /\\ UNCHANGED <<screen, banner, badge, missed, msgs, syncs>>
Refresh == syncs < 2 /\\ syncs' = syncs + 1 /\\ UNCHANGED <<screen, muted, banner, badge, missed, msgs>>
Arrive == msgs < syncs /\\ msgs' = msgs + 1
          /\\ (IF muted THEN ${mutedArrive} ELSE banner' = TRUE /\\ UNCHANGED <<badge, missed>>)
          /\\ UNCHANGED <<screen, muted, syncs>>
Next == OpenThread \\/ OpenSettings \\/ TapBack \\/ Mute \\/ Refresh \\/ Arrive
Spec == Init /\\ [][Next]_vars
NeverMissed == ~missed
NoBannerOnThread == ~(banner /\\ screen = "Thread")
====
`;

test(
  "a step the reader does not see breaks the rule, and the fix shows it on another screen",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(
      join(dir, "Notify.tla"),
      notify("Notify", "missed' = TRUE /\\ UNCHANGED <<banner, badge>>"),
    );
    writeFileSync(
      join(dir, "NotifyBadge.tla"),
      notify("NotifyBadge", "badge' = TRUE /\\ UNCHANGED <<banner, missed>>"),
    );
    writeFileSync(
      join(dir, "Notify.cfg"),
      "SPECIFICATION Spec\nINVARIANT NeverMissed\nINVARIANT NoBannerOnThread\n",
    );
    writeFileSync(
      join(dir, "Notify.map.mjs"),
      `export const readerActions = ["OpenThread", "OpenSettings", "TapBack", "Mute", "Refresh"];
export const state = (v) => [v.screen, v.muted && "muted", v.banner && "banner", v.badge && "badge"].filter(Boolean).join(", ");
export const step = (a) => ({ OpenThread: "you open the thread", OpenSettings: "you open settings", TapBack: "you tap Back", Mute: "you mute alerts", Refresh: "you pull to refresh", Arrive: "a message arrives" })[a];
export const cause = () => null;
`,
    );
    const r = node(
      "statechart.mjs",
      ["from-spec", "Notify.tla", "--fixed", "NotifyBadge.tla", "--label", "the badge fix"],
      dir,
    );
    assert.equal(r.status, 1, r.stderr);
    const out = (f) => readFileSync(join(dir, "Notify-statechart", f), "utf8");
    const fixEdges = (f) =>
      parseMermaid(out(f))
        .regions.Main.transitions.filter((t) => t.label.includes("with the badge fix"))
        .map((t) => `${t.from} --> ${t.to} : ${t.label}`);
    const { classes } = JSON.parse(out("summary.json"));
    assert.deepEqual(
      classes.map((c) => [c.invariant, c.end, c.fix]),
      [
        ["NoBannerOnThread", "Thread, banner", "unchanged"],
        ["NeverMissed", "Settings, muted", "Settings, muted, badge"],
        ["NeverMissed", "Inbox, muted", "Inbox, muted, badge"],
        ["NeverMissed", "Settings, muted, banner", "Settings, muted, banner, badge"],
        ["NeverMissed", "Thread, muted", "Thread, muted, badge"],
        ["NoBannerOnThread", "Thread, muted, banner", "unchanged"],
        ["NeverMissed", "Inbox, muted, banner", "Inbox, muted, banner, badge"],
        ["NeverMissed", "Thread, muted, banner", "Thread, muted, banner, badge"],
        ["NoBannerOnThread", "Thread, muted, banner, badge", "new with the badge fix"],
      ],
    );
    const missed = classes.filter((c) => c.invariant === "NeverMissed");

    const story = out("stories.md");
    assert.doesNotMatch(story, /do not show what/);
    assert.match(
      story,
      /^With the badge fix, step 4 \(a message arrives\) takes you to: Settings, muted, badge\.$/m,
    );
    const settings = classes.find((c) => c.end === "Settings, muted");
    assert.deepEqual(fixEdges(`bug-${settings.n}.mmd`), [
      "Settings, muted --> Settings, muted, badge : with the badge fix, a message arrives",
    ]);
    const drawn = fixEdges("chart.mmd");
    assert.equal(new Set(drawn).size, drawn.length);
    for (const c of missed)
      assert.ok(
        drawn.includes(`${c.end} --> ${c.end}, badge : with the badge fix, a message arrives`),
        `bug ${c.n}`,
      );
  },
);

test(
  "each looping step on a bug path keeps its own label, a null cause groups bugs by end state, and the mapping names the key's colors",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(
      join(dir, "Browse.tla"),
      `---- MODULE Browse ----
EXTENDS Naturals
VARIABLES screen, looks, scrolled
vars == <<screen, looks, scrolled>>
Init == screen = "Cart" /\\ looks = 0 /\\ scrolled = FALSE
Look == screen = "Cart" /\\ looks < 3 /\\ looks' = looks + 1 /\\ UNCHANGED <<screen, scrolled>>
Scroll == screen = "Cart" /\\ looks = 1 /\\ ~scrolled /\\ scrolled' = TRUE /\\ UNCHANGED <<screen, looks>>
Pay == screen = "Cart" /\\ looks = 3 /\\ scrolled /\\ screen' = "Paying" /\\ UNCHANGED <<looks, scrolled>>
Fail == screen = "Paying" /\\ screen' = "Failed" /\\ UNCHANGED <<looks, scrolled>>
Hang == screen = "Paying" /\\ screen' = "Stuck" /\\ UNCHANGED <<looks, scrolled>>
Next == Look \\/ Scroll \\/ Pay \\/ Fail \\/ Hang
Spec == Init /\\ [][Next]_vars
NeverLost == screen \\notin {"Failed", "Stuck"}
====
`,
    );
    writeFileSync(join(dir, "Browse.cfg"), "SPECIFICATION Spec\nINVARIANT NeverLost\n");
    writeFileSync(
      join(dir, "Browse.map.mjs"),
      `export const readerActions = ["Look", "Scroll", "Pay"];
export const state = (v) => v.screen;
export const step = (a) => ({ Look: "you look", Scroll: "you scroll", Pay: "you pay", Fail: "the payment fails", Hang: "the payment hangs" })[a];
export const cause = () => null;
export const legend = { works: "Works on main", wrong: "Wrong on main" };
`,
    );
    const r = node("statechart.mjs", ["from-spec", "Browse.tla"], dir);
    assert.equal(r.status, 1, r.stderr);
    const out = (f) => readFileSync(join(dir, "Browse-statechart", f), "utf8");
    assert.deepEqual(
      JSON.parse(out("summary.json")).classes.map((c) => [c.end, c.cause]),
      [
        ["Failed", null],
        ["Stuck", null],
      ],
    );
    assert.doesNotMatch(out("stories.md"), /^Why:|null/m);
    const loops = (chart) => [...chart.matchAll(/^ {2}(s\d+) --> \1 : (.*)$/gm)].map((m) => m[2]);
    assert.deepEqual(loops(out("bug-1.mmd")), ["1. you look<br/>2. you scroll<br/>3, 4. you look"]);
    assert.deepEqual(loops(out("chart.mmd")), ["you look or you scroll"]);
    const chart = out("chart.mmd");
    assert.ok(chart.includes('state "Works on main" as legendWorks'));
    assert.ok(chart.includes('state "Wrong on main" as legendWrong'));
    assert.doesNotMatch(chart, /legendFixed/);
  },
);

test("a rule that stays broken reports only the step that broke it", needsTlc, () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(
    join(dir, "Buzz.tla"),
    `---- MODULE Buzz ----
EXTENDS Naturals
VARIABLES x, y, buzzed
vars == <<x, y, buzzed>>
Init == x = 0 /\\ y = 0 /\\ buzzed = FALSE
IncX == x < 6 /\\ x' = x + 1 /\\ UNCHANGED <<y, buzzed>>
IncY == y < 6 /\\ y' = y + 1 /\\ UNCHANGED <<x, buzzed>>
Ring == x = 2 /\\ ~buzzed /\\ buzzed' = TRUE /\\ UNCHANGED <<x, y>>
Next == IncX \\/ IncY \\/ Ring
Spec == Init /\\ [][Next]_vars
NeverBuzzed == ~buzzed
====
`,
  );
  writeFileSync(join(dir, "Buzz.cfg"), "SPECIFICATION Spec\nINVARIANT NeverBuzzed\n");
  writeFileSync(
    join(dir, "Buzz.map.mjs"),
    'export const state = (v) => (v.buzzed ? "Buzzed" : "Quiet");\nexport const step = () => "time passes";\n',
  );
  const r = node("statechart.mjs", ["from-spec", "Buzz.tla"], dir);
  assert.equal(r.status, 1, r.stderr);
  const traces = parseTraces(
    readFileSync(join(dir, "Buzz-statechart", "tlc", "Buzz-NeverBuzzed.out"), "utf8"),
  );
  assert.equal(traces.length, 7);
  for (const t of traces)
    assert.equal(
      t.steps.findIndex((s) => s.vars.buzzed),
      t.steps.length - 1,
    );
});

test("from-spec warns when steps carry the name of the whole next-state action", needsTlc, () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  const count = (next) => `---- MODULE Count ----
EXTENDS Naturals
VARIABLES x
Init == x = 0
Inc == x < 3 /\\ x' = x + 1
${next}
Spec == \\* not [][Inc]_x
        Init /\\ [][Next]_x
====
`;
  writeFileSync(join(dir, "Count.cfg"), "SPECIFICATION Spec\n");
  writeFileSync(join(dir, "Count.map.mjs"), "export const state = (v) => String(v.x);\n");
  writeFileSync(join(dir, "Count.tla"), count("Next == Inc \\/ (x = 3 /\\ x' = 0)"));
  const unnamed = node("statechart.mjs", ["from-spec", "Count.tla"], dir);
  assert.equal(unnamed.status, 0, unnamed.stderr);
  assert.match(
    unnamed.stderr,
    /^Count\.tla: 1 step has the name Next, the whole next-state action/,
  );
  writeFileSync(
    join(dir, "Count.tla"),
    count("Reset == x = 3 /\\ x' = 0\nNext == (Inc \\/ Reset) /\\ x \\in 0..3"),
  );
  const conjunct = node("statechart.mjs", ["from-spec", "Count.tla"], dir);
  assert.equal(conjunct.status, 0, conjunct.stderr);
  assert.equal(
    conjunct.stderr,
    "Count.tla: 4 steps have the name Next, the whole next-state action. TLC goes down from Next through each \\/, \\E, LET, and definition, and names each step after the last definition on that path. It stops at any other expression, such as /\\, IF, or CASE. If the reader must tell these steps apart, join a definition for each kind of step with \\/ in Next, as in Next == Pay \\/ Charge, and move each conjunct of Next into those definitions.\n",
  );
  writeFileSync(join(dir, "Count.tla"), count("Next == Inc"));
  const named = node("statechart.mjs", ["from-spec", "Count.tla"], dir);
  assert.equal(named.status, 0, named.stderr);
  assert.equal(named.stderr, "");
});

const writeLamp = (dir) => {
  writeFileSync(
    join(dir, "Lamp.tla"),
    "---- MODULE Lamp ----\nVARIABLE on\nInit == on = FALSE\nOn == on' = TRUE\nOff == on' = FALSE\nSpec == Init /\\ [][On \\/ Off]_on\n====\n",
  );
  writeFileSync(join(dir, "Lamp.cfg"), "SPECIFICATION Spec\n");
  writeFileSync(
    join(dir, "Lamp.map.mjs"),
    'export const state = (v) => (v.on ? "On" : "Off");\nexport const step = () => "you flip the switch";\n',
  );
  return join(dir, "Lamp-statechart");
};

test("a rerun without --png removes the chart.png of an earlier run", needsTlc, () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  const out = writeLamp(dir);
  mkdirSync(out);
  writeFileSync(join(out, "chart.png"), "");
  const r = node("statechart.mjs", ["from-spec", "Lamp.tla"], dir);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(
    readdirSync(out).filter((f) => f.endsWith(".png")),
    [],
  );
});

const writeSlowPay = (dir, ticks, paid = "Paid") => {
  writeFileSync(
    join(dir, "Pay.tla"),
    `---- MODULE Pay ----
EXTENDS Naturals
VARIABLES screen, charges, ticks
vars == <<screen, charges, ticks>>
Init == screen = "Cart" /\\ charges = 0 /\\ ticks = 0
TapPay == screen = "Cart" /\\ screen' = "Paying" /\\ UNCHANGED <<charges, ticks>>
Charge == screen = "Paying" /\\ charges < 2 /\\ charges' = charges + 1 /\\ UNCHANGED <<screen, ticks>>
Done == screen = "Paying" /\\ charges > 0 /\\ screen' = "${paid}" /\\ UNCHANGED <<charges, ticks>>
Tick == ticks < ${ticks} /\\ ticks' = ticks + 1 /\\ UNCHANGED <<screen, charges>>
Spec == Init /\\ [][TapPay \\/ Charge \\/ Done \\/ Tick]_vars
ChargedAtMostTwice == charges <= 2
====
`,
  );
  writeFileSync(join(dir, "Pay.cfg"), "SPECIFICATION Spec\nINVARIANT ChargedAtMostTwice\n");
  writeFileSync(
    join(dir, "Pay.map.mjs"),
    'export const state = (v) => v.screen;\nexport const step = (a) => ({ TapPay: "you tap Pay", Charge: "the charge goes through", Done: "the receipt shows" })[a] ?? "";\n',
  );
  return join(dir, "Pay-statechart");
};
const startRun = (dir, { wrap = [], env = {}, args = ["from-spec", "Pay.tla"] } = {}) => {
  const [command, ...rest] = [...wrap, process.execPath, join(scripts, "statechart.mjs"), ...args];
  const child = spawn(command, rest, {
    cwd: dir,
    env: { ...process.env, ...env },
    stdio: ["ignore", "ignore", "pipe"],
    detached: true,
  });
  let stderr = "";
  child.stderr.on("data", (d) => {
    stderr += d;
  });
  return {
    child,
    done: new Promise((done) => child.on("close", (status) => done({ status, stderr }))),
  };
};
const until = async (ready) => {
  while (!ready()) await sleep(20);
};
const ownTmp = (dir, name) => {
  const tmp = join(dir, name);
  mkdirSync(tmp);
  return tmp;
};
const tlcStarted = (tmp) => readdirSync(tmp).some((f) => f.startsWith("tlc-"));
const tlcChecking = (tmp) => {
  try {
    return readdirSync(tmp, { recursive: true }).some((f) =>
      /^tlc-[^/]+\/[^/]+\/[^/]+\.fp$/.test(f),
    );
  } catch {
    return false;
  }
};
const dumpChecking = (tmp) =>
  readdirSync(tmp).some(
    (f) => f.startsWith("statechart-") && existsSync(join(tmp, f, "tlc", "Pay.cfg")),
  ) && tlcChecking(tmp);
const staged = (dir) => readdirSync(dir).filter((f) => f.startsWith("."));

test(
  "a run whose Node is killed mid-TLC leaves the output folder as it was, and a rerun charts its own spec",
  needsTlc,
  async () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    const out = writeSlowPay(dir, 60000);
    const tmp = ownTmp(dir, "tmp");
    const first = startRun(dir, { env: { TMPDIR: tmp } });
    await until(() => tlcStarted(tmp));
    await sleep(300);
    first.child.kill("SIGTERM");
    await first.done;
    assert.doesNotThrow(() => process.kill(-first.child.pid, 0), "TLC outlives its Node");
    assert.equal(existsSync(out), false);

    writeSlowPay(dir, 200, "Receipt");
    const second = node("statechart.mjs", ["from-spec", "Pay.tla"], dir);
    try {
      process.kill(-first.child.pid, "SIGKILL");
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
    assert.equal(second.status, 0, second.stderr);
    for (const file of ["chart.mmd", join("tlc", "Pay.dot")]) {
      const text = readFileSync(join(out, file), "utf8");
      assert.match(text, /Receipt/);
      assert.doesNotMatch(text, /Paid/);
    }
    assert.deepEqual(staged(dir), []);
  },
);

const changedMidRun = async ({ wrap = [], env = {} }) => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  const out = writeSlowPay(dir, 20000);
  const tmp = ownTmp(dir, "tmp-a");
  const first = startRun(dir, { wrap, env: { ...env, TMPDIR: tmp } });
  await until(() => dumpChecking(tmp));
  writeSlowPay(dir, 20000, "Receipt");
  const second = startRun(dir, { wrap, env: { ...env, TMPDIR: ownTmp(dir, "tmp-b") } });
  const [paid, receipt] = await Promise.all([first.done, second.done]);
  assert.equal(receipt.status, 0, receipt.stderr);
  assert.equal(paid.status, 2, paid.stderr);
  const [, kept] = paid.stderr.match(
    /^Pay\.tla changed while this run read it, so the run left Pay-statechart as it was\. Run the command again\. The files that this run wrote are in (tmp-a\/statechart-\w+)\.\n$/,
  );
  assert.match(readFileSync(join(dir, kept, "chart.mmd"), "utf8"), /Paid/);
  const chart = readFileSync(join(out, "chart.mmd"), "utf8");
  assert.match(chart, /Receipt/);
  assert.doesNotMatch(chart, /Paid/);
  assert.deepEqual(staged(dir), []);
};

test(
  "a run whose spec changes while it reads it leaves the output folder, and the run that read the new spec charts it",
  needsTlc,
  () => changedMidRun({}),
);

test(
  "a run whose inputs get new times and a new inode but the same content still charts them",
  needsTlc,
  async () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    const out = writeSlowPay(dir, 20000);
    const tmp = ownTmp(dir, "tmp");
    const run = startRun(dir, { env: { TMPDIR: tmp } });
    await until(() => tlcStarted(tmp));
    await sleep(500);
    const later = new Date(Date.now() + 60_000);
    for (const name of ["Pay.tla", "Pay.cfg", "Pay.map.mjs"]) {
      const file = join(dir, name);
      const before = statSync(file);
      writeFileSync(`${file}.new`, readFileSync(file));
      renameSync(`${file}.new`, file);
      utimesSync(file, later, later);
      const after = statSync(file);
      assert.notEqual(after.ino, before.ino);
      assert.notEqual(after.ctimeMs, before.ctimeMs);
    }
    const r = await run.done;
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stderr, "");
    assert.match(readFileSync(join(out, "chart.mmd"), "utf8"), /Paid/);
    assert.deepEqual(staged(dir), []);
  },
);

const unshare = ["unshare", "--user", "--map-root-user", "--pid", "--fork", "--mount-proc"];
const hidePidNamespace = `#define _GNU_SOURCE
#include <dlfcn.h>
#include <errno.h>
#include <string.h>
#include <unistd.h>
ssize_t readlink(const char *path, char *buf, size_t size) {
  static ssize_t (*real)(const char *, char *, size_t);
  if (!real) real = dlsym(RTLD_NEXT, "readlink");
  if (path && strcmp(path, "/proc/self/ns/pid") == 0) { errno = EIO; return -1; }
  return real(path, buf, size);
}
`;
const hidingPreload = (() => {
  if (spawnSync(unshare[0], [...unshare.slice(1), "true"]).status !== 0) return null;
  const dir = mkdtempSync(join(tmpdir(), "statechart-preload-"));
  writeFileSync(join(dir, "hide.c"), hidePidNamespace);
  const so = join(dir, "hide.so");
  const cc = spawnSync("cc", ["-shared", "-fPIC", "-o", so, join(dir, "hide.c"), "-ldl"]);
  return cc.status === 0 ? so : null;
})();
test(
  "runs in PID namespaces that hide which namespace they are in chart only their own spec",
  {
    skip:
      needsTlc.skip ||
      (!hidingPreload && "cannot make a PID namespace, or cannot compile a readlink preload"),
  },
  () => changedMidRun({ wrap: unshare, env: { LD_PRELOAD: hidingPreload } }),
);

test(
  "a file that is put in the output folder during a run stays, and the run exits 2",
  needsTlc,
  async () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    const out = writeSlowPay(dir, 20000);
    const tmp = ownTmp(dir, "tmp");
    const run = startRun(dir, { env: { TMPDIR: tmp } });
    await until(() => tlcStarted(tmp));
    mkdirSync(out);
    writeFileSync(join(out, "notes.md"), "mine\n");
    const r = await run.done;
    assert.equal(r.status, 2);
    assert.match(
      r.stderr,
      /^Pay-statechart has a file that this command did not write: notes\.md\. A run puts its files in place of the whole output folder, so pass --out with a new folder\. The files that this run wrote are in tmp\/statechart-\w+\.\n$/,
    );
    assert.deepEqual(readdirSync(out), ["notes.md"]);
    assert.deepEqual(staged(dir), []);
  },
);

const failRenames = `#define _GNU_SOURCE
#include <dirent.h>
#include <dlfcn.h>
#include <errno.h>
#include <ftw.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>
static size_t hits;
static int raced;
static int removeOne(const char *path, const struct stat *s, int type, struct FTW *at) {
  return remove(path);
}
static int hasFiles(const char *dir) {
  DIR *d = opendir(dir);
  if (!d) return 0;
  struct dirent *e;
  int found = 0;
  while (!found && (e = readdir(d))) found = strcmp(e->d_name, ".") && strcmp(e->d_name, "..");
  closedir(d);
  return found;
}
static int named(const char *path, const char *tail) {
  size_t n = strlen(path), t = strlen(tail);
  return n >= t && strcmp(path + n - t, tail) == 0 && (n == t || path[n - t - 1] == '/');
}
static void makeAnotherRunsFolder(const char *shared) {
  static int (*make)(const char *, mode_t);
  if (!make) make = dlsym(RTLD_NEXT, "mkdir");
  char chart[4096];
  make(shared, 0777);
  snprintf(chart, sizeof chart, "%s/chart.mmd", shared);
  FILE *f = fopen(chart, "w");
  fputs("another run\\n", f);
  fclose(f);
}
static int chosen(const char *race) {
  const char *run = getenv("ANOTHER_RUN");
  return run && !raced && strcmp(run, race) == 0;
}
static int racing(const char *race) {
  return chosen(race) && (raced = 1);
}
static void takeOver(const char *shared) {
  rmdir(shared);
  makeAnotherRunsFolder(shared);
}
int mkdir(const char *path, mode_t mode) {
  static int (*real)(const char *, mode_t);
  static int (*move)(const char *, const char *);
  if (!real) real = dlsym(RTLD_NEXT, "mkdir");
  if (!move) move = dlsym(RTLD_NEXT, "rename");
  if (named(path, "shared") && racing("before-copy")) makeAnotherRunsFolder(path);
  if (named(path, "shared") && chosen("when-made")) {
    int made = real(path, mode);
    if (made == 0 && racing("when-made")) takeOver(path);
    return made;
  }
  if (named(path, "shared/tlc") && racing("during-copy")) {
    char shared[4096], aside[4200];
    snprintf(shared, sizeof shared, "%.*s", (int)(strlen(path) - strlen("/tlc")), path);
    snprintf(aside, sizeof aside, "%s-aside", shared);
    move(shared, aside);
    makeAnotherRunsFolder(shared);
    real(path, mode);
  }
  if (named(path, "shared/tlc") && racing("removed-during-copy")) {
    char shared[4096];
    snprintf(shared, sizeof shared, "%.*s", (int)(strlen(path) - strlen("/tlc")), path);
    nftw(shared, removeOne, 16, FTW_DEPTH | FTW_PHYS);
    real(shared, 0777);
  }
  return real(path, mode);
}
int rename(const char *from, const char *to) {
  static int (*real)(const char *, const char *);
  if (!real) real = dlsym(RTLD_NEXT, "rename");
  const char *base = strrchr(to, '/'), *fails = getenv("RENAME_FAILS");
  const char *cannot = getenv("RENAME_CANNOT");
  base = base ? base + 1 : to;
  if (named(to, "shared") && !hasFiles(from) && racing("before-copy")) makeAnotherRunsFolder(to);
  if (cannot && strstr(base, "shared") && hasFiles(from)) {
    errno = strcmp(cannot, "EXDEV") == 0 ? EXDEV : access(to, F_OK) == 0 ? EISDIR : ENOSYS;
    return -1;
  }
  if (fails && strcmp(base, "shared") == 0 && hits < strlen(fails)) {
    errno = fails[hits++] == 'N' ? ENOTEMPTY : EIO;
    return -1;
  }
  int renamed = real(from, to);
  if (renamed == 0 && named(to, "shared") && racing("when-made")) takeOver(to);
  return renamed;
}
`;
const failingRenames = (() => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-preload-"));
  writeFileSync(join(dir, "rename.c"), failRenames);
  const so = join(dir, "rename.so");
  const cc = spawnSync("cc", ["-shared", "-fPIC", "-o", so, join(dir, "rename.c"), "-ldl"]);
  return cc.status === 0 ? so : null;
})();
test(
  "a run whose rename fails after it moves the output folder aside puts the folder back, or says where it is",
  { skip: needsTlc.skip || (!failingRenames && "cannot compile a rename preload") },
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeLamp(dir);
    const args = ["from-spec", "Lamp.tla", "--out", "shared"];
    const shared = join(dir, "shared");
    const first = node("statechart.mjs", args, dir);
    assert.equal(first.status, 0, first.stderr);
    const chart = readFileSync(join(shared, "chart.mmd"), "utf8");
    const run = (fails) =>
      node("statechart.mjs", args, dir, { LD_PRELOAD: failingRenames, RENAME_FAILS: fails });

    const back = run("NI");
    assert.equal(back.status, 2, back.stderr);
    const [, kept] = back.stderr.match(
      /^cannot replace shared: EIO: .*\. The run left shared as it was\. The files that this run wrote are in (\/\S+)\.\n$/,
    );
    assert.equal(readFileSync(join(kept, "chart.mmd"), "utf8"), chart);
    assert.equal(readFileSync(join(shared, "chart.mmd"), "utf8"), chart);
    assert.deepEqual(staged(dir), []);

    const stuck = run("NII");
    assert.equal(stuck.status, 2, stuck.stderr);
    const named = stuck.stderr.match(
      /^cannot replace shared: EIO: .*\. This run moved the previous shared to (\.shared-\w+-old) and could not put it back\. The files that this run wrote are in \/\S+\.\n$/,
    );
    assert.ok(named, stuck.stderr);
    const aside = named[1];
    assert.equal(existsSync(shared), false);
    assert.equal(readFileSync(join(dir, aside, "chart.mmd"), "utf8"), chart);
    assert.deepEqual(staged(dir), [aside]);
  },
);

test(
  "a run on a filesystem that cannot rename copies its files into place",
  { skip: needsTlc.skip || (!failingRenames && "cannot compile a rename preload") },
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeLamp(dir);
    const args = ["from-spec", "Lamp.tla", "--out", "shared"];
    for (const [cannot, label] of [
      ["ENOSYS", "you flip the switch"],
      ["EXDEV", "you press the switch"],
      ["ENOSYS", "you tap the switch"],
    ]) {
      writeFileSync(
        join(dir, "Lamp.map.mjs"),
        `export const state = (v) => (v.on ? "On" : "Off");\nexport const step = () => "${label}";\n`,
      );
      const r = node("statechart.mjs", args, dir, {
        LD_PRELOAD: failingRenames,
        RENAME_CANNOT: cannot,
      });
      assert.equal(r.status, 0, r.stderr);
      assert.match(readFileSync(join(dir, "shared", "chart.mmd"), "utf8"), new RegExp(label));
      assert.deepEqual(staged(dir), []);
    }
  },
);

test(
  "a run that cannot rename replaces a folder that another run makes before its copy, and keeps one that another run makes during its copy",
  { skip: needsTlc.skip || (!failingRenames && "cannot compile a rename preload") },
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeLamp(dir);
    const shared = join(dir, "shared", "chart.mmd");
    const run = (anotherRun) =>
      node("statechart.mjs", ["from-spec", "Lamp.tla", "--out", "shared"], dir, {
        LD_PRELOAD: failingRenames,
        RENAME_CANNOT: "ENOSYS",
        ANOTHER_RUN: anotherRun,
      });

    const before = run("before-copy");
    assert.equal(before.status, 0, before.stderr);
    assert.match(readFileSync(shared, "utf8"), /you flip the switch/);
    assert.deepEqual(staged(dir), []);

    const during = run("during-copy");
    assert.equal(during.status, 2, during.stderr);
    const named = during.stderr.match(
      /^cannot replace shared: \S*EEXIST\S*: .*\. This run moved the previous shared to (\.shared-\w+-old) and could not put it back\. The files that this run wrote are in \/\S+\.\n$/,
    );
    assert.ok(named, during.stderr);
    assert.equal(readFileSync(shared, "utf8"), "another run\n");
    assert.deepEqual(readdirSync(join(dir, "shared", "tlc")), []);
    assert.match(readFileSync(join(dir, named[1], "chart.mmd"), "utf8"), /you flip the switch/);
    assert.deepEqual(staged(dir), [named[1]]);
  },
);

test(
  "a run that cannot rename stops when another run removes its folder during its copy and makes an empty one in its place, and keeps that folder",
  { skip: needsTlc.skip || (!failingRenames && "cannot compile a rename preload") },
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeLamp(dir);
    const r = node("statechart.mjs", ["from-spec", "Lamp.tla", "--out", "shared"], dir, {
      LD_PRELOAD: failingRenames,
      RENAME_CANNOT: "ENOSYS",
      ANOTHER_RUN: "removed-during-copy",
    });
    assert.equal(r.status, 2, r.stderr);
    assert.match(
      r.stderr,
      /^cannot replace shared: another run replaced the folder during the copy\. The run left shared as it was\. The files that this run wrote are in \/\S+\.\n$/,
    );
    assert.ok(existsSync(join(dir, "shared")));
    assert.deepEqual(staged(dir), []);
  },
);

test(
  "a run that cannot rename keeps the folder that another run puts in place of its folder as soon as the run makes it",
  { skip: needsTlc.skip || (!failingRenames && "cannot compile a rename preload") },
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeLamp(dir);
    const r = node("statechart.mjs", ["from-spec", "Lamp.tla", "--out", "shared"], dir, {
      LD_PRELOAD: failingRenames,
      RENAME_CANNOT: "ENOSYS",
      ANOTHER_RUN: "when-made",
    });
    assert.equal(r.status, 2, r.stderr);
    assert.match(
      r.stderr,
      /^cannot replace shared: \S*EEXIST\S*: .*\. The run left shared as it was\. The files that this run wrote are in \/\S+\.\n$/,
    );
    assert.equal(readFileSync(join(dir, "shared", "chart.mmd"), "utf8"), "another run\n");
    assert.deepEqual(staged(dir), []);
  },
);

test(
  "a run whose input changes before --png renders stops before it renders, and keeps its files",
  { skip: needsTlc.skip || needsPng.skip },
  async () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeSlowPay(dir, 20000);
    const rendered = join(dir, "rendered");
    const tmp = ownTmp(dir, "tmp");
    const run = startRun(dir, {
      args: ["from-spec", "Pay.tla", "--png"],
      env: {
        TMPDIR: tmp,
        XDG_CACHE_HOME: fakeRenderer(),
        RENDERED: rendered,
        TLA2TOOLS: tools.jar,
        JAVA: tools.java,
      },
    });
    await until(() => tlcStarted(tmp));
    const map = join(dir, "Pay.map.mjs");
    writeFileSync(map, `${readFileSync(map, "utf8")}// edited\n`);
    const r = await run.done;
    assert.equal(r.status, 2, r.stderr);
    const [, kept] = r.stderr.match(
      /^Pay\.map\.mjs changed while this run read it, so the run left Pay-statechart as it was\. Run the command again\. The files that this run wrote are in (tmp\/statechart-\w+)\.\n$/,
    );
    assert.ok(existsSync(join(dir, kept, "chart.mmd")));
    assert.equal(existsSync(rendered), false);
  },
);

const writeCount = (dir) => {
  writeFileSync(
    join(dir, "Count.tla"),
    "---- MODULE Count ----\nEXTENDS Naturals, \\* the bound\n  Limits\nVARIABLE n\nInit == n = 0\nUp == n < Max /\\ n' = n + 1\nNext == Up\nSpec == Init /\\ [][Next]_n\nSmall == n <= 2\nLast == n <= 2\n====\n",
  );
  writeFileSync(join(dir, "Limits.tla"), "---- MODULE Limits ----\nMax == 2\n====\n");
  writeFileSync(join(dir, "Count.cfg"), "SPECIFICATION Spec\nINVARIANT Small\nINVARIANT Last\n");
  writeFileSync(join(dir, "labels.mjs"), 'export const up = "you add one";\n');
  writeFileSync(
    join(dir, "Count.map.mjs"),
    'import { up } from "./labels.mjs";\nexport const state = (v) => `count ${v.n}`;\nexport const step = () => up;\n',
  );
  return join(dir, "Count-statechart");
};
const EDIT_DURING_TLC = `#!/bin/sh
case "$*" in
*Count-Small.cfg*) cp "$EDITED" "$TARGET";;
*Count-Last.cfg*) [ -z "$RESTORE" ] || cp "$RESTORE" "$TARGET";;
esac
exec "$REAL_JAVA" "$@"
`;
const editDuringTlc = (file, edit, putBack) => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  const out = writeCount(dir);
  const side = ownTmp(dir, "side");
  const target = join(dir, file);
  writeFileSync(join(side, "edited"), edit(readFileSync(target, "utf8")));
  writeFileSync(join(side, "original"), readFileSync(target));
  writeFileSync(join(side, "java"), EDIT_DURING_TLC, { mode: 0o755 });
  const r = node("statechart.mjs", ["from-spec", "Count.tla"], dir, {
    JAVA: join(side, "java"),
    TLA2TOOLS: tools.jar,
    REAL_JAVA: tools.java,
    TARGET: target,
    EDITED: join(side, "edited"),
    RESTORE: putBack ? join(side, "original") : "",
  });
  return { r, out };
};

test(
  "a spec or a module it EXTENDS that changes during a run and changes back gets the results of the files that the run started with",
  needsTlc,
  () => {
    for (const [file, edit] of [
      ["Count.tla", (s) => s.replace("n < Max", "n < 5")],
      ["Limits.tla", (s) => s.replace("Max == 2", "Max == 5")],
    ]) {
      const { r, out } = editDuringTlc(file, edit, true);
      assert.equal(r.status, 0, `${file}: ${r.stdout}${r.stderr}`);
      assert.match(r.stdout, /^ {2}Small holds\.\n {2}Last holds\.$/m, file);
      assert.match(r.stdout, /^No state breaks an INVARIANT rule\.$/m, file);
      assert.ok(existsSync(join(out, "chart.mmd")), file);
    }
  },
);

test(
  "a module that the spec EXTENDS or a file that the map imports, changed during a run, stops the run with exit 2",
  needsTlc,
  () => {
    for (const [file, edit] of [
      ["Limits.tla", (s) => s.replace("Max == 2", "Max == 5")],
      ["labels.mjs", (s) => s.replace("one", "two")],
    ]) {
      const { r, out } = editDuringTlc(file, edit, false);
      assert.equal(r.status, 2, `${file}: ${r.stdout}${r.stderr}`);
      assert.match(
        r.stderr,
        new RegExp(
          `^${file.replace(".", "\\.")} changed while this run read it, so the run left Count-statechart as it was\\. Run the command again\\. The files that this run wrote are in \\S+\\.\\n$`,
        ),
      );
      assert.equal(existsSync(out), false, file);
    }
  },
);

test("a copy keeps the folders of its input under the snapshot folder, on a Windows drive or share too", () => {
  assert.equal(copyPath("/tmp/r", "/home/u/Count.tla", posix), "/tmp/r/home/u/Count.tla");
  assert.equal(
    copyPath("C:\\Temp\\r", "C:\\Users\\u\\Count.tla", win32),
    "C:\\Temp\\r\\C\\Users\\u\\Count.tla",
  );
  assert.equal(
    copyPath("C:\\Temp\\r", "\\\\host\\share\\Count.tla", win32),
    "C:\\Temp\\r\\hostshare\\Count.tla",
  );
});

test(
  "a rule that TLC finds broken before TLC stops on an error is broken, and the run draws the paths TLC printed",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(
      join(dir, "Pay.tla"),
      pay(
        "Pay",
        `screen = "Paying" /\\ charges < 2 /\\ charges' = charges + 1 /\\ UNCHANGED screen`,
      ),
    );
    writeFileSync(join(dir, "Pay.cfg"), "SPECIFICATION Spec\nINVARIANT NoDoubleCharge\n");
    writeFileSync(join(dir, "Pay.map.mjs"), payMap);
    writeFileSync(
      join(dir, "crash.txt"),
      `Error: Invariant NoDoubleCharge is violated.\n${tlcThrew(
        "java.lang.ArrayIndexOutOfBoundsException",
        "Index 123 out of bounds for length 4",
      ).replaceAll("Small", "NoDoubleCharge")}\n${stoppedEarly}`,
    );
    const java = join(dir, "java");
    writeFileSync(
      java,
      `#!/bin/sh
"$REAL_JAVA" "$@" > "$0.$$.out"; s=$?
if grep -q '^Error: Invariant' "$0.$$.out"; then
  sed '/^Model checking completed/,$d' "$0.$$.out"; cat "$CRASH"; s=75
else
  cat "$0.$$.out"
fi
rm "$0.$$.out"
exit $s
`,
      { mode: 0o755 },
    );
    const r = node(
      "statechart.mjs",
      ["from-spec", "Pay.tla", "--expect-broken", "NoDoubleCharge"],
      dir,
      { JAVA: java, TLA2TOOLS: tools.jar, REAL_JAVA: tools.java, CRASH: join(dir, "crash.txt") },
    );
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^ {2}NoDoubleCharge is broken \(expected\)\.$/m);
    assert.match(
      r.stderr,
      /^Pay-statechart\/tlc\/Pay-NoDoubleCharge\.out: TLC found that NoDoubleCharge is broken, and then stopped on an error: java\.lang\.ArrayIndexOutOfBoundsException: Index 123 out of bounds for length 4\. The paths that TLC printed before it stopped are complete, but TLC did not check every state, so the charts can miss states that break NoDoubleCharge\. A smaller constant can let TLC finish\.$/m,
    );
    assert.match(r.stdout, /^## 1\. Paying, charged twice$/m);
  },
);

test(
  "each TLC run writes the standard modules in its own temp folder, so overlapping runs cannot rewrite them under each other",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeSlowPay(dir, 0);
    const tmp = ownTmp(dir, "tmp");
    const log = join(dir, "java.log");
    const java = join(dir, "java");
    writeFileSync(
      java,
      `#!/bin/sh
for a; do case "$a" in -Djava.io.tmpdir=*) t="\${a#-Djava.io.tmpdir=}";; esac; done
"$REAL_JAVA" "$@" > "$LOG.$$"; s=$?
cat "$LOG.$$"
echo "$t: $(grep 'Naturals.tla' "$LOG.$$")" >> "$LOG"
rm "$LOG.$$"
exit $s
`,
      { mode: 0o755 },
    );
    const r = node("statechart.mjs", ["from-spec", "Pay.tla"], dir, {
      JAVA: java,
      TLA2TOOLS: tools.jar,
      REAL_JAVA: tools.java,
      LOG: log,
      TMPDIR: tmp,
    });
    assert.equal(r.status, 0, r.stderr);
    const runs = readFileSync(log, "utf8").trim().split("\n");
    assert.ok(runs.length > 0);
    const folders = new Set();
    for (const line of runs) {
      const [folder, parsed] = line.split(": ");
      assert.ok(folder.startsWith(join(tmp, "tlc-")), line);
      assert.ok(parsed.startsWith(`Parsing file ${folder}/`), line);
      folders.add(folder);
    }
    assert.equal(folders.size, runs.length);
  },
);

test(
  "a run that TLC stops on an error keeps TLC's output and writes no output folder",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(
      join(dir, "Pay.tla"),
      "---- MODULE Pay ----\nVARIABLE x\nASSUME FALSE\nInit == x = 0\nSpec == Init /\\ [][x' = x]_x\n====\n",
    );
    writeFileSync(join(dir, "Pay.cfg"), "SPECIFICATION Spec\n");
    writeFileSync(join(dir, "Pay.map.mjs"), 'export const state = () => "Cart";\n');
    const tmp = ownTmp(dir, "tmp");
    const r = node("statechart.mjs", ["from-spec", "Pay.tla"], dir, { TMPDIR: tmp });
    assert.equal(r.status, 2);
    const [, file] = r.stderr.match(
      /^(\S+\/tlc\/Pay\.out): TLC stopped on an error that is not a broken rule: Assumption .* is false\.\n$/,
    );
    assert.ok(file.startsWith(tmp), file);
    assert.match(readFileSync(file, "utf8"), /Assumption .* is false/);
    assert.equal(existsSync(join(dir, "Pay-statechart")), false);
  },
);

test(
  "a state graph too large for one string prints the rule results, keeps TLC's output, and draws no chart",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(
      join(dir, "Pay.tla"),
      pay(
        "Pay",
        `screen = "Paying" /\\ charges < 2 /\\ charges' = charges + 1 /\\ UNCHANGED screen`,
      ),
    );
    writeFileSync(join(dir, "Pay.cfg"), "SPECIFICATION Spec\nINVARIANT NoDoubleCharge\n");
    writeFileSync(join(dir, "Pay.map.mjs"), payMap);
    const java = join(dir, "java");
    writeFileSync(
      java,
      `#!/bin/sh
"$REAL_JAVA" "$@"; s=$?
while [ $# -gt 0 ]; do
  [ "$1" = -dump ] && "$NODE" -e 'require("fs").truncateSync(process.argv[1], +process.argv[2])' "$3" "$SIZE"
  shift
done
exit $s
`,
      { mode: 0o755 },
    );
    const tmp = ownTmp(dir, "tmp");
    const r = node(
      "statechart.mjs",
      ["from-spec", "Pay.tla", "--expect-broken", "NoDoubleCharge"],
      dir,
      {
        JAVA: java,
        TLA2TOOLS: tools.jar,
        REAL_JAVA: tools.java,
        NODE: process.execPath,
        SIZE: String(constants.MAX_STRING_LENGTH + 1),
        TMPDIR: tmp,
      },
    );
    assert.equal(r.status, 2, r.stderr);
    assert.match(r.stdout, /^ {2}NoDoubleCharge is broken \(expected\)\.$/m);
    const [, kept] = r.stderr.match(
      /^Pay\.tla: TLC's state graph has [\d,]+ bytes, more than the [\d,]+ that the command can read, so it draws no chart\. The rule results above stand\. Smaller constants make a smaller graph\. The files that this run wrote are in (tmp\/statechart-\w+)\.\n$/,
    );
    assert.match(
      readFileSync(join(dir, kept, "tlc", "Pay-NoDoubleCharge.out"), "utf8"),
      /^Error: Invariant NoDoubleCharge is violated/m,
    );
    assert.equal(existsSync(join(dir, "Pay-statechart")), false);
    rmSync(dir, { recursive: true, force: true });
  },
);

test(
  "a graph dump that grows past one string is stopped, and the rule results stay",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(
      join(dir, "Pay.tla"),
      pay(
        "Pay",
        `screen = "Paying" /\\ charges < 2 /\\ charges' = charges + 1 /\\ UNCHANGED screen`,
      ),
    );
    writeFileSync(join(dir, "Pay.cfg"), "SPECIFICATION Spec\nINVARIANT NoDoubleCharge\n");
    writeFileSync(join(dir, "Pay.map.mjs"), payMap);
    const pid = join(dir, "dump.pid");
    const java = join(dir, "java");
    writeFileSync(
      java,
      `#!/bin/sh
for a; do [ "$a" = -dump ] && dumping=1; done
[ -z "$dumping" ] && exec "$REAL_JAVA" "$@"
while [ "$1" != -dump ]; do shift; done
printf 'TLC2 Version 2.19\\n'
"$NODE" -e 'require("fs").writeFileSync(process.argv[1], ""); require("fs").truncateSync(process.argv[1], +process.argv[2])' "$3" "$SIZE"
echo $$ > "$PID"
exec sleep 20
`,
      { mode: 0o755 },
    );
    const tmp = ownTmp(dir, "tmp");
    const r = node(
      "statechart.mjs",
      ["from-spec", "Pay.tla", "--expect-broken", "NoDoubleCharge"],
      dir,
      {
        JAVA: java,
        TLA2TOOLS: tools.jar,
        REAL_JAVA: tools.java,
        NODE: process.execPath,
        SIZE: String(constants.MAX_STRING_LENGTH + 1),
        PID: pid,
        TMPDIR: tmp,
      },
    );
    assert.equal(r.status, 2, r.stderr);
    assert.match(r.stdout, /^ {2}NoDoubleCharge is broken \(expected\)\.$/m);
    const [, kept] = r.stderr.match(
      /^Pay\.tla: TLC's state graph passed [\d,]+ bytes, the most that the command can read, so the command stopped TLC and draws no chart\. The rule results above stand\. Smaller constants make a smaller graph\. The files that this run wrote are in (tmp\/statechart-\w+)\.\n$/,
    );
    assert.throws(() => process.kill(Number(readFileSync(pid, "utf8")), 0), { code: "ESRCH" });
    assert.match(
      readFileSync(join(dir, kept, "tlc", "Pay-NoDoubleCharge.out"), "utf8"),
      /^Error: Invariant NoDoubleCharge is violated/m,
    );
    assert.equal(existsSync(join(dir, "Pay-statechart")), false);
    rmSync(dir, { recursive: true, force: true });
  },
);

test("TLC output that grows past one string stops TLC, and the command exits 2", needsTlc, () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(
    join(dir, "Pay.tla"),
    pay("Pay", `screen = "Paying" /\\ charges < 2 /\\ charges' = charges + 1 /\\ UNCHANGED screen`),
  );
  writeFileSync(join(dir, "Pay.cfg"), "SPECIFICATION Spec\nINVARIANT NoDoubleCharge\n");
  writeFileSync(join(dir, "Pay.map.mjs"), payMap);
  const pid = join(dir, "tlc.pid");
  const java = join(dir, "java");
  writeFileSync(
    java,
    `#!/bin/sh
echo $$ > "$PID"
exec "$NODE" -e '
const size = +process.argv[1];
const chunk = "x".repeat(1 << 16);
let sent = 0;
process.stdout.write("TLC2 Version 2.19\\n");
(function more() {
  while (sent <= size) {
    sent += chunk.length;
    if (!process.stdout.write(chunk)) return process.stdout.once("drain", more);
  }
  setTimeout(() => {}, 20000);
})();
' "$SIZE"
`,
    { mode: 0o755 },
  );
  const tmp = ownTmp(dir, "tmp");
  const r = node("statechart.mjs", ["from-spec", "Pay.tla"], dir, {
    JAVA: java,
    TLA2TOOLS: tools.jar,
    NODE: process.execPath,
    SIZE: String(constants.MAX_STRING_LENGTH),
    PID: pid,
    TMPDIR: tmp,
  });
  assert.equal(r.status, 2, r.stderr);
  const [, out] = r.stderr.match(
    /^(\/\S+\/tlc\/Pay-NoDoubleCharge\.out): TLC printed more than [\d,]+ characters, the most that the command can read, so the command stopped TLC\. Smaller constants make TLC print less\.\n$/,
  );
  assert.throws(() => process.kill(Number(readFileSync(pid, "utf8")), 0), { code: "ESRCH" });
  assert.equal(existsSync(out), true);
  assert.equal(existsSync(join(dir, "Pay-statechart")), false);
  rmSync(dir, { recursive: true, force: true });
});

test(
  "the rule results print before the graph dump, and stay when TLC stops on an error in the dump",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(
      join(dir, "Pay.tla"),
      pay(
        "Pay",
        `screen = "Paying" /\\ charges < 2 /\\ charges' = charges + 1 /\\ UNCHANGED screen`,
      ),
    );
    writeFileSync(join(dir, "Pay.cfg"), "SPECIFICATION Spec\nINVARIANT NoDoubleCharge\n");
    writeFileSync(join(dir, "Pay.map.mjs"), payMap);
    const java = join(dir, "java");
    writeFileSync(
      java,
      `#!/bin/sh
for a; do
  if [ "$a" = -dump ]; then
    printf 'TLC2 Version 2.19\\nError: TLC threw an unexpected exception.\\n'
    exit 1
  fi
done
exec "$REAL_JAVA" "$@"
`,
      { mode: 0o755 },
    );
    const tmp = ownTmp(dir, "tmp");
    const r = node(
      "statechart.mjs",
      ["from-spec", "Pay.tla", "--expect-broken", "NoDoubleCharge"],
      dir,
      { JAVA: java, TLA2TOOLS: tools.jar, REAL_JAVA: tools.java, TMPDIR: tmp },
    );
    assert.equal(r.status, 2, r.stderr);
    assert.match(r.stdout, /^ {2}NoDoubleCharge is broken \(expected\)\.$/m);
    const [, kept] = r.stderr.match(
      /^(\/\S+)\/tlc\/Pay\.out: TLC stopped on an error that is not a broken rule: TLC threw an unexpected exception\.$/m,
    );
    assert.match(
      readFileSync(join(kept, "tlc", "Pay-NoDoubleCharge.out"), "utf8"),
      /^Error: Invariant NoDoubleCharge is violated/m,
    );
    rmSync(dir, { recursive: true, force: true });
  },
);

test(
  "an error after TLC runs keeps TLC's output, and the message names its folder",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(
      join(dir, "Pay.tla"),
      pay(
        "Pay",
        `screen = "Paying" /\\ charges < 2 /\\ charges' = charges + 1 /\\ UNCHANGED screen`,
      ),
    );
    writeFileSync(join(dir, "Pay.cfg"), "SPECIFICATION Spec\nINVARIANT NoDoubleCharge\n");
    writeFileSync(
      join(dir, "Pay.map.mjs"),
      payMap.replace(
        /^export const state = .*$/m,
        `export const state = () => { throw new Error("the map cannot read this state"); };`,
      ),
    );
    const r = node("statechart.mjs", ["from-spec", "Pay.tla"], dir, {
      TMPDIR: ownTmp(dir, "tmp"),
    });
    assert.equal(r.status, 2, r.stderr);
    const [, kept] = r.stderr.match(
      / The files that this run wrote are in (tmp\/statechart-\w+)\.\n$/,
    );
    assert.match(
      readFileSync(join(dir, kept, "tlc", "Pay-NoDoubleCharge.out"), "utf8"),
      /^Error: Invariant NoDoubleCharge is violated/m,
    );
    assert.equal(existsSync(join(dir, "Pay-statechart")), false);
    rmSync(dir, { recursive: true, force: true });
  },
);

test(
  "runs of two specs that overlap on one output folder all finish, and the folder always holds one run's files",
  needsTlc,
  async () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    const out = writeSlowPay(dir, 400);
    writeLamp(dir);
    const pay = ["from-spec", "Pay.tla", "--out", "shared"];
    const lamp = ["from-spec", "Lamp.tla", "--out", "shared"];
    const alone = {};
    for (const args of [pay, lamp]) {
      const solo = join(dir, `${args[1]}-alone`);
      const r = node("statechart.mjs", [...args.slice(0, 2), "--out", solo], dir);
      assert.equal(r.status, 0, r.stderr);
      alone[args[1]] = {
        top: readdirSync(solo).sort().join(),
        tlc: readdirSync(join(solo, "tlc")).sort().join(),
        chart: readFileSync(join(solo, "chart.mmd"), "utf8"),
        summary: readFileSync(join(solo, "summary.json"), "utf8"),
      };
    }
    const shared = join(dir, "shared");
    const seen = new Set();
    let watching = true;
    const watch = (async () => {
      while (watching) {
        try {
          seen.add(readdirSync(join(shared, "tlc")).sort().join());
        } catch (e) {
          if (e.code !== "ENOENT") throw e;
        }
        await sleep(5);
      }
    })();
    const runs = [];
    for (let i = 0; i < 6; i++) {
      runs.push(startRun(dir, { args: i % 2 ? lamp : pay }).done);
      await sleep(150);
    }
    const finished = await Promise.all(runs);
    watching = false;
    await watch;
    for (const r of finished) assert.equal(r.status, 0, r.stderr);
    const runsOf = new Map(Object.entries(alone).map(([spec, a]) => [a.tlc, spec]));
    for (const listing of seen) assert.ok(runsOf.has(listing), `tlc/ had ${listing}`);
    const last = alone[runsOf.get(readdirSync(join(shared, "tlc")).sort().join())];
    assert.equal(readdirSync(shared).sort().join(), last.top);
    assert.equal(readFileSync(join(shared, "chart.mmd"), "utf8"), last.chart);
    assert.equal(readFileSync(join(shared, "summary.json"), "utf8"), last.summary);
    assert.equal(existsSync(out), false);
    assert.deepEqual(staged(dir), []);
  },
);

test("no file in scripts/ passes 1000 lines", () => {
  const long = readdirSync(scripts, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => [
      e.name,
      readFileSync(join(scripts, e.name), "utf8").replace(/\n$/, "").split("\n").length,
    ])
    .filter(([, lines]) => lines > 1000);
  assert.deepEqual(long, [], "move cohesive parts of each listed file into their own modules");
});
