import { useState, useEffect, useRef } from 'react';
import { UGFProvider, useUGFModal } from '@tychilabs/react-ugf';
import { 
  Wallet, Compass, Cpu, Coins, Heart, CheckCircle, 
  ExternalLink, RefreshCw, Send, Image, PlusCircle, 
  AlertCircle, Info, ChevronRight, Loader2
} from 'lucide-react';
import { useWallet, parseWalletError } from './hooks/useWallet';
import { ethers } from 'ethers';
import SpaceNFTJson from './constants/SpaceNFT.json';

// Default pre-deployed NFT contract address on Base Sepolia for demo
const DEFAULT_NFT_CONTRACT = '0x82039e7C37D7aAc98D0F4d0A762F4E0d8c8DC273';

// Preset Space Artwork for NFT minter
const PRESETS = [
  {
    id: 'cosmic-sentinel',
    name: 'Cosmic Sentinel',
    description: 'A legendary protector of the outer orbit, guarding the gateway to deep space.',
    image: '/cosmic_sentinel.png',
  },
  {
    id: 'lunar-outpost',
    name: 'Lunar Outpost',
    description: 'A futuristic base outpost on the moon surface, earth visible in the background.',
    image: '/lunar_outpost.png',
  },
  {
    id: 'nebula-core',
    name: 'Nebula Core',
    description: 'Deep space nebula core with colorful gases surrounding a cosmic black hole.',
    image: '/nebula_core.png',
  },
  {
    id: 'stellar-engine',
    name: 'Stellar Engine',
    description: 'A megastructure orbiting a glowing star to capture unlimited solar power.',
    image: '/stellar_engine.png',
  }
];

function MainAppContent() {
  const {
    account,
    chainId,
    ethBalance,
    mockUsdBalance,
    isConnected,
    isConnecting,
    error,
    clearError,
    connect,
    switchNetwork,
    refreshBalances,
    signer
  } = useWallet();

  const { openUGF, result: ugfResult } = useUGFModal();

  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'nft-minter' | 'token-sender' | 'donations' | 'playground'>('dashboard');

  // NFT Minter Form State
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0]);
  const [nftName, setNftName] = useState(PRESETS[0].name);
  const [nftDesc, setNftDesc] = useState(PRESETS[0].description);
  const [nftContract, setNftContract] = useState(DEFAULT_NFT_CONTRACT);
  const [nftRecipient, setNftRecipient] = useState('');
  const [isMinting, setIsMinting] = useState(false);
  const [mintStatus, setMintStatus] = useState('');
  const [mintTxHash, setMintTxHash] = useState('');

  // Token Transfer Form State
  const [transferRecipient, setTransferRecipient] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferStatus, setTransferStatus] = useState('');
  const [transferTxHash, setTransferTxHash] = useState('');

  // Donation Form State
  const [donationProject, setDonationProject] = useState('Save the Space Station');
  const [donationAmount, setDonationAmount] = useState('5');
  const [isDonating, setIsDonating] = useState(false);
  const [donationStatus, setDonationStatus] = useState('');
  const [donationTxHash, setDonationTxHash] = useState('');

  // Developer Playground State
  const [deployName, setDeployName] = useState('My Gasless Collection');
  const [deploySymbol, setDeploySymbol] = useState('MGC');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedAddress, setDeployedAddress] = useState('');
  const [customCollections, setCustomCollections] = useState<{name: string, symbol: string, address: string}[]>([]);

  // Update recipient when account connects
  useEffect(() => {
    if (account) {
      setNftRecipient(account);
    }
  }, [account]);

  // Synchronize preset selection with form inputs
  const selectPreset = (preset: typeof PRESETS[0]) => {
    setSelectedPreset(preset);
    setNftName(preset.name);
    setNftDesc(preset.description);
  };

  // Load custom collections from local storage
  useEffect(() => {
    const saved = localStorage.getItem('custom_nft_collections');
    if (saved) {
      try {
        setCustomCollections(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Listen to UGF transaction completion
  const previousResultRef = useRef<string | null>(null);

  useEffect(() => {
    if (ugfResult && ugfResult.txHash && ugfResult.txHash !== previousResultRef.current) {
      previousResultRef.current = ugfResult.txHash;
      
      // Handle completion depending on active action
      if (isMinting) {
        setMintStatus('Completed! NFT Minted successfully.');
        setMintTxHash(ugfResult.txHash);
        setIsMinting(false);
        refreshBalances();
      } else if (isTransferring) {
        setTransferStatus('Completed! Tokens transferred successfully.');
        setTransferTxHash(ugfResult.txHash);
        setIsTransferring(false);
        refreshBalances();
      } else if (isDonating) {
        setDonationStatus('Completed! Thank you for your support.');
        setDonationTxHash(ugfResult.txHash);
        setIsDonating(false);
        refreshBalances();
      }
    }
  }, [ugfResult, isMinting, isTransferring, isDonating, refreshBalances]);

  // Action: Gasless NFT Minting
  const handleMintNFT = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer || !account) {
      alert('Please connect your wallet first.');
      return;
    }
    if (!ethers.isAddress(nftContract)) {
      alert('Invalid NFT contract address.');
      return;
    }
    if (!ethers.isAddress(nftRecipient)) {
      alert('Invalid recipient wallet address.');
      return;
    }

    setIsMinting(true);
    setMintTxHash('');
    setMintStatus('Preparing gasless transaction...');

    try {
      // 1. Encode transfer/mint transaction data
      const contractInterface = new ethers.Interface(SpaceNFTJson.abi);
      const tokenUri = JSON.stringify({
        name: nftName,
        description: nftDesc,
        image: selectedPreset.image
      });
      const txData = contractInterface.encodeFunctionData('mint', [nftRecipient, tokenUri]);

      const tx = {
        to: nftContract,
        data: txData,
        value: 0n
      };

      setMintStatus('Opening Universal Gas Framework modal...');
      
      // 2. Open UGF Modal to route gas fees gaslessly using TYI_MOCK_USD
      openUGF({
        signer,
        tx,
        destChainId: '84532'
      });
      
    } catch (err: any) {
      console.error(err);
      setMintStatus(`Error: ${err.message || 'Mint failed'}`);
      setIsMinting(false);
    }
  };

  // Action: Gasless ERC-20/Token Send
  const handleTokenTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer || !account) {
      alert('Please connect your wallet first.');
      return;
    }
    if (!ethers.isAddress(transferRecipient)) {
      alert('Invalid recipient address.');
      return;
    }
    if (!transferAmount || parseFloat(transferAmount) <= 0) {
      alert('Amount must be greater than zero.');
      return;
    }

    setIsTransferring(true);
    setTransferTxHash('');
    setTransferStatus('Preparing gasless transfer...');

    try {
      // We will encode a mock ERC-20 transfer or a gasless ETH transfer via UGF.
      // Since UGF allows us to send ETH, we can trigger a direct transaction.
      const tx = {
        to: transferRecipient,
        value: ethers.parseEther(transferAmount),
        data: '0x'
      };

      setTransferStatus('Opening UGF Modal to sponsor gas...');
      openUGF({
        signer,
        tx,
        destChainId: '84532'
      });

    } catch (err: any) {
      console.error(err);
      setTransferStatus(`Error: ${err.message || 'Transfer failed'}`);
      setIsTransferring(false);
    }
  };

  // Action: Gasless Donation
  const handleDonate = async (amount: string, project: string) => {
    if (!signer || !account) {
      alert('Please connect your wallet first.');
      return;
    }
    
    setDonationProject(project);
    setDonationAmount(amount);
    setIsDonating(true);
    setDonationTxHash('');
    setDonationStatus('Preparing donation payment...');

    try {
      // In this donation demo, we transfer a tiny amount of ETH to a creator wallet gaslessly.
      // UGF will route this and pay the gas fee in TYI_MOCK_USD.
      const creatorAddress = '0x165CD37b4C644C2921454429E7F9358d18A45e14'; // Mock charity address
      
      const tx = {
        to: creatorAddress,
        value: ethers.parseEther((parseFloat(amount) * 0.0001).toFixed(6)), // Mock conversions
        data: '0x'
      };

      setDonationStatus('Opening UGF Modal to route donation gasless...');
      openUGF({
        signer,
        tx,
        destChainId: '84532'
      });

    } catch (err: any) {
      console.error(err);
      setDonationStatus(`Error: ${err.message || 'Donation failed'}`);
      setIsDonating(false);
    }
  };

  // Action: Custom NFT Contract Deployment
  const handleDeployContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer || !account) {
      alert('Please connect your wallet first.');
      return;
    }
    if (!deployName || !deploySymbol) {
      alert('Please fill name and symbol.');
      return;
    }

    setIsDeploying(true);
    setDeployedAddress('');

    try {
      // Contracts must be deployed using connected wallet directly (requires Sepolia ETH gas).
      // We warn the user on-screen that this is a one-time deployment fee.
      const factory = new ethers.ContractFactory(SpaceNFTJson.abi, SpaceNFTJson.bytecode, signer);
      
      const contract = await factory.deploy(deployName, deploySymbol);
      await contract.waitForDeployment();
      
      const contractAddr = await contract.getAddress();
      setDeployedAddress(contractAddr);
      
      const newCollection = {
        name: deployName,
        symbol: deploySymbol,
        address: contractAddr
      };
      
      const updated = [newCollection, ...customCollections];
      setCustomCollections(updated);
      localStorage.setItem('custom_nft_collections', JSON.stringify(updated));
      
      // Auto-set the newly deployed contract as target contract
      setNftContract(contractAddr);
      
    } catch (err: any) {
      console.error(err);
      alert(`Deployment failed: ${parseWalletError(err)}`);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Top Banner Warning if not Base Sepolia */}
      {isConnected && chainId !== '84532' && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.2)',
          borderBottom: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#f87171',
          padding: '10px 20px',
          textAlign: 'center',
          fontSize: '14px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertCircle size={16} />
          <span>You are connected to an unsupported network. GaslessSphere only runs on Base Sepolia.</span>
          <button className="outline-btn" style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '6px' }} onClick={switchNetwork}>
            Switch Network
          </button>
        </div>
      )}

      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border-glow)',
        padding: '16px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(3, 0, 8, 0.8)',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-indigo) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(139, 92, 246, 0.4)'
          }}>
            <Cpu size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-gradient" style={{ fontSize: '22px', margin: 0, letterSpacing: '-0.5px' }}>GaslessSphere</h1>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>UGF Gasless Portal</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {isConnected && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.03)', padding: '6px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Mock Gas Balance</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Coins size={14} />
                  {parseFloat(mockUsdBalance).toFixed(2)} TYI_MOCK_USD
                </div>
              </div>
              <div style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>ETH Balance</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {parseFloat(ethBalance).toFixed(4)} ETH
                </div>
              </div>
              <button onClick={refreshBalances} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }} title="Refresh Balances">
                <RefreshCw size={14} />
              </button>
            </div>
          )}

          {isConnected ? (
            <div className="badge badge-purple" style={{ padding: '8px 16px', borderRadius: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wallet size={14} />
              {account?.slice(0, 6)}...{account?.slice(-4)}
            </div>
          ) : (
            <button className="glow-btn" onClick={connect} disabled={isConnecting}>
              {isConnecting ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {/* Main Layout Container */}
      <div style={{ display: 'flex', flex: 1, padding: '40px', gap: '40px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        {/* Navigation Sidebar */}
        <aside style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="glass-card" style={{ padding: '16px' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.5px' }}>DAPP CHANNELS</p>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button 
                onClick={() => setActiveTab('dashboard')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px', borderRadius: '10px',
                  background: activeTab === 'dashboard' ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                  border: 'none', color: activeTab === 'dashboard' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                }}>
                <Compass size={18} style={{ color: activeTab === 'dashboard' ? 'var(--accent-purple)' : 'inherit' }} />
                UGF Dashboard
              </button>
              <button 
                onClick={() => setActiveTab('nft-minter')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px', borderRadius: '10px',
                  background: activeTab === 'nft-minter' ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                  border: 'none', color: activeTab === 'nft-minter' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                }}>
                <Image size={18} style={{ color: activeTab === 'nft-minter' ? 'var(--accent-purple)' : 'inherit' }} />
                Gasless NFT Minter
              </button>
              <button 
                onClick={() => setActiveTab('token-sender')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px', borderRadius: '10px',
                  background: activeTab === 'token-sender' ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                  border: 'none', color: activeTab === 'token-sender' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                }}>
                <Send size={18} style={{ color: activeTab === 'token-sender' ? 'var(--accent-purple)' : 'inherit' }} />
                Gasless Transfer
              </button>
              <button 
                onClick={() => setActiveTab('donations')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px', borderRadius: '10px',
                  background: activeTab === 'donations' ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                  border: 'none', color: activeTab === 'donations' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                }}>
                <Heart size={18} style={{ color: activeTab === 'donations' ? 'var(--accent-purple)' : 'inherit' }} />
                Gasless Donations
              </button>
              <button 
                onClick={() => setActiveTab('playground')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px', borderRadius: '10px',
                  background: activeTab === 'playground' ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                  border: 'none', color: activeTab === 'playground' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                }}>
                <Cpu size={18} style={{ color: activeTab === 'playground' ? 'var(--accent-purple)' : 'inherit' }} />
                Dev Playground
              </button>
            </nav>
          </div>

          {/* Quick Help Card */}
          <div className="glass-card" style={{ padding: '20px', marginTop: '10px' }}>
            <h4 style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--text-primary)' }}>Need Mock USD?</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.4' }}>
              To pay for gas on-chain using UGF, you need some TYI_MOCK_USD on Base Sepolia.
            </p>
            <a 
              href="https://universalgasframework.com/faucets" 
              target="_blank" 
              rel="noreferrer"
              className="glow-btn glow-btn-cyan" 
              style={{ padding: '8px 16px', fontSize: '13px', width: '100%', justifyContent: 'center' }}>
              Open UGF Faucet
              <ExternalLink size={12} />
            </a>
          </div>
        </aside>

        {/* Tab View Contents */}
        <main style={{ flex: 1 }}>
          {/* Wallet Error Alert Banner */}
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#f87171' }}>
                <AlertCircle size={20} />
                <span style={{ fontSize: '14px', fontWeight: 500 }}>{error}</span>
              </div>
              <button 
                onClick={clearError} 
                className="outline-btn"
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                  color: '#f87171'
                }}>
                Dismiss
              </button>
            </div>
          )}

          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              <div className="glass-card active-glow" style={{ padding: '40px' }}>
                <span className="badge badge-purple" style={{ marginBottom: '16px' }}>Network Architecture</span>
                <h2 className="text-gradient" style={{ fontSize: '36px', marginBottom: '16px', lineHeight: '1.2' }}>Gasless Remote Execution on Base Sepolia</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '16px', maxWidth: '750px', marginBottom: '24px', lineHeight: '1.6' }}>
                  Universal Gas Framework (UGF) is a next-generation cross-chain execution layer that eliminates gas headaches. 
                  In this dApp, you can mint NFTs, send tokens, or donate without needing local gas ETH. UGF quotes and settles your transactions on-the-fly, allowing you to pay in TYI_MOCK_USD instead.
                </p>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <button className="glow-btn" onClick={() => setActiveTab('nft-minter')}>
                    Try Gasless NFT Mint
                    <ChevronRight size={16} />
                  </button>
                  <a href="https://universalgasframework.com/docs" target="_blank" rel="noreferrer" className="outline-btn">
                    Read UGF Docs
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>

              {/* Interactive UGF Flowchart */}
              <div className="glass-card" style={{ padding: '30px' }}>
                <h3 style={{ fontSize: '20px', marginBottom: '24px', textAlign: 'center' }}>How UGF Executes Gasless Transactions</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', position: 'relative' }}>
                  {/* Step 1 */}
                  <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.2)', border: '1px solid var(--accent-purple)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', marginBottom: '12px', fontWeight: 'bold', color: 'var(--accent-purple)' }}>1</div>
                    <h4 style={{ fontSize: '15px', marginBottom: '8px' }}>Payer Quote</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>dApp requests gas cost quote from UGF SDK using transaction payloads.</p>
                  </div>
                  {/* Step 2 */}
                  <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.2)', border: '1px solid var(--accent-cyan)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', marginBottom: '12px', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>2</div>
                    <h4 style={{ fontSize: '15px', marginBottom: '8px' }}>Auth Signature</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>User signs EIP-3009 transfer authorization using their wallet to approve Mock USD gas.</p>
                  </div>
                  {/* Step 3 */}
                  <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.2)', border: '1px solid var(--accent-indigo)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', marginBottom: '12px', fontWeight: 'bold', color: 'var(--accent-indigo)' }}>3</div>
                    <h4 style={{ fontSize: '15px', marginBottom: '8px' }}>Settle & Sponsor</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>UGF gateway validates the quote settlement, locks Mock USD, and sponsors ETH for execution.</p>
                  </div>
                  {/* Step 4 */}
                  <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(236, 72, 153, 0.2)', border: '1px solid var(--accent-pink)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', marginBottom: '12px', fontWeight: 'bold', color: 'var(--accent-pink)' }}>4</div>
                    <h4 style={{ fontSize: '15px', marginBottom: '8px' }}>Execute & Confirm</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>UGF executes the target transaction on Base Sepolia. Verifiable instantly on UGF Scan.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NFT MINTER */}
          {activeTab === 'nft-minter' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              <div className="glass-card" style={{ padding: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Gasless NFT Space Collection</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                  Pick a premium cosmic artwork below, customize the details, and mint it directly to your address. 
                  The gas fee is paid entirely in TYI_MOCK_USD using UGF.
                </p>

                {/* Preset Space Cards Selector */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '30px' }}>
                  {PRESETS.map((preset) => (
                    <div 
                      key={preset.id}
                      onClick={() => selectPreset(preset)}
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: selectedPreset.id === preset.id ? '2px solid var(--accent-purple)' : '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: selectedPreset.id === preset.id ? '0 0 15px rgba(139,92,246,0.2)' : 'none'
                      }}>
                      <div style={{ position: 'relative', width: '100%', height: '150px', background: '#000' }}>
                        <img src={preset.image} alt={preset.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ padding: '12px' }}>
                        <h4 style={{ fontSize: '15px', color: selectedPreset.id === preset.id ? 'var(--accent-purple)' : 'var(--text-primary)' }}>{preset.name}</h4>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{preset.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
                  {/* Mint Form */}
                  <form onSubmit={handleMintNFT} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label className="form-label">NFT Title</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={nftName} 
                        onChange={(e) => setNftName(e.target.value)} 
                        required 
                      />
                    </div>
                    <div>
                      <label className="form-label">Description / Metadata</label>
                      <textarea 
                        className="form-input" 
                        rows={3} 
                        value={nftDesc} 
                        onChange={(e) => setNftDesc(e.target.value)} 
                        required 
                      />
                    </div>
                    <div>
                      <label className="form-label">Target NFT Contract Address (Base Sepolia)</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <select 
                          className="form-input" 
                          style={{ flex: 1 }}
                          value={nftContract}
                          onChange={(e) => setNftContract(e.target.value)}>
                          <option value={DEFAULT_NFT_CONTRACT}>Default UGF Demo NFT Collection</option>
                          {customCollections.map((col) => (
                            <option key={col.address} value={col.address}>{col.name} ({col.symbol}) - {col.address.slice(0, 6)}...{col.address.slice(-4)}</option>
                          ))}
                        </select>
                        <input 
                          type="text" 
                          className="form-input" 
                          style={{ flex: 2 }}
                          placeholder="Or paste custom contract address..." 
                          value={nftContract}
                          onChange={(e) => setNftContract(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Recipient Wallet Address</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={nftRecipient} 
                        onChange={(e) => setNftRecipient(e.target.value)} 
                        required 
                      />
                    </div>

                    <button 
                      type="submit" 
                      className="glow-btn" 
                      disabled={isMinting || !isConnected || chainId !== '84532'}
                      style={{ marginTop: '10px' }}>
                      {isMinting ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
                      Mint Gasless Space NFT
                    </button>
                  </form>

                  {/* Artwork Preview Card */}
                  <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
                    <h3 style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--text-primary)' }}>Live NFT Preview</h3>
                    <div style={{ width: '100%', height: '200px', borderRadius: '8px', overflow: 'hidden', background: '#000', marginBottom: '12px' }}>
                      <img src={selectedPreset.image} alt={nftName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <h4 style={{ fontSize: '18px', color: 'var(--accent-purple)' }}>{nftName || 'Untitled'}</h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', minHeight: '40px' }}>{nftDesc || 'No description provided.'}</p>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge badge-purple">Base Sepolia</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ERC-721</span>
                    </div>
                  </div>
                </div>

                {/* Minting Status Logger */}
                {isMinting && (
                  <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(139, 92, 246, 0.05)', border: '1px dashed var(--border-glow)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Loader2 size={18} className="animate-spin text-purple-400" />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>Action In Progress</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{mintStatus}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsMinting(false)} 
                      className="outline-btn" 
                      style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px' }}>
                      Reset State
                    </button>
                  </div>
                )}

                {/* Success Banner */}
                {mintTxHash && (
                  <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#4ade80', marginBottom: '8px' }}>
                      <CheckCircle size={18} />
                      <h4 style={{ margin: 0 }}>Transaction Executed Gasless!</h4>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      Your Space NFT was successfully minted to {nftRecipient.slice(0, 6)}...{nftRecipient.slice(-4)}. The gas was paid via UGF.
                    </p>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <a href={`https://sepolia.basescan.org/tx/${mintTxHash}`} target="_blank" rel="noreferrer" className="outline-btn" style={{ padding: '6px 12px', fontSize: '12px' }}>
                        View on BaseScan
                        <ExternalLink size={12} />
                      </a>
                      <a href={`https://gateway.universalgasframework.com/status?digest=${ugfResult?.txHash}`} target="_blank" rel="noreferrer" className="outline-btn" style={{ padding: '6px 12px', fontSize: '12px' }}>
                        View on UGF Scan
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: TOKEN SENDER */}
          {activeTab === 'token-sender' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              <div className="glass-card" style={{ padding: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Gasless Token Transfer</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                  Send ETH or testnet ERC-20 tokens to any address on Base Sepolia. 
                  Normally, transferring value requires destination ETH; UGF handles the fee in `TYI_MOCK_USD`.
                </p>

                <div style={{ maxWidth: '600px' }}>
                  <form onSubmit={handleTokenTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <label className="form-label">Recipient Wallet Address</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="0x..."
                        value={transferRecipient} 
                        onChange={(e) => setTransferRecipient(e.target.value)} 
                        required 
                      />
                    </div>
                    <div>
                      <label className="form-label">Amount (ETH)</label>
                      <input 
                        type="number" 
                        step="0.0001"
                        className="form-input" 
                        placeholder="0.01"
                        value={transferAmount} 
                        onChange={(e) => setTransferAmount(e.target.value)} 
                        required 
                      />
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Your balance: {parseFloat(ethBalance).toFixed(4)} ETH. The transfer amount will be sent gaslessly.
                      </p>
                    </div>

                    <button 
                      type="submit" 
                      className="glow-btn" 
                      disabled={isTransferring || !isConnected || chainId !== '84532'}>
                      {isTransferring ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      Transfer Gasless
                    </button>
                  </form>

                  {isTransferring && (
                    <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(139, 92, 246, 0.05)', border: '1px dashed var(--border-glow)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Loader2 size={18} className="animate-spin text-purple-400" />
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600 }}>Transferring Tokens</div>
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{transferStatus}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setIsTransferring(false)} 
                        className="outline-btn" 
                        style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px' }}>
                        Reset State
                      </button>
                    </div>
                  )}

                  {transferTxHash && (
                    <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#4ade80', marginBottom: '8px' }}>
                        <CheckCircle size={18} />
                        <h4 style={{ margin: 0 }}>Transfer Successful!</h4>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                        Successfully transferred {transferAmount} ETH gaslessly via UGF.
                      </p>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <a href={`https://sepolia.basescan.org/tx/${transferTxHash}`} target="_blank" rel="noreferrer" className="outline-btn" style={{ padding: '6px 12px', fontSize: '12px' }}>
                          View on BaseScan
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DONATIONS */}
          {activeTab === 'donations' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              <div className="glass-card" style={{ padding: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Support Creators & Space Initiatives</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                  Quickly fund space-oriented research projects on-chain. UGF executes your transaction completely gasless. 
                  Your donation goes directly to the project wallets.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                  {/* Card 1 */}
                  <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '320px' }}>
                    <div>
                      <span className="badge badge-purple" style={{ marginBottom: '12px' }}>Radiation Shielding</span>
                      <h3 style={{ fontSize: '18px', marginBottom: '8px', color: 'var(--text-primary)' }}>Space Station Shielding</h3>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                        Funding next-generation nanomaterials to protect the Space Station crew from cosmic solar radiation flares.
                      </p>
                    </div>
                    <div style={{ marginTop: '20px' }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <button className="outline-btn" style={{ flex: 1, padding: '6px' }} onClick={() => handleDonate('1', 'Space Station Shielding')}>$1</button>
                        <button className="outline-btn" style={{ flex: 1, padding: '6px' }} onClick={() => handleDonate('5', 'Space Station Shielding')}>$5</button>
                        <button className="outline-btn" style={{ flex: 1, padding: '6px' }} onClick={() => handleDonate('10', 'Space Station Shielding')}>$10</button>
                      </div>
                      <button className="glow-btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => handleDonate('5', 'Space Station Shielding')} disabled={isDonating}>
                        Donate $5 Gasless
                      </button>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '320px' }}>
                    <div>
                      <span className="badge badge-cyan" style={{ marginBottom: '12px' }}>Hydroponics</span>
                      <h3 style={{ fontSize: '18px', marginBottom: '8px', color: 'var(--text-primary)' }}>Lunar Greenhouses</h3>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                        Developing automated vertical bio-domes to cultivate fresh food and plants on the Moon under low-gravity conditions.
                      </p>
                    </div>
                    <div style={{ marginTop: '20px' }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <button className="outline-btn" style={{ flex: 1, padding: '6px' }} onClick={() => handleDonate('1', 'Lunar Greenhouses')}>$1</button>
                        <button className="outline-btn" style={{ flex: 1, padding: '6px' }} onClick={() => handleDonate('5', 'Lunar Greenhouses')}>$5</button>
                        <button className="outline-btn" style={{ flex: 1, padding: '6px' }} onClick={() => handleDonate('10', 'Lunar Greenhouses')}>$10</button>
                      </div>
                      <button className="glow-btn glow-btn-cyan" style={{ width: '100%', justifyContent: 'center' }} onClick={() => handleDonate('5', 'Lunar Greenhouses')} disabled={isDonating}>
                        Donate $5 Gasless
                      </button>
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '320px' }}>
                    <div>
                      <span className="badge badge-green" style={{ marginBottom: '12px' }}>Open Source Dev</span>
                      <h3 style={{ fontSize: '18px', marginBottom: '8px', color: 'var(--text-primary)' }}>Tychi Labs Support</h3>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                        Supporting the team working on the Universal Gas Framework (UGF) SDKs and core router contracts.
                      </p>
                    </div>
                    <div style={{ marginTop: '20px' }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <button className="outline-btn" style={{ flex: 1, padding: '6px' }} onClick={() => handleDonate('1', 'Tychi Labs Support')}>$1</button>
                        <button className="outline-btn" style={{ flex: 1, padding: '6px' }} onClick={() => handleDonate('5', 'Tychi Labs Support')}>$5</button>
                        <button className="outline-btn" style={{ flex: 1, padding: '6px' }} onClick={() => handleDonate('10', 'Tychi Labs Support')}>$10</button>
                      </div>
                      <button className="glow-btn" style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, var(--accent-pink) 0%, var(--accent-purple) 100%)' }} onClick={() => handleDonate('5', 'Tychi Labs Support')} disabled={isDonating}>
                        Donate $5 Gasless
                      </button>
                    </div>
                  </div>
                </div>

                {isDonating && (
                  <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(139, 92, 246, 0.05)', border: '1px dashed var(--border-glow)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Loader2 size={18} className="animate-spin text-purple-400" />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>Donating to {donationProject}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{donationStatus}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsDonating(false)} 
                      className="outline-btn" 
                      style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px' }}>
                      Reset State
                    </button>
                  </div>
                )}
                {donationTxHash && (
                  <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#4ade80', marginBottom: '8px' }}>
                      <CheckCircle size={18} />
                      <h4 style={{ margin: 0 }}>Donation Sent successfully!</h4>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Successfully donated {donationAmount} USD gaslessly to {donationProject} on Base Sepolia.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: DEVELOPER PLAYGROUND */}
          {activeTab === 'playground' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              <div className="glass-card" style={{ padding: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Developer Playground: Deploy NFT Contract</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                  Deploy your own ERC-721 contract to Base Sepolia directly from this UI! 
                  Since contract creation is on-chain, this initial deploy requires a tiny amount of ETH from your wallet, 
                  but once deployed, you can mint NFTs on it 100% gaslessly via UGF.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '35px' }}>
                  {/* Deploy Form */}
                  <div>
                    <form onSubmit={handleDeployContract} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <label className="form-label">Collection Name</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="e.g. Lunar Badges"
                          value={deployName} 
                          onChange={(e) => setDeployName(e.target.value)} 
                          required 
                        />
                      </div>
                      <div>
                        <label className="form-label">Collection Symbol</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="e.g. LBAD"
                          value={deploySymbol} 
                          onChange={(e) => setDeploySymbol(e.target.value)} 
                          required 
                        />
                      </div>

                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '16px', borderRadius: '10px' }}>
                        <div style={{ display: 'flex', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.4' }}>
                          <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                          <div>
                            <strong>Solidity Compiler:</strong> This compiles a standard ERC-721 contract with a public `mint` function. 
                            The generated ABI and bytecode will be sent via MetaMask to deploy on Base Sepolia.
                          </div>
                        </div>
                      </div>

                      <button 
                        type="submit" 
                        className="glow-btn" 
                        disabled={isDeploying || !isConnected}>
                        {isDeploying ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
                        Compile & Deploy Contract
                      </button>
                    </form>

                    {deployedAddress && (
                      <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#4ade80', marginBottom: '8px' }}>
                          <CheckCircle size={18} />
                          <h4 style={{ margin: 0 }}>Collection Deployed!</h4>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                          Your collection contract was deployed to: <code style={{ fontSize: '12px' }}>{deployedAddress}</code>.
                        </p>
                        <button className="outline-btn" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => {
                          setActiveTab('nft-minter');
                        }}>
                          Go Mint Gasless NFTs on this collection
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Code View */}
                  <div className="glass-card" style={{ padding: '20px', background: 'rgba(5, 3, 15, 0.9)', height: 'fit-content' }}>
                    <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>SpaceNFT.sol Snippet</h4>
                    <pre style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: '#a78bfa',
                      overflowX: 'auto',
                      maxHeight: '300px',
                      background: 'rgba(0,0,0,0.3)',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.03)'
                    }}>
{`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SpaceNFT {
    string public name;
    string public symbol;
    uint256 private _nextTokenId;
    
    // Public Minting for Gasless Flows
    function mint(address to, string memory uri) 
        public returns (uint256) 
    {
        uint256 tokenId = _nextTokenId++;
        _owners[tokenId] = to;
        _balances[to] += 1;
        _tokenURIs[tokenId] = uri;
        emit Transfer(address(0), to, tokenId);
        return tokenId;
    }
}`}
                    </pre>
                  </div>
                </div>

                {/* Custom collections list */}
                {customCollections.length > 0 && (
                  <div style={{ marginTop: '40px' }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Your Custom Collections</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                      {customCollections.map((col) => (
                        <div key={col.address} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
                          <div>
                            <h4 style={{ fontSize: '15px' }}>{col.name} ({col.symbol})</h4>
                            <code style={{ fontSize: '11px', background: 'transparent', padding: 0, color: 'var(--text-secondary)' }}>{col.address}</code>
                          </div>
                          <button className="outline-btn" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => {
                            setNftContract(col.address);
                            setActiveTab('nft-minter');
                          }}>
                            Use Collection
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-glow)',
        padding: '30px 40px',
        textAlign: 'center',
        background: 'rgba(3,0,8,0.9)',
        marginTop: 'auto'
      }}>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          GaslessSphere &copy; 2026. Built with Universal Gas Framework (UGF) on Base Sepolia.
        </p>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
          National Level Hackathon — HackwithMumbai 3.0
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <UGFProvider mode="testnet">
      <MainAppContent />
    </UGFProvider>
  );
}
