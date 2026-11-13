const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function openDocumentedVoiceSocket() {
  const skill = fs.readFileSync(
    path.join(__dirname, "../skills/add-voice/SKILL.md"),
    "utf8",
  );
  const snippet = skill.match(/```ts\n(const url =[\s\S]*?)\n```/)[1];
  let socket;

  class WebSocket {
    constructor() {
      this.listeners = new Map();
      this.sent = [];
      socket = this;
    }

    addEventListener(type, listener) {
      this.listeners.set(type, listener);
    }

    send(message) {
      this.sent.push(message);
    }
  }

  const context = vm.createContext({ WebSocket, JSON, String });
  vm.runInContext(snippet, context);
  socket.listeners.get("open")();
  return JSON.parse(socket.sent[0]);
}

test("voice sessions request input transcription before audio is sent", () => {
  const update = openDocumentedVoiceSocket();

  assert.equal(
    update.session.audio.input.transcription.model,
    "grok-transcribe",
  );
});
