const assert = require("node:assert/strict");
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
  const sockets = [];

  class WebSocket {
    constructor(...args) {
      this.args = args;
      this.listeners = new Map();
      sockets.push(this);
    }

    addEventListener(type, listener) {
      this.listeners.set(type, listener);
    }

    send() {}
  }

  const context = vm.createContext({ WebSocket, JSON, String });
  vm.runInContext(snippet, context);
  return sockets[0];
}

test("browser voice clients authenticate with the ephemeral-token protocol", () => {
  const socket = loadVoiceClient();

  assert.equal(socket.args[0], "wss://api.x.ai/v1/realtime?model=grok-voice-latest");
  assert.match(socket.args[1], /^xai-client-secret\./);
});
