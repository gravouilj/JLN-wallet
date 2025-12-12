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
  scriptLoadedAtom,
  tokenRefreshTriggerAtom
} from '../atoms';
import { createWallet, generateMnemonic, validateMnemonic } from '../services/ecashWallet';

// --- HOOK PRINCIPAL DU WALLET ---
export const useEcashWallet = () => {
  const [wallet, setWallet] = useAtom(walletAtom);
  const [walletConnected, setWalletConnected] = useAtom(walletConnectedAtom);
  const [savedMnemonic] = useAtom(savedMnemonicAtom);
  const [, setMnemonic] = useAtom(mnemonicSetterAtom);
  const [hdPath] = useAtom(hdPathAtom);
  const [, setScriptLoaded] = useAtom(scriptLoadedAtom);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialisation depuis la sauvegarde
  const initializeWallet = useCallback(async () => {
    if (!savedMnemonic) return;
    if (wallet && wallet.getAddress()) return; // Déjà initialisé

    setLoading(true);
    setError(null);

    try {
      console.log('🔑 Initialisation du wallet...');
      const walletInstance = await createWallet(savedMnemonic, hdPath);
      
      // VÉRIFICATION CRITIQUE
      try {
        const address = walletInstance.getAddress();
        if (!address) throw new Error('Adresse invalide');
        console.log('✅ Wallet prêt:', address);
      } catch (e) {
        throw new Error('Wallet créé mais inutilisable (pas d\'adresse)');
      }

      setWallet(walletInstance);
      setWalletConnected(true);
      setScriptLoaded(true);
    } catch (err) {
      console.error('❌ Échec init wallet:', err);
      setError(err.message);
      setWalletConnected(false);
    } finally {
      setLoading(false);
    }
  }, [savedMnemonic, hdPath, wallet, setWallet, setWalletConnected, setScriptLoaded]);

  // Création nouveau wallet
  const generateNewWallet = useCallback(async () => {
    setLoading(true);
    try {
      const newMnemonic = generateMnemonic();
      const walletInstance = await createWallet(newMnemonic, hdPath);
      
      if (!walletInstance.getAddress()) throw new Error('Erreur génération adresse');

      setMnemonic(newMnemonic);
      setWallet(walletInstance);
      setWalletConnected(true);
      setScriptLoaded(true);
      return newMnemonic;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [hdPath, setMnemonic, setWallet, setWalletConnected, setScriptLoaded]);

  // Import wallet
  const importWallet = useCallback(async (mnemonic) => {
    setLoading(true);
    try {
      if (!validateMnemonic(mnemonic)) throw new Error('Mnémonique invalide');
      
      const walletInstance = await createWallet(mnemonic, hdPath);
      if (!walletInstance.getAddress()) throw new Error('Erreur dérivation adresse');
      
      setMnemonic(mnemonic);
      setWallet(walletInstance);
      setWalletConnected(true);
      setScriptLoaded(true);
      return walletInstance;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [hdPath, setMnemonic, setWallet, setWalletConnected, setScriptLoaded]);

  const disconnectWallet = useCallback(() => {
    setWallet(null);
    setWalletConnected(false);
    setScriptLoaded(false);
  }, [setWallet, setWalletConnected, setScriptLoaded]);

  const resetWallet = useCallback(() => {
    setMnemonic('');
    disconnectWallet();
    localStorage.removeItem('farm-wallet-mnemonic');
    window.location.reload();
  }, [setMnemonic, disconnectWallet]);

  // Auto-init au montage
  useEffect(() => {
    if (savedMnemonic && !wallet && !loading) {
      initializeWallet();
    }
  }, [savedMnemonic, wallet, loading, initializeWallet]);

  // Helper adresse
  const address = useMemo(() => {
    return wallet ? wallet.getAddress() : '';
  }, [wallet]);

  return {
    wallet,
    address,
    walletConnected,
    loading,
    error,
    generateNewWallet,
    importWallet,
    disconnectWallet,
    resetWallet
  };
};

// --- HOOK DE BALANCE (Fusionné) ---
export const useEcashBalance = (refreshInterval = 10000) => {
  const [wallet] = useAtom(walletAtom);
  const [walletConnected] = useAtom(walletConnectedAtom);
  
  // Atomes globaux à mettre à jour
  const [balance, setBalance] = useAtom(balanceAtom);
  const [, setTotalBalance] = useAtom(totalBalanceAtom);
  const [balanceBreakdown, setBalanceBreakdown] = useAtom(balanceBreakdownAtom);
  const [triggerRefresh] = useAtom(balanceRefreshTriggerAtom);
  const [, setTokenRefreshTrigger] = useAtom(tokenRefreshTriggerAtom);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBalance = useCallback(async () => {
    if (!wallet || !walletConnected) {
      setBalance(0);
      setTotalBalance(0);
      return;
    }

    setLoading(true);
    try {
      const balanceData = await wallet.getBalance();
      
      // 1. Mise à jour des atomes
      setBalance(balanceData.balance); // XEC pur
      setTotalBalance(balanceData.totalBalance); // Total avec dust
      setBalanceBreakdown(balanceData.balanceBreakdown || {
        spendableBalance: balanceData.balance,
        totalBalance: balanceData.totalBalance,
        tokenDustValue: balanceData.totalBalance - balanceData.balance,
        pureXecUtxos: balanceData.utxos?.pureXec?.length || 0,
        tokenUtxos: balanceData.utxos?.token?.length || 0
      });

      // 2. Déclencher le refresh des tokens car les UTXOs ont changé
      setTokenRefreshTrigger(Date.now());

    } catch (err) {
      console.error('Erreur balance:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [wallet, walletConnected, setBalance, setTotalBalance, setBalanceBreakdown, setTokenRefreshTrigger]);

  // Auto-refresh interval
  useEffect(() => {
    if (walletConnected) {
      fetchBalance();
      const interval = setInterval(fetchBalance, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [walletConnected, fetchBalance, refreshInterval]);

  // Trigger manuel (WebSocket)
  useEffect(() => {
    if (walletConnected && triggerRefresh > 0) {
      fetchBalance();
    }
  }, [triggerRefresh, walletConnected, fetchBalance]);

  return {
    balance,
    balanceBreakdown,
    loading,
    error,
    refreshBalance: fetchBalance
  };
};

// --- HOOK DE TOKEN (Optimisé) ---
export const useEcashToken = (tokenId) => {
  const [wallet] = useAtom(walletAtom);
  const [triggerRefresh] = useAtom(balanceRefreshTriggerAtom); // Écoute aussi les updates globaux
  
  const [tokenInfo, setTokenInfo] = useState(null);
  const [tokenBalance, setTokenBalance] = useState('0');
  const [loading, setLoading] = useState(false);

  const fetchToken = useCallback(async () => {
    if (!wallet || !tokenId) return;

    setLoading(true);
    try {
      const [info, balanceData] = await Promise.all([
        wallet.getTokenInfo(tokenId),
        wallet.getTokenBalance(tokenId)
      ]);
      
      setTokenInfo(info);
      setTokenBalance(balanceData.balance);
    } catch (err) {
      console.warn('Erreur fetch token:', err);
    } finally {
      setLoading(false);
    }
  }, [wallet, tokenId]);

  useEffect(() => {
    fetchToken();
  }, [fetchToken, triggerRefresh]); // Se met à jour si le wallet reçoit une notif

  return { tokenInfo, tokenBalance, loading, refreshToken: fetchToken };
};

// --- HOOK ENVOI XEC ---
export const useEcashXec = () => {
  const [wallet] = useAtom(walletAtom);
  const [walletConnected] = useAtom(walletConnectedAtom);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  return { loading, error, sendXec };
};

export default { useEcashWallet, useEcashBalance, useEcashToken, useEcashXec };
