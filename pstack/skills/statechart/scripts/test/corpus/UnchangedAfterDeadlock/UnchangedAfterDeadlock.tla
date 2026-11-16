---- MODULE UnchangedAfterDeadlock ----
EXTENDS Naturals
VARIABLES x, paid, side

Init == x = 0 /\ paid = FALSE /\ side \in {0, 1}

Stuck == side = 1 /\ FALSE

Step == side = 0 /\ x < 5 /\ x' = x + 1 /\ UNCHANGED <<paid, side>>

Pay == side = 0 /\ x >= 3 /\ paid' = TRUE /\ UNCHANGED <<x, paid, side>>

Next == Step \/ Pay \/ Stuck \/ (x = 5 /\ UNCHANGED <<x, paid, side>>)

Spec == Init /\ [][Next]_<<x, paid, side>>

NeverPaidLate == ~(paid /\ x > 3)
====
