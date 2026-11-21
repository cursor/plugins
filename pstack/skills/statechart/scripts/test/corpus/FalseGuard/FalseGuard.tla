---- MODULE FalseGuard ----
EXTENDS Naturals
VARIABLE x
Init == x = 0
Grow == x < 2 /\ x' = x + 1
Unreachable == x > 2 /\ x' = 0
Done == x = 2 /\ UNCHANGED x
Next == Grow \/ Unreachable \/ Done
Spec == Init /\ [][Next]_x
Small == x <= 2
====
