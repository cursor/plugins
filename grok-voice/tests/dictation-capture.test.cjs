const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const test = require('node:test');
const vm = require('node:vm');

function setup() {
  const skill = fs.readFileSync(path.join(__dirname, '../skills/add-dictation/SKILL.md'), 'utf8');
  const snippet = skill.match(/```ts\n\/\/ client[^\n]*\n([\s\S]*?)\n```/)[1];
  const tracks = [{ live: true, stop() { this.live = false; } }, { live: true, stop() { this.live = false; } }];
  let recorder, resolveRequest, rejectRequest, body;
  const inserted = [];
  class Recorder {
    static isTypeSupported() { return true; }
    constructor(stream) { this.stream = stream; recorder = this; }
    start() {}
  }
  const context = vm.createContext({
    MediaRecorder: Recorder, stream: { getTracks: () => tracks }, Blob, FormData,
    fetch(url, options) { body = options.body; return new Promise((resolve, reject) => { resolveRequest = resolve; rejectRequest = reject; }); },
    insertAtCursor(text) { inserted.push(text); },
  });
  vm.runInContext(stripTypeScriptTypes(snippet), context);
  recorder.ondataavailable({ data: new Blob(['recorded audio']) });
  return { tracks, recorder, inserted, body: () => body,
    resolve() { resolveRequest({ async json() { return { text: 'hello' }; } }); },
    reject() { rejectRequest(new Error('offline')); },
  };
}

test('recording stop releases every microphone track before upload completes', async () => {
  const s = setup(); const pending = s.recorder.onstop();
  assert.equal(s.tracks.filter((track) => track.live).length, 0);
  s.resolve(); await pending;
});

test('a failed upload leaves no microphone capture running', async () => {
  const s = setup(); const pending = s.recorder.onstop();
  s.reject(); await assert.rejects(pending, /offline/);
  assert.ok(s.tracks.every((track) => !track.live));
});

test('releasing capture preserves the recorded blob and successful transcription', async () => {
  const s = setup(); const pending = s.recorder.onstop();
  assert.equal(await s.body().get('file').text(), 'recorded audio');
  s.resolve(); await pending;
  assert.deepEqual(s.inserted, ['hello']);
});
