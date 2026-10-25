const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadVoiceClient() {
  const skill = fs.readFileSync(
    path.join(__dirname, "../skills/add-voice/SKILL.md"),
    "utf8",
  );
  const snippet = skill.match(/```ts\n(const url =[\s\S]*?)\n```/)[1];
  let socket;

  class WebSocket extends EventEmitter {
    constructor() {
      super();
      this.closeCalls = 0;
      socket = this;
    }

    addEventListener(type, listener) {
      this.on(type, listener);
    }

    send() {}

    close() {
      this.closeCalls++;
    }
  }

  vm.runInContext(snippet, vm.createContext({ WebSocket, JSON, String }));
  return socket;
}

test("voice WebSocket errors cannot crash a Node host", () => {
  const socket = loadVoiceClient();

  assert.doesNotThrow(() => socket.emit("error", new Error("ECONNRESET")));
  assert.equal(socket.closeCalls, 1);
});
