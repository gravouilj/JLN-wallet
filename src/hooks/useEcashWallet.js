import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import {
  walletAtom,
  walletConnectedAtom,
  mnemonicAtom, // ✅ On utilise uniquement l'atome sécurisé en mémoire
  hdPathAtom,
  balanceAtom,
  totalBalanceAtom,
  balanceBreakdownAtom,
  balanceRefreshTriggerAtom,
  scriptLoadedAtom,
  tokenRefreshTriggerAtom
} from '../atoms';
import { createWallet } from '../services/ecashWallet';
import { storageService } from '../services/storageService'; // ✅ Pour le logout propre

// --- HOOK PRINCIPAL DU WALLET ---
export const useEcashWallet = () => {
  // On récupère le mnemonic depuis la RAM (défini par UnlockWallet ou OnboardingModal)
  const mnemonic = useAtomValue(mnemonicAtom);
  
  const [wallet, setWallet] = useAtom(walletAtom);
  const [walletConnected, setWalletConnected] = useAtom(walletConnectedAtom);
  const [hdPath] = useAtom(hdPathAtom);
  const [, setScriptLoaded] = useAtom(scriptLoadedAtom);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // LOGIQUE D'INITIALISATION REACTIVE
  // Dès que 'mnemonic' change (login succès), on instancie le wallet
  useEffect(() => {
    // Si pas de mnemonic (logout), on nettoie l'état
    if (!mnemonic) {
      if (wallet) {
        setWallet(null);
        setWalletConnected(false);
        setScriptLoaded(false);
      }
      return;
    }

    // Si le wallet est déjà initialisé avec ce mnemonic, on ne fait rien
    if (wallet && wallet.getAddress()) return;

    const init = async () => {
      setLoading(true);
      setError(null);
      console.log('🔑 Initialisation du wallet depuis la mémoire sécurisée...');

      try {
        const walletInstance = await createWallet(mnemonic, hdPath);
        
        // Validation basique
        if (!walletInstance.getAddress()) throw new Error('Instance wallet invalide');

        setWallet(walletInstance);
        setWalletConnected(true);
        setScriptLoaded(true);
        console.log('✅ Wallet prêt et connecté.');
      } catch (err) {
        console.error('❌ Échec init wallet:', err);
        setError(err.message);
        setWalletConnected(false);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [mnemonic, hdPath, wallet, setWallet, setWalletConnected, setScriptLoaded]);

  // Déconnexion (Logout logique)
  const disconnectWallet = useCallback(() => {
    setWallet(null);
    setWalletConnected(false);
    setScriptLoaded(false);
    // Note: Pour un vrai logout, il faut setter mnemonicAtom à null (via App/Header)
  }, [setWallet, setWalletConnected, setScriptLoaded]);

  // Reset complet (Suppression des données chiffrées)
  const resetWallet = useCallback(() => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer le portefeuille de cet appareil ?")) {
      storageService.clearWallet(); // Supprime le vault chiffré
      window.location.reload(); // Recharge pour retourner à l'accueil
    }
  }, []);

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
    disconnectWallet,
    resetWallet
    // Note: generateNewWallet et importWallet ne sont plus ici car gérés par l'UI (OnboardingModal)
  };
};

// --- HOOK DE BALANCE (Inchangé mais nettoyé) ---
export const useEcashBalance = (refreshInterval = 10000) => {
  const [wallet] = useAtom(walletAtom);
  const [walletConnected] = useAtom(walletConnectedAtom);
  
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
      
      setBalance(balanceData.balance);
      setTotalBalance(balanceData.totalBalance);
      setBalanceBreakdown(balanceData.balanceBreakdown || {
        spendableBalance: balanceData.balance,
        totalBalance: balanceData.totalBalance,
        tokenDustValue: balanceData.totalBalance - balanceData.balance,
        pureXecUtxos: balanceData.utxos?.pureXec?.length || 0,
        tokenUtxos: balanceData.utxos?.token?.length || 0
      });

      setTokenRefreshTrigger(Date.now());

    } catch (err) {
      console.error('Erreur balance:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [wallet, walletConnected, setBalance, setTotalBalance, setBalanceBreakdown, setTokenRefreshTrigger]);

  useEffect(() => {
    if (walletConnected) {
      fetchBalance();
      const interval = setInterval(fetchBalance, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [walletConnected, fetchBalance, refreshInterval]);

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

// --- HOOK DE TOKEN (Inchangé) ---
export const useEcashToken = (tokenId) => {
  const [wallet] = useAtom(walletAtom);
  const [triggerRefresh] = useAtom(balanceRefreshTriggerAtom);
  
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
  }, [fetchToken, triggerRefresh]);

  return { tokenInfo, tokenBalance, loading, refreshToken: fetchToken };
};

// --- HOOK ENVOI XEC (Inchangé) ---
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