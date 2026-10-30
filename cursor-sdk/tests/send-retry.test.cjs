const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const test = require('node:test');
const vm = require('node:vm');
// Offline stand-ins for the documented SDK class hierarchy; no SDK/native runtime needed.
class CursorAgentError extends Error {
  constructor(message, { isRetryable = false } = {}) { super(message); this.isRetryable = isRetryable; }
}
class NetworkError extends CursorAgentError {}
class RateLimitError extends CursorAgentError {}
class AuthenticationError extends CursorAgentError {}

function setup(errors) {
  const reference = fs.readFileSync(path.join(__dirname, '../skills/cursor-sdk/references/error-handling.md'), 'utf8');
  const snippet = reference.split('## Retry Patterns')[1].match(/```typescript\n([\s\S]*?)\n```/)[1];
  const delays = [], messages = [], options = [];
  const run = { id: 'offline-run', wait() { throw new Error('wait must remain outside startup retries'); } };
  let calls = 0;
  const agent = { async send(message, sendOptions) {
    messages.push(message); options.push(sendOptions);
    const error = errors[calls++]; if (error) throw error;
    return run;
  } };
  const context = vm.createContext({
    Agent: { async create() { return agent; } }, CursorAgentError, NetworkError, RateLimitError,
    Math: { random: () => 0 }, setTimeout(resolve, delay) { delays.push(delay); resolve(); },
  });
  vm.runInContext(stripTypeScriptTypes(snippet.replace(/^import .*;\n/gm, '')), context);
  const sendOptions = { model: 'offline-model' };
  // Follow each documented helper's public contract; old helper creates then caller sends.
  const send = () => context.sendWithRetry ? context.sendWithRetry(agent, 'prompt', sendOptions)
    : context.createWithRetry({}).then((created) => created.send('prompt', sendOptions));
  return { send, run, delays, messages, options, sendOptions, calls: () => calls };
}

test('retryable send startup errors retry the same message and return the run', async () => {
  const s = setup([new NetworkError('temporary', { isRetryable: true })]);
  assert.equal(await s.send(), s.run);
  assert.deepEqual(s.messages, ['prompt', 'prompt']);
  assert.ok(s.options.every((options) => options === s.sendOptions));
  assert.deepEqual(s.delays, [2000]);
});

test('retryable rate limiting waits at least thirty seconds', async () => {
  const s = setup([new RateLimitError('slow down', { isRetryable: true })]);
  assert.equal(await s.send(), s.run);
  assert.equal(s.delays.length, 1);
  assert.ok(s.delays[0] >= 30_000);
});

test('retries stop at three attempts and preserve the last error', async () => {
  const error = new NetworkError('still unavailable', { isRetryable: true });
  const s = setup([error, error, error]);
  await assert.rejects(s.send(), (actual) => actual === error);
  assert.equal(s.calls(), 3);
  assert.deepEqual(s.delays, [2000, 4000]);
});

for (const error of [new AuthenticationError('bad key', { isRetryable: true }),
  new NetworkError('terminal', { isRetryable: false }), new Error('application error')]) {
  test(`${error.constructor.name}/${error.message} is not retried`, async () => {
    const s = setup([error]);
    await assert.rejects(s.send(), (actual) => actual === error);
    assert.equal(s.calls(), 1); assert.deepEqual(s.delays, []);
  });
}

test('first-attempt success returns the run without waiting or retrying', async () => {
  const s = setup([]); assert.equal(await s.send(), s.run);
  assert.equal(s.calls(), 1); assert.deepEqual(s.delays, []);
});
