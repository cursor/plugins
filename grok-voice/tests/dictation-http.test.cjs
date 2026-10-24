const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const test = require('node:test');
const vm = require('node:vm');

function setup(status) {
  const skill = fs.readFileSync(path.join(__dirname, '../skills/add-dictation/SKILL.md'), 'utf8');
  const snippet = skill.match(/```ts\n\/\/ client[^\n]*\n([\s\S]*?)\n```/)[1];
  let recorder, bodyReads = 0;
  const inserted = [];
  class Recorder {
    static isTypeSupported() { return true; }
    constructor() { recorder = this; }
    start() {}
  }
  const context = vm.createContext({
    MediaRecorder: Recorder, stream: { getTracks: () => [] }, Blob, FormData,
    async fetch() { return { ok: status >= 200 && status < 300, status,
      async json() { bodyReads++; return status === 200 ? { text: 'spoken words' } : { error: 'request failed' }; } }; },
    insertAtCursor(text) { inserted.push(text); },
  });
  vm.runInContext(stripTypeScriptTypes(snippet), context);
  recorder.ondataavailable({ data: new Blob(['audio']) });
  return { recorder, inserted, bodyReads: () => bodyReads };
}

for (const status of [401, 429, 503]) {
  test(`HTTP ${status} rejects without inserting an error response into the composer`, async () => {
    const s = setup(status);
    await assert.rejects(s.recorder.onstop(), new RegExp(`Dictation ${status}`));
    assert.deepEqual(s.inserted, []);
    assert.equal(s.bodyReads(), 0);
  });
}

test('successful dictation still inserts the returned transcript once', async () => {
  const s = setup(200); await s.recorder.onstop();
  assert.deepEqual(s.inserted, ['spoken words']);
  assert.equal(s.bodyReads(), 1);
});
