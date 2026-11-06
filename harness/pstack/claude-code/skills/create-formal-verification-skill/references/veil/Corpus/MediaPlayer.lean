module

public import Veil

/-
Veil translation of `pstack/skills/statechart/scripts/test/corpus/MediaPlayer/MediaPlayer.tla`:
a media player with two regions, Playback and Volume, and one seeded bug. You can
turn the volume up while nothing plays.

Each region is one field, and each TLA+ action is one Veil action. A string state
becomes an enum constructor: `"Normal volume"` is `normalVolume`.
-/

veil module MediaPlayer

-- playbackStates == {"Buffering", "Paused", "Playing", "Stopped"}
enum Playback = { buffering, paused, playing, stopped }
-- volumeStates == {"Loud", "Muted", "Normal volume"}
enum Volume = { loud, muted, normalVolume }

-- VARIABLES playback, volume
individual playback : Playback
individual volume : Volume

#gen_state

-- Init ==
--     /\ playback = "Stopped"
--     /\ volume = "Normal volume"
after_init {
  playback := stopped
  volume := normalVolume
}

-- The guards of the disjuncts in each source action exclude each other, so `if`
-- and `else` give the same steps as the disjunction.

-- YouPressPlay ==
--     /\ \/ (playback = "Stopped" /\ playback' = "Buffering")
--        \/ (playback = "Paused" /\ playback' = "Playing")
--     /\ UNCHANGED <<volume>>
action YouPressPlay {
  require playback = stopped ∨ playback = paused
  if playback = stopped then playback := buffering
  else playback := playing
}

-- EnoughDataArrives == playback = "Buffering" /\ playback' = "Playing" /\ UNCHANGED volume
action EnoughDataArrives {
  require playback = buffering
  playback := playing
}

-- TheNetworkSlows == playback = "Playing" /\ playback' = "Buffering" /\ UNCHANGED volume
action TheNetworkSlows {
  require playback = playing
  playback := buffering
}

-- YouPressPause == playback = "Playing" /\ playback' = "Paused" /\ UNCHANGED volume
action YouPressPause {
  require playback = playing
  playback := paused
}

-- ACallComesIn ==
--     /\ (playback \in {"Playing"} \/ volume \in {"Normal volume", "Loud"})
--     /\ \/ (playback = "Playing" /\ playback' = "Paused")
--        \/ (playback \notin {"Playing"} /\ UNCHANGED playback)
--     /\ \/ (volume = "Normal volume" /\ volume' = "Muted")
--        \/ (volume = "Loud" /\ volume' = "Muted")
--        \/ (volume \notin {"Normal volume", "Loud"} /\ UNCHANGED volume)
action ACallComesIn {
  require playback = playing ∨ volume = normalVolume ∨ volume = loud
  if playback = playing then playback := paused
  if volume = normalVolume ∨ volume = loud then volume := muted
}

-- TheTrackEnds ==
--     /\ (playback \in {"Playing"} \/ volume \in {"Loud"})
--     /\ \/ (playback = "Playing" /\ playback' = "Stopped")
--        \/ (playback \notin {"Playing"} /\ UNCHANGED playback)
--     /\ \/ (volume = "Loud" /\ volume' = "Normal volume")
--        \/ (volume \notin {"Loud"} /\ UNCHANGED volume)
action TheTrackEnds {
  require playback = playing ∨ volume = loud
  if playback = playing then playback := stopped
  if volume = loud then volume := normalVolume
}

-- YouPressStop ==
--     /\ (playback \in {"Playing", "Paused", "Buffering"} \/ volume \in {"Loud"})
--     /\ \/ (playback \in {"Playing", "Paused", "Buffering"} /\ playback' = "Stopped")
--        \/ (playback \notin {"Playing", "Paused", "Buffering"} /\ UNCHANGED playback)
--     /\ \/ (volume = "Loud" /\ volume' = "Normal volume")
--        \/ (volume \notin {"Loud"} /\ UNCHANGED volume)
-- (The source writes the first disjunct of `playback` as one disjunct per value.)
action YouPressStop {
  require playback = playing ∨ playback = paused ∨ playback = buffering ∨ volume = loud
  if playback = playing ∨ playback = paused ∨ playback = buffering then playback := stopped
  if volume = loud then volume := normalVolume
}

-- YouTurnItUp == volume = "Normal volume" /\ volume' = "Loud" /\ UNCHANGED playback
action YouTurnItUp {
  require volume = normalVolume
  volume := loud
}

-- YouTurnItDown == volume = "Loud" /\ volume' = "Normal volume" /\ UNCHANGED playback
action YouTurnItDown {
  require volume = loud
  volume := normalVolume
}

-- YouPressMute ==
--     /\ \/ (volume = "Normal volume" /\ volume' = "Muted")
--        \/ (volume = "Loud" /\ volume' = "Muted")
--        \/ (volume = "Muted" /\ volume' = "Normal volume")
--     /\ UNCHANGED <<playback>>
action YouPressMute {
  if volume = muted then volume := normalVolume
  else volume := muted
}

-- TheCallEnds == volume = "Muted" /\ volume' = "Normal volume" /\ UNCHANGED playback
action TheCallEnds {
  require volume = muted
  volume := normalVolume
}

-- LoudWhenStopped == ~(playback = "Stopped" /\ volume = "Loud")
invariant [LoudWhenStopped] ¬ (playback = stopped ∧ volume = loud)

-- EventuallyStops == <>(playback = "Stopped")
-- `Spec` has no fairness, so the property has no antecedent. `Spec` allows stuttering in every
-- state and Veil does not, but every run starts with `playback = stopped`, so stuttering
-- cannot change the result.
temporal (only := check) [EventuallyStops] ◇ ⌜ playback = stopped ⌝

-- TLC checks deadlock, because `MediaPlayer.cfg` does not turn it off.
termination false

#gen_spec

-- TLC checks this spec with `MediaPlayer.cfg`. The checks below use the cfg's instance. The
-- module has no `type`s, `param`s, or `immutable` fields, so both arguments are empty.
-- From this project's root, `lake lean Corpus/MediaPlayer.lean` runs both checks.
--
-- `#model_check` finds a violation of `LoudWhenStopped` after 1 step, `YouTurnItUp`. TLC
-- reports `LoudWhenStopped` with the same step.
-- * `INVARIANT TypeOK`: Lean's types ensure it.
-- * `INVARIANT LoudWhenStopped`: the `invariant [LoudWhenStopped]` above.
-- * Deadlock: `termination false` above reports every state without successors, as TLC does.
-- * `set_option veil.violationIsError false in` reports the expected violation as information,
--   so that the file still builds.
set_option veil.violationIsError false in
#model_check {} {}

-- `#temporal_check` checks `PROPERTY EventuallyStops`, the `temporal [EventuallyStops]` above.
-- It finds no violation. TLC reports no violation either.
#temporal_check {} {}

end MediaPlayer
