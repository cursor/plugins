---- MODULE EarlyCoverage ----
EXTENDS Naturals
VARIABLE x
Init == x = 0
Grow == x < 2 /\ x' = x + 1
Later == x = 2 /\ UNCHANGED x
Next == Grow \/ Later
Spec == Init /\ [][Next]_x
Stay == x = 0
====
