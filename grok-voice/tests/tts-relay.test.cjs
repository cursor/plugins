const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { stripTypeScriptTypes } = require('node:module');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function setup() {
  const skill = fs.readFileSync(path.join(__dirname, '../skills/add-read-aloud/SKILL.md'), 'utf8');
  const snippet = skill.match(/```ts\n(import \{ WebSocketServer, WebSocket \} from "ws";[\s\S]*?)\n```/)[1];
  let server, upstream;
  class Socket extends EventEmitter {
    static CONNECTING = 0; static OPEN = 1; static CLOSED = 3;
    constructor() { super(); this.readyState = Socket.CONNECTING; this.sent = []; upstream = this; }
    send(data) { assert.equal(this.readyState, Socket.OPEN); this.sent.push(data); }
    close(code) { this.readyState = Socket.CLOSED; this.closeCode = code; }
  }
  class Server extends EventEmitter { constructor() { super(); server = this; } }
  const context = vm.createContext({ WebSocketServer: Server, WebSocket: Socket, URLSearchParams, Buffer, process: { env: { XAI_API_KEY: 'offline-test' } } });
  vm.runInContext(stripTypeScriptTypes(snippet.replace('import { WebSocketServer, WebSocket } from "ws";', '')), context);
  const client = new Socket(); client.readyState = Socket.OPEN;
  server.emit('connection', client);
  return { client, upstream, open() { upstream.readyState = Socket.OPEN; upstream.emit('open'); } };
}

test('messages received during upstream handshake are forwarded in order', () => {
  const s = setup();
  const messages = ['{"type":"text.delta","delta":"hello"}', '{"type":"text.done"}'];
  messages.forEach((message) => s.client.emit('message', Buffer.from(message)));
  s.open();
  assert.deepEqual(s.upstream.sent, messages);
});

test('messages after upstream open are forwarded immediately', () => {
  const s = setup(); s.open();
  s.client.emit('message', Buffer.from('{"type":"text.done"}'));
  assert.deepEqual(s.upstream.sent, ['{"type":"text.done"}']);
});

test('closing browser before upstream opens discards queued work', () => {
  const s = setup();
  s.client.emit('message', Buffer.from('pending'));
  s.client.close(); s.client.emit('close');
  s.open();
  assert.deepEqual(s.upstream.sent, []);
});

test('pre-open buffer rejects excessive data rather than growing forever', () => {
  const s = setup();
  s.client.emit('message', Buffer.alloc(65 * 1024, 'x'));
  assert.equal(s.client.closeCode, 1009);
});
