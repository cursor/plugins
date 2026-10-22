import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { test } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import {
  checkTlcOutput,
  findTlc,
  parseDot,
  parseMermaid,
  parseTraces,
  parseValue,
  ruleSentences,
  stateKey,
} from "../lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const scripts = dirname(here);
const fixture = (name) => readFileSync(join(here, name), "utf8");
const edges = (r) => r.transitions.map((t) => `${t.from} -> ${t.to} : ${t.label}`).sort();
const node = (script, args, cwd, env = {}) => {
  const r = spawnSync(process.execPath, [join(scripts, script), ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...env },
    timeout: 120_000,
  });
  r.stdout = r.stdout?.replace(/^( {2}TLC ran \d+ times? in )\d+\.\d s\.$/gm, "$1N s.");
  return r;
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
  assert.doesNotThrow(() => checkTlcOutput(text, "tlc.out"));
  assert.deepEqual(parseTraces(text), [
    {
      invariant: "NeverSyncedWhileOffline",
      steps: [{ action: null, vars: { badge: "Synced", conn: "Offline" } }],
    },
  ]);
});

test("TLC output from a run that failed or stopped early is refused", () => {
  assert.doesNotThrow(() =>
    checkTlcOutput(
      `Error: Invariant Small is violated.\nError: The behavior up to this point is:\nState 1: <Initial predicate>\nx = 0\n\n${done}`,
      "ok.out",
    ),
  );
  assert.throws(
    () =>
      checkTlcOutput(
        "Error: The invariant Nope specified in the configuration file\nis not defined in the specification.\n",
        "cfg.out",
      ),
    /cfg\.out: TLC stopped on an error that is not a broken rule/,
  );
  assert.throws(
    () => checkTlcOutput("Error: Parsing or semantic analysis failed.\n", "parse.out"),
    /not a broken rule/,
  );
  assert.throws(
    () => checkTlcOutput(evaluationError, "eval.out"),
    /TLC threw an unexpected exception/,
  );
  assert.throws(
    () =>
      checkTlcOutput(
        "Error: Invariant Small is violated.\nError: The behavior up to this point is:\nState 1: <Initial predicate>\nx = 0\n",
        "stopped.out",
      ),
    /did not finish/,
  );
  assert.deepEqual(
    parseTraces(evaluationError).map((t) => t.invariant),
    ["NoLost", null],
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

test("a rule that TLC finds broken before TLC throws a Java exception keeps its paths, with a warning", () => {
  const aioobe = "java.lang.ArrayIndexOutOfBoundsException: Index 123 out of bounds for length 4";
  const oneWorker = `${smallBroken}Error: Invariant Small is violated.\n${tlcThrew(
    "java.lang.ArrayIndexOutOfBoundsException",
    "Index 123 out of bounds for length 4",
  )}\n${stoppedEarly}`;
  assert.equal(
    checkTlcOutput(oneWorker, "tlc.out"),
    `TLC found that Small is broken, and then failed with ${aioobe}. TLC stopped before it checked every state, so the charts can miss states that break Small. The failure is in TLC, not in the rule. Do not weaken Small because of it. A smaller constant can let TLC finish.`,
  );
  const workersInterleaved = `${tlcThrew("java.lang.RuntimeException", aioobe)}${smallBroken}${stoppedEarly}`;
  assert.match(
    checkTlcOutput(workersInterleaved, "tlc.out"),
    /failed with java\.lang\.ArrayIndexOutOfBoundsException: Index 123/,
  );
  assert.deepEqual(
    parseTraces(workersInterleaved).map((t) => t.invariant),
    ["Small"],
  );
  assert.throws(
    () =>
      checkTlcOutput(
        `${smallBroken}${tlcThrew("java.lang.RuntimeException", "util.Assert$TLCRuntimeException: Attempted to apply tuple")}${stoppedEarly}`,
        "formula.out",
      ),
    /formula\.out: TLC stopped on an error that is not a broken rule: Evaluating invariant Small failed\./,
  );
  assert.throws(
    () =>
      checkTlcOutput(
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

test("compare reads a one-region chart as the machine its steps reach, without steps that change nothing", () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  const drawn =
    "stateDiagram-v2\n  [*] --> Idle\n  Idle --> Busy : start\n  Busy --> Idle : finish\n";
  writeFileSync(join(dir, "drawn.mmd"), drawn);
  writeFileSync(join(dir, "loop.mmd"), `${drawn}  Idle --> Idle : refresh\n`);
  writeFileSync(join(dir, "orphan.mmd"), `${drawn}  Lost --> Idle : come back\n`);
  const same = node("compare-charts.mjs", ["loop.mmd", "drawn.mmd"], dir);
  assert.equal(same.status, 0);
  assert.equal(same.stdout, "same\n");
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

const NO_TLC = `Cannot find TLC. Download tla2tools.jar from a TLA+ release:
  https://github.com/tlaplus/tlaplus/releases
Then set TLA2TOOLS to the path of tla2tools.jar, and JAVA to a java binary (Java 11 or later).
`;
const FROM_SPEC_USAGE =
  "node statechart.mjs from-spec SPEC.tla [--config FILE] [--fixed FIXED.tla [--fixed-config FILE] | --against AGREED.tla [--against-config FILE]] [--label TEXT] [--map FILE] [--expect-broken RULE]... [--title TEXT] [--out DIR] [--png]";
const FROM_CHART_USAGE =
  "node statechart.mjs from-chart CHART.mmd [--module NAME] [--expect-broken RULE]... [--title TEXT] [--out DIR] [--png]";
const noTlc = { TLA2TOOLS: "", JAVA: "" };

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
  const sameName = node("statechart.mjs", ["from-spec", "C.tla", "--fixed", "fix/C.tla"], dir);
  assert.equal(sameName.status, 2);
  assert.equal(
    sameName.stderr,
    "fix/C.tla needs its own file and module name, such as CFixed.tla.\n",
  );
  const sameAgreed = node("statechart.mjs", ["from-spec", "C.tla", "--against", "a/C.tla"], dir);
  assert.equal(
    sameAgreed.stderr,
    "a/C.tla needs its own file and module name, such as CAgreed.tla.\n",
  );
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
  const bare = node("statechart.mjs", [], dir);
  assert.equal(bare.status, 2);
  assert.equal(
    bare.stderr,
    `Usage: ${FROM_SPEC_USAGE}
       ${FROM_CHART_USAGE}
Run node statechart.mjs --help for the flags, the output, and the exit codes.
`,
  );
});

test("every script prints its help with -h or --help, and points at it for an argument it does not know", () => {
  const help = {
    "statechart.mjs": [[], `Usage: ${FROM_SPEC_USAGE}`],
    "statechart.mjs from-spec": [["from-spec"], `Usage: ${FROM_SPEC_USAGE}`],
    "statechart.mjs from-chart": [["from-chart", "notes-app.mmd"], `Usage: ${FROM_CHART_USAGE}`],
    "chart-to-tla.mjs": [[], "Usage: node chart-to-tla.mjs CHART.mmd --module NAME [--dir OUT]"],
    "tlc-to-chart.mjs": [[], "Usage: node tlc-to-chart.mjs --dot FILE --map FILE [options]"],
    "compare-charts.mjs": [[], "Usage: node compare-charts.mjs EXPECTED.mmd ACTUAL.mmd"],
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
  assert.equal(top[2], "       node statechart.mjs [from-spec|from-chart] --help");
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
    [
      "chart-to-tla.mjs",
      ["--nope"],
      "unknown argument --nope. Run node chart-to-tla.mjs --help for the flags.\n",
    ],
    [
      "tlc-to-chart.mjs",
      ["--nope"],
      "unknown argument --nope. Run node tlc-to-chart.mjs --help for the flags.\n",
    ],
    [
      "tlc-to-chart.mjs",
      ["--dot", "a.dot", "--map", "a.map.mjs", "--regions"],
      "--regions draws the whole customer chart: use --highlight 0, without --flat or --path-only. Run node tlc-to-chart.mjs --help for the flags.\n",
    ],
    [
      "tlc-to-chart.mjs",
      ["--dot", "a.dot", "--map", "a.map.mjs", "--proof", "p.mmd"],
      "--proof writes the regions proof; it needs --regions. Run node tlc-to-chart.mjs --help for the flags.\n",
    ],
    [
      "compare-charts.mjs",
      ["--nope"],
      "unknown argument --nope. Run node compare-charts.mjs --help for the flags.\n",
    ],
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

No state breaks a rule.

The spec draws upload.mmd back unchanged.

Wrote chart.mmd, stories.md, summary.json in Upload-statechart.
`,
  );
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
This is the only way to get here in the model.

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
  assert.deepEqual(summary.chartStatus, { works: 3, wrong: 0, fixed: 1 });
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

No state breaks a rule.

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
  "--png exits 2 unless every chart renders, even with --expect-broken, and keeps the files it wrote",
  needsTlc,
  () => {
    const args = ["from-chart", "sync.mmd", "--expect-broken", "NeverSyncedWhileOffline", "--png"];
    const bin = mkdtempSync(join(tmpdir(), "fake-npx-"));
    const launch = "Error: Failed to launch the browser process!";
    writeFileSync(
      join(bin, "npx"),
      `#!/bin/sh
while [ $# -gt 0 ]; do
  case "$1" in -i) chart=$2 ;; -o) png=$2 ;; esac
  shift
done
for c in $UNRENDERED; do
  case "$chart" in */$c.mmd) echo "${launch}" >&2; exit 1 ;; esac
done
echo png > "$png"
`,
      { mode: 0o755 },
    );
    for (const [unrendered, status, written] of [
      ["chart bug-1", 2, ["chart.mmd", "bug-1.mmd"]],
      ["bug-1", 2, ["chart.mmd", "bug-1.mmd", "chart.png"]],
      ["", 0, ["chart.mmd", "bug-1.mmd", "chart.png", "bug-1.png"]],
    ]) {
      const dir = mkdtempSync(join(tmpdir(), "statechart-"));
      writeFileSync(join(dir, "sync.mmd"), fixture("sync.mmd"));
      const r = node("statechart.mjs", args, dir, {
        PATH: `${bin}${delimiter}${process.env.PATH}`,
        UNRENDERED: unrendered,
      });
      assert.equal(r.status, status, `${unrendered}: ${r.stdout}${r.stderr}`);
      assert.equal(
        r.stderr,
        unrendered
          .split(" ")
          .filter(Boolean)
          .map((c) => `could not render Sync-statechart/${c}.mmd: ${launch}\n`)
          .join(""),
      );
      assert.match(r.stdout, /\nBroken as expected: NeverSyncedWhileOffline\.\n/);
      assert.equal(
        r.stdout.split("\n").at(-2),
        `Wrote ${[...written, "stories.md", "summary.json"].join(", ")} in Sync-statechart.`,
      );
      assert.deepEqual(
        readdirSync(join(dir, "Sync-statechart")).sort(),
        [...written, "stories.md", "summary.json", "tlc"].sort(),
      );
    }
  },
);

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
    assert.match(r.stdout, /\nNo state breaks a rule\.\n/);
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
  "a state reached only after a bug takes the bug's color, and the fix edge leaves the state before the changed step",
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
      "Refunded, charged": "wrong",
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
      /^In the spec you see the same screens and steps, but the spec does not check this rule\.$/m,
    );
    assert.match(
      story("--against-traces", "Pay.out", "--against-rules", "NoDoubleCharge"),
      /^In the spec you see the same screens and steps, so the spec does not change this path\.$/m,
    );
    const alone = node(
      "tlc-to-chart.mjs",
      [
        "--dot",
        "Pay.dot",
        "--map",
        "pay.map.mjs",
        "--against-dot",
        "Pay.dot",
        "--against-traces",
        "Pay.out",
      ],
      dir,
    );
    assert.equal(alone.status, 2);
    assert.match(alone.stderr, /^--against-traces and --against-rules go together\./);
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
3 work, 2 break a rule.

## 1. Paying, charged twice

Rule broken: \`NoDoubleCharge\`
Why: each charge request charges again.
This is the only way to get here in the model.

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
      "SPECIFICATION Spec\n",
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
  assert.deepEqual(summary.chartStatus, { works: 2, wrong: 1, fixed: 0 });
});

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
  "a bug that only the fixed model has is numbered after the current bugs and drawn wrong",
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
    assert.deepEqual(summary.chartStatus, { works: 2, wrong: 1, fixed: 1 });
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

Chart: 4 states and 4 transitions from 10 model states.
3 work, 1 breaks a rule, 0 only in the agreed chart.

## 1. Saved, draft

Rule broken: You never see "Saved" while the note is still a draft.
Why: the app stops after one retry and shows Saved anyway.
There are 2 ways to get here in the model. This is the shortest.

0. Start: Editing, draft
1. You press Save. Now: Saving, draft
2. The save times out. Now: Saved, draft

In the agreed chart, step 2 (the save times out) cannot happen, so you stay at: Saving, draft.

Broken as expected: NoFalseSaved.

Wrote chart.mmd, bug-1.mmd, stories.md, summary.json in SaveCode-statechart.
`,
    );
    const out = join(dir, "SaveCode-statechart");
    const chart = readFileSync(join(out, "chart.mmd"), "utf8");
    assert.match(chart, /^stateDiagram-v2\n {2}%% second model \(against\): the agreed chart\n/m);
    assert.deepEqual(
      [...chart.matchAll(/^ {4}state "([^"]+)" as legend\w+$/gm)].map((m) => m[1]),
      ["Works", "Breaks a rule"],
    );
    assert.match(
      chart,
      /^ {2}s3 --> s3 : in the agreed chart, the save<br\/>times out cannot happen$/m,
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
    const lacks = run("--map", "rev.map.mjs", "--expect-broken", "NoFalseSaved");
    assert.equal(lacks.status, 2);
    assert.equal(
      lacks.stderr,
      'rev.map.mjs: the agreed chart has no note.rev, and the mapping reads v.note.rev on its states. Label states and steps only from what both models have, or test "rev" in v.note first.\n',
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
      "SaveAgreedType.cfg does not check NoFalseSaved, so the stories cannot say whether SaveAgreed.tla keeps it.\n",
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
        "  classDef plain fill:#f4f6f7,stroke:#566573,color:#1b2631",
        "  classDef plainWrong fill:#f4f6f7,stroke:#c0392b,stroke-width:4px,color:#7b241c",
        "  class legendWrong plainWrong",
        "  class s0 plainWrong",
        "  class s1 plain",
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
      const chart = readFileSync(join(dir, "Order-statechart", "chart.mmd"), "utf8");
      return {
        story: readFileSync(join(dir, "Order-statechart", "stories.md"), "utf8"),
        fixEdges: parseMermaid(chart)
          .regions.Main.transitions.filter((t) => t.label.includes("with the fix"))
          .map((t) => `${t.from} --> ${t.to} : ${t.label}`),
      };
    };
    const hidden = withFix(chargeAgain);
    assert.deepEqual(hidden.fixEdges, []);
    assert.match(
      hidden.story,
      /^With the fix you see the same screens and steps, so the fix does not change this path\.$/m,
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
      /^With the fix, after step 1, "the bank charges you" happens and takes you to: Paid\.$/m,
    );
    const blocked = withFix(chargeFirstOnly, unlabeledMap);
    assert.deepEqual(blocked.fixEdges, []);
    assert.match(
      blocked.story,
      /yet the rule holds, so the state labels do not show what the fix changes/,
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
      /^With the badge fix, after step 3, "a message arrives" happens and takes you to: Settings, muted, badge\.$/m,
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
    process.kill(-first.child.pid, "SIGKILL");
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
  await until(() => tlcStarted(tmp));
  await sleep(500);
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
#include <dlfcn.h>
#include <errno.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
static size_t hits;
int rename(const char *from, const char *to) {
  static int (*real)(const char *, const char *);
  if (!real) real = dlsym(RTLD_NEXT, "rename");
  const char *base = strrchr(to, '/'), *fails = getenv("RENAME_FAILS");
  const char *cannot = getenv("RENAME_CANNOT");
  base = base ? base + 1 : to;
  if (cannot && strstr(base, "shared")) {
    errno = strcmp(cannot, "EXDEV") == 0 ? EXDEV : access(to, F_OK) == 0 ? EISDIR : ENOSYS;
    return -1;
  }
  if (fails && strcmp(base, "shared") == 0 && hits < strlen(fails)) {
    errno = fails[hits++] == 'N' ? ENOTEMPTY : EIO;
    return -1;
  }
  return real(from, to);
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
  "a run whose input changes before --png renders stops before it renders, and keeps its files",
  needsTlc,
  async () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeSlowPay(dir, 20000);
    const bin = ownTmp(dir, "bin");
    const rendered = join(dir, "rendered");
    writeFileSync(join(bin, "npx"), `#!/bin/sh\ntouch "${rendered}"\nexit 1\n`, { mode: 0o755 });
    const tmp = ownTmp(dir, "tmp");
    const run = startRun(dir, {
      args: ["from-spec", "Pay.tla", "--png"],
      env: { TMPDIR: tmp, PATH: `${bin}${delimiter}${process.env.PATH}` },
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

test(
  "a rule that TLC finds broken before TLC throws a Java exception is broken, and the run draws the paths TLC printed",
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
      /^Pay-statechart\/tlc\/Pay-NoDoubleCharge\.out: TLC found that NoDoubleCharge is broken, and then failed with java\.lang\.ArrayIndexOutOfBoundsException: Index 123 out of bounds for length 4\. .* Do not weaken NoDoubleCharge because of it\./m,
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

test(
  "the output folder model keeps every rule, and breaks one with a shared TLC folder, without each guard, or when a failed rename deletes the folder moved aside",
  needsTlc,
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    const model = (ext) => readFileSync(join(scripts, "model", `OutputFolder${ext}`), "utf8");
    const r = node(
      "statechart.mjs",
      ["from-spec", join(scripts, "model", "OutputFolder.tla"), "--out", join(dir, "out")],
      dir,
    );
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /\nNo state breaks a rule\.\n/);
    for (const [i, [rule, guard, without, story]] of [
      [
        "ChartsOneSpec",
        "/\\ read' = Set(read, r, read[r] \\cup {spec})",
        "/\\ read' = [q \\in Runs |-> read[q] \\cup {spec}]",
        /You start run 2 in a second shell\..*\n.*Run 2 moves its folder into place\. Now: Two runs going: chart of both specs/,
      ],
      [
        "ChartsOneSpec",
        '/\\ pc[r] = "publish" /\\ spec = snap[r] /\\ ~out.notes',
        '/\\ pc[r] = "publish" /\\ ~out.notes',
        /You edit the spec\..*\n.*Run 1 moves its folder into place\. Now: One run going: chart of both specs/,
      ],
      [
        "KeepsYourFiles",
        '/\\ pc[r] = "aside" /\\ ~aside[r].notes\n',
        '/\\ pc[r] = "aside"\n',
        /Run 1 deletes the old folder and finishes\. Now: Done: chart of the spec\n/,
      ],
      [
        "NeverLosesChart",
        "  /\\ \\/ /\\ aside[r].exists /\\ ~out.exists\n        /\\ out' = aside[r]\n        /\\ aside' = Set(aside, r, NoFolder)\n     \\/ UNCHANGED <<out, aside>>\n",
        "  /\\ out' = out\n  /\\ aside' = Set(aside, r, IF aside[r].notes THEN aside[r] ELSE NoFolder)\n",
        /Run 2 moves the old folder aside\. Now: .*, the old chart moved aside\n.*Run 2 cannot rename a folder and stops\. Now: One run going: no folder\n/,
      ],
      [
        "NeverLosesChart",
        '/\\ pc[r] = "swap" /\\ out.exists /\\ aside[r].exists /\\ ~out.notes',
        '/\\ pc[r] = "swap" /\\ out.exists /\\ aside[r].exists',
        /You save notes in the folder\..*\n.*Run 2 finds another run's folder in place and deletes the old folder\. Now: Two runs going: your notes\n/,
      ],
    ].entries()) {
      const mutant = join(dir, `${i}-${rule}`);
      mkdirSync(mutant);
      assert.ok(model(".tla").includes(guard), guard);
      writeFileSync(join(mutant, "OutputFolder.tla"), model(".tla").replace(guard, without));
      for (const ext of [".cfg", ".map.mjs"])
        writeFileSync(join(mutant, `OutputFolder${ext}`), model(ext));
      const m = node(
        "statechart.mjs",
        ["from-spec", "OutputFolder.tla", "--expect-broken", rule],
        mutant,
      );
      assert.equal(m.status, 0, m.stdout + m.stderr);
      assert.match(m.stdout, story);
    }
  },
);
