import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setup } from './setup.mjs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
for (const host of ['codex', 'claude-code']) test(`${host}: lifecycle, settings, conflicts and provenance`, async () => {
  const root = await mkdtemp(join(tmpdir(), 'pstack-setup-'));
  try {
    const pack = join(root, 'pack'), project = join(root, 'project'), potetoSkill = join(root, 'poteto.md');
    await mkdir(join(pack, 'agents'), { recursive: true });
    await writeFile(potetoSkill, 'poteto instructions');
    const source = sha => writeFile(join(pack, 'source.json'), JSON.stringify({ upstreamCommit: sha.repeat(40) }));
    await source('a');
    for (const name of ['poteto-agent', 'comment-sicko']) await writeFile(join(pack, 'agents', `${name}.md`), `---\nname: ${name}\ndescription: example\n---\n\nOriginal persona\n`);
    const run = () => setup({ host, pack, project, potetoSkill });
    let result = await run();
    assert.deepEqual(result.files.map(x => x.status), ['create', 'create', 'update']);
    assert.deepEqual((await run()).files.map(x => x.status), ['unchanged', 'unchanged', 'unchanged']);
    const path = result.files[0].path;
    let content = await readFile(path, 'utf8');
    content = host === 'codex' ? `${content}\nmodel = "user-model"\n` : content.replace('description: "example"', 'description: "example"\nmodel: inherit\npermissionMode: default');
    await writeFile(path, content);
    await source('b');
    await writeFile(join(pack, 'agents', 'poteto-agent.md'), '---\nname: poteto-agent\ndescription: example\n---\n\nUpdated persona\n');
    result = await run();
    assert.equal(result.conflicts.length, 0);
    assert.match(await readFile(path, 'utf8'), /Updated persona/);
    assert.match(await readFile(path, 'utf8'), host === 'codex' ? /user-model/ : /permissionMode: default/);
    const state = JSON.parse(await readFile(result.statePath, 'utf8'));
    assert.equal(state.sourceCommit, 'b'.repeat(40));
    assert.match(state.files['poteto-agent'].hash, /^[a-f0-9]{64}$/);
    await writeFile(path, (await readFile(path, 'utf8')).replace('Updated persona', 'User persona'));
    const before = await readFile(path, 'utf8');
    assert.equal((await run()).conflicts.length, 1);
    await source('c');
    assert.equal((await run()).conflicts.length, 1);
    assert.equal(await readFile(path, 'utf8'), before);
    await rm(result.statePath);
    assert.equal((await run()).conflicts.length, 3);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('real CLI launches through a symlink without canonicalizing argv', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pstack-cli-'));
  try {
    const pack = join(root, 'pack');
    await mkdir(join(pack, 'setup'), { recursive: true });
    await mkdir(join(pack, 'agents'), { recursive: true });
    await cp(fileURLToPath(new URL('./setup.mjs', import.meta.url)), join(pack, 'setup', 'setup.mjs'));
    await writeFile(join(pack, 'source.json'), JSON.stringify({ upstreamCommit: 'a'.repeat(40) }));
    for (const name of ['poteto-agent', 'comment-sicko']) await writeFile(join(pack, 'agents', `${name}.md`), `---\nname: ${name}\ndescription: example\n---\n\nOriginal persona\n`);
    const poteto = join(root, 'poteto.md');
    await writeFile(poteto, 'installed poteto');
    const alias = join(root, 'aliased-pack');
    await symlink(pack, alias);
    const project = join(root, 'project');
    const output = execFileSync(process.execPath, [join(alias, 'setup', 'setup.mjs'), '--host', 'codex', '--project', project, '--poteto-skill', poteto], { encoding: 'utf8' });
    const result = JSON.parse(output);
    assert.equal(result.conflicts.length, 0);
    assert.equal(result.files.length, 3);
    const state = JSON.parse(await readFile(result.statePath, 'utf8'));
    assert.equal(state.sourceCommit, 'a'.repeat(40));
    for (const file of result.files) assert.ok((await readFile(file.path, 'utf8')).length > 0);
  } finally { await rm(root, { recursive: true, force: true }); }
});
