import { BrowserProvider } from 'ethers';
import { getNetworkConfig} from '@/lib/config';
import { getMonadBalance } from '@/lib/tokenService';

const getCurrentNetworkConfig = () => {
    const config = getNetworkConfig();
    return {
        chainId: `0x${config.chainId.toString(16)}`,
        chainName: config.name,
        ticker: config.ticker,
    };
};

export interface WalletState {
    account: string;
    currentNetwork: string;
    chainId: number | null;
    isConnecting: boolean;
    balance: string;
    isLoadingBalance: boolean;
    walletType: 'phantom' | 'metamask' | '';
}

export interface WalletCallbacks {
    onWalletChange?: (address: string) => void;
    onToast?: (title: string, description: string) => void;
}

// Check if Phantom wallet is available
const getPhantomProvider = () => {
    if ('phantom' in window) {
        const provider = (window as any).phantom?.ethereum;
        if (provider?.isPhantom) {
            return provider;
        }
    }
    return null;
};

// Check if MetaMask is available
const getMetaMaskProvider = () => {
    if (window.ethereum?.isMetaMask) {
        return window.ethereum;
    }
    return null;
};

export class WalletService {
    private state: WalletState = {
        account: '',
        currentNetwork: '',
        chainId: null,
        isConnecting: false,
        balance: '',
        isLoadingBalance: false,
        walletType: ''
    };
    private callbacks: WalletCallbacks = {};
    private stateUpdateCallback?: (state: WalletState) => void;
    private currentProvider: any = null;

    constructor(callbacks?: WalletCallbacks) {
        this.callbacks = callbacks || {};
        // Do not automatically initialize or touch wallets on page load.
        // Connection only happens when user clicks the Connect button.
    }

    private updateState(updates: Partial<WalletState>) {
        this.state = { ...this.state, ...updates };
        this.stateUpdateCallback?.(this.state);
    }

    onStateUpdate(callback: (state: WalletState) => void) {
        this.stateUpdateCallback = callback;
        callback(this.state);
    }

    async fetchBalance(address: string) {
        if (!address) return;
        
        this.updateState({ isLoadingBalance: true });
        try {
            const currentConfig = getCurrentNetworkConfig();
            const balance = await getMonadBalance(address, parseInt(currentConfig.chainId, 16));

            this.updateState({ 
                balance: parseFloat(balance).toFixed(4),
                isLoadingBalance: false
            });
        } catch (error) {
            this.updateState({ balance: '0.0000', isLoadingBalance: false });
        }
    }

    async checkNetwork() {
        if (!this.currentProvider) return;
        
        try {
            const chainIdHex = await this.currentProvider.request({ method: 'eth_chainId' });
            const chainIdNum = parseInt(chainIdHex, 16);
            const currentConfig = getCurrentNetworkConfig();
            const isCurrentNetwork = chainIdHex.toLowerCase() === currentConfig.chainId.toLowerCase();
            
            if (isCurrentNetwork) {
                this.updateState({ currentNetwork: currentConfig.chainName, chainId: chainIdNum });
            } else {
                this.updateState({ currentNetwork: 'Other Network', chainId: chainIdNum });
            }
        } catch (error) {
            this.updateState({ currentNetwork: 'Unknown', chainId: null });
        }
    }

    private showToast(title: string, description: string) {
        this.callbacks.onToast?.(title, description);
    }

    // Connect with Phantom (primary)
    async connectPhantom() {
        const phantomProvider = getPhantomProvider();
        if (!phantomProvider) {
            window.open('https://phantom.app/', '_blank');
            this.showToast("Phantom Not Found", "Please install Phantom wallet");
            return;
        }

        this.currentProvider = phantomProvider;
        await this.connectWithProvider('phantom');
    }

    // Connect with MetaMask (secondary)
    async connectMetaMask() {
        const metaMaskProvider = getMetaMaskProvider();
        if (!metaMaskProvider) {
            window.open('https://metamask.io/download/', '_blank');
            this.showToast("MetaMask Not Found", "Please install MetaMask wallet");
            return;
        }

        this.currentProvider = metaMaskProvider;
        await this.connectWithProvider('metamask');
    }

    private async connectWithProvider(walletType: 'phantom' | 'metamask') {
        if (!this.currentProvider) return;

        this.updateState({ isConnecting: true });
        try {
            await this.checkNetwork();
            await this.currentProvider.request({ method: 'eth_requestAccounts' });
            
            const provider = new BrowserProvider(this.currentProvider);
            const signer = await provider.getSigner();
            const address = await signer.getAddress();
            
            this.updateState({ account: address, walletType });
            this.callbacks.onWalletChange?.(address);

            // Automatically switch to Monad after connect so user doesn't need to click "Switch to Monad"
            await this.switchToMonadNetwork();

            await this.fetchBalance(address);

            localStorage.setItem('preferred_wallet', walletType);
            localStorage.removeItem('wallet_disconnect_requested');
            this.showToast("Success", `${walletType === 'phantom' ? 'Phantom' : 'MetaMask'} connected!`);
            
        } catch (error: any) {
            this.showToast("Error", error.message || "Failed to connect wallet");
        } finally {
            this.updateState({ isConnecting: false });
        }
    }

    // Legacy connect method - tries Phantom first, then MetaMask
    async connectWallet() {
        const phantomProvider = getPhantomProvider();
        if (phantomProvider) {
            await this.connectPhantom();
            return;
        }

        const metaMaskProvider = getMetaMaskProvider();
        if (metaMaskProvider) {
            await this.connectMetaMask();
            return;
        }

        this.showToast("No Wallet Found", "Please install Phantom or MetaMask");
    }

    async switchToMonadNetwork(): Promise<boolean> {
        const provider = this.currentProvider ?? getPhantomProvider() ?? getMetaMaskProvider();
        if (!provider) return false;
        const config = getNetworkConfig();
        const chainIdHex = `0x${config.chainId.toString(16)}`;
        try {
            try {
                await provider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: chainIdHex }],
                });
            } catch (switchErr: any) {
                if (switchErr?.code === 4902 || switchErr?.message?.includes('Unrecognized chain')) {
                    await provider.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: chainIdHex,
                            chainName: config.name,
                            nativeCurrency: { name: config.ticker, symbol: config.ticker, decimals: 18 },
                            rpcUrls: [config.rpcUrl],
                            blockExplorerUrls: [config.explorerUrl],
                        }],
                    });
                } else throw switchErr;
            }
            await this.checkNetwork();
            return true;
        } catch (error) {
            return false;
        }
    }

    async disconnectWallet() {
        try {
            if (this.currentProvider) {
                await this.currentProvider.request({
                    method: 'wallet_revokePermissions',
                    params: [{ eth_accounts: {} }],
                });
            }
        } catch (error) {
            console.log('Failed to revoke permissions:', error);
        }
        
        localStorage.setItem('wallet_disconnect_requested', 'true');
        localStorage.removeItem('preferred_wallet');
        this.updateState({
            account: '',
            currentNetwork: '',
            chainId: null,
            balance: '',
            walletType: ''
        });
        this.currentProvider = null;
        this.callbacks.onWalletChange?.('');
        
        this.showToast("Success", "Wallet disconnected successfully!");
    }

    formatAddress(address: string): string {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    private async initialize() {
        const handleAccountsChanged = (accounts: string[]) => {
            const addr = accounts[0] || '';
            this.updateState({ account: addr });
            this.callbacks.onWalletChange?.(addr);
            
            if (addr) {
                this.fetchBalance(addr);
            } else {
                this.updateState({ currentNetwork: '', chainId: null, balance: '', walletType: '' });
            }
        };

        // Set up listeners for both providers (no auto-connect; user clicks Connect explicitly)
        const phantomProvider = getPhantomProvider();
        const metaMaskProvider = getMetaMaskProvider();

        if (phantomProvider) {
            phantomProvider.on('accountsChanged', handleAccountsChanged);
            phantomProvider.on('chainChanged', () => this.checkNetwork());
        }

        if (metaMaskProvider) {
            metaMaskProvider.on('accountsChanged', handleAccountsChanged);
            metaMaskProvider.on('chainChanged', () => this.checkNetwork());
        }
    }

    destroy() {
        const phantomProvider = getPhantomProvider();
        const metaMaskProvider = getMetaMaskProvider();

        if (phantomProvider) {
            phantomProvider.removeAllListeners?.('accountsChanged');
            phantomProvider.removeAllListeners?.('chainChanged');
        }

        if (metaMaskProvider) {
            metaMaskProvider.removeAllListeners?.('accountsChanged');
            metaMaskProvider.removeAllListeners?.('chainChanged');
        }
    }
}
