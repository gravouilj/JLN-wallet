/**
 * React Hook for eCash Wallet
 * Professional implementation using ecash-lib + chronik-client
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAtom } from 'jotai';
import {
  walletAtom,
  walletConnectedAtom,
  savedMnemonicAtom,
  mnemonicSetterAtom,
  hdPathAtom,
  balanceAtom,
  totalBalanceAtom,
  balanceBreakdownAtom,
  balanceRefreshTriggerAtom,
  scriptLoadedAtom
} from '../atoms';
import { createWallet, generateMnemonic, validateMnemonic } from '../services/ecashWallet';

/**
 * Main hook for wallet connection and management
 */
export const useEcashWallet = () => {
  const [wallet, setWallet] = useAtom(walletAtom);
  const [walletConnected, setWalletConnected] = useAtom(walletConnectedAtom);
  const [savedMnemonic] = useAtom(savedMnemonicAtom);
  const [, setMnemonic] = useAtom(mnemonicSetterAtom);
  const [hdPath] = useAtom(hdPathAtom);
  const [, setScriptLoaded] = useAtom(scriptLoadedAtom);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Initialize wallet from saved mnemonic
   */
  const initializeWallet = useCallback(async () => {
    if (!savedMnemonic) {
      console.log('⚠️ No saved mnemonic, skipping initialization');
      return;
    }
    
    // IMPORTANT: Check if wallet already exists and has address
    if (wallet && wallet.addressStr) {
      console.log('✅ Wallet already valid, skipping re-init');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔑 Initializing eCash wallet...');
      
      // Create wallet instance
      const walletInstance = await createWallet(savedMnemonic, hdPath);
      
      // Verify wallet has address
      const address = walletInstance.getAddress();
      console.log('✅ Wallet initialized successfully');
      console.log('📍 Address:', address);
      
      if (!address) {
        throw new Error('Wallet created but address is undefined');
      }
      
      // Wait for Chronik connection to be ready
      console.log('⏱️ Waiting for Chronik connection...');
      try {
        await walletInstance.chronikInitPromise;
        console.log('✅ Chronik connection ready');
      } catch (chronikError) {
        console.error('❌ Chronik connection failed:', chronikError);
        console.warn('⚠️ Wallet will be created but blockchain features may be limited');
        // Continue anyway - wallet can still be used
      }
      
      setWallet(walletInstance);
      setWalletConnected(true);
      setScriptLoaded(true);
    } catch (err) {
      console.error('❌ Failed to initialize wallet:', err);
      setError(err.message);
      setWalletConnected(false);
    } finally {
      setLoading(false);
    }
  }, [savedMnemonic, hdPath, wallet, setWallet, setWalletConnected, setScriptLoaded]);

  /**
   * Generate new wallet
   */
  const generateNewWallet = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🎲 Generating new wallet...');
      
      // 1. Generate mnemonic
      const newMnemonic = generateMnemonic();
      console.log('✅ Mnemonic generated');
      
      // 2. Create wallet instance (async for WASM init)
      const walletInstance = await createWallet(newMnemonic, hdPath);
      console.log('✅ Wallet instance created');
      
      // Verify wallet has address
      const address = walletInstance.getAddress();
      console.log('📍 Address:', address);
      
      if (!address) {
        throw new Error('Wallet created but address is undefined');
      }
      
      // 3. Update atoms IN ORDER
      console.log('📝 Saving mnemonic...');
      setMnemonic(newMnemonic);
      
      console.log('💾 Setting wallet instance...');
      setWallet(walletInstance);
      
      console.log('✅ Setting connected status...');
      setWalletConnected(true);
      setScriptLoaded(true);
      
      console.log('🎉 New wallet generated successfully!');
      
      return newMnemonic;
    } catch (err) {
      console.error('❌ Failed to generate wallet:', err);
      setError(err.message);
      setWalletConnected(false);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [hdPath, setMnemonic, setWallet, setWalletConnected, setScriptLoaded]);

  /**
   * Import wallet from mnemonic
   */
  const importWallet = useCallback(async (mnemonic) => {
    setLoading(true);
    setError(null);

    try {
      console.log('📥 Importing wallet from mnemonic...');
      
      // 1. Validate mnemonic
      if (!validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
      }
      console.log('✅ Mnemonic validated');

      // 2. Create wallet instance
      const walletInstance = await createWallet(mnemonic, hdPath);
      console.log('✅ Wallet instance created');
      
      // Verify wallet has address
      const address = walletInstance.getAddress();
      console.log('📍 Address:', address);
      
      if (!address) {
        throw new Error('Wallet created but address is undefined');
      }
      
      // 3. Test connection by getting balance
      console.log('🔄 Testing connection...');
      await walletInstance.getBalance();
      console.log('✅ Connection successful');
      
      // 4. Update atoms IN ORDER - CRUCIAL!
      console.log('📝 Saving mnemonic...');
      setMnemonic(mnemonic);
      
      console.log('💾 Setting wallet instance...');
      setWallet(walletInstance);
      
      console.log('✅ Setting connected status...');
      setWalletConnected(true);
      setScriptLoaded(true);
      
      console.log('🎉 Wallet imported successfully!');
      
      return walletInstance;
    } catch (err) {
      console.error('❌ Failed to import wallet:', err);
      setError(err.message);
      setWalletConnected(false);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [hdPath, setMnemonic, setWallet, setWalletConnected, setScriptLoaded]);

  /**
   * Disconnect wallet (temporary - keeps mnemonic)
   */
  const disconnectWallet = useCallback(() => {
    setWallet(null);
    setWalletConnected(false);
    setScriptLoaded(false);
    console.log('👋 Wallet disconnected (mnemonic preserved)');
  }, [setWallet, setWalletConnected, setScriptLoaded]);

  /**
   * Reset wallet (delete all data including mnemonic)
   */
  const resetWallet = useCallback(() => {
    setMnemonic('');
    setWallet(null);
    setWalletConnected(false);
    setScriptLoaded(false);
    localStorage.removeItem('farm-wallet-mnemonic');
    localStorage.removeItem('farm-wallet-favorite-farms');
    localStorage.removeItem('farm-wallet-selected-farm');
    console.log('🔄 Wallet reset - all data cleared');
    
    // Force complete reload to reset all state
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, [setMnemonic, setWallet, setWalletConnected, setScriptLoaded]);

  // Auto-initialize wallet on mount if mnemonic exists
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('🔍 useEcashWallet - Auto-init check:', {
        savedMnemonic: savedMnemonic ? 'EXISTS' : 'NULL',
        walletConnected,
        loading,
        wallet: wallet ? 'EXISTS' : 'NULL',
        walletHasAddress: wallet?.addressStr ? 'YES' : 'NO'
      });
    }
    
    // CRITICAL FIX: Only initialize once if wallet doesn't exist
    // Don't re-trigger if walletConnected changes (avoid loop)
    if (savedMnemonic && !loading && !wallet) {
      if (import.meta.env.DEV) console.log('🚀 Starting auto-initialization (no wallet)...');
      initializeWallet();
    } else if (wallet && wallet.addressStr && import.meta.env.DEV) {
      console.log('✅ Wallet already initialized with address:', wallet.addressStr);
    }
  }, [savedMnemonic, loading, wallet, initializeWallet]);

  // Extract address from wallet instance - DIRECT ACCESS
  // Don't use useMemo, compute it every render to ensure reactivity
  // Mémoïser l'extraction de l'adresse (ne change pas tant que wallet ne change pas)
  const address = useMemo(() => {
    if (!wallet) {
      if (import.meta.env.DEV) console.log('⚠️ Wallet is null, address empty');
      return '';
    }
    
    try {
      const addr = wallet.getAddress();
      if (import.meta.env.DEV) console.log('🏠 Hook address extracted:', addr);
      return addr;
    } catch (e) {
      console.error('❌ Erreur récupération adresse:', e);
      return '';
    }
  }, [wallet]); // Recalculer uniquement si wallet change

  return {
    wallet,
    address, // L'adresse est maintenant directement accessible !
    walletConnected,
    loading,
    error,
    generateNewWallet,
    importWallet,
    disconnectWallet,
    resetWallet,
    initializeWallet
  };
};

/**
 * Hook for balance management
 */
export const useEcashBalance = () => {
  const [wallet] = useAtom(walletAtom);
  const [walletConnected] = useAtom(walletConnectedAtom);
  const [balance, setBalance] = useAtom(balanceAtom);
  const [totalBalance, setTotalBalance] = useAtom(totalBalanceAtom);
  const [balanceBreakdown, setBalanceBreakdown] = useAtom(balanceBreakdownAtom);
  const [triggerRefresh] = useAtom(balanceRefreshTriggerAtom);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch balance from blockchain
   */
  const fetchBalance = useCallback(async () => {
    if (!wallet || !walletConnected) {
      setBalance(0);
      setTotalBalance(0);
      setBalanceBreakdown({
        spendableBalance: 0,
        totalBalance: 0,
        tokenDustValue: 0,
        pureXecUtxos: 0,
        tokenUtxos: 0
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const balanceData = await wallet.getBalance();
      
      // Calculate token dust (BigInt arithmetic, convert to Number for React)
      // balanceSats and totalBalanceSats are BigInt from ecash-lib v4
      const tokenDustSats = balanceData.totalBalanceSats - balanceData.balanceSats;
      const tokenDustXec = Number(tokenDustSats) / 100; // Convert BigInt → Number
      
      // Count UTXOs (balanceData.utxos has { pureXec: [], token: [] })
      // Each UTXO contains BigInt fields, but we only count them
      const pureXecCount = balanceData.utxos.pureXec?.length || 0;
      const tokenUtxoCount = balanceData.utxos.token?.length || 0;
      
      // Store data (all values are Number, safe for React state)
      setBalance(balanceData.balance); // Already Number from service
      setTotalBalance(balanceData.totalBalance); // Already Number from service
      setBalanceBreakdown({
        spendableBalance: balanceData.balance, // Number
        totalBalance: balanceData.totalBalance, // Number
        tokenDustValue: tokenDustXec, // Number (converted above)
        pureXecUtxos: pureXecCount, // Number (count)
        tokenUtxos: tokenUtxoCount // Number (count)
      });
      
      console.log('💰 Balance updated:', balanceData.balance, 'XEC');
      console.log('📊 Balance atoms set:', {
        balance: balanceData.balance,
        totalBalance: balanceData.totalBalance,
        spendable: balanceData.balance
      });
    } catch (err) {
      console.error('❌ Failed to fetch balance:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [wallet, walletConnected, setBalance, setTotalBalance, setBalanceBreakdown]);

  // Auto-fetch balance when wallet is ready
  useEffect(() => {
    if (wallet && walletConnected) {
      fetchBalance();
    }
  }, [wallet, walletConnected, fetchBalance]);

  // Listen to manual refresh triggers (from WebSocket)
  useEffect(() => {
    if (wallet && walletConnected && triggerRefresh > 0) {
      console.log('🔄 Balance refresh triggered by WebSocket');
      fetchBalance();
    }
  }, [triggerRefresh, wallet, walletConnected, fetchBalance]);

  return {
    balance,
    totalBalance,
    balanceBreakdown,
    loading,
    error,
    refreshBalance: fetchBalance
  };
};

/**
 * Hook for token operations
 */
export const useEcashToken = (tokenId) => {
  const [wallet] = useAtom(walletAtom);
  const [walletConnected] = useAtom(walletConnectedAtom);
  const [triggerRefresh] = useAtom(balanceRefreshTriggerAtom);
  
  const [tokenInfo, setTokenInfo] = useState(null);
  const [tokenBalance, setTokenBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch token info and balance
   */
  const fetchToken = useCallback(async () => {
    if (!wallet || !walletConnected || !tokenId) {
      setTokenInfo(null);
      setTokenBalance('0');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch token info and balance in parallel
      const [info, balanceData] = await Promise.all([
        wallet.getTokenInfo(tokenId),
        wallet.getTokenBalance(tokenId)
      ]);
      
      setTokenInfo(info);
      setTokenBalance(balanceData.balance); // Already string from service (BigInt converted)
      
      console.log('🪙 Token loaded:', info.genesisInfo.tokenTicker, 'Balance:', balanceData.balance);
    } catch (err) {
      console.error('❌ Failed to fetch token:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [wallet, walletConnected, tokenId]);

  // Auto-fetch token when ready
  useEffect(() => {
    if (wallet && walletConnected && tokenId) {
      fetchToken();
    }
  }, [wallet, walletConnected, tokenId, fetchToken]);

  // Listen to balance refresh triggers (tokens might have arrived)
  useEffect(() => {
    if (wallet && walletConnected && tokenId && triggerRefresh > 0) {
      console.log('🔄 Token balance refresh triggered by WebSocket');
      fetchToken();
    }
  }, [triggerRefresh, wallet, walletConnected, tokenId, fetchToken]);

  /**
   * Send tokens
   */
  const sendToken = useCallback(async (toAddress, amount) => {
    if (!wallet || !tokenId) {
      throw new Error('Wallet or token not available');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await wallet.sendToken(tokenId, toAddress, amount);
      console.log('✅ Token sent! TXID:', result.txid);
      
      // Refresh token balance after send
      await fetchToken();
      
      return result;
    } catch (err) {
      console.error('❌ Failed to send token:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [wallet, tokenId, fetchToken]);

  return {
    tokenInfo,
    tokenBalance,
    loading,
    error,
    sendToken,
    refreshToken: fetchToken
  };
};

/**
 * Hook for XEC transactions
 */
export const useEcashXec = () => {
  const [wallet] = useAtom(walletAtom);
  const [walletConnected] = useAtom(walletConnectedAtom);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Send XEC
   */
  const sendXec = useCallback(async (toAddress, amountXec) => {
    if (!wallet || !walletConnected) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await wallet.sendXec(toAddress, amountXec);
      console.log('✅ XEC sent! TXID:', result.txid);
      return result;
    } catch (err) {
      console.error('❌ Failed to send XEC:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [wallet, walletConnected]);

  return {
    loading,
    error,
    sendXec
  };
};

export default {
  useEcashWallet,
  useEcashBalance,
  useEcashToken,
  useEcashXec
};
