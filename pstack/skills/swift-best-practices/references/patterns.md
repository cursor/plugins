# Swift patterns

Code examples for each rule in `SKILL.md`. The underlying principles are language-agnostic. See the **type-system-discipline** and **boundary-discipline** principle skills.

## Enums with associated values

Model variants with associated values. Every case is a legal state. Optional-field structs let contradictory combos exist.

```swift
// Don't. Boolean plus optionals lets loading-and-error exist.
struct DiffState {
  var loading: Bool
  var diff: GitDiff?
  var error: String?
}

// Do. Only valid states exist.
enum DiffState {
  case loading
  case ready(GitDiff)
  case error(String)
}
```

## Newtype wrappers

Wrap primitives so they can't be mixed up. Validate once at the boundary. Downstream code trusts the type.

```swift
struct AgentId: Hashable, Sendable {
  let rawValue: String

  init(_ rawValue: String) throws {
    guard UUID(uuidString: rawValue) != nil else {
      throw AgentIdError.invalid(rawValue)
    }
    self.rawValue = rawValue
  }
}

func focusAgent(id: AgentId) {
  // input is trusted
}

extension AgentId: Decodable {
  init(from decoder: any Decoder) throws {
    let raw = try decoder.singleValueContainer().decode(String.self)
    try self.init(raw)
  }
}
```

Do this when two arguments share a primitive type but mean different things. Don't wrap every `String`.

Never `typealias AgentId = String`. A typealias is a name, not a type.

## Constructive modeling

Build the type from parts that are all legal instead of restricting a loose type with runtime checks.

```swift
struct NonEmpty<T> {
  var first: T
  var rest: [T]
}

// Don't. T[] plus a length check every caller must repeat.
func pickWinner(_ entries: [String]) -> String {
  precondition(!entries.isEmpty)
  return entries.randomElement()!
}

// Do. An empty value of the type can't exist.
func pickWinner(_ entries: NonEmpty<String>) -> String {
  let all = [entries.first] + entries.rest
  return all[Int.random(in: 0..<all.count)]
}
```

A time range as start plus duration. A negative range can't be written.

```swift
// Don't. A comment holds the invariant.
struct TimeRange {
  var start: Date
  var end: Date // start <= end
}

// Do. A negative range can't be constructed. Derive end when needed.
struct TimeRange {
  var start: Date
  var duration: Duration
}
```

## Simplest total type

Don't strengthen everything. Keep `[T]` when every operation on it is total.

```swift
func sum(_ xs: [Int]) -> Int {
  xs.reduce(0, +) // [] is 0, fine
}
```

Strengthen when the loose type forces a lie at a use site. The tells are `!`, `as!`, and a "should never happen" trap.

```swift
// Don't. Partiality smuggled past the compiler.
func newestSession(_ sessions: [Session]) -> Session {
  sessions.first!
}

// Do. Strengthen the input. The assertion disappears.
func newestSession(_ sessions: NonEmpty<Session>) -> Session {
  sessions.first
}
```

Weakening the result to `Session?` is the other total signature.

## Value types first

`struct` and `enum` for data. Value types with `Sendable` members are implicitly `Sendable`. `class` only when identity is the point.

```swift
// Don't. A session is data. A class gives it shared mutable identity it doesn't need.
final class Session {
  var id: SessionId
  var title: String
}

// Do. Data is a value. The editor is a class because the view observes that instance.
struct Session: Sendable {
  let id: SessionId
  var title: String
}

@MainActor
@Observable
final class SessionEditor {
  var session: Session
}
```

UIKit subclasses stay classes. That is identity the framework owns.

`let` unless the stored value changes after init. `Session.id` is `let`. `title` is `var` because the editor renames it.

## `Any` at the boundary

External data is `Any` only until you decode it. Domain types never carry `Any`, `AnyObject`, or `[String: Any]`.

```swift
// Don't
func handle(_ payload: Any) {
  let json = payload as! [String: Any]
  let id = json["id"] as! String
}

// Do
func handle(_ payload: Session) {
  focusSession(id: payload.id)
}
```

External sources include JSON, RPC payloads, `Notification` objects, IPC, file contents, environment variables, and database rows.

## Codable before dictionaries

Before walking JSON as a dictionary, decode into a `Decodable` type. Let one type own validation.

```swift
struct User: Decodable {
  var id: AgentId
  var role: Role
}

enum Role: String, Decodable {
  case admin
  case member
}

func parseUser(_ data: Data) throws -> User {
  try JSONDecoder().decode(User.self, from: data)
}
```

```swift
// Don't
func parseUser(_ data: Data) throws -> User {
  let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]
  let id = json["id"] as! String
  // ...
}
```

Do not add a new JSON library for one payload. Use `JSONDecoder` or the schema generator the codebase already trusts.

Synthesized `Decodable` on a wrapper would dump the raw `String` and skip the throwing initializer. Decode through that initializer, as in Newtype wrappers.

## No `as!`, no `!`, no IUO

Every `as!`, postfix `!`, `try!`, and `Type!` is a potential runtime crash. Cast only after the type system has verified the claim.

```swift
// Don't
let user = data as! User
let id = user.id!

// Don't
var session: Session!

// Do
let user = try JSONDecoder().decode(User.self, from: data)
```

Guaranteed `as` upcasts (`circle as Shape`) are fine. `as?` is fine when you handle `nil`.

UIKit `IBOutlet` is the IUO exception the framework requires. Don't spread that pattern into tests or models. Swift Testing constructs fixtures in `init()`.

When refactoring an `as!` out of existing code, identify why the compiler can't prove the type.

- Missing enum: add cases, switch on them.
- Overly wide source (`Any`, `[String: Any]`): decode it.
- Untyped boundary: parse with the type that owns the shape.
- ObjC bridging: wrap at the boundary into a Swift type, then trust that type.

## Narrowing hierarchy

From best to last-resort:

1. **Enum switch.** The compiler narrows associated values.
2. **`if case` / `guard case`.** One case, then continue.
3. **`as?`.** For class existentials and ObjC bridging.
4. **`as!`.** Only after a check the compiler can't see, which is almost never.

```swift
func area(_ shape: Shape) -> Double {
  switch shape {
  case .circle(let radius):
    return .pi * radius * radius
  case .rect(let width, let height):
    return width * height
  }
}
```

`guard` and `guard let` for preconditions. Nested `if let` buries the work.

```swift
// Don't
func load(_ url: URL?) async throws -> Data {
  if let url {
    if url.scheme == "https" {
      return try await client.fetch(url)
    }
  }
  throw LoadError.badURL
}

// Do
func load(_ url: URL?) async throws -> Data {
  guard let url else { throw LoadError.badURL }
  guard url.scheme == "https" else { throw LoadError.badURL }
  return try await client.fetch(url)
}
```

## Exhaustiveness

No `default` on enums you own. A new case must fail the build.

```swift
func handle(_ state: DiffState) {
  switch state {
  case .loading:
    showSpinner()
  case .ready(let diff):
    render(diff)
  case .error(let message):
    showError(message)
  }
}
```

`@unknown default` is for frozen or imported enums whose owners can add cases. Handle it as a remaining case, not a silent ignore.

## `some` over `any`

`some P` hides one concrete type. `<T: P>` lets the caller choose the type. `any P` boxes a mixed existential and erases the type.

```swift
// Don't. Existential by default, even when one type flows through.
func makeLoader() -> any DataLoading {
  FileLoader()
}

// Do. Opaque result. Callers see DataLoading, the compiler keeps FileLoader.
func makeLoader() -> some DataLoading {
  FileLoader()
}

// Do. The caller chooses the loader type.
func run<Loader: DataLoading>(_ loader: Loader) async throws {
  try await loader.load()
}

// Do. Mixed storage is the reason `any` exists.
var loaders: [any DataLoading]
```

Don't write `any` to silence "protocol with associated type" errors. Reach for generics or `some` first.

## Boundary decode

Validate once where data crosses in. Trust types inside. See the **boundary-discipline** principle skill.

- **Wire formats** (JSON, proto): decode with `JSONDecoder` or the generated type. Ignore unknown fields so forward-compatible changes don't break old clients.
- **Persisted JSON:** versioned blob, decode in a throwing function, don't `try!`.
- **Don't re-decode** deep in call chains.

## Schema-derived types

When a `.proto`, OpenAPI spec, or generated `Codable` type already defines a shape, use it instead of duplicating it.

```swift
// Don't. Duplicate shape, drifts when the schema changes.
struct CheckSummary {
  var totalCount: Int
  var checks: [Check]
}

// Do. The generated type owns the shape.
func renderChecks(_ summary: Components.Schemas.CheckSummary) {
  // ...
}
```

## Isolation and `Sendable`

Shared mutable state lives in an actor. Data stays a value type. UI types are `@MainActor`. Do not make every type an actor.

```swift
// Don't. Shared mutable state on a class.
final class ImageCache {
  var storage: [URL: Data] = [:]
}

// Do. The actor serializes access.
actor ImageCache {
  var storage: [URL: Data] = [:]
  func data(for url: URL) -> Data? { storage[url] }
}

@MainActor
@Observable
final class ProfileViewModel {
  var imageData: Data?
  let cache: ImageCache

  func load(url: URL) async {
    imageData = await cache.data(for: url)
  }
}
```

A value crosses an isolation boundary only if it is `Sendable`, or the compiler proves the instance isn't used on both sides (region-based isolation). Value types with `Sendable` members are implicitly `Sendable`. Public structs need an explicit `Sendable` if the compiler won't infer it.

```swift
// Don't. The annotation lies. Concurrent mutation is still a data race.
final class Counter: @unchecked Sendable {
  var value = 0
}

// Do. A lock that actually protects the state, if it must stay a class.
import Synchronization

final class Counter: Sendable {
  private let value = Mutex(0)
  func increment() {
    value.withLock { $0 += 1 }
  }
}
```

Use `Mutex` from Synchronization when the type must stay a class. `nonisolated(unsafe)` is the same lie as `@unchecked Sendable`.

Each `await` in an actor is a reentrancy point. Other work on that actor can run and mutate state before you resume.

```swift
// Don't. After the wait, another task may have spent the balance.
actor Account {
  var balance: Int = 0
  let ledger: Ledger

  func withdraw(_ amount: Int) async throws {
    guard balance >= amount else { throw AccountError.insufficientFunds }
    await ledger.record(amount)
    balance -= amount
  }
}

// Do. Mutate before the wait.
actor Account {
  var balance: Int = 0
  let ledger: Ledger

  func withdraw(_ amount: Int) async throws {
    guard balance >= amount else { throw AccountError.insufficientFunds }
    balance -= amount
    await ledger.record(amount)
  }
}
```

If the mutation has to wait, re-check the invariant after the wait. Capture values you still need in locals before you suspend.

## Structured concurrency

Use `async let` and task groups so child work cancels with the caller.

```swift
// Don't. Unstructured tasks keep running after loadBoth is cancelled.
func loadBoth() async throws -> (Profile, [Post]) {
  let profile = Task { try await loadProfile() }
  let posts = Task { try await loadPosts() }
  return try await (profile.value, posts.value)
}

// Do
func loadBoth() async throws -> (Profile, [Post]) {
  async let profile = loadProfile()
  async let posts = loadPosts()
  return try await (profile, posts)
}
```

`Task { }` is for a non-async boundary that has to start work.

```swift
func handleRefresh() {
  Task { await model.refresh() }
}
```

`Task.detached` leaves the caller's isolation. Use it only when the work must leave that isolation, and then pass only `Sendable` values.

```swift
// Don't. Detaches from the caller's actor and from cancellation.
Task.detached {
  await cache.warm()
}
```

Do not treat `CancellationError` as a failure. Rethrow it. Call `Task.checkCancellation()` in long loops.

```swift
// Don't. Cancellation looks like a refresh failure.
func refresh(_ id: SessionId) async {
  do {
    try await client.refresh(id)
  } catch {
    logger.error("refresh failed \(id.rawValue, privacy: .public)")
  }
}

// Do
func refresh(_ id: SessionId) async throws {
  do {
    try await client.refresh(id)
  } catch let error as CancellationError {
    throw error
  } catch {
    logger.error("refresh failed \(id.rawValue, privacy: .public)")
    throw error
  }
}
```

## `throws`, then typed throws

Throwing functions for control flow. `Result` when the failure is stored, returned later, or sent across a task.

```swift
// Don't. Result forces a switch at every call.
func loadBytes(from file: String) -> Result<[UInt8], Error> { ... }

func importFile(_ file: String) -> Result<Document, Error> {
  loadBytes(from: file).flatMap { bytes in
    decode(bytes)
  }
}

// Do. try sequences the happy path.
func loadBytes(from file: String) throws -> [UInt8] { ... }

func importFile(_ file: String) throws -> Document {
  let bytes = try loadBytes(from: file)
  return try decode(bytes)
}
```

`throws(E)` is for a closed error set you always handle. Use it in-module, in generic code that only forwards the caller's `E`, or in embedded code that cannot afford `any Error`.

```swift
func parse(_ input: String) throws(ParseError) -> Tree {
  guard let tree = Tree(input) else { throw .empty }
  return tree
}

func transformAll<T, U, E: Error>(_ items: [T], _ body: (T) throws(E) -> U) throws(E) -> [U] {
  var result: [U] = []
  for item in items {
    result.append(try body(item))
  }
  return result
}
```

Don't pin a public evolving API to one error type. `loadBytes(from:)` that today throws `FileSystemError` may tomorrow load from the network. Untyped `throws` stays the default there.

## Swift Testing

New unit and integration tests use `@Test` and `#expect`. Don't mock what you can run.

```swift
import Testing

@Test func newestSessionReturnsTheFirst() {
  let sessions = NonEmpty(first: Session(id: a, title: "a"), rest: [Session(id: b, title: "b")])
  #expect(newestSession(sessions).id == a)
}
```

XCTest stays for UI automation (`XCUIApplication`) and `XCTMetric`. Don't call `XCTAssert` from a Swift Testing test, or `#expect` from XCTest.

No `var sut: Foo!`. Construct the fixture in `init()` or in the test.

## Logger

`Logger` with a subsystem and category. Enough context to debug from an id. No `print` in shipped code.

```swift
import os

let logger = Logger(subsystem: "com.example.app", category: "Session")

func refresh(_ id: SessionId) async throws {
  logger.info("refresh started \(id.rawValue, privacy: .public)")
  try await client.refresh(id)
}
```

`print` is for command-line UI. On Apple platforms the unified log is how you diagnose a running app. On non-Apple Swift, use `swift-log` the same way.
