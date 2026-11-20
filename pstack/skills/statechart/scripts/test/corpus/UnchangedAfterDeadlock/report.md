# UnchangedAfterDeadlock

TLC reached 7 states and 6 steps. The chart draws 7 states and 5 arrows.
The chart does not draw 1 steps that stay in one chart state.

## NoDeadlock breaks
The shortest path has 0 steps:
0. side=1 x=0 paid=FALSE

## TLC warnings
TLC printed this warning while it checked the rules. A rule can hold only because of the problem that the warning names.
```
The variable paid was changed while it is specified as UNCHANGED at
line 11, col 61 to line 11, col 64 of module UnchangedAfterDeadlock
```

## Rules that hold
NeverPaidLate
