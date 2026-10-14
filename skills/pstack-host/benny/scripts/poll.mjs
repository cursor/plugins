#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const required=['poll','readThread','existingFix','dispatch','recover'];
const markerPattern=/\[benny:(bug|performance|other)\]/g;
export function trustedVerdict(messages, user, channel, ts) {
 const trusted=messages.filter(m=>m.user===user && m.channel===channel && m.thread_ts===ts);
 const marked=trusted.flatMap(m=>Array.from((m.text||'').matchAll(markerPattern),x=>x[1]));
 return marked.length===1?marked[0]:null;
}
const exists=async p=>{try {return await fs.readFile(p,'utf8');} catch(e){if(e.code==='ENOENT')return null; throw e;}};
export async function pollOnce(project, config, adapter, {verifyCommitted=true}={}) {
 project=path.resolve(project);
 if(!config.slack?.source_channel_id || !config.slack?.triage_identity_user_id) throw Error('Explicit source channel and triage identity required');
 if(!config.repository?.url || !config.repository?.default_branch) throw Error('Explicit repository URL and default branch required');
 if(!config.control?.feature_map_path || !config.control?.skill_name || !config.tracker?.adapter_skill_name || !config.repository?.draft_only) throw Error('Tracker, control, feature map and draft-only configuration required');
 for(const name of required) if(typeof adapter[name]!=='function') throw Error(`Unavailable adapter tool: ${name}`);
 const capabilities=await adapter.capabilities?.();
 for(const name of ['slackRead','slackThreadReply','trackerReadWrite','attachments','control','draftPullRequest']) if(capabilities?.[name]!==true) throw Error(`Unavailable capability: ${name}`);
 const instructions=['.pstack/benny/skills/triage-issue-reports/instruction.md','.pstack/benny/skills/reproduce-and-fix-issues/instruction.md'];
 if(verifyCommitted) {
  for(const p of [...instructions,config.configuration_path,config.control.feature_map_path,...(config.routing?.map_path?[config.routing.map_path]:[])]) {
   if(!p || path.isAbsolute(p) || p.split('/').includes('..')) throw Error('Committed project-relative paths required');
   const actual=await fs.readFile(path.join(project,p));
   const committed=execFileSync('git',['show',`HEAD:${p}`],{cwd:project});
   if(!actual.equals(committed)) throw Error(`Uncommitted operational file: ${p}`);
  }
 }
 for(const relative of ['.pstack','.pstack/benny-state','.pstack/benny-state/events.json','.pstack/benny-state/events.json.tmp']) {
  try { if((await fs.lstat(path.join(project,relative))).isSymbolicLink()) throw Error(`Symlink forbidden: ${relative}`); } catch(e) { if(e.code!=='ENOENT') throw e; }
 }
 const stateDir=path.join(project,'.pstack/benny-state'); await fs.mkdir(stateDir,{recursive:true});
 const lock=path.join(stateDir,'poll.lock');
 try { await fs.mkdir(lock); } catch(e) { if(e.code==='EEXIST') throw Error('Benny poll already active or interrupted; verify runner stopped before removing poll.lock'); throw e; }
 try {
  const statePath=path.join(stateDir,'events.json');
  const state=JSON.parse(await exists(statePath)||'{"events":{}}');
  const save=async()=>{await fs.writeFile(statePath+'.tmp',JSON.stringify(state,null,2)+'\n');await fs.rename(statePath+'.tmp',statePath);};
  const events=await adapter.poll(config.slack.source_channel_id);
  for(const event of events) {
   if(event.channel!==config.slack.source_channel_id || !/^\d+\.\d+$/.test(event.ts||'') || (event.thread_ts && event.thread_ts!==event.ts)) continue;
   const key=`${event.channel}:${event.ts}`;
   state.events[key]??={channel:event.channel,thread_ts:event.ts,triage:false,reproduce:false,pending:null};
  }
  await save();
  for(const [key,item] of Object.entries(state.events)) {
   if(item.channel!==config.slack.source_channel_id) continue;
   if(item.pending) {
    const outcome=await adapter.recover(item.pending.id);
    if(outcome==='completed') {item[item.pending.phase]=true;item.pending=null;await save();}
    else if(outcome==='no-effect') {item.pending=null;await save();}
    else continue; // Unknown external outcome is never retried blindly.
   }
   const messages=await adapter.readThread(item.channel,item.thread_ts);
   if(!Array.isArray(messages)) throw Error('Thread read did not return messages');
   if(!messages.some(m=>m.channel===item.channel && m.ts===item.thread_ts)) continue;
   const verdict=trustedVerdict(messages,config.slack.triage_identity_user_id,item.channel,item.thread_ts);
   if(verdict) {item.triage=true;await save();}
   const phase=!item.triage?'triage':(!item.reproduce && ['bug','performance'].includes(verdict)?'reproduce':null);
   if(!phase) continue;
   const existingFix=phase==='reproduce'?await adapter.existingFix(item.channel,item.thread_ts):null;
   const id=`${key}:${phase}`;
   item.pending={id,phase}; await save();
   // The adapter must reconcile this id with external writes on restart.
   const result=await adapter.dispatch({id,phase,channel:item.channel,thread_ts:item.thread_ts,
    instruction:instructions[phase==='triage'?0:1],configuration:config.configuration_path,
    mode:existingFix?'verify-existing-fix':'follow-instruction',existingFix,
    constraints:{threadOnly:true,draftOnly:true,workerSlackWrites:false,workerSlackCredentials:false}});
   if(result?.completed!==true) throw Error('Adapter did not confirm completion; pending operation retained');
   item[phase]=true;item.pending=null;await save();
  }
  return state;
 } finally {await fs.rmdir(lock);}
}
if(process.argv[1] && await fs.realpath(process.argv[1])===await fs.realpath(fileURLToPath(import.meta.url))) {
 const [project,configPath,adapterPath]=process.argv.slice(2);
 try {
  if(!project || !configPath || !adapterPath) throw Error('Usage: node poll.mjs <project> <project-relative-config.json> <adapter.mjs>');
  const config=JSON.parse(await fs.readFile(path.resolve(project,configPath),'utf8')); config.configuration_path=configPath;
  const {default:adapter}=await import(pathToFileURL(path.resolve(adapterPath)));
  await pollOnce(project,config,adapter); console.log('Benny poll completed; durable state written');
 } catch(e) {console.error(e.message);process.exitCode=1;}
}
