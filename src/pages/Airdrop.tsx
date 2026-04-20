import { useMemo, useState } from 'react';
import { BrowserProvider, Contract, isAddress, type Eip1193Provider } from 'ethers';
import { CHAIN_IDS } from '@/lib/config';

const DEFAULT_CONTRACT = '0x4a51E9de2a8A28D0D368FE4192ce37570cc904f7';
const ALLOWED_AIRDROP_WALLET = '0xf05443b49521babda752fa6ab8ad2b3ef51cb68f';

const AIRDROP_ABI = [
  'function owner() view returns (address)',
  'function setTransfersFrozen(bool frozen)',
  'function safeTransferFrom(address from, address to, uint256 tokenId)',
  'function ownerOf(uint256 tokenId) view returns (address)'
];

type Row = {
  tokenId: bigint;
  to: string;
  line: number;
};

type TransferResult = {
  tokenId: string;
  to: string;
  status: 'ok' | 'failed';
  txHash?: string;
  error?: string;
};

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

const getInjectedProvider = (): Eip1193Provider | null => {
  if (typeof window === 'undefined') return null;
  return window.ethereum ?? null;
};

const parseRows = (raw: string): { rows: Row[]; errors: string[] } => {
  const rows: Row[] = [];
  const errors: string[] = [];

  raw
    .split('\n')
    .map((line) => line.trim())
    .forEach((line, idx) => {
      if (!line) return;
      const parts = line.split(',').map((p) => p.trim());
      if (parts.length < 2) {
        errors.push(`Line ${idx + 1}: expected "tokenId,walletAddress"`);
        return;
      }

      // Skip optional header row.
      if (idx === 0 && parts[0].toLowerCase() === 'tokenid') return;

      try {
        const tokenId = BigInt(parts[0]);
        const to = parts[1];
        if (!isAddress(to)) {
          errors.push(`Line ${idx + 1}: invalid address ${to}`);
          return;
        }

        rows.push({ tokenId, to, line: idx + 1 });
      } catch {
        errors.push(`Line ${idx + 1}: invalid tokenId "${parts[0]}"`);
      }
    });

  return { rows, errors };
};

export default function Airdrop() {
  const [contractAddress, setContractAddress] = useState(DEFAULT_CONTRACT);
  const [csvInput, setCsvInput] = useState('tokenId,walletAddress');
  const [walletAddress, setWalletAddress] = useState('');
  const [status, setStatus] = useState('Connect wallet to start.');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TransferResult[]>([]);

  const parsed = useMemo(() => parseRows(csvInput), [csvInput]);
  const isAuthorizedWallet =
    walletAddress.length > 0 && walletAddress.toLowerCase() === ALLOWED_AIRDROP_WALLET;

  const connectWallet = async () => {
    const injected = getInjectedProvider();
    if (!injected) {
      setStatus('No wallet detected. Install MetaMask/Rabby/Phantom EVM first.');
      return;
    }

    const provider = new BrowserProvider(injected);
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== CHAIN_IDS.monadMainnet) {
      setStatus('Switch wallet to Monad Mainnet (chain 143), then retry.');
      return;
    }

    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    if (address.toLowerCase() !== ALLOWED_AIRDROP_WALLET) {
      setWalletAddress(address);
      setStatus(
        `Access denied for ${address}. This tool is locked to ${ALLOWED_AIRDROP_WALLET}.`
      );
      return;
    }

    setWalletAddress(address);
    setStatus(`Connected: ${address}`);
  };

  const runAirdrop = async () => {
    const injected = getInjectedProvider();
    if (!injected) {
      setStatus('No wallet detected.');
      return;
    }
    if (!isAddress(contractAddress)) {
      setStatus('Invalid contract address.');
      return;
    }
    if (parsed.errors.length > 0) {
      setStatus('Fix CSV errors before running.');
      return;
    }
    if (parsed.rows.length === 0) {
      setStatus('No rows found. Add at least one tokenId,walletAddress row.');
      return;
    }
    if (!isAuthorizedWallet) {
      setStatus(`Access denied. Connect ${ALLOWED_AIRDROP_WALLET} to run this tool.`);
      return;
    }

    setIsRunning(true);
    setResults([]);

    const provider = new BrowserProvider(injected);
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== CHAIN_IDS.monadMainnet) {
      setStatus('Switch wallet to Monad Mainnet (chain 143), then retry.');
      setIsRunning(false);
      return;
    }

    const signer = await provider.getSigner();
    const signerAddress = (await signer.getAddress()).toLowerCase();
    const contract = new Contract(contractAddress, AIRDROP_ABI, signer);

    try {
      const owner = String(await contract.owner()).toLowerCase();
      if (owner !== signerAddress) {
        setStatus('Connected wallet is not contract owner. Owner-only call required.');
        setIsRunning(false);
        return;
      }

      setStatus('Unfreezing transfers...');
      const unfreezeTx = await contract.setTransfersFrozen(false);
      await unfreezeTx.wait();

      const out: TransferResult[] = [];
      for (let i = 0; i < parsed.rows.length; i += 1) {
        const row = parsed.rows[i];
        setStatus(`Transferring token ${row.tokenId.toString()} (${i + 1}/${parsed.rows.length})...`);

        try {
          const currentOwner = String(await contract.ownerOf(row.tokenId)).toLowerCase();
          if (currentOwner !== signerAddress) {
            out.push({
              tokenId: row.tokenId.toString(),
              to: row.to,
              status: 'failed',
              error: `Token owner is ${currentOwner}, not connected wallet (line ${row.line}).`
            });
            continue;
          }

          const tx = await contract.safeTransferFrom(signerAddress, row.to, row.tokenId);
          const receipt = await tx.wait();
          out.push({
            tokenId: row.tokenId.toString(),
            to: row.to,
            status: 'ok',
            txHash: receipt.hash
          });
        } catch (error) {
          out.push({
            tokenId: row.tokenId.toString(),
            to: row.to,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown transfer error'
          });
        }
      }

      setResults(out);
      const okCount = out.filter((r) => r.status === 'ok').length;
      const failCount = out.length - okCount;
      setStatus(`Airdrop finished: ${okCount} success, ${failCount} failed. Refreezing...`);
    } catch (error) {
      setStatus(
        `Airdrop stopped: ${error instanceof Error ? error.message : 'Unknown error'}. Attempting refreeze...`
      );
    } finally {
      try {
        const freezeTx = await contract.setTransfersFrozen(true);
        await freezeTx.wait();
        setStatus((prev) => `${prev} Transfers frozen again.`);
      } catch (freezeError) {
        setStatus(
          `WARNING: could not refreeze automatically. Run setTransfersFrozen(true) manually. ${freezeError instanceof Error ? freezeError.message : ''}`
        );
      }
      setIsRunning(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <h1 className="text-2xl font-bold">SPLRG NFT Airdrop Tool</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Uses your existing deployed contract. No contract edits and no redeploy needed.
          </p>
          <p className="mt-1 text-sm text-amber-500">
            This is multi-transaction flow: unfreeze, transfers, refreeze.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <label className="block text-sm font-medium">Contract Address</label>
          <input
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value.trim())}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="0x..."
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={connectWallet}
              className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
              disabled={isRunning}
            >
              Connect Wallet
            </button>
            <button
              type="button"
              onClick={runAirdrop}
              className="rounded-lg bg-green-600 px-4 py-2 text-white disabled:opacity-50"
              disabled={isRunning || !isAuthorizedWallet}
            >
              {isRunning ? 'Running...' : 'Run Airdrop'}
            </button>
          </div>

          <p className="text-sm text-muted-foreground">Connected wallet: {walletAddress || 'Not connected'}</p>
          <p className="text-sm text-muted-foreground">Allowed wallet: {ALLOWED_AIRDROP_WALLET}</p>
          <p className="text-sm">{status}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <label className="block text-sm font-medium">CSV Input (tokenId,walletAddress)</label>
          <textarea
            value={csvInput}
            onChange={(e) => setCsvInput(e.target.value)}
            className="h-64 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
            placeholder={'tokenId,walletAddress\n151,0xabc...\n239,0xdef...'}
          />

          {parsed.errors.length > 0 && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
              {parsed.errors.map((err) => (
                <div key={err}>{err}</div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Results</h2>
          {results.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No transfers run yet.</p>
          ) : (
            <div className="mt-3 space-y-2 text-sm">
              {results.map((r, idx) => (
                <div
                  key={`${r.tokenId}-${r.to}-${idx}`}
                  className={`rounded-lg border p-2 ${r.status === 'ok' ? 'border-green-500/40 bg-green-500/10' : 'border-red-500/40 bg-red-500/10'}`}
                >
                  <div>
                    Token #{r.tokenId} → {r.to}
                  </div>
                  <div>{r.status === 'ok' ? `Success: ${r.txHash}` : `Failed: ${r.error}`}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
