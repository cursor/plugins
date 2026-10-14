#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const hash = b => createHash('sha256').update(b).digest('hex');
const absent = async p => { try { return await fs.readFile(p); } catch(e) { if(e.code==='ENOENT') return null; throw e; } };
async function files(root, relative='') {
 const out=[];
 for(const d of await fs.readdir(path.join(root,relative),{withFileTypes:true})) {
  const r=path.join(relative,d.name);
  if(d.isSymbolicLink()) throw Error(`Symlink forbidden: ${r}`);
  if(d.isDirectory()) out.push(...await files(root,r)); else if(d.isFile()) out.push(r);
 }
 return out;
}
export async function mergePack(project, source, sourceCommit) {
 if(!/^[0-9a-f]{40}$/.test(sourceCommit)) throw Error('Actual source commit SHA is required');
 project=path.resolve(project); source=path.resolve(source);
 const dest=path.join(project,'.pstack/benny');
 for(const p of ['.pstack','.pstack/benny','.pstack/benny-install.json']) {
  try { if((await fs.lstat(path.join(project,p))).isSymbolicLink()) throw Error(`Symlink forbidden: ${p}`); } catch(e) { if(e.code!=='ENOENT') throw e; }
 }
 const recordPath=path.join(project,'.pstack/benny-install.json');
 const recordBytes=await absent(recordPath);
 const previous=recordBytes?JSON.parse(recordBytes):{files:{}};
 const desired={}, changes=[], conflicts=[];
 for(const r of await files(source)) {
  let cur=dest;
  for(const part of r.split(path.sep)) { cur=path.join(cur,part); try { if((await fs.lstat(cur)).isSymbolicLink()) throw Error(`Symlink forbidden: ${cur}`); } catch(e) { if(e.code!=='ENOENT') throw e; } }
  const data=await fs.readFile(path.join(source,r)); const current=await absent(path.join(dest,r));
  desired[r]=hash(data);
  if(current && hash(current)!==desired[r] && hash(current)!==previous.files[r]) conflicts.push(r);
  else if(!current || hash(current)!==desired[r]) changes.push([r,data]);
 }
 if(conflicts.length) throw Error(`Pack conflict; no files changed. Review local/source diff: ${conflicts.join(', ')}`);
 for(const [r,data] of changes) { const p=path.join(dest,r); await fs.mkdir(path.dirname(p),{recursive:true}); await fs.writeFile(p,data,{mode:(await fs.stat(path.join(source,r))).mode&0o777}); }
 for(const [r,h] of Object.entries(desired)) if(hash(await fs.readFile(path.join(dest,r)))!==h) throw Error(`Readback failed: ${r}`);
 await fs.mkdir(path.dirname(recordPath),{recursive:true});
 const recordTemp=path.join(path.dirname(recordPath),`.benny-install-${randomUUID()}.tmp`);
 const handle=await fs.open(recordTemp,'wx',0o600);
 try {
  await handle.writeFile(JSON.stringify({sourceCommit,files:desired},null,2)+'\n');
  await handle.close();
  await fs.rename(recordTemp,recordPath);
 } finally {
  await handle.close();
  await fs.rm(recordTemp,{force:true});
 }
 return {destination:dest,changed:changes.length,verified:Object.keys(desired).length,sourceCommit};
}
if(process.argv[1] && await fs.realpath(process.argv[1])===await fs.realpath(fileURLToPath(import.meta.url))) {
 const [project,sourceCommit]=process.argv.slice(2);
 if(!project || !sourceCommit) { console.error('Usage: node merge-pack.mjs <target-project> <actual-source-commit>'); process.exitCode=1; }
 else { try { console.log(JSON.stringify(await mergePack(project,fileURLToPath(new URL('../benny/',import.meta.url)),sourceCommit))); } catch(e) { console.error(e.message); process.exitCode=1; } }
}
