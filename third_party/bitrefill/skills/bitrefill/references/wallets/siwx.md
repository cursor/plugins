# Wallet: SIWX / JWT

> Internal mechanics — never voiced. Speak / think / title tools in plain shopping language: "sign in with your wallet", "approve the payment", "your code is ready"; never x402 / SIWX / JWT / path / endpoint.

Sign-In With X (SIWX) for Bitrefill x402 REST. **Path 1 connect → JWT** + **redemption codes** after pay.

**Thinking:** one short line in the user's language — never deliberate paths, fees, or ranks.

**Claude Chat:** prefer Base MCP `web_request` + `sign` (no egress needed). Fallback: sandbox exec + inline helpers when `egress_direct` probe succeeds → [../harnesses/claude-chat.md](../harnesses/claude-chat.md) §4–5.

Signer: Base MCP `sign`, AgentCash `fetch` (auto), Phantom `evm_sign`, or shell + Node helpers below.

## Connect → JWT (Path 1)

1. **Sign in — fetch challenge** (internally: `web_request` `POST …/x402/connect`) → **402** with challenge. *(say: "Sign in with your Base wallet once")*
2. **Get wallet address** — `get_wallets`. *(silent — no user message)*
3. Pick Base chain from `supportedChains`.
4. Build EIP-4361 message with helpers below.
5. **Wallet approval** — `sign` (`personal_sign`). *(say: "Approve the sign-in in your Base Account" — free, just to browse)*
6. Build decomposed payload → `sign-in-with-x` header.
7. **Complete sign-in** — `web_request` `POST /x402/connect` with header → **200** token (~7200 s). *(silent)*
8. Attach `X-Access-Token` on subsequent gated calls. Re-connect when expired.

## SIWX for codes (after pay)

When delivery complete but no `redemption_info`:

1. **Fetch code challenge** — `GET /x402/invoice/status?invoice_id=<uuid>` → **402**. *(silent)*
2. Build message — **`uri` must match challenged route**.
3. **Wallet approval** — sign within **5 minutes**. *(say: "Approve in your Base Account to reveal your code")*
4. Same URL with `sign-in-with-x` header → **200** with `redemption_info`. *(say: "Your code is ready.")*
5. **403** → signing wallet ≠ invoice payer.

## Decomposed payload

Base64 JSON in `sign-in-with-x` header:

```json
{
  "domain": "api.bitrefill.com",
  "address": "0x<EIP-55 checksummed>",
  "statement": "<info.statement>",
  "uri": "<info.uri>",
  "version": "1",
  "chainId": "eip155:8453",
  "type": "eip191",
  "nonce": "<info.nonce>",
  "issuedAt": "<info.issuedAt>",
  "expirationTime": "<info.expirationTime>",
  "resources": ["<info.resources[]>"],
  "signature": "0x<full signature>"
}
```

Chain ID numeric (`8453`) inside signed message; CAIP-2 (`eip155:8453`) in payload.

## SIWX scripts (preferred when shell available)

Bundled helpers instead of hand-rolling checksum/message/payload:

| Script | Usage |
| --- | --- |
| [`../../scripts/siwx_build_message.js`](../../scripts/siwx_build_message.js) | `node siwx_build_message.js <wallet> <challengeUrlOrFile> [skeletonOut] [chainId]` — prints `MESSAGE_START`…`MESSAGE_END` |
| [`../../scripts/siwx_send.js`](../../scripts/siwx_send.js) | `node siwx_send.js <signature> [skeletonPath] [method] [--no-send]` — prints `SIGN_IN_WITH_X_HEADER:::`; omit `--no-send` for direct POST/GET, or with Base MCP `web_request` |

**Base MCP transport:** save 402 JSON from `web_request` → build script → `sign` → `siwx_send.js … --no-send` → retry route via `web_request` with header `sign-in-with-x`.

**Direct egress:** challenge URL to build script; send script completes route without Base MCP.

Path 1 context → [../touchpoints/x402.md](../touchpoints/x402.md#siwx-scripts-path-1-connect-redemption-codes).

## EIP-55 checksum (required)

Lowercase addresses → API rejects with another `402`. Build script applies EIP-55; if hand-building, always `toChecksumAddress`.

## Inline helpers (fallback)

No scripts: inline Node (same logic as [`../../scripts/siwx_build_message.js`](../../scripts/siwx_build_message.js)):

```javascript
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
  const hash=keccak256(Buffer.from(a,'ascii'));
  let out='0x';
  for(let i=0;i<a.length;i++) out += parseInt(hash[i],16)>=8 ? a[i].toUpperCase() : a[i];
  return out;
}
function buildSiweMessage(info, address, chainIdCaip2){
  const chainNum = parseInt(/^eip155:(\d+)$/.exec(chainIdCaip2)[1], 10);
  let prefix = `${info.domain} wants you to sign in with your Ethereum account:\n${address}`;
  if (info.statement) prefix += '\n\n' + info.statement;
  const suffix = [
    `URI: ${info.uri}`, `Version: ${info.version}`, `Chain ID: ${chainNum}`,
    `Nonce: ${info.nonce}`, `Issued At: ${info.issuedAt}`,
  ];
  if (info.expirationTime) suffix.push(`Expiration Time: ${info.expirationTime}`);
  if (info.resources?.length) suffix.push(['Resources:', ...info.resources.map(r=>`- ${r}`)].join('\n'));
  return prefix + '\n\n' + suffix.join('\n');
}
```

No JavaScript runtime **and** no Base MCP `sign`: Path 2 (no connect) or AgentCash `fetch` (handles SIWX internally). **Claude Chat:** Base MCP `sign` first; else sandbox Node when `egress_direct` probe succeeds — not Path 2. Prefer bundled scripts when agent shell (`exec`) or sandbox Node + egress available.

## Security

- JWT = bearer secret (~2 h). Memory only — never echo in chat or logs.
- Nonce expires **5 minutes**, single-use. Re-fetch challenge on 402 after SIWX.

## Troubleshooting

- **402 after SIWX** — stale nonce, wrong checksum, malformed payload; re-fetch + re-sign within 5 min.
- **403 on SIWX route** — wrong wallet; sign with invoice payer.

**User hears:** "Sign in with your Base wallet once" → *(silent browse)* → "Approve the payment in your Base Account" → "Your code is ready."

**Bad:** "Orchestrated cryptographic signing workflow… fetching 402 challenge from /x402/connect… building sign-in-with-x header."

**Good:** "Per pagare in USDC, collega il wallet Base una volta — la firma non costa nulla."
