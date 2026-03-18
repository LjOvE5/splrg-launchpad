import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Wallet, Minus, Plus, Loader2, Sparkles, Globe, Settings, ChevronDown, RefreshCw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { WalletService, type WalletState } from '@/lib/walletService';
import { useToast } from '@/hooks/use-toast';
import { BrowserProvider, Contract, formatEther, parseEther, Interface, JsonRpcProvider } from 'ethers';
import splrgBg from '@/assets/splrg-bg.png';
import splrgLogo from '@/assets/splrg-logo.jpg';
import AdminPanel from '@/components/AdminPanel';
import { SpinWheelModal } from '@/components/SpinWheelModal';
import { MintSuccessAnimation } from '@/components/MintSuccessAnimation';
import { prepareAudio } from '@/lib/sound';
import { FallingLogos } from '@/components/FallingLogos';
import NFTLaunchpadArtifact from '@/abi/NFTLaunchpadABI.json';
import { getNetworkConfig, getRpcUrlForChainId, CHAIN_IDS, FALLBACK_RPC_URLS, IRYS_IMAGE_BASE, ADMIN_WALLET_ADDRESS, PREMINTED_SUPPLY, WHITELIST_PRICE_MON, WHITELIST_DURATION_HOURS, PUBLIC_PRICE_MON, TEST_MINT_MODE } from '@/lib/config';

// Extract ABI from artifact
const NFTLaunchpadABI = NFTLaunchpadArtifact.abi;

// Contract address on Monad Mainnet (SPLRGLaunchpad)
const CONTRACT_ADDRESS = '0x4a51E9de2a8A28D0D368FE4192ce37570cc904f7';

// Discord icon component
const DiscordIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

// X (Twitter) icon component
const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

// Admin wallet (only this address can open Admin Panel)
const ADMIN_WALLET = ADMIN_WALLET_ADDRESS;

// Mint phase enum matching contract
enum MintPhase {
  Inactive = 0,
  Whitelist = 1,
  Public = 2,
  Complete = 3
}

interface ContractData {
  mintPrice: string;
  totalSupply: number;
  minted: number;
  maxPerWallet: number;
  currentPhase: MintPhase;
  userMinted: number;
  userRemaining: number;
  canMint: boolean;
}

const Index: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const walletServiceRef = useRef<WalletService | null>(null);
  const [walletState, setWalletState] = useState<WalletState>({
    account: '',
    currentNetwork: '',
    isConnecting: false,
    balance: '',
    isLoadingBalance: false,
    walletType: ''
  });
  const [quantity, setQuantity] = useState(1);
  const [isMinting, setIsMinting] = useState(false);
  const [isLoadingContract, setIsLoadingContract] = useState(true);
  const [spinWheel, setSpinWheel] = useState<{ txHash: string; wallet: string } | null>(null);
  const [mintSuccess, setMintSuccess] = useState<{ tokenId: number; txHash: string } | null>(null);
  const [contractData, setContractData] = useState<ContractData>({
    mintPrice: '2100',
    totalSupply: 650,
    minted: 0,
    maxPerWallet: 3,
    currentPhase: MintPhase.Inactive,
    userMinted: 0,
    userRemaining: 3,
    canMint: false
  });

  // Intro video: transition handled by video onEnded

  // Get provider for read operations. When wallet is connected, use its provider so we read from the same RPC that worked for txs.
  const getReadProvider = useCallback((): BrowserProvider | JsonRpcProvider => {
    if (walletState.account && typeof window !== 'undefined' && (window as any).ethereum) {
      return new BrowserProvider((window as any).ethereum);
    }
    const rpcUrl = getRpcUrlForChainId(walletState.chainId ?? null);
    return new JsonRpcProvider(rpcUrl);
  }, [walletState.account, walletState.chainId]);

  // Get signer for write operations
  const getSigner = useCallback(async () => {
    if (!window.ethereum) throw new Error('No wallet connected');
    const provider = new BrowserProvider(window.ethereum);
    return provider.getSigner();
  }, []);

  // Fetch contract data. Optionally silent (no toast on error) for post-admin refresh.
  // Uses SPLRGLaunchpad view functions (publicPrice, maxSupply, totalSupply, maxPerWallet, publicMintActive).
  const fetchContractData = useCallback(async (opts?: { silent?: boolean }): Promise<boolean> => {
    const runFetch = async (provider: BrowserProvider | JsonRpcProvider) => {
      const contract = new Contract(CONTRACT_ADDRESS, NFTLaunchpadABI, provider);
      const [publicPrice, maxSupply, totalMinted, maxPerWallet, publicActive] = await Promise.all([
        contract.publicPrice(),
        contract.maxSupply(),
        contract.totalSupply(),
        contract.maxPerWallet(),
        contract.publicMintActive()
      ]);
      const supplyCount = Number(maxSupply);
      const mintedCount = Number(totalMinted);
      let phase: MintPhase;
      if (mintedCount >= supplyCount && supplyCount > 0) {
        phase = MintPhase.Complete;
      } else if (publicActive) {
        phase = MintPhase.Public;
      } else {
        phase = MintPhase.Inactive;
      }

      const priceInMonRaw = formatEther(publicPrice);
      const priceInMon = parseFloat(priceInMonRaw).toString(); // strip trailing .0
      setContractData(prev => ({
        ...prev,
        mintPrice: priceInMon,
        totalSupply: supplyCount,
        minted: mintedCount,
        maxPerWallet: Number(maxPerWallet),
        currentPhase: phase
      }));
    };

    setIsLoadingContract(true);
    let lastError: unknown;
    try {
      await runFetch(getReadProvider());
      return true;
    } catch (err) {
      lastError = err;
      const chainId = walletState.chainId ?? CHAIN_IDS.monadMainnet;
      const fallbacks = FALLBACK_RPC_URLS[chainId];
      if (fallbacks?.length) {
        for (const url of fallbacks) {
          try {
            await runFetch(new JsonRpcProvider(url));
            return true;
          } catch {
            continue;
          }
        }
      }
    } finally {
      setIsLoadingContract(false);
    }

    console.error('Error fetching contract data:', lastError);
    if (!opts?.silent) {
      const msg = lastError instanceof Error ? lastError.message : String(lastError);
      const short = msg.length > 80 ? msg.slice(0, 77) + '...' : msg;
      toast({
        title: 'Contract Error',
        description: short || 'Failed to fetch contract data. Connect wallet and ensure you’re on Monad, then refresh.',
        variant: 'destructive'
      });
    }
    return false;
  }, [getReadProvider, walletState.chainId, toast]);

  // Fetch user-specific mint info
  const fetchUserMintInfo = useCallback(async (address: string) => {
    if (!address) return;
    
    try {
      const provider = getReadProvider();
      const contract = new Contract(CONTRACT_ADDRESS, NFTLaunchpadABI, provider);
      const [mintedRaw, maxPerWalletRaw, totalSupplyRaw, maxSupplyRaw, publicActive] = await Promise.all([
        contract.minted(address),
        contract.maxPerWallet(),
        contract.totalSupply(),
        contract.maxSupply(),
        contract.publicMintActive()
      ]);
      const minted = Number(mintedRaw);
      const maxPerWallet = Number(maxPerWalletRaw);
      const totalSupply = Number(totalSupplyRaw);
      const maxSupply = Number(maxSupplyRaw);
      const remaining = Math.max(0, maxPerWallet - minted);
      const canMint = remaining > 0 && publicActive && totalSupply < maxSupply;
      setContractData(prev => ({
        ...prev,
        userMinted: minted,
        userRemaining: remaining,
        canMint: canMint
      }));
    } catch (error) {
      console.error('Error fetching user mint info:', error);
    }
  }, [getReadProvider]);

  // Initialize wallet service
  useEffect(() => {
    const walletService = new WalletService({
      onToast: (title: string, description: string) => {
        toast({ title, description });
      },
    });

    walletService.onStateUpdate(setWalletState);
    walletServiceRef.current = walletService;

    return () => {
      walletService.destroy();
    };
  }, [toast]);

  // Fetch contract data on mount
  useEffect(() => {
    fetchContractData();
  }, [fetchContractData]);

  // When wallet chain is known, refetch so we read from the same chain the wallet is on
  useEffect(() => {
    if (walletState.chainId != null) {
      fetchContractData({ silent: true });
    }
  }, [walletState.chainId, fetchContractData]);

  // Fetch user mint info when wallet connects
  useEffect(() => {
    if (walletState.account) {
      fetchUserMintInfo(walletState.account);
    }
  }, [walletState.account, fetchUserMintInfo]);

  const connectPhantom = () => walletServiceRef.current?.connectPhantom();
  const connectMetaMask = () => walletServiceRef.current?.connectMetaMask();
  const disconnectWallet = () => walletServiceRef.current?.disconnectWallet();
  const switchToMonad = async () => {
    const ok = await walletServiceRef.current?.switchToMonadNetwork();
    if (ok) toast({ title: 'Network switched', description: 'You are now on Monad Mainnet.' });
    else toast({ title: 'Switch failed', description: 'Could not switch to Monad. Add the network in your wallet.', variant: 'destructive' });
  };

  const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  const isAdmin = walletState.account.toLowerCase() === ADMIN_WALLET;
  const isAdminRoute = location.pathname === '/admin';

  // Admin panel: only accessible by ADMIN_WALLET. Redirect others away from /admin
  useEffect(() => {
    if (!isAdminRoute) return;
    if (!walletState.account || !isAdmin) {
      navigate('/', { replace: true });
    }
  }, [isAdminRoute, walletState.account, isAdmin, navigate]);

  // Include preminted 150 in total sold for display
  // On SPLRGLaunchpad, premints are part of totalSupply already, so display minted directly from contract
  const displayMinted = contractData.minted;
  const progress = contractData.totalSupply > 0 
    ? (displayMinted / contractData.totalSupply) * 100 
    : 0;
  const remaining = contractData.totalSupply - contractData.minted;
  const maxMint = remaining;
  const totalPrice = Math.round(parseFloat(contractData.mintPrice) * quantity);

  // Get phase display text
  const getPhaseText = () => {
    switch (contractData.currentPhase) {
      case MintPhase.Inactive:
        return 'Mint Inactive';
      case MintPhase.Public:
        return 'Minting Live';
      case MintPhase.Complete:
        return 'Mint Complete';
      default:
        return 'Loading...';
    }
  };

  const isMintActive = contractData.currentPhase === MintPhase.Public;

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= maxMint) {
      setQuantity(newQuantity);
    }
  };

  const handleMint = async () => {
    prepareAudio().catch(() => {});

    if (!walletState.account) {
      toast({
        title: 'Wallet Required',
        description: 'Please connect your wallet to mint',
        variant: 'destructive'
      });
      return;
    }

    if (!isMintActive) {
      toast({
        title: 'Mint Not Active',
        description: contractData.currentPhase === MintPhase.Whitelist
          ? 'Whitelist minting is not active'
          : 'Minting is not currently active',
        variant: 'destructive'
      });
      return;
    }

    setIsMinting(true);
    try {
      const signer = await getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, NFTLaunchpadABI, signer);
      
      // Use contract's actual publicPrice for value
      const rawPrice = await contract.publicPrice();
      const pricePerNft = typeof rawPrice === 'bigint' ? rawPrice : BigInt(rawPrice.toString());
      const totalCost = pricePerNft * BigInt(quantity);

      // Call publicMint with quantity and send MON
      const tx = await contract.publicMint(quantity, {
        value: totalCost
      });

      toast({
        title: 'Transaction Submitted',
        description: 'Waiting for confirmation...',
      });

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      toast({
        title: 'Mint Successful!',
        description: `You minted ${quantity} SPLRG NFT${quantity > 1 ? 's' : ''}! Tx: ${receipt.hash.slice(0, 10)}...`,
      });

      // Refresh contract data
      await fetchContractData();
      await fetchUserMintInfo(walletState.account);
      setQuantity(1);

      // Parse first minted token ID from NFTMinted event
      let firstTokenId = 0;
      try {
        const iface = new Interface(NFTLaunchpadABI as any);
        const zeroAddress = '0x0000000000000000000000000000000000000000';
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) continue;
          try {
            const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
            if (parsed && parsed.name === 'Transfer') {
              const from = String(parsed.args[0]).toLowerCase();
              const to = String(parsed.args[1]).toLowerCase();
              if (from === zeroAddress && to === walletState.account.toLowerCase()) {
                firstTokenId = Number(parsed.args[2]);
                break;
              }
            }
          } catch {}
        }
      } catch {}

      // Show mall-door animation first, then wheel
      setMintSuccess({ tokenId: firstTokenId, txHash: receipt.hash });

    } catch (error: any) {
      console.error('Mint error:', error);
      
      let errorMessage = 'An error occurred during minting';
      const msg = (error?.message || error?.reason || String(error)).trim();
      
      // Parse common errors
      if (msg.toLowerCase().includes('user rejected') || msg.toLowerCase().includes('denied')) {
        errorMessage = 'Transaction was rejected';
      } else if (msg.toLowerCase().includes('insufficient funds')) {
        errorMessage = 'Insufficient MON balance';
      } else if (msg.includes('ExceedsMaxPerWallet')) {
        errorMessage = 'You have reached the maximum mint per wallet';
      } else if (msg.includes('ExceedsMaxSupply')) {
        errorMessage = 'Not enough supply remaining';
      } else if (msg.includes('PublicPhaseNotActive')) {
        errorMessage = 'Public minting is not active';
      } else if (msg.includes('InsufficientPayment') || msg.includes('Wrong amount')) {
        errorMessage = 'Insufficient payment sent (wrong MON amount)';
      } else if (msg.includes('-32603') || msg.includes('Unexpected error') || msg.includes('could not coalesce')) {
        errorMessage = 'Network/RPC error from the node. Wait a moment and try again, or switch to another Monad RPC in your wallet settings.';
      } else if (msg.length > 0 && msg.length < 120) {
        errorMessage = msg;
      } else if (msg.length >= 120) {
        errorMessage = msg.slice(0, 117) + '...';
      }

      toast({
        title: 'Mint Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsMinting(false);
    }
  };

  const handleRefresh = async () => {
    await fetchContractData();
    if (walletState.account) {
      await fetchUserMintInfo(walletState.account);
    }
    toast({
      title: 'Refreshed',
      description: 'Contract data updated',
    });
  };

  // Admin: set contract price and start public phase (for test mint)
  const handleAdminSetPublicPrice = async (priceMon: string) => {
    try {
      const signer = await getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, NFTLaunchpadABI, signer);
      const tx = await contract.setPublicPrice(parseEther(priceMon));
      await tx.wait();
      toast({ title: 'Success', description: `Public price set to ${priceMon} MON` });
      // Refresh without showing "Contract Error" if RPC is slow; delay slightly so chain state is visible
      await new Promise(r => setTimeout(r, 1500));
      const ok = await fetchContractData({ silent: true });
      if (!ok) toast({ title: 'Price set', description: 'If the page didn\'t update, refresh.' });
    } catch (e: any) {
      toast({ title: 'Failed', description: e?.message || 'Transaction failed', variant: 'destructive' });
    }
  };

  const handleAdminStartPublicPhase = async () => {
    try {
      const signer = await getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, NFTLaunchpadABI, signer);
      const tx = await contract.startPublicPhase();
      await tx.wait();
      toast({ title: 'Success', description: 'Public mint phase started' });
      await new Promise(r => setTimeout(r, 1500));
      const ok = await fetchContractData({ silent: true });
      if (!ok) toast({ title: 'Phase started', description: 'If the page didn\'t update, refresh.' });
    } catch (e: any) {
      toast({ title: 'Failed', description: e?.message || 'Transaction failed', variant: 'destructive' });
    }
  };

  if (isAdminRoute && isAdmin) {
    return (
      <AdminPanel
        onBack={() => navigate('/')}
        walletState={walletState}
        onDisconnect={() => { disconnectWallet(); navigate('/'); }}
        onSetPublicPrice={handleAdminSetPublicPrice}
        onStartPublicPhase={handleAdminStartPublicPhase}
      />
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: `url(${splrgBg})`,
          opacity: 0.6
        }}
      />
      
      {/* Dark overlay */}
      <div className="absolute inset-0 z-[1] bg-background/70" />

      {/* Falling Monad logos (above overlay, below content) */}
      <FallingLogos />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="w-full py-4 px-4 md:px-8">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img 
                src={splrgLogo} 
                alt="SPLRG" 
                className="h-10 w-10 rounded-xl object-cover shadow-glow"
              />
              <span className="font-heading text-xl font-bold text-foreground">SPLRG</span>
            </div>

            {/* Wallet & Admin */}
            <div className="flex items-center gap-3">
              {isAdmin && (
                <Button
                  onClick={() => navigate('/admin')}
                  variant="ghost"
                  size="icon"
                  className="text-primary hover:bg-primary/20"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              )}

              {walletState.account ? (
                <div className="flex items-center gap-3">
                  {walletState.currentNetwork !== 'Monad Mainnet' && (
                    <Button
                      onClick={switchToMonad}
                      variant="outline"
                      size="sm"
                      className="border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
                    >
                      Switch to Monad
                    </Button>
                  )}
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg glass">
                    <div className={`h-2 w-2 rounded-full ${walletState.currentNetwork === 'Monad Mainnet' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
                    <span className="text-sm font-medium text-foreground">{formatAddress(walletState.account)}</span>
                    {walletState.walletType && (
                      <span className="text-xs text-muted-foreground capitalize">({walletState.walletType})</span>
                    )}
                  </div>
                  <Button
                    onClick={disconnectWallet}
                    variant="outline"
                    size="sm"
                    className="border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    Disconnect
                  </Button>
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      disabled={walletState.isConnecting}
                      className="btn-primary px-4 py-2 rounded-lg font-semibold"
                    >
                      <Wallet className="mr-2 h-4 w-4" />
                      {walletState.isConnecting ? 'Connecting...' : 'Connect'}
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={connectPhantom} className="cursor-pointer">
                      <img src="/wallets/phantom.png" alt="Phantom" className="w-5 h-5 mr-2 rounded object-contain" />
                      Phantom
                      <span className="ml-auto text-xs text-muted-foreground">Recommended</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={connectMetaMask} className="cursor-pointer">
                      <img src="/wallets/metamask.png" alt="MetaMask" className="w-5 h-5 mr-2 object-contain" />
                      MetaMask
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-4 py-8 md:py-12">
          <div className="w-full max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center lg:items-stretch">
              {/* Left - Info */}
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass mb-4">
                  <div className={`h-2 w-2 rounded-full ${isMintActive ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                  <span className="text-sm font-medium text-foreground">{getPhaseText()}</span>
                </div>

                <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4">
                  <span className="text-gradient">SPLRG</span>
                </h1>

                <div className="text-muted-foreground text-base md:text-lg mb-6 max-w-md mx-auto lg:mx-0 space-y-2">
                  <p>The genesis RWA NFT collection on Monad.</p>
                  <p>Where Web2 meets Web3 in an unique way;</p>
                  <p className="font-semibold text-foreground">Multiple utilities:</p>
                  <ul className="space-y-1 pl-4 border-l-2 border-primary/40">
                    <li>RWA marketplace,</li>
                    <li>Task2Earn platform,</li>
                    <li>Staking for $SPLRG,</li>
                    <li>Premium RWA raffles for holders.</li>
                  </ul>
                  <p>Be part of a new movement on the Monad ecosystem and start splurging.</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="glass rounded-xl p-4 text-center relative">
                    <div className="font-heading text-2xl font-bold text-foreground">
                      {isLoadingContract ? '...' : contractData.mintPrice}
                    </div>
                    <div className="text-xs text-muted-foreground">MON</div>
                    {TEST_MINT_MODE && (
                      <span className="absolute -top-1 -right-1 rounded bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-medium text-black">Test</span>
                    )}
                  </div>
                  <div className="glass rounded-xl p-4 text-center">
                    <div className="font-heading text-2xl font-bold text-foreground">
                      {isLoadingContract ? '...' : contractData.minted.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Minted</div>
                  </div>
                  <div className="glass rounded-xl p-4 text-center">
                    <div className="font-heading text-2xl font-bold text-foreground">
                      {isLoadingContract ? '...' : contractData.totalSupply.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Supply</div>
                  </div>
                </div>

                {/* Wheel teaser */}
                <div className="mb-6 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-center lg:text-left">
                  <p className="text-foreground">
                    <span className="text-accent font-heading text-base font-bold uppercase tracking-wide">1 mint = 1 wheel spin</span>
                    <span className="text-muted-foreground">, </span>
                    <span className="text-sm font-medium text-foreground">500$ in prizes (NFTs, $MON, $SPLRG)</span>
                  </p>
                </div>

                {/* Social Links */}
                <div className="flex items-center justify-center lg:justify-start gap-3">
                  <a 
                    href="https://x.com/splrg_rwa" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-lg glass hover:bg-primary/20 transition-colors"
                  >
                    <XIcon className="h-5 w-5 text-foreground" />
                  </a>
                  <a 
                    href="https://discord.com/invite/splrgrwa" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-lg glass hover:bg-primary/20 transition-colors"
                  >
                    <DiscordIcon className="h-5 w-5 text-foreground" />
                  </a>
                  <a 
                    href="https://splrg.io/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-lg glass hover:bg-primary/20 transition-colors"
                  >
                    <Globe className="h-5 w-5 text-foreground" />
                  </a>
                </div>
              </div>

              {/* Right - Mint Panel */}
              <div className="glass-strong rounded-2xl p-6 md:p-8 shadow-glow min-w-0 lg:min-w-[420px]">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-heading text-xl font-bold text-foreground">Mint SPLRG</h2>
                  <Button
                    onClick={handleRefresh}
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-primary"
                    disabled={isLoadingContract}
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingContract ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                {/* Total progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground font-medium">Total</span>
                    <span className="font-medium text-foreground">
                      {isLoadingContract ? '...' : `${progress.toFixed(1)}% Sold`}
                    </span>
                  </div>
                  <div className="progress-bar h-2.5 mb-1">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground text-right">
                    {isLoadingContract ? '...' : `${displayMinted}/${contractData.totalSupply}`}
                  </p>
                </div>

                {/* Phase rows */}
                <div className="space-y-0 border border-border rounded-xl overflow-hidden mb-6">
                  {/* Phase 1: SPLRG key (preminted 150) */}
                  <div className="flex items-center justify-between gap-4 px-4 py-3 bg-muted/20 border-b border-border">
                    <span className="font-medium text-foreground">SPLRG key</span>
                    <span className="text-xs text-muted-foreground">—</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{PREMINTED_SUPPLY}/{PREMINTED_SUPPLY}</span>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs text-green-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      Complete
                    </span>
                  </div>
                  {/* Phase 2: Whitelist — informational only for SPLRGLaunchpad */}
                  <div className="flex items-center justify-between gap-4 px-4 py-3 bg-muted/20 border-b border-border">
                    <span className="font-medium text-foreground">Whitelist</span>
                    <span className="text-sm font-medium text-foreground">{WHITELIST_PRICE_MON} $MON</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {WHITELIST_DURATION_HOURS}h
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">—</span>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                      Coming soon
                    </span>
                  </div>
                  {/* Phase 3: Public — uses on-chain SPLRGLaunchpad publicPrice */}
                  <div className="flex items-center justify-between gap-4 px-4 py-3 bg-muted/20">
                    <span className="font-medium text-foreground">Public</span>
                    <span className="text-sm font-medium text-foreground">{PUBLIC_PRICE_MON} $MON</span>
                    <span className="text-xs text-muted-foreground">—</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {isLoadingContract ? '...' : `${Math.max(0, contractData.minted - PREMINTED_SUPPLY)}/${Math.max(0, contractData.totalSupply - PREMINTED_SUPPLY)}`}
                      </span>
                    </div>
                    <span className={`flex items-center gap-1.5 text-xs ${contractData.currentPhase === MintPhase.Public ? 'text-green-500' : contractData.currentPhase === MintPhase.Complete ? 'text-green-500' : contractData.currentPhase < MintPhase.Public ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${contractData.currentPhase === MintPhase.Public ? 'bg-green-500 animate-pulse' : contractData.currentPhase === MintPhase.Complete ? 'bg-green-500' : contractData.currentPhase < MintPhase.Public ? 'bg-yellow-500' : 'bg-muted-foreground'}`} />
                      {contractData.currentPhase === MintPhase.Public ? 'Active' : contractData.currentPhase === MintPhase.Complete ? 'Ended' : 'Upcoming'}
                    </span>
                  </div>
                </div>

                {/* User Mint Info */}
                {walletState.account && (
                  <div className="mb-4 p-3 rounded-lg bg-muted/20 border border-border">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Your mints:</span>
                      <span className="font-medium text-foreground">{contractData.userMinted}</span>
                    </div>
                  </div>
                )}

                {/* Quantity Selector */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border mb-4">
                  <span className="text-sm font-medium text-muted-foreground">Quantity</span>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-lg border-border"
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1 || isMinting}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-heading font-bold text-xl text-foreground">{quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-lg border-border"
                      onClick={() => handleQuantityChange(1)}
                      disabled={quantity >= maxMint || isMinting || maxMint <= 0}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Price Summary */}
                <div className="p-4 rounded-xl bg-accent/10 border border-accent/30 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Price</span>
                    <span className="font-heading font-bold text-2xl text-foreground">{totalPrice} $MON</span>
                  </div>
                </div>

                {/* Mint Button */}
                {!walletState.account ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        disabled={walletState.isConnecting}
                        className="w-full btn-primary h-14 text-lg font-semibold rounded-xl"
                      >
                        <Wallet className="mr-2 h-5 w-5" />
                        Connect Wallet to Mint
                        <ChevronDown className="ml-2 h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-64">
                      <DropdownMenuItem onClick={connectPhantom} className="cursor-pointer py-3">
                        <img src="/wallets/phantom.png" alt="Phantom" className="w-6 h-6 mr-3 rounded object-contain" />
                        <span className="font-medium">Phantom</span>
                        <span className="ml-auto text-xs text-primary">Recommended</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={connectMetaMask} className="cursor-pointer py-3">
                        <img src="/wallets/metamask.png" alt="MetaMask" className="w-6 h-6 mr-3 object-contain" />
                        <span className="font-medium">MetaMask</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : !isMintActive ? (
                  <Button
                    disabled
                    className="w-full h-14 text-lg font-semibold rounded-xl bg-muted text-muted-foreground"
                  >
                    {contractData.currentPhase === MintPhase.Complete ? 'Mint Complete' : 'Mint Not Active'}
                  </Button>
                ) : (
                  <Button
                    onClick={handleMint}
                    disabled={isMinting}
                    className="w-full btn-gold h-14 text-lg font-semibold rounded-xl animate-pulse-glow"
                  >
                    {isMinting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Minting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        Mint {quantity} NFT{quantity > 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                )}

                {/* No per-wallet mint cap text anymore */}
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-6 px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Built on <span className="text-primary font-medium">Monad</span>
          </p>
        </footer>

        {/* Mint success: mall doors animation → NFT reveal → then wheel */}
        {mintSuccess && (
          <MintSuccessAnimation
            tokenId={mintSuccess.tokenId}
            txHash={mintSuccess.txHash}
            onComplete={() => {
              setSpinWheel({ txHash: mintSuccess.txHash, wallet: walletState.account });
              setMintSuccess(null);
            }}
          />
        )}

        {/* Spin the wheel modal (one spin per mint) */}
        {spinWheel && (
          <SpinWheelModal
            open={!!spinWheel}
            onOpenChange={(o) => !o && setSpinWheel(null)}
            walletAddress={spinWheel.wallet}
            mintTxHash={spinWheel.txHash}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
