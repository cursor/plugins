---- MODULE OutputFolder ----
EXTENDS Naturals

Runs == {1, 2}
NoRun == 0
NoFolder == [exists |-> FALSE, by |-> NoRun, read |-> {}, notes |-> FALSE]

VARIABLES pc, inputOk, snap, read, out, aside, spec, noted, wrote, broke, exitCode

vars == <<pc, inputOk, snap, read, out, aside, spec, noted, wrote, broke, exitCode>>

Init ==
  /\ pc = [r \in Runs |-> "idle"]
  /\ inputOk = [r \in Runs |-> TRUE]
  /\ snap = [r \in Runs |-> 0]
  /\ read = [r \in Runs |-> {}]
  /\ out = NoFolder
  /\ aside = [r \in Runs |-> NoFolder]
  /\ spec = 1
  /\ noted = FALSE
  /\ wrote = [r \in Runs |-> FALSE]
  /\ broke = [r \in Runs |-> FALSE]
  /\ exitCode = [r \in Runs |-> "none"]

Set(f, r, v) == [f EXCEPT ![r] = v]
Going(r) == pc[r] \notin {"idle", "exited", "stopped", "orphanTlc"}
Go(r, to) == pc' = Set(pc, r, to)
Exit(r, code) == pc' = Set(pc, r, "exited") /\ exitCode' = Set(exitCode, r, code)

Start(r) ==
  /\ pc[r] = "idle"
  /\ r = 2 => pc[1] # "idle"
  /\ \E ok \in BOOLEAN : inputOk' = Set(inputOk, r, ok)
  /\ snap' = Set(snap, r, spec)
  /\ Go(r, "check")
  /\ UNCHANGED <<read, out, aside, spec, noted, wrote, broke, exitCode>>

Refuse(r) ==
  /\ pc[r] = "check"
  /\ ~inputOk[r] \/ out.notes
  /\ Exit(r, "2")
  /\ UNCHANGED <<inputOk, snap, read, out, aside, spec, noted, wrote, broke>>

Tlc(r) ==
  /\ \/ pc[r] = "check" /\ inputOk[r] /\ ~out.notes
     \/ pc[r] = "tlc"
  /\ read' = Set(read, r, read[r] \cup {spec})
  /\ Go(r, IF pc[r] = "check" THEN "tlc" ELSE "draw")
  /\ UNCHANGED <<inputOk, snap, out, aside, spec, noted, wrote, broke, exitCode>>

Draw(r) ==
  /\ pc[r] = "draw"
  /\ Go(r, "publish")
  /\ UNCHANGED <<inputOk, snap, read, out, aside, spec, noted, wrote, broke, exitCode>>

Stale(r) ==
  /\ pc[r] = "publish" /\ spec # snap[r]
  /\ Exit(r, "2")
  /\ UNCHANGED <<inputOk, snap, read, out, aside, spec, noted, wrote, broke>>

Foreign(r) ==
  /\ pc[r] = "publish" /\ spec = snap[r] /\ out.notes
  /\ Exit(r, "2")
  /\ UNCHANGED <<inputOk, snap, read, out, aside, spec, noted, wrote, broke>>

Swap(r) ==
  /\ pc[r] = "publish" /\ spec = snap[r] /\ ~out.notes
  /\ Go(r, "swap")
  /\ UNCHANGED <<inputOk, snap, read, out, aside, spec, noted, wrote, broke, exitCode>>

MoveIn(r) ==
  /\ pc[r] = "swap" /\ ~out.exists
  /\ out' = [exists |-> TRUE, by |-> r, read |-> read[r], notes |-> FALSE]
  /\ wrote' = Set(wrote, r, TRUE)
  /\ Go(r, "clean")
  /\ UNCHANGED <<inputOk, snap, read, aside, spec, noted, broke, exitCode>>

MoveAside(r) ==
  /\ pc[r] = "swap" /\ out.exists /\ ~aside[r].exists
  /\ aside' = Set(aside, r, out)
  /\ out' = NoFolder
  /\ Go(r, "aside")
  /\ UNCHANGED <<inputOk, snap, read, spec, noted, wrote, broke, exitCode>>

Checked(r) ==
  /\ pc[r] = "aside" /\ ~aside[r].notes
  /\ Go(r, "swap")
  /\ UNCHANGED <<inputOk, snap, read, out, aside, spec, noted, wrote, broke, exitCode>>

Supersede(r) ==
  /\ pc[r] = "swap" /\ out.exists /\ aside[r].exists /\ ~out.notes
  /\ aside' = Set(aside, r, NoFolder)
  /\ UNCHANGED <<pc, inputOk, snap, read, out, spec, noted, wrote, broke, exitCode>>

Restore(r) ==
  /\ pc[r] = "aside" /\ aside[r].notes /\ ~out.exists
  /\ out' = aside[r]
  /\ aside' = Set(aside, r, NoFolder)
  /\ Exit(r, "2")
  /\ UNCHANGED <<inputOk, snap, read, spec, noted, wrote, broke>>

KeepAside(r) ==
  /\ \/ pc[r] = "aside" /\ aside[r].notes /\ out.exists
     \/ pc[r] = "swap" /\ aside[r].exists /\ out.notes
  /\ Exit(r, "2")
  /\ UNCHANGED <<inputOk, snap, read, out, aside, spec, noted, wrote, broke>>

RenameFails(r) ==
  /\ pc[r] \in {"swap", "aside"}
  /\ \/ /\ aside[r].exists /\ ~out.exists
        /\ out' = aside[r]
        /\ aside' = Set(aside, r, NoFolder)
     \/ UNCHANGED <<out, aside>>
  /\ broke' = Set(broke, r, TRUE)
  /\ Exit(r, "2")
  /\ UNCHANGED <<inputOk, snap, read, spec, noted, wrote>>

Clean(r) ==
  /\ pc[r] = "clean"
  /\ aside' = Set(aside, r, NoFolder)
  /\ Exit(r, "0")
  /\ UNCHANGED <<inputOk, snap, read, out, spec, noted, wrote, broke>>

Stop(r) ==
  /\ Going(r)
  /\ Go(r, "stopped")
  /\ UNCHANGED <<inputOk, snap, read, out, aside, spec, noted, wrote, broke, exitCode>>

KillNode(r) ==
  /\ pc[r] = "tlc"
  /\ Go(r, "orphanTlc")
  /\ UNCHANGED <<inputOk, snap, read, out, aside, spec, noted, wrote, broke, exitCode>>

OrphanEnd(r) ==
  /\ pc[r] = "orphanTlc"
  /\ Go(r, "stopped")
  /\ UNCHANGED <<inputOk, snap, read, out, aside, spec, noted, wrote, broke, exitCode>>

Edit ==
  /\ spec = 1
  /\ spec' = 2
  /\ UNCHANGED <<pc, inputOk, snap, read, out, aside, noted, wrote, broke, exitCode>>

Note ==
  /\ ~noted
  /\ noted' = TRUE
  /\ out' = [out EXCEPT !.exists = TRUE, !.notes = TRUE]
  /\ UNCHANGED <<pc, inputOk, snap, read, aside, spec, wrote, broke, exitCode>>

Next ==
  \/ Edit \/ Note
  \/ \E r \in Runs :
       Start(r) \/ Refuse(r) \/ Tlc(r) \/ Draw(r) \/ Stale(r) \/ Foreign(r) \/ Swap(r)
         \/ MoveIn(r) \/ MoveAside(r) \/ Checked(r) \/ Supersede(r) \/ Restore(r)
         \/ KeepAside(r) \/ RenameFails(r) \/ Clean(r) \/ Stop(r) \/ KillNode(r) \/ OrphanEnd(r)

Spec == Init /\ [][Next]_vars

\* The folder never holds a chart drawn from two versions of the spec.
ChartsOneSpec == out.read \in {{}, {1}, {2}}

\* A file that you put in the folder is never deleted.
KeepsYourFiles == noted => out.notes \/ \E r \in Runs : aside[r].notes

\* Once a run writes a chart, the folder or a folder that a run moved aside always holds one.
NeverLosesChart ==
  (\E r \in Runs : wrote[r]) => out.by # NoRun \/ \E r \in Runs : aside[r].by # NoRun

\* A run that exits 2 did not write the folder.
ExitTwoLeavesFolder == \A r \in Runs : exitCode[r] = "2" => ~wrote[r]

\* A run exits 2 only for a wrong input, an edited spec, a file that it did not write, or a failed
\* rename, never because another run overlaps it.
OverlapNeverRefuses ==
  \A r \in Runs : exitCode[r] = "2" => ~inputOk[r] \/ spec # snap[r] \/ noted \/ broke[r]
====
