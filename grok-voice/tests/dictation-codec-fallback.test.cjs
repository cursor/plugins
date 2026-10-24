const assert = require("node:assert/strict");
const fs = require("node:fs");
const { stripTypeScriptTypes } = require("node:module");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function createRecorder(supportedTypes) {
  const skill = fs.readFileSync(
    path.join(__dirname, "../skills/add-dictation/SKILL.md"),
    "utf8",
  );
  const snippet = skill.match(/```ts\n\/\/ client\n([\s\S]*?)\n```/)[1];
  let recorder;

  class MediaRecorder {
    static isTypeSupported(type) {
      return supportedTypes.includes(type);
    }

    constructor(stream, options) {
      if (options?.mimeType && !MediaRecorder.isTypeSupported(options.mimeType)) {
        throw new Error(`Unsupported codec: ${options.mimeType}`);
      }
      this.options = options;
      recorder = this;
    }

    start() {}
  }

  const context = vm.createContext({
    MediaRecorder,
    stream: {},
    Blob,
    FormData,
    fetch: async () => ({ json: async () => ({ text: "" }) }),
    insertAtCursor() {},
  });
  vm.runInContext(stripTypeScriptTypes(snippet), context);
  return recorder;
}

test("dictation leaves MIME selection to the browser when no documented codec is supported", () => {
  const recorder = createRecorder([]);

  assert.deepEqual(recorder.options, undefined);
});
