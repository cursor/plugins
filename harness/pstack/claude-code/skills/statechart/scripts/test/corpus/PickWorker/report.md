# PickWorker

TLC reached 2 states and 1 steps. The chart draws 2 states and 1 arrows.
With SYMMETRY, TLC keeps one representative for each group of states that it counts as the same. An arrow can lead to the representative rather than to the state that the step reaches.

## TLC warnings
TLC printed this warning while it checked the rules. A rule can hold only because of the problem that the warning names.
```
Declaring symmetry during liveness checking is dangerous. It might cause TLC to miss violations of the stated liveness properties. Please check liveness without symmetry defined.
```

## Rules that hold
PicksFirst
