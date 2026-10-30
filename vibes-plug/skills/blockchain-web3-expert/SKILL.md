---
name: blockchain-web3-expert
description: "Expert guide for Web3 and blockchain dApp integration — viem, wagmi v2, ethers.js v6, RainbowKit, smart contract interactions, and EVM wallet state / Panduan ahli integrasi Web3 dan blockchain."
author: "Roedy Rustam"
version: "4.3.0"
---

# Blockchain & Web3 dApp Expert (EVM & Viem Standard 2026)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
Production guide for architecting decentralized applications (dApps) across EVM-compatible blockchains (Ethereum, Base, Arbitrum, Optimism, Polygon). Focuses on lightweight, type-safe contract interactions using **viem** and **wagmi v2**, seamless multi-wallet modal integration (**RainbowKit / Reown AppKit**), Sign-In with Ethereum (**SIWE / ERC-4361**), optimistic transaction UI lifecycles, gas fee estimation, and resilient multi-RPC fallback configurations.

### Trigger Conditions
- Integrating Web3 wallet connection buttons (MetaMask, Coinbase, Rainbow, Rabby, WalletConnect).
- Executing type-safe smart contract reads and state-changing writes (ERC-20, ERC-721, ERC-1155).
- Implementing cryptographic wallet authentication via SIWE (Sign-In with Ethereum).
- Handling RPC node rate-limiting, user rejection errors, and re-org resilience.

### Wagmi v2 & Viem Multi-Chain Configuration

```typescript
// src/lib/web3/wagmi-config.ts
import { http, createConfig } from 'wagmi';
import { mainnet, base, arbitrum } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

export const wagmiConfig = createConfig({
  chains: [base, mainnet, arbitrum],
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'Vibes Web3 dApp' }),
    walletConnect({ projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID! }),
  ],
  transports: {
    [base.id]: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
    [mainnet.id]: http(process.env.ETH_RPC_URL),
    [arbitrum.id]: http(process.env.ARBITRUM_RPC_URL),
  },
  ssr: true, // Crucial for Next.js 15 App Router hydration safety
});
```

### Sign-In with Ethereum (SIWE / ERC-4361) Verification Route

```typescript
// src/app/api/auth/siwe/verify/route.ts
import { NextResponse } from 'next/server';
import { SiweMessage } from 'siwe';

export async function POST(req: Request) {
  const { message, signature } = await req.json();

  try {
    const siweMessage = new SiweMessage(message);
    const verification = await siweMessage.verify({ signature });

    if (!verification.success) {
      return NextResponse.json({ error: 'Invalid SIWE signature' }, { status: 401 });
    }

    const walletAddress = verification.data.address;
    // Issue secure HTTP-only session JWT...
    return NextResponse.json({ success: true, address: walletAddress });
  } catch (error) {
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 });
  }
}
```

### Type-Safe Smart Contract Hook (Wagmi v2)

```tsx
// src/components/web3/TokenBalanceBadge.tsx
'use client';

import { useAccount, useReadContract } from 'wagmi';
import { parseAbi, formatUnits } from 'viem';

const ERC20_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
]);

export function TokenBalanceBadge({ tokenAddress }: { tokenAddress: `0x${string}` }) {
  const { address, isConnected } = useAccount();

  const { data: balance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address },
  });

  const { data: decimals } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'decimals',
  });

  if (!isConnected || balance === undefined || decimals === undefined) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 tabular-nums">
      Balance: {formatUnits(balance, decimals)} Tokens
    </div>
  );
}
```

## Orchestration & Integration
- **`senior-frontend`**: Manages Web3 React 19 hydration wrappers and client providers.
- **`authentication-identity-expert`**: Connects SIWE wallet logins with user sessions in PostgreSQL.
- **`error-resilience-expert`**: Provides fallback transports for flaky RPC endpoints.
- **`post-quantum-crypto-migrator`**: Prepares cryptography pipelines for future post-quantum signature schemes.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi bersama `senior-frontend`, `authentication-identity-expert`, `error-resilience-expert`, dan `post-quantum-crypto-migrator`.

### Deskripsi
Panduan produksi untuk membangun aplikasi terdesentralisasi (*dApps*) di seluruh jaringan blockchain kompatibel EVM (Ethereum, Base, Arbitrum, Optimism, Polygon). Berfokus pada interaksi kontrak pintar type-safe yang ringan menggunakan **viem** dan **wagmi v2**, integrasi modal multi-dompet (**RainbowKit / Reown AppKit**), login kriptografis Sign-In with Ethereum (**SIWE / ERC-4361**), siklus transaksi optimistik, estimasi biaya gas, serta konfigurasi multi-RPC fallback yang tangguh.

### Kondisi Pemicu
- Menambahkan tombol hubungkan dompet Web3 (MetaMask, Coinbase, Rabby, WalletConnect).
- Membaca data atau mengeksekusi transaksi pada smart contract (token ERC-20, NFT ERC-721).
- Menerapkan login tanpa password menggunakan tanda tangan dompet kripto (SIWE).
- Mengatasi masalah latensi RPC node atau pembatalan transaksi oleh pengguna.

### Pola Eksekusi Transaksi Pintar di Sisi Klien

```tsx
// src/components/web3/TransferButton.tsx
'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, parseAbi } from 'viem';

const ERC20_ABI = parseAbi([
  'function transfer(address recipient, uint256 amount) returns (bool)'
]);

export function TransferButton({ tokenAddress, recipient, amount }: Props) {
  const { data: txHash, writeContract, isPending: isSigning } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const handleTransfer = () => {
    writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [recipient, parseUnits(amount, 18)],
    });
  };

  return (
    <button
      onClick={handleTransfer}
      disabled={isSigning || isConfirming}
      className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors hover:bg-sky-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
    >
      {isSigning ? 'Menunggu Tanda Tangan...' : isConfirming ? 'Mengonfirmasi Transaksi...' : isSuccess ? 'Transfer Berhasil!' : 'Kirim Token'}
    </button>
  );
}
```

### 3 Hukum Utama Pengembangan Web3 Modern
1. **Gunakan Viem daripada Ethers v5 Lawas**: Viem dirancang khusus dengan performa tinggi, ukuran bundle 70% lebih kecil, dan inferensi tipe ABI otomatis.
2. **Wajib Transpor Multi-RPC Fallback**: Jangan bergantung pada satu URL RPC publik yang sering mengalami *rate-limit*. Konfigurasikan penyedia cadangan (Alchemy, Infura, QuickNode).
3. **Pemberitahuan Status Transaksi Lengkap**: Tampilkan umpan balik visual yang jelas bagi setiap fase: menunggu konfirmasi dompet, proses penambangan blok (*mining*), hingga konfirmasi akhir di blockchain.

## Integrasi Orkestrasi
- **`senior-frontend`**: Mengatur penyedia WagmiProvider di root aplikasi Next.js.
- **`authentication-identity-expert`**: Menghubungkan alamat dompet dengan data profil pengguna di database.
- **`error-resilience-expert`**: Mengatur strategi percobaan ulang saat terjadi kegagalan jaringan RPC.
- **`post-quantum-crypto-migrator`**: Memantau perkembangan keamanan algoritma tanda tangan kriptografi generasi berikutnya.