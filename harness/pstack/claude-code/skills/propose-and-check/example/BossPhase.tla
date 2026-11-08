---------------------------- MODULE BossPhase ----------------------------
\* The dynamic part of the toy: a two-phase boss against two heroes.
\* Who owns which ability comes from design.pl as Abil1 / Abil2; the rules of
\* the fight are written once, here.
\*
\*   Phase 1: smash cracks the armor, dash strikes while it is cracked.
\*            Hits1 strikes break the phase.  The armor can close on its own.
\*   Phase 2: the boss charges a beam.  shield absorbs it and stuns the boss,
\*            grapple pulls the boss down while stunned.  An unshielded beam
\*            downs one hero.  Hits2 pulls win.
\*   A downed hero is revived by a living partner who owns revive.
\*   Both heroes down: the fight is lost.
EXTENDS Naturals, FiniteSets

CONSTANTS Abil1, Abil2, Hits1, Hits2

Heroes == {1, 2}
Owns(h, a) == IF h = 1 THEN a \in Abil1 ELSE a \in Abil2

VARIABLES phase, armor, beam, hits, down, actors
vars == <<phase, armor, beam, hits, down, actors>>

Alive == Heroes \ down

Init == /\ phase = "p1"
        /\ armor = "closed"
        /\ beam = "idle"
        /\ hits = Hits1
        /\ down = {}
        /\ actors = {}              \* heroes who took part in the fight so far

\* Phases are strings: TLC refuses to compare the number 1 with the string "won".
\* ---- hero actions ---------------------------------------------------------
Crack(h) == /\ phase = "p1" /\ h \in Alive /\ Owns(h, "smash") /\ armor = "closed"
            /\ armor' = "cracked"
            /\ actors' = actors \cup {h}
            /\ UNCHANGED <<phase, beam, hits, down>>

Strike(h) == /\ phase = "p1" /\ h \in Alive /\ Owns(h, "dash") /\ armor = "cracked"
             /\ armor' = "closed"
             /\ actors' = actors \cup {h}
             /\ IF hits = 1
                  THEN phase' = "p2" /\ hits' = Hits2
                  ELSE phase' = "p1" /\ hits' = hits - 1
             /\ UNCHANGED <<beam, down>>

Block(h) == /\ phase = "p2" /\ h \in Alive /\ Owns(h, "shield") /\ beam = "charged"
            /\ beam' = "stunned"
            /\ actors' = actors \cup {h}
            /\ UNCHANGED <<phase, armor, hits, down>>

Pull(h) == /\ phase = "p2" /\ h \in Alive /\ Owns(h, "grapple") /\ beam = "stunned"
           /\ beam' = "idle"
           /\ actors' = actors \cup {h}
           /\ IF hits = 1
                THEN phase' = "won" /\ hits' = 0
                ELSE phase' = "p2" /\ hits' = hits - 1
           /\ UNCHANGED <<armor, down>>

Revive(h) == /\ phase \in {"p1", "p2"} /\ h \in down
             /\ \E g \in Alive : Owns(g, "revive")
             /\ down' = down \ {h}
             /\ UNCHANGED <<phase, armor, beam, hits, actors>>

\* ---- boss actions ---------------------------------------------------------
Regrow == /\ phase = "p1" /\ armor = "cracked" /\ armor' = "closed"
          /\ UNCHANGED <<phase, beam, hits, down, actors>>

Charge == /\ phase = "p2" /\ beam = "idle" /\ beam' = "charged"
          /\ UNCHANGED <<phase, armor, hits, down, actors>>

Recover == /\ phase = "p2" /\ beam = "stunned" /\ beam' = "idle"
           /\ UNCHANGED <<phase, armor, hits, down, actors>>

Fire == /\ phase = "p2" /\ beam = "charged"
        /\ \E h \in Alive :
             /\ down' = down \cup {h}
             /\ phase' = IF down' = Heroes THEN "lost" ELSE "p2"
        /\ beam' = "idle"
        /\ UNCHANGED <<armor, hits, actors>>

Done == /\ phase \in {"won", "lost"} /\ UNCHANGED vars

Next == \/ \E h \in Heroes : Crack(h) \/ Strike(h) \/ Block(h) \/ Pull(h) \/ Revive(h)
        \/ Regrow \/ Charge \/ Recover \/ Fire \/ Done

\* Heroes act whenever they keep being able to; the boss charges and fires.
Fair == /\ SF_vars(\E h \in Heroes : Crack(h))
        /\ SF_vars(\E h \in Heroes : Strike(h))
        /\ SF_vars(\E h \in Heroes : Block(h))
        /\ SF_vars(\E h \in Heroes : Pull(h))
        /\ SF_vars(\E h \in Heroes : Revive(h))
        /\ WF_vars(Charge) /\ WF_vars(Fire)

Spec == Init /\ [][Next]_vars /\ Fair

\* ---- rules, in the designer's words ---------------------------------------
TypeOK == /\ phase \in {"p1", "p2", "won", "lost"}
          /\ armor \in {"closed", "cracked"}
          /\ beam \in {"idle", "charged", "stunned"}
          /\ hits \in 0..2
          /\ down \subseteq Heroes
          /\ actors \subseteq Heroes

\* "Nobody wins the boss alone."
NoSingleHeroWin == phase = "won" => actors = Heroes

\* "Never leave a state where the only hero who can do what the fight needs
\*  next is down, and nobody alive can get them up."
Needed == IF phase = "p1" THEN {"smash", "dash"}
          ELSE IF phase = "p2" THEN {"shield", "grapple"} ELSE {}
Strand == \E h \in down :
            /\ ~(\E g \in Alive : Owns(g, "revive"))
            /\ \E a \in Needed : Owns(h, a) /\ ~(\E g \in Alive : Owns(g, a))
NoStrand == ~Strand

\* "The fight always ends."
Terminates == <>(phase \in {"won", "lost"})

\* Reachability witness, expected to FAIL: its counterexample is a mixed win.
NoMixedWin == ~(phase = "won" /\ actors = Heroes)
=============================================================================
