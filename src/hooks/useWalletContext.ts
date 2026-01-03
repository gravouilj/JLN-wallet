/**
 * useWalletContext - Hook Master pour le Wallet
 * 
 * Ce hook centralise l'accès à l'état du wallet et évite les appels
 * redondants à la blockchain. Il utilise les derived atoms pour
 * garantir la cohérence de l'état.
 * 
 * Architecture:
 * - Source unique pour l'état du wallet
 * - Accès aux tokens scannés via walletTokensAtom
 * - Actions standardisées pour modifier l'état
 * 
 * @example
 * const { 
 *   isConnected, 
 *   address, 
 *   balance, 
 *   tokens,        // Cached scan results
 *   refreshBalance,
 *   triggerScan,
 *   selectedProfile,
 *   selectProfile 
 * } = useWalletContext();
 */

import { useCallback } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  walletAtom,
  walletConnectedAtom,
  balanceAtom,
  selectedProfileAtom,
  favoriteProfilesAtom,
  toggleProfileFavoriteAtom,
  balanceRefreshTriggerAtom,
  clearWalletAtom,
  walletTokensAtom,
  walletScanTriggerAtom,
  WalletToken,
} from '../atoms';
import {
  walletAddressAtom,
  hasFundsAtom,
  activeTokenIdAtom,
  isSelectedProfileFavoriteAtom,
  favoritesCountAtom,
} from '../derivedAtoms';

interface ProfileData {
  tokenId: string;
  [key: string]: unknown;
}

interface WalletContextReturn {
  // Wallet State (read-only derived)
  isConnected: boolean;
  address: string;
  balance: number;
  hasFunds: boolean;
  wallet: unknown; // EcashWallet instance
  
  // Token State (from scan cache)
  tokens: WalletToken[];
  tokenBalances: Record<string, string>;
  tokensLoading: boolean;
  lastScanAt: number | null;
  
  // Profile State
  selectedProfile: ProfileData | null;
  activeTokenId: string;
  isSelectedFavorite: boolean;
  favoritesCount: number;
  favorites: string[];
  
  // Actions
  selectProfile: (profile: ProfileData | null) => void;
  toggleFavorite: (profileId: string) => void;
  refreshBalance: () => void;
  triggerScan: () => void;
  disconnect: () => void;
}

export const useWalletContext = (): WalletContextReturn => {
  // Wallet atoms
  const wallet = useAtomValue(walletAtom);
  const isConnected = useAtomValue(walletConnectedAtom);
  const balance = useAtomValue(balanceAtom);
  
  // Derived atoms (lecture seule, auto-sync)
  const address = useAtomValue(walletAddressAtom);
  const hasFunds = useAtomValue(hasFundsAtom);
  const activeTokenId = useAtomValue(activeTokenIdAtom);
  const isSelectedFavorite = useAtomValue(isSelectedProfileFavoriteAtom);
  const favoritesCount = useAtomValue(favoritesCountAtom);
  
  // Token state (from scan cache)
  const walletTokens = useAtomValue(walletTokensAtom);
  const setScanTrigger = useSetAtom(walletScanTriggerAtom);
  
  // Profile atoms
  const [selectedProfile, setSelectedProfile] = useAtom(selectedProfileAtom);
  const favorites = useAtomValue(favoriteProfilesAtom);
  const toggleProfileFavorite = useSetAtom(toggleProfileFavoriteAtom);
  
  // Balance refresh trigger
  const setBalanceRefreshTrigger = useSetAtom(balanceRefreshTriggerAtom);
  
  // Clear wallet action
  const clearWallet = useSetAtom(clearWalletAtom);
  
  // Actions
  const selectProfile = useCallback((profile: ProfileData | null) => {
    setSelectedProfile(profile);
  }, [setSelectedProfile]);
  
  const toggleFavorite = useCallback((profileId: string) => {
    toggleProfileFavorite(profileId);
  }, [toggleProfileFavorite]);
  
  const refreshBalance = useCallback(() => {
    setBalanceRefreshTrigger((prev) => prev + 1);
  }, [setBalanceRefreshTrigger]);
  
  const triggerScan = useCallback(() => {
    setScanTrigger(Date.now());
  }, [setScanTrigger]);
  
  const disconnect = useCallback(() => {
    clearWallet();
  }, [clearWallet]);
  
  return {
    // Wallet
    isConnected,
    address,
    balance,
    hasFunds,
    wallet,
    
    // Tokens (from cache)
    tokens: walletTokens.tokens,
    tokenBalances: walletTokens.balances,
    tokensLoading: walletTokens.loading,
    lastScanAt: walletTokens.lastScanAt,
    
    // Profile
    selectedProfile,
    activeTokenId,
    isSelectedFavorite,
    favoritesCount,
    favorites,
    
    // Actions
    selectProfile,
    toggleFavorite,
    refreshBalance,
    triggerScan,
    disconnect,
  };
};

export default useWalletContext;
