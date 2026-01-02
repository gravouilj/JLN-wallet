import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  walletAtom,
  walletConnectedAtom,
  mnemonicAtom,
  hdPathAtom,
  balanceAtom,
  totalBalanceAtom,
  balanceBreakdownAtom,
  balanceRefreshTriggerAtom,
  scriptLoadedAtom,
  tokenRefreshTriggerAtom,
  clearWalletAtom
} from '../atoms';
import { createWallet, EcashWallet } from '../services/ecashWallet';
import { storageService } from '../services/storageService';

// Type definitions
interface BalanceData {
  balance: number;
  totalBalance: number;
  balanceBreakdown?: BalanceBreakdown;
  utxos?: {
    pureXec?: any[];
    token?: any[];
  };
}

interface BalanceBreakdown {
  spendableBalance: number;
  totalBalance: number;
  tokenDustValue: number;
  pureXecUtxos: number;
  tokenUtxos: number;
}

interface TokenInfo {
  genesisInfo: {
    tokenName: string;
    tokenTicker: string;
    decimals: number;
  };
  [key: string]: any;
}

interface SendResult {
  txid: string;
  [key: string]: any;
}

interface UseEcashWalletReturn {
  wallet: EcashWallet | null;
  address: string;
  walletConnected: boolean;
  loading: boolean;
  error: string | null;
  disconnectWallet: () => void;
  resetWallet: () => void;
}

interface UseEcashBalanceReturn {
  balance: number;
  balanceBreakdown: BalanceBreakdown | null;
  loading: boolean;
  error: string | null;
  refreshBalance: () => Promise<void>;
}

interface UseEcashTokenReturn {
  tokenInfo: TokenInfo | null;
  tokenBalance: string;
  loading: boolean;
  refreshToken: () => Promise<void>;
}

interface UseEcashXecReturn {
  loading: boolean;
  error: string | null;
  sendXec: (toAddress: string, amountXec: number) => Promise<SendResult>;
}

// --- HOOK PRINCIPAL DU WALLET ---
export const useEcashWallet = (): UseEcashWalletReturn => {
  const mnemonic = useAtomValue(mnemonicAtom);
  
  const [wallet, setWallet] = useAtom(walletAtom);
  const [walletConnected, setWalletConnected] = useAtom(walletConnectedAtom);
  const [hdPath] = useAtom(hdPathAtom);
  const [, setScriptLoaded] = useAtom(scriptLoadedAtom);
  const clearWallet = useSetAtom(clearWalletAtom);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // LOGIQUE D'INITIALISATION REACTIVE
  useEffect(() => {
    if (!mnemonic) {
      if (wallet) {
        setWallet(null);
        setWalletConnected(false);
        setScriptLoaded(false);
      }
      return;
    }

    if (wallet && wallet.getAddress()) return;

    const init = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      console.log('🔑 Initialisation du wallet depuis la mémoire sécurisée...');

      try {
        const walletInstance = await createWallet(mnemonic, hdPath);
        
        if (!walletInstance.getAddress()) {
          throw new Error('Instance wallet invalide');
        }

        setWallet(walletInstance);
        setWalletConnected(true);
        setScriptLoaded(true);
        console.log('✅ Wallet prêt et connecté.');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
        console.error('❌ Échec init wallet:', err);
        setError(errorMsg);
        setWalletConnected(false);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [mnemonic, hdPath, wallet, setWallet, setWalletConnected, setScriptLoaded]);

  // ✅ SECURITY FIX #5: Logout with secure atom clearing
  const disconnectWallet = useCallback((): void => {
    // Clear all sensitive data from memory
    clearWallet();
    
    // Also clear local state
    setWallet(null);
    setWalletConnected(false);
    setScriptLoaded(false);
    
    console.log('🔐 Wallet sécurisé et déconnecté');
  }, [clearWallet, setWallet, setWalletConnected, setScriptLoaded]);

  // Reset complet (Suppression des données chiffrées)
  const resetWallet = useCallback((): void => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer le portefeuille de cet appareil ?")) {
      storageService.clearWallet();
      window.location.reload();
    }
  }, []);

  // Helper adresse
  const address = useMemo((): string => {
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
  };
};

// --- HOOK DE BALANCE ---
export const useEcashBalance = (refreshInterval: number = 10000): UseEcashBalanceReturn => {
  const [wallet] = useAtom(walletAtom);
  const [walletConnected] = useAtom(walletConnectedAtom);
  
  const [balance, setBalance] = useAtom(balanceAtom);
  const [, setTotalBalance] = useAtom(totalBalanceAtom);
  const [balanceBreakdown, setBalanceBreakdown] = useAtom(balanceBreakdownAtom);
  const [triggerRefresh] = useAtom(balanceRefreshTriggerAtom);
  const [, setTokenRefreshTrigger] = useAtom(tokenRefreshTriggerAtom);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async (): Promise<void> => {
    if (!wallet || !walletConnected) {
      setBalance(0);
      setTotalBalance(0);
      return;
    }

    setLoading(true);
    try {
      const balanceData: BalanceData = await wallet.getBalance();
      
      setBalance(balanceData.balance);
      setTotalBalance(balanceData.totalBalance);
      setBalanceBreakdown({
        spendableBalance: balanceData.balance,
        totalBalance: balanceData.totalBalance,
        tokenDustValue: balanceData.totalBalance - balanceData.balance,
        pureXecUtxos: balanceData.utxos?.pureXec?.length || 0,
        tokenUtxos: balanceData.utxos?.token?.length || 0
      });

      setTokenRefreshTrigger(Date.now());

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('Erreur balance:', err);
      setError(errorMsg);
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

// --- HOOK DE TOKEN ---
export const useEcashToken = (tokenId: string | null | undefined): UseEcashTokenReturn => {
  const [wallet] = useAtom(walletAtom);
  const [triggerRefresh] = useAtom(balanceRefreshTriggerAtom);
  
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [tokenBalance, setTokenBalance] = useState<string>('0');
  const [loading, setLoading] = useState<boolean>(false);

  const fetchToken = useCallback(async (): Promise<void> => {
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

// --- HOOK ENVOI XEC ---
export const useEcashXec = (): UseEcashXecReturn => {
  const [wallet] = useAtom(walletAtom);
  const [walletConnected] = useAtom(walletConnectedAtom);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const sendXec = useCallback(async (toAddress: string, amountXec: number): Promise<SendResult> => {
    if (!wallet || !walletConnected) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const result: SendResult = await wallet.sendXec(toAddress, amountXec);
      console.log('✅ XEC sent! TXID:', result.txid);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('❌ Failed to send XEC:', err);
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [wallet, walletConnected]);

  return { loading, error, sendXec };
};

export default { useEcashWallet, useEcashBalance, useEcashToken, useEcashXec };
