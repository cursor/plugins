# KyberSwap

Cursor plugin that connects agents to [KyberSwap](https://kyberswap.com/) through KyberNetwork's open-source [kyberswap-mcp](https://github.com/KyberNetwork/kyberswap-mcp) [Model Context Protocol](https://modelcontextprotocol.io/) server.

Quote swaps, inspect pools, and build swap, zap, and gasless limit-order calldata across 18 EVM chains.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **KyberSwap**.
3. Click **Install**.

Or run `/add-plugin kybernetwork` in chat.

## MCP

```json
{
  "mcpServers": {
    "kybernetwork": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "github:KyberNetwork/kyberswap-mcp"
      ]
    }
  }
}
```

The server runs locally over stdio and needs Node.js 18+. It calls KyberSwap's public, unauthenticated APIs, so there is no API key or sign-in.

Optional: override the default public RPC for any chain with `RPC_URL_<CHAIN_SLUG_UPPER>` (for example `RPC_URL_ETHEREUM`). These are only used by `swap-simulate` and `swap-status`.

## What agents can do

| Category | Tools |
| --- | --- |
| Read-only | `get-quote`, `token-info`, `get-pool-info`, `order-manager`, `position-manager` |
| Build calldata | `swap-build`, `zap` |
| Verify | `swap-simulate`, `swap-status` |
| Limit orders | `limit-order-build`, `limit-order-submit`, `limit-order-cancel-build`, `limit-order-cancel-submit` |

Supported chains: Ethereum, BSC, Arbitrum, Polygon, Optimism, Base, Avalanche, Linea, Mantle, Sonic, Berachain, Ronin, Unichain, HyperEVM, Plasma, Etherlink, Monad, and MegaETH.

## Notes

- The server is non-custodial. It never holds private keys or signs transactions; it returns reviewable calldata or EIP-712 typed data that you sign and broadcast with your own wallet.
- Swap routes expire after about 30 seconds. Run `swap-simulate` before broadcasting.

## Docs

- KyberSwap: https://kyberswap.com/
- Server source: https://github.com/KyberNetwork/kyberswap-mcp

Logo is the Kyber Network mark from the verified `KyberNetwork` GitHub organization avatar (256×256). kyber.network and kyberswap.com were unreachable when this plugin was added, so the submitted logo file was not downloaded.

## License

MIT
