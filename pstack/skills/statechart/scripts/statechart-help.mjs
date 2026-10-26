import { CACHE_NAME, PACKAGES } from "./render.mjs";

export const USAGE = {
  "from-spec":
    "node statechart.mjs from-spec SPEC.tla [--config FILE] [--fixed FIXED.tla [--fixed-config FILE] | --against AGREED.tla [--against-config FILE]] [--label TEXT] [--map FILE] [--expect-broken RULE]... [--title TEXT] [--out DIR] [--cover] [--png [--theme NAME]]",
  "from-chart":
    "node statechart.mjs from-chart CHART.mmd [--module NAME] [--expect-broken RULE]... [--title TEXT] [--out DIR] [--png [--theme NAME]]",
  render: "node statechart.mjs render CHART.mmd [--theme NAME] [--out FILE]",
};
export const usage = (lines) => `Usage: ${lines.join("\n       ")}`;

const FROM_SPEC = `from-spec SPEC.tla
  Checks each INVARIANT in SPEC.cfg in a separate TLC run. TLC stops at the first rule that a state
  breaks, and the separate runs find the rest. Each run also has the rule as a CONSTRAINT, so TLC
  stops each path at its first state that breaks the rule, and a rule that stays broken reports
  only the step that broke it. SPEC.cfg has SPECIFICATION and one INVARIANT line per rule. Each
  PROPERTY, a rule about whole behaviors, gets one TLC run too, and the charts do not draw it. TLC
  checks a PROPERTY with no [], <>, or ~> only in the initial states, and the command says so. A
  rule listed as both INVARIANT and PROPERTY is checked once, as an INVARIANT. After those runs
  print their results, one more run dumps the state graph and checks every INVARIANT on every
  state in it, and then the command draws the charts. TLC goes down from the next-state action
  through each \\/, \\E, LET, and definition, and names each step after the last definition on that
  path. It stops at any other expression, such as /\\, IF, or CASE, so a definition inside one names
  no step. Give each kind of step its own definition, and join them with \\/ in the next-state
  action. The command warns when steps carry the name of the whole next-state action. The command
  prints the config that it checks each model with, and stops when a config does not exist, with
  the configs beside the spec.

  --config FILE      The config for SPEC.tla. Default: SPEC.cfg next to the spec.
  --fixed FIXED.tla  The model of the open fix. It is a copy of the spec in a different file, such
                     as SpecFixed.tla or fix/Spec.tla. The command checks it the same way, with
                     FIXED.cfg, or with the config of SPEC.tla when there is no FIXED.cfg. The
                     charts then mark each bad state fixed or still wrong. A rule that the
                     config of FIXED.tla does not check stays as wrong as it is today. When the
                     fix shows the same states and steps as a bug of such a rule, the story says
                     "does not check this rule".
  --fixed-config FILE
                     The config for FIXED.tla.
  --against AGREED.tla
                     The spec that SPEC.tla must follow, when SPEC.tla models the code. It is a
                     different file from SPEC.tla. The command checks it with AGREED.cfg, and
                     never with the config of SPEC.tla. SPEC.tla may add variables, record fields,
                     and actions that AGREED.tla does not have. The comparison leaves them out.
                     Do not use it with --fixed.
  --against-config FILE
                     The config for AGREED.tla, when it is not AGREED.cfg. Give the config that the
                     spec's authors say the unchanged spec passes. When the spec shows the same
                     states and steps as a bug of a rule that this config does not check, the
                     story says "does not check this rule".
  --label TEXT       The name of the --fixed or --against model in the charts and the stories.
                     Default: "the fix", or "the spec".
  --map FILE         The labels for each model state and step. Default: SPEC.map.mjs next to the
                     spec. When the file does not exist, the command writes one from the spec's
                     VARIABLES and actions to fill in, and exits 2 before it runs TLC. Its
                     comments say what each function gets. The map reads a sequence or tuple
                     from 1, as in TLA+, so v.seat[1] is its first item. A map that reads from
                     0, such as v.pc[r - 1], gets the item before the one it wants, and stops
                     the run when it reads index 0.
  --cover            Draw only the shortest path from the start to each settled state, plus
                     every bug path, in the overview. A state is settled when only the
                     mapping's readerActions are enabled. The command prints the states and
                     arrows that the overview leaves out. The counts of states that work or
                     break a rule still include the states it leaves out. When no step in
                     TLC's graph is a reader action, the overview draws every state.

  With --fixed or --against, SPEC.tla (and FIXED.tla) models the code, and the command finds each
  condition of an action that no comment ties to code with a file and line, as in \\* pay.ts:120.
  A condition is a conjunct of the action that changes nothing and reads a variable that the
  action does not change. A rule can hold only because the model waits for a condition that the
  code does not check, so the command prints these conditions when a rule holds.
  With --against, each story says whether a config beside AGREED.tla expects TLC to break the
  bug's rule. A config's "\\* expect: RULE" line says what TLC finds, and "\\* module: NAME" names
  the module it checks when the folder has more than one .tla file. The command warns when no
  config beside AGREED.tla has an expect line for that module.`;

const FROM_CHART = `from-chart CHART.mmd
  Writes NAME.tla, NAME.cfg, and NAME.map.mjs next to the chart. When NAME.tla already exists, it
  writes none of them. Otherwise it replaces a NAME.cfg or NAME.map.mjs that is there. Then it
  checks the spec as from-spec does, and compares the chart that the spec draws with CHART.mmd.

  --module NAME      The TLA+ module name. Default: the chart's file name in CamelCase, such as
                     NotesApp for notes-app.mmd.

  The chart is a Mermaid stateDiagram-v2. Each transition label is one action. For parallel
  regions, split one top-level composite with --, and put each part in a named composite, such as
  state Connection { ... }. Each region is one variable. A step moves every region whose current
  state has a transition with the step's label, and the other regions stay where they are. Each
  rule is one comment line:
    %% never NAME: A & B -- the rule in one sentence
  Each name after the colon is a state caption or a composite, and each comes from a different
  region. A composite stands for every state in it. A "%% when ID, ID" or "%% when not ID, ID" line
  right after a transition is its guard, and the transition's label must end with the guard's
  words in [ ]. The region takes the transition only while each other region that the line names
  is in one of the states that it names, or with not, while none is. A transition with no label is
  its own action. NAME.cfg has SPECIFICATION Spec, INVARIANT TypeOK, and one INVARIANT per never
  line. The command refuses final, choice, fork, and history states, and regions below the top
  level.

  The comparison looks at reachable states, start states, and labeled steps. A chart with regions
  compares as its combined machine, with each state named by its region states joined by " | ", so
  a guard that blocks a step in only some combinations of regions shows as a difference. The
  guard's words in [ ] are not part of the label. A loop compares like any other step. An edge
  label "a or b" counts as two labels. An edge with no label counts only when no labeled edge joins
  the same two states.`;

const RENDER = `render CHART.mmd
  Draws one chart as a PNG. It does not run TLC, so the chart can come from from-spec, from
  from-chart, or from a person.

  --theme NAME       The colors of the PNG: light, dark, or classic. Default: light.
  --out FILE         The PNG to write. Default: the chart's path with .png in place of .mmd. The
                     command makes the folder when it does not exist.

  Exit codes
    0  The command wrote the PNG.
    2  The command cannot finish: a bad argument, a chart that it cannot read, a renderer that it
       cannot install or load, or a PNG that it cannot render or write. It writes no PNG then.`;

const PNG = `PNG
  Pele lays out each chart, and resvg draws it at twice its size. A chart that is more than 100
  million pixels at that size draws smaller, at about 100 million pixels. The first PNG installs
  ${PACKAGES.join(" and ")} with npm into a cache folder. The folder is
  $XDG_CACHE_HOME/statechart/${CACHE_NAME}, or
  ~/.cache/statechart/${CACHE_NAME} when XDG_CACHE_HOME is not set. Delete that folder to
  install them again. When npm or the packages fail, the command prints why, exits 2, and writes
  no file.
  The PNG uses the font that fc-match finds for system-ui. The command measures each label in that
  font, so no label goes past its box. When that font is wider than the widths that Pele has built
  in, the command makes the wrap width wider by the same amount, so the lines break where the chart
  breaks them. Without fc-match, or when resvg cannot read that font, the PNG uses Pele's widths.
  Pele puts parallel regions side by side. When a chart with regions has no top-level direction,
  the PNG puts the legend above the regions, so the PNG is narrower.
  --theme picks light, dark, or classic. light is the default. classic keeps the group fills from
  the chart's own classDef lines.`;

const COMMON = `Both commands
  --expect-broken RULE
                     An INVARIANT or PROPERTY that is known to break. Repeat it, or list rules
                     with commas, as in A,B. The command then exits 0 when exactly these rules
                     break, and the --fixed or --against model breaks no other rule.
  --title TEXT       The chart title. Each bug chart adds ", bug N".
  --out DIR          The output folder. Default: NAME-statechart next to the input. A run writes its
                     files in a temporary folder, and then replaces the whole output folder with
                     it. When runs overlap, the output folder has the files of the run that
                     finished last. The command does not use an output folder that has files that
                     it did not write. On a filesystem that cannot rename, the command copies the
                     files into place, and overlapping runs can mix their files.
  --png              Also draw each chart as a PNG. The PNG section tells how.
  --theme NAME       The colors of each PNG: light, dark, or classic. Default: light. It needs
                     --png.
  -h, --help         Print this help, and exit 0.

Output
  The command prints whether each rule holds, the chart's counts, and one story per bug.
  from-chart also prints the comparison. The command writes these files in the output folder:
  chart.mmd          The overview.
  bug-N.mmd          Only the steps of bug N, numbered. Bugs are numbered by fewest reader steps,
                     then fewest model steps, then rule name, then cause. Bugs that only the
                     --fixed or --against model has come last.
  bug-N-developer.mmd, bug-N-layered.mmd
                     The path of bug N through the developer's states, when the mapping exports
                     detail(). The layered chart puts each detail state in a box named by its
                     state label. A state with a blank detail stays a plain state.
  stories.md         One entry per bug: the rule, why it breaks, the steps that lead into it, the
                     shortest path in reader steps, and what the --fixed or --against model does
                     instead. The rule's sentence is the \\* comment lines above the rule in the
                     spec, or in a module in its folder that the spec EXTENDS, directly or
                     through another module. With --fixed or --against, the other spec and its
                     modules count too, after SPEC.tla and its modules. The entry numbers each
                     step that changes the state label, each reader action, each step that
                     changes a variable that the rule reads, and the step into the bug. Between
                     them, it counts the hidden steps and names each different step once. Above
                     the steps, a line names up to five different steps that lead into the bug,
                     most common first, and counts the rest. When more than one step or start
                     state leads into the bug, the entry says that the path is the shortest that
                     TLC found. A step leads into the bug when it goes there from a state that
                     keeps the bug's own rule. That state can already break other rules. "(the
                     state stays the same)" marks a step on that line that keeps the state's
                     label and is not on the bug's path. from-spec does not draw such a step.
                     When TLC names the steps only after the whole next-state action, the entry
                     cannot count them. Then one line per broken PROPERTY with its sentence,
                     which comes only from its own spec file, the reader states that repeat
                     forever, if any, and the TLC output that has its counterexample.
  summary.json       The counts behind the chart. Each bug has counterexamples, how many model
                     states end it, each with its own TLC trace; lastSteps, the steps that lead
                     into it, most common first; and startsHere, whether a start state is in it.
                     brokenProperties has each broken PROPERTY, its rule sentence, the reader
                     states that repeat forever as repeats, and its TLC output. mixedStatus
                     lists the states that break a rule in some cases. chartGroups counts the
                     drawn states of each group, and mixedGroups lists the states in more than
                     one group. With --cover, cover lists the states and arrows that the
                     overview leaves out. With --fixed or --against, uncited has the conditions
                     with no file and line for each code model. With --against, second.listed
                     has what each config beside AGREED.tla expects, and each bug has the
                     configs that list it.
  tlc/               The config and the TLC output of each run. When the overview has regions,
                     from-spec also writes tlc/regions-all.mmd, the regions with every arrow, and
                     tlc/regions-proof.mmd, every state and step of TLC's graph in one region.
                     compare-charts.mjs tlc/regions-all.mmd tlc/regions-proof.mmd repeats the
                     proof. It prints "same" and exits 0, or prints each difference and exits 1.
  *.png              Each chart as a PNG, with --png. A run without --png deletes them.

Reading a chart
  from-spec draws the overview as two parallel regions when every state reads "context: progress":
  the contexts on one side, the progress on the other, both at the same time. It does so only when
  that has fewer states, when the regions combine back into exactly every state and step of TLC's
  graph, and when each state's color is the worse color of its two region states. Otherwise it puts
  the states of one context in a box named context, and prints why. Each state in a box shows only
  its progress, and a context with one state stays a plain state.
  Regions draw only the arrows of the shortest way to each state, of each bug path, and of the
  nearest step with each label. The script checks that these arrows make no step that TLC's graph
  does not have. At a step that they make wrongly, it puts back every arrow that the full regions
  take there.
  An arrow from a box's border leaves from every state in the box. The chart draws it only when
  every state in the box takes the step with the same labels to the same state, and no state
  outside the box has the box's name.
  In regions, a step leaves every region that has it. "[when A or B]" or "[unless A or B]",
  whichever is shorter, says which states of the other region the step needs, and a "%% when" or
  "%% when not" line under it lists their ids. A loop says the region may also stay.
  Other words in [ ] come from the mapping's guard(), and "after N s" from its timer(). An edge
  shows guard() words only when every model step behind it has them. In regions, they replace
  "when A or B" and "unless A or B". TLC does not check them, and has no clock, so a reviewer
  checks them against the code.
  Gray states work. Red states break a rule. An orange state breaks a rule in some cases: a model
  state under its label breaks a rule, and a path without a bug reaches another one. A white state
  is reached only after a bug: every path from the start to its model states passes a state that
  breaks a rule, and none of them breaks one. With --fixed, red, orange, and white describe the
  fix, and green states are fixed by it or exist only with it. A purple state breaks a rule only
  with the fix: today it works, is reached only after a bug, or does not exist. With --against, a
  state takes the worse of its two models' colors, red, then orange, then white, and green states
  exist only in the spec.
  When the mapping exports group(), the fill is the state's group, which the legend names. A chart
  state is in a group when all its model states are in it, and a region state when every state
  that it is part of is in it. A state in no group, or in more than one, is gray. The legend lists
  the groups that the chart draws: first the groups in groupColors, in that order, then the others
  from A to Z, and then each status border that the chart uses. groupColors gives a group a light
  "#rgb" or "#rrggbb" color. A group with no color takes the next free palette color: light blue,
  orange, purple, yellow, teal, tan, then pink. A group cannot have the name of a status, such as
  "Breaks a rule". Without group(), the legend shows only the statuses that the chart uses. In the
  .mmd file, the status is a thick border of its color, gray for a white state, on top of the group
  fill. In a PNG, a red, orange, purple, or white state is a box of that color with a border and
  text of its color in place of its group fill, and a fixed state is a green box, so each box shows
  one signal.
  A thick blue border and numbered labels mark the bug. With group(), and in a PNG, the blue border
  marks only the states on the bug's path that work, and the numbered labels show the rest.
  Mermaid state diagrams cannot color an edge.
  Each bug replays on the other model by its state labels and step words, which are what the
  reader sees. The replay takes the bug's own steps. Between them, it also takes the other model's
  steps of actions that SPEC.tla's state graph does not have, when they keep the state label, are
  not reader actions, and change no variable that the broken rule reads. A bug step that the story
  hides must keep the state label on the other model too, unless that model cannot take it. A step
  that the reader sees takes a step with the same words between the same two state labels, and
  prefers a step of the same action. A hidden step of an action that the other model does not have
  is skipped. A step that the reader sees of such an action takes any step to the same shared state
  when it changes a shared variable, or else a step with the same words between the same two state
  labels.
  A label "with the fix, STEP" or "in the spec, STEP" is a step that only the other model takes. On
  a bug's path it leaves the state before the first step that the other model shows the reader
  differently, and ends where that model goes instead. The story quotes the other model's words
  when they differ. "with the fix, STEP cannot happen at step N" or "in the spec, STEP cannot
  happen at step N" loops on the state where that model stops the step, on an arrow of its own. On
  the overview, the label ends with "of bug M". Outside regions, two states otherwise have at most
  one arrow between them. Its lines are the numbered steps, then SPEC.tla's steps, then the other
  model's steps, with a blank line between each group.
  The other model may have other variables, record fields, and actions. The comparison leaves out a
  variable or field that no state of one model has, in its state graph or its traces, and one whose
  values never have the same type in the two models. One mapping draws both models, so it may read
  only what both have. The command stops when the mapping reads, on a state of the other model, a
  variable or field that no state of that model has, or one whose value has a type that SPEC.tla
  never has there. It also stops when the mapping lists the fields of such a state, as a spread,
  Object.keys, or JSON.stringify does. Test "name" in v before the mapping reads a field that the
  other model lacks. The command also stops when a label, guard, group, or cause that the mapping
  makes for the other model has the word "undefined" in it.
  A chart with another model has the line "%% second model (fix|against): LABEL" right after
  stateDiagram-v2. Each chart starts with front matter that keeps Mermaid from shrinking it to the
  page or wrapping its labels again.
  An edge lists every step that takes it, most common first. Words that the steps share at the
  start are written once, as in "you tap Pay or Back".

Regenerate
  List every rule that is known to break with --expect-broken, the goals and the known bugs. Each
  run then exits 0 until a rule changes, so one script rebuilds every chart and stops on any change:
    set -e
    node statechart.mjs from-spec Code.tla --against Agreed.tla --expect-broken NoLostUpload --png
  A run that leaves a broken rule out of --expect-broken exits 1, and set -e stops the script there.

TLC
  TLA2TOOLS is the path to tla2tools.jar, and JAVA is the path to the java binary. With only
  TLA2TOOLS set, the command runs java from PATH. Otherwise it uses TLC 1.7.4 and Java temurin-25
  from mise, or JAVA when it is set, and installs what is missing with mise. The first install
  downloads about 305 MB and needs the network. It checks the checksum of tla2tools.jar. mise runs
  in an empty temporary folder, so the mise files around the spec, in a repo, or above TMPDIR do
  not apply, do not change, and need no trust. When mise cannot start or fails, the command prints
  why, the install command, and how to set TLA2TOOLS and JAVA instead.
  When the command starts, it copies its input files, which Exit codes lists. TLC checks the
  copies, so an edit during the run does not change what TLC checks.
  TLC checks each rule with one worker per CPU. When a rule is broken, TLC checks it again with one
  worker, which finds the shortest bug paths, the same on every run. The command then prints how
  many times TLC ran and how long that took.
  TLC can find that a rule is broken and then stop on an error, such as a Java exception. The
  command then keeps the paths that TLC printed, marks the rule broken, and warns that the charts
  can miss states that break it. A smaller constant can let TLC finish.

Exit codes
  0  Every rule holds, or exactly the --expect-broken rules break. from-chart also draws CHART.mmd
     back unchanged.
  1  Another rule is broken, an expected rule holds, or the chart that the spec draws is not
     CHART.mmd. The output says which.
  2  The command cannot finish: a bad argument, a missing file, a chart or TLC output that it
     cannot read, no TLC, a helper script that cannot start, an output folder with files that the
     command did not write, an input file whose content changed during the run, a new mapping to
     fill in, a mapping that it cannot use, a renderer that --png cannot install or load, or a
     chart that --png cannot render.
     When a chart does not render, the command keeps the files it wrote and exits 2, whatever the
     rules give. Otherwise, exit 2 does not change the output folder, unless the command moved it
     aside and cannot put it back. Then the message names the folder's new path. When the command
     stops after TLC has run, it keeps the files that it wrote, TLC's output among them, in a
     temporary folder, and the message names it. When TLC's state graph is too large to draw, the
     command prints whether each rule holds and exits 2, whatever the rules give. It stops TLC as
     soon as the graph passes that size. The input files are the spec and config, the --fixed or
     --against spec and config, the chart, and the map. Each .tla file in the same folder that an
     input .tla file EXTENDS or INSTANCEs is an input file too, and so is each file that an input
     .mjs or .js file imports by a relative path. Before --png renders, and again before it writes
     the output folder, the command compares the content of each input file with its content at
     the start. A save that does not change the content does not stop the run.`;

export const HELP = {
  "": `${usage([...Object.values(USAGE), "node statechart.mjs [from-spec|from-chart|render] --help"])}

Draws a Mermaid statechart from TLC's state graph of a TLA+ spec. The spec can model any system,
such as a product flow, a protocol, a service, a job queue, or an algorithm. A mapping labels each
state and step in the words of the person who reads the chart, and the help calls that person the
reader. The reader can be a user, an operator, an engineer, or a reviewer.

${FROM_SPEC}

${FROM_CHART}

${COMMON}

${RENDER}

${PNG}`,
  "from-spec": `${usage([USAGE["from-spec"]])}\n\n${FROM_SPEC}\n\n${COMMON}\n\n${PNG}`,
  "from-chart": `${usage([USAGE["from-chart"]])}\n\n${FROM_CHART}\n\n${COMMON}\n\n${PNG}`,
  render: `${usage([USAGE.render])}\n\n${RENDER}\n\n${PNG}`,
};

export const more = (cmd) =>
  `Run node statechart.mjs ${cmd ? `${cmd} ` : ""}--help for the flags, the output, and the exit codes.`;
