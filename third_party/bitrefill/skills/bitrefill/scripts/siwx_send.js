#!/usr/bin/env node
/**
 * siwx_send.js  (no dependencies; Node built-ins only)
 *
 * Step 2 of the SIWX sign-in flow. Reads the payload skeleton written by
 * siwx_build_message.js, injects the signature, base64-encodes the decomposed
 * payload, and prints the SIGN-IN-WITH-X header value.
 *
 * The printed header works with any transport. By default this also sends the
 * request with Node's built-in fetch and prints the result. Pass --no-send to
 * only print the header (for example to send it via Base MCP web_request, which
 * is the recommended transport when direct network access is restricted).
 *
 * Smart-wallet (Coinbase Smart Wallet / Base Account) signatures are ERC-1271 /
 * ERC-6492 wrapped; pass the full signature value through unchanged.
 *
 * Usage:
 *   node siwx_send.js <signature> [skeletonPath] [method] [--no-send]
 *
 *   signature     0x-prefixed signature from the wallet (personal_sign)
 *   skeletonPath  path written by siwx_build_message.js (default /tmp/siwx_payload.json)
 *   method        HTTP method for the route (default GET)
 *   --no-send     only print the base64 header; do not call the route
 */
'use strict';
const fs = require('fs');

async function main(){
  const args = process.argv.slice(2);
  const noSend = args.includes('--no-send');
  const positional = args.filter((a) => a !== '--no-send');
  const signature = positional[0];
  const skeletonPath = positional[1] || '/tmp/siwx_payload.json';
  const method = (positional[2] || 'GET').toUpperCase();
  if (!signature) {
    console.error('Usage: node siwx_send.js <signature> [skeletonPath] [method] [--no-send]');
    process.exit(1);
  }

  const saved = JSON.parse(fs.readFileSync(skeletonPath, 'utf8'));
  const payload = { ...saved.skeleton, signature };
  const header = Buffer.from(JSON.stringify(payload)).toString('base64');

  console.log('RESOURCE_URL:::' + saved.resourceUrl);
  console.log('SIGN_IN_WITH_X_HEADER:::' + header);

  if (noSend) return;
  console.log('NOW:::' + new Date().toISOString());
  const res = await fetch(saved.resourceUrl, { method, headers: { 'SIGN-IN-WITH-X': header } });
  console.log('STATUS:::' + res.status);
  console.log('BODY:::' + (await res.text()));
}
main().catch((e) => { console.error('send failed:', e && e.message ? e.message : String(e)); process.exit(1); });