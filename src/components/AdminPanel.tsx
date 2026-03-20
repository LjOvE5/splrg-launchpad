import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Users, Image, Coins, Clock, Settings, ExternalLink, Edit2, RefreshCw, Gift, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import type { WalletState } from '@/lib/walletService';
import { getSpinResults, isSupabaseConfigured, type SpinResult } from '@/lib/supabase';
import splrgBg from '@/assets/splrg-bg.png';
import splrgLogo from '@/assets/splrg-logo.jpg';
import { SpinWheelModal } from '@/components/SpinWheelModal';

interface AdminPanelProps {
  onBack: () => void;
  walletState: WalletState;
  onDisconnect: () => void;
  onSetPublicPrice?: (priceMon: string) => Promise<void>;
  onStartPublicPhase?: () => Promise<void>;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onBack, walletState, onDisconnect, onSetPublicPrice, onStartPublicPhase }) => {
  const { toast } = useToast();
  const [wheelPreviewOpen, setWheelPreviewOpen] = useState(false);
  const [wheelTestOpen, setWheelTestOpen] = useState(false);
  
  // Collection settings state
  const [collectionSettings, setCollectionSettings] = useState({
    name: 'SPLRG',
    description: 'The genesis RWA NFT collection on Monad. Where web2 meets web3 in a unique way; Multiple utilities: RWA marketplace, Task2Earn platform, Staking for $SPLRG, Premium RWA raffles for holders. Be part of a new movement on the Monad ecosystem and start splurging.',
    mintPrice: '0.5',
    totalSupply: '5000',
    maxPerWallet: '5',
    contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
    website: 'https://splrg.io/',
    twitter: 'https://x.com/splrg_rwa',
    discord: 'https://discord.com/invite/splrgrwa',
  });

  // Mint settings state
  const [mintSettings, setMintSettings] = useState({
    isMintingEnabled: true,
    isWhitelistEnabled: false,
    whitelistPrice: '0.4',
    publicStartTime: '',
    whitelistStartTime: '',
  });

  const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  const handleSaveCollection = () => {
    toast({
      title: 'Settings Saved',
      description: 'Collection settings have been updated.',
    });
  };

  const handleSaveMint = () => {
    toast({
      title: 'Mint Settings Saved',
      description: 'Mint configuration has been updated.',
    });
  };

  // Mock stats
  const stats = {
    totalMinted: 1247,
    totalRevenue: '623.5',
    uniqueHolders: 892,
    averagePerWallet: 1.4,
  };

  // Wheel / spin results
  const [spinResults, setSpinResults] = useState<SpinResult[]>([]);
  const [spinResultsLoading, setSpinResultsLoading] = useState(false);
  const loadSpinResults = async () => {
    setSpinResultsLoading(true);
    const data = await getSpinResults();
    setSpinResults(data);
    setSpinResultsLoading(false);
  };
  useEffect(() => {
    loadSpinResults();
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${splrgBg})`, opacity: 0.6 }}
      />
      <div className="absolute inset-0 bg-background/80" />

      {/* Content */}
      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <header className="w-full py-4 px-4 md:px-8 border-b border-border/50">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={onBack}
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <img src={splrgLogo} alt="SPLRG" className="h-10 w-10 rounded-xl object-cover" />
                <div>
                  <span className="font-heading text-xl font-bold text-foreground">SPLRG</span>
                  <span className="ml-2 text-sm text-primary">Admin Panel</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg glass">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-foreground">{formatAddress(walletState.account)}</span>
              </div>
              <Button
                onClick={onDisconnect}
                variant="outline"
                size="sm"
                className="border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
              >
                Disconnect
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-4 md:px-8 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Image className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Total Minted</span>
              </div>
              <div className="font-heading text-2xl font-bold text-foreground">{stats.totalMinted.toLocaleString()}</div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="h-4 w-4 text-accent" />
                <span className="text-xs text-muted-foreground">Revenue (MON)</span>
              </div>
              <div className="font-heading text-2xl font-bold text-foreground">{stats.totalRevenue}</div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-secondary" />
                <span className="text-xs text-muted-foreground">Unique Holders</span>
              </div>
              <div className="font-heading text-2xl font-bold text-foreground">{stats.uniqueHolders}</div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Avg per Wallet</span>
              </div>
              <div className="font-heading text-2xl font-bold text-foreground">{stats.averagePerWallet}</div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="collection" className="w-full">
            <TabsList className="glass border border-border mb-6">
              <TabsTrigger value="collection" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Settings className="h-4 w-4 mr-2" />
                Collection
              </TabsTrigger>
              <TabsTrigger value="mint" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Clock className="h-4 w-4 mr-2" />
                Mint Settings
              </TabsTrigger>
              <TabsTrigger value="wheel" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Gift className="h-4 w-4 mr-2" />
                Wheel Results
              </TabsTrigger>
              <TabsTrigger value="testmint" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <PlayCircle className="h-4 w-4 mr-2" />
                Test mint
              </TabsTrigger>
            </TabsList>

            {/* Collection Settings Tab */}
            <TabsContent value="collection">
              <div className="glass-strong rounded-2xl p-6 md:p-8">
                <h3 className="font-heading text-lg font-bold text-foreground mb-6">Collection Settings</h3>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Collection Name</Label>
                      <Input
                        id="name"
                        value={collectionSettings.name}
                        onChange={(e) => setCollectionSettings({ ...collectionSettings, name: e.target.value })}
                        className="bg-muted/30 border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contractAddress">Contract Address</Label>
                      <div className="flex gap-2">
                        <Input
                          id="contractAddress"
                          value={collectionSettings.contractAddress}
                          onChange={(e) => setCollectionSettings({ ...collectionSettings, contractAddress: e.target.value })}
                          className="bg-muted/30 border-border font-mono text-sm"
                        />
                        <Button variant="outline" size="icon" className="shrink-0">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={collectionSettings.description}
                      onChange={(e) => setCollectionSettings({ ...collectionSettings, description: e.target.value })}
                      className="bg-muted/30 border-border min-h-[100px]"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="mintPrice">Mint Price (MON)</Label>
                      <Input
                        id="mintPrice"
                        type="number"
                        step="0.01"
                        value={collectionSettings.mintPrice}
                        onChange={(e) => setCollectionSettings({ ...collectionSettings, mintPrice: e.target.value })}
                        className="bg-muted/30 border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="totalSupply">Total Supply</Label>
                      <Input
                        id="totalSupply"
                        type="number"
                        value={collectionSettings.totalSupply}
                        onChange={(e) => setCollectionSettings({ ...collectionSettings, totalSupply: e.target.value })}
                        className="bg-muted/30 border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxPerWallet">Max per Wallet</Label>
                      <Input
                        id="maxPerWallet"
                        type="number"
                        value={collectionSettings.maxPerWallet}
                        onChange={(e) => setCollectionSettings({ ...collectionSettings, maxPerWallet: e.target.value })}
                        className="bg-muted/30 border-border"
                      />
                    </div>
                  </div>

                  <div className="border-t border-border pt-6">
                    <h4 className="font-heading font-semibold text-foreground mb-4">Social Links</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          value={collectionSettings.website}
                          onChange={(e) => setCollectionSettings({ ...collectionSettings, website: e.target.value })}
                          className="bg-muted/30 border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="twitter">X (Twitter)</Label>
                        <Input
                          id="twitter"
                          value={collectionSettings.twitter}
                          onChange={(e) => setCollectionSettings({ ...collectionSettings, twitter: e.target.value })}
                          className="bg-muted/30 border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="discord">Discord</Label>
                        <Input
                          id="discord"
                          value={collectionSettings.discord}
                          onChange={(e) => setCollectionSettings({ ...collectionSettings, discord: e.target.value })}
                          className="bg-muted/30 border-border"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSaveCollection} className="btn-primary">
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Mint Settings Tab */}
            <TabsContent value="mint">
              <div className="glass-strong rounded-2xl p-6 md:p-8">
                <h3 className="font-heading text-lg font-bold text-foreground mb-6">Mint Configuration</h3>
                
                <div className="space-y-6">
                  {/* Minting Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
                    <div>
                      <Label className="font-medium">Enable Minting</Label>
                      <p className="text-sm text-muted-foreground">Allow users to mint NFTs</p>
                    </div>
                    <Switch
                      checked={mintSettings.isMintingEnabled}
                      onCheckedChange={(checked) => setMintSettings({ ...mintSettings, isMintingEnabled: checked })}
                    />
                  </div>

                  {/* Whitelist Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
                    <div>
                      <Label className="font-medium">Whitelist Phase</Label>
                      <p className="text-sm text-muted-foreground">Enable whitelist-only minting</p>
                    </div>
                    <Switch
                      checked={mintSettings.isWhitelistEnabled}
                      onCheckedChange={(checked) => setMintSettings({ ...mintSettings, isWhitelistEnabled: checked })}
                    />
                  </div>

                  {mintSettings.isWhitelistEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                      <div className="space-y-2">
                        <Label htmlFor="whitelistPrice">Whitelist Price (MON)</Label>
                        <Input
                          id="whitelistPrice"
                          type="number"
                          step="0.01"
                          value={mintSettings.whitelistPrice}
                          onChange={(e) => setMintSettings({ ...mintSettings, whitelistPrice: e.target.value })}
                          className="bg-muted/30 border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="whitelistStartTime">Whitelist Start Time</Label>
                        <Input
                          id="whitelistStartTime"
                          type="datetime-local"
                          value={mintSettings.whitelistStartTime}
                          onChange={(e) => setMintSettings({ ...mintSettings, whitelistStartTime: e.target.value })}
                          className="bg-muted/30 border-border"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="publicStartTime">Public Mint Start Time</Label>
                    <Input
                      id="publicStartTime"
                      type="datetime-local"
                      value={mintSettings.publicStartTime}
                      onChange={(e) => setMintSettings({ ...mintSettings, publicStartTime: e.target.value })}
                      className="bg-muted/30 border-border"
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSaveMint} className="btn-primary">
                      <Save className="h-4 w-4 mr-2" />
                      Save Mint Settings
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Wheel Results Tab */}
            <TabsContent value="wheel">
              <div className="glass-strong rounded-2xl p-6 md:p-8">
                <h3 className="font-heading text-lg font-bold text-foreground mb-2">Spin wheel results</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Who won what after minting. Requires Supabase (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) and a <code className="text-xs bg-muted/50 px-1 rounded">spin_results</code> table.
                </p>
                {!isSupabaseConfigured() && (
                  <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 mb-6 text-sm text-amber-200">
                    Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env and create the spin_results table to track wheel wins.
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={loadSpinResults} disabled={spinResultsLoading} className="mb-4">
                  <RefreshCw className={`h-4 w-4 mr-2 ${spinResultsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <div className="mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWheelPreviewOpen(true)}
                    disabled={spinResultsLoading}
                    className="w-full"
                  >
                    Preview wheel UI (no mint, no Supabase write)
                  </Button>
                </div>
                <div className="mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWheelTestOpen(true)}
                    disabled={spinResultsLoading}
                    className="w-full"
                  >
                    Test spin (records to Supabase)
                  </Button>
                </div>
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left p-3 font-medium text-foreground">Wallet</th>
                        <th className="text-left p-3 font-medium text-foreground">Prize</th>
                        <th className="text-left p-3 font-medium text-foreground">Mint Tx</th>
                        <th className="text-left p-3 font-medium text-foreground">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {spinResults.length === 0 && !spinResultsLoading && (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-muted-foreground">
                            No spin results yet.
                          </td>
                        </tr>
                      )}
                      {spinResults.map((row) => (
                        <tr key={row.id || row.wallet_address + row.created_at} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="p-3 font-mono text-xs text-foreground">{formatAddress(row.wallet_address)}</td>
                          <td className="p-3 text-foreground">{row.prize}</td>
                          <td className="p-3">
                            {row.mint_tx_hash ? (
                              <a
                                href={`https://monadvision.com/tx/${row.mint_tx_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline font-mono text-xs"
                              >
                                {row.mint_tx_hash.slice(0, 10)}…
                              </a>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-3 text-muted-foreground text-xs">
                            {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="testmint">
              <div className="glass-strong rounded-2xl p-6 md:p-8">
                <h3 className="font-heading text-lg font-bold text-foreground mb-2">Activate test mint</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Set the contract public price to 0.01 MON and start the public phase so you can test the mint flow. Only the contract owner can call these.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => onSetPublicPrice?.('0.01')}
                    disabled={!onSetPublicPrice}
                    variant="default"
                  >
                    Set price to 0.01 MON
                  </Button>
                  <Button
                    onClick={() => onStartPublicPhase?.()}
                    disabled={!onStartPublicPhase}
                    variant="default"
                  >
                    Start public phase
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      <SpinWheelModal
        open={wheelPreviewOpen}
        onOpenChange={(o) => setWheelPreviewOpen(o)}
        walletAddress={walletState.account || '0x0000000000000000000000000000000000000000'}
        mintTxHash={'preview'}
        preview
      />

      <SpinWheelModal
        open={wheelTestOpen}
        onOpenChange={(o) => setWheelTestOpen(o)}
        walletAddress={walletState.account || '0x0000000000000000000000000000000000000000'}
        mintTxHash={'wheel_test'}
      />
    </div>
  );
};

export default AdminPanel;
