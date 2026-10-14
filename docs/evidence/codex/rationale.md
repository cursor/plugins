## Problem

The local source names and exports add(a,b) but subtracts its operands. Grounding in ground.md identifies an unchanged caller check requiring add(3,5) to equal 8. The interface must retain the named export and two positional numeric arguments while correcting arithmetic behavior.

## Usage (caller's view)

```js
import { add } from './sample.js';
const combined = add(3, 5); // 8
const net = add(-4, 4); // 0
const distance = add(0.5, 1.25); // 1.75
```

## Shape

Two number operands become one number result. The stateless function owns summation. Its conceptual signature is add(a:number,b:number):number. Model the Domain keeps the existing boring scalar structure because there are no branches or invalid state transitions to eliminate. Boundary Discipline keeps arithmetic pure and avoids inventing validation policy for already numeric local callers. JavaScript does not enforce this numeric contract in types, so nonnumeric input behavior is outside this fixture's evidenced contract. Laziness Protocol keeps the public surface to one named export and permits a one-operator production change. Interface depth is modest because the behavior is inherently small. The function hides the computation without requiring configuration, object allocation, or lifecycle knowledge.

## Synthesis decision

Candidate 1 is the base. Parent and independent cross-judge both scored it 10/10 against candidate 2 at 8/10. Both receive 2/2 for caller compatibility, numeric correctness contract, smallest public API, and single ownership. Maintainer readability is 2/2 for candidate 1 and 0/2 for candidate 2. Red-flag screening rejects candidate 2's shallow object and pass-through adapter. No structural graft earns its place. Its identity example may inform local verification; the base already supports it. Reject the calculator object, freeze and wrapper. Two structurally distinct candidates completed with no dropouts. HOST adaptation kept both seats on inherited models with minimalist and domain-boundary design stances, and a separate adversarial maintainer judge. Verification completed against implementation. Delegate and parent observed node check.mjs exit 0 with add verified; parent numeric probes and git diff --check passed.

## Tradeoffs accepted

- We accept ordinary JavaScript numeric semantics in exchange for preserving the existing caller contract.
- We accept a narrow two-argument API in exchange for avoiding options and object plumbing unsupported by local requirements.
- We accept no runtime type guards in exchange for keeping the arithmetic policy limited to evidenced numeric callers.

## Alternatives considered

A sum request object with fields left and right makes operands explicit by name, but exposes an extra representation and breaks check.mjs unless wrapped. A wrapper would add a pass-through boundary without hiding meaningful complexity.

A calculator object with an add method can hide future operation state but exposes an object lifecycle and method surface for a domain that has no state. Its depth does not justify the extra public shape.

## Open questions and risks

Could a future separately scoped requirement include nonnumeric inputs or arbitrary precision? The current fixture supplies no such requirement, so implementation need not resolve that speculative expansion.

## Next implementation step

Replace subtraction with addition in sample.js and run the unchanged node check.mjs.
