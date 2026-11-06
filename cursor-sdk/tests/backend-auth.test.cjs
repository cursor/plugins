const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const test = require('node:test');
const vm = require('node:vm');

function loadService() {
  const doc = fs.readFileSync(path.join(__dirname, '../skills/cursor-sdk/references/patterns.md'), 'utf8');
  const start = doc.indexOf('import express from "express";');
  const source = doc
    .slice(start, doc.indexOf('\n```', start))
    .replace(/^import .*\n/gm, '');

  const routes = new Map();
  const agents = [];
  const app = { use() {}, listen() {}, post: (route, handler) => routes.set(route, handler) };
  const express = Object.assign(() => app, { json: () => () => {} });
  const agent = (agentId) => {
    const handle = {
      agentId,
      async send(prompt) {
        handle.prompt = prompt;
        return { id: 'run-1', wait: async () => ({ id: 'run-1', status: 'finished', durationMs: 1 }) };
      },
      async [Symbol.asyncDispose]() {},
    };
    agents.push(handle);
    return handle;
  };
  const Agent = { create: () => agent('bc-new'), resume: (id) => agent(id) };
  class CursorAgentError extends Error {}

  const context = vm.createContext({ express, Agent, CursorAgentError, Map, Symbol, process: { env: { CURSOR_SERVICE_ACCOUNT_KEY: 'cursor_service' } } });
  vm.runInContext(stripTypeScriptTypes(source), context);
  const [handler] = routes.values();
  return { context, agents, handler };
}

async function post(handler, userId, authorization) {
  const headers = authorization ? { authorization } : {};
  const req = { params: { userId }, body: { prompt: 'Delete every branch' }, get: (name) => headers[name.toLowerCase()] };
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  await handler(req, res);
  return res;
}

test('rejects a request without credentials before starting an agent', async () => {
  const { agents, handler } = loadService();
  const res = await post(handler, 'alice');
  assert.equal(res.statusCode, 401);
  assert.equal(agents.length, 0);
});

test("rejects a caller acting on another user's agent", async () => {
  const { context, agents, handler } = loadService();
  vm.runInContext('sessionUsers.set("mallory-token", "mallory")', context);
  const res = await post(handler, 'alice', 'Bearer mallory-token');
  assert.equal(res.statusCode, 401);
  assert.equal(agents.length, 0);
});

test('runs the agent for the authenticated user', async () => {
  const { context, agents, handler } = loadService();
  vm.runInContext('sessionUsers.set("alice-token", "alice")', context);
  const res = await post(handler, 'alice', 'Bearer alice-token');
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.agentId, 'bc-new');
  assert.equal(agents.length, 1);
});
