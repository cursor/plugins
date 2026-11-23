---- MODULE Commented ----
VARIABLE x
(* Next flips x: 0 -> 1 -> 0, so <<x>> stays in 0..1. *)
Init == x = 0
Next == x' = IF x = 0 THEN 1 ELSE 0
====
