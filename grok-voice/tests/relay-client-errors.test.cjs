const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { stripTypeScriptTypes } = require('node:module');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function setup(skillName) {
  const skill = fs.readFileSync(path.join(__dirname, `../skills/${skillName}/SKILL.md`), 'utf8');
  const snippet = skill.match(/```ts\n(import \{ WebSocketServer, WebSocket \} from "ws";[\s\S]*?)\n```/)[1];
  let server, upstream;
  // ws sockets inherit EventEmitter: an unhandled 'error' throws synchronously.
  class Socket extends EventEmitter {
    static CONNECTING = 0; static OPEN = 1; static CLOSED = 3;
    constructor() { super(); this.readyState = Socket.OPEN; this.sent = []; upstream = this; }
    send(data) { this.sent.push(data); }
    close() { this.readyState = Socket.CLOSED; }
  }
  class Server extends EventEmitter { constructor() { super(); server = this; } }
  const context = vm.createContext({ WebSocketServer: Server, WebSocket: Socket, URLSearchParams, Buffer, process: { env: { XAI_API_KEY: 'offline-test' } } });
  vm.runInContext(stripTypeScriptTypes(snippet.replace('import { WebSocketServer, WebSocket } from "ws";', '')), context);
  const client = new Socket();
  server.emit('connection', client);
  return { client, upstream };
}

for (const skill of ['add-dictation', 'add-read-aloud']) {
  test(`${skill}: browser transport errors are contained and close both sockets`, () => {
    const s = setup(skill);
    assert.doesNotThrow(() => s.client.emit('error', Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' })));
    assert.equal(s.client.readyState, 3);
    assert.equal(s.upstream.readyState, 3);
  });
  test(`${skill}: upstream errors still close both sockets`, () => {
    const s = setup(skill);
    assert.doesNotThrow(() => s.upstream.emit('error', new Error('upstream unavailable')));
    assert.equal(s.client.readyState, 3);
    assert.equal(s.upstream.readyState, 3);
  });
  test(`${skill}: ordinary transcript/audio messages still reach the browser`, () => {
    const s = setup(skill);
    s.upstream.emit('message', Buffer.from('{"type":"event"}'));
    assert.deepEqual(s.client.sent, ['{"type":"event"}']);
  });
}
