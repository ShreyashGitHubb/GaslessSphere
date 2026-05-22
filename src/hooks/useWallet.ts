import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { UGFClient } from '@tychilabs/ugf-testnet-js';

const MOCK_USD_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

export function parseWalletError(err: any): string {
  const errMsg = err?.message || '';
  const errCode = err?.code;
  const nestedError = err?.error || err?.info?.error || err?.info;
  const nestedCode = nestedError?.code;
  const nestedMessage = nestedError?.message || '';

  if (
    errCode === 4001 ||
    nestedCode === 4001 ||
    errMsg.includes('4001') ||
    errMsg.toLowerCase().includes('rejected') ||
    errMsg.toLowerCase().includes('user rejected') ||
    nestedMessage.toLowerCase().includes('rejected') ||
    nestedMessage.toLowerCase().includes('user rejected')
  ) {
    return 'Connection request rejected.';
  }

  if (
    errCode === -32002 ||
    nestedCode === -32002 ||
    errMsg.includes('-32002') ||
    errMsg.toLowerCase().includes('already pending') ||
    nestedMessage.toLowerCase().includes('already pending') ||
    errMsg.toLowerCase().includes('please wait') ||
    nestedMessage.toLowerCase().includes('please wait')
  ) {
    return 'Connection request already pending. Please open your MetaMask extension.';
  }

  return nestedMessage || errMsg || 'An unknown error occurred.';
}

function parseSwitchNetworkError(err: any): string {
  const errMsg = err?.message || '';
  const errCode = err?.code;
  const nestedError = err?.error || err?.info?.error || err?.info;
  const nestedCode = nestedError?.code;
  const nestedMessage = nestedError?.message || '';

  if (errCode === 4902 || nestedCode === 4902 || errMsg.includes('4902') || nestedMessage.includes('4902')) {
    return 'ADD_CHAIN';
  }

  if (
    errCode === 4001 ||
    nestedCode === 4001 ||
    errMsg.includes('4001') ||
    errMsg.toLowerCase().includes('rejected') ||
    errMsg.toLowerCase().includes('user rejected') ||
    nestedMessage.toLowerCase().includes('rejected') ||
    nestedMessage.toLowerCase().includes('user rejected')
  ) {
    return 'Network switch request rejected.';
  }

  if (
    errCode === -32002 ||
    nestedCode === -32002 ||
    errMsg.includes('-32002') ||
    errMsg.toLowerCase().includes('already pending') ||
    nestedMessage.toLowerCase().includes('already pending') ||
    errMsg.toLowerCase().includes('please wait') ||
    nestedMessage.toLowerCase().includes('please wait')
  ) {
    return 'Network switch request already pending in MetaMask.';
  }

  return nestedMessage || errMsg || 'Failed to switch to Base Sepolia network';
}

export function useWallet() {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [ethBalance, setEthBalance] = useState<string>('0');
  const [mockUsdBalance, setMockUsdBalance] = useState<string>('0');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  const ugfClientRef = useRef(new UGFClient());

  const getMockTokenAddress = useCallback(async () => {
    try {
      const entry = await ugfClientRef.current.registry.getChainEntry('TYI_MOCK_USD', '84532');
      return entry.address;
    } catch (e) {
      console.error('Failed to get mock USD address from UGF registry:', e);
      // Fallback address if registry fails to resolve
      return '0x7e83bc2f5E13101E9E67d8D3C4cBE3dCc2b8c9d2'; 
    }
  }, []);

  const refreshBalances = useCallback(async (activeProvider: ethers.BrowserProvider, activeAccount: string) => {
    try {
      // 1. Fetch ETH balance
      const balance = await activeProvider.getBalance(activeAccount);
      setEthBalance(ethers.formatEther(balance));

      // 2. Fetch TYI_MOCK_USD balance
      const mockTokenAddr = await getMockTokenAddress();
      const mockContract = new ethers.Contract(mockTokenAddr, MOCK_USD_ABI, activeProvider);
      
      try {
        const mockBalance = await mockContract.balanceOf(activeAccount);
        const decimals = await mockContract.decimals().catch(() => 18);
        setMockUsdBalance(ethers.formatUnits(mockBalance, decimals));
      } catch (err) {
        console.error('Error fetching mock USD balance:', err);
        setMockUsdBalance('0');
      }
    } catch (err: any) {
      console.error('Failed to refresh balances:', err);
    }
  }, [getMockTokenAddress]);

  const initWallet = useCallback(async (ethereum: any) => {
    try {
      const web3Provider = new ethers.BrowserProvider(ethereum);
      setProvider(web3Provider);

      const accounts = await web3Provider.send('eth_accounts', []);
      const network = await web3Provider.getNetwork();
      const currentChainId = network.chainId.toString();
      setChainId(currentChainId);

      if (accounts.length > 0) {
        const activeAccount = accounts[0];
        setAccount(activeAccount);
        const web3Signer = await web3Provider.getSigner();
        setSigner(web3Signer);
        
        if (currentChainId === '84532') {
          await refreshBalances(web3Provider, activeAccount);
        }
      }
    } catch (err: any) {
      const parsed = parseWalletError(err);
      if (parsed.includes('already pending')) {
        setError(parsed);
      } else {
        console.warn('Failed to initialize wallet connection silently:', err);
      }
    }
  }, [refreshBalances]);

  const switchNetwork = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x14a34' }] // Base Sepolia Chain ID: 84532
      });
    } catch (switchError: any) {
      const parsed = parseSwitchNetworkError(switchError);
      if (parsed === 'ADD_CHAIN') {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x14a34',
                chainName: 'Base Sepolia Testnet',
                nativeCurrency: {
                  name: 'Ether',
                  symbol: 'ETH',
                  decimals: 18
                },
                rpcUrls: ['https://sepolia.base.org'],
                blockExplorerUrls: ['https://sepolia.basescan.org']
              }
            ]
          });
        } catch (addError: any) {
          const parsedAdd = parseSwitchNetworkError(addError);
          setError(parsedAdd === 'ADD_CHAIN' ? 'Failed to add Base Sepolia network' : parsedAdd);
        }
      } else {
        setError(parsed);
      }
    }
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError('Please install MetaMask or another Web3 wallet.');
      return;
    }
    
    setIsConnecting(true);
    setError(null);
    
    try {
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      setProvider(web3Provider);

      const accounts = await web3Provider.send('eth_requestAccounts', []);
      const activeAccount = accounts[0];
      setAccount(activeAccount);

      const web3Signer = await web3Provider.getSigner();
      setSigner(web3Signer);

      const network = await web3Provider.getNetwork();
      const currentChainId = network.chainId.toString();
      setChainId(currentChainId);

      if (currentChainId !== '84532') {
        await switchNetwork();
      } else {
        await refreshBalances(web3Provider, activeAccount);
      }
    } catch (err: any) {
      console.error('User connection error:', err);
      setError(parseWalletError(err));
    } finally {
      setIsConnecting(false);
    }
  }, [switchNetwork, refreshBalances]);

  // Watch for chain and account changes and initialize
  useEffect(() => {
    const ethereum = window.ethereum;
    if (ethereum) {
      initWallet(ethereum);

      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length === 0) {
          setAccount(null);
          setSigner(null);
          setEthBalance('0');
          setMockUsdBalance('0');
        } else {
          setAccount(accounts[0]);
          try {
            const web3Provider = new ethers.BrowserProvider(ethereum);
            setProvider(web3Provider);
            const web3Signer = await web3Provider.getSigner();
            setSigner(web3Signer);
            const network = await web3Provider.getNetwork();
            const currentChainId = network.chainId.toString();
            setChainId(currentChainId);
            if (currentChainId === '84532') {
              await refreshBalances(web3Provider, accounts[0]);
            }
          } catch (err) {
            console.error('Error handling accounts change:', err);
          }
        }
      };

      const handleChainChanged = () => {
        // Refresh provider and page state on chain change as recommended by MetaMask
        window.location.reload();
      };

      ethereum.on('accountsChanged', handleAccountsChanged);
      ethereum.on('chainChanged', handleChainChanged);

      return () => {
        ethereum.removeListener('accountsChanged', handleAccountsChanged);
        ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [initWallet, refreshBalances]);

  const refreshBalancesOuter = useCallback(() => {
    if (provider && account) {
      return refreshBalances(provider, account);
    }
    return Promise.resolve();
  }, [provider, account, refreshBalances]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    account,
    chainId,
    ethBalance,
    mockUsdBalance,
    isConnected: !!account,
    isConnecting,
    error,
    clearError,
    connect,
    switchNetwork,
    refreshBalances: refreshBalancesOuter,
    signer,
    provider
  };
}

// Global declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}
