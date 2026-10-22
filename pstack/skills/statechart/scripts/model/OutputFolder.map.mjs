const QUIET = ["idle", "exited", "stopped", "orphanTlc"];
const going = (v) => v.pc.filter((p) => !QUIET.includes(p)).length;
const changed = (before, after) =>
  after.pc.findIndex(
    (p, i) => p !== before.pc[i] || after.aside[i].exists !== before.aside[i].exists,
  ) + 1;

export const readerActions = ["Start", "Edit", "Note", "Stop", "KillNode"];

function context(v) {
  if (v.pc.every((p) => p === "idle")) return "Before any run";
  if (going(v) === 2) return "Two runs going";
  return going(v) === 1 ? "One run going" : "Done";
}

const SPECS = { 1: "the spec", 2: "the edited spec", "1,2": "both specs" };

function contents(v) {
  const kept = v.aside.filter((a) => a.exists);
  const aside = kept.some((a) => a.notes)
    ? ", your notes moved aside"
    : kept.some((a) => a.by)
      ? ", the old chart moved aside"
      : "";
  const parts = [
    v.out.by && `chart of ${SPECS[v.out.read.join()]}`,
    v.out.notes && "your notes",
  ].filter(Boolean);
  if (!v.out.exists) return `no folder${aside}`;
  return `${parts.join(" and ") || "empty folder"}${aside}`;
}

export function state(v) {
  return `${context(v)}: ${contents(v)}`;
}

export function group(v) {
  if (v.pc.every((p) => p === "idle")) return "Not started";
  return going(v) ? "Running" : "Finished";
}

export function step(action, before, after) {
  const r = changed(before, after);
  switch (action) {
    case "Start": {
      const where = going(before) ? " in a second shell" : "";
      const how = after.inputOk[r - 1] ? "" : " with a typo";
      return `you start run ${r}${where}${how}`;
    }
    case "Refuse":
      return before.inputOk[r - 1]
        ? `run ${r} says the folder has a file that it did not write`
        : `run ${r} says the input is wrong`;
    case "Tlc":
      return `run ${r}'s TLC reads the spec`;
    case "Draw":
      return `run ${r} draws the chart in its own folder`;
    case "Stale":
      return `run ${r} says the spec changed while it read it`;
    case "Foreign":
      return `run ${r} says the folder has a file that it did not write`;
    case "Swap":
    case "Checked":
      return "";
    case "MoveIn":
      return `run ${r} moves its folder into place`;
    case "MoveAside":
      return `run ${r} moves the old folder aside`;
    case "Restore":
      return `run ${r} puts the folder with your notes back and stops`;
    case "Supersede":
      return `run ${r} finds another run's folder in place and deletes the old folder`;
    case "KeepAside":
      return `run ${r} keeps the folder with your notes aside and says where`;
    case "RenameFails":
      if (after.aside[r - 1].exists)
        return `run ${r} cannot rename a folder and says where the old folder is`;
      return after.out.exists && !before.out.exists
        ? `run ${r} cannot rename a folder, puts the old folder back, and stops`
        : `run ${r} cannot rename a folder and stops`;
    case "Clean":
      return `run ${r} deletes the old folder and finishes`;
    case "Edit":
      return "you edit the spec";
    case "Note":
      return "you save notes in the folder";
    case "Stop":
      return `you stop run ${r} with Ctrl-C`;
    case "KillNode":
      return `you kill run ${r}'s Node, and its TLC keeps running`;
    case "OrphanEnd":
      return `run ${r}'s orphaned TLC finishes`;
    default:
      return action;
  }
}

export function cause(v, facts, invariant) {
  return {
    ChartsOneSpec: "the run read the spec before and after an edit, and still wrote its chart",
    KeepsYourFiles: "a run deleted a folder that had your notes in it",
    NeverLosesChart: "a run deleted the last chart before another chart was in place",
    ExitTwoLeavesFolder: "a run wrote the folder and then said it could not finish",
    OverlapNeverRefuses: "a run stopped only because another run overlapped it",
  }[invariant];
}
