#!/usr/bin/env node
/**
 * siwx_build_message.js  (no dependencies; Node built-ins only)
 *
 * Step 1 of the SIWX sign-in flow for Bitrefill x402 routes.
 *
 * Reads a SIWX 402 challenge, builds the exact EIP-4361 message to sign, and
 * writes a decomposed payload skeleton. Prints the message between markers.
 *
 * The wallet address is converted to its EIP-55 checksum form. This is required:
 * a lowercase address makes Bitrefill reject the signature and return another 402.
 * A self-contained keccak-256 implements the checksum, so no npm modules are needed.
 *
 * Usage:
 *   node siwx_build_message.js <walletAddress> <challengeUrlOrFile> [skeletonOut] [chainId]
 *
 *   walletAddress      paying wallet (any case; it is checksummed here)
 *   challengeUrlOrFile EITHER the route URL (fetched with built-in fetch) OR a path
 *                      to a JSON file containing the 402 body or its
 *                      extensions["sign-in-with-x"] object (e.g. a body fetched via
 *                      another transport such as Base web_request)
 *   skeletonOut        skeleton output path (default /tmp/siwx_payload.json)
 *   chainId            CAIP-2 chain to bind to (default eip155:8453 = Base). Use the
 *                      chain the invoice was paid on.
 */
'use strict';
const fs = require('fs');

// ---- keccak-256 (Ethereum) + EIP-55 checksum, self-contained -------------
const RC = [
  0x0000000000000001n,0x0000000000008082n,0x800000000000808an,0x8000000080008000n,
  0x000000000000808bn,0x0000000080000001n,0x8000000080008081n,0x8000000000008009n,
  0x000000000000008an,0x0000000000000088n,0x0000000080008009n,0x000000008000000an,
  0x000000008000808bn,0x800000000000008bn,0x8000000000008089n,0x8000000000008003n,
  0x8000000000008002n,0x8000000000000080n,0x000000000000800an,0x800000008000000an,
  0x8000000080008081n,0x8000000000008080n,0x0000000080000001n,0x8000000080008008n];
const ROT = [0,1,62,28,27,36,44,6,55,20,3,10,43,25,39,41,45,15,21,8,18,2,61,56,14];
const MASK = (1n<<64n)-1n;
const rotl = (x,n)=> n===0n ? x : ((x<<n)|(x>>(64n-n)))&MASK;
function keccakF(s){
  for(let round=0;round<24;round++){
    const C=new Array(5);
    for(let x=0;x<5;x++) C[x]=s[x]^s[x+5]^s[x+10]^s[x+15]^s[x+20];
    const D=new Array(5);
    for(let x=0;x<5;x++) D[x]=C[(x+4)%5]^rotl(C[(x+1)%5],1n);
    for(let x=0;x<5;x++) for(let y=0;y<5;y++) s[x+5*y]^=D[x];
    const B=new Array(25);
    for(let x=0;x<5;x++) for(let y=0;y<5;y++) B[y+5*((2*x+3*y)%5)]=rotl(s[x+5*y],BigInt(ROT[x+5*y]));
    for(let x=0;x<5;x++) for(let y=0;y<5;y++) s[x+5*y]=B[x+5*y]^(((~B[((x+1)%5)+5*y])&B[((x+2)%5)+5*y])&MASK);
    s[0]^=RC[round];
  }
}
function keccak256(bytes){
  const rate=136; const s=new Array(25).fill(0n);
  const padded=new Uint8Array(Math.ceil((bytes.length+1)/rate)*rate);
  padded.set(bytes); padded[bytes.length]^=0x01; padded[padded.length-1]^=0x80;
  for(let off=0;off<padded.length;off+=rate){
    for(let i=0;i<rate/8;i++){
      let lane=0n;
      for(let j=7;j>=0;j--) lane=(lane<<8n)|BigInt(padded[off+i*8+j]);
      s[i]^=lane;
    }
    keccakF(s);
  }
  const out=new Uint8Array(32);
  for(let i=0;i<4;i++){ let lane=s[i]; for(let j=0;j<8;j++){ out[i*8+j]=Number(lane&0xffn); lane>>=8n; } }
  return Buffer.from(out).toString('hex');
}
function toChecksumAddress(addr){
  const a=String(addr).toLowerCase().replace(/^0x/,'');
  if(!/^[0-9a-f]{40}$/.test(a)) throw new Error('not a 20-byte hex address: '+addr);
  const hash=keccak256(Buffer.from(a,'ascii'));
  let out='0x';
  for(let i=0;i<a.length;i++) out += parseInt(hash[i],16)>=8 ? a[i].toUpperCase() : a[i];
  return out;
}

// ---- EIP-4361 message builder (matches the standard SIWE message format) ---
function buildSiweMessage(p){
  const header = `${p.domain} wants you to sign in with your Ethereum account:`;
  let prefix = header + '\n' + p.address;
  if (p.statement) prefix += '\n\n' + p.statement;
  const suffix = [
    `URI: ${p.uri}`,
    `Version: ${p.version}`,
    `Chain ID: ${p.chainId}`,        // numeric here
    `Nonce: ${p.nonce}`,
    `Issued At: ${p.issuedAt}`,
  ];
  if (p.expirationTime) suffix.push(`Expiration Time: ${p.expirationTime}`);
  if (p.notBefore) suffix.push(`Not Before: ${p.notBefore}`);
  if (p.requestId) suffix.push(`Request ID: ${p.requestId}`);
  if (p.resources && p.resources.length)
    suffix.push(['Resources:', ...p.resources.map((r) => `- ${r}`)].join('\n'));
  return prefix + '\n\n' + suffix.join('\n');
}

async function loadChallenge(src){
  let body;
  if (/^https?:\/\//i.test(src)) {
    const res = await fetch(src); // Node built-in fetch
    body = await res.json();
  } else {
    body = JSON.parse(fs.readFileSync(src, 'utf8'));
  }
  // accept either the full 402 body or the sign-in-with-x object or its info
  if (body.extensions && body.extensions['sign-in-with-x']) return body.extensions['sign-in-with-x'];
  if (body.info && body.supportedChains) return body;
  if (body.info) return body;
  return { info: body, supportedChains: body.supportedChains || [] };
}

async function main(){
  const rawAddress = process.argv[2];
  const challengeSrc = process.argv[3];
  const outPath = process.argv[4] || '/tmp/siwx_payload.json';
  const preferredChainId = process.argv[5] || 'eip155:8453';
  if (!rawAddress || !challengeSrc) {
    console.error('Usage: node siwx_build_message.js <walletAddress> <challengeUrlOrFile> [skeletonOut] [chainId]');
    process.exit(1);
  }

  const address = toChecksumAddress(rawAddress);
  const ext = await loadChallenge(challengeSrc);
  const info = ext.info || ext;
  const chains = ext.supportedChains || [];
  const chain =
    chains.find((c) => c.chainId === preferredChainId) ||
    chains.find((c) => String(c.chainId).startsWith('eip155:')) ||
    { chainId: preferredChainId, type: 'eip191' };
  const numericChainId = parseInt(/^eip155:(\d+)$/.exec(chain.chainId)[1], 10);

  const message = buildSiweMessage({
    domain: info.domain, address, statement: info.statement, uri: info.uri,
    version: info.version, chainId: numericChainId, nonce: info.nonce,
    issuedAt: info.issuedAt, expirationTime: info.expirationTime,
    notBefore: info.notBefore, requestId: info.requestId, resources: info.resources,
  });

  const skeleton = {
    domain: info.domain, address, statement: info.statement, uri: info.uri,
    version: info.version, chainId: chain.chainId /* CAIP-2 here */, type: chain.type || 'eip191',
    nonce: info.nonce, issuedAt: info.issuedAt, expirationTime: info.expirationTime,
    resources: info.resources,
  };
  if (info.notBefore) skeleton.notBefore = info.notBefore;
  if (info.requestId) skeleton.requestId = info.requestId;

  fs.writeFileSync(outPath, JSON.stringify({ resourceUrl: info.uri, skeleton }));
  console.log('ADDRESS:::' + address);
  console.log('CHAIN:::' + chain.chainId);
  console.log('EXPIRES:::' + info.expirationTime);
  console.log('SKELETON_SAVED:::' + outPath);
  console.log('MESSAGE_START');
  console.log(message);
  console.log('MESSAGE_END');
}
main().catch((e) => { console.error('build failed:', e && e.message ? e.message : String(e)); process.exit(1); });