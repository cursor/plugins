---- MODULE Vac ----
EXTENDS Naturals
VARIABLES sent, paid

Init == sent = 0 /\ paid = FALSE

YouPressPay == sent < 2 /\ sent' = sent + 1 /\ UNCHANGED paid

BankAccepts == sent > 0 /\ paid' = TRUE /\ UNCHANGED <<sent, paid>>

Done == sent = 2 /\ UNCHANGED <<sent, paid>>

Next == YouPressPay \/ BankAccepts \/ Done

Spec == Init /\ [][Next]_<<sent, paid>>

NeverPaidTwice == ~(paid /\ sent > 1)
====
