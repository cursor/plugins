const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { stripTypeScriptTypes } = require('node:module');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function setup() {
  const skill = fs.readFileSync(path.join(__dirname, '../skills/add-dictation/SKILL.md'), 'utf8');
  const snippet = skill.match(/```ts\n(import \{ WebSocketServer, WebSocket \} from "ws";[\s\S]*?)\n```/)[1];
  let server, upstream;
  class Socket extends EventEmitter {
    static CONNECTING = 0; static OPEN = 1; static CLOSED = 3;
    constructor() { super(); this.readyState = Socket.CONNECTING; this.sent = []; upstream = this; }
    send(data, options) { assert.equal(this.readyState, Socket.OPEN); this.sent.push({ data: Buffer.from(data), binary: options.binary }); }
    close(code) { this.readyState = Socket.CLOSED; this.closeCode = code; }
  }
  class Server extends EventEmitter { constructor() { super(); server = this; } }
  const context = vm.createContext({ WebSocketServer: Server, WebSocket: Socket, URLSearchParams, Buffer, process: { env: { XAI_API_KEY: 'offline-test' } } });
  vm.runInContext(stripTypeScriptTypes(snippet.replace('import { WebSocketServer, WebSocket } from "ws";', '')), context);
  const client = new Socket(); client.readyState = Socket.OPEN;
  server.emit('connection', client);
  return { client, upstream, open() { upstream.readyState = Socket.OPEN; upstream.emit('open'); } };
}

test('audio and finalize received during handshake flush in order with original frame kinds', () => {
  const s = setup();
  const audio = Buffer.from([1, 0, 255, 127]);
  const control = Buffer.from('{"type":"Finalize"}');
  s.client.emit('message', audio, true);
  s.client.emit('message', control, false);
  s.open();
  assert.deepEqual(s.upstream.sent, [{ data: audio, binary: true }, { data: control, binary: false }]);
});

test('all ws RawData forms retain exact binary bytes while queued', () => {
  const s = setup();
  s.client.emit('message', Uint8Array.from([0, 255, 1, 2]).buffer, true);
  s.client.emit('message', [Buffer.from([3, 4]), Buffer.from([5, 6])], true);
  s.open();
  assert.deepEqual(s.upstream.sent, [
    { data: Buffer.from([0, 255, 1, 2]), binary: true },
    { data: Buffer.from([3, 4, 5, 6]), binary: true },
  ]);
});

test('frames after upstream opens forward immediately', () => {
  const s = setup(); s.open();
  const audio = Buffer.from([1, 2]); s.client.emit('message', audio, true);
  assert.deepEqual(s.upstream.sent, [{ data: audio, binary: true }]);
});

test('closing browser during handshake discards queued audio', () => {
  const s = setup(); s.client.emit('message', Buffer.from([1, 2]), true);
  s.client.close(); s.client.emit('close'); s.open();
  assert.deepEqual(s.upstream.sent, []);
});

test('audio buffering is bounded and exceeding the cap closes both sockets', () => {
  const s = setup();
  s.client.emit('message', Buffer.alloc(64 * 1024), true);
  assert.equal(s.client.readyState, 1);
  s.client.emit('message', Buffer.from([1]), true);
  assert.equal(s.client.closeCode, 1009);
  assert.equal(s.upstream.readyState, 3);
  s.open();
  assert.deepEqual(s.upstream.sent, []);
});
