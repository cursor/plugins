const assert = require('node:assert/strict');
const fs = require('node:fs');
const { stripTypeScriptTypes } = require('node:module');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function setup() {
  const skill = fs.readFileSync(path.join(__dirname, '../skills/add-read-aloud/SKILL.md'), 'utf8');
  const snippet = skill.match(/```ts\n(const ws = new WebSocket\(relayUrl\);[\s\S]*?)\n```/)[1];
  let socket;
  const nodes = [];
  class Socket {
    constructor() { socket = this; this.handlers = {}; }
    addEventListener(type, fn) { this.handlers[type] = fn; }
  }
  class AudioContext {
    constructor() { this.currentTime = 1; this.destination = {}; }
    createBuffer(channels, length, rate) {
      return { duration: length / rate, getChannelData() { return new Float32Array(length); } };
    }
    createBufferSource() {
      const node = {
        connect() {}, disconnect() { this.disconnected = true; }, start() {},
        stop() { this.stopped = true; },
        end() { if (this.onended) this.onended(); },
      };
      nodes.push(node); return node;
    }
  }
  const context = vm.createContext({ WebSocket: Socket, AudioContext, relayUrl: 'offline', atob, showError() {} });
  vm.runInContext(stripTypeScriptTypes(snippet), context);
  const event = (data) => socket.handlers.message({ data: JSON.stringify(data) });
  return {
    nodes, context,
    chunk() { event({ type: 'audio.delta', delta: Buffer.from([0, 0, 255, 127]).toString('base64') }); },
    clear() { event({ type: 'audio.clear' }); },
    retained() { return vm.runInContext('sources.length', context); },
  };
}

test('completed chunks are released across utterances on one session', () => {
  const s = setup();
  for (let i = 0; i < 100; i++) { s.chunk(); s.nodes[i].end(); }
  assert.equal(s.retained(), 0);
  assert.ok(s.nodes.every((node) => node.disconnected));
});

test('completion removes only the finished node', () => {
  const s = setup(); s.chunk(); s.chunk();
  s.nodes[0].end();
  assert.equal(s.retained(), 1);
  assert.equal(s.nodes[1].stopped, undefined);
});

test('barge-in still stops queued sources and resets scheduling', () => {
  const s = setup(); s.chunk(); s.chunk(); s.clear();
  assert.ok(s.nodes.every((node) => node.stopped));
  assert.equal(s.retained(), 0);
  assert.equal(vm.runInContext('playhead', s.context), 0);
});
