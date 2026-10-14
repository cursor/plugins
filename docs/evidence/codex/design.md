## Usage (caller's view)

Import the named function and pass two JavaScript numbers. The returned number is their sum.

```js
import { add } from './sample.js';
const combined = add(3, 5); // 8
const net = add(-4, 4); // 0
const distance = add(0.5, 1.25); // 1.75
```

## Type and signature sketch

The domain is two number operands and one number result. There is no mutable state or collection.

```js
export const add = (a, b) => {
  throw new Error('not implemented');
};
```

The conceptual signature is `add(a: number, b: number): number`. This describes the existing JavaScript caller contract. It does not add TypeScript or runtime guards.

## Module map

`sample.js` owns the only public arithmetic operation. `check.mjs` imports that named export and verifies its returned value against literal 8. No additional module participates.

## Red-flag screen

Shallow-module concern is bounded by the domain. A single operation needs one public function and hides the arithmetic expression. No method coordination or public options appear.

Information leakage, temporal decomposition, pass-through methods, split ownership, duplicate task paths, importable internals, and hand-synced lists are absent. The function has no helper or state. The caller does not know the operator used internally.
