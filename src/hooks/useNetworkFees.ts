import { useState, useEffect } from 'react';
import { useEcashWallet } from './useEcashWallet';
import { useXecPrice } from './useXecPrice';
import { useAtom } from 'jotai';
import { currencyAtom } from '../atoms';

interface FeesStatus {
  level: 'good' | 'ok' | 'low' | 'critical';
  label: string;
  color: string;
}

interface UseNetworkFeesReturn {
  xecBalance: number;
  loading: boolean;
  refreshing: boolean;
  feesStatus: FeesStatus;
  estimatedTxCount: number;
  canAfford: (feeSats: number) => boolean;
  refresh: () => Promise<void>;
  getFormattedBalance: () => string;
}

/**
 * useNetworkFees - Hook pour la gestion des frais réseau
 * 
 * Encapsule la logique:
 * - Chargement du solde XEC
 * - Calcul du statut des frais
 * - Estimation du nombre de transactions possibles
 * - Conversion devise (XEC, USD, EUR, etc.)
 * - Vérification si affordable
 * 
 * @param {number} estimatedFee - Fee estimé en sats (optionnel)
 * @returns {UseNetworkFeesReturn} État et méthodes
 */
export const useNetworkFees = (estimatedFee?: number): UseNetworkFeesReturn => {
  const { wallet, walletConnected } = useEcashWallet();
  const price = useXecPrice();
  const [currency] = useAtom(currencyAtom);
  
  const [xecBalance, setXecBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Charger le solde au montage ou si wallet change
  useEffect(() => {
    loadBalance();
  }, [wallet, walletConnected]);

  const loadBalance = async () => {
    if (!wallet || !walletConnected) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const balanceData = await wallet.getBalance();
      setXecBalance(balanceData.balance || 0);
    } catch (err) {
      console.error('❌ Erreur chargement solde XEC:', err);
      setXecBalance(0);
    } finally {
      setLoading(false);
    }
  };

  // Rafraîchir le solde
  const refresh = async () => {
    setRefreshing(true);
    await loadBalance();
    setRefreshing(false);
  };

  // Déterminer le statut des frais
  const getFeesStatus = (): FeesStatus => {
    if (xecBalance >= 1000) {
      return { level: 'good', label: 'Excellent', color: 'var(--accent-success)' };
    }
    if (xecBalance >= 100) {
      return { level: 'ok', label: 'Suffisant', color: 'var(--accent-primary)' };
    }
    if (xecBalance >= 50) {
      return { level: 'low', label: 'Faible', color: 'var(--accent-warning)' };
    }
    return { level: 'critical', label: 'Critique', color: 'var(--accent-danger)' };
  };

  // Estimation nombre de transactions possibles
  const feePerTx = estimatedFee ? estimatedFee / 100 : 5; // Conversion sats -> XEC
  const estimatedTxCount = Math.floor(xecBalance / feePerTx);

  // Vérifier si affordable
  const canAfford = (feeSats: number): boolean => {
    const feeXec = feeSats / 100;
    return xecBalance >= feeXec;
  };

  // Formater le solde selon la devise
  const getFormattedBalance = (): string => {
    if (currency === 'XEC') {
      return `${xecBalance.toFixed(2)} XEC`;
    }
    
    if (!price || !price.rates) {
      return `${xecBalance.toFixed(2)} XEC`;
    }

    const rate = price.rates[currency] || 1;
    const converted = xecBalance * rate;
    
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      CAD: 'C$',
      AUD: 'A$',
      JPY: '¥',
      CHF: 'Fr'
    };
    
    const symbol = symbols[currency] || currency;
    return `${symbol}${converted.toFixed(2)}`;
  };

  return {
    xecBalance,
    loading,
    refreshing,
    feesStatus: getFeesStatus(),
    estimatedTxCount,
    canAfford,
    refresh,
    getFormattedBalance
  };
};
