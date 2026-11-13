module

public import Veil

/-
Veil translation of `pstack/skills/statechart/scripts/test/corpus/MediaPlayerFixed/MediaPlayerFixed.tla`.
It is `MediaPlayer.lean` with the fix in `YouTurnItUp`: you can turn the volume up
only while something plays. `MediaPlayerFixed.cfg` checks no temporal property.
-/

veil module MediaPlayerFixed

enum Playback = { buffering, paused, playing, stopped }
enum Volume = { loud, muted, normalVolume }

individual playback : Playback
individual volume : Volume

#gen_state

after_init {
  playback := stopped
  volume := normalVolume
}

action YouPressPlay {
  require playback = stopped ∨ playback = paused
  if playback = stopped then playback := buffering
  else playback := playing
}

action EnoughDataArrives {
  require playback = buffering
  playback := playing
}

action TheNetworkSlows {
  require playback = playing
  playback := buffering
}

action YouPressPause {
  require playback = playing
  playback := paused
}

action ACallComesIn {
  require playback = playing ∨ volume = normalVolume ∨ volume = loud
  if playback = playing then playback := paused
  if volume = normalVolume ∨ volume = loud then volume := muted
}

action TheTrackEnds {
  require playback = playing ∨ volume = loud
  if playback = playing then playback := stopped
  if volume = loud then volume := normalVolume
}

action YouPressStop {
  require playback = playing ∨ playback = paused ∨ playback = buffering ∨ volume = loud
  if playback = playing ∨ playback = paused ∨ playback = buffering then playback := stopped
  if volume = loud then volume := normalVolume
}

-- YouTurnItUp ==
--     /\ \/ (volume = "Normal volume" /\ ~(playback = "Stopped") /\ volume' = "Loud")
--     /\ UNCHANGED <<playback>>
action YouTurnItUp {
  require volume = normalVolume ∧ ¬ (playback = stopped)
  volume := loud
}

action YouTurnItDown {
  require volume = loud
  volume := normalVolume
}

action YouPressMute {
  if volume = muted then volume := normalVolume
  else volume := muted
}

action TheCallEnds {
  require volume = muted
  volume := normalVolume
}

invariant [LoudWhenStopped] ¬ (playback = stopped ∧ volume = loud)

termination false

#gen_spec

-- TLC checks this spec with `MediaPlayerFixed.cfg`. The check below uses the cfg's instance.
-- From this project's root, `lake lean Corpus/MediaPlayerFixed.lean` prints the result.
-- It finds no violation, in as many distinct states as TLC (11).
-- * `INVARIANT TypeOK`: Lean's types ensure it.
-- * `INVARIANT LoudWhenStopped`: the `invariant [LoudWhenStopped]` above.
-- * Deadlock: `termination false` above reports every state without successors, as TLC does.
#model_check {} {}

end MediaPlayerFixed
