const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");

const skill = readFileSync(
  new URL("../skills/add-dictation/SKILL.md", `file://${__dirname}/`),
  "utf8",
);
const match = skill.match(/```ts\n(const ws = new WebSocket\(relayUrl\)[\s\S]*?)\n```/);

test("closes the browser relay socket after a transcription error", async () => {
  assert.ok(match, "expected the streaming browser example");

  class FakeWebSocket {
    static OPEN = 1;

    constructor() {
      this.readyState = FakeWebSocket.OPEN;
      this.listeners = new Map();
      this.closeCalls = 0;
    }

    addEventListener(type, listener) {
      this.listeners.set(type, listener);
    }

    emit(type, data) {
      this.listeners.get(type)({ data: JSON.stringify(data) });
    }

    close() {
      this.closeCalls++;
      this.readyState = 3;
    }

    send() {}
  }

  const ws = new FakeWebSocket();
  const context = {
    WebSocket: class extends FakeWebSocket {
      constructor() {
        super();
        return ws;
      }
    },
    AudioContext: class {
      constructor() {
        this.audioWorklet = { addModule: async () => {} };
      }

      createMediaStreamSource() {
        return { connect() {} };
      }
    },
    AudioWorkletNode: class {
      constructor() {
        this.port = {};
      }
    },
    relayUrl: "wss://example.test/dictation",
    stream: {},
    render() {},
    showError() {},
  };

  await Function(
    ...Object.keys(context),
    `return (async () => {\n${match[1]}\n})()`,
  )(...Object.values(context));

  ws.emit("message", { type: "error", message: "upstream rejected audio" });
  assert.equal(ws.closeCalls, 1);
});
