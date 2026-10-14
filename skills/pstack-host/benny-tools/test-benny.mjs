import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {mergePack} from './merge-pack.mjs';
import {pollOnce,trustedVerdict} from '../benny/scripts/poll.mjs';
const temp=()=>fs.mkdtemp(path.join(os.tmpdir(),'pstack-benny-'));
const sha='3357d59539a8dbe80f7a1d45bddda18abd632124';
test('pack upgrade preserves user files and rejects ambiguous/local edits before writes',async()=>{
 const dir=await temp();try{
  const src=path.join(dir,'source'),project=path.join(dir,'project');await fs.mkdir(src);await fs.mkdir(project);
  await fs.writeFile(path.join(src,'FOR_AGENTS.md'),'v1');
  await mergePack(project,src,sha);
  const dst=path.join(project,'.pstack/benny');await fs.writeFile(path.join(dst,'user-note'),'keep');
  await fs.writeFile(path.join(src,'FOR_AGENTS.md'),'v2');const result=await mergePack(project,src,sha);
  assert.equal(result.changed,1);assert.equal(await fs.readFile(path.join(dst,'user-note'),'utf8'),'keep');
  await fs.writeFile(path.join(dst,'FOR_AGENTS.md'),'user modified');await fs.writeFile(path.join(src,'new.md'),'new');
  await assert.rejects(mergePack(project,src,sha),/Pack conflict/);
  await assert.rejects(fs.stat(path.join(dst,'new.md')),/ENOENT/);
  await fs.unlink(path.join(project,'.pstack/benny-install.json'));
  await assert.rejects(mergePack(project,src,sha),/Pack conflict/);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('trusted classification requires exact author, thread, channel and single marker',()=>{
 const m={user:'bot',channel:'C',thread_ts:'1.0',text:'[benny:bug]'};
 assert.equal(trustedVerdict([m],'bot','C','1.0'),'bug');
 for(const change of [{user:'other'},{channel:'other'},{thread_ts:'2.0'},{text:'[benny:bug] [benny:other]'}]) assert.equal(trustedVerdict([{...m,...change}],'bot','C','1.0'),null);
});
const cfg={slack:{source_channel_id:'C',triage_identity_user_id:'bot'},control:{feature_map_path:'.pstack/benny-user/feature.md',skill_name:'control'},tracker:{adapter_skill_name:'tracker'},repository:{draft_only:true,url:'https://example.test/repo',default_branch:'main'},configuration_path:'.pstack/benny-user/config.json'};
function mock(){
 const calls=[],messages=[{channel:'C',ts:'1.0',text:'report'}],completed=new Set();
 return {calls,messages,capabilities:async()=>Object.fromEntries(['slackRead','slackThreadReply','trackerReadWrite','attachments','control','draftPullRequest'].map(k=>[k,true])),
 poll:async()=>[{channel:'C',ts:'1.0'},{channel:'C',ts:'1.1',thread_ts:'1.0'},{channel:'wrong',ts:'1.0'}],readThread:async()=>messages,
 existingFix:async()=>({url:'https://example.test/pr/1'}),recover:async id=>completed.has(id)?'completed':'unknown',
 dispatch:async data=>{calls.push(data);completed.add(data.id);return {completed:true};}};
}
test('poll deduplicates roots, waits trusted marker, verifies existing fixes and survives restart',async()=>{
 const project=await temp();try{
  const a=mock();await pollOnce(project,cfg,a,{verifyCommitted:false});assert.equal(a.calls.length,1);
  await pollOnce(project,cfg,a,{verifyCommitted:false});assert.equal(a.calls.length,1);
  a.messages.push({user:'intruder',channel:'C',thread_ts:'1.0',text:'[benny:bug]'});
  await pollOnce(project,cfg,a,{verifyCommitted:false});assert.equal(a.calls.length,1);
  a.messages.push({user:'bot',channel:'C',thread_ts:'1.0',text:'[benny:bug]'});
  await pollOnce(project,cfg,a,{verifyCommitted:false});assert.equal(a.calls.length,2);assert.equal(a.calls[1].mode,'verify-existing-fix');
  assert.equal(a.calls[1].thread_ts,'1.0');assert.equal(a.calls[1].constraints.workerSlackCredentials,false);
  await pollOnce(project,cfg,a,{verifyCommitted:false});assert.equal(a.calls.length,2);
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
test('uncertain external side effect remains pending and is not reissued',async()=>{
 const project=await temp();try{
  const a=mock();a.dispatch=async data=>{a.calls.push(data);throw Error('lost response');};
  await assert.rejects(pollOnce(project,cfg,a,{verifyCommitted:false}),/lost response/);
  await pollOnce(project,cfg,a,{verifyCommitted:false});assert.equal(a.calls.length,1);
  a.recover=async()=> 'completed';await pollOnce(project,cfg,a,{verifyCommitted:false});assert.equal(a.calls.length,1);
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
test('missing tools fail before any state or external operation',async()=>{
 const project=await temp();try{await assert.rejects(pollOnce(project,cfg,{}, {verifyCommitted:false}),/Unavailable adapter tool/);await assert.rejects(fs.stat(path.join(project,'.pstack')),/ENOENT/);}finally{await fs.rm(project,{recursive:true,force:true});}
});
test('pack installer refuses symlink escape without modifying outside project',async()=>{
 const dir=await temp();try{
  const src=path.join(dir,'source'),project=path.join(dir,'project'),outside=path.join(dir,'outside');
  for(const p of [src,project,outside])await fs.mkdir(p);await fs.writeFile(path.join(src,'FOR_AGENTS.md'),'managed');
  await fs.symlink(outside,path.join(project,'.pstack'));
  await assert.rejects(mergePack(project,src,sha),/Symlink forbidden/);assert.deepEqual(await fs.readdir(outside),[]);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('missing committed instructions rejects before dispatch',async()=>{
 const project=await temp();try{const a=mock();await assert.rejects(pollOnce(project,cfg,a),/ENOENT/);assert.equal(a.calls.length,0);}finally{await fs.rm(project,{recursive:true,force:true});}
});
test('poll executable invoked through symlink consumes committed resources and writes state',async()=>{
 const project=await temp();try{
  for(const rel of ['.pstack/benny/skills/triage-issue-reports','.pstack/benny/skills/reproduce-and-fix-issues','.pstack/benny-user'])await fs.mkdir(path.join(project,rel),{recursive:true});
  for(const phase of ['triage-issue-reports','reproduce-and-fix-issues'])await fs.writeFile(path.join(project,`.pstack/benny/skills/${phase}/instruction.md`),'mock committed instruction');
  await fs.writeFile(path.join(project,cfg.control.feature_map_path),'mock feature');
  await fs.writeFile(path.join(project,cfg.configuration_path),JSON.stringify(cfg));
  await fs.writeFile(path.join(project,'.pstack/benny-user/adapter.mjs'),`export default {
 capabilities:async()=>({slackRead:true,slackThreadReply:true,trackerReadWrite:true,attachments:true,control:true,draftPullRequest:true}),
 poll:async()=>[{channel:'C',ts:'1.0'}],readThread:async()=>[{channel:'C',ts:'1.0',text:'mock'}],
 existingFix:async()=>null,recover:async()=>'unknown',dispatch:async()=>({completed:true})};`);
  execFileSync('git',['init','-q'],{cwd:project});execFileSync('git',['add','.'],{cwd:project});
  execFileSync('git',['-c','user.name=Benny test','-c','user.email=benny@example.test','-c','commit.gpgsign=false','commit','-qm','mock resources'],{cwd:project});
  const script=path.join(project,'poll-link.mjs');
  await fs.symlink(fileURLToPath(new URL('../benny/scripts/poll.mjs',import.meta.url)),script);
  const output=execFileSync(process.execPath,[script,project,cfg.configuration_path,path.join(project,'.pstack/benny-user/adapter.mjs')],{encoding:'utf8'});
  assert.match(output,/Benny poll completed; durable state written/);
  const state=JSON.parse(await fs.readFile(path.join(project,'.pstack/benny-state/events.json'),'utf8'));assert.equal(state.events['C:1.0'].triage,true);
  await fs.writeFile(path.join(project,cfg.control.feature_map_path),'uncommitted');
  assert.throws(()=>execFileSync(process.execPath,[script,project,cfg.configuration_path,path.join(project,'.pstack/benny-user/adapter.mjs')],{stdio:'pipe'}),/Command failed/);
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
test('fixed record temporary symlink cannot overwrite external file on install or upgrade',async()=>{
 const dir=await temp();try{
  const source=path.join(dir,'source'),project=path.join(dir,'project'),external=path.join(dir,'external.txt');
  await fs.mkdir(source);await fs.mkdir(path.join(project,'.pstack'),{recursive:true});
  await fs.writeFile(external,'external must remain unchanged');
  const oldTemporary=path.join(project,'.pstack/benny-install.json.tmp');await fs.symlink(external,oldTemporary);
  await fs.writeFile(path.join(source,'FOR_AGENTS.md'),'v1');
  const first=await mergePack(project,source,sha);assert.equal(first.changed,1);
  assert.equal(await fs.readFile(external,'utf8'),'external must remain unchanged');
  assert.equal((await fs.lstat(oldTemporary)).isSymbolicLink(),true);
  await fs.writeFile(path.join(source,'FOR_AGENTS.md'),'v2');
  const second=await mergePack(project,source,sha);assert.equal(second.changed,1);
  assert.equal(await fs.readFile(external,'utf8'),'external must remain unchanged');
  assert.equal(await fs.readFile(path.join(project,'.pstack/benny/FOR_AGENTS.md'),'utf8'),'v2');
  const record=JSON.parse(await fs.readFile(path.join(project,'.pstack/benny-install.json'),'utf8'));
  assert.equal(record.sourceCommit,sha);assert.match(record.files['FOR_AGENTS.md'],/^[0-9a-f]{64}$/);
  assert.equal((await fs.readdir(path.join(project,'.pstack'))).filter(p=>p.startsWith('.benny-install-')).length,0);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('merge-pack executable invoked through symlink writes pack and reports readback',async()=>{
 const dir=await temp();try{
  const project=path.join(dir,'project');await fs.mkdir(project);
  const link=path.join(dir,'merge-pack-link.mjs');
  await fs.symlink(fileURLToPath(new URL('./merge-pack.mjs',import.meta.url)),link);
  const output=execFileSync(process.execPath,[link,project,sha],{encoding:'utf8'});
  const result=JSON.parse(output);assert.ok(result.verified>0);assert.equal(result.sourceCommit,sha);
  assert.ok((await fs.readFile(path.join(project,'.pstack/benny/FOR_AGENTS.md'),'utf8')).includes('benny'));
  const record=JSON.parse(await fs.readFile(path.join(project,'.pstack/benny-install.json'),'utf8'));assert.equal(record.sourceCommit,sha);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
