# Running the example

A toy to run the loop end to end. Two heroes, the Runner and the Brute, split eight abilities between them: `jump dash climb swim smash shield grapple revive`. Six obstacles each need one of a few abilities. A boss has two phases. The author's rules are in `design.pl`. The fight is in `BossPhase.tla`.

Everything below is the real output of `./run-all.sh` (about 40 seconds, nearly all of it JVM start-up) on 2026-11-08, SWI-Prolog 10.1.20, TLC 2026.11.06 with Temurin 21.0.13, Windows 11 under Git Bash.

## Set up

```sh
winget install SWI-Prolog.SWI-Prolog        # or: brew install swi-prolog / apt install swi-prolog
# TLC: any tla2tools.jar and a Java 11+ runtime. tlc.sh reads TLA_HOME (required; on Windows, e.g. TLA_HOME=C:/tools/tla)
# and expects $TLA_HOME/tla2tools.jar plus, optionally, $TLA_HOME/jre/bin/java.
```

`tlc.sh` runs TLC on `BossPhase.tla` with a config. `check.sh` prints one line per config. `path.sh` prints a counterexample as one line per step. `run-all.sh` runs the four stages below.

## What each stage shows

1. **Prolog proposes.** `swipl design.pl -- search` counts the layouts left after each rule, ranks the survivors, and writes a TLC config for each survivor to `out/`. `BossPhase.cfg` is a copy of `out/cand1.cfg`.
2. **TLC checks the survivors.** Each config checks `TypeOK`, `NoSingleHeroWin` (nobody wins alone), `NoStrand` (the only hero who can do what the fight needs next is never down with nobody to revive them), and the liveness property `Terminates` (the fight always ends). `*-reach.cfg` asks for the opposite: `NoMixedWin` is expected to fail, and its trace is a win by both heroes.
3. **A deliberately bad layout.** The Runner owns every boss ability. The Prolog rule `phase1_split` forbids it, so the search never proposes it.
4. **The counterexample becomes a constraint.** The `NoStrand` path suggests a rule. `swipl design.pl -- fix` adds it as `strand_free` and proposes again.

## Output

```
### 1. Prolog proposes

$ swipl design.pl -- search
raw layouts: 256

layouts left after each hypothesis (cumulative):
  + balance             182
  + not_dead_weight     182
  + needs_partner       66
  + phase1_split        46
  + symmetry            23

best cost -2, shared by 5 layouts

top 8:
  #1  cost -2
    Runner[jump,dash,climb,revive]  (clears 4/6 alone)
    Brute[swim,smash,shield,grapple]  (clears 4/6 alone)
  #2  cost -2
    Runner[jump,dash,swim,revive]  (clears 4/6 alone)
    Brute[climb,smash,shield,grapple]  (clears 4/6 alone)
  #3  cost -2
    Runner[jump,dash,shield,grapple]  (clears 4/6 alone)
    Brute[climb,swim,smash,revive]  (clears 4/6 alone)
  #4  cost -2
    Runner[jump,swim,smash,revive]  (clears 4/6 alone)
    Brute[dash,climb,shield,grapple]  (clears 4/6 alone)
  #5  cost -2
    Runner[jump,smash,shield,grapple]  (clears 4/6 alone)
    Brute[dash,climb,swim,revive]  (clears 4/6 alone)
  #6  cost 4
    Runner[jump,dash,climb]  (clears 4/6 alone)
    Brute[swim,smash,shield,grapple,revive]  (clears 4/6 alone)
  #7  cost 4
    Runner[jump,dash,swim]  (clears 4/6 alone)
    Brute[climb,smash,shield,grapple,revive]  (clears 4/6 alone)
  #8  cost 4
    Runner[jump,dash,shield,grapple,revive]  (clears 4/6 alone)
    Brute[climb,swim,smash]  (clears 4/6 alone)

deliberately bad layout (violates phase1_split):
    Runner[jump,dash,smash,shield,grapple]  (clears 5/6 alone)
    Brute[climb,swim,revive]  (clears 3/6 alone)

### 2. TLC checks the survivors

$ ./check.sh out/cand1.cfg out/cand1-reach.cfg
cand1.cfg              ok                                   distinct=25   trace_states=0
cand1-reach.cfg        mixed win REACHABLE (witness)        distinct=25   trace_states=11

# all 23 survivors

$ ./check.sh out/cand1.cfg out/cand2.cfg out/cand3.cfg out/cand4.cfg out/cand5.cfg out/cand6.cfg out/cand7.cfg out/cand8.cfg out/cand9.cfg out/cand10.cfg out/cand11.cfg out/cand12.cfg out/cand13.cfg out/cand14.cfg out/cand15.cfg out/cand16.cfg out/cand17.cfg out/cand18.cfg out/cand19.cfg out/cand20.cfg out/cand21.cfg out/cand22.cfg out/cand23.cfg
cand1.cfg              ok                                   distinct=25   trace_states=0
cand2.cfg              ok                                   distinct=25   trace_states=0
cand3.cfg              ok                                   distinct=25   trace_states=0
cand4.cfg              ok                                   distinct=25   trace_states=0
cand5.cfg              ok                                   distinct=25   trace_states=0
cand6.cfg              Invariant NoStrand is violated       distinct=23   trace_states=7
cand7.cfg              Invariant NoStrand is violated       distinct=23   trace_states=7
cand8.cfg              Invariant NoStrand is violated       distinct=14   trace_states=7
cand9.cfg              Invariant NoStrand is violated       distinct=23   trace_states=7
cand10.cfg             Invariant NoStrand is violated       distinct=14   trace_states=7
cand11.cfg             Invariant NoStrand is violated       distinct=20   trace_states=7
cand12.cfg             Invariant NoStrand is violated       distinct=22   trace_states=7
cand13.cfg             Invariant NoStrand is violated       distinct=20   trace_states=7
cand14.cfg             Invariant NoStrand is violated       distinct=14   trace_states=7
cand15.cfg             Invariant NoStrand is violated       distinct=20   trace_states=7
cand16.cfg             Invariant NoStrand is violated       distinct=14   trace_states=7
cand17.cfg             Invariant NoStrand is violated       distinct=14   trace_states=7
cand18.cfg             Invariant NoStrand is violated       distinct=14   trace_states=7
cand19.cfg             Invariant NoStrand is violated       distinct=14   trace_states=7
cand20.cfg             Invariant NoStrand is violated       distinct=20   trace_states=7
cand21.cfg             Invariant NoStrand is violated       distinct=14   trace_states=7
cand22.cfg             Invariant NoStrand is violated       distinct=20   trace_states=7
cand23.cfg             ok                                   distinct=25   trace_states=0

### 3. A counterexample on a survivor, then on a deliberately bad layout

$ ./path.sh out/cand6.cfg
  1. Initial
  2. Crack(2)
  3. Strike(1)
  4. Crack(2)
  5. Strike(1)
  6. Charge
  7. Fire

$ ./path.sh out/bad.cfg
  1. Initial
  2. Crack(1)
  3. Strike(1)
  4. Crack(1)
  5. Strike(1)
  6. Charge
  7. Block(1)
  8. Pull(1)
  9. Charge
  10. Block(1)
  11. Pull(1)

$ ./check.sh out/bad.cfg out/bad-reach.cfg
bad.cfg                Invariant NoSingleHeroWin is violated distinct=25   trace_states=11
bad-reach.cfg          mixed win UNREACHABLE                distinct=25   trace_states=0

# the witness that a mixed win exists, on the top-ranked layout

$ ./path.sh out/cand1-reach.cfg
  1. Initial
  2. Crack(2)
  3. Strike(1)
  4. Crack(2)
  5. Strike(1)
  6. Charge
  7. Block(2)
  8. Pull(2)
  9. Charge
  10. Block(2)
  11. Pull(2)

### 4. The counterexample becomes a constraint; propose again

$ swipl design.pl -- fix
layouts left with strand_free added: 6
top 4:
  #1  cost -2
    Runner[jump,dash,climb,revive]  (clears 4/6 alone)
    Brute[swim,smash,shield,grapple]  (clears 4/6 alone)
  #2  cost -2
    Runner[jump,dash,swim,revive]  (clears 4/6 alone)
    Brute[climb,smash,shield,grapple]  (clears 4/6 alone)
  #3  cost -2
    Runner[jump,dash,shield,grapple]  (clears 4/6 alone)
    Brute[climb,swim,smash,revive]  (clears 4/6 alone)
  #4  cost -2
    Runner[jump,swim,smash,revive]  (clears 4/6 alone)
    Brute[dash,climb,shield,grapple]  (clears 4/6 alone)

$ ./check.sh out/fixed1.cfg out/fixed2.cfg out/fixed3.cfg out/fixed4.cfg out/fixed5.cfg out/fixed6.cfg
fixed1.cfg             ok                                   distinct=25   trace_states=0
fixed2.cfg             ok                                   distinct=25   trace_states=0
fixed3.cfg             ok                                   distinct=25   trace_states=0
fixed4.cfg             ok                                   distinct=25   trace_states=0
fixed5.cfg             ok                                   distinct=25   trace_states=0
fixed6.cfg             ok                                   distinct=25   trace_states=0

### 5. Do the two models agree?
# Abil lines of the 6 survivors that passed TLC vs. the 6 layouts Prolog proposes with strand_free
identical (12 lines each)
```

`distinct=` is the last count TLC printed. On a violated config TLC stops early, so that count is partial. `trace_states` is the number of states in the counterexample.

## Reading it

- **The rules shrink 256 layouts to 23.** `balance` removes 74, `not_dead_weight` removes none (after `balance` every layout already satisfies it; a rule that removes nothing is a finding), `needs_partner` removes 116, `phase1_split` removes 20, and `symmetry` halves what is left (46 to 23).
- **The ranking never saw the dynamics.** The five layouts with the best cost (-2) all pass TLC. The next three (cost 4) all fail. Of the 23 survivors, 6 pass and 17 fail `NoStrand`.
- **The counterexample, in the author's words.** In the shape of `cand6`, the Brute holds `shield`, `grapple`, and `revive`. The pair breaks the armor twice, the boss charges its beam, and the beam hits the Brute. The Runner is alive, but cannot block, cannot pull the boss down, and cannot revive the Brute. The fight cannot be won from there. `Fire` does not name the victim in the path above. State 7 of `out/cand6.cfg` shows `down = {2}`, the Brute.
- **The new constraint has a price.** `strand_free` says the reviver holds neither `shield` nor `grapple`. With `phase1_split`, that means both phase 2 abilities belong to one hero, so phase 2 no longer needs both heroes. Look at the `cand1-reach.cfg` witness above: steps 7 to 11 are `Block(2)`, `Pull(2)`, `Charge`, `Block(2)`, `Pull(2)`, all by the Brute. Whether that is acceptable, or `revive` should belong to both heroes, or a death should simply restart the phase, is the author's call. The tool shows the consequence and does not choose.
- **The two models agree.** `fix` leaves 6 layouts, and the same 6 pass TLC. Stage 5 compares them exactly: the sorted `Abil1`/`Abil2` lines of the six passing configs and of the six proposed ones are identical.
- **The static rule and the dynamic rule agree on the bad layout.** `phase1_split` rejects it in Prolog, and TLC rejects it independently: `NoSingleHeroWin` fails after 11 states, and `bad-reach.cfg` shows that no mixed win exists at all.

## The checks can fail

A check that never failed proves nothing, so each property was seen failing:

- `NoSingleHeroWin` fails on the bad layout, and `NoStrand` fails on 17 survivors (above).
- `Terminates` fails when the fairness condition is removed from `Spec` (edit the line `Spec == Init /\ [][Next]_vars /\ Fair` to drop `/\ Fair`):

```
Error: Temporal property Terminates was violated.
Error: The following behavior constitutes a counter-example:
State 10: <Pull(2) ...>
State 11: Stuttering
```

  With the fairness back, `Terminates` holds on all six passing layouts, so the fight always ends there.
- The passing layout, for scale (`./tlc.sh BossPhase.cfg`):

```
$ ./tlc.sh BossPhase.cfg   (summary lines)
Model checking completed. No error has been found.
42 states generated, 25 distinct states found, 0 states left on queue.
The depth of the complete state graph search is 13.
```

## What the models leave out

Time (a window is "still open" or "closed", nothing more), damage numbers (a strike is one hit), how the boss picks its victim (any living hero, chosen freely), and the real game's geometry. A pass covers this model with `Hits1 = Hits2 = 2`. The obstacles are in Prolog only: TLC does not know them.

## Replay on real code

There is no real code in this toy. In a project, the shortest path from stage 3 becomes a test: `Crack`, `Strike`, `Crack`, `Strike`, `Charge`, `Fire`, then assert that the fight is stuck. The `Fire` step needs a forced victim, so the test sets the reviver as the target.
