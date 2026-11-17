---
name: swift-best-practices
description: Swift best practices. Use when reading or editing any .swift file.
paths: ["**/*.swift"]
disable-model-invocation: true
---

# Swift best practices

Apply the **type-system-discipline** principle skill first.

| Rule | Summary |
|------|---------|
| Enums with associated values | Model variants as an enum. No optional-field structs. |
| Newtype wrappers | Wrap a primitive in a struct when two values share a type but must not mix. Validate once at creation. Never `typealias UserId = String`. |
| Constructive modeling | Build the shape so the illegal value can't be constructed. First-plus-rest for non-empty. Start plus duration for a range. |
| Simplest total type | Keep `[T]` while every operation on it stays total. Strengthen only where the loose type forces `!`, `as!`, or a "should never happen" trap. |
| Value types first | `struct` and `enum` for data. `class` only when identity is the point, such as an `@Observable` model or a UIKit subclass. |
| `Any` at the boundary | Domain types never carry `Any`, `AnyObject`, or `[String: Any]`. |
| Codable before dictionaries | Before walking JSON as a dictionary, decode into a `Decodable` type or the repository's generated schema. |
| No `as!`, no `!`, no IUO | `as!`, postfix `!`, `try!`, and `Type!` crash at runtime. Cast only after a check. Guaranteed `as` upcasts are fine. UIKit `IBOutlet` is the IUO exception. |
| Narrowing hierarchy | Enum `switch` > `if case` / `guard case` > `as?` > `as!`. |
| Exhaustiveness | No `default` on your own enums. `@unknown default` only on frozen or imported enums. |
| `some` over `any` | `some P` or `<T: P>` at API boundaries. `any P` only to store mixed existentials. |
| Boundary decode | Parse where data crosses in, into a named domain type. Trust types inside. See the **boundary-discipline** principle skill. |
| Schema-derived types | When a proto, OpenAPI spec, or generated `Codable` type owns the shape, use it. Do not hand-roll a parallel struct. |
| Isolation and `Sendable` | Shared mutable state lives in an actor. UI types are `@MainActor`. A value crosses isolation only if it is `Sendable`, or region-based isolation proves it. `@unchecked Sendable` and `nonisolated(unsafe)` need a lock that actually protects the state. Prefer structured concurrency to `Task.detached`. Do not make every type an actor. |
| `throws`, then typed throws | Throwing functions for control flow. `Result` for stored or passed-around failures. `throws(E)` only for in-module errors you always handle, generic code that forwards `E`, or embedded code that cannot afford `any Error`. Untyped `throws` on public APIs that may grow new failure modes. |
| Swift Testing | New unit and integration tests use `@Test` and `#expect`. XCTest stays for UI automation and `XCTMetric`. Don't mock what you can run. |
| Logger | `Logger(subsystem:category:)` with enough context to debug from an id. No `print` in shipped code. |

Examples: `references/patterns.md`.
